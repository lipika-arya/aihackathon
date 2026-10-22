"use client";
import { useData } from "@/components/DataProvider";
import { Badge, Empty, FLAG, PageHead, Source } from "@/components/ui";
import { local } from "@/lib/format";
import { RISK_WEIGHTS, riskBand, visaRiskScore } from "@/lib/model";
import type { PolicyChange, RiskKey } from "@/lib/types";

const STATUS: Record<PolicyChange["status"], { label: string; kind: "verified" | "partial" | "assumption" | "unverified" }> = {
  in_effect: { label: "In effect", kind: "verified" },
  announced: { label: "Announced", kind: "partial" },
  proposed: { label: "Proposed", kind: "assumption" },
  blocked: { label: "Blocked / paused", kind: "unverified" },
};

const daysSince = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);

export default function Visa() {
  const { countries } = useData();
  if (!countries.length) return <Empty title="Research data not loaded" />;
  const ranked = [...countries].sort((a, b) => visaRiskScore(a) - visaRiskScore(b));
  return (
    <div className="space-y-10">
      <PageHead eyebrow="Visa and immigration tracker" title="What the rules are, and what's changing">
        From official government sources where possible. Rules change; always check the official page before you apply. General rules never guarantee that you qualify.
      </PageHead>

      <section className="card overflow-x-auto p-4">
        <h2 className="font-bold">AbroadROI Visa Policy Risk Score</h2>
        <p className="mb-3 text-xs text-slate">Our own comparative index of policy uncertainty for international students, 0-100, higher = more risk. Not an official statistic, not a visa refusal rate, and it can&apos;t predict whether you personally get a visa.</p>
        <table className="data num">
          <thead><tr><th>Country</th><th>Score</th>{(Object.keys(RISK_WEIGHTS) as RiskKey[]).map((k) => <th key={k}>{RISK_WEIGHTS[k].label} ({RISK_WEIGHTS[k].weight}%)</th>)}</tr></thead>
          <tbody>
            {ranked.map((c) => {
              const s = visaRiskScore(c);
              return (
                <tr key={c.country}>
                  <td className="font-semibold"><a href={`#${c.country}`} className="hover:underline">{FLAG[c.country]} {c.name}</a></td>
                  <td><strong>{s}/100</strong> <span className="text-xs text-slate">{riskBand(s)}</span></td>
                  {(Object.keys(RISK_WEIGHTS) as RiskKey[]).map((k) => <td key={k}>{c.risk_factors[k]?.score ?? "n/a"}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="hint">Score = Σ (factor score × weight). Bands: under 30 low, 30-54 moderate, 55+ high. Assessed {countries[0]?.verified_at}.</p>
      </section>

      {countries.map((c) => {
      const s = visaRiskScore(c);
      const stale = daysSince(c.verified_at) > 30;
      const v = c.visa;
      return (
        <section key={c.country} id={c.country} className="scroll-mt-24 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-extrabold">{FLAG[c.country]} {c.name}</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="num font-semibold">Risk {s}/100 · {riskBand(s)}</span>
              {stale ? <Badge kind="stale">Last checked {c.verified_at}</Badge> : <Badge kind="verified">Checked {c.verified_at}</Badge>}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="card p-4 text-sm">
              <h3 className="font-bold">Student visa</h3>
              <p className="mt-1">{v.student_visa.name}</p>
              <ul className="mt-2 space-y-1">{v.student_visa.fees.map((f) => <li key={f.label} className="flex justify-between gap-2"><span className="text-slate">{f.label}</span><span className="num font-semibold">{local(f.amount, f.currency)}</span></li>)}</ul>
              <div className="mt-2"><Source url={v.student_visa.source_url} /></div>
            </div>
            {([
              ["Proof of funds", v.proof_of_funds],
              ["Work while studying", v.work_during_study],
              ["Permanent residency pathway", v.pr_pathway],
            ] as const).map(([t, x]) => (
              <div key={t} className="card p-4 text-sm"><h3 className="font-bold">{t}</h3><p className="mt-1">{x.text}</p><div className="mt-2"><Source url={x.source_url} /></div></div>
            ))}
            <div className="card p-4 text-sm">
              <h3 className="font-bold">Post-study work</h3>
              <p className="mt-1"><strong>{v.post_study_work.name}</strong>{v.post_study_work.months_max ? `, up to ${v.post_study_work.months_max} months` : ""}</p>
              <p className="mt-1">{v.post_study_work.text}</p>
              <div className="mt-2"><Source url={v.post_study_work.source_url} /></div>
            </div>
            <div className="card p-4 text-sm">
              <h3 className="font-bold">Why the risk score is {s}</h3>
              <ul className="mt-1 space-y-1">{(Object.keys(RISK_WEIGHTS) as RiskKey[]).map((k) => <li key={k}><span className="num font-semibold">{c.risk_factors[k]?.score}</span> {RISK_WEIGHTS[k].label}: <span className="text-slate">{c.risk_factors[k]?.evidence}</span></li>)}</ul>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="font-bold">What has changed recently, and how does it affect Indian students?</h3>
            <div className="mt-3 space-y-3">
              {v.recent_changes.map((ch) => (
                <div key={ch.title} className="border-l-4 border-line pl-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2"><Badge kind={STATUS[ch.status].kind}>{STATUS[ch.status].label}</Badge><strong>{ch.title}</strong></div>
                  <div className="mt-1 text-xs text-slate">Announced: {ch.announced ?? "not found"} · Takes effect: {ch.effective ?? "not set"} · Affects: {ch.who_affected}</div>
                  <p className="mt-1">{ch.impact}</p>
                  <Source url={ch.source_url} />
                </div>
              ))}
              {!v.recent_changes.length && <p className="text-sm text-slate">No recent changes recorded.</p>}
            </div>
          </div>

          <details className="card p-4">
            <summary className="cursor-pointer font-bold">Step-by-step checklist for {c.name}</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{c.checklist.map((x) => <li key={x}>{x}</li>)}</ol>
          </details>
        </section>
      );
    })}
    </div>
  );
}
