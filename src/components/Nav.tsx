"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  ["/compare", "Compare countries"],
  ["/universities", "Universities"],
  ["/roi", "ROI calculator"],
  ["/loans", "Loans"],
  ["/visa", "Visa tracker"],
  ["/methodology", "Methodology"],
] as const;

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ivory/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-extrabold tracking-tight" style={{ fontFamily: "var(--font-manrope)" }}>
          Worth<span className="text-forest">Wise</span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map(([h, l]) => (
            <Link key={h} href={h} className={`rounded-lg px-3 py-1.5 text-sm ${path.startsWith(h) ? "bg-forest-soft font-semibold text-forest" : "text-slate hover:text-ink"}`}>{l}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/assess" className="btn btn-primary !py-2 text-sm">Start my assessment</Link>
          <button className="btn btn-ghost !px-3 !py-2 lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>☰</button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-line px-4 py-2 lg:hidden">
          {LINKS.map(([h, l]) => (
            <Link key={h} href={h} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2 text-sm">{l}</Link>
          ))}
        </nav>
      )}
    </header>
  );
}
