"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CountryData, FxRates, LenderData } from "@/lib/types";
import { DEFAULT_ASSUMPTIONS, DEFAULT_PROFILE, type Assumptions, type Profile } from "@/lib/model";
import { defaultLoanRate, type DefaultRate } from "@/lib/rate";

interface Data { fx: FxRates; countries: CountryData[]; lenders: LenderData | null }
interface Ctx extends Data {
  profile: Profile;
  hasProfile: boolean;
  setProfile: (p: Profile) => void;
  assumptions: Assumptions;
  setAssumptions: (a: Assumptions) => void;
  rateBasis: DefaultRate | null; // where the default loan rate comes from
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
  const rateBasis = useMemo(() => defaultLoanRate(value.lenders), [value.lenders]);

  useEffect(() => {
    const p = read<Profile>("abroadroi.profile");
    if (p) { setP({ ...DEFAULT_PROFILE, ...p }); setHas(true); }
    // v2: settings saved before the default loan rate was corrected are ignored rather than carried over.
    const a = read<Assumptions>("abroadroi.assumptions.v2");
    if (a) setA({ ...DEFAULT_ASSUMPTIONS, ...a });
    else if (rateBasis) setA((x) => ({ ...x, loanRatePct: rateBasis.rate }));
  }, [rateBasis]);

  const setProfile = (p: Profile) => { setP(p); setHas(true); write("abroadroi.profile", p); };
  const setAssumptions = (a: Assumptions) => { setA(a); write("abroadroi.assumptions.v2", a); };

  return <C.Provider value={{ ...value, profile, hasProfile, setProfile, assumptions, setAssumptions, rateBasis }}>{children}</C.Provider>;
}

export function useData() {
  const c = useContext(C);
  if (!c) throw new Error("useData outside DataProvider");
  return c;
}
