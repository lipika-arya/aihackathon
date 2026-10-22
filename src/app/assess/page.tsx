"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useData } from "@/components/DataProvider";
import { FLAG, PageHead } from "@/components/ui";
import type { Profile } from "@/lib/model";
import { WeightsEditor } from "@/components/WeightsEditor";
import { COURSES, type CountryCode, type Course } from "@/lib/types";
import { lakh } from "@/lib/format";

const STEPS = ["Background", "Course & career", "Finances", "Priorities", "Review"];
const COUNTRY_NAMES: Record<CountryCode, string> = { CA: "Canada", DE: "Germany", US: "United States", UK: "United Kingdom", JP: "Japan", AU: "Australia" };
const GOALS = ["Software engineering", "Data analytics", "Data science", "Data engineering", "Artificial intelligence", "Product management", "Consulting", "Finance", "Business leadership", "Entrepreneurship"];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="label">{label}</span>{children}{hint && <span className="hint block">{hint}</span>}</label>;
}

function Num({ value, onChange, min = 0, max, step = 1, placeholder }: { value: number | null; onChange: (v: number | null) => void; min?: number; max?: number; step?: number; placeholder?: string }) {
  return (
    <input className="input num" type="number" inputMode="decimal" min={min} max={max} step={step} placeholder={placeholder}
      value={value ?? ""} onChange={(e) => {
        const v = e.target.value === "" ? null : Number(e.target.value);
        onChange(v == null || isNaN(v) ? null : Math.max(min, max != null ? Math.min(max, v) : v));
      }} />
  );
}

/** Money entered in lakhs (₹1 L = ₹1,00,000), stored in rupees. */
function Lakhs({ value, onChange, placeholder }: { value: number | null; onChange: (v: number | null) => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate">₹</span>
      <Num value={value == null ? null : value / 100_000} step={0.5} placeholder={placeholder} onChange={(v) => onChange(v == null ? null : Math.round(v * 100_000))} />
      <span className="text-sm text-slate">lakh</span>
    </div>
  );
}

export default function Assess() {
  const { profile, setProfile, hasProfile } = useData();
  const router = useRouter();
  const [p, setP] = useState<Profile>({ ...profile, indiaSalary: null }); // never pre-fill the example India salary
  const [step, setStep] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (hasProfile) setP(profile); }, [hasProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  const up = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const validate = (): string | null => {
    if (step === 1 && !p.courses.length) return "Choose at least one course.";
    if (step === 1 && !p.countries.length) return "Choose at least one country.";
    if (step === 2 && !(p.indiaSalary != null && p.indiaSalary > 0)) return "Enter the salary you expect if you stay in India. It is needed for the stay-in-India comparison, and we do not guess one.";
    if (step === 0 && p.cgpa != null && (p.cgpa < 0 || p.cgpa > 10)) return "CGPA should be between 0 and 10.";
    if (step === 0 && p.ielts != null && (p.ielts < 0 || p.ielts > 9)) return "IELTS bands run from 0 to 9.";
    return null;
  };
  const next = () => {
    const e = validate();
    setErr(e);
    if (e) return;
    setProfile(p); // save and continue
    if (step === STEPS.length - 1) router.push("/results");
    else setStep(step + 1);
  };

  const funds = p.familyFunds + p.savings + p.scholarship;
  const missing = [
    p.cgpa == null && "CGPA (needed to judge academic fit)",
    p.ielts == null && p.toefl == null && "English test score (needed for eligibility checks)",
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHead eyebrow="Student assessment" title="Let's build your comparison">
        Answers stay in this browser. We never ask for bank details, passwords or documents.
      </PageHead>

      <ol className="mb-6 flex gap-1" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <button onClick={() => i < step && setStep(i)} className={`h-1.5 w-full rounded-full ${i <= step ? "bg-forest" : "bg-line"}`} aria-label={`Step ${i + 1}: ${s}`} />
            <span className={`mt-1 hidden text-xs sm:block ${i === step ? "font-semibold" : "text-slate"}`}>{s}</span>
          </li>
        ))}
      </ol>

      <div className="card space-y-5 p-6">
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Highest qualification"><select className="input" value={p.qualification} onChange={(e) => up("qualification", e.target.value)}>{["B.Tech / B.E.", "B.Sc", "BCA", "B.Com", "BBA", "Other bachelor's", "Master's"].map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Specialisation"><input className="input" value={p.specialization} onChange={(e) => up("specialization", e.target.value)} placeholder="e.g. Computer Science" /></Field>
            <Field label="CGPA (out of 10)" hint="Convert percentage roughly as % ÷ 9.5 if unsure."><Num value={p.cgpa} onChange={(v) => up("cgpa", v)} max={10} step={0.1} placeholder="e.g. 8.2" /></Field>
            <Field label="Work experience (years)"><Num value={p.workYears} onChange={(v) => up("workYears", v ?? 0)} max={40} step={0.5} /></Field>
            <Field label="IELTS overall (optional)"><Num value={p.ielts} onChange={(v) => up("ielts", v)} max={9} step={0.5} placeholder="e.g. 7" /></Field>
            <Field label="TOEFL iBT (optional)"><Num value={p.toefl} onChange={(v) => up("toefl", v)} max={120} placeholder="e.g. 100" /></Field>
            <Field label="GRE (optional)"><Num value={p.gre} onChange={(v) => up("gre", v)} max={340} placeholder="e.g. 315" /></Field>
            <Field label="GMAT (optional)"><Num value={p.gmat} onChange={(v) => up("gmat", v)} max={805} placeholder="e.g. 650" /></Field>
          </div>
        )}

        {step === 1 && (
          <>
            <Field label="Which courses are you considering?">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(COURSES) as Course[]).map((c) => (
                  <button key={c} type="button" onClick={() => up("courses", toggle(p.courses, c))} aria-pressed={p.courses.includes(c)} className={`btn ${p.courses.includes(c) ? "btn-primary" : "btn-ghost"}`}>{COURSES[c]}</button>
                ))}
              </div>
            </Field>
            <Field label="Which countries?">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(COUNTRY_NAMES) as CountryCode[]).map((c) => (
                  <button key={c} type="button" onClick={() => up("countries", toggle(p.countries, c))} aria-pressed={p.countries.includes(c)} className={`btn ${p.countries.includes(c) ? "btn-primary" : "btn-ghost"}`}>{FLAG[c]} {COUNTRY_NAMES[c]}</button>
                ))}
              </div>
            </Field>
            <Field label="Career goal"><select className="input" value={p.goal} onChange={(e) => up("goal", e.target.value)}>{GOALS.map((g) => <option key={g}>{g}</option>)}</select></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Interested in permanent residency?"><select className="input" value={p.wantsPR ? "y" : "n"} onChange={(e) => up("wantsPR", e.target.value === "y")}><option value="n">Not a priority</option><option value="y">Yes, important</option></select></Field>
              <Field label="Willing to work part-time while studying?"><select className="input" value={p.partTime ? "y" : "n"} onChange={(e) => up("partTime", e.target.value === "y")}><option value="n">No / not counting on it</option><option value="y">Yes</option></select></Field>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Family contribution" hint="What your family can put in without borrowing. A rough figure is fine."><Lakhs value={p.familyFunds} onChange={(v) => up("familyFunds", v ?? 0)} /></Field>
            <Field label="Your own savings"><Lakhs value={p.savings} onChange={(v) => up("savings", v ?? 0)} /></Field>
            <Field label="Scholarship already secured" hint="Only count money you have been offered."><Lakhs value={p.scholarship} onChange={(v) => up("scholarship", v ?? 0)} /></Field>
            <Field label="Maximum loan you would take" hint="We never borrow past this. Anything above it shows as a funding gap."><Lakhs value={p.maxLoan} onChange={(v) => up("maxLoan", v ?? 0)} /></Field>
            <Field label="Collateral available?" hint="Affects which lenders and rates are realistic."><select className="input" value={p.collateral ? "y" : "n"} onChange={(e) => up("collateral", e.target.value === "y")}><option value="n">No</option><option value="y">Yes (property / FD)</option></select></Field>
            <Field label="Co-applicant (parent/guardian) available?"><select className="input" value={p.coApplicant ? "y" : "n"} onChange={(e) => up("coApplicant", e.target.value === "y")}><option value="y">Yes</option><option value="n">No</option></select></Field>
            <Field label="Maximum monthly EMI you're comfortable with (optional)"><div className="flex items-center gap-2"><span className="text-sm text-slate">₹</span><Num value={p.maxEmi} onChange={(v) => up("maxEmi", v)} step={1000} placeholder="e.g. 40000" /></div></Field>
            <Field label="Preferred repayment period (years)"><Num value={p.repaymentYears} onChange={(v) => up("repaymentYears", Math.max(1, v ?? 10))} min={1} max={20} /></Field>
            <Field label="Expected salary if you stay in India (per year)" hint="Required. We have no verified India salary data, so we use only the figure you enter."><Lakhs value={p.indiaSalary} onChange={(v) => up("indiaSalary", v)} placeholder="e.g. 8" /></Field>
            <Field label="Your monthly living cost in India" hint="Used for the stay-in-India comparison."><div className="flex items-center gap-2"><span className="text-sm text-slate">₹</span><Num value={p.indiaLiving} onChange={(v) => up("indiaLiving", v ?? 0)} step={1000} /></div></Field>
            <Field label="Lifestyle abroad"><select className="input" value={p.lifestyle} onChange={(e) => up("lifestyle", e.target.value as Profile["lifestyle"])}><option value="budget">Budget (shared room, cook at home)</option><option value="moderate">Moderate</option><option value="comfortable">Comfortable</option></select></Field>
            <p className="rounded-lg bg-forest-soft p-3 text-sm sm:col-span-2">Available without borrowing: <strong>{lakh(funds)}</strong>. With your max loan: <strong>{lakh(funds + p.maxLoan)}</strong>.</p>
          </div>
        )}

        {step === 3 && (
          <>
            <Field label="Risk tolerance"><select className="input" value={p.riskTolerance} onChange={(e) => up("riskTolerance", e.target.value as Profile["riskTolerance"])}><option value="low">Low: I want to avoid big debt</option><option value="medium">Medium</option><option value="high">High: I&apos;ll take risk for higher upside</option></select></Field>
            <WeightsEditor w={p.priorities} onChange={(w) => up("priorities", w)} />
          </>
        )}

        {step === 4 && (
          <div className="space-y-3 text-sm">
            <h2 className="text-lg font-bold">Your profile</h2>
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {[
                ["Background", `${p.qualification}, ${p.specialization}${p.cgpa != null ? `, CGPA ${p.cgpa}` : ""}`],
                ["Experience", `${p.workYears} years`],
                ["Tests", [p.ielts && `IELTS ${p.ielts}`, p.toefl && `TOEFL ${p.toefl}`, p.gre && `GRE ${p.gre}`, p.gmat && `GMAT ${p.gmat}`].filter(Boolean).join(", ") || "None entered"],
                ["Courses", p.courses.map((c) => COURSES[c]).join(", ")],
                ["Countries", p.countries.map((c) => COUNTRY_NAMES[c]).join(", ")],
                ["Funds / max loan", `${lakh(funds)} / ${lakh(p.maxLoan)}`],
                ["India salary", lakh(p.indiaSalary)],
                ["Repayment", `${p.repaymentYears} years${p.maxEmi ? `, max EMI ₹${p.maxEmi.toLocaleString("en-IN")}` : ""}`],
              ].map(([k, v]) => (
                <div key={k} className="border-b border-line py-1"><dt className="text-xs text-slate">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
            {missing.length > 0 && (
              <div className="rounded-lg bg-amber-soft p-3 text-amber"><strong>Missing information:</strong> {missing.join("; ")}. Results will show &quot;Unable to assess&quot; where this matters.</div>
            )}
          </div>
        )}

        {err && <p className="text-sm font-semibold text-brick" role="alert">{err}</p>}
        <div className="flex justify-between pt-2">
          <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>← Back</button>
          <button className="btn btn-primary" onClick={next}>{step === STEPS.length - 1 ? "See my results →" : "Continue →"}</button>
        </div>
      </div>
    </div>
  );
}
