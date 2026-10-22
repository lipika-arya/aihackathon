# Data audit, 22 Oct 2026

## Data standard

Only data that was read on an official source and is current is shown. Every programme, fee, rule and rate must be at least partly verified against an official page. Anything that could not be confirmed at all, was out of date for the intake, or was blocked from checking is left out, not shown with a caveat. Where an item is only partly confirmed, the app labels it and says what is missing. Tests enforce this (`src/lib/accuracy.test.ts`, "only verified and current data is shown").

## What was checked

About 470 fields across five countries and the lender file were re-opened against their cited sources on 22 Oct 2026. No figure that could be read was contradicted by its source. The UK and the 17 additional programmes were then researched from official pages, and a sample of each was re-checked independently (UK visa fee and health surcharge on gov.uk, Warwick and Imperial fees, Birmingham's international fee through its country selector, KIT, Northeastern, SFU, UTS (international view), Osaka and Schulich). None disagreed.

## Corrections made

| Issue | Change |
|---|---|
| Default loan rate was 10.24%, pulled up by unconfirmed lenders | Average mid-point of the 5 verified public-sector banks (about 9.9%), used from the first render everywhere, with its derivation shown on the ROI and methodology pages |
| Australian health cover (OSHC) missing | Country-level estimate (A$670 a year) counted in the table and the loan maths |
| Buffalo's international fee, Hitotsubashi's books, transport and insurance missing | Added |
| RMIT MBA page total differs from 2 x annual fee | Uses the page's total; marked partly verified |
| German visa fee stored as EUR 75 from a 2017 page | INR 8,300 from the mission page |
| Exchange rates shown without a margin caveat | Visible note that these are mid-market rates; banks add a margin |
| Total cost and funding gap used different bases | One reconciliation block per option; the loan processing fee is funded by the loan and counted in the gap |
| "Mandatory fees not found" shown for programmes whose total already includes them | Three states (itemised, included in the total, not found); "not found" marks the estimate Incomplete |
| UK health surcharge covers a few extra months of visa | Half a year added as a one-off visa charge |

## Added

- **UK (sixth country, GBP):** Warwick MSc CS and MBA, Southampton MSc CS, Edinburgh MSc CS and MSc Data Science, Birmingham MSc Advanced CS, MSc Data Science, MSc AI and Machine Learning and MBA, Imperial MBA. Every UK entry has an official statement of what its fee covers. Country data: student visa fee GBP 558, health surcharge GBP 776 a year, Graduate route cut to 18 months, 20-hour work rule (confirmed by the project team), maintenance funds, ONS salaries, tax, living cost.
- **More programmes elsewhere:** Northeastern, UVA, Duke Fuqua; KIT, Tuebingen, Frankfurt School; SFU Big Data, Schulich; Osaka ITSCE, Kyoto IST (an AI course filed under DS), Kyoto i-MBA; UTS Information Technology, Data Science and Innovation, MBA.

## Removed in the strict pass (could not be confirmed, or not current)

| Item | Why |
|---|---|
| Monash MDS | Fee page unreadable by any route on 22 Oct |
| JAIST, Hiroshima | Fees were for 2025-26, not the current intake; English route and programme page unconfirmed |
| IUJ MBA | Duration (21 months) and programme label not confirmed |
| UTokyo IST | Duration assumed; the fee page was for a different graduate school |
| Credila (lender) | Rate and fee page blocked; could not be read |
| India salary baseline | Source (NIRF) blocked; no verified India salary data exists in the app. The India salary is optional and is only the student's own figure: without it costs, funding gap, EMI, years to repay and the three job-abroad scenarios all work; payback, NPV and ROI against staying in India and the two return-to-India scenarios appear once a salary is entered, and the ROI part is left out of the score until then |
| Indian master's programmes | Only one of six was fully verified; removed for now. The "Master's in India" scenario is built and switched off until verified data is added |
| 5 policy items marked "not confirmed" | US social-media vetting, Germany naturalisation change and Chancenkarte, Japan visa-fee rise, Australia enrolment caps; text that cited them was edited |
| LMU fee guess (EUR 194) | Not on LMU's pages; the programme now shows mandatory fees as not found (Incomplete) |

Also left out because they could not be fully verified: Carleton MCS, UCL, Glasgow, Leeds, Cambridge Judge, LBS (2027 fee not published), Imperial MSc Computing and UCL/Birmingham Computer Science (conversion courses Indian CS graduates cannot join), Manchester, Oxford Saïd, Cranfield, Rotman, Waterloo and others (blocked pages, dynamic fee tables, or no stated year).

## Still open and limits

- **Partly verified items still shown** (labelled in the app): Concordia CS and MBA (fee year not stated in the source letter), TMU (period assumed; 12-month programme so the total is unaffected), RMIT MBA (page totals disagree), LMU (fees not found), policy items confirmed through secondary sources or only in part, and six lenders (HDFC, Axis, Auxilo, InCred, Prodigy, Avanse) whose pages gave a rate or terms but not everything.
- **Mandatory fees not found (cost shown as incomplete):** UNSW, Flinders, UQ, UBC, ESMT Berlin, Mannheim, LMU.
- **Toronto:** the source's CAD 90,050 includes the CAD 2,200 mandatory fee but does not itemise other fees or mention health insurance.
- **US:** Buffalo's living-cost figure excludes health insurance (about USD 2,300 a year); the MRV visa fee (USD 185) is not on the cited ICE page; only the CS low and median salary were re-checked against BLS.
- **UK salaries:** the MBA salary is a proxy (ONS business and public-service professionals, ages 30-39) and understates top MBA outcomes; the data science salary reuses the CS row.
- **US MBAs** publish only first-year tuition; the first-year semester rate is assumed for all semesters (as for Wharton).
- **Coverage:** Canada has no new CS programme; Japan has five programmes (one CS) after removals; Australia's additions are all UTS.
- **Tax rates** (DE 38.7%, US 21%, CA 25%, UK 19.2%) are our own estimates from official bands; the Germany OECD figure could not be read.
- **Exchange rates** are mid-market; no bank margin is applied to the numbers.
- **Master's in India scenario:** re-enable by adding `src/data/india-masters.json` with fully verified fee and placement data (schema: `IndiaProgramme` in `src/lib/types.ts`).

## Pre-merge verification (22 Oct 2026)

- Unit and regression tests, including a sample assessment (B.Tech CS, CGPA 8.5, IELTS 7, 1 year of work, Rs 10 L funds, Rs 40 L loan, Rs 10 L India salary) run through every programme: costs finite, cost table equals the optimistic scenario, funding gap = total + loan fee - own funds - loan, EMI equals the standard formula on the principal, and the loan fee equals the stated percentage.
- The same assessment through the real wizard in a browser: the India salary is optional (the wizard completes without it and the results page ranks with the ROI part left out; adding it brings back the India comparison and the two return-to-India scenarios), the ranking covers all six countries, and no console errors appear across the main pages.
- A crawl of every route on a clean production build (10 pages plus every programme page): no errors, no NaN, no placeholder text.
- Eight programme totals recomputed independently in Python from the raw data: all matched the app to the displayed precision.
- Eligibility check fixed so optional or alternative routes ("not required", "unless", "alternative route") are shown as information, not as a failure; genuine mandatory requirements still fail.
- With no India salary entered, the loan, EMI, funding gap, total cost and net position are identical to the run with a salary for the three job-abroad scenarios (tested); only the India-relative numbers differ.
- An India salary of 0 is accepted (a fresher, or unpaid family work): payback and ROI are then measured against earning nothing if the student stays. The two return-to-India scenarios assume an India income after returning, so they need a salary above 0 and are not shown at 0 (tested).
