"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { Badge, Empty, FLAG, FxNotice, PageHead } from "@/components/ui";
import { lakh, yrs } from "@/lib/format";
import { buildCandidates, costTier, type Candidate } from "@/lib/recommend";
import { COURSES, type CountryCode, type Course } from "@/lib/types";

type Sort = "cost" | "roi" | "salary" | "risk" | "match";
const SORTS: Record<Sort, string> = { match: "Best overall match", cost: "Lowest total cost", roi: "Highest estimated ROI", salary: "Highest expected salary", risk: "Lowest financial risk" };

export default function Universities() {
  const { countries, profile, assumptions, fx, lenders } = useData();
  // explorer shows every course and country, priced for this student
  const all = useMemo(
    () => buildCandidates(countries, { ...profile, courses: ["CS", "DS", "MBA"], countries: ["CA", "DE", "US", "UK", "JP", "AU"] }, assumptions, fx, lenders),
    [countries, profile, assumptions, fx, lenders],
  );
  const [q, setQ] = useState("");
  const [country, setCountry] = useState<CountryCode | "all">("all");
  const [course, setCourse] = useState<Course | "all">("all");
  const [budget, setBudget] = useState<number | null>(null);
  const [maxMonths, setMaxMonths] = useState<number | null>(null);
  const [scholarOnly, setScholarOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("match");

  const salaryInr = (c: Candidate) => (c.country.salary[c.course]?.entry_mid ?? 0) * c.rate;
  const shown = all
    .filter((c) => country === "all" || c.country.country === country)
    .filter((c) => course === "all" || c.course === course)
    .filter((c) => !budget || (c.totalInr != null && c.totalInr <= budget * 100_000))
    .filter((c) => !maxMonths || c.programme.duration_months <= maxMonths)
    .filter((c) => !scholarOnly || !!c.programme.scholarships)
    .filter((c) => !verifiedOnly || c.programme.status === "verified")
    .filter((c) => !q || `${c.programme.university} ${c.programme.programme_name} ${c.programme.city}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      const n = (x: number | null | undefined) => x ?? -Infinity;
      if (sort === "cost") return (a.totalInr ?? Infinity) - (b.totalInr ?? Infinity);
      if (sort === "roi") return n(b.expected?.npv) - n(a.expected?.npv);
      if (sort === "salary") return salaryInr(b) - salaryInr(a);
      if (sort === "risk") return n(b.results.returnHome?.netPosition.y5) - n(a.results.returnHome?.netPosition.y5);
      return n(b.score) - n(a.score);
    });

  if (!countries.length) return <Empty title="Research data not loaded" />;

  return (
    <div className="space-y-5">
      <PageHead eyebrow="University explorer" title={`${all.length} programmes across ${countries.length} countries`}>
        A curated, sourced sample, not every university. Each card is priced for your profile. Unverified figures are labelled.
      </PageHead>
      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input className="input lg:col-span-2" placeholder="Search university, programme or city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        <select className="input" value={country} onChange={(e) => setCountry(e.target.value as CountryCode | "all")} aria-label="Country">
          <option value="all">All countries</option>{countries.map((c) => <option key={c.country} value={c.country}>{c.name}</option>)}
        </select>
        <select className="input" value={course} onChange={(e) => setCourse(e.target.value as Course | "all")} aria-label="Course">
          <option value="all">All courses</option>{(Object.keys(COURSES) as Course[]).map((k) => <option key={k} value={k}>{COURSES[k]}</option>)}
        </select>
        <label className="text-sm"><span className="label">Max total cost (₹ lakh)</span><input className="input num" type="number" min={0} value={budget ?? ""} onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : null)} placeholder="Any" /></label>
        <label className="text-sm"><span className="label">Max duration (months)</span><input className="input num" type="number" min={0} value={maxMonths ?? ""} onChange={(e) => setMaxMonths(e.target.value ? Number(e.target.value) : null)} placeholder="Any" /></label>
        <label className="text-sm"><span className="label">Sort by</span><select className="input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>{(Object.keys(SORTS) as Sort[]).map((s) => <option key={s} value={s}>{SORTS[s]}</option>)}</select></label>
        <div className="flex flex-col justify-end gap-1 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={scholarOnly} onChange={(e) => setScholarOnly(e.target.checked)} /> Scholarships listed</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} /> Fully verified only</label>
        </div>
      </div>
      <p className="text-sm text-slate">{shown.length} shown</p>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((c) => {
          const tier = costTier(c.totalInr);
          return (
            <Link key={c.programme.id} href={`/universities/${c.programme.id}`} className="card block p-4 hover:border-forest">
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs font-semibold text-slate">{FLAG[c.country.country]} {c.programme.city}, {c.country.name}</div>
                <Badge kind={c.programme.status === "verified" ? "verified" : c.programme.status === "partial" ? "partial" : "unverified"} />
              </div>
              <div className="mt-1 font-bold">{c.programme.university}</div>
              <div className="text-sm text-slate">{c.programme.programme_name} · {c.programme.duration_months} mo</div>
              <div className="num mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <span className="text-slate">Total cost</span><span className="text-right font-semibold">{lakh(c.totalInr)}</span>
                <span className="text-slate">EMI</span><span className="text-right">{c.expected ? `₹${Math.round(c.expected.sim.emi).toLocaleString("en-IN")}` : "n/a"}</span>
                <span className="text-slate">Payback</span><span className="text-right">{c.expected ? yrs(c.expected.paybackYears) : "n/a"}</span>
                <span className="text-slate">Visa risk</span><span className="text-right">{c.visaRisk}/100</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {tier && <span className="rounded-full bg-ivory px-2 py-0.5 text-[11px] font-semibold">{tier}</span>}
                {c.programme.scholarships && <span className="rounded-full bg-ivory px-2 py-0.5 text-[11px] font-semibold">Scholarships</span>}
                {c.fundingGap > 0 && <Badge kind="unverified">Funding gap</Badge>}
                {c.costIncomplete && <Badge kind="missing">Cost incomplete</Badge>}
                {c.missing.length > 0 && <Badge kind="missing">{c.missing.length} missing</Badge>}
              </div>
            </Link>
          );
        })}
      </div>
      {!shown.length && <Empty title="No programmes match these filters" />}
      <FxNotice />
    </div>
  );
}
