"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useData } from "./DataProvider";
import { inr, local } from "@/lib/format";

export type Kind = "verified" | "partial" | "unverified" | "estimate" | "assumption" | "input" | "calculated" | "missing" | "stale";

const KIND: Record<Kind, { label: string; cls: string; icon: string }> = {
  verified: { label: "Verified", cls: "bg-forest-soft text-forest", icon: "✓" },
  partial: { label: "Partly verified", cls: "bg-amber-soft text-amber", icon: "◐" },
  unverified: { label: "Unverified", cls: "bg-brick-soft text-brick", icon: "!" },
  estimate: { label: "Estimate", cls: "bg-amber-soft text-amber", icon: "≈" },
  assumption: { label: "Assumption", cls: "bg-[#eef0f3] text-[#4a5568]", icon: "◇" },
  input: { label: "Your input", cls: "bg-[#e8eefb] text-[#2c4a8a]", icon: "✎" },
  calculated: { label: "Calculated", cls: "bg-[#efeaf7] text-[#5b3f8a]", icon: "=" },
  missing: { label: "Data unavailable", cls: "bg-brick-soft text-brick", icon: "∅" },
  stale: { label: "Not current", cls: "bg-amber-soft text-amber", icon: "⏱" },
};

/** Status is always text + icon, never colour alone. */
export function Badge({ kind, children }: { kind: Kind; children?: ReactNode }) {
  const k = KIND[kind];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${k.cls}`}>
      <span aria-hidden>{k.icon}</span>{children ?? k.label}
    </span>
  );
}

export function Source({ url, label = "Source" }: { url: string | null | undefined; label?: string }) {
  if (!url) return <Badge kind="missing">No source</Badge>;
  let host = url;
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* keep raw */ }
  return <a href={url} target="_blank" rel="noopener noreferrer" className="link text-xs break-all">{label}: {host} ↗</a>;
}

const rateStr = (rate: number, cur: string) => rate.toFixed(cur === "JPY" ? 4 : 2);

/** INR equivalent with the local amount and the rate used underneath. */
export function Money({ amount, currency, rate, small }: { amount: number | null; currency: string; rate: number; small?: boolean }) {
  const { fx } = useData();
  if (amount == null) return <Badge kind="missing" />;
  if (currency === "INR") return <span className="num font-semibold">{inr(amount)}</span>;
  return (
    <span className="inline-flex flex-col leading-tight">
      <span className={`num font-semibold ${small ? "text-sm" : ""}`}>{inr(amount * rate)}</span>
      <span className="num text-[11px] text-slate" title={`₹${rateStr(rate, currency)} per ${currency}, ${fx.live ? "rate of" : "stored rate of"} ${fx.date}`}>
        {local(amount, currency)} @ ₹{rateStr(rate, currency)}
      </span>
    </span>
  );
}

/** Shown wherever results depend on the student's India salary and they have not entered it yet. */
export function IndiaSalaryNotice() {
  const { profile } = useData();
  const s = profile.indiaSalary;
  if (s != null && s > 0) return null;
  if (s === 0) {
    return (
      <div className="rounded-xl border border-line bg-card p-3 text-sm text-slate" role="status">
        <strong>India salary entered as ₹0.</strong> Payback and ROI are measured against earning nothing if you stay. The two return-to-India scenarios assume you earn an India salary after coming back, so they are not shown; enter a salary above 0 to see them.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-line bg-card p-3 text-sm text-slate" role="status">
      <strong>Optional: add your India salary</strong> to see payback and ROI against staying in India and the two return-to-India scenarios. Enter 0 if you would earn nothing (for example a fresher or unpaid family work). We use only the figure you enter, because we have no verified India salary data.{" "}
      <Link href="/assess" className="link">Start my assessment</Link> or use the slider in the <Link href="/roi" className="link">ROI calculator</Link>.
    </div>
  );
}

export function FxNotice() {
  const { fx } = useData();
  return (
    <div className="space-y-1 text-xs text-slate">
      <p className="flex flex-wrap items-center gap-2">
        {fx.live ? <Badge kind="verified">Live rates</Badge> : <Badge kind="stale">Stored rates, not current</Badge>}
        <span>
          {fx.source}, dated {fx.date}. 1 USD = ₹{fx.inrPer.USD.toFixed(2)} · 1 EUR = ₹{fx.inrPer.EUR.toFixed(2)} · 1 CAD = ₹{fx.inrPer.CAD.toFixed(2)} · 1 GBP = ₹{fx.inrPer.GBP.toFixed(2)} · 1 AUD = ₹{fx.inrPer.AUD.toFixed(2)} · 1 JPY = ₹{fx.inrPer.JPY.toFixed(4)}
        </span>
      </p>
      <p>
        These are mid-market reference rates. Banks and money-transfer services usually charge a margin on top (often a percent or two), so
        what you actually pay in rupees will likely be a little higher. Use the planning-rate slider in the ROI calculator to allow for it.
      </p>
    </div>
  );
}

export function Stat({ label, value, sub, kind }: { label: string; value: ReactNode; sub?: ReactNode; kind?: Kind }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate"><span>{label}</span>{kind && <Badge kind={kind} />}</div>
      <div className="num mt-1 text-xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate">{sub}</div>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card border-dashed p-8 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-slate">{children}</div>}
    </div>
  );
}

export function PageHead({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-6">
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-forest">{eyebrow}</p>}
      <h1 className="mt-1 text-3xl font-extrabold">{title}</h1>
      {children && <div className="mt-2 max-w-3xl text-slate">{children}</div>}
    </div>
  );
}

export const FLAG: Record<string, string> = { UK: "🇬🇧", US: "🇺🇸", DE: "🇩🇪", CA: "🇨🇦", JP: "🇯🇵", AU: "🇦🇺", IN: "🇮🇳" };
