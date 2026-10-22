// Shapes of the research data in src/data. Unknown values are null, never 0.

export type CountryCode = "US" | "DE" | "CA" | "JP" | "AU";
export type Course = "CS" | "DS" | "MBA";
export type Status = "verified" | "partial" | "unverified";
export type Currency = "INR" | "USD" | "EUR" | "CAD" | "JPY" | "AUD";

export const COURSES: Record<Course, string> = {
  CS: "MS in Computer Science",
  DS: "Master's in Data Science",
  MBA: "MBA",
};

export interface Sourced {
  text: string;
  source_url: string | null;
}

export interface Programme {
  id: string;
  university: string;
  city: string;
  course: Course;
  programme_name: string;
  duration_months: number;
  tuition: {
    amount: number;
    period: "total" | "year" | "semester" | "credit";
    credits_total: number | null;
    semesters?: number | null; // billed semesters when not simply duration / 6
    fee_year: string;
    source_url: string;
  } | null;
  mandatory_fees_per_year: number | null;
  // When no separate fee figure exists because the source's total already includes mandatory fees, say so here.
  // A null fee with no note means the fees were not found, so the cost estimate is incomplete.
  mandatory_fees_note?: string;
  living_cost_per_year: { amount: number; source_url: string } | null;
  requirements: {
    gpa: string | null;
    english: string | null;
    gre_gmat: string | null;
    work_experience: string | null;
  };
  scholarships: string | null;
  programme_url: string;
  status: Status;
  notes: string;
}

export interface RiskFactor {
  score: number;
  evidence: string;
}

export interface SalaryBand {
  roles: string[];
  entry_low: number | null;
  entry_mid: number | null;
  entry_high: number | null;
  basis: string;
  source_name: string;
  source_url: string;
  period: string;
}

export interface PolicyChange {
  title: string;
  status: "in_effect" | "announced" | "proposed" | "blocked";
  announced: string | null;
  effective: string | null;
  who_affected: string;
  impact: string;
  source_url: string;
  // Set when the claim could not be fully confirmed on an official page at the last check.
  check?: { level: "partial" | "unverified"; note: string };
}

export interface CountryData {
  country: CountryCode;
  name: string;
  currency: Currency;
  verified_at: string;
  programmes: Programme[];
  living_cost: {
    budget_month: number | null;
    moderate_month: number | null;
    comfortable_month: number | null;
    basis: string;
    source_url: string | null;
  };
  visa: {
    student_visa: { name: string; fees: { label: string; amount: number; currency: string }[]; source_url: string };
    proof_of_funds: Sourced;
    work_during_study: Sourced;
    post_study_work: { name: string; months_max: number | null; text: string; source_url: string };
    pr_pathway: Sourced;
    recent_changes: PolicyChange[];
  };
  risk_factors: Record<RiskKey, RiskFactor>;
  salary: Partial<Record<Course, SalaryBand | null>>;
  tax: { effective_rate: number | null; basis: string; source_url: string | null };
  // Health cover that is charged on top of tuition and living costs (e.g. Australia's OSHC). Estimate per year.
  health_insurance_per_year?: { amount: number; basis: string; source_url: string };
  checklist: string[];
}

export type RiskKey = "policy_volatility" | "psw_uncertainty" | "work_restrictions" | "funds_burden" | "recent_adverse";

export interface Lender {
  id: string;
  name: string;
  type: "public" | "private" | "nbfc" | "international";
  product: string;
  url: string;
  currency: "INR" | "USD";
  rate_min: number | null;
  rate_max: number | null;
  rate_text: string;
  fixed_or_floating: string | null;
  benchmark: string | null;
  processing_fee: string | null;
  max_amount: number | null;
  max_amount_text: string | null;
  collateral: string | null;
  co_applicant: string | null;
  margin: string | null;
  moratorium: string | null;
  moratorium_interest: string | null;
  repayment_years_max: number | null;
  prepayment: string | null;
  eligibility: string | null;
  status: Status;
  source_url: string;
  notes: string;
}

export interface IndiaBand {
  low: number;
  mid: number;
  high: number;
  basis: string;
  source_url: string;
  status?: Status; // "unverified" when the figures could not be re-checked against the source
}

export interface LenderData {
  verified_at: string;
  lenders: Lender[];
  tax_benefit: Sourced | null;
  india_baseline: Partial<Record<Course, IndiaBand | null>>;
}

export interface FxRates {
  // INR per 1 unit of each currency
  inrPer: Record<Currency, number>;
  date: string; // date the rates apply to
  source: string;
  live: boolean; // false = fallback rates, not current
}
