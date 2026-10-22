// Recommendation engine: transparent, rule-based, weights editable by the student.
import { costBreakdown, costIncomplete, fxRate, missingInputs, runAll, visaRiskScore, type Assumptions, type Profile, type ScenarioResult, type Weights } from "./model";
import type { CountryData, Course, FxRates, LenderData, Programme } from "./types";

export interface Eligibility {
  label: string;
  status: "ok" | "fail" | "unknown";
  detail: string;
}

/** Only checks what can be checked from the published requirement text. Everything else is "Unable to assess". */
export function eligibility(p: Programme, prof: Profile): Eligibility[] {
  const out: Eligibility[] = [];
  const eng = p.requirements.english;
  const ielts = eng?.match(/IELTS[^0-9]{0,40}(\d(?:\.\d)?)/i);
  if (ielts && prof.ielts != null) {
    const need = parseFloat(ielts[1]);
    out.push({ label: "English (IELTS)", status: prof.ielts >= need ? "ok" : "fail", detail: `Needs ${need}, you have ${prof.ielts}` });
  } else {
    out.push({ label: "English", status: "unknown", detail: eng ? `Requirement: ${eng}` : "Requirement not found on the official page" });
  }
  const gg = p.requirements.gre_gmat;
  out.push({ label: "GRE / GMAT", status: "unknown", detail: gg ?? "Not stated on the official page" });
  const we = p.requirements.work_experience;
  const yrs = we?.match(/(\d+)\s*\+?\s*years?/i);
  // Wording like "not required", "unless", "alternative route" or "strongly recommended" means the years are not a hard
  // entry rule, so show the text and do not fail the student on a number picked out of an optional route.
  const hedged = !!we && /\b(not (required|mandatory|needed)|unless|alternative|optional|recommended|one route|routes?)\b/i.test(we);
  if (yrs && !hedged) {
    const need = parseInt(yrs[1]);
    out.push({ label: "Work experience", status: prof.workYears >= need ? "ok" : "fail", detail: `Needs about ${need} years, you have ${prof.workYears}` });
  } else if (we) out.push({ label: "Work experience", status: "unknown", detail: we });
  out.push({ label: "Academic record", status: "unknown", detail: p.requirements.gpa ?? "Minimum grade not stated; check with the university" });
  return out;
}

export interface Candidate {
  country: CountryData;
  programme: Programme;
  course: Course;
  results: ReturnType<typeof runAll>;
  expected: ScenarioResult | null;
  totalInr: number | null;
  rate: number; // INR per unit of local currency
  visaRisk: number;
  fundingGap: number;
  affordable: boolean;
  eligibility: Eligibility[];
  hardFail: boolean;
  missing: string[];
  costIncomplete: boolean; // mandatory fees not found, counted as 0
  components: Record<keyof Weights, number> | null; // 0-100 each
  score: number | null;
}

// The India salary is always the student's own input. No India salary source could be verified, so there is no baseline
// and no example: until they enter one this is null and the pages ask for it.
// (Unused parameters kept so callers did not need to change.)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function indiaSalaryFor(prof: Profile, _course?: Course, _lenders?: LenderData | null): number | null {
  return prof.indiaSalary != null && prof.indiaSalary >= 0 ? prof.indiaSalary : null; // 0 is valid: a fresher or unpaid family work earns nothing if they stay
}

const norm = (xs: number[], x: number) => {
  const lo = Math.min(...xs), hi = Math.max(...xs);
  return hi === lo ? 50 : ((x - lo) / (hi - lo)) * 100;
};

export function buildCandidates(countries: CountryData[], prof: Profile, a: Assumptions, fx: FxRates, lenders: LenderData | null): Candidate[] {
  const list: Candidate[] = [];
  for (const c of countries) {
    if (!prof.countries.includes(c.country)) continue;
    for (const p of c.programmes) {
      if (!prof.courses.includes(p.course)) continue;
      const ind = indiaSalaryFor(prof, p.course, lenders);
      const results = runAll({ country: c, programme: p, course: p.course, profile: prof, assumptions: a, fx, indiaSalary: ind });
      const expected = results.expected ?? null;
      const cb = costBreakdown(c, p, prof, a, fx);
      const elig = eligibility(p, prof);
      const gap = expected?.sim.fundingGap ?? 0;
      const emiOk = prof.maxEmi == null || !expected || expected.sim.emi <= prof.maxEmi;
      list.push({
        country: c, programme: p, course: p.course, results, expected,
        totalInr: cb?.totalInr ?? null,
        rate: fxRate(fx, c.currency, a),
        visaRisk: visaRiskScore(c),
        fundingGap: gap,
        affordable: gap <= 0 && emiOk,
        eligibility: elig,
        hardFail: elig.some((e) => e.status === "fail"),
        missing: missingInputs(c, p, p.course, ind),
        costIncomplete: costIncomplete(p),
        components: null,
        score: null,
      });
    }
  }
  score(list, prof);
  return list;
}

/** Normalise each component to 0-100 across the candidates, then weight. Risk is reversed so higher risk lowers the score. */
function score(list: Candidate[], prof: Profile) {
  const ok = list.filter((c) => c.expected && c.totalInr != null);
  if (!ok.length) return;
  // The ROI part compares with staying in India, so it only counts when an India salary was entered. Without one it is
  // left out of the weighted score (the other four parts are re-weighted) instead of being guessed.
  const useRoi = ok.every((c) => c.expected!.hasIndiaBaseline);
  const roi = ok.map((c) => c.expected!.npv);
  const sal = ok.map((c) => (c.country.salary[c.course]?.entry_mid ?? 0) * fxOf(c));
  const psw = ok.map((c) => c.country.visa.post_study_work.months_max ?? 0);
  const cost = ok.map((c) => c.totalInr!);
  const w = prof.priorities;
  const roiW = useRoi ? w.roi : 0;
  const wSum = roiW + w.employment + w.affordability + w.visa + w.fit || 1;
  for (const c of ok) {
    const fit = c.hardFail ? 0 : c.eligibility.every((e) => e.status !== "unknown") ? 100 : 60;
    const afford = Math.max(0, 100 - norm(cost, c.totalInr!)) * (c.fundingGap > 0 ? 0.3 : 1);
    const comp = {
      roi: useRoi ? norm(roi, c.expected!.npv) : 0,
      employment: 0.6 * norm(sal, (c.country.salary[c.course]?.entry_mid ?? 0) * fxOf(c)) + 0.4 * norm(psw, c.country.visa.post_study_work.months_max ?? 0),
      affordability: afford,
      visa: 100 - c.visaRisk,
      fit,
    };
    c.components = comp;
    c.score = (comp.roi * roiW + comp.employment * w.employment + comp.affordability * w.affordability + comp.visa * w.visa + comp.fit * w.fit) / wSum;
  }
}

const fxOf = (c: Candidate) => c.rate;

export type PickKey = "overall" | "budget" | "roi" | "career" | "lowRisk" | "immigration";

export const PICKS: Record<PickKey, { title: string; why: string }> = {
  overall: { title: "Best overall", why: "Highest weighted score using your priorities, among options you can fund and are not flagged ineligible." },
  budget: { title: "Best budget option", why: "Lowest total cost (tuition + living + one-time costs) among options you can fund." },
  roi: { title: "Highest estimated ROI", why: "Highest net present value against staying in India, in the expected scenario." },
  career: { title: "Best career opportunity", why: "Strongest combination of entry salary and length of post-study work rights." },
  lowRisk: { title: "Lowest financial risk", why: "Best financial position after 5 years if you return home after graduating (your worst case)." },
  immigration: { title: "Immigration-sensitive option", why: "Lowest AbroadROI Visa Policy Risk Score, ties broken by longer post-study work rights." },
};

export function picks(list: Candidate[]): Partial<Record<PickKey, Candidate>> {
  const scored = list.filter((c) => c.score != null);
  const fundable = scored.filter((c) => c.affordable && !c.hardFail);
  const pool = fundable.length ? fundable : scored;
  const best = <T,>(xs: T[], f: (x: T) => number) => xs.reduce<T | undefined>((b, x) => (b === undefined || f(x) > f(b) ? x : b), undefined);
  return {
    overall: best(pool, (c) => c.score!),
    budget: best(pool, (c) => -(c.totalInr ?? Infinity)),
    roi: pool.every((c) => c.expected!.hasIndiaBaseline) ? best(pool, (c) => c.expected!.npv) : undefined,
    career: best(pool, (c) => c.components!.employment),
    lowRisk: pool.every((c) => c.results.returnHome) ? best(pool, (c) => c.results.returnHome!.netPosition.y5) : undefined,
    immigration: best(pool, (c) => -c.visaRisk * 1000 + (c.country.visa.post_study_work.months_max ?? 0)),
  };
}

export interface ProfileLabel { label: string; why: string }

/** Explicit, documented rules. Labels describe; they never replace eligibility checks. */
export function profileLabels(prof: Profile, medianCostInr: number | null): ProfileLabel[] {
  const L: ProfileLabel[] = [];
  const funds = prof.familyFunds + prof.savings + prof.scholarship;
  if (medianCostInr != null && funds + prof.maxLoan < medianCostInr)
    L.push({ label: "Budget-constrained", why: `Your funds plus maximum loan (₹${fmtL(funds + prof.maxLoan)}) are below the median total cost of matching programmes (₹${fmtL(medianCostInr)}).` });
  if (prof.maxLoan <= 2_000_000 || prof.priorities.affordability >= 35)
    L.push({ label: "Low-debt preference", why: "Your maximum loan is ₹20 lakh or less, or you weighted affordability highly." });
  if (prof.courses.includes("MBA") && prof.workYears >= 3)
    L.push({ label: "Experienced professional seeking an MBA", why: `${prof.workYears} years of work experience and MBA selected.` });
  if ((prof.courses.includes("CS") || prof.courses.includes("DS")) && !/comput|information|it\b|software|data|electronic/i.test(prof.specialization))
    L.push({ label: "Career-switching candidate", why: `Your degree (${prof.specialization}) is outside computing, and you chose a technical master's.` });
  if (prof.courses.includes("DS") || /data/i.test(prof.goal))
    L.push({ label: "Data-focused technology candidate", why: "You selected Data Science or a data career goal." });
  if (prof.wantsPR || prof.priorities.visa >= 25)
    L.push({ label: "Immigration-sensitive applicant", why: "You want permanent residency or weighted visa risk highly." });
  if (prof.riskTolerance === "high" && prof.priorities.roi >= 30)
    L.push({ label: "High salary potential, high financial risk", why: "High risk tolerance and a strong weight on financial return." });
  if (prof.cgpa != null && prof.cgpa >= 8.5)
    L.push({ label: "Strong academic applicant", why: `CGPA ${prof.cgpa}/10.` });
  return L;
}

export const fmtL = (inr: number) => (inr / 100_000).toFixed(1) + "L";

/** Cost tier by fixed thresholds on total INR cost (documented on the methodology page). */
export const costTier = (inr: number | null) => (inr == null ? null : inr < 3_000_000 ? "Budget-friendly" : inr < 6_000_000 ? "Moderate-cost" : "Premium");
