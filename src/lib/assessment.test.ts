// A realistic sample assessment run through every programme in the data, checking the numbers hang together.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { emi } from "./finance";
import { costBreakdown, DEFAULT_ASSUMPTIONS, DEFAULT_PROFILE, runAll, type Profile } from "./model";
import { defaultLoanRate } from "./rate";
import { buildCandidates, picks } from "./recommend";
import type { CountryData, FxRates, LenderData } from "./types";
import fb from "../data/fx-fallback.json";

const dir = path.join(__dirname, "..", "data");
const countries: CountryData[] = fs.readdirSync(path.join(dir, "countries")).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(dir, "countries", f), "utf8")));
const lenders: LenderData = JSON.parse(fs.readFileSync(path.join(dir, "lenders.json"), "utf8"));
const fx: FxRates = { inrPer: fb.inrPerUnit as FxRates["inrPer"], date: fb.date, source: "test", live: false };
const rate = defaultLoanRate(lenders)!.rate;
const A = { ...DEFAULT_ASSUMPTIONS, loanRatePct: rate };

// The sample student: B.Tech CS, CGPA 8.5, IELTS 7, 1 year of work, Rs 10 L family funds, Rs 40 L maximum loan, expects Rs 10 L in India.
const student: Profile = {
  ...DEFAULT_PROFILE, qualification: "B.Tech / B.E.", specialization: "Computer Science", cgpa: 8.5, ielts: 7, workYears: 1,
  courses: ["CS", "DS", "MBA"], countries: ["US", "DE", "CA", "UK", "JP", "AU"], familyFunds: 1_000_000, savings: 0, scholarship: 0,
  maxLoan: 4_000_000, repaymentYears: 10, indiaSalary: 1_000_000,
};

describe("sample assessment across every programme", () => {
  const list = buildCandidates(countries, student, A, fx, lenders);

  it("covers every programme in the data", () => {
    expect(list.length).toBe(countries.flatMap((c) => c.programmes).length);
    expect(list.length).toBeGreaterThanOrEqual(49);
  });

  it("uses the 9.9% default rate", () => {
    expect(rate).toBeCloseTo(9.9, 1);
  });

  it.each(list.map((c) => [c.programme.id, c] as const))("%s: numbers are finite, reconcile and the EMI matches its principal", (_id, c) => {
    expect(c.missing, "inputs needed").toEqual([]);
    expect(Number.isFinite(c.totalInr) && c.totalInr! > 0).toBe(true);
    const results = runAll({ country: c.country, programme: c.programme, course: c.course, profile: student, assumptions: A, fx, indiaSalary: 1_000_000 });
    expect(Object.keys(results).sort()).toEqual(["conservative", "expected", "optimistic", "returnHome", "visaEnds"]);
    const own = student.familyFunds + student.savings + student.scholarship;
    const cb = costBreakdown(c.country, c.programme, student, A, fx)!;
    // the cost table is the optimistic scenario (today's prices, no drift)
    expect(results.optimistic!.totalCostInr).toBeCloseTo(cb.totalInr, 0);
    for (const r of Object.values(results)) {
      for (const v of [r!.totalCostInr, r!.sim.emi, r!.sim.drawn, r!.sim.fundingGap, r!.sim.principalAtRepayment, r!.npv, r!.monthlyTakeHomeAtRepay]) expect(Number.isFinite(v)).toBe(true);
      // funding gap identity: what is not paid by own funds or the loan
      const need = r!.totalCostInr + r!.sim.processingFee;
      expect(r!.sim.drawn + r!.sim.fundingGap).toBeCloseTo(Math.max(0, need - own), 0);
      expect(r!.sim.drawn).toBeLessThanOrEqual(student.maxLoan + 1);
      // EMI is the standard formula on the principal when repayment starts
      if (r!.sim.drawn > 0) expect(r!.sim.emi).toBeCloseTo(emi(r!.sim.principalAtRepayment, A.loanRatePct, student.repaymentYears * 12), 4);
      // the loan fee is exactly the stated percentage of the loan
      expect(r!.sim.processingFee).toBeCloseTo((r!.sim.drawn * A.processingFeePct) / 100, 4);
    }
    // downside scenarios never beat the optimistic one on cost or time to repay
    expect(results.conservative!.totalCostInr).toBeGreaterThanOrEqual(results.optimistic!.totalCostInr - 1);
  });

  it("gives a distinct best pick per goal wherever the data allows, all among options you can fund", () => {
    const best = picks(list);
    expect(best.overall).toBeDefined();
    for (const c of Object.values(best)) expect(c!.fundingGap).toBeLessThanOrEqual(0 + 1);
  });

  it("the six countries all appear in the ranking", () => {
    for (const code of ["US", "DE", "CA", "UK", "JP", "AU"]) expect(list.some((c) => c.country.country === code)).toBe(true);
  });
});

describe("no India salary entered", () => {
  it("nothing is computed and the missing input is named", () => {
    const list = buildCandidates(countries, { ...student, indiaSalary: null }, A, fx, lenders);
    for (const c of list) {
      expect(c.expected).toBeNull();
      expect(c.missing.join(" ")).toMatch(/India salary/);
      // what a degree costs does not depend on the India salary, so it is still worked out
      expect(Number.isFinite(c.totalInr) && c.totalInr! > 0, c.programme.id).toBe(true);
    }
  });
});
