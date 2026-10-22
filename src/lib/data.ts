import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { CountryData, FxRates, IndiaData, LenderData } from "./types";
import fallback from "@/data/fx-fallback.json";

const DATA = path.join(process.cwd(), "src", "data");
const ORDER = ["CA", "DE", "US", "UK", "JP", "AU"];

/** Reads every country file that exists. A missing or broken file is skipped, never invented. */
export function loadCountries(): CountryData[] {
  const dir = path.join(DATA, "countries");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => {
      try {
        return [JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as CountryData];
      } catch (e) {
        console.error(`[data] could not read ${f}:`, e);
        return [];
      }
    })
    .sort((a, b) => ORDER.indexOf(a.country) - ORDER.indexOf(b.country));
}

export function loadLenders(): LenderData | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, "lenders.json"), "utf8")) as LenderData;
  } catch {
    return null;
  }
}

/** Master's programmes in India for the "do it in India instead" scenario. Missing file = scenario simply not shown. */
export function loadIndiaMasters(): IndiaData | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, "india-masters.json"), "utf8")) as IndiaData;
  } catch {
    return null;
  }
}

const fallbackRates = (): FxRates => ({
  inrPer: fallback.inrPerUnit as FxRates["inrPer"],
  date: fallback.date,
  source: fallback.source,
  live: false,
});

/** Live ECB reference rates via Frankfurter, cached for a day. Falls back to the stored rates, clearly marked as not current. */
export async function loadFx(): Promise<FxRates> {
  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=INR&symbols=USD,EUR,CAD,AUD,JPY,GBP", {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = (await res.json()) as { date: string; rates: Record<string, number> };
    const inrPer = { INR: 1 } as FxRates["inrPer"];
    for (const [k, v] of Object.entries(j.rates)) inrPer[k as keyof FxRates["inrPer"]] = 1 / v;
    if (Object.keys(inrPer).length < 7) throw new Error("missing currencies");
    return { inrPer, date: j.date, source: "European Central Bank reference rates via Frankfurter (api.frankfurter.dev)", live: true };
  } catch (e) {
    console.error("[fx] live rates unavailable, using stored rates:", e);
    return fallbackRates();
  }
}
