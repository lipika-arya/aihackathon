// Integrity check over the real research files: every programme must run through the model
// without NaN, and unknown values must stay null rather than becoming 0.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS, DEFAULT_PROFILE, runAll, tuitionTotalLocal, visaRiskScore } from "./model";
import type { CountryData, FxRates, LenderData } from "./types";
import fb from "../data/fx-fallback.json";

const dir = path.join(__dirname, "..", "data", "countries");
const countries: CountryData[] = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
const lenders: LenderData = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "lenders.json"), "utf8"));
const fx: FxRates = { inrPer: fb.inrPerUnit as FxRates["inrPer"], date: fb.date, source: "test", live: false };

describe.each(countries.map((c) => [c.country, c] as const))("%s data", (_, c) => {
  it("has the required structure", () => {
    expect(c.programmes.length).toBeGreaterThan(0);
    expect(["USD", "EUR", "CAD", "JPY", "AUD"]).toContain(c.currency);
    const s = visaRiskScore(c);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
    for (const p of c.programmes) {
      expect(["CS", "DS", "MBA"]).toContain(p.course);
      expect(p.duration_months).toBeGreaterThan(0);
      expect(p.programme_url).toMatch(/^https?:\/\//);
      if (p.status === "verified") expect(p.tuition).not.toBeNull();
    }
  });
  it.each(c.programmes.map((p) => [p.id, p] as const))("%s runs through the model", (_, p) => {
    const india = lenders.india_baseline[p.course]?.mid ?? lenders.india_baseline.CS?.mid ?? null;
    const r = runAll({ country: c, programme: p, course: p.course, profile: { ...DEFAULT_PROFILE, maxLoan: 1e8 }, assumptions: DEFAULT_ASSUMPTIONS, fx, indiaSalary: india });
    if (tuitionTotalLocal(p) == null) return; // allowed: shows as "data unavailable"
    for (const s of Object.values(r)) {
      expect(Number.isFinite(s!.totalCostInr)).toBe(true);
      expect(s!.totalCostInr).toBeGreaterThan(0);
      expect(Number.isFinite(s!.sim.emi)).toBe(true);
      expect(s!.sim.balance.every(Number.isFinite)).toBe(true);
    }
  });
});
