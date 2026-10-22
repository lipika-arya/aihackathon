# Good morning: AbroadROI status

**The app is built and works locally. It is not deployed yet: deploying needs your GitHub and Vercel logins (about 10 minutes, steps below).**

## See it now (2 minutes)

The app lives in `C:\Users\chira\abroadroi`. It is not in your OneDrive hackathon folder, because the "!" in that folder's path breaks Next.js builds.

Open a terminal (in VS Code: Terminal → New Terminal) and run:

```
cd C:\Users\chira\abroadroi
npm run dev
```

Then open http://localhost:3000. To stop the app, press Ctrl+C.

## What's in it

| Page | What it does |
|---|---|
| Home | Pitch, the "same loan, five futures" idea, country overview |
| Start my assessment | 5-step form: background, course and countries, money, priorities, review |
| Results | Six picks (best overall, budget, ROI, career, lowest risk, immigration), why each scored as it did, your eligibility, five-scenario panel, ranked alternatives, priority sliders |
| Compare countries | 5 countries × 15 metrics for one course |
| Universities | 30 programmes with search, filters and sorting, each priced for you; detail page with full ROI |
| ROI calculator | Every assumption is a slider (FX rate, interest, grace period, salary growth, horizon...) |
| Loans | Calculator with all 12 outputs, A-D loan scenarios, best-fit lender picks, 14 lenders |
| Visa tracker | Risk score table, rules, recent changes labelled in effect / announced / proposed / blocked, checklists |
| Methodology | Every formula |
| Research sessions (footer link) | **Use this for your 10 user tests.** Record each person's shortlist before and after; the app calculates the shortlist-change rate (the problem statement's north-star metric). Exports to CSV. |

**Exchange rates:** live European Central Bank rates via Frankfurter, no API key needed. If the feed is down, the app uses stored rates and says so.

**Tests:** 62 automated tests pass (`npm test`). The production build passes (`npm run build`).

## The magic moment for the demo

1. Click **Start my assessment** and enter a realistic profile, e.g.:
   - B.Tech CS, CGPA 8, IELTS 7
   - MS in CS, all countries
   - ₹10 L family money, ₹50 L maximum loan, India salary ₹8 L
2. On **Results**, look at the five scenario cards. For example:
   - **University at Buffalo:** "Job abroad: debt-free in ~2 years" against "Return home: ~10 years", with "income falls short of the EMI by ₹X/month".
   - **Saarland, Germany:** debt-free in about 3 years even if the student comes home.
3. Open the **ROI calculator** and drag the interest rate or the INR rate. Everything updates live.
4. Point out that every number has a label (Verified / Estimate / Assumption) and a source link.

## Data status (researched 22 Oct 2026, official sources)

| Country | Programmes | Verified | Notes |
|---|---|---|---|
| Canada | 6 | 3 (3 partial) | Salaries: Job Bank (Ontario). I adjusted the "mid" figure to about the 25th percentile because Job Bank medians cover all experience levels. |
| Germany | 6 | 6 | Salaries come from a mirror of the official Entgeltatlas, which blocked direct access. Tax rate is 38.7% (OECD), conservative. |
| US | 6 | 6 | BLS May 2025 percentiles. The visa fee comes from a university page, because State Dept pages blocked access. |
| Japan | 6 | 2 (4 partial) | MHLW wage survey (age bands). Several fees come from the government's NIAD listing. |
| Australia | 6 | 6 | QILT: international postgraduates earn a median of AUD 65,200 vs AUD 120,000 for domestic graduates (a strong pitch fact). |
| Lenders | 14 | 9 (5 partial) | From banks' own rate pages. MPOWER says it isn't offering new 2026 loans (waitlist only), and HDFC Bank's education loan is actually a Credila loan. |

Every country × course pair (15) has 2 programmes. India salary baseline: NIRF 2025 medians (engineering ₹10 L, MBA ₹11.3 L). These figures come from top-100 institutes, so they're on the high side.

## Things you should know before presenting

- **The headline policy facts are worth quoting.** They come from official pages, as of 22 Oct 2026:
  - **US:** wage-weighted H-1B selection has been in effect since 27 Feb 2026. The $100k H-1B fee is blocked by the courts. The OPT fee rule was proposed on 8 Oct 2026, with comments due 9 Nov.
  - **Canada:** proof of funds rose to CAD 23,448 from 1 Sep 2026. Master's students at public universities no longer need a PAL/TAL from 1 Jan 2026.
  - **Australia:** the student visa fee rose to AUD 2,500 on 1 Jul 2026. Indians get 3 years of post-study work after a coursework master's.
  - **Japan:** visa and residence fees rose in July and October 2026.
- **Some items rest on secondary sources.** Each is labelled in the app (Visa tracker → each change shows its source).
- **The visa risk score is our own index** (5 weighted factors, evidence shown), not a government number. Say this if a judge asks.
- **Australia's post-study visa fee** (AUD 5,750) is counted as an upfront cost, which slightly overstates the cost if you return home.
- **Your survey link and "10+ interviews".** The ChatGPT chat shows 11 survey responses. Make sure the pitch states exactly what you did.

## Deploy (about 10 minutes, needs you)

1. **Create the repo.** Go to github.com → **+** → **New repository**. Name it `abroadroi`, make it Private, and **don't** add a README (the project already has one).
2. **Push the code.** In the terminal, run:
   ```
   cd C:\Users\chira\abroadroi
   git remote add origin https://github.com/YOUR-USERNAME/abroadroi.git
   git branch -M main
   git push -u origin main
   ```
3. **Deploy on Vercel.** On vercel.com, choose **Add New → Project** and import `abroadroi`. Keep all the defaults, then click **Deploy**. No environment variables are needed.
4. **Test it.** Open the URL Vercel gives you in an incognito window, and also try it on your phone.

If anything fails, paste the error to me.

## Known gaps (roadmap slide material)

- **Coverage:** 2 programmes per country-course pair. The architecture supports any number; add more by editing `src/data/countries/*.json`.
- **Tax:** one effective tax rate per country. Not yet modelled per state or province.
- **No accounts or saved reports:** the profile stays in the browser.
- **No AI explanation layer yet:** all numbers come from deterministic code, which is a strength to state in the pitch.
- **Security audit:** `npm audit` flags issues in components bundled with Next.js (postcss, sharp). The app doesn't use the affected image optimiser.
