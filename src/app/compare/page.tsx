"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { Badge, Empty, FLAG, FxNotice, IndiaSalaryNotice, Money, PageHead, Source } from "@/components/ui";
import { inr, lakh, pct, yrs } from "@/lib/format";
import { fxRate, riskBand, runAll, visaRiskScore, costBreakdown, type ScenarioResult } from "@/lib/model";
import { indiaSalaryFor } from "@/lib/recommend";
import { COURSES, type Course } from "@/lib/types";

const mid = <T,>(xs: T[], f: (x: T) => number): T | undefined => [...xs].sort((a, b) => f(a) - f(b))[Math.floor(xs.length / 2)];

export default function Compare() {
  const { countries, profile, assumptions, fx, lenders } = useData();
  const [course, setCourse] = useState<Course>(profile.courses[0] ?? "CS");

  const rows = useMemo(() => countries.map((c) => {
    const progs = c.programmes.filter((p) => p.course === course);
    const ind = indiaSalaryFor(profile, course, lenders);
    const runs = progs.map((p) => ({ p, cb: costBreakdown(c, p, profile, assumptions, fx), r: runAll({ country: c, programme: p, course, profile, assumptions, fx, indiaSalary: ind }) }))
      .filter((x) => x.cb); // cost rows need only cost data; the payback and EMI rows need the India salary and say so
    const costs = runs.map((x) => x.cb!.totalInr);
    const typical = mid(runs, (x) => x.cb!.totalInr);
    return { c, progs, runs, typical, costLo: costs.length ? Math.min(...costs) : null, costHi: costs.length ? Math.max(...costs) : null, rate: fxRate(fx, c.currency, assumptions) };
  }), [countries, course, profile, assumptions, fx, lenders]);

  if (!countries.length) return <Empty title="Research data not loaded" />;

  const R = (f: (r: ScenarioResult) => React.ReactNode, x: (typeof rows)[number], k: "expected" | "returnHome" = "expected") => (x.typical?.r[k] ? f(x.typical.r[k]!) : profile.indiaSalary == null ? <span className="text-xs text-slate">Needs your India salary</span> : <Badge kind="missing" />);

  const metrics: [string, (x: (typeof rows)[number]) => React.ReactNode][] = [
    ["Total cost range (our sample)", (x) => (x.costLo == null ? <Badge kind="missing" /> : <span className="num font-semibold">{lakh(x.costLo)} – {lakh(x.costHi)}</span>)],
    ["Tuition, typical programme", (x) => (x.typical ? <Money amount={x.typical.cb!.tuition} currency={x.c.currency} rate={x.rate} small /> : <Badge kind="missing" />)],
    ["Living cost per month (moderate)", (x) => (x.c.living_cost.moderate_month == null ? <Badge kind="missing" /> : <Money amount={x.c.living_cost.moderate_month} currency={x.c.currency} rate={x.rate} small />)],
    ["Entry salary (gross / yr, mid)", (x) => { const b = x.c.salary[course]; return b?.entry_mid == null ? <Badge kind="missing" /> : <><Money amount={b.entry_mid} currency={x.c.currency} rate={x.rate} small /><div><Source url={b.source_url} label={b.source_name || "Source"} /></div></>; }],
    ["Take-home per month (estimate)", (x) => { const b = x.c.salary[course]; const t = x.c.tax.effective_rate; return b?.entry_mid == null || t == null ? <Badge kind="missing" /> : <><Money amount={(b.entry_mid * (1 - t)) / 12} currency={x.c.currency} rate={x.rate} small /><div className="text-[11px] text-slate">after ~{pct(t * 100)} tax + contributions</div></>; }],
    ["EMI (expected)", (x) => R((r) => <span className="num font-semibold">{inr(r.sim.emi)}</span>, x)],
    ["EMI as % of take-home", (x) => R((r) => <span className="num">{r.emiShareOfTakeHome == null ? "n/a" : pct(r.emiShareOfTakeHome * 100)}</span>, x)],
    ["Payback vs India (expected)", (x) => R((r) => <span className="num font-semibold">{yrs(r.paybackYears)}</span>, x)],
    ["Debt-free if you return home", (x) => R((r) => <span className="num font-semibold text-brick">{r.sim.drawn ? yrs(r.loanFreeYears) : "No loan"}</span>, x, "returnHome")],
    ["Net position after 5 years", (x) => R((r) => <span className={`num ${r.netPosition.y5 < 0 ? "text-brick" : "text-forest"}`}>{lakh(r.netPosition.y5)}</span>, x)],
    ["Net position after 10 years", (x) => R((r) => <span className={`num ${r.netPosition.y10 < 0 ? "text-brick" : "text-forest"}`}>{lakh(r.netPosition.y10)}</span>, x)],
    ["10-yr ROI vs staying in India", (x) => R((r) => <span className="num">{pct(r.roiPct)}</span>, x)],
    ["Visa policy risk score", (x) => { const s = visaRiskScore(x.c); return <Link href={`/visa#${x.c.country}`} className="num font-semibold hover:underline">{s}/100 · {riskBand(s)}</Link>; }],
    ["Post-study work", (x) => <span className="text-xs">{x.c.visa.post_study_work.name}{x.c.visa.post_study_work.months_max ? `, up to ${x.c.visa.post_study_work.months_max} months` : ""}</span>],
    ["Programmes in our data", (x) => <span className="text-xs">{x.progs.length} ({x.progs.filter((p) => p.status === "verified").length} verified)</span>],
  ];

  return (
    <div className="space-y-6">
      <PageHead eyebrow="Country comparison" title={`${["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"][countries.length] ?? countries.length} countries side by side`}>
        Each column uses the middle-cost programme in our sample for that country, your profile, and today&apos;s exchange rate.
        {" "}Tap a country&apos;s programmes in the <Link href="/universities" className="link">University explorer</Link> for the full spread.
      </PageHead>
      <IndiaSalaryNotice />
      <div className="flex flex-wrap gap-2">
        {(Object.keys(COURSES) as Course[]).map((k) => (
          <button key={k} onClick={() => setCourse(k)} className={`btn ${course === k ? "btn-primary" : "btn-ghost"}`} aria-pressed={course === k}>{COURSES[k]}</button>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="data">
          <thead>
            <tr><th className="min-w-48">{COURSES[course]}</th>{rows.map((x) => <th key={x.c.country} className="min-w-40 !normal-case !text-sm !text-ink">{FLAG[x.c.country]} {x.c.name}</th>)}</tr>
          </thead>
          <tbody>
            {metrics.map(([label, f]) => (
              <tr key={label}><td className="font-semibold">{label}</td>{rows.map((x) => <td key={x.c.country}>{f(x)}</td>)}</tr>
            ))}
            <tr><td className="font-semibold">Typical programme used</td>{rows.map((x) => <td key={x.c.country} className="text-xs">{x.typical ? <Link href={`/universities/${x.typical.p.id}`} className="link">{x.typical.p.university}</Link> : <Badge kind="missing" />}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate"><Badge kind="calculated" /> Costs, EMI, payback and net position come from our deterministic model using your inputs (or example inputs if you haven&apos;t done the assessment). <Badge kind="estimate" /> Take-home pay uses one effective tax rate per country.</p>
      <FxNotice />
    </div>
  );
}
