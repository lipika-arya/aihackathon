"use client";
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { lakh } from "@/lib/format";
import { SCENARIOS, type ScenarioKey, type ScenarioResult } from "@/lib/model";
import { cumulative } from "@/lib/finance";

export const SCEN_COLOR: Record<ScenarioKey, string> = {
  optimistic: "#245c4a",
  expected: "#3b82a6",
  conservative: "#b7791f",
  visaEnds: "#8a5a9e",
  returnHome: "#b5473c",
  mastersIndia: "#475569",
};

const axis = { fontSize: 11, fill: "#65716b" };
const tip = (v: number) => lakh(v);

/** Cumulative gain vs staying in India, per scenario. Crossing zero = payback. */
export function IncrementalChart({ results }: { results: Partial<Record<ScenarioKey, ScenarioResult>> }) {
  const keys = Object.keys(results) as ScenarioKey[];
  if (!keys.length) return null;
  const n = Math.ceil(results[keys[0]]!.sim.incremental.length / 12);
  const rows = Array.from({ length: n }, (_, y) => {
    const row: Record<string, number> = { year: y + 1 };
    for (const k of keys) row[k] = cumulative(results[k]!.sim.incremental)[Math.min((y + 1) * 12, results[k]!.sim.incremental.length) - 1];
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={rows} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid stroke="#e2e5df" vertical={false} />
        <XAxis dataKey="year" tick={axis} tickFormatter={(v) => `Yr ${v}`} />
        <YAxis tick={axis} tickFormatter={tip} width={70} />
        <ReferenceLine y={0} stroke="#17231f" strokeDasharray="4 4" />
        <Tooltip formatter={(v: number, k: string) => [lakh(v), SCENARIOS[k as ScenarioKey]?.label ?? k]} labelFormatter={(l) => `End of year ${l}`} />
        <Legend formatter={(k: string) => SCENARIOS[k as ScenarioKey]?.label ?? k} wrapperStyle={{ fontSize: 12 }} />
        {keys.map((k) => <Line key={k} type="monotone" dataKey={k} stroke={SCEN_COLOR[k]} strokeWidth={2} dot={false} />)}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function LoanChart({ results }: { results: Partial<Record<ScenarioKey, ScenarioResult>> }) {
  const keys = Object.keys(results) as ScenarioKey[];
  if (!keys.length) return null;
  const len = results[keys[0]]!.sim.balance.length;
  const rows = Array.from({ length: Math.ceil(len / 6) }, (_, i) => {
    const m = Math.min(i * 6, len - 1);
    const row: Record<string, number> = { m: m / 12 };
    for (const k of keys) row[k] = results[k]!.sim.balance[m];
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={rows} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid stroke="#e2e5df" vertical={false} />
        <XAxis dataKey="m" tick={axis} tickFormatter={(v) => `Yr ${Number(v).toFixed(0)}`} />
        <YAxis tick={axis} tickFormatter={tip} width={70} />
        <Tooltip formatter={(v: number, k: string) => [lakh(v), SCENARIOS[k as ScenarioKey]?.label ?? k]} labelFormatter={(l) => `Year ${Number(l).toFixed(1)}`} />
        <Legend formatter={(k: string) => SCENARIOS[k as ScenarioKey]?.label ?? k} wrapperStyle={{ fontSize: 12 }} />
        {keys.map((k) => <Area key={k} type="monotone" dataKey={k} stroke={SCEN_COLOR[k]} fill={SCEN_COLOR[k]} fillOpacity={0.06} strokeWidth={2} />)}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Yearly take-home income vs living cost + EMI for one scenario. */
export function IncomeChart({ r }: { r: ScenarioResult }) {
  const s = r.sim;
  const rows = Array.from({ length: Math.ceil(s.personal.length / 12) }, (_, y) => {
    const sl = (xs: number[]) => xs.slice(y * 12, (y + 1) * 12).reduce((a, b) => a + b, 0);
    const income = r.years[y]?.income ?? 0;
    return { year: y + 1, income, savings: sl(s.personal) };
  });
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={rows} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid stroke="#e2e5df" vertical={false} />
        <XAxis dataKey="year" tick={axis} tickFormatter={(v) => `Yr ${v}`} />
        <YAxis tick={axis} tickFormatter={tip} width={70} />
        <ReferenceLine y={0} stroke="#17231f" strokeDasharray="4 4" />
        <Tooltip formatter={(v: number, k: string) => [lakh(v), k === "income" ? "Take-home income" : "Cash left after costs and EMI"]} labelFormatter={(l) => `Year ${l}`} />
        <Legend formatter={(k: string) => (k === "income" ? "Take-home income" : "Cash left after living + EMI")} wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="income" stroke="#3b82a6" fill="#3b82a6" fillOpacity={0.08} strokeWidth={2} />
        <Area type="monotone" dataKey="savings" stroke="#245c4a" fill="#245c4a" fillOpacity={0.12} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
