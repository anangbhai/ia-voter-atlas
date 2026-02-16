# Indian American Voter Atlas

District-level political intelligence, election analysis, and community safety data for Indian Americans.

**South Asian Civic Data Project** · Nonpartisan · Open-source methodology

## Quick Start (Local)

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`

## Deploy to Vercel

### Option A: GitHub (Recommended)

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click "Add New Project" → Import your repo
4. Vercel auto-detects Vite — no config needed
5. Click "Deploy"

Your site will be live at `your-project.vercel.app` within ~60 seconds.

### Option B: Vercel CLI

```bash
npm i -g vercel
vercel
```

Follow the prompts. Deploys in under a minute.

### Custom Domain

1. Buy domain via Cloudflare Registrar (~$10-12/year)
2. In Vercel dashboard → Settings → Domains → Add your domain
3. Point DNS (Cloudflare) to Vercel's nameservers or add CNAME record
4. HTTPS is automatic

## Project Structure

```
voter-atlas/
├── index.html                    # Entry point with fonts & meta tags
├── package.json                  # Dependencies (React 18 + Vite 6)
├── vite.config.js                # Build config
├── vercel.json                   # SPA routing
└── src/
    ├── main.jsx                  # React root
    ├── App.jsx                   # App wrapper
    └── IndianAmericanVoterAtlas.jsx  # Dashboard (single component)
```

## Data Update Schedule

| Source | Frequency | When |
|--------|-----------|------|
| Census ACS | Annual | September release |
| FBI Hate Crime | Annual | Fall release |
| Cook Political Report | Quarterly | After major elections |
| FEC Contributions | Quarterly + pre-election | FEC filing deadlines |
| Carnegie IAAS | Every 4 years | Pre-presidential election |
| Discourse events | As they occur | Manual addition |
| Narrative tracker | Biweekly | Manual curation |

## Tech Stack

- **Framework:** React 18 + Vite 6
- **Styling:** Inline (prototype) → Tailwind (production migration)
- **Fonts:** Playfair Display, DM Sans, JetBrains Mono
- **Hosting:** Vercel (free tier)
- **Dependencies:** Zero external (React only)

## License

Data and methodology are open. Dashboard code is proprietary to South Asian Civic Data Project.
