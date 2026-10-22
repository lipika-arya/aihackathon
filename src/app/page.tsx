"use client";
import Link from "next/link";
import { useData } from "@/components/DataProvider";
import { Badge, FLAG, FxNotice } from "@/components/ui";
import { riskBand, visaRiskScore } from "@/lib/model";
import { COURSES } from "@/lib/types";

export default function Home() {
  const { countries, lenders, fx, india } = useData();
  const word = (n: number) => ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"][n] ?? String(n);
  const futures = india?.programmes.length ? 6 : 5;
  const progs = countries.flatMap((c) => c.programmes);
  const verified = progs.filter((p) => p.status === "verified").length;
  return (
    <div className="space-y-16">
      <section className="grid items-center gap-10 pt-6 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-forest">Abroad or not? See if your loan pays off.</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">Study abroad is an investment. Make it count.</h1>
          <p className="mt-4 max-w-xl text-lg text-slate">
            Compare universities, calculate your true education cost, see your loan repayment, understand visa risk, and find out
            how many years it takes to pay back if you get a job abroad, lose your visa, or come home.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/assess" className="btn btn-primary">Start my assessment →</Link>
            <Link href="/compare" className="btn btn-ghost">Compare countries</Link>
            <Link href="/universities" className="btn btn-ghost">Explore universities</Link>
            <Link href="/roi" className="btn btn-ghost">ROI calculator</Link>
          </div>
          <p className="mt-5 text-sm text-slate">No university commissions · No lender commissions · Every figure linked to its source</p>
        </div>
        <div className="card space-y-3 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate">The question nobody models</p>
          <p className="text-lg font-bold">Same loan. {word(futures)} possible futures.</p>
          {[
            ["Job abroad fast", "#245c4a"],
            ["Job abroad after 6 months", "#3b82a6"],
            ["Slow job search, low salary", "#b7791f"],
            ["Work permit ends, back to India", "#8a5a9e"],
            ["Return home right after graduating", "#b5473c"],
            ...(india?.programmes.length ? [["Or do the same master's in India", "#475569"]] : []),
          ].map(([l, col]) => (
            <div key={l} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: col }} />{l}
            </div>
          ))}
          <p className="text-xs text-slate">For each, WorthWise shows years to become debt-free, EMI as a share of take-home pay, and when (or whether) the degree beats staying in India.</p>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-extrabold">{word(countries.length)} countries, three courses</h2>
        <p className="mt-1 text-slate">{Object.values(COURSES).join(" · ")}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {countries.map((c) => {
            const score = visaRiskScore(c);
            return (
              <Link key={c.country} href={`/visa#${c.country}`} className="card block p-4 hover:border-forest">
                <div className="text-2xl">{FLAG[c.country]}</div>
                <div className="mt-1 font-bold">{c.name}</div>
                <div className="mt-2 text-xs text-slate">Post-study work</div>
                <div className="text-sm font-semibold">{c.visa.post_study_work.months_max ? `Up to ${c.visa.post_study_work.months_max} months` : "See details"}</div>
                <div className="mt-2 text-xs text-slate">Visa policy risk</div>
                <div className="num text-sm font-semibold">{score}/100 · {riskBand(score)}</div>
                <div className="mt-2 text-xs text-slate">{c.programmes.length} programmes in our data</div>
              </Link>
            );
          })}
          {countries.length === 0 && <p className="text-sm text-slate">Research data is not available yet.</p>}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["1", "Tell us about you", "Degree, scores, budget, loan limit and what matters to you. Ranges are fine. Stays in your browser."],
          ["2", "We cost every option", "Tuition, fees, living, visa, flights and loan interest during study, converted to INR at today's rate."],
          ["3", "We stress-test it", "Several what-if futures against your India alternative: payback, NPV, EMI burden, years to debt-free."],
          ["4", "You decide", "Six ranked picks with the reasons, the risks and the gaps. We never guarantee jobs, visas or returns."],
        ].map(([n, t, d]) => (
          <div key={n} className="card p-5">
            <div className="num text-sm font-bold text-forest">{n}</div>
            <div className="mt-1 font-bold">{t}</div>
            <p className="mt-1 text-sm text-slate">{d}</p>
          </div>
        ))}
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-extrabold">Data freshness and transparency</h2>
        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <div><div className="num text-2xl font-bold">{progs.length}</div><div className="text-slate">programmes, {verified} fully verified on official pages</div></div>
          <div><div className="num text-2xl font-bold">{lenders?.lenders.length ?? 0}</div><div className="text-slate">education lenders, terms from their own sites</div></div>
          <div><div className="num text-2xl font-bold">{fx.date}</div><div className="text-slate">exchange-rate date</div></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge kind="verified" /> <Badge kind="partial" /> <Badge kind="estimate" /> <Badge kind="assumption" /> <Badge kind="input" /> <Badge kind="calculated" /> <Badge kind="missing" />
        </div>
        <p className="mt-3 text-sm text-slate">
          This is a curated sample, not every university. Where we couldn&apos;t confirm a number on an official page, we say so instead of guessing.{" "}
          <Link href="/methodology" className="link">How the numbers work</Link>
        </p>
        <div className="mt-3"><FxNotice /></div>
      </section>
    </div>
  );
}
