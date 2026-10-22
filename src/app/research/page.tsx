"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useData } from "@/components/DataProvider";
import { Empty, FLAG, PageHead, Stat } from "@/components/ui";

// Validation sessions for the 10 student/parent tests. Stored only in this browser; export to CSV after each session.
interface Session {
  code: string;
  type: "student" | "parent";
  before: string[];
  after: string[] | null;
  reason: string;
  confBefore: number;
  confAfter: number | null;
  wouldPay: "yes" | "maybe" | "no" | null;
  notes: string;
  at: string;
}

const KEY = "abroadroi.research";
const load = (): Session[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };
const save = (s: Session[]) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } };
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

export default function Research() {
  const { countries } = useData();
  const [list, setList] = useState<Session[]>([]);
  const [draft, setDraft] = useState<Session | null>(null);
  useEffect(() => setList(load()), []);
  const opts = countries.flatMap((c) => c.programmes.map((p) => ({ id: p.id, label: `${FLAG[c.country]} ${p.university}: ${p.programme_name}` })));
  const commit = (s: Session[]) => { setList(s); save(s); };

  const done = list.filter((s) => s.after);
  const changed = done.filter((s) => !same(s.before, s.after!));
  const pay = done.filter((s) => s.wouldPay === "yes").length;
  const confShift = done.length ? done.reduce((a, s) => a + ((s.confAfter ?? s.confBefore) - s.confBefore), 0) / done.length : null;

  const csv = () => {
    const rows = [["code", "type", "before", "after", "changed", "reason", "confidence_before", "confidence_after", "would_pay_499", "notes", "recorded_at"],
      ...list.map((s) => [s.code, s.type, s.before.join("|"), (s.after ?? []).join("|"), s.after ? String(!same(s.before, s.after)) : "", s.reason, s.confBefore, s.confAfter ?? "", s.wouldPay ?? "", s.notes, s.at])];
    const blob = new Blob([rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "abroadroi-research-sessions.csv";
    a.click();
  };

  const Pick = ({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) => (
    <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-line p-2 text-sm">
      {opts.map((o) => (
        <label key={o.id} className="flex items-center gap-2"><input type="checkbox" checked={value.includes(o.id)} onChange={(e) => onChange(e.target.checked ? [...value, o.id] : value.filter((x) => x !== o.id))} />{o.label}</label>
      ))}
      <label className="flex items-center gap-2"><input type="checkbox" checked={value.includes("india")} onChange={(e) => onChange(e.target.checked ? [...value, "india"] : value.filter((x) => x !== "india"))} />🇮🇳 Stay in India / work first</label>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHead eyebrow="Validation" title="Research sessions">
        North-star metric: the share of students or parents who change their shortlist after seeing the analysis.
        Record the shortlist <strong>before</strong> they use AbroadROI, let them go through <Link href="/assess" className="link">the assessment</Link>, then record the shortlist <strong>after</strong>.
        Use pseudonymous codes (P01, P02). Get consent before recording notes. Data stays in this browser; export it as CSV after each session.
      </PageHead>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Completed sessions" value={`${done.length} / 10`} />
        <Stat label="Shortlist change rate" value={done.length ? `${Math.round((changed.length / done.length) * 100)}%` : "Not measured"} sub={done.length ? `${changed.length} of ${done.length}. Small sample, exploratory only.` : undefined} kind="calculated" />
        <Stat label="Confidence shift (1-5)" value={confShift == null ? "Not measured" : `${confShift >= 0 ? "+" : ""}${confShift.toFixed(1)}`} />
        <Stat label="Would pay ₹499" value={done.length ? `${pay} of ${done.length}` : "Not measured"} sub="Stated intent, not a purchase" />
      </div>

      {!draft && (
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => setDraft({ code: `P${String(list.length + 1).padStart(2, "0")}`, type: "student", before: [], after: null, reason: "", confBefore: 3, confAfter: null, wouldPay: null, notes: "", at: new Date().toISOString() })}>+ New session</button>
          {list.length > 0 && <button className="btn btn-ghost" onClick={csv}>Export CSV</button>}
        </div>
      )}

      {draft && (
        <div className="card space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <label><span className="label">Participant code</span><input className="input" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} /></label>
            <label><span className="label">Participant</span><select className="input" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Session["type"] })}><option value="student">Student</option><option value="parent">Parent</option></select></label>
            <label><span className="label">Confidence before (1-5)</span><input className="input num" type="number" min={1} max={5} value={draft.confBefore} onChange={(e) => setDraft({ ...draft, confBefore: Math.min(5, Math.max(1, Number(e.target.value))) })} /></label>
          </div>
          <div><span className="label">Shortlist BEFORE seeing AbroadROI</span><Pick value={draft.before} onChange={(v) => setDraft({ ...draft, before: v })} /></div>
          <button className="btn btn-primary" disabled={!draft.before.length} onClick={() => { commit([...list.filter((s) => s.code !== draft.code), draft]); setDraft(null); }}>Save &quot;before&quot; and start the session</button>
        </div>
      )}

      <div className="space-y-3">
        {list.map((s, i) => <SessionRow key={s.code + i} s={s} Pick={Pick} onSave={(n) => commit(list.map((x, j) => (j === i ? n : x)))} onDelete={() => commit(list.filter((_, j) => j !== i))} labels={opts} />)}
        {!list.length && !draft && <Empty title="No sessions yet">Start one before a student or parent uses the tool.</Empty>}
      </div>
    </div>
  );
}

function SessionRow({ s, onSave, onDelete, Pick, labels }: { s: Session; onSave: (s: Session) => void; onDelete: () => void; Pick: (p: { value: string[]; onChange: (v: string[]) => void }) => React.ReactElement; labels: { id: string; label: string }[] }) {
  const [after, setAfter] = useState<string[]>(s.after ?? s.before);
  const [reason, setReason] = useState(s.reason);
  const [conf, setConf] = useState(s.confAfter ?? s.confBefore);
  const [pay, setPay] = useState(s.wouldPay ?? "maybe");
  const [notes, setNotes] = useState(s.notes);
  const name = (id: string) => (id === "india" ? "🇮🇳 Stay in India" : labels.find((l) => l.id === id)?.label ?? id);
  return (
    <details className="card p-4" open={!s.after}>
      <summary className="cursor-pointer font-semibold">{s.code} · {s.type} · {s.after ? (s.before.length === s.after.length && s.before.every((x) => s.after!.includes(x)) ? "kept shortlist" : "changed shortlist") : "in progress"}</summary>
      <p className="mt-2 text-sm text-slate">Before: {s.before.map(name).join("; ")}</p>
      <div className="mt-3 space-y-3">
        <div><span className="label">Shortlist AFTER</span><Pick value={after} onChange={setAfter} /></div>
        <label className="block"><span className="label">Why did it change (or not)? What surprised them? What didn&apos;t they trust?</span><textarea className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className="label">Confidence after (1-5)</span><input className="input num" type="number" min={1} max={5} value={conf} onChange={(e) => setConf(Math.min(5, Math.max(1, Number(e.target.value))))} /></label>
          <label><span className="label">Would they pay ₹499 for the full report?</span><select className="input" value={pay} onChange={(e) => setPay(e.target.value as "yes")}><option value="yes">Yes</option><option value="maybe">Maybe</option><option value="no">No</option></select></label>
        </div>
        <label className="block"><span className="label">Notes (with consent)</span><textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => onSave({ ...s, after, reason, confAfter: conf, wouldPay: pay, notes })}>Save &quot;after&quot;</button>
          <button className="btn btn-ghost" onClick={onDelete}>Delete session</button>
        </div>
      </div>
    </details>
  );
}
