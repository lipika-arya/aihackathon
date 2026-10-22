import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { loadCountries, loadFx, loadIndiaMasters, loadLenders } from "@/lib/data";
import { DataProvider } from "@/components/DataProvider";
import { Nav } from "@/components/Nav";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WorthWise | Will your study-abroad loan pay off?",
  description: "Compare the full cost, loan repayment, salary and visa risk of a master's in Canada, Germany, the US, the UK, Japan or Australia against staying in India.",
};

export const revalidate = 86400;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [fx, countries, lenders, india] = [await loadFx(), loadCountries(), loadLenders(), loadIndiaMasters()];
  return (
    <html lang="en">
      <body className={`${inter.variable} ${manrope.variable} antialiased min-h-screen`}>
        <DataProvider value={{ fx, countries, lenders, india }}>
          <Nav />
          <main className="mx-auto max-w-6xl px-4 pb-20 pt-6">{children}</main>
          <footer className="border-t border-line py-8 text-center text-xs text-slate">
            WorthWise is decision support, not financial, admissions or immigration advice. No university or lender pays us.
            Final eligibility is decided by the university, bank and government authority.
            <div className="mt-2"><a href="/methodology" className="underline">Methodology</a> · <a href="/research" className="underline">Research sessions</a></div>
          </footer>
        </DataProvider>
      </body>
    </html>
  );
}
