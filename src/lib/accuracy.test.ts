// Regression tests for the 22 Oct 2026 data audit: costs that were missing, the default loan rate,
// and items that must be shown as not fully verified.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { costBreakdown, DEFAULT_ASSUMPTIONS, DEFAULT_PROFILE, runScenario, visaFeesInr } from "./model";
import { defaultLoanRate } from "./rate";
import type { CountryData, FxRates, LenderData } from "./types";
import fb from "../data/fx-fallback.json";

const read = (f: string) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", f), "utf8"));
const country = (c: string): CountryData => read(`countries/${c}.json`);
const lenders: LenderData = read("lenders.json");
const fx: FxRates = { inrPer: fb.inrPerUnit as FxRates["inrPer"], date: fb.date, source: "test", live: false };
const prof = { ...DEFAULT_PROFILE, maxLoan: 1e8 };
const prog = (c: CountryData, id: string) => c.programmes.find((p) => p.id === id)!;

describe("default loan rate", () => {
  const r = defaultLoanRate(lenders)!;
  it("uses only verified public-sector banks", () => {
    expect(r.lenders.sort()).toEqual(["Bank of Baroda", "Canara Bank", "Punjab National Bank", "State Bank of India", "Union Bank of India"].sort());
  });
  it("is about 9.9%, not the old 10.24% that private lenders pulled up", () => {
    expect(r.rate).toBeGreaterThan(9.5);
    expect(r.rate).toBeLessThan(10.1);
  });
  it("returns null when there is no usable lender data", () => {
    expect(defaultLoanRate(null)).toBeNull();
    expect(defaultLoanRate({ ...lenders, lenders: [] })).toBeNull();
  });
});

describe("costs that were missing", () => {
  const au = country("AU");
  const withHealth = costBreakdown(au, prog(au, "uq-mba"), prof, DEFAULT_ASSUMPTIONS, fx)!;
  const noHealth = costBreakdown({ ...au, health_insurance_per_year: undefined }, prog(au, "uq-mba"), prof, DEFAULT_ASSUMPTIONS, fx)!;

  it("counts Australian health cover (OSHC) in the displayed breakdown", () => {
    expect(au.health_insurance_per_year?.amount).toBe(670);
    // uq-mba runs 18 months
    expect(withHealth.health).toBeCloseTo(670 * 1.5);
    expect(withHealth.totalLocal - noHealth.totalLocal).toBeCloseTo(670 * 1.5);
  });
  it("counts it in the scenario loan maths too, not just the table", () => {
    const run = (c: CountryData) => runScenario({ country: c, programme: prog(c, "uq-mba"), course: "MBA", profile: prof, assumptions: DEFAULT_ASSUMPTIONS, fx, indiaSalary: 1_000_000 }, "expected")!;
    const diff = run(au).totalCostInr - run({ ...au, health_insurance_per_year: undefined }).totalCostInr;
    expect(diff).toBeGreaterThan(670 * 1.5 * fx.inrPer.AUD * 0.95);
    expect(diff).toBeLessThan(670 * 1.5 * fx.inrPer.AUD * 1.2); // a little extra from INR drift
  });
  it("uses RMIT's own MBA total instead of two annual fees", () => {
    const p = prog(au, "rmit-mba");
    expect(p.tuition).toMatchObject({ amount: 107520, period: "total" });
    expect(p.status).toBe("partial");
  });
  it("adds Buffalo's USD 100 per semester international fee", () => {
    const us = country("US");
    expect(prog(us, "ub-ms-cse").mandatory_fees_per_year).toBeCloseTo(2 * 1659.86 + 200);
    expect(prog(us, "ub-stem-mba").mandatory_fees_per_year).toBeCloseTo(2 * 1624.86 + 200);
  });
  it("adds Hitotsubashi's books, transport and insurance", () => {
    // matriculation 282,000 + books 230,000 over 2 years, plus 150,000 a year
    expect(prog(country("JP"), "hitotsubashi-ics-mba").mandatory_fees_per_year).toBe(141000 + 115000 + 150000);
  });
  it("charges the German visa fee in rupees", () => {
    const de = country("DE");
    expect(de.visa.student_visa.fees[0]).toMatchObject({ amount: 8300, currency: "INR" });
    expect(visaFeesInr(de, fx, DEFAULT_ASSUMPTIONS)).toBe(8300);
  });
});

describe("unverified items are marked as such", () => {
  const all = ["US", "DE", "CA", "JP", "AU"].map(country);
  it("flags the India salary baseline as unverified", () => {
    for (const band of Object.values(lenders.india_baseline)) if (band) expect(band.status).toBe("unverified");
  });
  it("downgrades figures that could not be re-checked", () => {
    expect(prog(country("AU"), "monash-mds-ds").status).toBe("partial");
    expect(prog(country("DE"), "lmu-msc-statistics-data-science").status).toBe("partial");
    expect(lenders.lenders.find((l) => l.id === "credila")!.status).toBe("partial");
  });
  it("gives every flagged policy change a level and a note", () => {
    const flagged = all.flatMap((c) => c.visa.recent_changes.filter((ch) => ch.check));
    expect(flagged.length).toBeGreaterThanOrEqual(15);
    for (const ch of flagged) {
      expect(["partial", "unverified"]).toContain(ch.check!.level);
      expect(ch.check!.note.length).toBeGreaterThan(20);
    }
  });
  it("does not label fee years the sources do not state", () => {
    const years = ["concordia-mapcompsc-cs", "concordia-jmsb-mba"].map((id) => prog(country("CA"), id).tuition!.fee_year);
    for (const y of years) expect(y).not.toMatch(/^2026-27 rates/);
  });
});

describe("one consistent set of totals", () => {
  const profile = { ...DEFAULT_PROFILE, familyFunds: 1_000_000, savings: 0, scholarship: 0, maxLoan: 4_000_000, courses: ["CS" as const] };
  const cases = ["US", "DE", "CA", "JP", "AU"].flatMap((code) => country(code).programmes.filter((p) => p.course === "CS").map((p) => [code, p.id] as const));
  const A = { ...DEFAULT_ASSUMPTIONS, processingFeePct: 1 };

  it.each(cases)("%s %s: the funding gap equals total + fee - own funds - loan", (code, id) => {
    const c = country(code);
    const p = prog(c, id);
    const r = runScenario({ country: c, programme: p, course: "CS", profile, assumptions: A, fx, indiaSalary: 1_000_000 }, "expected");
    if (!r) return;
    const own = profile.familyFunds;
    const need = r.totalCostInr + r.sim.processingFee;
    expect(r.sim.drawn + r.sim.fundingGap).toBeCloseTo(Math.max(0, need - own), 0);
    expect(r.sim.drawn).toBeLessThanOrEqual(profile.maxLoan + 1);
    if (r.sim.fundingGap > 1) expect(r.sim.drawn).toBeCloseTo(profile.maxLoan, 0);
  });

  it("the optimistic scenario costs the same as the cost table (today's prices, no drift)", () => {
    const c = country("CA");
    const p = prog(c, "utoronto-mscac-cs");
    const cb = costBreakdown(c, p, profile, A, fx)!;
    const r = runScenario({ country: c, programme: p, course: "CS", profile, assumptions: A, fx, indiaSalary: 1_000_000 }, "optimistic")!;
    expect(r.totalCostInr).toBeCloseTo(cb.totalInr, 0);
  });

  it("the expected scenario adds tuition rise and INR drift on top, which explains the gap vs the table", () => {
    const c = country("CA");
    const p = prog(c, "utoronto-mscac-cs");
    const cb = costBreakdown(c, p, profile, A, fx)!;
    const r = runScenario({ country: c, programme: p, course: "CS", profile, assumptions: A, fx, indiaSalary: 1_000_000 }, "expected")!;
    const drift = r.totalCostInr - cb.totalInr;
    expect(drift).toBeGreaterThan(50_000);
    expect(drift).toBeLessThan(120_000);
    // the old inconsistency: gap vs (table total - funds) differed by exactly the drift plus the fee
    expect(r.sim.fundingGap - (cb.totalInr - profile.familyFunds - profile.maxLoan)).toBeCloseTo(drift + r.sim.processingFee, 0);
  });
});
