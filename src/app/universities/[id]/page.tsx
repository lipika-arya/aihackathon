"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useData } from "@/components/DataProvider";
import { ScenarioPanel } from "@/components/ScenarioPanel";
import { Badge, Empty, FLAG, FxNotice, Money, Source } from "@/components/ui";
import { fxRate, riskBand, visaRiskScore } from "@/lib/model";
import { eligibility } from "@/lib/recommend";
import { COURSES } from "@/lib/types";

export default function ProgrammeDetail() {
  const { id } = useParams<{ id: string }>();
  const { countries, profile, assumptions, fx, hasProfile } = useData();
  const c = countries.find((x) => x.programmes.some((p) => p.id === id));
  const p = c?.programmes.find((x) => x.id === id);
  if (!c || !p) return <Empty title="Programme not found"><Link href="/universities" className="link">Back to the explorer</Link></Empty>;
  const rate = fxRate(fx, c.currency, assumptions);
  const sal = c.salary[p.course];
  const risk = visaRiskScore(c);
  const elig = eligibility(p, profile);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/universities" className="text-sm text-forest">← All programmes</Link>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate">{FLAG[c.country]} {p.city}, {c.name} · {COURSES[p.course]} <Badge kind={p.status === "verified" ? "verified" : p.status === "partial" ? "partial" : "unverified"} /></div>
        <h1 className="mt-1 text-3xl font-extrabold">{p.programme_name}</h1>
        <p className="text-lg text-slate">{p.university}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <a className="btn btn-ghost" href={p.programme_url} target="_blank" rel="noopener noreferrer">Official programme page ↗</a>
          {p.tuition?.source_url && <a className="btn btn-ghost" href={p.tuition.source_url} target="_blank" rel="noopener noreferrer">Official fee page ↗</a>}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <h2 className="font-bold">Programme</h2>
          <dl className="mt-2 space-y-2 text-sm">
            <div><dt className="text-xs text-slate">Duration</dt><dd>{p.duration_months} months</dd></div>
            <div><dt className="text-xs text-slate">Tuition</dt><dd>{p.tuition ? <><Money amount={p.tuition.amount} currency={c.currency} rate={rate} /> <span className="text-xs text-slate">per {p.tuition.period}{p.tuition.credits_total ? ` × ${p.tuition.credits_total} credits` : ""}, {p.tuition.fee_year}</span></> : <Badge kind="missing" />}</dd></div>
            <div><dt className="text-xs text-slate">Mandatory fees / year</dt><dd>{p.mandatory_fees_per_year == null ? <Badge kind="missing">Not found</Badge> : <Money amount={p.mandatory_fees_per_year} currency={c.currency} rate={rate} />}</dd></div>
            <div><dt className="text-xs text-slate">Scholarships</dt><dd>{p.scholarships ?? <span className="text-slate">None listed on the pages we checked</span>}</dd></div>
          </dl>
        </div>
        <div className="card p-4">
          <h2 className="font-bold">Admission requirements</h2>
          <dl className="mt-2 space-y-2 text-sm">
            {(["gpa", "english", "gre_gmat", "work_experience"] as const).map((k) => (
              <div key={k}><dt className="text-xs text-slate">{{ gpa: "Academic", english: "English", gre_gmat: "GRE / GMAT", work_experience: "Work experience" }[k]}</dt><dd>{p.requirements[k] ?? <span className="text-slate">Not stated on the official page</span>}</dd></div>
            ))}
          </dl>
        </div>
        <div className="card p-4">
          <h2 className="font-bold">Your eligibility {hasProfile ? "" : "(example profile)"}</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {elig.map((e) => (
              <li key={e.label}><Badge kind={e.status === "ok" ? "verified" : e.status === "fail" ? "unverified" : "missing"}>{e.status === "ok" ? "Meets" : e.status === "fail" ? "Not met" : "Unable to assess"}</Badge> <strong>{e.label}</strong><div className="text-xs text-slate">{e.detail}</div></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <h2 className="font-bold">Jobs and salary after graduation</h2>
          {sal ? (
            <>
              <p className="mt-1 text-sm">Typical roles: {sal.roles.join(", ")}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                {(["entry_low", "entry_mid", "entry_high"] as const).map((k) => (
                  <div key={k}><div className="text-xs text-slate">{{ entry_low: "Low", entry_mid: "Mid", entry_high: "High" }[k]} (gross/yr)</div><Money amount={sal[k]} currency={c.currency} rate={rate} small /></div>
                ))}
              </div>
              <p className="hint">{sal.basis} ({sal.period})</p>
              <Source url={sal.source_url} label={sal.source_name || "Source"} />
              <p className="mt-2 text-xs text-slate">These are salary benchmarks, not a promise of a job. We don&apos;t estimate the probability of employment because no reliable data exists for Indian graduates of this programme.</p>
            </>
          ) : <Badge kind="missing" />}
        </div>
        <div className="card p-4">
          <h2 className="font-bold">Visa considerations</h2>
          <p className="mt-1 text-sm"><strong>{c.visa.post_study_work.name}</strong>{c.visa.post_study_work.months_max ? `, up to ${c.visa.post_study_work.months_max} months` : ""}. {c.visa.post_study_work.text}</p>
          <p className="mt-2 text-sm">Visa policy risk: <strong>{risk}/100 ({riskBand(risk)})</strong></p>
          <Source url={c.visa.post_study_work.source_url} />
          <p className="mt-2 text-sm"><Link href={`/visa#${c.country}`} className="link">Full {c.name} visa tracker</Link></p>
        </div>
      </section>

      {p.notes && <p className="rounded-lg bg-amber-soft p-3 text-sm text-amber"><strong>Research notes:</strong> {p.notes}</p>}

      <section>
        <h2 className="mb-3 text-2xl font-extrabold">Your ROI projection</h2>
        <ScenarioPanel country={c} programme={p} />
      </section>
      <FxNotice />
    </div>
  );
}
