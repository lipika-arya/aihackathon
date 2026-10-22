import { DEFAULT_ASSUMPTIONS, DEFAULT_WEIGHTS, RISK_WEIGHTS, SCENARIOS } from "@/lib/model";
import { PICKS } from "@/lib/recommend";

const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-10 text-xl font-extrabold">{children}</h2>;
const F = ({ children }: { children: React.ReactNode }) => <pre className="card mt-2 overflow-x-auto p-3 text-xs leading-relaxed">{children}</pre>;

export default function Methodology() {
  const a = DEFAULT_ASSUMPTIONS;
  return (
    <article className="max-w-3xl text-sm leading-relaxed">
      <p className="text-xs font-semibold uppercase tracking-wider text-forest">Methodology</p>
      <h1 className="mt-1 text-3xl font-extrabold">How AbroadROI calculates everything</h1>
      <p className="mt-2 text-slate">Every number comes from deterministic code you can read on GitHub (src/lib/finance.ts, model.ts, recommend.ts), with unit tests. No AI model calculates or decides anything.</p>

      <H>1. Data labels</H>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li><strong>Verified</strong>: read on an official page (university, government, lender) on the date shown.</li>
        <li><strong>Partly verified</strong>: some fields confirmed, others missing or from a secondary source.</li>
        <li><strong>Estimate</strong>: derived from sourced figures with a stated method (e.g. one effective tax rate).</li>
        <li><strong>Assumption</strong>: a planning input you can change (growth rates, FX drift, flights).</li>
        <li><strong>Your input</strong>: what you entered. <strong>Calculated</strong>: output of the model.</li>
        <li><strong>Data unavailable</strong>: we couldn&apos;t confirm it. Missing values are never treated as zero in cost or salary calculations (one exception: a programme&apos;s mandatory fees, when not published, are excluded and labelled).</li>
      </ul>

      <H>2. Currency</H>
      <p className="mt-2">All amounts are converted to INR with European Central Bank reference rates via Frankfurter, refreshed daily. If the live feed fails we use the last stored rate and label it &quot;not current&quot;. You can override the planning rate. Projections let the INR weaken by a set % per year (default {a.inrDepreciationPct}%): this raises the INR cost of later fees and the INR value of a foreign salary.</p>
      <F>{`INR amount in month m = local amount × rate₀ × (1 + INR depreciation)^(m/12)`}</F>

      <H>3. Total cost</H>
      <F>{`Tuition: total, or per year × years, or per semester × semesters, or per credit × credits
Total cost = tuition + mandatory fees + living × months + visa fees
           + flights (₹${a.flightsInr.toLocaleString("en-IN")}) + tests & applications (₹${a.testsAndApplicationsInr.toLocaleString("en-IN")}) + 2 months' living as deposit
Living: budget = official proof-of-funds or minimum figure; moderate = university's own estimate where published, else country estimate; comfortable = country estimate`}</F>
      <p className="mt-2">Loan principal is not added to cost (it pays for the cost). Interest and processing fees are financing costs, shown separately.</p>

      <H>4. Loan</H>
      <F>{`Own funds (family + savings + scholarship) are spent first; the loan draws only when fees fall due
(tuition at each semester start, fees each year, living monthly), up to your maximum loan.
Anything left uncovered = funding gap (flagged, never silently borrowed).
During study + grace (${a.graceMonths} months): simple interest = balance × r/12 each month
  either paid monthly, or added to the principal when EMIs start (your choice; banks differ)
EMI = P × r × (1+r)^n / ((1+r)^n − 1), r = annual rate / 12, n = repayment months (r = 0 → P/n)`}</F>

      <H>5. Income</H>
      <F>{`Abroad take-home per month = gross entry salary × (1 + growth)^years × (1 − effective tax rate) / 12
Entry salary: low / mid / high from the official source shown on each country (e.g. BLS percentiles, Job Bank, QILT)
India path: your India salary (or our sourced baseline) × (1 − India tax ${a.indiaTaxPct}%) growing ${a.salaryGrowthIndiaPct}%/yr,
            minus India living cost growing ${a.livingInflationPct}%/yr`}</F>

      <H>6. Scenarios</H>
      <ul className="mt-2 list-disc space-y-1 pl-5">{Object.values(SCENARIOS).map((s) => <li key={s.label}><strong>{s.label}</strong>: {s.explain}</li>)}</ul>
      <p className="mt-2">Scenarios are what-ifs. We don&apos;t attach probabilities to them because no reliable data exists to do so.</p>

      <H>7. ROI, NPV, IRR, payback</H>
      <F>{`Personal cash flow (each month) = take-home − living − own money spent on study − interest paid − EMI
Economic cash flow = take-home − living − study costs   (ignores financing)
Incremental = economic (abroad) − India path
Investment I = −Σ incremental during study   (costs + India earnings given up)
Economic ROI = Σ incremental over horizon / I × 100     (= (benefit − I) / I)
NPV = Σ incremental_year_t / (1 + ${a.discountRatePct}%)^t, t = 0..${a.horizonYears - 1}
IRR = rate where NPV = 0 (bisection); "not meaningfully calculable" if flows never change sign
Payback = first month cumulative incremental ≥ 0; "not within horizon" if never
Net position (year 5, 10) = cumulative personal cash − loan still owed`}</F>
      <p className="mt-2"><strong>Personal vs economic:</strong> a small EMI can still hide a poor economic return, and a large loan can still be a good investment. We show both.</p>

      <H>8. Visa Policy Risk Score</H>
      <p className="mt-2">Our own comparative 0-100 index (higher = more risk). Each factor is scored 0-100 by our researchers from the evidence shown on the Visa page, using one rubric for all five countries:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">{Object.values(RISK_WEIGHTS).map((r) => <li key={r.label}>{r.label}: {r.weight}%</li>)}</ul>
      <p className="mt-2">It is not an official statistic, not a refusal rate, and does not predict an individual outcome.</p>

      <H>9. Recommendations</H>
      <F>{`Components (each scaled 0-100 across the options shown):
  ROI = expected-scenario NPV
  Employment = 0.6 × entry salary in INR + 0.4 × post-study work months
  Affordability = 100 − scaled total cost (× 0.3 if there is a funding gap)
  Visa = 100 − risk score
  Fit = 0 if a published requirement is not met, 100 if all checks pass, 60 if some can't be assessed
Score = Σ component × weight / Σ weights
Default weights (editable): ROI ${DEFAULT_WEIGHTS.roi}, employment ${DEFAULT_WEIGHTS.employment}, affordability ${DEFAULT_WEIGHTS.affordability}, visa ${DEFAULT_WEIGHTS.visa}, fit ${DEFAULT_WEIGHTS.fit}
University quality/ranking is not scored: we don't have a verified, licensed ranking source.`}</F>
      <ul className="mt-2 list-disc space-y-1 pl-5">{Object.values(PICKS).map((p) => <li key={p.title}><strong>{p.title}</strong>: {p.why}</li>)}</ul>
      <p className="mt-2">Options with a funding gap or an unmet published requirement are excluded from picks when any fundable option exists, and are always flagged.</p>
      <p className="mt-2"><strong>Cost tiers:</strong> budget-friendly under ₹30 L total, moderate ₹30-60 L, premium over ₹60 L.</p>

      <H>10. Limits</H>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Curated sample of programmes, not every university.</li>
        <li>One effective tax rate per country; real take-home depends on state/province, residency and deductions.</li>
        <li>Salary sources often cover all experience levels; where so, the country page says so. Treat &quot;high&quot; as optimistic for a new graduate.</li>
        <li>Admission, visa and job outcomes are not predicted.</li>
        <li>Profile data stays in your browser (localStorage). Nothing is stored on a server.</li>
      </ul>
    </article>
  );
}
