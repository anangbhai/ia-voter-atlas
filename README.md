# Indian American Voter Atlas

**The first nonpartisan, district-level civic data dashboard built for the Indian American community.**

[voteratlas.io](https://voteratlas.io)

---

## Overview

The Indian American Voter Atlas is an interactive dashboard that synthesizes Census ACS, Carnegie IAAS survey (2024 & 2026), FBI UCR hate crime data, DOL PERM disclosure files (FY2008–2024), FEC donor data, HMDA mortgage data, Annual Business Survey, and Cook Political Report ratings into a single tool serving Hill staffers, journalists, researchers, and community members. There are 5.4 million Indian Americans in the United States — roughly 2.6 million eligible voters — yet no district-level data infrastructure existed for this community's civic engagement until now.

## Dashboard Tabs

| Tab | Description |
|-----|-------------|
| **House Districts** | 24 key congressional districts with population data, competitiveness ratings, and two proprietary index scores |
| **Senate 2026** | 15 Senate battleground races with Indian American population by state |
| **2024 Election** | Presidential vote trends (2004–2024), gender-age breakdowns, party ID shifts, precinct-level swing data, IAAS 2026 Trump approval |
| **PERM & Green Card Backlog** | DOL PERM labor certification data (FY2008–2024) by state and district — employer counts, average salaries, top filing companies |
| **Economic Contribution** | Median income, labor force participation, Fortune 500 leadership, unicorn founders |
| **Community Safety** | FBI hate crime trends (2015–2024), temple/gurdwara incident log, cross-referenced data sources |
| **Discourse Monitor** | Event timeline and narrative tracker for legislation, rhetoric, incidents, and advocacy |
| **Bill Tracker** | Federal legislation relevant to the community — immigration, H-1B, hate crimes, India relations |
| **Methodology** | Full data source documentation, index descriptions, and known limitations |

## Proprietary Indices

**Community Density Index** (0–100) — Measures Indian American civic and economic presence in a district, going beyond Census headcounts to incorporate donor engagement, cultural infrastructure, digital signals, and immigration patterns.

**Persuasion Index** (0–100) — Measures how electorally moveable the Indian American vote is in a district, based on competitiveness, recent swing magnitude, voter independence, population relative to margins, and bounceback evidence.

Exact weightings and scoring methodology are proprietary and documented on the dashboard's Methodology tab.

## IAAS 2026 Integration

Carnegie Endowment Indian American Attitudes Survey 2026 data (n=1,000, ±3.6%, fielded Nov 2025–Jan 2026) is integrated into the Election tab, including Trump approval cross-tabs by gender, age, education, and party ID.

## Data Sources

All primary sources are public:

- **Census Bureau** — ACS 5-Year Estimates (Asian Indian population, language, education)
- **Carnegie Endowment** — Indian American Attitudes Survey (IAAS) 2024 & 2026
- **FBI** — Uniform Crime Reporting / NIBRS hate crime statistics
- **Department of Labor** — PERM Disclosure Data (FY2008–2024)
- **FEC** — Individual contribution data using validated South Asian surname methodology
- **Cook Political Report** — District competitiveness ratings and PVI scores
- **HMDA** — Mortgage lending data for economic indicators
- **Census Annual Business Survey** — Business ownership data
- **Congress.gov** — Bill tracking for relevant legislation
- **OpenStreetMap** — Overpass API for temple and gurdwara locations

## Tech Stack

- **Frontend:** React (Vite)
- **Database:** Supabase (PostgreSQL)
- **Maps:** Leaflet
- **Hosting:** Vercel

## Local Development

```bash
git clone https://github.com/anangbhai/ia-voter-atlas.git
cd ia-voter-atlas
npm install
npm run dev
```

Runs on `http://localhost:5173`. Pushes to `main` auto-deploy via Vercel.

## Author

**Anang Mittal**
Contact: anangbhai+voteratlas@gmail.com

## License

Data sources are public. Dashboard code is proprietary. All rights reserved. Please contact the author for licensing inquiries.
