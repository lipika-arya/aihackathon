# WorthWise: 5-minute pitch and live demo

Audience: hackathon judges. Length: 5:00. Live site: **https://aihackathon-three.vercel.app** (all numbers below were read from it on 22 Oct 2026 with the sample student).

---

## 0. The sample student (use this exact profile)

B.Tech CS, CGPA 8.5, IELTS 7, 1 year of work experience, ₹10 L family funds, ₹40 L maximum loan, 10-year repayment, expects ₹10 L if they stay in India. Courses: MS in CS. Countries: all six.

### Preload it in one paste (no code change)
Open the live site, press F12, open the Console, paste this, press Enter. It loads the student and opens the results page:

```js
localStorage.clear(); localStorage.setItem('abroadroi.profile', JSON.stringify({qualification:'B.Tech / B.E.',specialization:'Computer Science',cgpa:8.5,ielts:7,workYears:1,courses:['CS'],countries:['US','DE','CA','UK','JP','AU'],familyFunds:1000000,savings:0,scholarship:0,maxLoan:4000000,indiaSalary:1000000,repaymentYears:10})); location.href='/results';
```

(To start from a blank browser instead, run `localStorage.clear(); location.href='/assess'`.)

---

## 1. Timed script

| Time | Slide | What you say (plain words) |
|---|---|---|
| **0:00 to 0:30** | 1. Hook | "A student borrows ₹40 lakh for a master's abroad. One Indian graduate who lost his work permit wrote: *'Repaying that loan on an India salary feels almost impossible.'* Every tool shows the monthly payment. Nobody shows what happens if the job or the visa does not work out." |
| **0:30 to 1:15** | 2. Problem | "Parents and students decide using agents who may be paid by universities or lenders, EMI calculators that show only the monthly payment, and Reddit threads. In a scrape of 40 Reddit posts, 18 were about exactly this problem. And the stakes are huge: for an MS in CS, total cost in our data runs from ₹25 lakh in Germany to ₹1.48 crore in Australia. India alone sent 363,019 students to the US last year." |
| **1:15 to 1:45** | 3. Solution | "WorthWise answers one question: *will my loan pay off, and what if it does not?* For your own loan it shows five futures, from a fast job abroad to coming straight home, the total cost, your funding gap, and every number is labelled verified or partly verified with its source." |
| **1:45 to 3:15** | 4. LIVE DEMO | See section 2. |
| **3:15 to 4:00** | 5. Business model | "Free for students. Parents can buy a ₹499 Decision Report: a ranked shortlist, scenarios and a one-page summary for the family. The real revenue is colleges and counsellors: a ₹50,000 to ₹1 lakh yearly licence for career cells. And our hard line: **no commissions from universities or lenders, no pay-to-rank, ever.** Neutrality is the product." |
| **4:00 to 4:40** | 6. Honest traction | "Where we are: the product is live, six countries, 49 programmes, 207 tests, and an audit where we removed everything we could not verify. We have spoken informally with fewer than ten students and parents. **[Say what they actually said.]** Next two weeks: ten recorded sessions, measuring how many change their shortlist." |
| **4:40 to 5:00** | 7. Ask | "We are looking for two or three college career cells to pilot it, feedback from students deciding right now, and data partners who will confirm fees on their own pages." |

---

## 2. The live demo (about 90 seconds)

Have the sample student preloaded (section 0). Tabs open in this order: Results, Toronto, Methodology.

1. **Results page** (`/results`), 15 seconds. "16 MS-in-CS programmes across six countries, ranked for this student." Point at Saarland: **₹25.0 L total, EMI ₹23,052, no funding gap.** Point at the US and UK rows with **Funding gap** flags. "It tells you straight away what you cannot afford."
2. **Toronto** (`/universities/utoronto-mscac-cs`), 30 seconds. Scroll to *Your ROI projection*. "Same loan, five futures. If the job works out: **debt-free in 2.5 years. If the work permit ends: still 2.5. If they come straight home: 7.9 years, and the EMI eats 76% of take-home pay.** That last case is the one nobody models."
3. **Funding-gap working**, 20 seconds. "Here is the arithmetic: base cost **₹86,64,338**, plus a tuition rise and exchange-rate drift **₹77,860**, plus the loan fee **₹40,000**, equals **₹87,82,198** you need. Less your **₹10 L** and the **₹40 L** loan: a **₹37,82,198 gap.** No black box."
4. **A source and a label**, 10 seconds. Click a *Source* link on the cost table. "Every figure links to the official page. Anything we could only partly confirm says so."
5. **Methodology** (`/methodology`), 15 seconds. "Our data standard: only what we could verify on an official page and that is current. We *removed* programmes we could not confirm rather than hide them behind a caveat."

**If you have time:** open the ROI calculator and drag the interest rate: "everything recalculates live."

**Numbers to remember (all from the live site):** Saarland ₹25.0 L, EMI ₹23,052 · Toronto ₹86.6 L, EMI ₹61,039 at 9.9% · Toronto gap ₹37,82,198 · return-home 7.9 years, 76% of take-home · 16 programmes ranked · default loan rate 9.9% (average of five verified public-sector banks).

---

## 3. Questions judges may ask

| Question | Honest answer |
|---|---|
| **How do you make money if you take no commissions?** | Students use it free. Parents can buy a ₹499 report. Colleges and counsellors pay a yearly licence because they need a neutral tool. Lenders and universities cannot pay to be ranked. |
| **Why should I trust your numbers?** | Every figure comes from tested code, links to an official source with a verified date, and is labelled Verified or Partly verified. We re-checked about 470 fields against their sources and found none contradicted; anything we could not confirm was removed. The method is on the Methodology page. |
| **What if visa rules or fees change?** | Each item shows when it was verified. Our plan is to re-check policy items monthly and fees quarterly (today we have done one full audit, on 22 Oct 2026). If we cannot confirm something we remove it. That upkeep is a real cost, and the reason we charge institutions. |
| **Why not just ask ChatGPT?** | It can write a fluent answer, but it cannot give sourced, dated, reproducible numbers for your own loan. Ours are calculated by code, with the working shown. |
| **Isn't this financial advice?** | No. It is decision support. It never guarantees admission, a visa, a job or a return, and says so on every page. |
| **Who are your competitors?** | Agents and recruitment platforms (often paid by universities or lenders), loan calculators (EMI only) and forums (anecdotes). We differ by being unpaid by the people we rank and by showing the downside case. *(Do not name or characterise specific companies' businesses.)* |
| **What are your real users and revenue?** | No revenue yet. We have spoken informally with fewer than ten students and parents; the next step is ten recorded sessions. |
| **What is the biggest risk?** | Data going stale, and neutrality eroding under revenue pressure. We answer the first with dated, removable data and the second with published hard lines. |
| **Why is the UK MBA ROI low, or why do some programmes show 'cost incomplete'?** | We show what we can verify. UK MBA salary uses a general official proxy that understates top MBAs; programmes whose mandatory fees we could not find are flagged Incomplete instead of guessed. |
| **What is the 'master's in India' option?** | Built, switched off until we have fully verified Indian fee and placement data. We chose not to show unverified numbers. |

---

## 4. Things NOT to say

- Any claim of users, revenue or pilots we do not have.
- "AI decides" or "AI predicts": the numbers come from tested code.
- "Guaranteed" anything, or that results are forecasts: they are what-if scenarios.
- The ₹9 L Year-1 figure as a forecast: it is an illustration built from assumptions.
- Anything about a named competitor's business model.

---

## 5. Backup plan (in this order)

1. **Live site:** https://aihackathon-three.vercel.app (paste the preload snippet).
2. **Local copy:** in a terminal, `cd "/Users/lipikaarya/Desktop/AI Hackathon" && npm run dev`, then open http://localhost:3000 and paste the same snippet (change nothing else).
3. **Screenshots:** `docs/pitch-assets/` has six images of exactly what the demo shows: results and picks, the six-country ranking, Toronto's five scenarios, the funding-gap working, the methodology page, and the six-country comparison.
4. **Record a 90-second screen video** of the demo tonight and keep it on the laptop and phone.

---

## 6. Night-before and pre-pitch checklist

- [ ] Open the live site on the venue Wi-Fi (or phone hotspot); confirm the results load.
- [ ] Paste the preload snippet; confirm the ranking shows Saarland first, ₹25.0 L.
- [ ] Browser zoom at 110% to 125%; close other tabs; notifications off; laptop charged.
- [ ] Run through the script once with a timer: 5:00 total, demo no more than 1:30.
- [ ] Fill in the one real sentence for slide 6 (what people actually said).
- [ ] Have the screenshots folder and the video ready as backup.
- [ ] Re-read section 4 (what not to say).
