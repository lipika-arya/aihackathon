"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useData } from "./DataProvider";
import { Badge, Empty, Money, Source, Stat } from "./ui";
import { IncomeChart, IncrementalChart, LoanChart, SCEN_COLOR } from "./Charts";
import { inr, lakh, pct, yrs } from "@/lib/format";
import { costBreakdown, costIncomplete, feesStatus, INDIA_JOB_SEARCH_MONTHS, missingInputs, runAll, runIndiaMasters, SCENARIOS, type Lifestyle, type ScenarioKey } from "@/lib/model";
import { indiaSalaryFor } from "@/lib/recommend";
import type { CountryData, IndiaProgramme, Programme } from "@/lib/types";

export function ScenarioPanel({ country: c, programme: p, compact }: { country: CountryData; programme: Programme; compact?: boolean }) {
  const { profile, assumptions, fx, lenders, india } = useData();
  const [focus, setFocus] = useState<ScenarioKey>("expected");
  const [indiaId, setIndiaId] = useState<string | null>(null);
  const ind = indiaSalaryFor(profile, p.course, lenders);
  const indiaOptions = useMemo(() => india?.programmes.filter((x) => x.course === p.course) ?? [], [india, p.course]);
  const indiaProg = indiaOptions.find((x) => x.id === indiaId) ?? indiaOptions[0] ?? null;
  const results = useMemo(() => {
    const abroad = runAll({ country: c, programme: p, course: p.course, profile, assumptions, fx, indiaSalary: ind });
    const home = indiaProg ? runIndiaMasters({ programme: indiaProg, profile, assumptions, indiaSalary: ind }) : null;
    return home ? { ...abroad, mastersIndia: home } : abroad;
  }, [c, p, profile, assumptions, fx, ind, indiaProg]);
  const missing = missingInputs(c, p, p.course, ind);
  const todayCost = useMemo(() => costBreakdown(c, p, profile, assumptions, fx), [c, p, profile, assumptions, fx]);
  const keys = Object.keys(results) as ScenarioKey[];
  if (!keys.length && ind == null)
    return (
      <Empty title="Enter your India salary to see this option">
        The comparison is against staying in India, and we use only the salary you enter because we have no verified India salary data.{" "}
        <Link href="/assess" className="link">Start my assessment</Link> or set it with the slider in the <Link href="/roi" className="link">ROI calculator</Link>.
      </Empty>
    );
  if (!keys.length)
    return (
      <Empty title="Can't calculate this option yet">
        Missing: {missing.join("; ")}. We don&apos;t fill gaps with guesses.
      </Empty>
    );
  const r = results[focus] ?? results[keys[0]]!;

  return (
    <div className="space-y-5">
      {indiaOptions.length > 0 && (
        <label className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">Compare with a master&apos;s in India at</span>
          <select className="input max-w-md" value={indiaProg?.id ?? ""} onChange={(e) => setIndiaId(e.target.value)} aria-label="Indian programme to compare with">
            {indiaOptions.map((o) => <option key={o.id} value={o.id}>{o.institution}: {o.programme_name}{o.status === "verified" ? "" : " (partly verified)"}</option>)}
          </select>
        </label>
      )}
      {/* the magic moment: same loan, several futures */}
      <div className={`grid gap-3 sm:grid-cols-2 ${keys.length > 5 ? "lg:grid-cols-3 xl:grid-cols-6" : "lg:grid-cols-5"}`}>
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

      {costIncomplete(p) && r.key !== "mastersIndia" && (
        <div className="rounded-xl border border-amber bg-amber-soft p-4 text-sm text-amber">
          <strong>Cost estimate incomplete.</strong> We could not find this programme&apos;s mandatory fees, so they are counted as ₹0. The real total, the funding gap and the EMI are likely higher. Confirm the fees with the university before relying on these figures.
        </div>
      )}

      {todayCost && <FundingBridge incomplete={costIncomplete(p) && r.key !== "mastersIndia"} r={r} todayTotal={r.key === "mastersIndia" ? r.totalCostInr : todayCost.totalInr} ownFunds={profile.familyFunds + profile.savings + profile.scholarship} maxLoan={profile.maxLoan} />}

      {r.sim.fundingGap > 0 && (
        <div className="rounded-xl border border-brick bg-brick-soft p-4 text-sm text-brick">
          <strong>Funding gap: {inr(r.sim.fundingGap)}.</strong> Your funds plus maximum loan don&apos;t cover the estimated cost. This option stays flagged even if its return looks good.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`Total cost, ${SCENARIOS[r.key].label} scenario (before loan interest)`} value={lakh(r.totalCostInr)} kind="calculated" sub="Tuition + fees + living + visa + flights + deposits, including the tuition rise and INR drift this scenario assumes" />
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
          {r.key === "mastersIndia" && indiaProg ? <IndiaMastersDetails p={indiaProg} /> : <CostTable country={c} programme={p} />}
        </>
      )}
      <p className="text-xs text-slate">
        India comparison uses <><Badge kind="input" /> your India salary of {lakh(ind)} / yr</>.
        {missing.length > 0 && <> Missing: {missing.join("; ")}.</>}
      </p>
    </div>
  );
}

/** Ties the cost table (today's prices) to the funding gap (this scenario), so the page shows one consistent set of numbers. */
function FundingBridge({ incomplete, r, todayTotal, ownFunds, maxLoan }: { incomplete: boolean; r: NonNullable<ReturnType<typeof runAll>[ScenarioKey]>; todayTotal: number; ownFunds: number; maxLoan: number }) {
  const drift = r.totalCostInr - todayTotal;
  const need = r.totalCostInr + r.sim.processingFee;
  const ownUsed = need - r.sim.drawn - r.sim.fundingGap;
  const Row = ({ label, value, strong, minus }: { label: string; value: number; strong?: boolean; minus?: boolean }) => (
    <tr className={strong ? "font-bold" : ""}><td>{label}</td><td className="num text-right">{minus ? "−" : ""}{inr(value)}</td></tr>
  );
  return (
    <div className="card p-4">
      <h3 className="font-bold">How the funding gap is worked out ({SCENARIOS[r.key].label} scenario)</h3>
      <table className="data mt-2">
        <tbody>
          <Row label={`Base programme cost (today's prices and exchange rate, as in the cost table below)${incomplete ? ", incomplete: mandatory fees not found" : ""}`} value={todayTotal} />
          <tr><td>+ Adjustment: tuition rise and INR drift this scenario assumes</td><td className="num text-right">{drift < 0 ? "−" : ""}{inr(Math.abs(drift))}</td></tr>
          <Row label="+ Adjustment: loan processing fee (charged on the loan)" value={r.sim.processingFee} />
          <Row label="= Total funding requirement" value={need} strong />
          <Row label="Less: your own funds used" value={ownUsed} minus />
          <Row label={`Less: education loan (your maximum is ${inr(maxLoan)})`} value={r.sim.drawn} minus />
          <Row label="= Funding gap" value={r.sim.fundingGap} strong />
        </tbody>
      </table>
      <p className="hint">The gap changes with the scenario because each one assumes different tuition rises and INR drift. You have {inr(ownFunds)} of your own funds in total. Loan interest is a financing cost and is not part of the gap.</p>
    </div>
  );
}

function IndiaMastersDetails({ p }: { p: IndiaProgramme }) {
  const { profile } = useData();
  const years = p.duration_months / 12;
  const living = p.living_per_year_inr != null ? p.living_per_year_inr * years : null;
  const statusKind = p.status === "verified" ? "verified" : p.status === "partial" ? "partial" : "unverified";
  return (
    <div className="card overflow-x-auto p-4">
      <h3 className="mb-2 font-bold">{p.institution}: what the master&apos;s costs and pays</h3>
      <table className="data">
        <thead><tr><th>Item</th><th>Amount</th><th>Basis</th></tr></thead>
        <tbody>
          <tr><td>Tuition (whole programme)</td><td className="num font-semibold">{inr(p.tuition_total_inr)}</td><td><Badge kind={statusKind} /> {p.fee_year} <Source url={p.fee_source_url} /></td></tr>
          <tr><td>Other compulsory fees</td><td className="num font-semibold">{p.other_fees_total_inr == null ? "Not published" : inr(p.other_fees_total_inr)}</td><td>{p.other_fees_total_inr == null ? <Badge kind="missing">Counted as 0</Badge> : <Badge kind={statusKind} />}</td></tr>
          <tr><td>Hostel and food ({p.duration_months} months)</td><td className="num font-semibold">{living == null ? inr(profile.indiaLiving * p.duration_months) : inr(living)}</td><td>{living == null ? <><Badge kind="input" /> your own India living cost, as the institute publishes no figure</> : <><Badge kind={statusKind}>Institute estimate</Badge> <Source url={p.living_source_url} /></>}</td></tr>
          <tr><td>Median starting salary after graduating</td><td className="num font-semibold">{inr(p.entry_salary.median_inr)} / yr</td><td><Badge kind={statusKind}>Placement report {p.entry_salary.year}</Badge> {p.entry_salary.basis} <Source url={p.entry_salary.source_url} /></td></tr>
          {p.stipend_per_month_inr != null && <tr><td>Assistantship stipend (not counted)</td><td className="num font-semibold">{inr(p.stipend_per_month_inr)} / month</td><td>{p.stipend_note}</td></tr>}
        </tbody>
      </table>
      <p className="hint">Entry: {p.requirements.entrance ?? "see the institute"}. A job is assumed to start {INDIA_JOB_SEARCH_MONTHS} months after graduating; the median is for placed students at this institute, so an individual&apos;s outcome can differ. <a className="link" href={p.programme_url} target="_blank" rel="noopener noreferrer">Programme page ↗</a></p>
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
          <tr><td>Mandatory fees</td><td><Money amount={cb.fees} currency={c.currency} rate={cb.rate} /></td><td>Recurring</td><td>{feesStatus(p) === "not_found" ? <><Badge kind="missing">Not found; counted as 0</Badge> The real cost is likely higher.</> : feesStatus(p) === "included" ? <><Badge kind="partial">Included in the tuition total</Badge> {p.mandatory_fees_note}</> : <Badge kind={p.status === "verified" ? "verified" : p.status === "partial" ? "partial" : "unverified"} />}</td></tr>
          {c.health_insurance_per_year && cb.health > 0 && (
            <tr><td>Compulsory health insurance</td><td><Money amount={cb.health} currency={c.currency} rate={cb.rate} /></td><td>Recurring</td><td>{c.health_insurance_per_year.verified ? <Badge kind="verified" /> : <Badge kind="estimate" />} {c.health_insurance_per_year.basis} <Source url={c.health_insurance_per_year.source_url} /></td></tr>
          )}
          <tr><td>Living ({p.duration_months} months, moderate)</td><td><Money amount={cb.living} currency={c.currency} rate={cb.rate} /></td><td>Recurring</td><td>{p.living_cost_per_year ? <><Badge kind="verified">University estimate</Badge> <Source url={p.living_cost_per_year.source_url} /></> : <><Badge kind="estimate" /> {c.living_cost.basis}</>}</td></tr>
          <tr><td>Visa fees</td><td><Money amount={cb.visa} currency={c.currency} rate={cb.rate} /></td><td>One-time</td><td><Source url={c.visa.student_visa.source_url} /></td></tr>
          <tr><td>Flights, tests, applications, 2-month deposit</td><td><Money amount={cb.oneTimeInr} currency="INR" rate={1} /></td><td>One-time</td><td><Badge kind="assumption" /> editable in the ROI calculator</td></tr>
          <tr className="font-bold"><td>Estimated total</td><td><Money amount={cb.totalLocal + cb.oneTimeInr / cb.rate} currency={c.currency} rate={cb.rate} /></td><td /><td><Badge kind="calculated" />{costIncomplete(p) && <> <Badge kind="unverified">Incomplete</Badge> Mandatory fees were not found and are counted as 0, so treat this as a minimum.</>}</td></tr>
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
