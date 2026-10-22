import { describe, expect, it } from "vitest";
import { ABROAD_KEYS, DEFAULT_ASSUMPTIONS, DEFAULT_PROFILE, INDIA_JOB_SEARCH_MONTHS, runIndiaMasters, SCENARIOS } from "./model";
import type { IndiaProgramme } from "./types";

const prog = (over: Partial<IndiaProgramme> = {}): IndiaProgramme => ({
  id: "test-mtech", institution: "Test Institute", city: "Pune", course: "CS", programme_name: "M.Tech CSE", duration_months: 24,
  tuition_total_inr: 2_000_000, other_fees_total_inr: 200_000, fee_year: "2026-27", fee_source_url: "https://example.edu/fees",
  living_per_year_inr: 120_000, living_source_url: "https://example.edu/hostel", stipend_per_month_inr: 12_400, stipend_note: "GATE-qualified students",
  entry_salary: { median_inr: 1_800_000, year: "2025", low_inr: null, high_inr: null, basis: "median CTC", source_url: "https://example.edu/placements" },
  requirements: { entrance: "GATE", academic: null, work_experience: null }, programme_url: "https://example.edu", status: "verified", notes: "", ...over,
});
const A = { ...DEFAULT_ASSUMPTIONS, livingInflationPct: 0, salaryGrowthIndiaPct: 0, processingFeePct: 0, loanRatePct: 10, graceMonths: 6 };
const P = { ...DEFAULT_PROFILE, familyFunds: 0, savings: 0, scholarship: 0, maxLoan: 1e9, repaymentYears: 5, indiaLiving: 20_000, indiaSalary: 1_000_000 };

describe("master's in India scenario", () => {
  it("costs fees + other fees + hostel and food, with no exchange rate or visa costs", () => {
    const r = runIndiaMasters({ programme: prog(), profile: P, assumptions: A, indiaSalary: 1_000_000 })!;
    // 20,00,000 + 2,00,000 + 2 years x 1,20,000
    expect(r.totalCostInr).toBeCloseTo(2_000_000 + 200_000 + 240_000, 0);
    expect(r.key).toBe("mastersIndia");
  });
  it("falls back to your own India living cost when the institute publishes none, and counts unpublished fees as 0", () => {
    const r = runIndiaMasters({ programme: prog({ living_per_year_inr: null, other_fees_total_inr: null }), profile: P, assumptions: A, indiaSalary: 1_000_000 })!;
    expect(r.totalCostInr).toBeCloseTo(2_000_000 + 20_000 * 24, 0);
  });
  it("does not count the stipend (it depends on eligibility)", () => {
    const a = runIndiaMasters({ programme: prog(), profile: P, assumptions: A, indiaSalary: 1_000_000 })!;
    const b = runIndiaMasters({ programme: prog({ stipend_per_month_inr: null, stipend_note: null }), profile: P, assumptions: A, indiaSalary: 1_000_000 })!;
    expect(a.totalCostInr).toBe(b.totalCostInr);
    expect(a.sim.emi).toBe(b.sim.emi);
  });
  it("starts earning the placement median 3 months after graduating", () => {
    const r = runIndiaMasters({ programme: prog(), profile: P, assumptions: A, indiaSalary: 1_000_000 })!;
    const net = (1_800_000 * (1 - A.indiaTaxPct / 100)) / 12;
    expect(INDIA_JOB_SEARCH_MONTHS).toBe(3);
    expect(r.monthlyTakeHomeAtRepay).toBeCloseTo(24 + 6 >= 27 ? net : 0, 0); // repayment starts after study + grace (30 months), job began at month 27
  });
  it("with enough own funds there is no loan, EMI or gap", () => {
    const r = runIndiaMasters({ programme: prog(), profile: { ...P, familyFunds: 5_000_000 }, assumptions: A, indiaSalary: 1_000_000 })!;
    expect(r.sim.drawn).toBe(0);
    expect(r.sim.fundingGap).toBe(0);
    expect(r.loanFreeYears).toBeNull();
  });
  it("a higher placement salary pays back sooner against staying in India", () => {
    const low = runIndiaMasters({ programme: prog({ entry_salary: { ...prog().entry_salary, median_inr: 1_200_000 } }), profile: P, assumptions: A, indiaSalary: 1_000_000 })!;
    const high = runIndiaMasters({ programme: prog({ entry_salary: { ...prog().entry_salary, median_inr: 2_400_000 } }), profile: P, assumptions: A, indiaSalary: 1_000_000 })!;
    expect(high.paybackYears!).toBeLessThan(low.paybackYears ?? Infinity);
    expect(high.npv).toBeGreaterThan(low.npv);
  });
  it("cannot be run without an India salary or a fee", () => {
    expect(runIndiaMasters({ programme: prog(), profile: P, assumptions: A, indiaSalary: null })).toBeNull();
    expect(runIndiaMasters({ programme: prog({ tuition_total_inr: Number.NaN }), profile: P, assumptions: A, indiaSalary: 1_000_000 })).toBeNull();
  });
  it("keeps the five abroad scenarios separate from the India one", () => {
    expect(ABROAD_KEYS).toEqual(["optimistic", "expected", "conservative", "visaEnds", "returnHome"]);
    expect(Object.keys(SCENARIOS)).toEqual([...ABROAD_KEYS, "mastersIndia"]);
  });
});

describe("India master's dataset", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const data = JSON.parse(require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "data", "india-masters.json"), "utf8")) as { programmes: IndiaProgramme[] };
  it("covers all three courses", () => {
    for (const c of ["CS", "DS", "MBA"]) expect(data.programmes.some((p) => p.course === c)).toBe(true);
  });
  it("every programme has official sources, a placement median with its year, and runs through the model", () => {
    for (const p of data.programmes) {
      expect(p.fee_source_url).toMatch(/^https:\/\//);
      expect(p.entry_salary.source_url).toMatch(/^https:\/\//);
      expect(p.entry_salary.median_inr).toBeGreaterThan(300_000);
      expect(p.entry_salary.year).toMatch(/^20\d\d$/);
      const r = runIndiaMasters({ programme: p, profile: P, assumptions: A, indiaSalary: 1_000_000 });
      expect(r, p.id).not.toBeNull();
      expect(Number.isFinite(r!.totalCostInr)).toBe(true);
      expect(Number.isFinite(r!.sim.emi)).toBe(true);
    }
  });
  it("only programmes whose figures were all confirmed are labelled verified; the rest say what is missing", () => {
    for (const p of data.programmes) if (p.status !== "verified") expect(p.notes.length).toBeGreaterThan(40);
    expect(data.programmes.filter((p) => p.status === "verified").map((p) => p.id)).toEqual(["iitb-sjmsom-mba"]);
  });
  it("programmes without a published placement median were left out rather than given a borrowed one", () => {
    const ids = data.programmes.map((p) => p.id);
    for (const left of ["iitb-mtech-cse", "isi-mtech-cs", "iiitb-mtech-aids"]) expect(ids).not.toContain(left);
  });
});

describe("zero-tuition programmes", () => {
  it("run normally: the cost is just the other fees and living", () => {
    const r = runIndiaMasters({ programme: prog({ tuition_total_inr: 0, other_fees_total_inr: null, living_per_year_inr: null }), profile: P, assumptions: A, indiaSalary: 1_000_000 })!;
    expect(r.totalCostInr).toBeCloseTo(20_000 * 24, 0);
  });
});
