"use client";
import { DEFAULT_WEIGHTS, type Weights } from "@/lib/model";

const W_LABELS: Record<keyof Weights, string> = {
  roi: "Financial return (ROI)",
  employment: "Job and salary prospects",
  affordability: "Low cost / low debt",
  visa: "Low visa policy risk",
  fit: "Academic and career fit",
};

export function WeightsEditor({ w, onChange }: { w: Weights; onChange: (w: Weights) => void }) {
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  return (
    <div>
      <span className="label">What matters most? Move the sliders. Weights are relative (they don&apos;t need to add up to 100).</span>
      <div className="mt-2 space-y-3">
        {(Object.keys(W_LABELS) as (keyof Weights)[]).map((k) => (
          <div key={k} className="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[220px_1fr_60px]">
            <span className="text-sm">{W_LABELS[k]}</span>
            <input type="range" min={0} max={50} value={w[k]} onChange={(e) => onChange({ ...w, [k]: Number(e.target.value) })} className="col-span-2 accent-[#245c4a] sm:col-span-1" aria-label={W_LABELS[k]} />
            <span className="num hidden text-right text-sm text-slate sm:block">{total ? Math.round((w[k] / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
      <button type="button" className="mt-2 text-xs text-forest underline" onClick={() => onChange(DEFAULT_WEIGHTS)}>Reset to default weights</button>
    </div>
  );
}
