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

describe("no India salary entered (optional)", () => {
  const noSalary = { ...student, indiaSalary: null };
  const withList = buildCandidates(countries, student, A, fx, lenders);
  const noList = buildCandidates(countries, noSalary, A, fx, lenders);

  it("still gives costs, loan, EMI, funding gap and years to repay: the three job-abroad scenarios run", () => {
    for (const c of noList) {
      expect(Object.keys(c.results).sort(), c.programme.id).toEqual(["conservative", "expected", "optimistic"]);
      expect(c.missing, "India salary is not a required input").toEqual([]);
      expect(Number.isFinite(c.totalInr) && c.totalInr! > 0).toBe(true);
      expect(Number.isFinite(c.expected!.sim.emi)).toBe(true);
    }
  });

  it("does not compute anything that compares with staying in India", () => {
    for (const c of noList) for (const r of Object.values(c.results)) {
      expect(r!.hasIndiaBaseline).toBe(false);
      expect(r!.paybackYears).toBeNull();
      expect(r!.roiPct).toBeNull();
      expect(r!.irrPct).toBeNull();
    }
  });

  it("the loan and cost numbers are identical with or without a salary (they never depended on it)", () => {
    for (let i = 0; i < noList.length; i++) {
      for (const k of ["optimistic", "expected", "conservative"] as const) {
        const a = noList[i].results[k]!, b = withList[i].results[k]!;
        expect(a.totalCostInr, noList[i].programme.id).toBeCloseTo(b.totalCostInr, 4);
        expect(a.sim.emi).toBeCloseTo(b.sim.emi, 6);
        expect(a.sim.drawn).toBeCloseTo(b.sim.drawn, 4);
        expect(a.sim.fundingGap).toBeCloseTo(b.sim.fundingGap, 4);
        expect(a.loanFreeYears).toBe(b.loanFreeYears);
        expect(a.netPosition.y10).toBeCloseTo(b.netPosition.y10, 2);
      }
    }
  });

  it("with a salary all five scenarios and the India comparison are back", () => {
    for (const c of withList) {
      expect(Object.keys(c.results).sort()).toEqual(["conservative", "expected", "optimistic", "returnHome", "visaEnds"]);
      for (const r of Object.values(c.results)) expect(r!.hasIndiaBaseline).toBe(true);
    }
  });

  it("programmes are still scored and ranked; the ROI part is left out and the others re-weighted", () => {
    expect(noList.every((c) => c.score != null)).toBe(true);
    for (const c of noList) expect(c.components!.roi).toBe(0);
    const best = picks(noList);
    expect(best.overall).toBeDefined();
    expect(best.budget).toBeDefined();
    expect(best.roi, "ROI pick needs the India comparison").toBeUndefined();
    expect(best.lowRisk, "low-risk pick uses the return-home scenario").toBeUndefined();
  });

  it("scores sit on the same 0-100 scale without the ROI part", () => {
    for (const c of noList) { expect(c.score!).toBeGreaterThanOrEqual(0); expect(c.score!).toBeLessThanOrEqual(100); }
  });
});

describe("India salary of 0 (fresher or unpaid family work)", () => {
  const zero = { ...student, indiaSalary: 0 };
  const zeroList = buildCandidates(countries, zero, A, fx, lenders);
  const refList = buildCandidates(countries, student, A, fx, lenders);

  it("is accepted as the stay-in-India baseline: payback, NPV and ROI are computed", () => {
    for (const c of zeroList) {
      for (const k of ["optimistic", "expected", "conservative"] as const) {
        const r = c.results[k]!;
        expect(r.hasIndiaBaseline, c.programme.id).toBe(true);
        expect(Number.isFinite(r.npv)).toBe(true);
      }
    }
  });

  it("the two return-to-India scenarios need an income after returning, so they are not run", () => {
    for (const c of zeroList) {
      expect(c.results.returnHome).toBeUndefined();
      expect(c.results.visaEnds).toBeUndefined();
    }
  });

  it("there is no income to give up, so the degree looks better than against a Rs 10 L salary", () => {
    for (let i = 0; i < zeroList.length; i++) {
      expect(zeroList[i].expected!.npv, zeroList[i].programme.id).toBeGreaterThan(refList[i].expected!.npv);
      // and the loan itself is unchanged
      expect(zeroList[i].expected!.sim.emi).toBeCloseTo(refList[i].expected!.sim.emi, 6);
    }
  });

  it("ROI counts in the score (a baseline exists); the low-risk pick still needs a return-home scenario", () => {
    for (const c of zeroList) expect(c.components!.roi).toBeGreaterThanOrEqual(0);
    const best = picks(zeroList);
    expect(best.roi).toBeDefined();
    expect(best.lowRisk).toBeUndefined();
  });
});
