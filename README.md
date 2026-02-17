# Indian American Voter Atlas

**The first nonpartisan, district-level civic data dashboard built for the Indian American community.**

🔗 **Live:** [voteratlas.io](https://voteratlas.io)

---

## What This Is

The Indian American Voter Atlas is an interactive data dashboard that maps Indian American civic presence across congressional districts, Senate races, and federal policy. It synthesizes public data from the Census Bureau, Department of Labor, FBI, FEC, Carnegie Endowment, and Congress.gov into a single free tool designed for Hill staffers, journalists, PACs, and the community itself.

There are 5.4 million Indian Americans in the United States. About 2.6 million are eligible to vote. In 2024, this community had the most dramatic partisan shift of any demographic group in American politics. Despite this, no district-level data infrastructure existed for Indian American civic engagement — until now.

## Dashboard Sections

| Tab | Description |
|-----|-------------|
| **House Districts** | 24 key congressional districts with population, competitiveness ratings, and two proprietary index scores |
| **Senate 2026** | 15 Senate races with Indian American population by state |
| **2024 Election** | Presidential vote trends (2004–2024), gender-age breakdowns, party ID shifts, precinct-level swing data |
| **PERM & Green Card Backlog** | DOL PERM labor certification data by state — employer counts, average salaries, top filing companies |
| **Economic Contribution** | Median income, labor force participation, Fortune 500 leadership, unicorn founders — all sourced |
| **Community Safety** | FBI hate crime trends (2015–2024), temple/gurdwara incident log, cross-referenced data sources |
| **Discourse Monitor** | Event timeline + narrative tracker for legislation, rhetoric, incidents, and advocacy |
| **Bill Tracker** | Federal legislation relevant to the community — immigration, H-1B, hate crimes, India relations |
| **Methodology** | Full data source documentation, index weighting breakdowns, and known limitations |

## Key Metrics

**Persuasion Index** — A composite score (0–100) measuring where Indian Americans have the most *electoral leverage*, not just where they live. Combines district competitiveness, swing magnitude, population share, donor activity, and cultural infrastructure.

**Community Density Index** — A composite score (0–100) measuring where Indian Americans are civically and economically active, going beyond Census headcounts to incorporate donor engagement, cultural infrastructure, digital presence, and immigration patterns.

## Data Sources

All primary sources are public:

- **Census Bureau** — ACS 5-Year Estimates (Tables B02015, C16001, B16004), supplemented by AAPI Data and SAALT community estimates
- **Department of Labor** — PERM Disclosure Data, parsed by fiscal year and mapped to congressional districts
- **FBI** — Uniform Crime Reporting / NIBRS hate crime statistics
- **FEC** — Individual contribution data, filtered using validated South Asian surname methodology
- **Carnegie Endowment** — Indian American Attitudes Survey (IAAS) 2020, 2024
- **Cook Political Report** — Competitiveness ratings and PVI scores
- **Congress.gov API** — Bill tracking for relevant legislation
- **OpenStreetMap** — Overpass API for temple and gurdwara location data
- **Community organizations** — Sikh Coalition, CoHNA, Stop AAPI Hate, Hindu American Foundation, Center for the Study of Organized Hate

Population figures use community-level estimates that exceed Census "Asian Indian alone" counts. The methodology and rationale are documented in the dashboard's Methodology tab and in the [accompanying blog post](https://voteratlas.io).

## Tech Stack

- **Frontend:** React (Vite)
- **Database:** Supabase (PostgreSQL)
- **Maps:** Leaflet with custom tile layers
- **Hosting:** Vercel
- **Data pipeline:** Manual updates on a regular cycle (Census annually, FBI annually, Cook quarterly, FEC quarterly)

## Local Development

```bash
git clone https://github.com/anangbhai/ia-voter-atlas.git
cd ia-voter-atlas
npm install
npm run dev
```

Runs on `http://localhost:5173`.

## Deployment

Pushes to `main` auto-deploy via Vercel.

```bash
git add .
git commit -m "description of changes"
git push
```

## Nonpartisanship

This dashboard does not endorse candidates, recommend votes, or advocate for policy positions. It presents data. The Persuasion Index tells you where Indian American voters are electorally decisive — it does not tell you which party should court them. The PERM data shows the green card backlog — it does not argue for a specific legislative fix. The Discourse Monitor tracks events across the political spectrum without filtering for direction.

This is a deliberate design choice. Nonpartisan data tools serve everyone.

## Roadmap

- [ ] State legislative district mapping (6–8 key states)
- [ ] FEC donor flow analysis by industry sector
- [ ] Original survey research (1,200–1,500 validated voters)
- [ ] Community incident reporting system
- [ ] Automated data pipelines (Census API, FEC bulk data, Google Trends)

## Author

**Anang Mittal**

Built as an independent civic data project. Questions, data requests, or partnership inquiries: reach out via [voteratlas.io](https://voteratlas.io).

## License

Data sources are public. Dashboard code is proprietary. Please contact the author for licensing inquiries.
