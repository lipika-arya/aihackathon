"use client";
import { useMemo, useState } from "react";
import { useData } from "./DataProvider";
import { Badge, Empty, Money, Source, Stat } from "./ui";
import { IncomeChart, IncrementalChart, LoanChart, SCEN_COLOR } from "./Charts";
import { inr, lakh, pct, yrs } from "@/lib/format";
import { costBreakdown, missingInputs, runAll, SCENARIOS, type Lifestyle, type ScenarioKey } from "@/lib/model";
import { indiaSalaryFor } from "@/lib/recommend";
import type { CountryData, Programme } from "@/lib/types";

export function ScenarioPanel({ country: c, programme: p, compact }: { country: CountryData; programme: Programme; compact?: boolean }) {
  const { profile, assumptions, fx, lenders } = useData();
  const [focus, setFocus] = useState<ScenarioKey>("expected");
  const ind = indiaSalaryFor(profile, p.course, lenders);
  const results = useMemo(
    () => runAll({ country: c, programme: p, course: p.course, profile, assumptions, fx, indiaSalary: ind }),
    [c, p, profile, assumptions, fx, ind],
  );
  const missing = missingInputs(c, p, p.course, ind);
  const keys = Object.keys(results) as ScenarioKey[];
  if (!keys.length)
    return (
      <Empty title="Can't calculate this option yet">
        Missing: {missing.join("; ")}. We don&apos;t fill gaps with guesses.
      </Empty>
    );
  const r = results[focus] ?? results[keys[0]]!;
  const usingDefaultIndia = profile.indiaSalary == null;

  return (
    <div className="space-y-5">
      {/* the magic moment: same loan, five futures */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {keys.map((k) => {
          const s = results[k]!;
          return (
            <button key={k} onClick={() => setFocus(k)} className={`card p-4 text-left transition ${focus === k ? "ring-2 ring-forest" : "hover:border-forest"}`}>
              <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: SCEN_COLOR[k] }}>
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: SCEN_COLOR[k] }} />{SCENARIOS[k].label}
              </div>
              <div className="mt-1 text-xs text-slate">{SCENARIOS[k].short}</div>
              <div className="num mt-3 text-lg font-bold">{s.sim.drawn > 0 ? (s.loanFreeYears != null ? `Debt-free in ${s.loanFreeYears.toFixed(1)} yrs` : "Not repaid in 40 yrs") : "No loan"}</div>
              <div className="num text-[11px] text-slate">after graduating, putting all spare income into the loan</div>
              <div className="num mt-1 text-xs text-slate">Pays back vs India: {yrs(s.paybackYears)}</div>
              {s.emiShortfall > 0 && <div className="num mt-1 text-xs font-semibold text-brick">Income falls short of the EMI by {inr(s.emiShortfall)}/month at first</div>}
              <div className={`num mt-1 text-xs font-semibold ${s.emiShareOfTakeHome != null && s.emiShareOfTakeHome > 0.5 ? "text-brick" : "text-slate"}`}>
                {s.emiShareOfTakeHome == null ? "No EMI" : s.emiShareOfTakeHome === Infinity ? "EMIs start before your first salary" : `EMI = ${pct(s.emiShareOfTakeHome * 100)} of take-home`}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate"><Badge kind="assumption" /> {SCENARIOS[r.key].explain} Scenarios are what-if calculations, not forecasts or probabilities. &quot;Debt-free&quot; assumes you prepay with everything left after living costs (check your lender&apos;s prepayment terms); on the bank&apos;s schedule the loan ends {r.scheduledYears.toFixed(1)} years after graduating.</p>

      {r.sim.fundingGap > 0 && (
        <div className="rounded-xl border border-brick bg-brick-soft p-4 text-sm text-brick">
          <strong>Funding gap: {inr(r.sim.fundingGap)}.</strong> Your funds plus maximum loan don&apos;t cover the estimated cost. This option stays flagged even if its return looks good.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total cost (before loan interest)" value={lakh(r.totalCostInr)} kind="calculated" sub="Tuition + fees + living + visa + flights + deposits" />
        <Stat label="Loan used" value={lakh(r.sim.drawn)} sub={`Interest added during study + grace: ${lakh(r.sim.capitalisedInterest)}`} kind="calculated" />
        <Stat label="Monthly EMI" value={inr(r.sim.emi)} sub={`${assumptions.loanRatePct}% for ${profile.repaymentYears} yrs, total interest ${lakh(r.sim.totalInterest)}`} kind="calculated" />
        <Stat label="10-yr NPV vs staying in India" value={lakh(r.npv)} sub={`ROI ${pct(r.roiPct)} · IRR ${r.irrPct == null ? "not meaningfully calculable" : pct(r.irrPct, 1)}`} kind="calculated" />
      </div>

      {!compact && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-4">
              <h3 className="font-bold">Cumulative gain vs staying in India</h3>
              <p className="mb-2 text-xs text-slate">Where a line crosses zero, the degree has paid for itself (costs and India earnings given up).</p>
              <IncrementalChart results={results} />
            </div>
            <div className="card p-4">
              <h3 className="font-bold">Loan balance over time</h3>
              <p className="mb-2 text-xs text-slate">Balance includes interest added during study and the {assumptions.graceMonths}-month grace period.</p>
              <LoanChart results={results} />
            </div>
          </div>
          <div className="card p-4">
            <h3 className="font-bold">{SCENARIOS[r.key].label}: income vs what&apos;s left each year</h3>
            <IncomeChart r={r} />
          </div>
          <YearTable r={r} />
          <CostTable country={c} programme={p} />
        </>
      )}
      <p className="text-xs text-slate">
        India comparison uses {usingDefaultIndia ? <><Badge kind="estimate" /> a typical India salary of {lakh(ind)} / yr from our India baseline data</> : <><Badge kind="input" /> your India salary of {lakh(ind)} / yr</>}.
        {missing.length > 0 && <> Missing: {missing.join("; ")}.</>}
      </p>
    </div>
  );
}

function YearTable({ r }: { r: ReturnType<typeof runAll>[ScenarioKey] & object }) {
  const show = r.years.filter((y) => y.year <= 4 || y.year === r.years.length - 1);
  return (
    <div className="card overflow-x-auto p-4">
      <h3 className="mb-2 font-bold">Year by year ({SCENARIOS[r.key].label})</h3>
      <table className="data num">
        <thead><tr><th>Year</th><th>Take-home income</th><th>Your net cash flow</th><th>Cumulative cash</th><th>Loan balance (end)</th><th>Net position</th></tr></thead>
        <tbody>
          {show.map((y) => (
            <tr key={y.year}>
              <td>Year {y.year + 1}</td>
              <td>{inr(y.income)}</td>
              <td className={y.personal < 0 ? "text-brick" : ""}>{inr(y.personal)}</td>
              <td>{inr(y.cumulative)}</td>
              <td>{inr(y.balance)}</td>
              <td className={y.cumulative - y.balance < 0 ? "text-brick" : "text-forest"}>{inr(y.cumulative - y.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">Year 1 is your first year of study. Net position = cash you have accumulated minus loan still owed.</p>
    </div>
  );
}

export function CostTable({ country: c, programme: p }: { country: CountryData; programme: Programme }) {
  const { profile, assumptions, fx } = useData();
  const rows = (["budget", "moderate", "comfortable"] as Lifestyle[]).map((l) => ({ l, cb: costBreakdown(c, p, profile, assumptions, fx, l) }));
  const cb = rows[1].cb;
  if (!cb) return <Empty title="Cost breakdown unavailable">Tuition or living-cost data is missing for this programme.</Empty>;
  return (
    <div className="card overflow-x-auto p-4">
      <h3 className="mb-2 font-bold">What the degree costs</h3>
      <table className="data">
        <thead><tr><th>Item</th><th>Amount</th><th>Type</th><th>Basis</th></tr></thead>
        <tbody>
          <tr><td>Tuition (whole programme)</td><td><Money amount={cb.tuition} currency={c.currency} rate={cb.rate} /></td><td>Recurring</td><td><Badge kind={p.status === "verified" ? "verified" : p.status === "partial" ? "partial" : "unverified"} /> <Source url={p.tuition?.source_url} /> {p.tuition && `(${p.tuition.period}, ${p.tuition.fee_year})`}</td></tr>
          <tr><td>Mandatory fees</td><td><Money amount={cb.fees} currency={c.currency} rate={cb.rate} /></td><td>Recurring</td><td>{p.mandatory_fees_per_year == null ? <Badge kind="missing">Not found; counted as 0</Badge> : <Badge kind="verified" />}</td></tr>
          <tr><td>Living ({p.duration_months} months, moderate)</td><td><Money amount={cb.living} currency={c.currency} rate={cb.rate} /></td><td>Recurring</td><td>{p.living_cost_per_year ? <><Badge kind="verified">University estimate</Badge> <Source url={p.living_cost_per_year.source_url} /></> : <><Badge kind="estimate" /> {c.living_cost.basis}</>}</td></tr>
          <tr><td>Visa fees</td><td><Money amount={cb.visa} currency={c.currency} rate={cb.rate} /></td><td>One-time</td><td><Source url={c.visa.student_visa.source_url} /></td></tr>
          <tr><td>Flights, tests, applications, 2-month deposit</td><td><Money amount={cb.oneTimeInr} currency="INR" rate={1} /></td><td>One-time</td><td><Badge kind="assumption" /> editable in the ROI calculator</td></tr>
          <tr className="font-bold"><td>Estimated total</td><td><Money amount={cb.totalLocal + cb.oneTimeInr / cb.rate} currency={c.currency} rate={cb.rate} /></td><td /><td><Badge kind="calculated" /></td></tr>
        </tbody>
      </table>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        {rows.map(({ l, cb: x }) => (
          <div key={l} className={`rounded-lg border border-line p-3 ${l === profile.lifestyle ? "bg-forest-soft" : ""}`}>
            <div className="text-xs font-semibold capitalize text-slate">{l} lifestyle total</div>
            <div className="num font-bold">{x ? lakh(x.totalInr) : "n/a"}</div>
          </div>
        ))}
      </div>
      <p className="hint">Excludes loan interest (shown separately as a financing cost). Loan principal is not added on top of costs; it pays for them.</p>
    </div>
  );
}
