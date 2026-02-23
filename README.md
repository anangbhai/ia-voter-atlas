# Indian American Voter Atlas
**Live at [voteratlas.io](https://voteratlas.io)**

The first nonpartisan, district-level civic data dashboard built specifically
for the Indian American community. Synthesizes Census ACS, Carnegie IAAS survey
(2020, 2024, 2026), FBI UCR hate crime data, DOL PERM disclosure files, CFPB
HMDA mortgage data, FEC individual contributions, SBA loan data, NIH/NSF grant
data, USCIS Yearbook statistics, and Cook Political Report ratings into a free,
interactive dashboard.

## Who This Serves

Hill staffers and policymakers, journalists and researchers, Indian American
civic organizations and PACs, and the community itself.

## Tech Stack

React/Vite · Supabase · Recharts · Leaflet · Vercel

## Dashboard Tabs

- **House Districts** — 24 key congressional districts with Economic Presence
  Index, Persuasion Index, population data, and district cards
- **Senate 2026** — 15 Senate races with Indian American population and FEC
  donor data by state
- **2024 Election** — Presidential vote trends, partisan shift, precinct-level
  swing data, Carnegie IAAS 2026 approval ratings
- **Economic Presence** — Five sub-sections: Immigration Pipeline (DOL PERM +
  USCIS), Household Wealth (HMDA), Business Ownership (ACS/ABS/SBA), Research
  & Innovation (NIH/NSF), Political Economy (FEC)
- **Community Safety** — FBI UCR hate crime data, Sikh Coalition, CoHNA, Stop
  AAPI Hate incident tracking
- **Discourse Monitor** — Event timeline and narrative tracker
- **Bill Tracker** — Congress.gov API, live federal legislation
- **Methodology** — Full data sources, index weights, known limitations

## Proprietary Indices

**Economic Presence Index (0–100):** Primary district score measuring where
Indian Americans are civically and economically rooted. Weighted composite of
FEC donor activity (30%), HMDA mortgage originations (25%), business ownership
(20%), NIH/NSF grant activity (15%), and SBA loan volume (10%). Districts with
missing data components are scored on available indicators only, with weights
renormalized — coverage is documented on each district card.

**Persuasion Index (0–100):** Measures electoral leverage — where Indian
American voters can influence outcomes. Composite of district competitiveness,
2020→2024 swing magnitude, independent identification rate, population size,
and bounceback evidence.

**Community Density Index (0–100):** Companion metric measuring demographic
and civic depth. Shown in district detail view and methodology tab.

## Data Sources

| Table | Rows | Coverage | Method |
|-------|------|----------|--------|
| `hmda_by_district` | 56 | 8 districts, 2018–2024 | Exact — HMDA race code 21 |
| `acs_econ_by_district` | 24 | 24 districts, 2023 | Exact — race classification |
| `h1b_by_district` | 152 | 8 districts, FY2008–2026 | Employer proxy |
| `abs_by_district` | 24 | 24 districts, 2023 | Exact — Asian alone |
| `uscis_india` | 23 | National, 2001–2023 | Exact — country of birth |
| `sba_loans` | 79 | 24 districts, 1991–present | Surname estimate |
| `fec_south_asian` | 171 | 11 states + 8 districts, 2008–2024 | Surname estimate |
| `grants_south_asian` | 176 | 11 states, FY2008–2023 | Surname estimate |

## Carnegie IAAS 2026

Integrated January 2026 wave (n=1,000, ±3.6%). Key findings: 29% Trump job
approval among Indian Americans, 55% strong disapproval, 29% now identify as
Independent (up from 15% in 2020).

## Author

Anang Mittal · anangbhai+voteratlas@gmail.com

## License

All rights reserved.
