# Economic Presence Tab — Full Component Spec
## Indian American Voter Atlas | voteratlas.io

> **For Claude Code:** Read this entire document before touching any files.
> Then audit every component that will be affected before writing a single line.
> Build a `useEconomicData.js` hook first. Everything else fetches from it.

---

## 0. Pre-Build Audit Checklist

Before coding, identify and list every file that will change:

- [ ] The existing PERM/Economic tab component (full rebuild)
- [ ] `src/hooks/` — create `useEconomicData.js`
- [ ] House Districts tab — district cards need new economic data panels
- [ ] Senate 2026 tab — wire in `fec_south_asian` state-level rows
- [ ] Methodology tab — update data sources section
- [ ] Top-level navigation — rename tab from "PERM & Green Card Backlog" → "Economic Presence"
- [ ] Any existing Supabase query files referencing old perm-only data
- [ ] `CLAUDE_CONTEXT.md` — update after build is complete

---

## 1. Data Hook — `useEconomicData.js`

Create a single consolidated hook. All economic data fetching lives here.
No component should make its own Supabase call for economic data.

```javascript
// src/hooks/useEconomicData.js

export function useEconomicData(districtId = null, state = null) {
  // Returns all of the following, loading/error states included:
  return {
    // Immigration Pipeline
    perm,           // existing perm_by_district data — filter by districtId if provided
    uscis,          // uscis_india — always national, no filter needed

    // Household Wealth
    hmda,           // hmda_by_district — filter by districtId if provided

    // Business Ownership
    acs,            // acs_econ_by_district — filter by districtId if provided
    abs,            // abs_by_district — filter by districtId if provided
    sba,            // sba_loans — filter by geography_id matching districtId or state

    // Research & Innovation
    h1b,            // h1b_by_district — filter by districtId if provided
    grants,         // grants_south_asian — filter by state if provided

    // Political Economy
    fec,            // fec_south_asian — filter by geography_id matching districtId or state

    // Meta
    loading,
    error,
  }
}
```

**Query logic notes:**
- `sba_loans`: `geography_type = 'district'` for district view, `geography_type = 'state'` for state/national view. `data_year` is a TEXT range ('2000-2009') not integer — render as label, don't sort numerically.
- `fec_south_asian`: same `geography_type` pattern. `election_cycle` is TEXT ('2024', '2022' etc).
- `grants_south_asian`: `state` column is 2-letter code. For district view, derive state from districtId (e.g. 'CA-17' → 'CA').
- `uscis_india`: no geographic filter — always pull all 23 rows (2001–2023).
- `hmda_by_district`: has year column — pull all years for sparkline rendering.
- All tables: handle null/missing gracefully. Many districts have partial coverage.

---

## 2. Tab Navigation

### Top-level tab rename
```
"PERM & Green Card Backlog"  →  "Economic Presence"
```
Update in nav component and any router config. URL slug: keep `/economic` or `/perm` 
whichever exists — add redirect from old slug if changed.

### Internal sub-navigation (within Economic Presence tab)
Five pills/tabs rendered horizontally at top of tab content:

```
[ Immigration Pipeline ]  [ Household Wealth ]  [ Business Ownership ]  [ Research & Innovation ]  [ Political Economy ]
```

Default active: **Immigration Pipeline** (preserves existing PERM tab behavior for returning users).

On mobile: scroll horizontally, don't collapse to dropdown. Pills should be compact.

Active pill style: saffron background, white text.
Inactive: white background, royal blue text, royal blue border.

---

## 3. Sub-Section Specs

---

### 3A. Immigration Pipeline
*Replaces the existing PERM tab. Preserve all existing functionality, add USCIS.*

**Layout:** Two columns on desktop, stacked on mobile.

**Left column — PERM Data (existing)**
- District selector or district context if called from district card
- Fiscal year selector (FY2008–FY2026)
- Metrics: total certifications, average offered wage, top 5 employers
- Existing chart: certifications over time by fiscal year
- Existing table: employer breakdown
- Keep all existing PERM UI — do not rebuild, just integrate

**Right column — USCIS National Trends (new)**
- Header: "National Immigration Pipeline — India"
- Subheader: "USCIS Yearbook of Immigration Statistics, 2001–2023"
- Methodology note (inline, small text): *"No filtering applied — USCIS tabulates by country of birth as recorded on I-485 (LPR) and N-400 (naturalization) forms."*

- Two-line chart on single axis:
  - Line 1: `india_lpr_admissions` by year (label: "LPR Admissions")
  - Line 2: `india_naturalizations` by year (label: "Naturalizations")
  - X-axis: 2001–2023
  - Y-axis: formatted with K suffix (e.g. "50K")
  - Color: LPR = royal blue, Naturalizations = saffron
  - Annotate two notable points:
    - 2003 dip (50,228 LPR) — tooltip: "Post-9/11 processing slowdowns"
    - 2022 spike (120,121 LPR) — tooltip: "COVID-19 backlog clearance"

- Summary stat row below chart:
  - "Peak LPR Year: 2022 (120,121)"
  - "Current Naturalization Rate: [2023 value]"
  - "Avg Annual LPR Admissions (2015–2023): [calculated]"

- Below summary: `nat_to_lpr_ratio` as a small secondary chart or stat callout.
  - Label: "Years where naturalizations exceeded new admissions: 2008–2010, 2019"
  - Explanation tooltip: "Reflects 5-year wait period between LPR admission and naturalization eligibility."

---

### 3B. Household Wealth
*All new. Data source: `hmda_by_district`.*

**Header:** "Mortgage & Homeownership Activity"
**Subheader:** "CFPB Home Mortgage Disclosure Act (HMDA), 2018–2024"
**Methodology badge:** "Exact count — HMDA race code 21 (Asian Indian), borrower self-reported"

**Layout:** Stats row → chart → table

**Stats row (4 cards):**
1. Total loan originations (sum across all years in district)
2. Average loan amount (most recent year)
3. Most recent year origination count
4. YoY change % (2023 vs 2024 or most recent two years)

**Main chart:**
- Bar chart: origination count by year (2018–2024)
- Overlay line: average loan amount (right Y-axis, formatted $K)
- Shows both volume and value trends simultaneously

**Loan type breakdown (if data supports):**
- Stacked or grouped bars: Purchase / Refinance / Home Improvement
- Label: "Loan Purpose Mix"

**District comparison callout:**
- If districtId is set: show this district vs. all-district average
- "CA-17 Indian American mortgage originations are 3.2× the tracked-district average"

**Methodology note (expandable):**
> "HMDA data covers institutional lenders filing with CFPB. Cash purchases and private loans are excluded. Race coding is borrower-reported; mixed-race applicants may be coded inconsistently across applications. Coverage: 8 of 24 tracked districts have sufficient HMDA volume for reliable estimates."

---

### 3C. Business Ownership
*All new. Data sources: `acs_econ_by_district`, `abs_by_district`, `sba_loans`.*

**Header:** "Business Formation & Entrepreneurship"

**Three data cards side by side (desktop) / stacked (mobile):**

**Card 1 — Self-Employment (ACS)**
- Source badge: "Census ACS 2023 — Exact classification"
- Metric: Self-employed Indian American workers in district
- Secondary: As % of total Indian American labor force in district
- Tertiary: Median self-employment income
- Small bar showing district vs national Indian American self-employment rate

**Card 2 — Employer Businesses (ABS)**
- Source badge: "Census Annual Business Survey 2023 — Exact classification"  
- Metric: Indian American-owned employer businesses (state/metro level)
- Secondary: Total employees at Indian American-owned firms
- Tertiary: Annual payroll
- Note: "ABS data available at state level; district-level estimates are proportional"

**Card 3 — SBA Loans**
- Source badge: "SBA FOIA Data — Surname estimate, ~88-92% precision"
- Metric: Total SBA loans to South Asian-named businesses (all years)
- Secondary: Total dollar value (7a + 504 combined)
- Breakdown: 7(a) vs 504 loan counts
- Date ranges: show which periods are included ('2000-2009', '2010-2019', '2020-present')
- Caveat badge: "Floor estimate — surname-on-business-name significantly undercounts"

**Below cards — SBA timeline bar chart:**
- X-axis: date range periods ('2000-2009', '2010-2019', '2020-present')
- Grouped bars: 7(a) loan count / 504 loan count
- Overlay: total dollar amount line

**Methodology note (expandable):**
> "Three methodologies with different precision levels are combined here. ACS and ABS use exact federal race classification — these are counts, not estimates. SBA uses surname analysis on business names, which significantly undercounts firms where the business name does not contain the owner's surname. Treat SBA figures as minimums. All three sources are presented together because each captures a different part of the entrepreneurship picture: self-employment (ACS), established employer firms (ABS), and capital access (SBA)."

---

### 3D. Research & Innovation
*Mostly new. Data sources: `grants_south_asian`, `h1b_by_district`.*

**Header:** "Scientific Research & Skilled Immigration"

**Layout:** Two panels

**Panel 1 — NIH Research Grants**
- Source badge: "NIH Reporter API — Surname estimate, ~88-92% precision"
- Scope: State level (derive from district if in district context)

- Stat row:
  - Total NIH awards to South Asian PIs (all years, this state)
  - Total dollar value
  - Most recent year (2023): $[X]M
  - YoY growth (2022→2023): [X]%

- Line chart: NIH matched awards and amounts by year (2008–2023)
  - Dual Y-axis: award count (left) / dollar amount (right)
  - Annotate 2023 spike: "Post-COVID NIH budget expansion + backlog"

- Top institutions (if queryable): table of org_name, award count, total amount

- Methodology note: *"Surname analysis on PI last names following Ramakrishnan et al. (AAPI Data) methodology. NIH does not collect PI race/ethnicity in public data. Underestimates Indian American researchers with non-South-Asian surnames."*
- NSF note (inline): *"NSF data integration pending API resolution. Will be added in a future update."*

**Panel 2 — H-1B Skilled Immigration**
- Source badge: "DOL H-1B Employer Data — Employer proxy"
- This is existing data from `h1b_by_district` — preserve existing visualization
- Add context header: "H-1B visas as a leading indicator of community growth nodes"
- Add callout: "Indian nationals received ~72% of all H-1B visas in FY2024"

---

### 3E. Political Economy
*All new. Data source: `fec_south_asian`.*

**Header:** "Political Contributions & Donor Activity"
**Subheader:** "Federal Election Commission Individual Contributions, 2008–2024"
**Methodology badge:** "Surname estimate — Ramakrishnan et al. (AAPI Data) methodology, ~88-92% precision"
**Scope note:** "FEC data covers contributions >$200 to federal committees only."

**Layout:** Cycle selector → summary stats → charts → district/state table

**Cycle selector:**
- Horizontal pill group: 2008 | 2010 | 2012 | 2014 | 2016 | 2018 | 2020 | 2022 | 2024
- Default: 2024
- Selecting a cycle updates all panels below

**Summary stats row (for selected cycle):**
1. Total contributions (South Asian-matched)
2. Estimated unique donors (`estimated_donors` column)
3. Transaction count
4. Top contributing district (if in national view)

**Chart 1 — Trend line (all cycles):**
- Line chart: total_contributions by election_cycle
- Shows 2008–2024 arc
- Annotate: presidential cycles (2008, 2012, 2016, 2020, 2024) vs midterms
- Expected pattern: presidential cycles significantly higher

**Chart 2 — Geographic breakdown (selected cycle):**
- Horizontal bar chart
- Show all geographies with data for selected cycle
- Separate districts from states visually (section headers or color coding)
- Top 5 districts by total_contributions for selected cycle

**Table — Full breakdown:**
- Columns: Geography | Type | Contributions ($) | Transactions | Est. Donors
- Sortable by any column
- Filter toggle: Districts only / States only / All
- Highlight row if matches current district context

**Insight callout box:**
- Hardcoded for now (update manually each cycle):
- "In 2024, South Asian donors contributed an estimated $[X]M across tracked districts, led by CA-17 ($8.6M), VA-10 ($2.4M), and MI-11 ($2.0M). Presidential cycles average 3–4× midterm contribution volumes."

**Methodology note (expandable):**
> "South Asian surname filtering of FEC individual contributions data. Surname list (~150 high-precision names) derived from Census 2010 frequently occurring surnames, validated against community lists following Ramakrishnan et al. (AAPI Data) methodology. False positive rate ~8–12%; misses Indian Americans with non-South-Asian surnames. All figures are estimates. FEC data covers contributions >$200 only — small-dollar donors are not represented."

---

## 4. Site-Wide Integration Points

### 4A. House Districts Tab — District Cards

Each district card should gain an "Economic Snapshot" panel (collapsed by default, expand on click).

When expanded, show:
- HMDA: "[X] mortgage originations (2024)" — if district is in hmda_by_district
- ACS: "[X] self-employed Indian American workers"
- FEC: "[$X] in South Asian contributions (2024 cycle)"
- PERM: already shown — keep existing

If district not in a table (e.g., not one of the 8 HMDA districts), show:
- "HMDA data not available for this district" in muted text
- Do not show empty cards

Data flow: call `useEconomicData(districtId)` — the hook handles null returns gracefully.

### 4B. Senate 2026 Tab

`fec_south_asian` has state-level rows (`geography_type = 'state'`). Wire these in.

For each Senate race state row, add:
- "South Asian donor contributions (2024): [$X]" pulled from fec where geography_id = state code and election_cycle = '2024'
- Show trend: 2020 → 2022 → 2024 as three small numbers with arrows

States in `fec_south_asian`: CA, NJ, TX, MI, VA, IL, NY, GA, WA, PA, NC (11 states — match against Senate races list).

### 4C. Methodology Tab

Replace the current "Data Sources — Immigration & Economy" section with the expanded version covering all 8 new tables. Use this exact text (or close to it):

**Immigration & Economy**
USCIS Yearbook of Immigration Statistics, Tables 3 and 21d (2001–2023). No filtering applied — USCIS tabulates by country of birth as recorded on I-485 and N-400 forms. Department of Labor PERM Disclosure Data (FY2008–FY2024), parsed by fiscal year and mapped to congressional districts. Census ACS income, poverty, labor force, and educational attainment data.

**Economic Presence — Mortgage & Wealth**
CFPB Home Mortgage Disclosure Act (HMDA) data, 2018–2024, filtered to race code 21 (Asian Indian) using exact federal classification. Most methodologically precise economic signal in the dataset — race coding is borrower-reported and federally standardized.

**Economic Presence — Business Ownership**
Census Annual Business Survey (ABS) 2023, exact Asian Indian race classification. SBA 7(a) and 504 loan FOIA data, filtered using South Asian surname analysis on business names (floor estimate; surname-on-business-name significantly undercounts). Surname methodology: Ramakrishnan et al. (AAPI Data); false positive rate ~8–12%.

**Economic Presence — Research & Innovation**
NIH Reporter API (FY2008–2023), PI last names filtered using South Asian surname analysis. NIH does not collect PI race/ethnicity in public data. NSF integration pending.

**Electoral & Political Economy**
FEC individual contribution data (2008–2024), 9 election cycles, South Asian surname analysis. FEC covers contributions >$200 only.

Add to Known Limitations section:
> HMDA race coding relies on borrower self-identification and lender observation; some mixed-race borrowers may be coded differently across applications. HMDA excludes cash purchases and private loans. SBA surname filtering on business names significantly undercounts Indian-owned firms where the business name does not contain the owner's surname — treat SBA figures as minimums. NIH surname analysis will undercount researchers who publish or register under anglicized or married names.

---

## 5. Component File Structure (Recommended)

```
src/
  hooks/
    useEconomicData.js          ← CREATE FIRST
  components/
    economic/
      EconomicPresenceTab.jsx   ← top-level, handles sub-nav
      ImmigrationPipeline.jsx   ← 3A: PERM + USCIS
      HouseholdWealth.jsx       ← 3B: HMDA
      BusinessOwnership.jsx     ← 3C: ACS + ABS + SBA
      ResearchInnovation.jsx    ← 3D: NIH + H-1B
      PoliticalEconomy.jsx      ← 3E: FEC
      shared/
        MethodologyNote.jsx     ← reusable expandable methodology callout
        SourceBadge.jsx         ← "Exact count" / "Surname estimate" badges
        StatCard.jsx            ← reusable metric card
```

---

## 6. Methodology Badge System

Use consistent visual badges across all panels to communicate data precision at a glance.

Three badge types:

| Badge | Color | When to use |
|-------|-------|-------------|
| "Exact count" | Green | HMDA, ACS, ABS, USCIS |
| "Employer proxy" | Blue | H-1B data |
| "Surname estimate (~90%)" | Yellow/amber | FEC, SBA, NIH grants |

Render as a small pill next to the data source citation. Clicking the badge expands the methodology note for that specific dataset.

---

## 7. Empty State Handling

Many districts have partial coverage. Handle gracefully everywhere:

- If `hmda_by_district` has no row for a district: show "HMDA data not available for this district. Coverage currently includes 8 of 24 tracked districts." Not an error — just not yet.
- If `grants_south_asian` has no row for a state: "NIH grant data not available for this state."
- If `fec_south_asian` has no district-level row but has a state-level row: fall back to state data and note "District-level FEC data not available; showing state totals."
- Never show a loading spinner that never resolves. Set a timeout (5s) and show the empty state.

---

## 8. Build Order

Do in this order to avoid dependency issues:

1. `useEconomicData.js` hook — test queries against Supabase before proceeding
2. `SourceBadge.jsx`, `StatCard.jsx`, `MethodologyNote.jsx` — shared components
3. `ImmigrationPipeline.jsx` — easiest, mostly existing PERM code + USCIS chart
4. `HouseholdWealth.jsx`
5. `BusinessOwnership.jsx`
6. `ResearchInnovation.jsx`
7. `PoliticalEconomy.jsx`
8. `EconomicPresenceTab.jsx` — assembles all five with sub-nav
9. House Districts card integration
10. Senate 2026 FEC integration
11. Methodology tab text update
12. Navigation rename + route redirect

Test each step on Vercel preview before moving to the next.

---

## 9. Notes for Claude Code

- Match the existing component patterns in the codebase exactly. Read 2–3 existing tab components before writing anything.
- The saffron/royal blue/brown palette — use the existing CSS variables or Tailwind classes already defined. Do not introduce new color values.
- Mobile responsiveness: every chart must have a mobile breakpoint. Recharts ResponsiveContainer is likely already in use.
- Do not remove any existing PERM functionality. ImmigrationPipeline.jsx wraps it.
- The `data_year` field in `sba_loans` is TEXT ('2000-2009') — never try to parse it as a number or sort it numerically. Sort by the first 4 characters if needed.
- `fec_south_asian.election_cycle` is TEXT ('2024') — same caution.
- After build: update `CLAUDE_CONTEXT.md` to reflect new file structure.
