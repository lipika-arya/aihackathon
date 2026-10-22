"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { CountryData, FxRates, LenderData } from "@/lib/types";
import { DEFAULT_ASSUMPTIONS, DEFAULT_PROFILE, type Assumptions, type Profile } from "@/lib/model";

interface Data { fx: FxRates; countries: CountryData[]; lenders: LenderData | null }
interface Ctx extends Data {
  profile: Profile;
  hasProfile: boolean;
  setProfile: (p: Profile) => void;
  assumptions: Assumptions;
  setAssumptions: (a: Assumptions) => void;
}

const C = createContext<Ctx | null>(null);

// The profile stays in this browser only (localStorage). Nothing is sent to a server.
const read = <T,>(k: string): T | null => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
};
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: keep in memory */ } };

export function DataProvider({ value, children }: { value: Data; children: React.ReactNode }) {
  const [profile, setP] = useState<Profile>(DEFAULT_PROFILE);
  const [hasProfile, setHas] = useState(false);
  const [assumptions, setA] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);

  useEffect(() => {
    const p = read<Profile>("abroadroi.profile");
    if (p) { setP({ ...DEFAULT_PROFILE, ...p }); setHas(true); }
    const a = read<Assumptions>("abroadroi.assumptions");
    if (a) setA({ ...DEFAULT_ASSUMPTIONS, ...a });
    else {
      // default loan rate = midpoint of verified INR lender ranges, if any
      const ls = value.lenders?.lenders.filter((l) => l.currency === "INR" && l.status !== "unverified" && l.rate_min != null) ?? [];
      if (ls.length) {
        const mid = ls.reduce((s, l) => s + (l.rate_min! + (l.rate_max ?? l.rate_min!)) / 2, 0) / ls.length;
        setA((x) => ({ ...x, loanRatePct: Math.round(mid * 100) / 100 }));
      }
    }
  }, [value.lenders]);

  const setProfile = (p: Profile) => { setP(p); setHas(true); write("abroadroi.profile", p); };
  const setAssumptions = (a: Assumptions) => { setA(a); write("abroadroi.assumptions", a); };

  return <C.Provider value={{ ...value, profile, hasProfile, setProfile, assumptions, setAssumptions }}>{children}</C.Provider>;
}

export function useData() {
  const c = useContext(C);
  if (!c) throw new Error("useData outside DataProvider");
  return c;
}
