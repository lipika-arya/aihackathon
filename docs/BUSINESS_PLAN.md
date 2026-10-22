# WorthWise: business plan

**One line:** the neutral "will my loan pay off?" tool for Indian students. Free for students; paid for by the people who need a trusted answer; never by universities or lenders deciding the ranking.

> Status of every number below: **sourced** (with link), **from our own data** (measured in the product), or **assumption** (marked, not measured). Nothing here is a forecast of real revenue or users.

---

## 1. The problem

Indian graduates and their parents borrow a large sum for a master's abroad, and the decision is made with three kinds of information, none of which answers the real question:

| Today they use | Why it fails |
|---|---|
| Agents and recruitment platforms | Typically paid by universities or lenders, so advice can be biased |
| Loan and EMI calculators | Show the monthly payment only: not the total cost, the visa risk or the alternative of staying in India |
| Reddit and forums | Stories, not numbers; one post says the "return home and repay on an India salary" case is the one nobody models |

**The question nobody answers:** *if I borrow this much, what happens to my repayment if the job or the visa does not work out?*

Evidence we have (all from our research brief and data, not from user research):
- In a scrape of 40 Reddit items, 18 matched this problem (Apify Reddit scrape, 21 Oct 2026).
- Real voices: an Indian MS graduate losing STEM OPT, "Repaying that loan on an India salary feels almost impossible." (r/f1visa); a Fall 2027 applicant asking whether a US Master's in Finance is still worth the financial risk (r/gradadmissions).
- In our own data, an MS in CS costs between **₹25.0 L (Saarland, Germany)** and **₹1.48 Cr (UNSW, Australia)** in total, so the choice swings by ₹1.2 Cr.

## 2. Who it is for

- **Primary (pays in stage 1):** Indian graduates aged 21 to 26 and their parents, comparing an MS in CS, a Master's in Data Science or an MBA across six countries.
- **Secondary (pays in stage 2):** college career cells, placement offices and coaching or counselling institutes, who want a neutral tool they can put in front of students.
- **Market size (one sourced number only):** **363,019** Indian students were in the United States in 2024/25, India's top-source position, up about 10% ([IIE Open Doors 2025](https://www.iie.org/news/open-doors-2025-press-release/)). That counts students already enrolled in one country, so it is an upper-bound proxy, not the number deciding in any year. We have not sized the rest of the market and will not quote a figure we have not checked.

## 3. The product (what exists today)

Live at aihackathon-three.vercel.app. All of this is built, deployed and tested (207 automated tests):

- **49 programmes** (44 fully verified, 5 partly verified) across **6 countries** (Canada, Germany, US, UK, Japan, Australia) and 3 courses.
- **Five what-if futures per programme:** job abroad fast, job abroad, slow job search, work permit ends, return home. The return-home case is the differentiator.
- **Total cost to funding gap to EMI**, with the working shown line by line and a default loan rate derived from five verified public-sector banks (9.9%).
- **Every figure is labelled** Verified, Partly verified, Estimate, Assumption or Your input, with a source link and verified date.
- **Neutral by construction:** no commissions from universities or lenders; no accounts; the student's data stays in their browser; no AI model calculates anything (numbers come from tested code).
- **A documented data standard:** items we could not confirm were removed, not hidden behind caveats (`docs/DATA_AUDIT.md`).

## 4. Business model

**Principle:** whoever pays must not be able to change the answer. So revenue comes from the people who *use* the answer, never from those who are *ranked* by it.

| Stage | Who pays | Offer | Price (hypothesis) |
|---|---|---|---|
| **1. Now to 3 months** | Students and parents | Free comparison and scenarios. Paid **Decision Report**: ranked shortlist, scenario table, loan comparison, source list, one-page parent summary, valid for 90 days | **₹499 one-time** |
| **2. 3 to 9 months** | Colleges, career cells, counsellors | Institutional licence: white-label embed, aggregate and privacy-safe view of what their students shortlist, quarterly data refresh | **₹50,000 to ₹1,00,000 per institution per year** |
| **3. 9 to 18 months** | Fintechs and banks that need verified data | Verified-data API on a flat subscription (never per lead, never changing a ranking) | To be tested; no price set |

**Why ₹499:** it is under 0.01% of a ₹30 to 60 L loan, so a parent will not weigh it against the stake; it is one-time, so there is no subscription friction. The price is a hypothesis; willingness to pay is tested by behaviour (clicks on a "Get the report" button), not by asking.

**Hard lines (published, part of the brand):**
1. No pay-to-rank or sponsored placement.
2. No per-lead commission from lenders or universities.
3. No selling or sharing student data.
4. Lender referral fees are **not** in the first 12 months. If ever added: a published policy change, a flat disclosed fee after the student has chosen, and zero effect on ranking.

### Illustrative Year-1 revenue (ASSUMPTIONS: none of these is measured)

| Line | Assumption | Result |
|---|---|---|
| Decision Reports | 20,000 assessments × 3% buy × ₹499 | about ₹3.0 L |
| Institution licences | 8 institutions × ₹75,000 | ₹6.0 L |
| **Total** | | **about ₹9 L** |

This shows the *shape* of the business (a small consumer line that proves demand, and an institutional line that is the real revenue), not a forecast. Every input is replaced by a measured number during the validation plan below.

**Costs:** hosting is near zero on the current setup. The real cost is data upkeep: re-verifying about 50 programmes quarterly and policy items monthly (the plan; one full audit so far), plus founder time. This cost is also the moat (section 7).

## 5. Go-to-market

1. **Prove the value with real people (weeks 1 to 2):** 10 student or parent sessions using the built-in `/research` page. Record each person's shortlist before and after; the north-star metric is the share who change their shortlist.
2. **Reach students where they already ask the question:** Reddit communities (r/f1visa, r/gradadmissions, r/studyAbroad), YouTube explainers on "what if the visa fails", and parent WhatsApp groups. Content leads with a real calculation, not an advert.
3. **Open the institutional door with a free pilot:** offer 2 to 3 college career cells a 3-month pilot (their students use it, they see aggregate anonymised results), then convert to the annual licence.
4. **Earn trust publicly:** publish the data standard, the audit and the list of what we removed. Neutrality is the product.

## 6. Competition and positioning

We position against *approaches*, not named companies, because we have not verified competitors' models or prices:

| Approach | What they do well | Where WorthWise differs |
|---|---|---|
| Agents and recruitment platforms | Admissions help, application support | We do not earn from the outcome of the choice |
| EMI and loan calculators | Quick monthly payment | We show total cost, funding gap, visa-fail and return-home scenarios |
| General AI chat | Fluent explanations | It cannot show sourced, dated, reproducible numbers; ours come from tested code with source links and verified dates |
| Forums | Real experiences | We turn the question into numbers for the student's own loan |

## 7. Moat (honest version)

The calculator itself is copyable. What is hard to copy:
- **A verified, versioned, dated dataset**, with a git history of who changed which fee and when, and a standing rule to remove what we cannot confirm.
- **Neutrality as a brand**, which a commission-funded competitor cannot claim.
- **The return-home scenario engine**, tested end to end.
- **Institutional relationships** once career cells use it (stage 2).

The moat is trust plus upkeep, which is also why it is expensive. The plan funds it from stage 2.

## 8. Validation plan and targets (goals, not results)

| What we test | How | Target to aim for |
|---|---|---|
| Does the analysis change decisions? | 10 sessions; shortlist before and after (`/research`) | at least 4 of 10 change their shortlist |
| Will people pay? | Fake-door "Get the ₹499 Decision Report" button; count clicks | at least 2 of 10 click to buy |
| Will institutions engage? | 2 to 3 career-cell conversations offering a free pilot | at least 1 agrees to a pilot |
| Do they trust the numbers? | Ask which figure they would check first; note it | no "I don't trust this" without a reason we can fix |

Today's real evidence of user demand: **a few informal conversations (fewer than 10 people)**. Say exactly that.

## 9. Risks and answers

| Risk | Answer |
|---|---|
| Rules and fees change | Every item shows a verified date; the plan is to re-check policy items monthly and fees quarterly (one full audit done so far, 22 Oct 2026); anything unconfirmed is removed, not shown |
| Seen as financial advice | Decision support only; no guarantees of admission, a visa, a job or a return; disclaimers on every page |
| Data upkeep cost | Start with 3 courses × 6 countries; fund upkeep from stage 2 licences; automate change monitoring later |
| Student acquisition is expensive | Organic channels first; the institutional route reaches students through their college |
| Neutrality erodes under revenue pressure | The hard lines are published; referral fees are excluded for 12 months |
| Privacy | No accounts; the student's finances stay in the browser; reports can be generated client-side |

## 10. 90-day roadmap

| When | Product | Business |
|---|---|---|
| Weeks 1 to 2 | Add the "Get the Decision Report" button as a fake door; record sessions in `/research` | 10 sessions; 2 to 3 career-cell conversations |
| Weeks 3 to 6 | Build the printable Decision Report (parent summary, scenarios, loan comparison, sources) | Decide the price from measured clicks and feedback |
| Weeks 7 to 10 | Verify and add Indian master's programmes so the "master's in India" scenario can be switched on | Run 1 to 2 free college pilots |
| Weeks 11 to 13 | Quarterly data re-verification routine; change monitoring | Convert pilots to licences; set stage-3 conversations |

## 11. What we need

- Two or three **college career cells** willing to pilot.
- **Feedback** from students and parents who are actually deciding.
- **Data partners** who will confirm fees and rules on their own pages (free; improves the dataset).

---

### Sources and caveats
- Market proxy: IIE, *Open Doors 2025 press release* (363,019 Indian students in the US, 2024/25). https://www.iie.org/news/open-doors-2025-press-release/
- Reddit evidence and quotes: our research brief ("Is study abroad worth it? MVP Scope", Oct 2026), from Apify Reddit scrapes.
- All product figures: `docs/DATA_AUDIT.md` and the live app.
- The prices, the 3% conversion, the 20,000 assessments and the 8 institutions are **assumptions to be replaced by measurements**.
