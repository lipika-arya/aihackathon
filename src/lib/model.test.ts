import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS, DEFAULT_PROFILE, runAll, semesterCount, tuitionTotalLocal, visaRiskScore } from "./model";
import { buildCandidates, picks } from "./recommend";
import type { CountryData, FxRates, Programme } from "./types";

const fx: FxRates = { inrPer: { INR: 1, USD: 90, EUR: 100, CAD: 65, JPY: 0.6, AUD: 60 }, date: "2026-10-22", source: "test", live: false };

const prog = (over: Partial<Programme> = {}): Programme => ({
  id: "x", university: "U", city: "C", course: "CS", programme_name: "MS CS", duration_months: 24,
  tuition: { amount: 20_000, period: "year", credits_total: null, fee_year: "2026-27", source_url: "https://u.edu" },
  mandatory_fees_per_year: null, living_cost_per_year: null,
  requirements: { gpa: null, english: "IELTS 6.5 overall", gre_gmat: null, work_experience: null },
  scholarships: null, programme_url: "https://u.edu", status: "verified", notes: "", ...over,
});

const country = (over: Partial<CountryData> = {}): CountryData => ({
  country: "US", name: "Testland", currency: "USD", verified_at: "2026-10-22",
  programmes: [prog()],
  living_cost: { budget_month: 1500, moderate_month: 2000, comfortable_month: 3000, basis: "test", source_url: null },
  visa: {
    student_visa: { name: "F-1", fees: [{ label: "fee", amount: 200, currency: "USD" }], source_url: "https://gov" },
    proof_of_funds: { text: "", source_url: null }, work_during_study: { text: "", source_url: null },
    post_study_work: { name: "PSW", months_max: 24, text: "", source_url: "https://gov" },
    pr_pathway: { text: "", source_url: null }, recent_changes: [],
  },
  risk_factors: { policy_volatility: { score: 40, evidence: "" }, psw_uncertainty: { score: 40, evidence: "" }, work_restrictions: { score: 40, evidence: "" }, funds_burden: { score: 40, evidence: "" }, recent_adverse: { score: 40, evidence: "" } },
  salary: { CS: { roles: [], entry_low: 70_000, entry_mid: 90_000, entry_high: 110_000, basis: "", source_name: "", source_url: "", period: "" } },
  tax: { effective_rate: 0.25, basis: "", source_url: null },
  checklist: [], ...over,
});

const base = { course: "CS" as const, profile: { ...DEFAULT_PROFILE, maxLoan: 1e8 }, assumptions: DEFAULT_ASSUMPTIONS, fx, indiaSalary: 1_000_000 };

describe("model", () => {
  it("per-year tuition scales with duration; semester count can be overridden", () => {
    expect(tuitionTotalLocal(prog())).toBe(40_000);
    const gt = prog({ duration_months: 12, tuition: { amount: 10_000, period: "semester", credits_total: null, semesters: 3, fee_year: "", source_url: "" } });
    expect(semesterCount(gt)).toBe(3);
    expect(tuitionTotalLocal(gt)).toBe(30_000);
  });
  it("credit-based tuition without a credit count is unknown, not zero", () => {
    expect(tuitionTotalLocal(prog({ tuition: { amount: 1000, period: "credit", credits_total: null, fee_year: "", source_url: "" } }))).toBeNull();
  });
  it("a job abroad clears the loan faster than returning home", () => {
    const c = country();
    const r = runAll({ ...base, country: c, programme: c.programmes[0] });
    expect(r.expected!.loanFreeYears!).toBeLessThan(r.returnHome!.loanFreeYears ?? Infinity);
    expect(r.returnHome!.emiShortfall).toBeGreaterThanOrEqual(0);
  });
  it("missing salary gives no result instead of a zero-salary result", () => {
    const c = country({ salary: {} });
    expect(runAll({ ...base, country: c, programme: c.programmes[0] })).toEqual({});
  });
  it("visa risk score is the weighted average", () => {
    expect(visaRiskScore(country())).toBe(40);
  });
  it("cheaper tuition never raises the funding need", () => {
    const hi = country(), lo = country({ programmes: [prog({ tuition: { ...prog().tuition!, amount: 10_000 } })] });
    const a = runAll({ ...base, country: hi, programme: hi.programmes[0] }).expected!;
    const b = runAll({ ...base, country: lo, programme: lo.programmes[0] }).expected!;
    expect(b.sim.drawn).toBeLessThanOrEqual(a.sim.drawn);
  });
  it("IELTS below the published minimum is flagged and excluded from picks when a fundable option exists", () => {
    const c = country({ programmes: [prog({ id: "a" }), prog({ id: "b", requirements: { gpa: null, english: "IELTS 8.0", gre_gmat: null, work_experience: null } })] });
    const list = buildCandidates([c], { ...DEFAULT_PROFILE, ielts: 7, countries: ["US"], maxLoan: 1e8, indiaSalary: 1_000_000 }, DEFAULT_ASSUMPTIONS, fx, null);
    expect(list.find((x) => x.programme.id === "b")!.hardFail).toBe(true);
    expect(picks(list).overall!.programme.id).toBe("a");
  });
});
