// Turns research data + a student profile + assumptions into scenario results.
import { cumulative, economicRoi, irr, npv, paybackIndex, simulate, toYears, type SimResult } from "./finance";
import type { CountryCode, CountryData, Course, FxRates, Programme, RiskKey } from "./types";

export type Lifestyle = "budget" | "moderate" | "comfortable";

export interface Profile {
  qualification: string;
  specialization: string;
  cgpa: number | null; // out of 10
  ielts: number | null;
  toefl: number | null;
  gre: number | null;
  gmat: number | null;
  workYears: number;
  courses: Course[];
  goal: string;
  countries: CountryCode[];
  familyFunds: number;
  savings: number;
  scholarship: number;
  maxLoan: number;
  collateral: boolean;
  coApplicant: boolean;
  maxEmi: number | null;
  repaymentYears: number;
  partTime: boolean;
  indiaSalary: number | null; // INR / year gross if staying in India
  indiaLiving: number; // INR / month
  lifestyle: Lifestyle;
  wantsPR: boolean;
  riskTolerance: "low" | "medium" | "high";
  priorities: Weights;
}

export interface Weights {
  roi: number;
  employment: number;
  affordability: number;
  visa: number;
  fit: number;
}

// Starting assumptions, not facts. Shown and editable in the app.
export const DEFAULT_WEIGHTS: Weights = { roi: 25, employment: 20, affordability: 20, visa: 15, fit: 10 };

export const DEFAULT_PROFILE: Profile = {
  qualification: "B.Tech / B.E.",
  specialization: "Computer Science",
  cgpa: null, ielts: null, toefl: null, gre: null, gmat: null,
  workYears: 0,
  courses: ["CS"],
  goal: "Software engineering",
  countries: ["US", "DE", "CA", "JP", "AU"],
  familyFunds: 1_000_000,
  savings: 0,
  scholarship: 0,
  maxLoan: 4_000_000,
  collateral: false,
  coApplicant: true,
  maxEmi: null,
  repaymentYears: 10,
  partTime: false,
  indiaSalary: null,
  indiaLiving: 25_000,
  lifestyle: "moderate",
  wantsPR: false,
  riskTolerance: "medium",
  priorities: DEFAULT_WEIGHTS,
};

export interface Assumptions {
  horizonYears: number;
  loanRatePct: number;
  graceMonths: number;
  payInterestDuringMoratorium: boolean;
  processingFeePct: number;
  inrDepreciationPct: number; // INR weakens by this much per year vs foreign currency
  salaryGrowthAbroadPct: number;
  salaryGrowthIndiaPct: number;
  indiaTaxPct: number;
  livingInflationPct: number; // yearly rise in living costs after study, India and abroad
  discountRatePct: number;
  flightsInr: number;
  testsAndApplicationsInr: number;
  partTimeMonthlyLocal: number; // only used when profile.partTime
  fxOverride: Partial<Record<string, number>>; // INR per unit
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  horizonYears: 10,
  loanRatePct: 11,
  graceMonths: 6,
  payInterestDuringMoratorium: false,
  processingFeePct: 1,
  inrDepreciationPct: 2,
  salaryGrowthAbroadPct: 4,
  salaryGrowthIndiaPct: 7,
  indiaTaxPct: 10,
  livingInflationPct: 4,
  discountRatePct: 8,
  flightsInr: 70_000,
  testsAndApplicationsInr: 40_000,
  partTimeMonthlyLocal: 0,
  fxOverride: {},
};

export type ScenarioKey = "optimistic" | "expected" | "conservative" | "visaEnds" | "returnHome";

export const SCENARIOS: Record<ScenarioKey, { label: string; short: string; explain: string }> = {
  optimistic: { label: "Optimistic", short: "Job abroad fast", explain: "Job abroad 3 months after graduating at the high end of entry salaries. INR stays flat. No tuition increase." },
  expected: { label: "Expected", short: "Job abroad", explain: "Job abroad 6 months after graduating at the middle entry salary. INR weakens at your assumed rate. Tuition rises 3% in year two." },
  conservative: { label: "Conservative", short: "Slow job search", explain: "Job abroad 12 months after graduating at the low end of entry salaries. INR weakens 2 points faster. Tuition rises 5% in year two." },
  visaEnds: { label: "Work permit ends", short: "Visa lost, back to India", explain: "Expected job abroad, but you return to India when the post-study work permit ends (no sponsorship or PR). Then you earn your India salary." },
  returnHome: { label: "Return home", short: "Back to India", explain: "You return to India right after graduating and repay the loan on your India salary." },
};

export const RISK_WEIGHTS: Record<RiskKey, { weight: number; label: string }> = {
  policy_volatility: { weight: 25, label: "Student visa policy volatility" },
  psw_uncertainty: { weight: 25, label: "Post-study work uncertainty" },
  work_restrictions: { weight: 20, label: "Work restrictions" },
  funds_burden: { weight: 15, label: "Proof-of-funds burden" },
  recent_adverse: { weight: 15, label: "Recent adverse changes" },
};

/** AbroadROI Visa Policy Risk Score, 0-100, higher = more risk. Our own comparative index, not an official statistic. */
export function visaRiskScore(c: CountryData): number {
  let s = 0;
  for (const k of Object.keys(RISK_WEIGHTS) as RiskKey[]) s += (RISK_WEIGHTS[k].weight * (c.risk_factors?.[k]?.score ?? 50)) / 100;
  return Math.round(s);
}
export function riskBand(score: number): "Low" | "Moderate" | "High" {
  return score < 30 ? "Low" : score < 55 ? "Moderate" : "High";
}

export function fxRate(fx: FxRates, cur: string, a: Assumptions): number {
  return a.fxOverride[cur] ?? fx.inrPer[cur as keyof FxRates["inrPer"]] ?? NaN;
}

/** Semesters billed: from the data when stated (e.g. a 12-month fall-spring-summer programme = 3), else duration / 6. */
export const semesterCount = (p: Programme) => p.tuition?.semesters ?? Math.max(1, Math.round(p.duration_months / 6));

/** Total tuition for the whole programme in local currency, or null if it can't be worked out from the source. */
export function tuitionTotalLocal(p: Programme): number | null {
  const t = p.tuition;
  if (!t || t.amount == null) return null;
  switch (t.period) {
    case "total": return t.amount;
    case "year": return t.amount * (p.duration_months / 12);
    case "semester": return t.amount * semesterCount(p);
    case "credit": return t.credits_total ? t.amount * t.credits_total : null;
  }
  return null;
}

export function livingMonthLocal(c: CountryData, p: Programme | null, lifestyle: Lifestyle): number | null {
  const lc = c.living_cost;
  if (lifestyle === "budget") return lc.budget_month;
  if (lifestyle === "comfortable") return lc.comfortable_month;
  if (p?.living_cost_per_year) return p.living_cost_per_year.amount / 12;
  return lc.moderate_month;
}

/** Visa fees in INR. Each fee converts from its own currency (Japan's fees for Indians are charged in INR). */
export function visaFeesInr(c: CountryData, fx: FxRates, a: Assumptions): number {
  return c.visa.student_visa.fees.reduce((sum, f) => {
    const r = f.currency === "INR" ? 1 : fxRate(fx, f.currency, a);
    return sum + (Number.isFinite(r) ? f.amount * r : 0);
  }, 0);
}

export interface CostBreakdown {
  currency: string;
  rate: number;
  tuition: number; // local
  fees: number;
  health: number; // compulsory health cover charged on top of living costs, local currency
  living: number;
  visa: number;
  oneTimeInr: number; // flights, tests, applications, deposit
  totalLocal: number;
  totalInr: number;
}

export function costBreakdown(c: CountryData, p: Programme, prof: Profile, a: Assumptions, fx: FxRates, lifestyle = prof.lifestyle): CostBreakdown | null {
  const tuition = tuitionTotalLocal(p);
  const livM = livingMonthLocal(c, p, lifestyle);
  if (tuition == null || livM == null) return null;
  const rate = fxRate(fx, c.currency, a);
  const years = p.duration_months / 12;
  const fees = (p.mandatory_fees_per_year ?? 0) * years;
  const health = (c.health_insurance_per_year?.amount ?? 0) * years;
  const living = livM * p.duration_months;
  const visa = visaFeesInr(c, fx, a) / rate;
  const deposit = livM * 2 * rate;
  const oneTimeInr = a.flightsInr + a.testsAndApplicationsInr + deposit;
  const totalLocal = tuition + fees + health + living + visa;
  return { currency: c.currency, rate, tuition, fees, health, living, visa, oneTimeInr, totalLocal, totalInr: totalLocal * rate + oneTimeInr };
}

export interface ScenarioResult {
  key: ScenarioKey;
  sim: SimResult;
  totalCostInr: number;
  monthlyTakeHomeAtRepay: number;
  emiShareOfTakeHome: number | null;
  paybackYears: number | null; // years from start of study until incremental cash flow recovers
  npv: number;
  irrPct: number | null;
  roiPct: number | null;
  investment: number;
  netPosition: { y5: number; y10: number }; // cumulative personal cash - outstanding loan
  years: { year: number; personal: number; cumulative: number; balance: number; income: number }[];
  loanFreeYears: number | null; // years after graduation to clear the loan if all spare income goes to it
  scheduledYears: number; // years after graduation on the bank's schedule (grace + tenure)
  emiShortfall: number; // INR per month the EMI exceeds take-home minus living when repayment starts
}

export interface ModelInput {
  country: CountryData;
  programme: Programme;
  course: Course;
  profile: Profile;
  assumptions: Assumptions;
  fx: FxRates;
  indiaSalary: number | null; // gross INR/year
}

export function runScenario(inp: ModelInput, key: ScenarioKey): ScenarioResult | null {
  const { country: c, programme: p, profile: prof, assumptions: a, fx } = inp;
  const band = c.salary[inp.course];
  const livM = livingMonthLocal(c, p, prof.lifestyle);
  const tuitionTotal = tuitionTotalLocal(p);
  const postLivM = livingMonthLocal(c, null, "moderate");
  if (!band || band.entry_mid == null || livM == null || tuitionTotal == null || inp.indiaSalary == null || postLivM == null) return null;

  const H = a.horizonYears * 12;
  const D = p.duration_months;
  const dep = key === "optimistic" ? 0 : key === "conservative" ? a.inrDepreciationPct + 2 : a.inrDepreciationPct;
  const tuitionRise = key === "optimistic" ? 0 : key === "conservative" ? 5 : 3;
  const rate0 = fxRate(fx, c.currency, a);
  const rateAt = (m: number) => rate0 * (1 + dep / 100) ** (m / 12);

  // study-period costs, INR, month by month: tuition each semester start, fees each year start, living monthly
  const semesters = semesterCount(p);
  const costs = Array(D).fill(0);
  for (let s = 0; s < semesters; s++) {
    const m = Math.floor((s * D) / semesters); // semester starts spread across the programme
    costs[m] += (tuitionTotal / semesters) * (m >= 12 ? 1 + tuitionRise / 100 : 1) * rateAt(m);
  }
  const yearlyExtras = (p.mandatory_fees_per_year ?? 0) + (c.health_insurance_per_year?.amount ?? 0);
  for (let y = 0; y < Math.ceil(D / 12); y++) costs[y * 12] += yearlyExtras * Math.min(1, (D - y * 12) / 12) * rateAt(y * 12);
  for (let m = 0; m < D; m++) costs[m] += livM * rateAt(m);
  costs[0] += visaFeesInr(c, fx, a) + a.flightsInr + a.testsAndApplicationsInr + livM * 2 * rate0;
  const totalCostInr = costs.reduce((x, y) => x + y, 0);

  const salary = key === "optimistic" ? band.entry_high ?? band.entry_mid : key === "conservative" ? band.entry_low ?? band.entry_mid : band.entry_mid;
  const search = key === "optimistic" ? 3 : key === "conservative" ? 12 : 6;
  const tax = c.tax.effective_rate ?? 0.3;
  const pswMonths = c.visa.post_study_work.months_max ?? 12;
  const jobStart = D + search;
  const homeFrom = key === "returnHome" ? D : key === "visaEnds" ? D + pswMonths : Infinity;

  const indiaNet = (m: number) => ((inp.indiaSalary! * (1 + a.salaryGrowthIndiaPct / 100) ** Math.floor(m / 12)) * (1 - a.indiaTaxPct / 100)) / 12;
  const indiaLiv = (m: number) => prof.indiaLiving * (1 + a.livingInflationPct / 100) ** Math.floor(m / 12);

  const incAt = (m: number) => {
    if (m < D) return prof.partTime ? a.partTimeMonthlyLocal * rateAt(m) : 0;
    if (m >= homeFrom) return m >= homeFrom + 3 ? indiaNet(m) : 0; // back in India: assume a 3-month job search there
    const gross = m >= jobStart ? salary * (1 + a.salaryGrowthAbroadPct / 100) ** Math.floor((m - jobStart) / 12) : 0;
    return ((gross * (1 - tax)) / 12) * rateAt(m);
  };
  const livAt = (m: number) => (m < D ? 0 : m >= homeFrom ? indiaLiv(m) : postLivM * (1 + a.livingInflationPct / 100) ** Math.floor((m - D) / 12) * rateAt(m));
  const income: number[] = [], living: number[] = [], bInc: number[] = [], bLiv: number[] = [];
  for (let m = 0; m < H; m++) {
    bInc.push(indiaNet(m));
    bLiv.push(indiaLiv(m));
    income.push(incAt(m));
    living.push(livAt(m));
  }

  const sim = simulate({
    horizonMonths: H, studyMonths: D, studyCosts: costs,
    ownFunds: prof.familyFunds + prof.savings + prof.scholarship,
    loanCap: prof.maxLoan,
    loan: { ratePct: a.loanRatePct, tenureMonths: prof.repaymentYears * 12, graceMonths: a.graceMonths, payInterestDuringMoratorium: a.payInterestDuringMoratorium, processingFeePct: a.processingFeePct },
    income, living, baselineIncome: bInc, baselineLiving: bLiv,
  });

  // Fastest payoff: pay the EMI, or everything left after living costs if that's more (prepayment).
  // If what's left is below the EMI, the EMI is still paid and the gap is a monthly shortfall the family must cover.
  const r = a.loanRatePct / 1200;
  let bal = sim.principalAtRepayment, payoffMonth: number | null = null, shortfall = 0;
  for (let m = sim.repayStartMonth; bal > 0.5 && m < sim.repayStartMonth + 480; m++) {
    const spare = incAt(m) - livAt(m);
    if (m === sim.repayStartMonth) shortfall = Math.max(0, sim.emi - Math.max(0, spare)); // part of the EMI income can't cover
    bal = bal * (1 + r) - Math.max(sim.emi, spare);
    if (bal <= 0.5) payoffMonth = m;
  }

  const incY = toYears(sim.incremental);
  const pb = paybackIndex(sim.incremental);
  const { investment, roiPct } = economicRoi(sim.incremental, D);
  const persCum = cumulative(sim.personal);
  const pos = (m: number) => (persCum[Math.min(m, H) - 1] ?? 0) - (sim.balance[Math.min(m, H) - 1] ?? 0);
  const takeHome = income[sim.repayStartMonth] ?? 0;
  const yearsArr = toYears(sim.personal).map((v, i) => ({
    year: i,
    personal: v,
    cumulative: persCum[Math.min((i + 1) * 12, H) - 1],
    balance: sim.balance[Math.min((i + 1) * 12, H) - 1],
    income: income.slice(i * 12, (i + 1) * 12).reduce((x, y) => x + y, 0),
  }));

  return {
    key, sim, totalCostInr,
    monthlyTakeHomeAtRepay: takeHome,
    emiShareOfTakeHome: sim.emi > 0 ? (takeHome > 0 ? sim.emi / takeHome : Infinity) : null,
    paybackYears: pb == null ? null : (pb + 1) / 12,
    npv: npv(incY, a.discountRatePct),
    irrPct: irr(incY),
    roiPct, investment,
    netPosition: { y5: pos(60), y10: pos(120) },
    years: yearsArr,
    loanFreeYears: sim.drawn > 0 && payoffMonth != null ? (payoffMonth + 1 - D) / 12 : null,
    scheduledYears: prof.repaymentYears + a.graceMonths / 12,
    emiShortfall: shortfall,
  };
}

export function runAll(inp: ModelInput): Partial<Record<ScenarioKey, ScenarioResult>> {
  const out: Partial<Record<ScenarioKey, ScenarioResult>> = {};
  for (const k of Object.keys(SCENARIOS) as ScenarioKey[]) {
    const r = runScenario(inp, k);
    if (r) out[k] = r;
  }
  return out;
}

/** What's missing for a full calculation, in plain words. */
export function missingInputs(c: CountryData, p: Programme, course: Course, indiaSalary: number | null): string[] {
  const m: string[] = [];
  if (tuitionTotalLocal(p) == null) m.push("Verified tuition for this programme");
  if (livingMonthLocal(c, p, "moderate") == null) m.push(`Living-cost estimate for ${c.name}`);
  if (!c.salary[course] || c.salary[course]?.entry_mid == null) m.push(`Entry salary data for this course in ${c.name}`);
  if (indiaSalary == null) m.push("Your expected India salary (for the stay-in-India comparison)");
  return m;
}
