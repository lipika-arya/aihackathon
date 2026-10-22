import { describe, expect, it } from "vitest";
import { cumulative, economicRoi, emi, irr, npv, paybackIndex, simulate, toYears, type SimInput } from "./finance";

describe("emi", () => {
  it("matches the standard bank figure: 10 lakh, 10%, 10 years = 13,215.07", () => {
    expect(emi(1_000_000, 10, 120)).toBeCloseTo(13215.07, 1);
  });
  it("zero interest = principal / months", () => {
    expect(emi(120_000, 0, 12)).toBeCloseTo(10_000, 6);
  });
  it("higher rate never lowers EMI", () => {
    expect(emi(2_000_000, 11, 120)).toBeGreaterThan(emi(2_000_000, 9, 120));
  });
  it("no loan = no EMI", () => {
    expect(emi(0, 10, 120)).toBe(0);
  });
});

describe("npv / irr / payback", () => {
  it("npv of zeros is 0", () => expect(npv([0, 0, 0], 8)).toBe(0));
  it("npv discounts from year 1", () => expect(npv([-100, 110], 10)).toBeCloseTo(0, 9));
  it("irr of -100, +110 is 10%", () => expect(irr([-100, 110])).toBeCloseTo(10, 4));
  it("irr is null without a sign change", () => expect(irr([100, 10])).toBeNull());
  it("payback finds first non-negative cumulative", () => expect(paybackIndex([-100, 40, 40, 40])).toBe(3));
  it("payback is null when never recovered", () => expect(paybackIndex([-100, 10, 20, 30])).toBeNull());
  it("toYears groups 12 months", () => expect(toYears(Array(24).fill(1))).toEqual([12, 12]));
  it("cumulative", () => expect(cumulative([1, 2, 3])).toEqual([1, 3, 6]));
});

const base = (over: Partial<SimInput> = {}): SimInput => ({
  horizonMonths: 120,
  studyMonths: 24,
  studyCosts: [1_200_000, ...Array(23).fill(0)],
  ownFunds: 0,
  loanCap: 5_000_000,
  loan: { ratePct: 12, tenureMonths: 60, graceMonths: 0, payInterestDuringMoratorium: false, processingFeePct: 0 },
  income: Array(120).fill(0),
  living: Array(120).fill(0),
  baselineIncome: Array(120).fill(0),
  baselineLiving: Array(120).fill(0),
  ...over,
});

describe("simulate", () => {
  it("adds simple interest during study to the loan: 12L at 12% for 24 months = 2.88L", () => {
    const r = simulate(base());
    expect(r.capitalisedInterest).toBeCloseTo(288_000, 0);
    expect(r.principalAtRepayment).toBeCloseTo(1_488_000, 0);
    expect(r.emi).toBeCloseTo(emi(1_488_000, 12, 60), 6);
  });
  it("paying interest during study keeps principal unchanged", () => {
    const r = simulate(base({ loan: { ...base().loan, payInterestDuringMoratorium: true } }));
    expect(r.principalAtRepayment).toBeCloseTo(1_200_000, 0);
    expect(r.interestPaidDuringMoratorium).toBeCloseTo(288_000, 0);
  });
  it("own funds are used before borrowing", () => {
    const r = simulate(base({ ownFunds: 1_000_000 }));
    expect(r.drawn).toBeCloseTo(200_000, 0);
  });
  it("flags a funding gap instead of borrowing past the cap", () => {
    const r = simulate(base({ loanCap: 1_000_000 }));
    expect(r.drawn).toBe(1_000_000);
    expect(r.fundingGap).toBeCloseTo(200_000, 0);
  });
  it("loan closes at the end of its tenure", () => {
    const r = simulate(base());
    expect(r.loanClosedMonth).toBe(24 + 60 - 1);
    expect(r.balance[119]).toBe(0);
  });
  it("is deterministic", () => {
    expect(simulate(base())).toEqual(simulate(base()));
  });
  it("economic flows ignore financing; incremental subtracts the India path", () => {
    const r = simulate(base({ baselineIncome: Array(120).fill(50_000) }));
    expect(r.economic[0]).toBe(-1_200_000);
    expect(r.incremental[0]).toBe(-1_250_000);
  });
  it("economic ROI: invest 12L + forgone, benefit after", () => {
    const inc = [-1_200_000, ...Array(23).fill(0), ...Array(96).fill(25_000)];
    const { investment, roiPct } = economicRoi(inc, 24);
    expect(investment).toBe(1_200_000);
    expect(roiPct).toBeCloseTo(((96 * 25_000 - 1_200_000) / 1_200_000) * 100, 6);
  });
});
