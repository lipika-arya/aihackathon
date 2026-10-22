"use client";
import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { ScenarioPanel } from "@/components/ScenarioPanel";
import { Badge, Empty, FxNotice, PageHead } from "@/components/ui";
import { DEFAULT_ASSUMPTIONS, type Assumptions } from "@/lib/model";
import { COURSES } from "@/lib/types";

function Slider({ label, value, min, max, step, unit, onChange, kind = "assumption" }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void; kind?: "assumption" | "input" }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-sm"><span className="font-semibold">{label}</span><span className="num">{value}{unit}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#245c4a]" aria-label={label} />
      <span className="sr-only">{kind}</span>
    </label>
  );
}

export default function Roi() {
  const { countries, assumptions: a, setAssumptions, profile, setProfile, fx, rateBasis } = useData();
  const all = countries.flatMap((c) => c.programmes.map((p) => ({ c, p })));
  const [id, setId] = useState<string>(all[0]?.p.id ?? "");
  const sel = all.find((x) => x.p.id === id) ?? all[0];
  if (!sel) return <Empty title="Research data not loaded" />;
  const set = (patch: Partial<Assumptions>) => setAssumptions({ ...a, ...patch });
  const cur = sel.c.currency;
  const liveRate = fx.inrPer[cur];
  const planRate = a.fxOverride[cur] ?? liveRate;

  return (
    <div className="space-y-6">
      <PageHead eyebrow="ROI calculator" title="Stress-test the numbers yourself">
        Every slider is an assumption. Change it and every result recalculates instantly. Your changes are saved in this browser and used across the app.
      </PageHead>
      <label className="block max-w-xl">
        <span className="label">Programme</span>
        <select className="input" value={sel.p.id} onChange={(e) => setId(e.target.value)}>
          {countries.map((c) => (
            <optgroup key={c.country} label={c.name}>
              {c.programmes.map((p) => <option key={p.id} value={p.id}>{p.university}: {p.programme_name} ({COURSES[p.course]})</option>)}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="card h-fit space-y-4 p-4 lg:sticky lg:top-20">
          <h2 className="flex items-center gap-2 font-bold">Your money <Badge kind="input" /></h2>
          <Slider kind="input" label="Family + savings" value={Math.round((profile.familyFunds + profile.savings) / 1e5)} min={0} max={100} step={1} unit=" L" onChange={(v) => setProfile({ ...profile, familyFunds: v * 1e5, savings: 0 })} />
          <Slider kind="input" label="Max loan" value={Math.round(profile.maxLoan / 1e5)} min={0} max={150} step={1} unit=" L" onChange={(v) => setProfile({ ...profile, maxLoan: v * 1e5 })} />
          <Slider kind="input" label="Scholarship" value={Math.round(profile.scholarship / 1e5)} min={0} max={50} step={1} unit=" L" onChange={(v) => setProfile({ ...profile, scholarship: v * 1e5 })} />
          <Slider kind="input" label="Repayment period" value={profile.repaymentYears} min={1} max={15} step={1} unit=" yrs" onChange={(v) => setProfile({ ...profile, repaymentYears: v })} />
          <Slider kind="input" label={profile.indiaSalary == null ? "India salary (if you stay): enter yours" : "India salary (if you stay)"} value={Math.round((profile.indiaSalary ?? 0) / 1e5)} min={0} max={40} step={0.5} unit=" L/yr" onChange={(v) => setProfile({ ...profile, indiaSalary: v ? v * 1e5 : null })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={profile.partTime} onChange={(e) => setProfile({ ...profile, partTime: e.target.checked })} /> Count part-time income while studying</label>
          {profile.partTime && <Slider label={`Part-time income (${cur}/month)`} value={a.partTimeMonthlyLocal} min={0} max={cur === "JPY" ? 150000 : 1500} step={cur === "JPY" ? 5000 : 50} unit="" onChange={(v) => set({ partTimeMonthlyLocal: v })} />}

          <h2 className="flex items-center gap-2 pt-2 font-bold">Loan <Badge kind="assumption" /></h2>
          <Slider label="Interest rate" value={a.loanRatePct} min={6} max={16} step={0.05} unit="%" onChange={(v) => set({ loanRatePct: v })} />
          {rateBasis && <p className="hint -mt-3">Default {rateBasis.rate}% = average mid-point of the published ranges of {rateBasis.lenders.length} public-sector banks ({rateBasis.lenders.join(", ")}), as of {rateBasis.asOf}. Private banks and NBFCs are not included because their rates vary or are published only as &ldquo;starting from&rdquo;. Check your own sanction letter.</p>}
          <Slider label="Grace period after course" value={a.graceMonths} min={0} max={12} step={1} unit=" mo" onChange={(v) => set({ graceMonths: v })} />
          <Slider label="Processing fee" value={a.processingFeePct} min={0} max={3} step={0.25} unit="%" onChange={(v) => set({ processingFeePct: v })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={a.payInterestDuringMoratorium} onChange={(e) => set({ payInterestDuringMoratorium: e.target.checked })} /> Pay interest during study (instead of adding it to the loan)</label>

          <h2 className="flex items-center gap-2 pt-2 font-bold">Economy <Badge kind="assumption" /></h2>
          <Slider label={`Planning rate (₹ per ${cur})`} value={Number(planRate.toFixed(cur === "JPY" ? 3 : 1))} min={liveRate * 0.8} max={liveRate * 1.3} step={cur === "JPY" ? 0.005 : 0.5} unit="" onChange={(v) => set({ fxOverride: { ...a.fxOverride, [cur]: v } })} />
          <p className="hint -mt-3">Today: ₹{liveRate.toFixed(cur === "JPY" ? 4 : 2)} ({fx.live ? "live" : "stored"}, {fx.date}). {a.fxOverride[cur] != null && <button className="underline" onClick={() => { const o = { ...a.fxOverride }; delete o[cur]; set({ fxOverride: o }); }}>Reset</button>}</p>
          <Slider label="INR weakens per year" value={a.inrDepreciationPct} min={-2} max={8} step={0.5} unit="%" onChange={(v) => set({ inrDepreciationPct: v })} />
          <Slider label="Salary growth abroad" value={a.salaryGrowthAbroadPct} min={0} max={12} step={0.5} unit="%/yr" onChange={(v) => set({ salaryGrowthAbroadPct: v })} />
          <Slider label="Salary growth in India" value={a.salaryGrowthIndiaPct} min={0} max={15} step={0.5} unit="%/yr" onChange={(v) => set({ salaryGrowthIndiaPct: v })} />
          <Slider label="India effective tax" value={a.indiaTaxPct} min={0} max={30} step={1} unit="%" onChange={(v) => set({ indiaTaxPct: v })} />
          <Slider label="Living-cost inflation" value={a.livingInflationPct} min={0} max={10} step={0.5} unit="%/yr" onChange={(v) => set({ livingInflationPct: v })} />
          <Slider label="Discount rate (NPV)" value={a.discountRatePct} min={0} max={15} step={0.5} unit="%" onChange={(v) => set({ discountRatePct: v })} />
          <Slider label="Horizon" value={a.horizonYears} min={5} max={15} step={1} unit=" yrs" onChange={(v) => set({ horizonYears: v })} />
          <Slider label="Flights + relocation" value={a.flightsInr / 1000} min={0} max={300} step={5} unit="k ₹" onChange={(v) => set({ flightsInr: v * 1000 })} />
          <Slider label="Tests + applications" value={a.testsAndApplicationsInr / 1000} min={0} max={200} step={5} unit="k ₹" onChange={(v) => set({ testsAndApplicationsInr: v * 1000 })} />
          <button className="btn btn-ghost w-full" onClick={() => setAssumptions({ ...DEFAULT_ASSUMPTIONS, loanRatePct: rateBasis?.rate ?? DEFAULT_ASSUMPTIONS.loanRatePct })}>Reset assumptions</button>
        </aside>
        <div className="min-w-0 space-y-4">
          <h2 className="text-xl font-extrabold">{sel.p.university}: {sel.p.programme_name}</h2>
          <ScenarioPanel country={sel.c} programme={sel.p} />
          <FxNotice />
        </div>
      </div>
    </div>
  );
}
