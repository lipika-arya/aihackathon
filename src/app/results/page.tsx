"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { ScenarioPanel } from "@/components/ScenarioPanel";
import { WeightsEditor } from "@/components/WeightsEditor";
import { Badge, Empty, FLAG, FxNotice, PageHead } from "@/components/ui";
import { inr, lakh, pct, yrs } from "@/lib/format";
import { riskBand } from "@/lib/model";
import { buildCandidates, PICKS, picks, profileLabels, type Candidate, type PickKey } from "@/lib/recommend";
import { COURSES } from "@/lib/types";

const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

export default function Results() {
  const { countries, profile, setProfile, assumptions, fx, lenders, hasProfile } = useData();
  const list = useMemo(() => buildCandidates(countries, profile, assumptions, fx, lenders), [countries, profile, assumptions, fx, lenders]);
  const best = useMemo(() => picks(list), [list]);
  const ranked = useMemo(() => [...list].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)), [list]);
  const [sel, setSel] = useState<string | null>(null);
  const selected = ranked.find((c) => c.programme.id === sel) ?? best.overall ?? null;
  const labels = profileLabels(profile, median(list.map((c) => c.totalInr).filter((x): x is number => x != null)));

  if (!countries.length) return <Empty title="Research data not loaded">No country data files were found.</Empty>;

  return (
    <div className="space-y-10">
      <PageHead eyebrow="Your personalised results" title={best.overall ? `Best overall fit: ${best.overall.programme.university}, ${best.overall.country.name}` : "Your results"}>
        {!hasProfile && <span>You haven&apos;t done the assessment yet, so this uses example inputs. <Link href="/assess" className="link">Start my assessment</Link>.</span>}
        {hasProfile && <span>Based on your inputs, today&apos;s exchange rates and our sourced data. Change anything and the results update. <Link href="/assess" className="link">Edit my answers</Link></span>}
      </PageHead>

      {labels.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate">Your profile</h2>
          <div className="flex flex-wrap gap-2">
            {labels.map((l) => <span key={l.label} title={l.why} className="rounded-full border border-line bg-card px-3 py-1 text-sm"><strong>{l.label}</strong> <span className="text-slate">· {l.why}</span></span>)}
          </div>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(PICKS) as PickKey[]).map((k) => {
          const c = best[k];
          return (
            <button key={k} onClick={() => c && setSel(c.programme.id)} className={`card p-4 text-left ${selected && c && selected.programme.id === c.programme.id ? "ring-2 ring-forest" : "hover:border-forest"}`}>
              <div className="text-xs font-semibold uppercase tracking-wider text-forest">{PICKS[k].title}</div>
              {c ? <PickBody c={c} /> : <p className="mt-2 text-sm text-slate">Not enough verified data to choose.</p>}
              <p className="mt-2 text-[11px] text-slate">{PICKS[k].why}</p>
            </button>
          );
        })}
      </section>

      {selected && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-2xl font-extrabold">{FLAG[selected.country.country]} {selected.programme.programme_name}</h2>
              <p className="text-slate">{selected.programme.university}, {selected.programme.city} · {COURSES[selected.course]} · {selected.programme.duration_months} months</p>
            </div>
            <Link href={`/universities/${selected.programme.id}`} className="btn btn-ghost">Full programme details →</Link>
          </div>
          <Why c={selected} />
          <ScenarioPanel country={selected.country} programme={selected.programme} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold">Compared with the alternatives</h2>
        <div className="card overflow-x-auto">
          <table className="data num">
            <thead><tr><th>#</th><th>Programme</th><th>Score</th><th>Total cost</th><th>EMI</th><th>Payback (expected)</th><th>Debt-free if you return home</th><th>Visa risk</th><th>Flags</th></tr></thead>
            <tbody>
              {ranked.map((c, i) => (
                <tr key={c.programme.id} className={selected?.programme.id === c.programme.id ? "bg-forest-soft" : ""}>
                  <td>{c.score == null ? "–" : i + 1}</td>
                  <td className="min-w-56"><button className="text-left font-semibold hover:underline" onClick={() => setSel(c.programme.id)}>{FLAG[c.country.country]} {c.programme.university}</button><div className="text-xs text-slate">{c.programme.programme_name}</div></td>
                  <td>{c.score == null ? <Badge kind="missing">Can&apos;t score</Badge> : c.score.toFixed(0)}</td>
                  <td>{lakh(c.totalInr)}</td>
                  <td>{c.expected ? inr(c.expected.sim.emi) : "n/a"}</td>
                  <td>{c.expected ? yrs(c.expected.paybackYears) : "n/a"}</td>
                  <td>{c.results.returnHome ? (c.results.returnHome.sim.drawn > 0 ? yrs(c.results.returnHome.loanFreeYears) : "No loan") : "n/a"}</td>
                  <td>{c.visaRisk}/100</td>
                  <td className="space-x-1">
                    {c.fundingGap > 0 && <Badge kind="unverified">Funding gap {lakh(c.fundingGap)}</Badge>}
                    {c.hardFail && <Badge kind="unverified">Requirement not met</Badge>}
                    {c.programme.status !== "verified" && <Badge kind={c.programme.status === "partial" ? "partial" : "unverified"} />}
                    {c.missing.length > 0 && <Badge kind="missing">{c.missing.length} missing</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!ranked.length && <Empty title="No programmes match your course and country choices" />}
        <p className="text-xs text-slate">Total cost is at today&apos;s prices and exchange rates. The funding gap comes from the Expected scenario, which also assumes tuition rises and INR drift and adds the loan processing fee, so it will not equal total cost minus your funds. Open an option to see the working.</p>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="text-xl font-extrabold">Change your priorities</h2>
        <WeightsEditor w={profile.priorities} onChange={(w) => setProfile({ ...profile, priorities: w })} />
        <p className="text-xs text-slate">Score = Σ(component × weight) ÷ Σ weights. Each component is scaled 0-100 across the options shown. Visa risk is reversed (100 − risk). An option with a funding gap or an unmet requirement stays flagged whatever its score. <Link href="/methodology" className="link">Full method</Link></p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-extrabold">Questions to answer before you borrow</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>Get a written loan sanction: rate, benchmark, whether interest during study is added to the loan, processing fee.</li>
            <li>Confirm this year&apos;s international tuition and mandatory fees on the university page.</li>
            <li>Check the post-study work rules on the official government site the month you apply. They change.</li>
            <li>Talk to 2-3 recent Indian graduates of the programme about time-to-job and starting salary.</li>
            <li>Decide with your family what happens in the return-home scenario: can your India salary carry the EMI?</li>
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="font-extrabold">What we can&apos;t tell you</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate">
            <li>Your chance of admission, a visa, or a job. No reliable data exists to predict these for an individual, so we don&apos;t invent percentages.</li>
            <li>Exact take-home pay. We use a sourced effective tax rate per country as an estimate.</li>
            <li>Every university. This is a curated, sourced sample.</li>
          </ul>
          <div className="mt-3"><FxNotice /></div>
        </div>
      </section>
    </div>
  );
}

function PickBody({ c }: { c: Candidate }) {
  const e = c.expected;
  return (
    <>
      <div className="mt-1 font-bold">{FLAG[c.country.country]} {c.programme.university}</div>
      <div className="text-xs text-slate">{COURSES[c.course]} · {c.country.name}</div>
      <div className="num mt-2 grid grid-cols-2 gap-1 text-xs">
        <span>Cost {lakh(c.totalInr)}</span>
        <span>EMI {e ? inr(e.sim.emi) : "n/a"}</span>
        <span>Payback {e ? yrs(e.paybackYears) : "n/a"}</span>
        <span>Visa risk {c.visaRisk}</span>
      </div>
      {(c.fundingGap > 0 || c.hardFail) && <div className="mt-2"><Badge kind="unverified">{c.fundingGap > 0 ? "Funding gap" : "Requirement not met"}</Badge></div>}
    </>
  );
}

function Why({ c }: { c: Candidate }) {
  const w = c.components;
  const { profile } = useData();
  const total = Object.values(profile.priorities).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card p-4">
        <h3 className="font-bold">Why this option scores {c.score?.toFixed(0) ?? "n/a"}/100</h3>
        {w ? (
          <table className="data num mt-2">
            <thead><tr><th>Component</th><th>Score</th><th>Weight</th><th>Contribution</th></tr></thead>
            <tbody>
              {(Object.keys(w) as (keyof typeof w)[]).map((k) => (
                <tr key={k}><td className="capitalize">{k === "roi" ? "Financial ROI" : k}</td><td>{w[k].toFixed(0)}</td><td>{pct((profile.priorities[k] / total) * 100)}</td><td>{((w[k] * profile.priorities[k]) / total).toFixed(1)}</td></tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-sm text-slate">Can&apos;t score: {c.missing.join("; ")}</p>}
        <p className="hint">Visa policy risk {c.visaRisk}/100 ({riskBand(c.visaRisk)}), our own comparative index, not an official statistic.</p>
      </div>
      <div className="card p-4">
        <h3 className="font-bold">Your eligibility</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {c.eligibility.map((e) => (
            <li key={e.label} className="flex items-start gap-2">
              <Badge kind={e.status === "ok" ? "verified" : e.status === "fail" ? "unverified" : "missing"}>{e.status === "ok" ? "Meets" : e.status === "fail" ? "Not met" : "Unable to assess"}</Badge>
              <span><strong>{e.label}:</strong> <span className="text-slate">{e.detail}</span></span>
            </li>
          ))}
          <li className="flex items-start gap-2">
            <Badge kind={c.fundingGap > 0 ? "unverified" : "verified"}>{c.fundingGap > 0 ? "Gap" : "Fundable"}</Badge>
            <span><strong>Funding:</strong> <span className="text-slate">{c.fundingGap > 0 ? `${lakh(c.fundingGap)} short of your funds + max loan` : "Your funds plus max loan cover the expected cost"}</span></span>
          </li>
        </ul>
      </div>
    </div>
  );
}
