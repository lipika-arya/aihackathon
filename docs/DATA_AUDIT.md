# Data audit, 22 Oct 2026

Every money figure that feeds the calculator was re-opened against its cited source page (about 470 fields: five countries and the lender file). No figure that could be read was contradicted by its source. Some pages blocked automated access, so some items could not be re-checked; those are marked in the app as partly verified, not confirmed, or unverified.

## Fixed in this pass
| Issue | Change |
|---|---|
| Default loan rate was 10.24%, pulled up by an unconfirmed 11.5-15% lender and a 12.7% Canada ceiling | Now the average mid-point of the 5 verified public-sector banks (about 9.9%). Shown with its derivation on the ROI page. Saved assumptions from before this change are ignored (storage key `.v2`). |
| Australian health cover (OSHC) missing for all 6 programmes | New country-level `health_insurance_per_year` (A$670, midpoint of RMIT's A$590-750 range), counted in the table and the loan maths, labelled Estimate |
| Buffalo's USD 100 per semester international fee missing | Added to the three UB programmes |
| Hitotsubashi books, transport and insurance missing | Added to mandatory fees (reproduces the page's own 2-year total) |
| RMIT MBA: page total (A$107,520) differs from 2 x annual fee | Uses the page total; programme marked partial because the page does not explain the gap |
| German visa fee stored as EUR 75 from a 2017 page | Now INR 8,300 from the Kolkata mission page |
| Exchange rates had no margin caveat | Visible note: ECB mid-market rates, banks add a margin |
| Fee years not stated by sources (Concordia, UTokyo, Hitotsubashi, IUJ, TUM) | Relabelled to say so |
| India salary baseline could not be re-verified | Flagged "Source not re-checked" wherever it is used |
| 15 policy claims confirmed only partly or not at all | Each shows a verification note on the Visa tracker |
| Monash, LMU fees, Credila could not be re-confirmed | Downgraded to partial |
| Mandatory-fees badge always said "Verified" | Now follows the programme's status |
| Default interest rate showed 11% in the first (server-rendered) HTML, then 9.9% after the page loaded; the Loans calculator started at 10.5%; the methodology page did not state the default | One default (9.9%, derived from the lender data) is used from the first render, by the ROI and Loans calculators and the Reset button; the methodology page states it and where it comes from; a test keeps the stored fallback in step with the derived value |
| "Mandatory fees: not found, counted as 0" was shown for programmes whose total already includes fees (e.g. Toronto) as well as for programmes whose fees really are missing | Three states: itemised figure, "Included in the tuition total" (with the source's wording), or "Not found". Programmes in the last state show an "Incomplete" badge on the total, a warning banner, and a "Cost incomplete" flag in the lists |

## Still open
- **Mandatory fees not found (cost shown as incomplete):** UNSW, Flinders, Monash, UQ (Australian student services fee), UBC (student fees, health plan), ESMT Berlin and Mannheim. Find the fees on each university page and add them, or add a `mandatory_fees_note` if the total already includes them.
- **Toronto:** the source's CAD 90,050 includes the CAD 2,200 mandatory fee but does not itemise other fees or mention health insurance.
- **India salary baseline (NIRF):** the site blocks automated access. Verify by hand.
- **Credila, Monash:** sites block automated access.
- **US health insurance:** Buffalo's living-cost figure excludes health insurance (about USD 2,300 a year per UB's page). Not added; check whether other US programmes include it.
- **US visa fee (MRV USD 185):** not on the cited ICE page.
- **Tax rates** (DE 38.7%, US 21%, CA 25%) are our own estimates; the Germany OECD figure could not be read.
- **BLS salaries:** only the CS low and median were re-checked (API limit).
- **Avanse tenure:** its rate page says 15 years, its FAQ says 17. Recorded as 15.
- **Axis Bank:** the benchmark and maximum-amount figures look inconsistent across its pages.
- **Exchange rate margin** is only a note; no margin is applied to the numbers.
