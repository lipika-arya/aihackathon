const inrFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** ₹25,00,000 style. */
export const inr = (n: number | null | undefined) => (n == null || !isFinite(n) ? "n/a" : (n < 0 ? "-₹" : "₹") + inrFmt.format(Math.abs(Math.round(n))));

/** ₹25.0 L / ₹1.2 Cr for headlines. */
export const lakh = (n: number | null | undefined) => {
  if (n == null || !isFinite(n)) return "n/a";
  const a = Math.abs(n), s = n < 0 ? "-" : "";
  return a >= 1e7 ? `${s}₹${(a / 1e7).toFixed(2)} Cr` : `${s}₹${(a / 1e5).toFixed(1)} L`;
};

export const local = (n: number | null | undefined, cur: string) =>
  n == null || !isFinite(n) ? "n/a" : new Intl.NumberFormat("en", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);

export const pct = (n: number | null | undefined, d = 0) => (n == null || !isFinite(n) ? "n/a" : `${n.toFixed(d)}%`);

export const yrs = (n: number | null | undefined) => (n == null ? "Not within horizon" : `${n.toFixed(1)} yrs`);
