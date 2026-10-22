# AbroadROI: Project document

Covers the deliverables requested in the project brief: product requirements, architecture, data model, research plan, financial specification, recommendation method, wireframes (as built), roadmap and deployment. The formulas behind every number are also on the in-app page `/methodology`.

## 1. Product requirements

**Problem.** Indian graduates take ₹30-60 lakh+ loans for a master's abroad without one neutral place that combines:
- total cost
- loan repayment
- realistic salary
- visa and work-permit risk
- the alternative of staying in India

Agents and platforms may earn commissions. Loan calculators only show EMI.

**Users.** Indian graduates aged 21-26 and their families, considering:
- **Courses:** an MS in CS, a Master's in Data Science, or an MBA.
- **Countries:** Canada, Germany, the US, Japan or Australia.

**Core question.** Given my profile, budget, loan, goals and visa risk, which country and course gives me the best return, and what happens if things go wrong?

**Magic moment.** For the student's own loan, side by side:
- "Job abroad: debt-free in X years"
- "Back home: debt-free in Y years"
- how long until the degree beats staying in India

**Success criteria for the MVP**
- Assessment to results in under 3 minutes, without an account.
- All 15 country × course combinations are covered by at least one programme with official source links (see the data status table in MORNING.md).
- Every external figure shows its source and verification state.
- Missing data shows as "Data unavailable", never as 0.
- Core finance functions have unit tests, and the whole dataset passes the integrity test.

**Validation plan (problem statement).**
- Run 10 student/parent sessions.
- Record each person's shortlist before and after using AbroadROI.
- North-star metric: % who change their shortlist.
- Also measure trust in sources, clarity of assumptions, and willingness to pay ₹499 for a full report (measured by behaviour, not stated intent).

**Business model (hypotheses to test).**
- Free comparison.
- ₹499 full report.
- College career cells at ₹50k-1L per year.
- No university or lender commissions, ever.

## 2. Architecture

```
Browser (React client components)
  ├─ DataProvider: research data + FX (from server) + profile/assumptions (localStorage)
  ├─ lib/model.ts + lib/recommend.ts run in the browser → instant recalculation on every slider move
Next.js server (Vercel)
  ├─ layout.tsx loads src/data/*.json (fs) and live FX (Frankfurter, cached 24h, stored fallback)
  └─ pages are statically pre-rendered and revalidated daily
```

Design decisions:
- **No database for the MVP.** Research data is small, changes rarely, and benefits from git review (who changed which fee, and when). The JSON schema maps one-to-one to Postgres tables if the dataset grows (section 3).
- **No backend for profiles.** The student's finances stay in their browser. There are no accounts, so there is no password storage or personal-data liability.
- **No AI in the numbers.** All calculations are deterministic TypeScript. If an LLM explanation layer is added later, it receives the computed results and may only explain them.
- **Next.js over a separate FastAPI service.** The model is light enough to run client-side. One codebase deploys in one step.

## 3. Data model

Current JSON (`src/lib/types.ts`), with the equivalent future SQL tables:

| JSON | Future table(s) | Key fields |
|---|---|---|
| `countries/XX.json` root | `countries`, `currencies` | code, name, currency, verified_at |
| `programmes[]` | `universities`, `programs`, `program_fees`, `admission_requirements`, `scholarships` | tuition {amount, period, credits_total, semesters, fee_year, source_url}, duration, fees, living, requirements, status |
| `living_cost` | `living_costs` | budget / moderate / comfortable per month, basis, source |
| `visa` | `visa_policies`, `visa_policy_changes` | student visa fees, proof of funds, work rights, post-study work (months_max), PR, recent_changes {status, announced, effective, impact, source} |
| `risk_factors` | `visa_risk_assessments` (versioned) | 5 factors × {score, evidence} |
| `salary` | `salary_benchmarks` | per course: roles, entry low/mid/high, basis, source, period |
| `tax` | `tax_assumptions` | effective_rate, basis, source |
| `lenders.json` | `loan_providers`, `loan_products`, `loan_terms` | rate min/max, benchmark, collateral, moratorium, repayment years, status |
| `fx-fallback.json` + live | `exchange_rates` (history) | INR per unit, date, source, live flag |
| browser | `student_profiles`, `roi_scenarios`, `saved_comparisons` | only if accounts are added |

Rules:
- Unknown = `null`.
- Every material value carries a source URL and a verification date.
- `status` is one of `verified`, `partial` or `unverified`.

## 4. Research plan

- **Sources used:**
  - Universities: their official fee and programme pages.
  - Immigration: government sites (IRCC, USCIS/ICE/DHS, Home Affairs, German missions/BAMF, MOFA/ISA).
  - Salaries: labour statistics (BLS OEWS, Job Bank, Entgeltatlas, MHLW wage survey, QILT GOS).
  - Lenders: banks' own rate pages.
  - India baseline: NIRF 2025 institute data.
- **How it was gathered (22 Oct 2026):** one research agent per country plus one for lenders. Agents were instructed to record only values read on the cited page, and to use null otherwise. Each agent's report of conflicts and secondary sources is summarised in MORNING.md.
- **Limits of automation:** some official sites block automated reading (travel.state.gov, Entgeltatlas, some university pages). Those values come from the best available alternative and are labelled.
- **Refresh targets:**
  - FX: daily (automatic).
  - Visa policy: weekly manual check.
  - Lender rates: monthly.
  - Tuition: before each intake.
  - Salary: when new official releases come out.

## 5. Financial specification

See `/methodology` in the app and `src/lib/finance.ts` / `model.ts`. Summary:

- **Total cost:** tuition (by period) + fees + living × months + visa fees + flights + tests + deposit, converted to INR month by month at a planning rate that can drift.
- **Loan drawing:** own funds are used first. The loan draws as fees fall due, up to the student's cap. Anything beyond that is a flagged funding gap.
- **Interest before repayment:** simple interest during study and the grace period, either paid monthly or added to the principal.
- **EMI:** standard amortising formula.
- **Fastest payoff:** the EMI, or all spare income if that's larger.
- **Five scenarios** (section 6 of `/methodology`).
- **Personal cash flow** and **economic cash flow** (financing excluded) are tracked separately, each minus the India path = incremental cash flow.
- **ROI** = Σ incremental / investment. **NPV** at 8% (editable). **IRR** by bisection (otherwise "not meaningfully calculable"). **Payback** = first month cumulative ≥ 0 (otherwise "not within horizon").

## 6. Recommendation method

- **Components (each normalised 0-100 across the options shown):** ROI (NPV), employment (salary in INR plus post-study work length), affordability (cost, penalised if there's a funding gap), visa (100 − risk), fit (eligibility checks).
- **Weights:** the default is 25/20/20/15/10; the student can change them.
- **Six picks:** best overall, budget, ROI, career, lowest financial risk (return-home position after 5 years) and immigration-sensitive.
- **Exclusions:** options with a funding gap or an unmet published requirement are excluded from the picks when a fundable option exists, and are always flagged.
- **Eligibility:** only parsed where the published requirement is machine-readable (IELTS band, years of experience). Everything else shows "Unable to assess".
- **University quality/ranking:** not scored, because there is no licensed, verified ranking source.

## 7. Screens (as built)

| Route | What it does |
|---|---|
| `/` | Hero, the five futures, country overview, data freshness |
| `/assess` | 5-step questionnaire with progress bar, validation, save-and-continue, review and missing-info warnings |
| `/results` | Profile labels, six picks, why-this-score table, eligibility, five-scenario panel, ranked alternatives, priority sliders, questions to ask before borrowing |
| `/compare` | 5 countries × 15 metrics for one course |
| `/universities` | Search, filters and sorts; cards priced for the student |
| `/universities/[id]` | Programme details, requirements, eligibility, salary, visa, full ROI projection |
| `/roi` | Every assumption as a slider, with charts and a year table |
| `/loans` | 12-output repayment calculator, A-D loan scenarios, lender fit, full lender table |
| `/visa` | Risk score table, per-country rules, recent changes (in effect / announced / proposed / blocked), checklists |
| `/methodology` | Every formula, label and limit |

## 8. Roadmap (after the hackathon)

1. Run the 10-user validation and record shortlist changes (add a simple before/after capture page).
2. Expand to 5-10 programmes per country × course, with a CSV import and an admin review workflow.
3. City-level living costs; per-country tax calculators (federal + state/province).
4. Move the data to Postgres (Supabase) with versioned visa-risk assessments and FX history.
5. Optional accounts: saved scenarios, PDF parent summary, data export and deletion.
6. Scheduled checks of official policy pages, with diff alerts for a human reviewer.
7. Grounded LLM explanation layer (explains computed numbers only).

## 9. Deployment

See README. Vercel and GitHub, no environment variables. `next.config.ts` includes `src/data` in the server bundle so the research files ship with the app.
