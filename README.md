# WorthWise

**Abroad or not? See if your loan pays off.**

WorthWise helps Indian students decide whether a master's abroad (MS in CS, Data Science or MBA in Canada, Germany, the US, the UK, Japan or Australia) is worth the money. For each programme, it shows:

- the full cost
- the education-loan repayment
- visa policy risk
- five what-if futures, each compared against staying in India (using the India salary you enter):
  - job abroad fast
  - job abroad
  - slow job search
  - work permit ends and you come home
  - you come home straight after graduating

Every figure is labelled verified, partly verified, estimate, assumption or your input, and links to its source. Only data that is at least partly verified against an official source and is current is shown (see `docs/DATA_AUDIT.md`). Nothing is calculated by an AI model: all numbers come from tested TypeScript functions.

## Run it locally

Requires Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit + data-integrity tests
npm run build      # production build
```

No environment variables or API keys are needed:
- Exchange rates come from the free [Frankfurter](https://frankfurter.dev) API (European Central Bank reference rates).
- If that API is down, the app falls back to `src/data/fx-fallback.json` and labels the rates as "not current".

## Deploy (Vercel)

1. Push this folder to a GitHub repository.
2. On vercel.com, choose **Add New → Project** and import the repo. Vercel detects Next.js; keep the defaults.
3. Click **Deploy**. No environment variables are needed.

## How it's built

| Layer | Choice | Why |
|---|---|---|
| App | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4 | One project for the UI and server; deploys to Vercel with no setup |
| Charts | Recharts | Lightweight, responsive |
| Calculations | `src/lib/finance.ts`, `model.ts`, `recommend.ts` | Pure functions, unit-tested, no AI |
| Data | JSON files in `src/data` | Version-controlled, reviewable in pull requests; easy to move to Postgres later |
| FX | `src/lib/data.ts` | Live rates cached for 24 hours, with a stored fallback |
| Profile | Browser localStorage | The student's financial details never leave their device |

```
src/
  app/            pages: / assess results compare universities [id] roi loans visa methodology
  components/     DataProvider (data + profile state), ScenarioPanel, Charts, ui
  lib/
    finance.ts    EMI, NPV, IRR, payback, month-by-month loan simulation
    model.ts      costs, 5 scenarios, visa risk score, assumptions
    recommend.ts  eligibility checks, scoring, six picks, profile labels
    *.test.ts     vitest
  data/
    countries/{CA,DE,US,JP,AU}.json   programmes, living costs, visa, salary, tax, risk factors
    lenders.json                      Indian + international education lenders
    fx-fallback.json
docs/PROJECT.md   requirements, architecture, data model, methodology, roadmap
```

## Updating data

Edit the JSON in `src/data` and run `npm test`. The data-integrity test checks that every programme still runs through the model. Rules for editing:
- Never type a number you didn't read on the cited page.
- Use `null` for anything you don't know.
- Set `status` honestly: `verified`, `partial` or `unverified`.

## Known limitations

- **Coverage:** a curated sample of programmes, not every university.
- **Tax:** one effective tax rate per country (an estimate).
- **Salaries:** some sources cover all experience levels, which is noted in each file.
- **No predictions:** admission, visa and job outcomes are not predicted.
- **Visa risk score:** our own comparative index, not an official statistic.
- **No accounts:** profiles are saved in the browser only, with no logins and no server storage.
- **Security audit:** `npm audit` reports advisories in `postcss` and `sharp`, which are bundled inside Next.js. The app doesn't use Next's image optimiser. Upgrade Next.js when a patched release is available.
