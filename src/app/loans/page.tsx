"use client";
import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { Badge, Empty, PageHead, Source, Stat } from "@/components/ui";
import { inr, lakh, pct } from "@/lib/format";
import { simulate } from "@/lib/finance";
import { DEFAULT_ASSUMPTIONS } from "@/lib/model";
import type { Lender } from "@/lib/types";

interface Calc {
  loan: number; rate: number; studyMonths: number; disbursements: number; grace: number; payInterest: boolean;
  tenure: number; salary: number; growth: number; tax: number; living: number;
  fee: number; // processing fee, % of the loan, paid upfront by the borrower
}

function runLoan(c: Calc) {
  const H = c.studyMonths + c.grace + c.tenure * 12 + 1;
  const costs = Array(c.studyMonths).fill(0);
  // equal draws spread across the study period (e.g. each semester), not the whole loan on day one
  for (let i = 0; i < c.disbursements; i++) costs[Math.floor((i * c.studyMonths) / c.disbursements)] += c.loan / c.disbursements;
  const jobStart = c.studyMonths + c.grace;
  const income = Array.from({ length: H }, (_, m) => (m >= jobStart ? ((c.salary * (1 + c.growth / 100) ** Math.floor((m - jobStart) / 12)) * (1 - c.tax / 100)) / 12 : 0));
  const inp = {
    horizonMonths: H, studyMonths: c.studyMonths, studyCosts: costs, ownFunds: (c.loan * c.fee) / 100, loanCap: c.loan, // the borrower pays the fee from their own pocket, so the loan stays exactly as entered
    loan: { ratePct: c.rate, tenureMonths: c.tenure * 12, graceMonths: c.grace, payInterestDuringMoratorium: c.payInterest, processingFeePct: c.fee },
    income, living: Array(H).fill(c.living), baselineIncome: [], baselineLiving: [],
  };
  const sim = simulate(inp);
  // simple interest runs on principal only, so the split is the same whether or not it is paid as you go
  const accruing = c.payInterest ? simulate({ ...inp, loan: { ...inp.loan, payInterestDuringMoratorium: false } }) : sim;
  const studyInterest = accruing.balance[c.studyMonths - 1] - c.loan;
  const graceInterest = accruing.capitalisedInterest - studyInterest;
  const takeHome = income[jobStart] ?? 0;
  const saved = sim.personal.slice(jobStart).reduce((a, b) => a + b, 0);
  return { sim, studyInterest, graceInterest, takeHome, saved };
}

export default function Loans() {
  const { lenders, profile } = useData();
  const [c, setC] = useState<Calc>({ loan: profile.maxLoan || 3_000_000, rate: 10.5, studyMonths: 24, disbursements: 4, grace: 6, payInterest: false, tenure: profile.repaymentYears, salary: 1_200_000, growth: 6, tax: 10, living: 30_000, fee: DEFAULT_ASSUMPTIONS.processingFeePct });
  const set = (p: Partial<Calc>) => setC({ ...c, ...p });
  const r = useMemo(() => runLoan(c), [c]);
  const variants = useMemo(() => [
    { k: "A", label: "Lower rate, longer repayment", v: runLoan({ ...c, rate: Math.max(0, c.rate - 1), tenure: c.tenure + 5 }) },
    { k: "B", label: "Higher rate, shorter repayment", v: runLoan({ ...c, rate: c.rate + 1, tenure: Math.max(1, c.tenure - 3) }) },
    { k: "C", label: "Pay interest during study", v: runLoan({ ...c, payInterest: true }) },
    { k: "D", label: "Interest added to the loan", v: runLoan({ ...c, payInterest: false }) },
  ], [c]);

  const ls = lenders?.lenders ?? [];
  const fits = useMemo(() => bestFits(ls, c.loan, c.tenure, profile.collateral), [ls, c.loan, c.tenure, profile.collateral]);
  const N = (label: string, v: number, k: keyof Calc, step = 1, unit = "") => (
    <label className="block text-sm"><span className="label">{label}</span><div className="flex items-center gap-2"><input className="input num" type="number" step={step} min={0} value={v} onChange={(e) => set({ [k]: Number(e.target.value) || 0 } as Partial<Calc>)} />{unit && <span className="text-xs text-slate">{unit}</span>}</div></label>
  );
  const s = r.sim;

  return (
    <div className="space-y-8">
      <PageHead eyebrow="Education loans" title="Compare lenders and see your real repayment">
        Rates are the lender&apos;s own published terms. The rate you&apos;re offered depends on your credit, collateral, co-applicant, university and loan amount, so treat advertised starting rates as the best case.
      </PageHead>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">Loan repayment calculator</h2>
        <div className="card grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
          {N("Loan amount (₹)", c.loan, "loan", 50000)}
          {N("Interest rate", c.rate, "rate", 0.05, "%")}
          {N("Processing fee", c.fee, "fee", 0.25, "%")}
          {N("Course length", c.studyMonths, "studyMonths", 1, "months")}
          {N("Disbursements", c.disbursements, "disbursements", 1, "draws")}
          {N("Grace after course", c.grace, "grace", 1, "months")}
          {N("Repayment period", c.tenure, "tenure", 1, "years")}
          {N("Starting salary (₹/yr gross)", c.salary, "salary", 50000)}
          {N("Salary growth", c.growth, "growth", 0.5, "%/yr")}
          {N("Effective tax", c.tax, "tax", 1, "%")}
          {N("Living cost (₹/month)", c.living, "living", 1000)}
          <label className="flex items-end gap-2 pb-2 text-sm sm:col-span-2"><input type="checkbox" checked={c.payInterest} onChange={(e) => set({ payInterest: e.target.checked })} /> Pay simple interest monthly during study and grace</label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="1. Total borrowed" value={inr(s.drawn)} kind="input" />
          <Stat label="2. Interest during study" value={inr(r.studyInterest)} sub={c.payInterest ? "Paid as you go" : "Added to the loan"} kind="calculated" />
          <Stat label="3. Interest during grace" value={inr(r.graceInterest)} sub={c.payInterest ? "Paid as you go" : "Added to the loan"} kind="calculated" />
          <Stat label="4. Principal when EMIs start" value={inr(s.principalAtRepayment)} kind="calculated" />
          <Stat label="5. Monthly EMI" value={inr(s.emi)} kind="calculated" />
          <Stat label="6. Total interest" value={inr(s.totalInterest)} kind="calculated" />
          <Stat label="7. Total repaid" value={inr(s.totalRepaid)} kind="calculated" />
          <Stat label="8. Cost of borrowing on top of the loan" value={lakh(s.totalRepaid - s.drawn + s.processingFee)} sub={`Interest plus ${inr(s.processingFee)} processing fee, paid upfront`} kind="calculated" />
          <Stat label="9. Repayment period" value={`${c.tenure} yrs`} sub={`EMIs start ${c.studyMonths + c.grace} months after the first draw`} kind="input" />
          <Stat label="10. EMI as % of take-home" value={r.takeHome ? pct((s.emi / r.takeHome) * 100) : "n/a"} sub={`Take-home ${inr(r.takeHome)}/month`} kind="calculated" />
          <Stat label="11. Debt-free" value={s.loanClosedMonth != null ? `${((s.loanClosedMonth + 1) / 12).toFixed(1)} yrs from first draw` : "Not within horizon"} kind="calculated" />
          <Stat label="12. Saved by the time loan is repaid" value={lakh(r.saved)} sub="Take-home minus living and EMI" kind="calculated" />
        </div>
        <p className="text-xs text-slate"><strong>Moratorium vs repayment:</strong> during the course and grace period you usually pay no EMI, but simple interest still runs on what you&apos;ve drawn. If you don&apos;t pay it, banks typically add it to the loan when EMIs start, so you pay interest on interest. Banks differ; check your sanction letter.</p>
        <div className="card overflow-x-auto">
          <table className="data num">
            <thead><tr><th>Scenario</th><th>Rate</th><th>Years</th><th>EMI</th><th>Total interest</th><th>Total repaid</th></tr></thead>
            <tbody>
              {variants.map(({ k, label, v }) => {
                const rate = k === "A" ? Math.max(0, c.rate - 1) : k === "B" ? c.rate + 1 : c.rate;
                const t = k === "A" ? c.tenure + 5 : k === "B" ? Math.max(1, c.tenure - 3) : c.tenure;
                return <tr key={k}><td><strong>{k}.</strong> {label}</td><td>{rate.toFixed(2)}%</td><td>{t}</td><td>{inr(v.sim.emi)}</td><td>{inr(v.sim.totalInterest)}</td><td>{inr(v.sim.totalRepaid)}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">Which lender fits you</h2>
        {!ls.length ? <Empty title="Lender data not loaded yet" /> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {fits.map((f) => (
              <div key={f.title} className="card p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-forest">{f.title}</div>
                <div className="mt-1 font-bold">{f.lender?.name ?? "Not enough verified data"}</div>
                {f.lender && <div className="text-xs text-slate">{f.lender.product}</div>}
                <p className="mt-2 text-xs text-slate">{f.why}</p>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-slate">Based only on published terms for a {lakh(c.loan)} loan over {c.tenure} years{profile.collateral ? " with collateral" : " without collateral"}. We never rank lenders by who pays us; nobody does.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">All lenders</h2>
        <div className="card overflow-x-auto">
          <table className="data">
            <thead><tr><th>Lender</th><th>Rate (published)</th><th>Max amount</th><th>Collateral</th><th>Moratorium</th><th>Interest in moratorium</th><th>Max years</th><th>Processing fee</th><th>Status</th></tr></thead>
            <tbody>
              {ls.map((l) => (
                <tr key={l.id}>
                  <td className="min-w-44"><div className="font-semibold">{l.name}</div><div className="text-xs text-slate">{l.product} · {l.type}{l.currency === "USD" ? " · lends in USD" : ""}</div><Source url={l.source_url || l.url} /></td>
                  <td className="min-w-40 text-xs"><div className="num font-semibold">{l.rate_min != null ? `${l.rate_min}%${l.rate_max != null && l.rate_max !== l.rate_min ? ` – ${l.rate_max}%` : ""}` : "n/a"}</div>{l.rate_text}{l.benchmark && <div className="text-slate">Benchmark: {l.benchmark}</div>}</td>
                  <td className="text-xs">{l.max_amount_text ?? (l.max_amount ? inr(l.max_amount) : "Not stated")}</td>
                  <td className="min-w-40 text-xs">{l.collateral ?? "Not stated"}</td>
                  <td className="text-xs">{l.moratorium ?? "Not stated"}</td>
                  <td className="text-xs">{l.moratorium_interest ?? "Not stated"}</td>
                  <td className="num text-xs">{l.repayment_years_max ?? "n/a"}</td>
                  <td className="text-xs">{l.processing_fee ?? "Not stated"}</td>
                  <td><Badge kind={l.status === "verified" ? "verified" : l.status === "partial" ? "partial" : "unverified"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lenders?.tax_benefit && <p className="text-sm text-slate"><Badge kind="verified">Tax</Badge> {lenders.tax_benefit.text} <Source url={lenders.tax_benefit.source_url} /></p>}
        {lenders && <p className="text-xs text-slate">Lender terms checked {lenders.verified_at}. Rates change often; confirm with the lender.</p>}
      </section>
    </div>
  );
}

function bestFits(ls: Lender[], amount: number, years: number, collateral: boolean) {
  const usable = ls.filter((l) => l.currency === "INR" && l.status !== "unverified" && l.rate_min != null && (l.max_amount == null || l.max_amount >= amount));
  const cost = (l: Lender, rate = l.rate_min!) => {
    const n = Math.min(years, l.repayment_years_max ?? years) * 12;
    const r = rate / 1200;
    return r === 0 ? 0 : ((amount * r * (1 + r) ** n) / ((1 + r) ** n - 1)) * n - amount;
  };
  const min = <T,>(xs: T[], f: (x: T) => number) => xs.reduce<T | undefined>((b, x) => (b === undefined || f(x) < f(b) ? x : b), undefined);
  const secured = usable.filter((l) => l.type === "public" || l.type === "private");
  const unsecured = usable.filter((l) => /without collateral|unsecured|no collateral|non-collateral/i.test(`${l.collateral} ${l.notes} ${l.product}`));
  const flex = min(usable, (l) => -(l.repayment_years_max ?? 0));
  const low = min(usable, (l) => cost(l));
  const sec = min(secured, (l) => cost(l));
  const uns = min(unsecured, (l) => cost(l, (l.rate_min! + (l.rate_max ?? l.rate_min!)) / 2));
  return [
    { title: "Lowest borrowing cost", lender: low, why: low ? `Lowest total interest at its advertised starting rate (${low.rate_min}%): about ${lakh(cost(low))}.` : "" },
    { title: "Best with collateral", lender: sec, why: sec ? `Bank with the lowest starting rate (${sec.rate_min}%). Banks usually need collateral above a threshold; see its terms.` : "" },
    { title: "Best without collateral", lender: uns, why: uns ? `Lowest cost at the middle of its published range among lenders that state unsecured loans.` : "No verified lender states unsecured terms." },
    { title: "Best repayment flexibility", lender: flex, why: flex ? `Longest published repayment period: ${flex.repayment_years_max} years.` : "" },
    ...(collateral ? [] : [{ title: "Best overall fit for you", lender: uns ?? low, why: "You said you have no collateral, so we favour lenders that publish unsecured terms." }]),
  ];
}
