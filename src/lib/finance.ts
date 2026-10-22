// Deterministic financial engine. Pure functions, all money in INR.
// No AI anywhere in here: every number on screen comes from these functions.

/** Monthly EMI for a fully amortising loan. */
export function emi(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 1200;
  if (r === 0) return principal / months;
  const f = (1 + r) ** months;
  return (principal * r * f) / (f - 1);
}

/** NPV of annual cash flows; flows[0] is year 0 (not discounted). */
export function npv(flows: number[], ratePct: number): number {
  return flows.reduce((s, cf, t) => s + cf / (1 + ratePct / 100) ** t, 0);
}

/** IRR by bisection. Returns null when cash flows don't change sign (IRR not meaningful). */
export function irr(flows: number[]): number | null {
  const hasNeg = flows.some((x) => x < 0);
  const hasPos = flows.some((x) => x > 0);
  if (!hasNeg || !hasPos) return null;
  const f = (r: number) => flows.reduce((s, cf, t) => s + cf / (1 + r) ** t, 0);
  let lo = -0.99, hi = 10;
  if (f(lo) * f(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(lo) * f(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return ((lo + hi) / 2) * 100;
}

/** First index where the running total of flows reaches >= 0 after the investment. null = never recovered. */
export function paybackIndex(flows: number[]): number | null {
  let cum = 0;
  let wentNegative = false;
  for (let i = 0; i < flows.length; i++) {
    cum += flows[i];
    if (cum < 0) wentNegative = true;
    else if (wentNegative) return i;
  }
  return null;
}

export interface LoanTerms {
  ratePct: number; // annual
  tenureMonths: number; // repayment period after moratorium
  graceMonths: number; // moratorium after course ends
  payInterestDuringMoratorium: boolean; // true = pay simple interest monthly; false = add it to the loan
  processingFeePct: number; // % of planned loan, paid upfront
}

export interface SimInput {
  horizonMonths: number;
  studyMonths: number;
  studyCosts: number[]; // INR spent in each month of study (index 0 = first month)
  ownFunds: number; // family + savings + scholarship, INR
  loanCap: number; // max loan the student will take, INR
  loan: LoanTerms;
  income: number[]; // net (after-tax) income per month, INR, abroad path
  living: number[]; // living cost per month after study, INR, abroad path (study-period living is inside studyCosts)
  baselineIncome: number[]; // India path: net income per month
  baselineLiving: number[]; // India path: living per month
}

export interface SimResult {
  plannedLoan: number;
  drawn: number;
  fundingGap: number; // costs neither own funds nor loan could cover; family must find this
  capitalisedInterest: number;
  interestPaidDuringMoratorium: number;
  principalAtRepayment: number;
  emi: number;
  totalInterest: number;
  totalRepaid: number;
  repayStartMonth: number;
  loanClosedMonth: number | null; // null = not repaid within horizon
  balance: number[]; // end-of-month loan balance
  personal: number[]; // student's cash flow per month (what leaves/enters their pocket)
  economic: number[]; // abroad path without financing: -costs + income - living
  baseline: number[]; // India path: income - living
  incremental: number[]; // economic - baseline
}

/** Month-by-month simulation of one path. Own funds are spent first; the loan covers the rest as costs fall due. */
export function simulate(inp: SimInput): SimResult {
  const H = inp.horizonMonths;
  const r = inp.loan.ratePct / 1200;
  const totalCost = inp.studyCosts.reduce((a, b) => a + b, 0);
  const plannedLoan = Math.min(inp.loanCap, Math.max(0, totalCost - inp.ownFunds));
  const repayStart = inp.studyMonths + inp.loan.graceMonths;

  let own = inp.ownFunds, bal = 0, drawn = 0, accrued = 0, gap = 0;
  let capitalised = 0, interestPaidMor = 0, totalInterest = 0, totalRepaid = 0;
  let emiAmt = 0, principalAtRepay = 0, closed: number | null = null;
  const balance: number[] = [], personal: number[] = [], economic: number[] = [], baseline: number[] = [], incremental: number[] = [];

  for (let m = 0; m < H; m++) {
    const cost = inp.studyCosts[m] ?? 0;
    let out = 0;

    // fund this month's costs: own money first, then loan, then gap
    const fromOwn = Math.min(own, cost);
    own -= fromOwn;
    out += fromOwn;
    let need = cost - fromOwn;
    const draw = Math.min(need, Math.max(0, plannedLoan - drawn));
    drawn += draw;
    bal += draw;
    need -= draw;
    if (need > 1) { gap += need; out += need; } // ignore sub-rupee float noise
    if (m === 0 && plannedLoan > 0) out += (plannedLoan * inp.loan.processingFeePct) / 100;

    if (m < repayStart) {
      const i = bal * r; // simple interest on outstanding principal
      totalInterest += i;
      if (inp.loan.payInterestDuringMoratorium) { interestPaidMor += i; out += i; }
      else accrued += i;
    } else {
      if (m === repayStart) {
        capitalised = accrued;
        bal += accrued;
        accrued = 0;
        principalAtRepay = bal;
        emiAmt = emi(bal, inp.loan.ratePct, inp.loan.tenureMonths);
      }
      if (bal > 0.5) {
        const i = bal * r;
        const pay = Math.min(emiAmt, bal + i);
        bal = bal + i - pay;
        totalInterest += i;
        totalRepaid += pay;
        out += pay;
        if (bal <= 0.5) { bal = 0; closed = m; }
      }
    }

    const inc = inp.income[m] ?? 0;
    const liv = m >= inp.studyMonths ? inp.living[m] ?? 0 : 0;
    const base = (inp.baselineIncome[m] ?? 0) - (inp.baselineLiving[m] ?? 0);
    personal.push(inc - liv - out);
    economic.push(inc - liv - cost);
    baseline.push(base);
    incremental.push(inc - liv - cost - base);
    balance.push(bal + accrued);
  }

  return {
    plannedLoan, drawn, fundingGap: gap, capitalisedInterest: capitalised,
    interestPaidDuringMoratorium: interestPaidMor, principalAtRepayment: principalAtRepay,
    emi: emiAmt, totalInterest, totalRepaid: totalRepaid + interestPaidMor,
    repayStartMonth: repayStart, loanClosedMonth: drawn > 0 ? closed : null,
    balance, personal, economic, baseline, incremental,
  };
}

/** Sum monthly flows into years: year 0 = months 0-11, year 1 = 12-23, ... */
export function toYears(monthly: number[]): number[] {
  const out: number[] = [];
  monthly.forEach((v, m) => { out[Math.floor(m / 12)] = (out[Math.floor(m / 12)] ?? 0) + v; });
  return out;
}

export function cumulative(xs: number[]): number[] {
  let s = 0;
  return xs.map((x) => (s += x));
}

/**
 * Economic ROI over the horizon.
 * Investment = how far the incremental cash flow goes negative during study (costs + India earnings given up).
 * ROI = cumulative incremental net benefit / investment * 100. Same as (benefit - investment) / investment.
 */
export function economicRoi(incremental: number[], studyMonths: number): { investment: number; roiPct: number | null } {
  const investment = -incremental.slice(0, studyMonths).reduce((a, b) => a + b, 0);
  if (investment <= 0) return { investment, roiPct: null };
  const total = incremental.reduce((a, b) => a + b, 0);
  return { investment, roiPct: (total / investment) * 100 };
}
