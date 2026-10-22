import type { LenderData } from "./types";

export interface DefaultRate {
  rate: number; // % p.a., rounded to 2 decimals
  lenders: string[];
  asOf: string;
}

/**
 * Default loan rate shown to students: the average of the mid-points of the published rate ranges of
 * the public-sector banks whose rates were verified on the lender's own page. Private banks and NBFCs
 * are left out because most publish only a "starting from" rate or one that could not be confirmed, so
 * including them pulled the default up (an unconfirmed 11.5-15% lender alone added about 0.4 points).
 */
export function defaultLoanRate(data: LenderData | null): DefaultRate | null {
  const ls = data?.lenders.filter((l) => l.currency === "INR" && l.type === "public" && l.status === "verified" && l.rate_min != null) ?? [];
  if (!data || !ls.length) return null;
  const mid = ls.reduce((s, l) => s + (l.rate_min! + (l.rate_max ?? l.rate_min!)) / 2, 0) / ls.length;
  return { rate: Math.round(mid * 100) / 100, lenders: ls.map((l) => l.name), asOf: data.verified_at };
}
