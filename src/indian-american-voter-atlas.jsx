import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const CONTACT_EMAIL = "anang+voteratlas@gmail.com";

// ═══════════════════════════════════════════════════════════
// SUPABASE
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL = "https://myasgeeeutbbcahnguei.supabase.co";
const SUPABASE_ANON = "REDACTED";

async function supaFetch(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
  });
  if (!res.ok) throw new Error(`${table}: ${res.status}`);
  return res.json();
}

// snake_case → camelCase
function toCamel(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const cc = k.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
    out[cc] = v;
  }
  return out;
}

// Table-specific mappers (where DB column names don't match JSX field names)
function mapDistrict(row) {
  const d = toCamel(row);
  // cook2026 came from cook_2026 → cook2026 ✓
  // cookPvi needs to be cookPVI
  if (d.cookPvi !== undefined) { d.cookPVI = d.cookPvi; delete d.cookPvi; }
  return d;
}
function mapSenate(row) {
  const r = toCamel(row);
  if (r.trumpMargin2024 !== undefined) { r.trumpMargin2024 = r.trumpMargin2024; }
  return r;
}
function mapFbi(row) { return toCamel(row); }
function mapIncident(row) { const r = toCamel(row); delete r.id; return r; }
function mapDiscourse(row) { const r = toCamel(row); delete r.id; return r; }
function mapNarrative(row) { const r = toCamel(row); delete r.id; return r; }
function mapPresVote(row) { return toCamel(row); }
function mapPermDistrict(row) { return toCamel(row); }
function mapPermState(row) { return toCamel(row); }

// Local median household income by district (Census ACS — approximate)
const LOCAL_MEDIAN_INCOME = {
  'CA-17': 168000, 'CA-06': 105000, 'CA-14': 128000, 'CA-16': 142000, 'CA-32': 82000,
  'NJ-06': 85000, 'NJ-07': 120000, 'NJ-11': 130000, 'NJ-12': 78000, 'NJ-05': 105000,
  'TX-22': 95000, 'TX-24': 88000, 'TX-03': 105000,
  'VA-10': 145000, 'VA-11': 125000,
  'IL-08': 90000, 'GA-07': 85000,
  'NY-03': 115000, 'NY-04': 105000,
  'WA-07': 110000, 'MD-06': 95000,
  'PA-06': 100000, 'NC-02': 80000, 'MI-13': 32000,
};
function mapGenderAge(row) {
  const r = toCamel(row);
  // demoGroup → group
  if (r.demoGroup !== undefined) { r.group = r.demoGroup; delete r.demoGroup; }
  delete r.id;
  return r;
}
function mapPartyId(row) { return toCamel(row); }
function mapIssue(row) { const r = toCamel(row); delete r.id; return r; }
function mapPrecinct(row) {
  const r = toCamel(row);
  // description → desc
  if (r.description !== undefined) { r.desc = r.description; delete r.description; }
  // biden2020 / trump2024 come through correctly from snake
  delete r.id;
  return r;
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < breakpoint : false);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

// ═══════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════

const DISTRICTS = [
  { id: "CA-17", state: "CA", district: 17, rep: "Ro Khanna", party: "D", indianPop: 132000, indianPct: 17.2, totalPop: 766000, cook2026: "Solid D", cookPVI: "D+30", biden2020: 76, harris2024: 73, indianRep: true, metro: "Silicon Valley", densityScore: 94, persuasionScore: 42, notes: "Largest Indian American population of any CD in the US" },
  { id: "NJ-07", state: "NJ", district: 7, rep: "Thomas Kean Jr.", party: "R", indianPop: 62000, indianPct: 8.1, totalPop: 764000, cook2026: "Lean R", cookPVI: "R+1", biden2020: 51, harris2024: 48, indianRep: false, metro: "Central NJ", densityScore: 87, persuasionScore: 93, notes: "Competitive swing district with large Indian population, KEY TARGET" },
  { id: "IL-08", state: "IL", district: 8, rep: "Raja Krishnamoorthi", party: "D", indianPop: 58000, indianPct: 7.8, totalPop: 743000, cook2026: "Solid D", cookPVI: "D+10", biden2020: 59, harris2024: 56, indianRep: true, metro: "Chicago Suburbs", densityScore: 85, persuasionScore: 52, notes: "Schaumburg corridor, strong Indian business community" },
  { id: "CA-06", state: "CA", district: 6, rep: "Ami Bera", party: "D", indianPop: 55000, indianPct: 7.3, totalPop: 753000, cook2026: "Solid D", cookPVI: "D+9", biden2020: 58, harris2024: 55, indianRep: true, metro: "Sacramento", densityScore: 82, persuasionScore: 50, notes: "Longest-serving Indian American in Congress" },
  { id: "TX-22", state: "TX", district: 22, rep: "Troy Nehls", party: "R", indianPop: 52000, indianPct: 6.8, totalPop: 765000, cook2026: "Solid R", cookPVI: "R+15", biden2020: 42, harris2024: 40, indianRep: false, metro: "Houston/Sugar Land", densityScore: 81, persuasionScore: 58, notes: "Fort Bend County, fastest growing Indian community in TX" },
  { id: "NJ-11", state: "NJ", district: 11, rep: "VACANT", party: "D", indianPop: 49000, indianPct: 6.5, totalPop: 754000, cook2026: "Special Election", cookPVI: "D+6", biden2020: 55, harris2024: 53, indianRep: false, metro: "Morris/Passaic", densityScore: 80, persuasionScore: 77, notes: "Special election 2025 — active race" },
  { id: "VA-10", state: "VA", district: 10, rep: "Suhas Subramanyam", party: "D", indianPop: 47000, indianPct: 6.1, totalPop: 770000, cook2026: "Likely D", cookPVI: "D+8", biden2020: 60, harris2024: 57, indianRep: true, metro: "Northern Virginia", densityScore: 83, persuasionScore: 68, notes: "First Indian American elected to Congress from East Coast (2024)" },
  { id: "WA-07", state: "WA", district: 7, rep: "Pramila Jayapal", party: "D", indianPop: 38000, indianPct: 5.0, totalPop: 760000, cook2026: "Solid D", cookPVI: "D+33", biden2020: 80, harris2024: 78, indianRep: true, metro: "Seattle", densityScore: 72, persuasionScore: 35, notes: "Progressive Caucus Chair" },
  { id: "TX-10", state: "TX", district: 10, rep: "Michael McCaul", party: "R", indianPop: 37000, indianPct: 4.9, totalPop: 755000, cook2026: "Likely R", cookPVI: "R+10", biden2020: 44, harris2024: 42, indianRep: false, metro: "Austin/Houston Corridor", densityScore: 68, persuasionScore: 54, notes: "Growing tech corridor Indian population" },
  { id: "MI-13", state: "MI", district: 13, rep: "Shri Thanedar", party: "D", indianPop: 34000, indianPct: 4.6, totalPop: 740000, cook2026: "Solid D", cookPVI: "D+30", biden2020: 78, harris2024: 75, indianRep: true, metro: "Detroit", densityScore: 67, persuasionScore: 38, notes: "Includes Dearborn/Troy corridor" },
  { id: "NJ-06", state: "NJ", district: 6, rep: "Frank Pallone", party: "D", indianPop: 51000, indianPct: 6.7, totalPop: 761000, cook2026: "Solid D", cookPVI: "D+12", biden2020: 60, harris2024: 58, indianRep: false, metro: "Middlesex/Monmouth", densityScore: 84, persuasionScore: 61, notes: "Edison/Iselin — 'Little India' of the East Coast" },
  { id: "GA-07", state: "GA", district: 7, rep: "Lucy McBath", party: "D", indianPop: 36000, indianPct: 4.7, totalPop: 766000, cook2026: "Likely D", cookPVI: "D+5", biden2020: 55, harris2024: 52, indianRep: false, metro: "Atlanta Suburbs", densityScore: 71, persuasionScore: 74, notes: "Gwinnett County — booming Indian population" },
  { id: "NY-03", state: "NY", district: 3, rep: "Tom Suozzi", party: "D", indianPop: 33000, indianPct: 4.3, totalPop: 767000, cook2026: "Lean D", cookPVI: "D+3", biden2020: 54, harris2024: 51, indianRep: false, metro: "Long Island/Queens", densityScore: 66, persuasionScore: 82, notes: "Competitive — AAPI voters significant swing factor" },
  { id: "PA-06", state: "PA", district: 6, rep: "Chrissy Houlahan", party: "D", indianPop: 28000, indianPct: 3.7, totalPop: 757000, cook2026: "Solid D", cookPVI: "D+6", biden2020: 56, harris2024: 53, indianRep: false, metro: "Philadelphia Suburbs", densityScore: 58, persuasionScore: 69, notes: "Chester County — growing tech/pharma Indian workforce" },
  { id: "NC-09", state: "NC", district: 9, rep: "Richard Hudson", party: "R", indianPop: 26000, indianPct: 3.4, totalPop: 765000, cook2026: "Likely R", cookPVI: "R+8", biden2020: 44, harris2024: 43, indianRep: false, metro: "Charlotte", densityScore: 55, persuasionScore: 55, notes: "Charlotte banking corridor Indian professionals" },
  { id: "TX-24", state: "TX", district: 24, rep: "Beth Van Duyne", party: "R", indianPop: 42000, indianPct: 5.5, totalPop: 764000, cook2026: "Likely R", cookPVI: "R+5", biden2020: 48, harris2024: 46, indianRep: false, metro: "Dallas/Irving", densityScore: 76, persuasionScore: 79, notes: "Irving has one of largest Indian populations in TX, competitive lean" },
  { id: "CA-16", state: "CA", district: 16, rep: "Sam Liccardo", party: "D", indianPop: 40000, indianPct: 5.2, totalPop: 769000, cook2026: "Solid D", cookPVI: "D+20", biden2020: 68, harris2024: 65, indianRep: false, metro: "San Jose", densityScore: 74, persuasionScore: 40, notes: "Heart of Silicon Valley Indian tech community" },
  { id: "NJ-12", state: "NJ", district: 12, rep: "Bonnie Watson Coleman", party: "D", indianPop: 44000, indianPct: 5.8, totalPop: 759000, cook2026: "Solid D", cookPVI: "D+18", biden2020: 66, harris2024: 64, indianRep: false, metro: "Central NJ/Princeton", densityScore: 78, persuasionScore: 48, notes: "Plainsboro/Princeton Junction corridor" },
  { id: "VA-11", state: "VA", district: 11, rep: "Gerry Connolly", party: "D", indianPop: 45000, indianPct: 5.9, totalPop: 763000, cook2026: "Solid D", cookPVI: "D+16", biden2020: 65, harris2024: 63, indianRep: false, metro: "Fairfax County", densityScore: 79, persuasionScore: 46, notes: "~24% Asian population, one of most diverse CDs nationally" },
  { id: "NY-04", state: "NY", district: 4, rep: "Laura Gillen", party: "D", indianPop: 30000, indianPct: 3.9, totalPop: 769000, cook2026: "Lean D", cookPVI: "EVEN", biden2020: 56, harris2024: 50, indianRep: false, metro: "Long Island/Nassau", densityScore: 62, persuasionScore: 88, notes: "Tossup moving to Lean D — Indian voters potential swing" },
  { id: "CA-14", state: "CA", district: 14, rep: "Eric Swalwell", party: "D", indianPop: 30000, indianPct: 3.9, totalPop: 769000, cook2026: "Solid D", cookPVI: "D+19", biden2020: 68, harris2024: 65, indianRep: false, metro: "Tri-Valley/East Bay", densityScore: 71, persuasionScore: 38, notes: "Dublin/Pleasanton — one of fastest-growing Indian American suburbs in CA. Swalwell sits on Intel Committee.", strategic: true },
  { id: "NJ-05", state: "NJ", district: 5, rep: "Josh Gottheimer", party: "D", indianPop: 35000, indianPct: 4.6, totalPop: 761000, cook2026: "Likely D", cookPVI: "D+5", biden2020: 55, harris2024: 53, indianRep: false, metro: "Bergen County", densityScore: 73, persuasionScore: 65, notes: "Bergen County — NJ's other major Indian corridor. Gottheimer co-chairs Problem Solvers Caucus, historically competitive district.", strategic: true },
  { id: "MD-08", state: "MD", district: 8, rep: "Jamie Raskin", party: "D", indianPop: 28000, indianPct: 3.6, totalPop: 778000, cook2026: "Solid D", cookPVI: "D+24", biden2020: 72, harris2024: 70, indianRep: false, metro: "Montgomery County", densityScore: 64, persuasionScore: 34, notes: "MoCo has large, politically active Indian professional community. Raskin is ranking member of Oversight Committee.", strategic: true },
  { id: "CA-32", state: "CA", district: 32, rep: "Brad Sherman", party: "D", indianPop: 22000, indianPct: 2.9, totalPop: 759000, cook2026: "Solid D", cookPVI: "D+17", biden2020: 66, harris2024: 64, indianRep: false, metro: "San Fernando Valley", densityScore: 52, persuasionScore: 36, notes: "Sherman co-chairs the Congressional India Caucus — the primary legislative vehicle for Indian American policy interests in Congress. Included for strategic relevance.", strategic: true },
];

const SENATE_RACES = [
  { state: "Georgia", incumbent: "Jon Ossoff", party: "D", rating: "Toss Up", indianPop: 175000, indianPct: 1.6, notes: "Gwinnett County is key — large Indian population in Atlanta suburbs", keyMetros: "Atlanta, Augusta", trumpMargin2024: "+2" },
  { state: "Michigan", incumbent: "Open (Peters retiring)", party: "D", rating: "Toss Up", indianPop: 120000, indianPct: 1.2, notes: "Troy/Novi corridor has significant Indian community", keyMetros: "Detroit, Ann Arbor", trumpMargin2024: "+1" },
  { state: "Maine", incumbent: "Susan Collins", party: "R", rating: "Toss Up", indianPop: 5000, indianPct: 0.4, notes: "Small Indian population but nationally watched race", keyMetros: "Portland, Bangor", trumpMargin2024: "-7 (Harris)" },
  { state: "North Carolina", incumbent: "Open (Tillis retiring)", party: "R", rating: "Toss Up", indianPop: 95000, indianPct: 0.9, notes: "Charlotte and Research Triangle have growing Indian communities; Roy Cooper running", keyMetros: "Charlotte, Raleigh-Durham", trumpMargin2024: "+3" },
  { state: "Ohio (Special)", incumbent: "Jon Husted (appointed)", party: "R", rating: "Lean R", indianPop: 65000, indianPct: 0.6, notes: "Sherrod Brown running; Columbus has growing Indian tech presence", keyMetros: "Columbus, Cleveland, Cincinnati", trumpMargin2024: "+11" },
  { state: "Texas", incumbent: "John Cornyn", party: "R", rating: "Lean R", indianPop: 430000, indianPct: 1.4, notes: "LARGEST Indian American population of any state up in 2026", keyMetros: "Houston, Dallas, Austin, San Antonio", trumpMargin2024: "+5" },
  { state: "Alaska", incumbent: "Dan Sullivan", party: "R", rating: "Lean R", indianPop: 3000, indianPct: 0.4, notes: "Mary Peltola running; minimal Indian population", keyMetros: "Anchorage", trumpMargin2024: "+10" },
  { state: "Iowa", incumbent: "Open (Ernst retiring)", party: "R", rating: "Lean R", indianPop: 15000, indianPct: 0.5, notes: "Small but growing Indian population in Des Moines metro", keyMetros: "Des Moines, Iowa City", trumpMargin2024: "+12" },
  { state: "Minnesota", incumbent: "Open (Smith retiring)", party: "D", rating: "Lean D", indianPop: 42000, indianPct: 0.7, notes: "Twin Cities has established Indian community", keyMetros: "Minneapolis-St. Paul", trumpMargin2024: "-4 (Harris)" },
  { state: "New Hampshire", incumbent: "Open (Shaheen retiring)", party: "D", rating: "Lean D", indianPop: 12000, indianPct: 0.9, notes: "Small state but Indian professionals in tech corridor", keyMetros: "Manchester, Nashua", trumpMargin2024: "-4 (Harris)" },
  { state: "New Jersey", incumbent: "Cory Booker", party: "D", rating: "Solid D", indianPop: 380000, indianPct: 4.1, notes: "SECOND LARGEST Indian American state pop", keyMetros: "Edison, Jersey City, Newark", trumpMargin2024: "-6 (Harris)" },
  { state: "Illinois", incumbent: "Open (Durbin retiring)", party: "D", rating: "Solid D", indianPop: 210000, indianPct: 1.6, notes: "Schaumburg/Naperville suburbs have major Indian concentrations", keyMetros: "Chicago, Naperville", trumpMargin2024: "-12 (Harris)" },
  { state: "Florida (Special)", incumbent: "Appointed (Rubio resigned)", party: "R", rating: "Likely R", indianPop: 160000, indianPct: 0.7, notes: "Growing Indian population in South Florida and Tampa Bay", keyMetros: "Miami, Tampa, Orlando", trumpMargin2024: "+13" },
  { state: "Kentucky", incumbent: "Open (McConnell retiring)", party: "R", rating: "Solid R", indianPop: 18000, indianPct: 0.4, notes: "Louisville has small Indian community", keyMetros: "Louisville, Lexington", trumpMargin2024: "+26" },
  { state: "Nebraska (Independent)", incumbent: "Pete Ricketts", party: "R", rating: "Lean R", indianPop: 10000, indianPct: 0.5, notes: "Dan Osborn running as independent", keyMetros: "Omaha, Lincoln", trumpMargin2024: "+17 (statewide)" },
];

const FBI_TREND_DATA = [
  { year: 2015, antiAsian: 111, antiSikh: 6, antiHindu: 11 },
  { year: 2016, antiAsian: 124, antiSikh: 7, antiHindu: 12 },
  { year: 2017, antiAsian: 131, antiSikh: 60, antiHindu: 18 },
  { year: 2018, antiAsian: 148, antiSikh: 60, antiHindu: 13 },
  { year: 2019, antiAsian: 158, antiSikh: 65, antiHindu: 17 },
  { year: 2020, antiAsian: 274, antiSikh: 89, antiHindu: 19 },
  { year: 2021, antiAsian: 746, antiSikh: 185, antiHindu: 28 },
  { year: 2022, antiAsian: 499, antiSikh: 171, antiHindu: 36 },
  { year: 2023, antiAsian: 430, antiSikh: 156, antiHindu: 40 },
  { year: 2024, antiAsian: 400, antiSikh: 142, antiHindu: 38 },
];

const TEMPLE_INCIDENTS = [
  { date: "2025-03-08", location: "Chino Hills, CA", target: "BAPS Shri Swaminarayan Mandir", type: "Vandalism", bias: "Anti-Hindu", description: "Marble sign, brick wall & sidewalk spray-painted; $15,000+ damage during Holi.", severity: "high", source: "Religion News Service" },
  { date: "2025-08-04", location: "Los Angeles, CA", target: "Sikh Gurdwara of LA", type: "Assault", bias: "Anti-Sikh", description: "70-year-old Harpal Singh brutally assaulted near gurdwara. Suspect charged with attempted murder.", severity: "critical", source: "Sikh Coalition" },
  { date: "2024-09-26", location: "Sacramento, CA", target: "BAPS Swaminarayan Mandir", type: "Vandalism", bias: "Anti-Hindu", description: "'Hindus go back' graffiti, 2nd time in 10 days. Water lines cut.", severity: "high", source: "Sacramento Sheriff" },
  { date: "2024-09-16", location: "Melville, NY", target: "BAPS Shri Swaminarayan Mandir", type: "Vandalism", bias: "Anti-Hindu", description: "'Hindustan Murdabad' spray-painted before PM Modi visit.", severity: "high", source: "Religion News Service" },
  { date: "2024-07-01", location: "Indianapolis, IN", target: "BAPS Mandir", type: "Vandalism", bias: "Anti-Hindu", description: "4th nearly identical BAPS vandalism in one year.", severity: "high", source: "HAF" },
  { date: "2024-01-05", location: "Hayward, CA", target: "Vijay's Sherawali Temple", type: "Vandalism", bias: "Anti-Hindu / Pro-Khalistani", description: "Pro-Khalistani slogans. Classified as hate crime.", severity: "medium", source: "CoHNA" },
  { date: "2022-10-30", location: "Edison, NJ", target: "Shree Umiya Dham Hindu Temple", type: "Vandalism", bias: "Anti-Hindu", description: "'Free Palestine' graffiti.", severity: "medium", source: "CoHNA" },
  { date: "2021-04-15", location: "Indianapolis, IN", target: "FedEx Facility (Sikh workers)", type: "Mass Shooting", bias: "Anti-Sikh", description: "4 Sikh Americans among 8 killed. Shooter had far-right ties.", severity: "critical", source: "FBI" },
  { date: "2012-08-05", location: "Oak Creek, WI", target: "Sikh Temple of Wisconsin", type: "Mass Shooting", bias: "White Supremacist", description: "Neo-Nazi killed 6 worshippers. Catalyst for FBI anti-Sikh tracking.", severity: "critical", source: "FBI / DOJ" },
];

const DISCOURSE_EVENTS = [
  { date: "2026-01", type: "legislation", valence: "positive", actor: "119th Congress", event: "H.R. 7100 — Sikh American Anti-Discrimination Act introduced", detail: "Defines anti-Sikh hate, improves FBI tracking, addresses transnational repression. Bipartisan sponsors.", source: "Congress.gov" },
  { date: "2025-08", type: "data", valence: "neutral", actor: "FBI", event: "2024 Hate Crime Statistics released", detail: "Sikhs remain 3rd most targeted religious group. Anti-Asian incidents 3x pre-pandemic baseline. 11,679 total incidents.", source: "FBI UCR" },
  { date: "2025-03", type: "incident", valence: "negative", actor: "Unknown", event: "BAPS Temple vandalized in Chino Hills during Holi", detail: "10th reported temple incident since 2022. $15,000+ damage. Coordinated pattern across BAPS mandirs.", source: "Religion News Service" },
  { date: "2024-12", type: "policy", valence: "positive", actor: "White House", event: "National Strategy to Counter Islamophobia includes Sikh protections", detail: "Strategy acknowledges anti-Sikh bias requires greater federal effort. First executive-level recognition of Sikh-specific hate.", source: "White House" },
  { date: "2024-09", type: "legislation", valence: "positive", actor: "Senate Judiciary Committee", event: "Hearing: 'Stemming the Tide of Hate Crimes in America'", detail: "Sikh Coalition secured community testimonials from Oak Creek survivors. Sikh perspectives included in official record.", source: "Sikh Coalition" },
  { date: "2024-09", type: "incident", valence: "negative", actor: "Unknown", event: "Two BAPS temples vandalized in 10 days (NY, Sacramento)", detail: "Anti-India, anti-Hindu graffiti. Suffolk County and Sacramento Sheriff both classify as hate crimes.", source: "Multiple" },
  { date: "2024-03", type: "advocacy", valence: "positive", actor: "Samosa Caucus", event: "Five Indian American members of Congress write DOJ demanding action", detail: "Letter to Assistant AG Kristen Clarke requesting briefing on Hindu temple vandalism investigations and broader anti-Hindu hate strategy.", source: "Religion News Service" },
  { date: "2024-01", type: "electoral", valence: "positive", actor: "Suhas Subramanyam", event: "First Indian American from East Coast elected to Congress", detail: "VA-10 victory. Represents Northern Virginia's large Indian American community. Signals growing political power.", source: "AP" },
  { date: "2023-10", type: "rhetoric", valence: "negative", actor: "Multiple", event: "Post-October 7 spike in bias incidents affects South Asian communities", detail: "Mistaken-identity incidents increase. Anti-Muslim hate spills into anti-Sikh and anti-Hindu targeting. FBI data later confirms trend.", source: "AAJC / Stop AAPI Hate" },
  { date: "2022-10", type: "rhetoric", valence: "negative", actor: "Teaneck Democratic Committee", event: "Municipal resolution criticized as anti-Hindu by community groups", detail: "NJ municipal committee resolution framed by CoHNA and allied organizations as promoting Hinduphobic narrative. Became flashpoint for diaspora politics.", source: "CoHNA / local media" },
  { date: "2022-00", type: "research", valence: "neutral", actor: "Rutgers Network Contagion Lab", event: "Study documents 'widespread, insidious' Hinduphobia online and in person", detail: "Peer-reviewed research establishing patterns of online anti-Hindu hate and its migration to real-world incidents. Cited by advocacy organizations.", source: "Rutgers University" },
  { date: "2021-05", type: "legislation", valence: "positive", actor: "Congress", event: "COVID-19 Hate Crimes Act enacted with NO HATE Act provisions", detail: "Jabara-Heyer provisions improve hate crime reporting infrastructure. Implementation monitored by Sikh Coalition.", source: "Congress.gov" },
  { date: "2020-03", type: "rhetoric", valence: "negative", actor: "Multiple", event: "COVID-19 pandemic triggers surge in anti-Asian hate", detail: "Indian Americans caught in wave of anti-Asian violence. FBI reports 168% increase in anti-Asian incidents 2020-2021. 'Kung flu' rhetoric from political leaders.", source: "FBI / Stop AAPI Hate" },
];

const NARRATIVE_ITEMS = [
  {
    narrative: "H-1B Crackdown Anxiety",
    description: "Widespread fear that current or future administration will restrict H-1B renewals, revoke EADs for spouses, or implement 'Buy American Hire American' enforcement targeting Indian nationals who hold ~72% of all H-1B visas.",
    intensity: "high",
    platforms: ["WhatsApp Channels", "X/Twitter", "r/ABCDesis", "YouTube"],
    sampleFraming: "My friend got an RFE on his H-1B renewal that was rubber-stamped for 10 years. Something has changed.",
    direction: "growing",
    dateRange: "Nov 2024 – present",
    lastUpdated: "Updated Feb 2026",
  },
  {
    narrative: "Tariff Impact on Small Business",
    description: "Indian American small business owners — particularly in the NJ/NY Edison corridor and Texas — reporting that tariffs on Indian imports (spices, textiles, specialty goods) are devastating margins. Directly linked to the 2025 NJ governor's race bounceback toward Democrats.",
    intensity: "high",
    platforms: ["WhatsApp Channels", "American Bazaar", "AAHOA Forums", "X/Twitter"],
    sampleFraming: "My grocery import costs went up 35% overnight. Nobody in DC cares about legal immigrants who built businesses here.",
    direction: "growing",
    dateRange: "Mar 2025 – present",
    lastUpdated: "Updated Feb 2026",
  },
  {
    narrative: "Anti-Indian Sentiment from MAGA Base",
    description: "Concern about explicitly anti-Indian rhetoric from segments of the MAGA coalition online — distinct from anti-Asian sentiment broadly. Accelerated after Usha Vance became a target during the 2024 VP campaign and continued through anti-H-1B discourse from the populist right.",
    intensity: "medium",
    platforms: ["X/Twitter", "Reddit", "YouTube Comments", "Diya TV"],
    sampleFraming: "They want our votes and our donations but their base posts 'India First not America First' under every story about us.",
    direction: "stable",
    dateRange: "Jul 2024 – present",
    lastUpdated: "Updated Feb 2026",
  },
  {
    narrative: "Caste Legislation Backlash",
    description: "Continued polarization over SB 403-style caste discrimination bills. Hindu American groups frame them as targeting Hindus specifically; progressive South Asian groups frame opposition as caste denialism. Newsom's veto didn't resolve the underlying tension.",
    intensity: "medium",
    platforms: ["X/Twitter", "Reddit", "Hindu American Foundation", "Equality Labs"],
    sampleFraming: "Adding caste to civil rights law singles out one religion. No other community has its internal practices legislated like this.",
    direction: "stable",
    dateRange: "Sep 2023 – present",
    lastUpdated: "Updated Feb 2026",
  },
  {
    narrative: "Temple Security Fears",
    description: "After the 2024-2025 cluster of BAPS temple vandalisms (Sacramento, Melville, Chino Hills) and continued Sikh gurdwara threats, community discourse around physical safety has intensified. Parents expressing concern about sending children to Sunday school programs.",
    intensity: "medium",
    platforms: ["WhatsApp Channels", "Community Listservs", "r/ABCDesis", "Diya TV"],
    sampleFraming: "After Melville and Sacramento, our temple installed cameras and hired security. We never had to think about this before.",
    direction: "growing",
    dateRange: "Oct 2024 – present",
    lastUpdated: "Updated Feb 2026",
  },
  {
    narrative: "Political Dealignment Discourse",
    description: "Growing conversation — especially among younger Indian Americans — that neither party adequately represents Indian American interests. Democratic Party seen as focused on identity politics; Republican Party's base seen as hostile. Increasing interest in issue-by-issue evaluation rather than party loyalty.",
    intensity: "medium",
    platforms: ["r/ABCDesis", "X/Twitter", "YouTube", "Substack"],
    sampleFraming: "I voted D my whole life but the party treats us like a guaranteed vote. I'm not going R either. I'm done with both.",
    direction: "growing",
    dateRange: "Nov 2024 – present",
    lastUpdated: "Updated Feb 2026",
  },
  {
    narrative: "Vivek Effect and Conservative Identity",
    description: "Ramaswamy's 2024 primary run opened a visible lane for Indian American conservative identity. Post-campaign, a subset of young Indian American men are engaged with right-of-center media and podcasts. Distinct from BJP diaspora politics — this is domestically rooted American conservatism.",
    intensity: "low",
    platforms: ["X/Twitter", "YouTube", "Podcasts"],
    sampleFraming: "Vivek proved you can be proudly Indian and proudly conservative without apologizing for either.",
    direction: "fading",
    dateRange: "Jan 2024 – mid 2025",
    lastUpdated: "Updated Feb 2026",
  },
];

const DENSITY_METHODS = [
  { name: "Census ACS Data", weight: 40, description: "Asian Indian alone population from ACS 5-Year Estimates (Table B02015), mapped to 119th congressional districts.", icon: "📊" },
  { name: "FEC Donor Surname Analysis", weight: 20, description: "FEC individual contribution data filtered using validated South Asian surname lists (methodology from AAPI Data/Karthick Ramakrishnan).", icon: "💰" },
  { name: "Cultural Business Density", weight: 20, description: "Google Places API density of Indian restaurants, grocery stores, temples/gurdwaras, and cultural centers per capita.", icon: "🏪" },
  { name: "Google Trends Proxy", weight: 15, description: "DMA-level search interest for terms like 'Diwali', 'Indian grocery', 'H-1B visa', 'cricket score'.", icon: "🔍" },
  { name: "USCIS H-1B & DOL PERM Data", weight: 5, description: "H-1B employer location data and DOL PERM labor certification volumes (FY2008–FY2024) as proxies for recent immigration clusters and employer-sponsored green card demand not yet captured by census.", icon: "📋" },
];

const PERSUASION_METHODS = [
  { name: "District Competitiveness", weight: 30, description: "Cook PVI and 2026 race rating. Toss Up and Lean districts score highest — persuasion only matters where outcomes are contested. Solid D/R districts score low regardless of Indian American population size.", icon: "⚖️" },
  { name: "2020→2024 Swing Magnitude", weight: 25, description: "Measured shift in the Indian American vote from Biden 2020 to Harris 2024 using precinct-level returns from heavily Indian American precincts. Larger swings indicate demonstrated persuadability — voters who moved once can move again.", icon: "📈" },
  { name: "Independent Identification Rate", weight: 20, description: "District-level proxy derived from Carnegie IAAS party ID data applied to state-level weights. The 11-point national surge in Indian American Independent identification (15%→26%) varies by region — districts in dealigning metros score higher.", icon: "🔀" },
  { name: "Indian American Population Size", weight: 15, description: "Absolute number of Indian American eligible voters. A high persuasion score in a district with 2,000 Indian Americans is less actionable than a moderate score in a district with 60,000.", icon: "👥" },
  { name: "Bounceback Evidence", weight: 10, description: "Where available, 2025 off-cycle election data (NJ governor, VA local) showing whether the 2024 rightward shift held or reverted. Districts showing bounceback receive higher persuasion scores because the electorate is actively in motion.", icon: "🔄" },
];
// Source: Carnegie Endowment IAAS 2024, AAPI Data, precinct returns, Pew Validated Voter Study, Catalist

const PRES_VOTE_TREND = [
  { year: 2004, dem: 53, gop: 39, label: "Kerry/Bush", source: "NAAS" },
  { year: 2008, dem: 84, gop: 12, label: "Obama/McCain", source: "NAAS" },
  { year: 2012, dem: 84, gop: 15, label: "Obama/Romney", source: "NAAS" },
  { year: 2016, dem: 77, gop: 16, label: "Clinton/Trump", source: "NAAS/IAAS" },
  { year: 2020, dem: 68, gop: 22, label: "Biden/Trump", source: "IAAS 2020" },
  { year: 2024, dem: 61, gop: 32, label: "Harris/Trump", source: "IAAS 2024" },
];

const GENDER_AGE_VOTE = [
  { group: "Men 18–39", harris: 44, trump: 48, shift: "+22 Trump", flag: true },
  { group: "Women 18–39", harris: 63, trump: 29, shift: "+10 Trump", flag: false },
  { group: "Men 40+", harris: 63, trump: 33, shift: "+4 Trump", flag: false },
  { group: "Women 40+", harris: 73, trump: 21, shift: "+5 Trump", flag: false },
];

const PARTY_ID = [
  { year: "2020", dem: 56, gop: 18, ind: 15 },
  { year: "2024", dem: 47, gop: 21, ind: 26 },
];

const TOP_ISSUES = [
  { issue: "Economy & inflation", pct: 72 },
  { issue: "Healthcare costs", pct: 58 },
  { issue: "Immigration policy", pct: 51 },
  { issue: "Abortion / reproductive rights", pct: 48 },
  { issue: "National security", pct: 44 },
  { issue: "Cost of housing", pct: 41 },
  { issue: "Education", pct: 38 },
  { issue: "US-India relations", pct: 14 },
];

const PRECINCT_SWINGS = [
  { place: "Edison, NJ", desc: "'Little India' of East Coast, ~25% Indian", swing: "~50 pts → R", biden2020: "+32 D", trump2024: "~+15 R", note: "Flipped R at presidential level; swung back D in 2025 governor's race (Ciattarelli only 33%)" },
  { place: "Fremont, CA", desc: "Large Indian tech community in Silicon Valley", swing: "20 pts → R", biden2020: "+40 D", trump2024: "+20 D", note: "Still D, but one of the largest rightward shifts in the Bay Area" },
  { place: "Cupertino, CA", desc: "Apple HQ, major Indian population", swing: "11 pts → R", biden2020: "+50 D", trump2024: "+39 D", note: "Still deep blue, but significant erosion" },
  { place: "Sugar Land, TX", desc: "Fort Bend County, fastest-growing Indian community in TX", swing: "8 pts → R", biden2020: "+8 D", trump2024: "Even/+1 R", note: "Near flip; Indian and Asian communities were decisive margin" },
  { place: "Plainsboro, NJ", desc: "Princeton Junction corridor, high Indian density", swing: "~25 pts → R", biden2020: "+40 D", trump2024: "+15 D", note: "Dramatic shift in a highly educated, high-income South Asian enclave" },
  { place: "Troy, MI", desc: "Detroit suburb, established Indian community", swing: "12 pts → R", biden2020: "+18 D", trump2024: "+6 D", note: "Part of the broader Michigan suburban shift" },
];

const ELECTION_KEY_STATS = {
  eligible: "2.6M",
  turnout: "~70%",
  harris: "61%",
  trump: "32%",
  shift: "+10 pts → R since 2020",
  demId: "47% (↓9)",
  gopId: "21% (same)",
  indId: "26% (↑11)",
  youngMenTrump: "48%",
  surveySrc: "Carnegie IAAS 2024 (n=714, ±3.7%)",
};

// ═══════════════════════════════════════════════════════════
// DESIGN SYSTEM
// ═══════════════════════════════════════════════════════════

const C = {
  // Surfaces
  bg: "#FAF8F3",
  surface: "#FFFFFF",
  surfaceAlt: "#F5F2EB",
  // Borders: two-tier system
  border: "#8F8778",          // structural borders: cards, controls (3.5:1 on white, 3.35:1 on base)
  borderLight: "#E8E3D8",     // hairline dividers: table rows, section breaks
  // Typography
  text: "#1E2D3D",
  textSecondary: "#4A5568",   // body copy secondary
  textMuted: "#6B7280",       // raised from #94A3B8 — passes 4.5:1 on white
  // Brand: saffron
  saffron: "#D97706",         // NON-TEXT only: underlines, chart bars, indicators, icons ≥24px
  saffronText: "#92400E",     // TEXT-SAFE: passes 4.5:1 on white (#FFF) and base (#FAF8F3)
  saffronDark: "#B45309",     // white-text-on-saffron buttons/chips (passes 4.5:1)
  saffronLight: "#FEF3C7",
  saffronBg: "#FFFBEB",
  // Structural brand
  navy: "#1E3A5F",            // headers, section titles, structural chrome (NOT interactive)
  navyLight: "#E8EDF4",
  // Interactive
  action: "#1E40AF",          // links, primary buttons, toggles, selected states
  actionLight: "#DBEAFE",
  // Party coding (categorical, not severity)
  dem: "#1E40AF",
  demLight: "#DBEAFE",
  gop: "#B91C1C",             // darkened from #DC2626 for better contrast on light bg
  gopLight: "#FEE2E2",
  gopText: "#991B1B",         // text-safe GOP red
  toss: "#7C3AED",
  tossLight: "#EDE9FE",
  // Severity (separate system from party)
  sevCritical: "#991B1B",     // death, mass casualty
  sevHigh: "#B45309",         // significant damage, coordinated
  sevMedium: "#4B5563",       // isolated
  // Sentiment
  positive: "#047857",
  positiveBg: "#ECFDF5",
  negative: "#B91C1C",
  negativeBg: "#FEF2F2",
  // Legacy aliases (severity — deprecated in favor of sev* tokens)
  red: "#9B2335",
  redLight: "#FEE2E2",
  critical: "#991B1B",
  high: "#D97706",
  medium: "#6B7280",
};

const font = {
  display: "'Roboto Slab', 'Rockwell', 'Courier New', serif",
  body: "'DM Sans', 'Helvetica Neue', sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', monospace",
};

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function getRatingColor(r) {
  if (!r) return C.textMuted;
  const l = r.toLowerCase();
  if (l.includes("toss")) return C.toss;
  if (l.includes("lean r") || l.includes("likely r")) return C.gop;
  if (l.includes("lean d") || l.includes("likely d")) return C.dem;
  if (l.includes("solid r")) return "#78716C";
  if (l.includes("solid d")) return "#64748B";
  if (l.includes("special")) return C.saffronText;
  return C.textMuted;
}
function getRatingBg(r) {
  if (!r) return "transparent";
  const l = r.toLowerCase();
  if (l.includes("toss")) return C.tossLight;
  if (l.includes("lean r") || l.includes("likely r")) return C.gopLight;
  if (l.includes("lean d") || l.includes("likely d")) return C.demLight;
  if (l.includes("solid r")) return "#F5F5F4";
  if (l.includes("solid d")) return "#F1F5F9";
  if (l.includes("special")) return C.saffronLight;
  return C.surfaceAlt;
}

const ratingOrder = { "Toss Up": 0, "Lean R": 1, "Lean D": 1, "Likely R": 2, "Likely D": 2, "Special Election": 3, "Solid R": 4, "Solid D": 4 };

// ═══════════════════════════════════════════════════════════
// DISTRICT COORDINATES (approximate center of each CD)
// ═══════════════════════════════════════════════════════════

const DISTRICT_COORDS = {
  "CA-17": [37.36, -121.97], "NJ-07": [40.63, -74.55], "IL-08": [42.03, -88.08],
  "CA-06": [38.58, -121.49], "TX-22": [29.62, -95.64], "NJ-11": [40.86, -74.40],
  "VA-10": [39.04, -77.49], "WA-07": [47.61, -122.33], "TX-10": [30.27, -96.40],
  "MI-13": [42.33, -83.05], "NJ-06": [40.52, -74.35], "GA-07": [33.96, -84.07],
  "NY-03": [40.76, -73.58], "PA-06": [40.03, -75.61], "NC-09": [35.23, -80.84],
  "TX-24": [32.81, -96.95], "CA-16": [37.34, -121.89], "NJ-12": [40.35, -74.66],
  "VA-11": [38.83, -77.28], "NY-04": [40.72, -73.56], "CA-14": [37.70, -121.93],
  "NJ-05": [41.00, -74.15], "MD-08": [39.08, -77.15], "CA-32": [34.19, -118.53],
};

// ═══════════════════════════════════════════════════════════
// MAP COMPONENT
// ═══════════════════════════════════════════════════════════

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length) map.fitBounds(bounds, { padding: [30, 30] });
  }, [bounds, map]);
  return null;
}

function DistrictMap({ districts, colorMode, onSelect, selectedId, isMobile }) {
  const bounds = useMemo(() => {
    const coords = districts.map(d => DISTRICT_COORDS[d.id]).filter(Boolean);
    return coords.length ? coords : [[25, -125], [50, -65]];
  }, [districts]);

  const getColor = (d) => {
    if (colorMode === "persuasion") {
      return d.persuasionScore >= 80 ? "#7C3AED" : d.persuasionScore >= 60 ? "#8B5CF6" : "#C4B5FD";
    }
    if (colorMode === "party") {
      return d.party === "D" ? C.dem : C.gop;
    }
    // default: density
    return d.densityScore > 80 ? "#B45309" : d.densityScore > 60 ? C.saffron : "#FBBF24";
  };

  const getRadius = (d) => {
    const base = isMobile ? 7 : 10;
    const pop = d.indianPop || 30000;
    return base + Math.sqrt(pop / 10000) * (isMobile ? 2 : 3);
  };

  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}` }}>
      <MapContainer
        center={[37.5, -96]}
        zoom={4}
        style={{ height: isMobile ? 300 : 420, width: "100%", background: C.bg }}
        scrollWheelZoom={false}
        zoomControl={!isMobile}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />
        <FitBounds bounds={bounds} />
        {districts.map(d => {
          const coord = DISTRICT_COORDS[d.id];
          if (!coord) return null;
          const isSelected = selectedId === d.id;
          return (
            <CircleMarker
              key={d.id}
              center={coord}
              radius={getRadius(d)}
              pathOptions={{
                fillColor: getColor(d),
                fillOpacity: isSelected ? 1 : 0.7,
                color: isSelected ? C.navy : "#fff",
                weight: isSelected ? 3 : 1.5,
              }}
              eventHandlers={{ click: () => onSelect(d.id) }}
            >
              <Popup>
                <div style={{ fontFamily: font.body, minWidth: 180 }}>
                  <div style={{ fontFamily: font.mono, fontWeight: 700, fontSize: 15, color: d.party === "D" ? C.dem : C.gop, marginBottom: 2 }}>{d.id}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                    {d.rep}
                    {d.indianRep && <span style={{ marginLeft: 4, fontSize: 9, color: C.saffronText, fontWeight: 700 }}>IA</span>}
                  </div>
                  <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.6 }}>
                    {d.metro}<br />
                    Indian pop: {(d.indianPop / 1000).toFixed(0)}K ({d.indianPct}%)<br />
                    Rating: {d.cook2026}<br />
                    Density: <strong style={{ color: C.saffronText }}>{d.densityScore}</strong> · Persuasion: <strong style={{ color: "#6D28D9" }}>{d.persuasionScore}</strong>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════

function Card({ children, style = {} }) {
  return <div style={{
    background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`,
    boxShadow: "0 1px 3px rgba(30,45,61,0.04), 0 1px 2px rgba(30,45,61,0.02)",
    ...style
  }}>{children}</div>;
}

function Badge({ children, color = C.textMuted, bg = C.surfaceAlt }) {
  return <span style={{
    display: "inline-block", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 4,
    fontFamily: font.mono, letterSpacing: 0.5, background: bg, color, whiteSpace: "nowrap",
  }}>{children}</span>;
}

function StatBox({ label, value, sub, accent, compact }) {
  return (
    <div style={{ padding: compact ? "10px 12px" : "14px 16px" }}>
      <div style={{ fontSize: compact ? 9 : 10, fontWeight: 600, color: C.textMuted, fontFamily: font.mono, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: compact ? 4 : 6 }}>{label}</div>
      <div style={{ fontSize: compact ? 22 : 28, fontWeight: 800, fontFamily: font.mono, color: accent || C.navy, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: compact ? 10 : 11, color: C.textSecondary, fontFamily: font.body, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function DensityBar({ score }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
      <div style={{ flex: 1, height: 6, background: C.borderLight, borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          width: `${score}%`, height: "100%", borderRadius: 3,
          background: score > 80 ? `linear-gradient(90deg, ${C.saffron}, #B45309)` : score > 60 ? C.saffron : C.textMuted,
          transition: "width 0.6s ease"
        }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: font.mono, color: score > 80 ? C.saffronText : C.textSecondary, minWidth: 28 }}>{score}</span>
    </div>
  );
}

function PersuasionBar({ score }) {
  const getColor = (s) => s >= 80 ? "#7C3AED" : s >= 60 ? "#8B5CF6" : "#A78BFA";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
      <div style={{ flex: 1, height: 6, background: C.borderLight, borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          width: `${score}%`, height: "100%", borderRadius: 3,
          background: score >= 80 ? `linear-gradient(90deg, #8B5CF6, #7C3AED)` : score >= 60 ? "#8B5CF6" : "#A78BFA",
          transition: "width 0.6s ease"
        }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: font.mono, color: score >= 80 ? "#6D28D9" : C.textSecondary, minWidth: 28 }}>{score}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function IndianAmericanVoterAtlas() {
  const [tab, setTab] = useState("house");
  const [sortKey, setSortKey] = useState("densityScore");
  const [sortDir, setSortDir] = useState("desc");
  const [filterCompetitive, setFilterCompetitive] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [expandedSenate, setExpandedSenate] = useState(null);
  const [senateSortKey, setSenateSortKey] = useState("rating");
  const [hateFilter, setHateFilter] = useState("all");
  const [expandedIncident, setExpandedIncident] = useState(null);
  const [discourseFilter, setDiscourseFilter] = useState("all");
  const [discourseSection, setDiscourseSection] = useState("timeline");
  const [mapColorMode, setMapColorMode] = useState("density");
  const [permSubTab, setPermSubTab] = useState("trend");
  const [permDistrict, setPermDistrict] = useState("TX-22");
  const [permEmpDistrict, setPermEmpDistrict] = useState("TX-22");
  const [permEmpYear, setPermEmpYear] = useState("");
  const [loaded, setLoaded] = useState(false);
  const isMobile = useIsMobile();

  // Live data state — initialized with hardcoded defaults, overwritten by Supabase
  const [districts, setDistricts] = useState(DISTRICTS);
  const [senateRaces, setSenateRaces] = useState(SENATE_RACES);
  const [fbiTrendData, setFbiTrendData] = useState(FBI_TREND_DATA);
  const [templeIncidents, setTempleIncidents] = useState(TEMPLE_INCIDENTS);
  const [discourseEvents, setDiscourseEvents] = useState(DISCOURSE_EVENTS);
  const [narrativeItems, setNarrativeItems] = useState(NARRATIVE_ITEMS);
  const [presVoteTrend, setPresVoteTrend] = useState(PRES_VOTE_TREND);
  const [genderAgeVote, setGenderAgeVote] = useState(GENDER_AGE_VOTE);
  const [partyId, setPartyId] = useState(PARTY_ID);
  const [topIssues, setTopIssues] = useState(TOP_ISSUES);
  const [precinctSwings, setPrecinctSwings] = useState(PRECINCT_SWINGS);
  const [permDistrictData, setPermDistrictData] = useState([]);
  const [permStateData, setPermStateData] = useState([]);

  useEffect(() => { setLoaded(true); }, []);

  // Fetch from Supabase — silent fallback to hardcoded data on error
  useEffect(() => {
    async function load() {
      try {
        const [dist, sen, fbi, inc, disc, narr, pres, gender, pid, issues, prec, permDist, permSt] = await Promise.all([
          supaFetch("districts"), supaFetch("senate_races"), supaFetch("fbi_trend_data"),
          supaFetch("temple_incidents"), supaFetch("discourse_events"), supaFetch("narrative_items"),
          supaFetch("pres_vote_trend"), supaFetch("gender_age_vote"), supaFetch("party_id"),
          supaFetch("top_issues"), supaFetch("precinct_swings"),
          supaFetch("h1b_perm_by_district"), supaFetch("h1b_state_summary"),
        ]);
        if (dist.length) setDistricts(dist.map(mapDistrict));
        if (sen.length) setSenateRaces(sen.map(mapSenate));
        if (fbi.length) setFbiTrendData(fbi.map(mapFbi));
        if (inc.length) setTempleIncidents(inc.map(mapIncident));
        if (disc.length) setDiscourseEvents(disc.map(mapDiscourse));
        if (narr.length) setNarrativeItems(narr.map(mapNarrative));
        if (pres.length) setPresVoteTrend(pres.map(mapPresVote));
        if (gender.length) setGenderAgeVote(gender.map(mapGenderAge));
        if (pid.length) setPartyId(pid.map(mapPartyId));
        if (issues.length) setTopIssues(issues.map(mapIssue));
        if (prec.length) setPrecinctSwings(prec.map(mapPrecinct));
        if (permDist.length) {
          const mapped = permDist.map(mapPermDistrict);
          setPermDistrictData(mapped);
          const dists = [...new Set(mapped.map(r => r.districtId))].sort();
          if (dists.includes("TX-22")) { setPermDistrict("TX-22"); setPermEmpDistrict("TX-22"); }
          else if (dists.length) { setPermDistrict(dists[0]); setPermEmpDistrict(dists[0]); }
          const years = [...new Set(mapped.map(r => r.dataFiscalYear))].sort().reverse();
          if (years.length) setPermEmpYear(years[0]);
        }
        if (permSt.length) setPermStateData(permSt.map(mapPermState));
      } catch (e) {
        console.warn("Supabase fetch failed, using defaults:", e.message);
      }
    }
    load();
  }, []);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  let sortedDistricts = [...districts];
  if (filterCompetitive) sortedDistricts = sortedDistricts.filter(d => d.cook2026.includes("Lean") || d.cook2026.includes("Toss") || d.cook2026.includes("Special"));
  sortedDistricts.sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (sortKey === "cook2026") { av = ratingOrder[av] ?? 5; bv = ratingOrder[bv] ?? 5; }
    if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === "desc" ? bv - av : av - bv;
  });

  let sortedSenate = [...senateRaces].sort((a, b) => {
    if (senateSortKey === "rating") return (ratingOrder[a.rating] ?? 5) - (ratingOrder[b.rating] ?? 5);
    if (senateSortKey === "indianPop") return b.indianPop - a.indianPop;
    return a.state.localeCompare(b.state);
  });

  // PERM cumulative by district for cross-tab reference
  const permCumulative = useMemo(() => {
    const cum = {};
    permDistrictData.forEach(r => {
      cum[r.districtId] = (cum[r.districtId] || 0) + (r.permIndia || 0);
    });
    return cum;
  }, [permDistrictData]);

  const tabs = [
    { key: "house", label: "House Districts" },
    { key: "senate", label: "Senate 2026" },
    { key: "election", label: "2024 Election" },
    { key: "safety", label: "Community Safety" },
    { key: "discourse", label: "Discourse Monitor" },
    { key: "perm", label: "DOL PERM Data" },
    { key: "methodology", label: "Methodology" },
  ];

  return (
    <div style={{
      fontFamily: font.body, background: C.bg, color: C.text, minHeight: "100vh",
      transition: "opacity 0.5s", opacity: loaded ? 1 : 0,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;500;600;700;800;900&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <header style={{
        background: C.navy, color: "#FFFFFF", padding: isMobile ? "20px 16px 16px" : "28px 32px 20px",
        borderBottom: `3px solid ${C.saffron}`
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: isMobile ? "start" : "baseline", gap: isMobile ? 6 : 12, flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 800, fontFamily: font.display, letterSpacing: -0.5 }}>
              Indian American Voter Atlas
            </h1>
            <span style={{ fontSize: isMobile ? 10 : 12, fontWeight: 600, fontFamily: font.mono, color: "#FCD34D", letterSpacing: 1, textTransform: "uppercase" }}>
              2026 Election Cycle
            </span>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: isMobile ? 12 : 14, color: "rgba(255,255,255,0.6)", fontFamily: font.body, maxWidth: 600 }}>
            District-level political intelligence for the fastest-growing electorate in America
          </p>
        </div>
      </header>

      {/* NAV */}
      <nav style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 1px 3px rgba(30,45,61,0.04)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 0, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: isMobile ? "10px 12px" : "14px 20px", fontSize: isMobile ? 11 : 13, fontWeight: tab === t.key ? 700 : 500,
              fontFamily: font.body, border: "none", cursor: "pointer",
              background: "transparent",
              color: tab === t.key ? C.navy : C.textMuted,
              borderBottom: tab === t.key ? `2px solid ${C.saffron}` : "2px solid transparent",
              transition: "all 0.15s", whiteSpace: "nowrap",
            }}>{t.label}</button>
          ))}
        </div>
      </nav>

      {/* CONTENT */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "20px 12px 48px" : "28px 24px 60px" }}>

        {/* ═══ HOUSE TAB ═══ */}
        {tab === "house" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: font.display, margin: "0 0 6px", color: C.navy }}>
                Congressional Districts by Indian American Presence
              </h2>
              <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, lineHeight: 1.6 }}>
                24 districts: 20 by population density + 4 by strategic relevance · Sorted by {sortKey === "densityScore" ? "Community Density Index" : sortKey === "persuasionScore" ? "Persuasion Index" : sortKey}
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["densityScore", "persuasionScore", "indianPct", "indianPop", "cook2026"].map(k => (
                  <button key={k} onClick={() => handleSort(k)} style={{
                    padding: "6px 12px", fontSize: 11, borderRadius: 6, border: `1px solid ${sortKey === k ? (k === "persuasionScore" ? "#7C3AED" : C.saffronDark) : C.border}`,
                    background: sortKey === k ? (k === "persuasionScore" ? "#EDE9FE" : C.saffronBg) : C.surface, color: sortKey === k ? (k === "persuasionScore" ? "#6D28D9" : C.saffronText) : C.textSecondary,
                    cursor: "pointer", fontFamily: font.body, fontWeight: 600, transition: "all 0.15s",
                  }}>
                    {k === "densityScore" ? "Density" : k === "persuasionScore" ? "Persuasion" : k === "indianPct" ? "% Indian" : k === "indianPop" ? "Population" : "Rating"}
                    {sortKey === k && <span style={{ marginLeft: 4 }}>{sortDir === "desc" ? "↓" : "↑"}</span>}
                  </button>
                ))}
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textSecondary, cursor: "pointer" }}>
                <input type="checkbox" checked={filterCompetitive} onChange={e => setFilterCompetitive(e.target.checked)}
                  style={{ accentColor: C.saffron }} />
                Competitive only
              </label>
            </div>

            <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 11, color: C.textMuted }}>
              <span><span style={{ color: C.saffronText, fontWeight: 700, fontFamily: font.mono }}>IA</span> = Indian American member</span>
              <span><span style={{ color: C.positive, fontWeight: 700 }}>★</span> = Included for strategic relevance (committee chair, India Caucus, etc.)</span>
            </div>

            {/* MAP */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, fontFamily: font.display, margin: 0, color: C.navy }}>District Map</h3>
                <div style={{ display: "flex", gap: 4 }}>
                  {[
                    { key: "density", label: "Density", color: C.saffron },
                    { key: "persuasion", label: "Persuasion", color: "#7C3AED" },
                    { key: "party", label: "Party", color: C.navy },
                  ].map(m => (
                    <button key={m.key} onClick={() => setMapColorMode(m.key)} style={{
                      padding: "4px 10px", fontSize: 10, borderRadius: 5, fontWeight: 600,
                      fontFamily: font.body, cursor: "pointer", transition: "all 0.15s",
                      border: `1px solid ${mapColorMode === m.key ? m.color : C.border}`,
                      background: mapColorMode === m.key ? (m.key === "density" ? C.saffronBg : m.key === "persuasion" ? "#EDE9FE" : C.navyLight) : C.surface,
                      color: mapColorMode === m.key ? m.color : C.textSecondary,
                    }}>{m.label}</button>
                  ))}
                </div>
              </div>
              <DistrictMap
                districts={sortedDistricts}
                colorMode={mapColorMode}
                selectedId={expandedRow}
                onSelect={(id) => setExpandedRow(expandedRow === id ? null : id)}
                isMobile={isMobile}
              />
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
                {mapColorMode === "density" && <>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.textMuted }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#B45309", display: "inline-block" }} /> 80+
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.textMuted }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.saffron, display: "inline-block" }} /> 60–79
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.textMuted }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FBBF24", display: "inline-block" }} /> &lt;60
                  </span>
                </>}
                {mapColorMode === "persuasion" && <>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.textMuted }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#7C3AED", display: "inline-block" }} /> 80+
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.textMuted }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#8B5CF6", display: "inline-block" }} /> 60–79
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.textMuted }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#C4B5FD", display: "inline-block" }} /> &lt;60
                  </span>
                </>}
                {mapColorMode === "party" && <>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.textMuted }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.dem, display: "inline-block" }} /> Democrat
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.textMuted }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.gop, display: "inline-block" }} /> Republican
                  </span>
                </>}
                <span style={{ fontSize: 10, color: C.textMuted }}>· Circle size = Indian American population</span>
              </div>
            </div>

            <Card>
              {/* Desktop table */}
              {!isMobile && <>
              {/* Table header */}
              <div style={{
                display: "grid", gridTemplateColumns: "68px 1fr 64px 76px 108px 100px 100px", gap: "0 8px",
                padding: "10px 16px", overflowX: "auto", borderBottom: `1px solid ${C.border}`,
                fontSize: 10, fontWeight: 700, color: C.textMuted, fontFamily: font.mono,
                textTransform: "uppercase", letterSpacing: 1,
              }}>
                <div>District</div><div>Representative</div><div style={{ textAlign: "right" }}>Indian %</div>
                <div style={{ textAlign: "right" }}>Pop.</div><div>Rating</div><div>Density</div><div>Persuasion</div>
              </div>

              {sortedDistricts.map((d, i) => (
                <div key={d.id}>
                  <div
                    onClick={() => setExpandedRow(expandedRow === d.id ? null : d.id)}
                    style={{
                      display: "grid", gridTemplateColumns: "68px 1fr 64px 76px 108px 100px 100px", gap: "0 8px",
                      padding: "12px 16px", cursor: "pointer", alignItems: "center",
                      borderBottom: `1px solid ${C.borderLight}`,
                      background: expandedRow === d.id ? C.saffronBg : i % 2 === 0 ? C.surface : C.surfaceAlt,
                      transition: "background 0.1s",
                    }}
                  >
                    <div style={{ fontFamily: font.mono, fontWeight: 700, fontSize: 14, color: d.party === "D" ? C.dem : C.gop }}>{d.id}</div>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{d.rep}</span>
                      {d.indianRep && <span style={{ marginLeft: 6, fontSize: 9, color: C.saffronText, fontWeight: 700, fontFamily: font.mono }}>IA</span>}
                      {d.strategic && <span style={{ marginLeft: 6, fontSize: 9, color: C.positive, fontWeight: 700, fontFamily: font.mono }}>★</span>}
                    </div>
                    <div style={{ textAlign: "right", fontFamily: font.mono, fontWeight: 600, fontSize: 13, color: d.indianPct > 6 ? C.saffronText : C.text }}>{d.indianPct}%</div>
                    <div style={{ textAlign: "right", fontFamily: font.mono, fontSize: 12, color: C.textSecondary }}>{(d.indianPop / 1000).toFixed(0)}K</div>
                    <div><Badge color={getRatingColor(d.cook2026)} bg={getRatingBg(d.cook2026)}>{d.cook2026}</Badge></div>
                    <DensityBar score={d.densityScore} />
                    <PersuasionBar score={d.persuasionScore} />
                  </div>
                  {expandedRow === d.id && (
                    <div style={{ padding: "14px 16px 14px 96px", background: C.saffronBg, borderBottom: `1px solid ${C.border}`, fontSize: 13, color: C.textSecondary, lineHeight: 1.7 }}>
                      <strong style={{ color: C.text }}>{d.metro}</strong> · Cook PVI: {d.cookPVI} · Harris 2024: {d.harris2024}% · Total pop: {(d.totalPop / 1000).toFixed(0)}K
                      {permCumulative[d.id] > 0 && <> · <span style={{ color: C.navy, fontWeight: 600 }}>PERM: {permCumulative[d.id].toLocaleString()}</span> cumulative India-born</>}
                      <br />{d.notes}
                    </div>
                  )}
                </div>
              ))}
              </>}

              {/* Mobile cards */}
              {isMobile && (
                <div style={{ display: "grid", gap: 0 }}>
                  {sortedDistricts.map((d, i) => (
                    <div key={d.id} onClick={() => setExpandedRow(expandedRow === d.id ? null : d.id)}
                      style={{
                        padding: "14px 16px", cursor: "pointer",
                        borderBottom: `1px solid ${C.borderLight}`,
                        background: expandedRow === d.id ? C.saffronBg : i % 2 === 0 ? C.surface : C.surfaceAlt,
                      }}>
                      {/* Row 1: District + Rep + Rating */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontFamily: font.mono, fontWeight: 700, fontSize: 15, color: d.party === "D" ? C.dem : C.gop }}>{d.id}</span>
                          <span style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{d.rep}</span>
                          {d.indianRep && <span style={{ fontSize: 9, color: C.saffronText, fontWeight: 700, fontFamily: font.mono }}>IA</span>}
                          {d.strategic && <span style={{ fontSize: 9, color: C.positive, fontWeight: 700 }}>★</span>}
                        </div>
                        <Badge color={getRatingColor(d.cook2026)} bg={getRatingBg(d.cook2026)}>{d.cook2026}</Badge>
                      </div>

                      {/* Row 2: Stats */}
                      <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 12 }}>
                        <span><span style={{ color: C.textMuted, fontFamily: font.mono }}>Indian:</span> <span style={{ fontWeight: 700, color: d.indianPct > 6 ? C.saffronText : C.text }}>{d.indianPct}%</span></span>
                        <span><span style={{ color: C.textMuted, fontFamily: font.mono }}>Pop:</span> <span style={{ fontWeight: 600 }}>{(d.indianPop / 1000).toFixed(0)}K</span></span>
                      </div>

                      {/* Row 3: Bars side by side */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 700, fontFamily: font.mono, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Density</div>
                          <DensityBar score={d.densityScore} />
                        </div>
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 700, fontFamily: font.mono, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Persuasion</div>
                          <PersuasionBar score={d.persuasionScore} />
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {expandedRow === d.id && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.textSecondary, lineHeight: 1.7 }}>
                          <strong style={{ color: C.text }}>{d.metro}</strong> · Cook PVI: {d.cookPVI} · Harris 2024: {d.harris2024}%
                          {permCumulative[d.id] > 0 && <> · <span style={{ color: C.navy, fontWeight: 600 }}>PERM: {permCumulative[d.id].toLocaleString()}</span></>}
                          <br />{d.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ═══ SENATE TAB ═══ */}
        {tab === "senate" && (
          <div>
            <div style={{ marginBottom: isMobile ? 16 : 24 }}>
              <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, fontFamily: font.display, margin: "0 0 6px", color: C.navy }}>
                2026 Senate Battleground & Indian American Footprint
              </h2>
              <p style={{ fontSize: isMobile ? 12 : 14, color: C.textSecondary, margin: 0 }}>
                35 seats up · 23 Republican-held · Democrats need net +4 for majority
              </p>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: isMobile ? 14 : 20, flexWrap: "wrap" }}>
              {["rating", "indianPop", "state"].map(k => (
                <button key={k} onClick={() => setSenateSortKey(k)} style={{
                  padding: isMobile ? "5px 10px" : "6px 14px", fontSize: isMobile ? 11 : 12, borderRadius: 6,
                  border: `1px solid ${senateSortKey === k ? C.saffronDark : C.border}`,
                  background: senateSortKey === k ? C.saffronBg : C.surface,
                  color: senateSortKey === k ? C.saffronText : C.textSecondary,
                  cursor: "pointer", fontFamily: font.body, fontWeight: 600, transition: "all 0.15s",
                }}>
                  {k === "rating" ? "Competitiveness" : k === "indianPop" ? "Indian Population" : "Alphabetical"}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gap: isMobile ? 12 : 10 }}>
              {sortedSenate.map(race => (
                <Card key={race.state} style={{ cursor: "pointer", transition: "all 0.15s", borderColor: expandedSenate === race.state ? C.saffron : C.border }}
                  onClick={() => setExpandedSenate(expandedSenate === race.state ? null : race.state)}>
                  <div style={{ padding: isMobile ? "14px 16px" : "16px 20px" }}>
                    {isMobile ? (
                      <>
                        {/* Mobile: stacked layout */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: font.display, color: C.navy }}>{race.state}</h3>
                            <Badge color={getRatingColor(race.rating)} bg={getRatingBg(race.rating)}>{race.rating}</Badge>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: font.mono, color: race.indianPop > 100000 ? C.saffron : C.text }}>{(race.indianPop / 1000).toFixed(0)}K</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.5 }}>
                          {race.incumbent} <span style={{ color: race.party === "D" ? C.dem : C.gop, fontWeight: 600 }}>({race.party})</span> · Trump margin: {race.trumpMargin2024}
                          <span style={{ marginLeft: 6, fontSize: 10, color: C.textMuted, fontFamily: font.mono }}>({race.indianPct}%)</span>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Desktop: side by side */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: font.display, color: C.navy }}>{race.state}</h3>
                              <Badge color={getRatingColor(race.rating)} bg={getRatingBg(race.rating)}>{race.rating}</Badge>
                            </div>
                            <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 4 }}>
                              {race.incumbent} <span style={{ color: race.party === "D" ? C.dem : C.gop, fontWeight: 600 }}>({race.party})</span> · Trump margin: {race.trumpMargin2024}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: font.mono, color: race.indianPop > 100000 ? C.saffron : C.text }}>{(race.indianPop / 1000).toFixed(0)}K</div>
                            <div style={{ fontSize: 10, color: C.textMuted, fontFamily: font.mono }}>INDIAN POP ({race.indianPct}%)</div>
                          </div>
                        </div>
                      </>
                    )}
                    {expandedSenate === race.state && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.borderLight}`, fontSize: 13, color: C.textSecondary, lineHeight: 1.7 }}>
                        <strong style={{ color: C.text }}>Key metros:</strong> {race.keyMetros}<br />
                        {race.notes}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ═══ 2024 ELECTION TAB ═══ */}
        {tab === "election" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: font.display, margin: "0 0 6px", color: C.navy }}>
                The 2024 Indian American Vote
              </h2>
              <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, maxWidth: 700, lineHeight: 1.6 }}>
                A community in political motion. Indian Americans remained majority-Democratic in 2024 but showed the largest rightward shift in recorded history — driven by young men, economic concerns, and a widening gender gap that mirrors and amplifies national trends.
              </p>
            </div>

            {/* Top stats */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Eligible Voters", value: ELECTION_KEY_STATS.eligible, sub: "Of 5.4M Indian Americans", accent: C.navy },
                { label: "Harris 2024", value: ELECTION_KEY_STATS.harris, sub: "Down from 68% (Biden 2020)", accent: C.dem },
                { label: "Trump 2024", value: ELECTION_KEY_STATS.trump, sub: "Up from 22% in 2020", accent: C.gop },
                { label: "Young Men for Trump", value: ELECTION_KEY_STATS.youngMenTrump, sub: "Was 26% in 2020 — a 22pt swing", accent: C.saffron },
              ].map((s, i) => <Card key={i}><StatBox {...s} compact={isMobile} /></Card>)}
            </div>

            {/* Presidential vote trend chart */}
            <Card style={{ marginBottom: 24 }}>
              <div style={{ padding: "20px 24px" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: font.display, margin: "0 0 4px", color: C.navy }}>Indian American Presidential Vote (2004–2024)</h3>
                <p style={{ fontSize: 11, color: C.textMuted, fontFamily: font.mono, margin: "0 0 20px" }}>Sources: NAAS (2004–2016), Carnegie IAAS (2020, 2024)</p>

                <div style={{ display: "flex", alignItems: "flex-end", gap: isMobile ? 6 : 12, padding: "20px 0" }}>
                  {presVoteTrend.map((d) => {
                    const chartH = isMobile ? 120 : 180;
                    return (
                    <div key={d.year} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: chartH, width: "100%", justifyContent: "center" }}>
                        <div style={{
                          width: "40%", maxWidth: 44, height: Math.max((d.dem / 100) * chartH, 4),
                          background: C.dem, borderRadius: "4px 4px 0 0", opacity: 0.85,
                          position: "relative", transition: "height 0.5s",
                        }}>
                          <span style={{ position: "absolute", top: -18, width: "100%", textAlign: "center", fontSize: 10, fontWeight: 700, fontFamily: font.mono, color: C.dem }}>{d.dem}%</span>
                        </div>
                        <div style={{
                          width: "40%", maxWidth: 44, height: Math.max((d.gop / 100) * chartH, 4),
                          background: C.gop, borderRadius: "4px 4px 0 0", opacity: 0.85,
                          position: "relative", transition: "height 0.5s",
                        }}>
                          <span style={{ position: "absolute", top: -18, width: "100%", textAlign: "center", fontSize: 10, fontWeight: 700, fontFamily: font.mono, color: C.gopText }}>{d.gop}%</span>
                        </div>
                      </div>
                      <div style={{ fontSize: isMobile ? 10 : 12, fontWeight: 700, fontFamily: font.mono, color: C.text }}>{d.year}</div>
                      <div style={{ fontSize: isMobile ? 8 : 9, color: C.textMuted, textAlign: "center", lineHeight: 1.2 }}>{d.label}</div>
                    </div>
                  );
                  })}
                </div>

                <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.textSecondary }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: C.dem, opacity: 0.85 }} />Democrat
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.textSecondary }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: C.gop, opacity: 0.85 }} />Republican
                  </div>
                </div>
              </div>
            </Card>

            {/* Gender & Age breakdown */}
            <Card style={{ marginBottom: 24 }}>
              <div style={{ padding: "20px 24px" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: font.display, margin: "0 0 4px", color: C.navy }}>The Gender-Age Divide: Where the Shift Happened</h3>
                <p style={{ fontSize: 11, color: C.textMuted, fontFamily: font.mono, margin: "0 0 16px" }}>Source: Carnegie IAAS 2024 · Shift = change in Trump support from 2020</p>

                <div style={{ display: "grid", gap: 8 }}>
                  {genderAgeVote.map((g, i) => (
                    <div key={i} style={{ padding: isMobile ? "10px 12px" : "12px 16px", background: g.flag ? C.saffronBg : C.surfaceAlt, borderRadius: 8, border: g.flag ? `1px solid ${C.saffron}` : `1px solid ${C.borderLight}` }}>
                      {isMobile ? (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontWeight: 600, fontSize: 12, color: C.text }}>{g.group}</span>
                            <Badge color={g.flag ? C.saffron : C.textMuted} bg={g.flag ? C.saffronLight : C.surfaceAlt}>{g.shift}</Badge>
                          </div>
                          <div style={{ display: "flex", height: 20, borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ width: `${g.harris}%`, background: C.dem, opacity: 0.8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", fontFamily: font.mono }}>{g.harris}%</span>
                            </div>
                            <div style={{ width: `${g.trump}%`, background: C.gop, opacity: 0.8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", fontFamily: font.mono }}>{g.trump}%</span>
                            </div>
                            <div style={{ flex: 1, background: C.borderLight }} />
                          </div>
                        </>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <div style={{ width: 120, fontWeight: 600, fontSize: 13, color: C.text }}>{g.group}</div>
                          <div style={{ flex: 1, display: "flex", height: 22, borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ width: `${g.harris}%`, background: C.dem, opacity: 0.8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", fontFamily: font.mono }}>{g.harris}%</span>
                            </div>
                            <div style={{ width: `${g.trump}%`, background: C.gop, opacity: 0.8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", fontFamily: font.mono }}>{g.trump}%</span>
                            </div>
                            <div style={{ flex: 1, background: C.borderLight }} />
                          </div>
                          <div style={{ width: 90, textAlign: "right" }}>
                            <Badge color={g.flag ? C.saffron : C.textMuted} bg={g.flag ? C.saffronLight : C.surfaceAlt}>{g.shift}</Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <Card style={{ marginTop: 16, borderLeft: `4px solid ${C.saffron}`, borderColor: C.border, borderLeftColor: C.saffron }}>
                  <div style={{ padding: "12px 18px", fontSize: 13, color: C.textSecondary, lineHeight: 1.7 }}>
                    <strong style={{ color: C.saffronText }}>The headline:</strong> Indian American men under 40 went from Biden +47 (70-23) in 2020 to Trump +4 (48-44) in 2024 — one of the most dramatic demographic swings of the election cycle in any group. This mirrors the broader national realignment among young men of color but is more pronounced in the Indian American community.
                  </div>
                </Card>
              </div>
            </Card>

            {/* Two column: Party ID shift + Top Issues */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
              {/* Party ID */}
              <Card>
                <div style={{ padding: "20px 24px" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, fontFamily: font.display, margin: "0 0 14px", color: C.navy }}>Party Identification Shift</h3>
                  {partyId.map((p, i) => (
                    <div key={i} style={{ marginBottom: i === 0 ? 10 : 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, fontFamily: font.mono, color: C.textMuted, marginBottom: 4 }}>{p.year}</div>
                      <div style={{ display: "flex", height: 28, borderRadius: 6, overflow: "hidden", gap: 2 }}>
                        <div style={{ width: `${p.dem}%`, background: C.dem, opacity: 0.8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", fontFamily: font.mono }}>D {p.dem}%</span>
                        </div>
                        <div style={{ width: `${p.gop}%`, background: C.gop, opacity: 0.8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", fontFamily: font.mono }}>R {p.gop}%</span>
                        </div>
                        <div style={{ width: `${p.ind}%`, background: "#8B5CF6", opacity: 0.6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", fontFamily: font.mono }}>I {p.ind}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <p style={{ fontSize: 12, color: C.textMuted, marginTop: 12, lineHeight: 1.5 }}>
                    The biggest shift: Democrats lost 9 pts while Independents gained 11 pts. Republican ID held flat — suggesting erosion is to non-alignment, not to the GOP.
                  </p>
                </div>
              </Card>

              {/* Top Issues */}
              <Card>
                <div style={{ padding: "20px 24px" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, fontFamily: font.display, margin: "0 0 14px", color: C.navy }}>Top Issues for Indian American Voters</h3>
                  {topIssues.map((iss, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ flex: 1, fontSize: 12, color: C.text, fontWeight: i < 3 ? 600 : 400 }}>{iss.issue}</div>
                      <div style={{ width: 140 }}>
                        <div style={{ height: 6, background: C.borderLight, borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${iss.pct}%`, height: "100%", borderRadius: 3, background: i === 0 ? C.saffron : i < 3 ? C.navy : C.textMuted, opacity: 0.7, transition: "width 0.5s" }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, fontFamily: font.mono, color: i < 3 ? C.text : C.textMuted, width: 32 }}>{iss.pct}%</span>
                    </div>
                  ))}
                  <p style={{ fontSize: 11, color: C.textMuted, marginTop: 10, fontStyle: "italic" }}>
                    Note: US-India relations ranked last at 14% — countering the "homeland politics" narrative.
                  </p>
                </div>
              </Card>
            </div>

            {/* Precinct-Level Swings */}
            <Card style={{ marginBottom: 24 }}>
              <div style={{ padding: "20px 24px" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: font.display, margin: "0 0 4px", color: C.navy }}>Precinct-Level Swings in Indian American Enclaves</h3>
                <p style={{ fontSize: 11, color: C.textMuted, fontFamily: font.mono, margin: "0 0 16px" }}>Sources: County clerk certified results, Catalist, Diya TV, precinct-level analysis (Cornell Law / Siddharth Khurana)</p>

                <div style={{ display: "grid", gap: 8 }}>
                  {precinctSwings.map((p, i) => (
                    <div key={i} style={{ padding: "14px 18px", background: i % 2 === 0 ? C.surface : C.surfaceAlt, borderRadius: 8, border: `1px solid ${C.borderLight}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 6 }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{p.place}</span>
                          <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8 }}>{p.desc}</span>
                        </div>
                        <Badge color={C.gop} bg={C.gopLight}>{p.swing}</Badge>
                      </div>
                      <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.6 }}>
                        2020: <span style={{ fontWeight: 600, color: C.dem }}>{p.biden2020}</span> → 2024: <span style={{ fontWeight: 600, color: C.gop }}>{p.trump2024}</span>
                        <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8 }}>{p.note}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* What drove the shift + Bounceback */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
              <Card>
                <div style={{ padding: "20px 24px" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, fontFamily: font.display, margin: "0 0 12px", color: C.navy }}>What Drove the Shift</h3>
                  <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.8 }}>
                    {[
                      { t: "Economic frustration", d: "Inflation and cost of living were the #1 issue across all Indian American subgroups, overriding cultural or identity factors." },
                      { t: "Legal immigration backlash", d: "Community of legal immigrants frustrated by perceived Democratic leniency on illegal immigration. Many waited years or decades for status." },
                      { t: "CA SB 403 (caste bill)", d: "California's caste discrimination bill, which Newsom vetoed, became a national flashpoint. Many Indian Americans viewed it as singling out Hindus." },
                      { t: "Identity politics fatigue", d: "Carnegie researchers cite growing sense that Democrats are 'too focused on identity politics' over practical economic concerns." },
                      { t: "Young male realignment", d: "Mirrors the national pattern of young men moving right, amplified by figures like Vivek Ramaswamy and the online right's cultural appeal." },
                    ].map((item, i) => (
                      <div key={i} style={{ marginBottom: 10 }}>
                        <strong style={{ color: C.text }}>{item.t}:</strong> {item.d}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card style={{ borderLeft: `4px solid ${C.positive}`, borderColor: C.border, borderLeftColor: C.positive }}>
                <div style={{ padding: "20px 24px" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, fontFamily: font.display, margin: "0 0 12px", color: C.navy }}>The 2025 Bounceback</h3>
                  <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.8 }}>
                    <p style={{ margin: "0 0 10px" }}>Early evidence suggests the 2024 rightward shift may have been partially a Trump-specific phenomenon, not a permanent realignment.</p>
                    <p style={{ margin: "0 0 10px" }}><strong style={{ color: C.text }}>NJ 2025 Governor's Race:</strong> Edison, which swung ~50 pts toward Trump in 2024, swung back Democratic in 2025. Republican Ciattarelli got only 33% there — vs Trump's ~45%. The broader Indian American corridor in central NJ returned to typical D+15 to D+25 margins.</p>
                    <p style={{ margin: "0 0 10px" }}><strong style={{ color: C.text }}>Driving factors:</strong> Trump's tariffs on Indian imports devastated businesses in Edison/Woodbridge. H-1B visa crackdown (71% of H-1Bs went to Indian nationals in 2024). Anti-Indian rhetoric from elements of the MAGA base on X.</p>
                    <p style={{ margin: 0, fontStyle: "italic", color: C.textMuted }}>Implication: Indian American voters may be more responsive to policy than party loyalty — making them genuinely persuadable in both directions.</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Source note */}
            <Card>
              <div style={{ padding: "14px 20px", fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>
                <strong style={{ color: C.textSecondary }}>Data sources & caveats:</strong> Presidential preference data from Carnegie Endowment Indian American Attitudes Survey 2024 (n=714 citizens, ±3.7%, pre-election survey fielded Sep 18–Oct 15). IAAS is not a panel study; 2020-2024 comparisons reflect two independent cross-sections. Precinct-level results from county clerk certified returns; analysis by Cornell Law (Khurana), Diya TV, and AAPI Data. AAPI-wide data from 2024 American Electorate Voter Poll (AAPI n=1,783, ±2.3%). Turnout data from CPS Voting and Registration Supplement. No post-election validated survey of Indian American voters alone exists — the IAAS pre-election survey is the best available instrument. A full post-election study is a gap this project aims to help fill.
              </div>
            </Card>
          </div>
        )}

        {/* ═══ COMMUNITY SAFETY TAB ═══ */}
        {tab === "safety" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: font.display, margin: "0 0 6px", color: C.navy }}>
                Community Safety Tracker
              </h2>
              <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, maxWidth: 650 }}>
                Multi-source tracking of anti-Indian, anti-Hindu, and anti-Sikh hate crimes. Combines FBI official data with community-reported incidents.
              </p>
            </div>

            {/* Underreporting callout */}
            <Card style={{ marginBottom: 24, borderLeft: `4px solid ${C.red}`, borderColor: C.border, borderLeftColor: C.red }}>
              <div style={{ padding: "14px 20px", display: "flex", gap: 12 }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>⚠</span>
                <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.7 }}>
                  <strong style={{ color: C.red }}>On underreporting:</strong> FBI data captures roughly 5% of actual hate crime victimizations per the Bureau of Justice Statistics. For South Asian communities, language barriers, immigration concerns, and unfamiliarity with U.S. legal categories compound the gap. These numbers are a floor, not a ceiling.
                </div>
              </div>
            </Card>

            {/* FBI trend */}
            <Card style={{ marginBottom: 24 }}>
              <div style={{ padding: "20px 24px" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: font.display, margin: "0 0 4px", color: C.navy }}>FBI Reported Incidents by Bias Category (2015–2024)</h3>
                <p style={{ fontSize: 11, color: C.textMuted, fontFamily: font.mono, margin: "0 0 16px" }}>Source: FBI UCR/NIBRS · Anti-Sikh tracking began 2015</p>
                <div style={{ display: "flex", gap: 3, alignItems: "end", minHeight: 140, marginBottom: 12 }}>
                  {fbiTrendData.map(d => {
                    const max = 746;
                    return (
                      <div key={d.year} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ display: "flex", gap: 2, alignItems: "end", height: 150 }}>
                          <div title={`Anti-Asian: ${d.antiAsian}`} style={{ width: 10, height: Math.max((d.antiAsian / max) * 140, 2), background: C.red, borderRadius: "2px 2px 0 0", opacity: 0.75, transition: "height 0.5s" }} />
                          <div title={`Anti-Sikh: ${d.antiSikh}`} style={{ width: 10, height: Math.max((d.antiSikh / max) * 140, 2), background: C.saffron, borderRadius: "2px 2px 0 0", transition: "height 0.5s" }} />
                          <div title={`Anti-Hindu: ${d.antiHindu}`} style={{ width: 10, height: Math.max((d.antiHindu / max) * 140, 2), background: C.navy, borderRadius: "2px 2px 0 0", transition: "height 0.5s" }} />
                        </div>
                        <div style={{ fontSize: 9, color: C.textMuted, fontFamily: font.mono }}>{String(d.year).slice(2)}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
                  {[{ l: "Anti-Asian (all)", c: C.red }, { l: "Anti-Sikh", c: C.saffron }, { l: "Anti-Hindu", c: C.navy }].map(x => (
                    <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.textSecondary }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: x.c, opacity: 0.75 }} />{x.l}
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Stat boxes */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Anti-Asian 2024", value: "400", sub: "Still 3× pre-pandemic average", accent: C.red },
                { label: "Anti-Sikh 2024", value: "142", sub: "3rd most targeted faith group", accent: C.saffron },
                { label: "Anti-Hindu 2024", value: "38", sub: "+100% since 2019", accent: C.navy },
                { label: "Temple Attacks", value: "10+", sub: "Since 2022, with coordinated pattern", accent: C.text },
              ].map((s, i) => <Card key={i}><StatBox {...s} compact={isMobile} /></Card>)}
            </div>

            {/* Incident log */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: font.display, margin: 0, color: C.navy }}>Incident Log</h3>
                <div style={{ display: "flex", gap: 6 }}>
                  {["all", "Anti-Hindu", "Anti-Sikh", "critical"].map(f => (
                    <button key={f} onClick={() => setHateFilter(f)} style={{
                      padding: "5px 12px", fontSize: 11, borderRadius: 6, fontWeight: 600,
                      border: `1px solid ${hateFilter === f ? C.saffronDark : C.border}`,
                      background: hateFilter === f ? C.saffronBg : C.surface,
                      color: hateFilter === f ? C.saffronText : C.textSecondary,
                      cursor: "pointer", fontFamily: font.body, transition: "all 0.15s",
                    }}>{f === "all" ? "All" : f === "critical" ? "Critical" : f}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {templeIncidents
                  .filter(inc => hateFilter === "all" ? true : hateFilter === "critical" ? inc.severity === "critical" : inc.bias.includes(hateFilter))
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((inc, i) => (
                    <Card key={i} style={{
                      cursor: "pointer", borderLeftWidth: 3, borderLeftStyle: "solid",
                      borderLeftColor: inc.severity === "critical" ? C.sevCritical : inc.severity === "high" ? C.sevHigh : C.sevMedium,
                    }}>
                      <div style={{ padding: "14px 18px" }} onClick={() => setExpandedIncident(expandedIncident === i ? null : i)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{inc.target}</span>
                          <Badge color={inc.severity === "critical" ? C.sevCritical : inc.severity === "high" ? C.sevHigh : C.sevMedium}
                            bg={inc.severity === "critical" ? C.redLight : inc.severity === "high" ? C.saffronLight : C.surfaceAlt}>
                            {inc.severity.toUpperCase()}
                          </Badge>
                          <Badge color={C.textMuted} bg={C.surfaceAlt}>{inc.type}</Badge>
                          <Badge>{inc.bias}</Badge>
                        </div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                          {inc.location} · {inc.date.slice(0, 4) !== inc.date.slice(0, 7) ? new Date(inc.date + "T12:00:00").toLocaleDateString("en-US", { year: "numeric", month: "short" }) : inc.date.slice(0, 4)}
                        </div>
                        {expandedIncident === i && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.borderLight}`, fontSize: 13, color: C.textSecondary, lineHeight: 1.7 }}>
                            {inc.description}
                            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>Source: {inc.source}</div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ DISCOURSE MONITOR TAB ═══ */}
        {tab === "discourse" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: font.display, margin: "0 0 6px", color: C.navy }}>
                Public Discourse Monitor
              </h2>
              <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, maxWidth: 700, lineHeight: 1.6 }}>
                Tracking how Indian Americans are discussed in legislative, media, and public contexts. Structured as intelligence, not editorial.
              </p>
            </div>

            {/* Sub-navigation */}
            <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `1px solid ${C.border}` }}>
              {[
                { key: "timeline", label: "Event Timeline", count: discourseEvents.length },
                { key: "narratives", label: "Narrative Tracker", count: narrativeItems.length },
              ].map(s => (
                <button key={s.key} onClick={() => setDiscourseSection(s.key)} style={{
                  padding: "10px 20px", fontSize: 13, fontWeight: discourseSection === s.key ? 700 : 500,
                  fontFamily: font.body, border: "none", cursor: "pointer",
                  background: "transparent",
                  color: discourseSection === s.key ? C.navy : C.textMuted,
                  borderBottom: discourseSection === s.key ? `2px solid ${C.saffron}` : "2px solid transparent",
                  transition: "all 0.15s",
                }}>
                  {s.label}
                  <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, fontFamily: font.mono, color: discourseSection === s.key ? C.saffronText : C.textMuted, background: discourseSection === s.key ? C.saffronBg : C.surfaceAlt, padding: "2px 6px", borderRadius: 3 }}>{s.count}</span>
                </button>
              ))}
            </div>

            {/* EVENT TIMELINE */}
            {discourseSection === "timeline" && (
              <div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
              {["all", "legislation", "policy", "incident", "rhetoric", "advocacy", "electoral", "research", "data"].map(f => (
                <button key={f} onClick={() => setDiscourseFilter(f)} style={{
                  padding: "5px 12px", fontSize: 11, borderRadius: 6, fontWeight: 600,
                  border: `1px solid ${discourseFilter === f ? C.navy : C.border}`,
                  background: discourseFilter === f ? C.navyLight : C.surface,
                  color: discourseFilter === f ? C.navy : C.textSecondary,
                  cursor: "pointer", fontFamily: font.body, transition: "all 0.15s",
                  textTransform: "capitalize",
                }}>{f}</button>
              ))}
            </div>

            {/* Timeline */}
            <div style={{ position: "relative", paddingLeft: 28 }}>
              {/* Vertical line */}
              <div style={{ position: "absolute", left: 9, top: 8, bottom: 8, width: 2, background: C.borderLight }} />

              {discourseEvents
                .filter(e => discourseFilter === "all" || e.type === discourseFilter)
                .map((evt, i) => {
                  const dotColor = evt.valence === "positive" ? C.positive : evt.valence === "negative" ? C.negative : C.textMuted;
                  const bgColor = evt.valence === "positive" ? C.positiveBg : evt.valence === "negative" ? C.negativeBg : C.surfaceAlt;
                  return (
                    <div key={i} style={{ position: "relative", marginBottom: 16 }}>
                      {/* Dot on timeline */}
                      <div style={{
                        position: "absolute", left: -23, top: 18, width: 12, height: 12, borderRadius: "50%",
                        background: C.surface, border: `3px solid ${dotColor}`, zIndex: 1,
                      }} />
                      <Card style={{ borderColor: expandedIncident === `d${i}` ? dotColor : C.border, transition: "border-color 0.15s" }}>
                        <div style={{ padding: "16px 20px", cursor: "pointer" }} onClick={() => setExpandedIncident(expandedIncident === `d${i}` ? null : `d${i}`)}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, flexWrap: "wrap" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                                <Badge color={
                                  evt.type === "legislation" ? C.action : evt.type === "incident" ? C.sevCritical :
                                  evt.type === "rhetoric" ? C.red : evt.type === "policy" ? C.positive :
                                  evt.type === "advocacy" ? C.saffronText : evt.type === "electoral" ? C.toss :
                                  C.textMuted
                                } bg={
                                  evt.type === "legislation" ? C.actionLight : evt.type === "incident" ? C.redLight :
                                  evt.type === "rhetoric" ? C.redLight : evt.type === "policy" ? C.positiveBg :
                                  evt.type === "advocacy" ? C.saffronLight : evt.type === "electoral" ? C.tossLight :
                                  C.surfaceAlt
                                }>{evt.type.toUpperCase()}</Badge>
                                <span style={{ fontSize: 11, color: C.textMuted, fontFamily: font.mono }}>{evt.date}</span>
                              </div>
                              <h4 style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>{evt.event}</h4>
                              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{evt.actor}</div>
                            </div>
                            <Badge
                              color={evt.valence === "positive" ? C.positive : evt.valence === "negative" ? C.negative : C.textMuted}
                              bg={evt.valence === "positive" ? C.positiveBg : evt.valence === "negative" ? C.negativeBg : C.surfaceAlt}
                            >{evt.valence === "positive" ? "↑" : evt.valence === "negative" ? "↓" : "—"}</Badge>
                          </div>
                          {expandedIncident === `d${i}` && (
                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.borderLight}`, fontSize: 13, color: C.textSecondary, lineHeight: 1.7 }}>
                              {evt.detail}
                              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>Source: {evt.source}</div>
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>
                  );
                })}
            </div>

            {/* Methodology note */}
            <Card style={{ marginTop: 24, borderLeft: `4px solid ${C.navy}`, borderColor: C.border, borderLeftColor: C.navy }}>
              <div style={{ padding: "16px 20px", fontSize: 13, color: C.textSecondary, lineHeight: 1.7 }}>
                <strong style={{ color: C.navy }}>About this tracker:</strong> Events are cataloged by type (legislation, policy, incident, rhetoric, advocacy, electoral, research) and directional valence (positive, negative, neutral toward Indian American civic life). Valence is assessed based on impact, not intent — a hate crime is negative regardless of the perpetrator's stated rationale. This tracker does not editorialize; it presents documented events with sourcing for independent evaluation.
              </div>
            </Card>
              </div>
            )}

            {/* ─── NARRATIVE TRACKER ─── */}
            {discourseSection === "narratives" && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, maxWidth: 720, lineHeight: 1.6 }}>
                  Recurring themes and talking points circulating across Indian American media, public forums, and social platforms. Manually curated from open-source monitoring — not automated scraping or private surveillance.
                </p>
              </div>

              <div style={{ display: "grid", gap: 16 }}>
                {narrativeItems.map((n, i) => (
                  <Card key={i} style={{ borderLeft: `3px solid ${
                    n.intensity === "high" ? C.saffron : n.intensity === "medium" ? C.navy : C.borderLight
                  }` }}>
                    <div style={{ padding: "18px 22px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>{n.narrative}</h4>
                            <Badge color={n.intensity === "high" ? C.saffronText : n.intensity === "medium" ? C.navy : C.textMuted}
                              bg={n.intensity === "high" ? C.saffronBg : n.intensity === "medium" ? C.navyLight : C.surfaceAlt}>
                              {n.intensity.toUpperCase()} CIRCULATION
                            </Badge>
                          </div>
                          <p style={{ margin: "0 0 10px", fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>{n.description}</p>
                        </div>
                      </div>

                      {/* Platform presence */}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                        {n.platforms.map((p, j) => (
                          <span key={j} style={{
                            fontSize: 10, fontWeight: 600, fontFamily: font.mono,
                            padding: "3px 8px", borderRadius: 4,
                            background: C.surfaceAlt, color: C.textMuted, border: `1px solid ${C.borderLight}`,
                          }}>{p}</span>
                        ))}
                      </div>

                      {/* Sample framing */}
                      <div style={{ background: C.surfaceAlt, borderRadius: 6, padding: "10px 14px", marginBottom: 8, borderLeft: `2px solid ${C.borderLight}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, fontFamily: font.mono, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Representative Framing</div>
                        <div style={{ fontSize: 12, color: C.textSecondary, fontStyle: "italic", lineHeight: 1.5 }}>"{n.sampleFraming}"</div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <div style={{ fontSize: 11, color: C.textMuted }}>
                          <span style={{ fontWeight: 600 }}>Observed:</span> {n.dateRange} · <span style={{ fontWeight: 600 }}>Direction:</span>{" "}
                          <span style={{ color: n.direction === "growing" ? C.saffronText : n.direction === "stable" ? C.navy : C.positive, fontWeight: 700 }}>
                            {n.direction === "growing" ? "↑ Growing" : n.direction === "stable" ? "→ Stable" : "↓ Fading"}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: C.textMuted, fontFamily: font.mono }}>{n.lastUpdated}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Narrative methodology note */}
              <Card style={{ marginTop: 16, borderLeft: `4px solid ${C.saffron}`, borderColor: C.border, borderLeftColor: C.saffron }}>
                <div style={{ padding: "16px 20px", fontSize: 13, color: C.textSecondary, lineHeight: 1.7 }}>
                  <strong style={{ color: C.saffronText }}>Methodology:</strong> Narratives are identified through manual monitoring of public platforms: X/Twitter, YouTube (Diya TV, American Bazaar, NDTV USA), Reddit (r/ABCDesis, r/IndianAmerican), and public WhatsApp Channels. No private messages or encrypted communications are accessed. Intensity is assessed by cross-platform spread, not engagement metrics. "Representative framing" quotes are composites reflecting common phrasing, not direct quotations from specific individuals. Updated biweekly.
                </div>
              </Card>
            </div>
            )}
          </div>
        )}

        {/* ═══ DOL PERM DATA TAB ═══ */}
        {tab === "perm" && (() => {
          const permDistricts = [...new Set(permDistrictData.map(r => r.districtId))].sort();
          const permYears = [...new Set(permDistrictData.map(r => r.dataFiscalYear))].sort();
          const permYearsDesc = [...permYears].reverse();

          // Summary stats
          const totalIndia = permDistrictData.reduce((s, r) => s + (r.permIndia || 0), 0);
          const yearRange = permYears.length > 0 ? `${permYears[0]}–${permYears[permYears.length - 1]}` : "—";
          const latestYear = permYears[permYears.length - 1];
          const latestRows = permDistrictData.filter(r => r.dataFiscalYear === latestYear && r.avgOfferedWage);
          const avgWage = latestRows.length > 0 ? Math.round(latestRows.reduce((s, r) => s + r.avgOfferedWage, 0) / latestRows.length) : null;
          const cumulative = {};
          permDistrictData.forEach(r => { cumulative[r.districtId] = (cumulative[r.districtId] || 0) + (r.permIndia || 0); });
          const topDist = Object.entries(cumulative).sort((a, b) => b[1] - a[1])[0];

          // Trend data for selected district
          const trendRows = permDistrictData.filter(r => r.districtId === permDistrict).sort((a, b) => a.dataFiscalYear.localeCompare(b.dataFiscalYear));
          const trendMax = Math.max(...trendRows.map(r => r.permCertified || 0), 1);
          const trendCumTotal = trendRows.reduce((s, r) => s + (r.permIndia || 0), 0);

          // Wage comparison
          const wageByDist = {};
          permDistrictData.forEach(r => {
            if (r.avgOfferedWage && r.avgOfferedWage > 0) {
              if (!wageByDist[r.districtId] || r.dataFiscalYear > wageByDist[r.districtId].fy) {
                wageByDist[r.districtId] = { wage: r.avgOfferedWage, fy: r.dataFiscalYear };
              }
            }
          });
          const wageEntries = permDistricts
            .filter(d => wageByDist[d] && LOCAL_MEDIAN_INCOME[d])
            .map(d => ({ district: d, perm: wageByDist[d].wage, local: LOCAL_MEDIAN_INCOME[d], ratio: wageByDist[d].wage / LOCAL_MEDIAN_INCOME[d] }))
            .sort((a, b) => b.ratio - a.ratio);
          const wageMax = wageEntries.length > 0 ? Math.max(...wageEntries.map(e => Math.max(e.perm, e.local))) : 1;

          // Employers
          const empState = permEmpDistrict.split("-")[0];
          let empRow = permDistrictData.find(r => r.districtId === permEmpDistrict && r.dataFiscalYear === permEmpYear);
          let empSource = "district";
          if (!empRow) { empRow = permStateData.find(r => r.state === empState && r.dataFiscalYear === permEmpYear); empSource = "state"; }
          const employers = empRow?.topEmployers || [];
          const occupations = empRow?.topOccupations || [];

          // Leaderboard
          const leaderboard = Object.entries(cumulative).sort((a, b) => b[1] - a[1]);
          const lbMax = leaderboard[0] ? leaderboard[0][1] : 1;

          // Sub-tabs
          const permSubs = [
            { key: "trend", label: "Trend" },
            { key: "wages", label: "Wages" },
            { key: "employers", label: "Who's Hiring" },
            { key: "rankings", label: "Rankings" },
          ];

          return (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: font.display, margin: "0 0 6px", color: C.navy }}>
                DOL PERM Data Explorer
              </h2>
              <p style={{ fontSize: 14, color: C.textSecondary, margin: "0 0 4px", maxWidth: 700, lineHeight: 1.6 }}>
                Permanent labor certification (PERM) applications filed with the U.S. Department of Labor — a proxy for where Indian American economic roots are deepening through employment-based green card sponsorship.
              </p>
              <div style={{ display: "inline-block", padding: "6px 12px", background: C.navyLight, borderRadius: 6, fontSize: 11, color: C.navy, lineHeight: 1.6, marginTop: 8 }}>
                <strong>Source:</strong> DOL OFLC PERM Disclosure Data ({yearRange}) · Filtered to India-born applicants · Mapped to 119th congressional districts
              </div>
            </div>

            {/* Editorial framing */}
            <Card style={{ marginBottom: 20, borderLeft: `4px solid ${C.saffron}` }}>
              <div style={{ padding: "14px 18px", fontSize: 12, color: C.textSecondary, lineHeight: 1.7 }}>
                <strong style={{ color: C.navy }}>Reading this data:</strong> A PERM certification is Step 1 of the employment-based green card process — it means the Department of Labor certified that no qualified U.S. worker was available for the position. It does <em>not</em> mean a green card was issued. Many certified PERMs never result in a green card due to visa backlogs, employer withdrawal, or applicant departure. These numbers measure <strong style={{ color: C.text }}>employer demand for skilled immigrant labor</strong> and serve as a proxy for where Indian American economic roots are deepening — not immigration volume.
              </div>
            </Card>

            {/* Summary strip */}
            {permDistricts.length === 0 ? (
              <Card>
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted }}>No PERM Data Loaded</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: font.display, color: C.navy, margin: "8px 0" }}>Getting Started</div>
                  <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>
                    Run <code style={{ background: C.surfaceAlt, padding: "2px 6px", borderRadius: 3, fontSize: 11 }}>process_perm.py</code> on DOL PERM Excel files, then load the SQL into Supabase.
                  </div>
                </div>
              </Card>
            ) : (
            <>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
              <Card>
                <div style={{ padding: "14px 18px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted }}>Total India-born PERM</div>
                  <div style={{ fontSize: 24, fontWeight: 800, fontFamily: font.mono, color: C.navy, margin: "4px 0" }}>{totalIndia.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: C.textSecondary }}>{permDistricts.length} districts, {yearRange}</div>
                </div>
              </Card>
              <Card>
                <div style={{ padding: "14px 18px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted }}>Fiscal Years</div>
                  <div style={{ fontSize: 24, fontWeight: 800, fontFamily: font.mono, color: C.navy, margin: "4px 0" }}>{permYears.length}</div>
                  <div style={{ fontSize: 11, color: C.textSecondary }}>{yearRange}</div>
                </div>
              </Card>
              <Card>
                <div style={{ padding: "14px 18px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted }}>Avg Offered Wage</div>
                  <div style={{ fontSize: 24, fontWeight: 800, fontFamily: font.mono, color: C.navy, margin: "4px 0" }}>{avgWage ? `$${avgWage.toLocaleString()}` : "—"}</div>
                  <div style={{ fontSize: 11, color: C.textSecondary }}>{latestYear || "Latest year"} average</div>
                </div>
              </Card>
              <Card>
                <div style={{ padding: "14px 18px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted }}>Top District</div>
                  <div style={{ fontSize: 24, fontWeight: 800, fontFamily: font.mono, color: C.navy, margin: "4px 0" }}>{topDist ? topDist[0] : "—"}</div>
                  <div style={{ fontSize: 11, color: C.textSecondary }}>{topDist ? `${topDist[1].toLocaleString()} cumulative` : ""}</div>
                </div>
              </Card>
            </div>

            {/* Sub-tabs */}
            <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 20, overflowX: "auto" }}>
              {permSubs.map(s => (
                <button key={s.key} onClick={() => setPermSubTab(s.key)} style={{
                  padding: "10px 20px", fontSize: 13, fontWeight: permSubTab === s.key ? 700 : 500,
                  fontFamily: font.body, border: "none", background: "transparent", cursor: "pointer",
                  color: permSubTab === s.key ? C.navy : C.textMuted,
                  borderBottom: permSubTab === s.key ? `2px solid ${C.saffron}` : "2px solid transparent",
                  whiteSpace: "nowrap",
                }}>{s.label}</button>
              ))}
            </div>

            {/* TREND SUB-TAB */}
            {permSubTab === "trend" && (
              <Card>
                <div style={{ padding: "20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: font.display, color: C.navy }}>PERM Certifications Over Time</h3>
                    <select value={permDistrict} onChange={e => setPermDistrict(e.target.value)} style={{
                      padding: "6px 10px", fontSize: 12, fontFamily: font.mono, fontWeight: 600,
                      border: `1px solid ${C.border}`, borderRadius: 6, background: C.surface, color: C.text,
                    }}>
                      {permDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <p style={{ fontSize: 12, color: C.textSecondary, margin: "0 0 20px" }}>
                    {permDistrict} — {trendCumTotal.toLocaleString()} cumulative India-born PERM certifications
                  </p>

                  {/* Bar chart */}
                  <div style={{ display: "flex", alignItems: "flex-end", gap: isMobile ? 2 : 4, height: 200, borderBottom: `1px solid ${C.border}` }}>
                    {trendRows.map(r => {
                      const total = r.permCertified || 0;
                      const india = r.permIndia || 0;
                      const totalH = Math.max(total / trendMax * 190, total > 0 ? 3 : 0);
                      const indiaH = total > 0 ? Math.max(india / trendMax * 190, india > 0 ? 3 : 0) : 0;
                      return (
                        <div key={r.dataFiscalYear} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}
                          title={`${r.dataFiscalYear}: ${india.toLocaleString()} India / ${total.toLocaleString()} total`}>
                          <div style={{ width: "100%", position: "relative", height: totalH }}>
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: totalH, background: C.navyLight, borderRadius: "3px 3px 0 0" }} />
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: indiaH, background: C.saffron, borderRadius: "3px 3px 0 0", opacity: 0.85 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Year labels */}
                  <div style={{ display: "flex", gap: isMobile ? 2 : 4, marginTop: 6 }}>
                    {trendRows.map(r => (
                      <div key={r.dataFiscalYear} style={{ flex: 1, textAlign: "center", fontSize: isMobile ? 8 : 10, fontFamily: font.mono, color: C.textMuted }}>
                        {r.dataFiscalYear.replace("FY", "'")}
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div style={{ display: "flex", gap: 16, marginTop: 14, fontSize: 11, color: C.textSecondary }}>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.saffron, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} /> India-born certified</span>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.navyLight, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} /> All certified</span>
                  </div>

                  <p style={{ fontSize: 11, color: C.textMuted, marginTop: 16, lineHeight: 1.6, fontStyle: "italic" }}>
                    Note: FY2009 reflects the Great Recession dip. FY2020 shows COVID-era processing delays. FY2024 may reflect incomplete data or policy shifts.
                  </p>
                </div>
              </Card>
            )}

            {/* WAGES SUB-TAB */}
            {permSubTab === "wages" && (
              <Card>
                <div style={{ padding: "20px 22px" }}>
                  <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, fontFamily: font.display, color: C.navy }}>PERM Offered Wage vs. Local Median Income</h3>
                  <p style={{ fontSize: 12, color: C.textSecondary, margin: "0 0 16px" }}>
                    DOL-certified wages compared to Census ACS median household income. Sorted by wage ratio — highest multiplier first.
                  </p>
                  <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 11, color: C.textSecondary }}>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.saffron, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} /> PERM median offered wage</span>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.navy, opacity: 0.3, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} /> Local median household income</span>
                  </div>

                  {wageEntries.length === 0 ? (
                    <p style={{ color: C.textMuted, textAlign: "center", padding: "40px 0" }}>No wage comparison data available.</p>
                  ) : wageEntries.map(e => (
                    <div key={e.district} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 52, fontFamily: font.mono, fontWeight: 700, fontSize: 12, color: C.text, flexShrink: 0 }}>{e.district}</div>
                      <div style={{ flex: 1, position: "relative", height: 18 }}>
                        <div style={{ position: "absolute", height: 8, top: 5, left: 0, width: `${(e.local / wageMax * 100).toFixed(1)}%`, background: C.navy, opacity: 0.2, borderRadius: 4 }} />
                        <div style={{ position: "absolute", height: 8, top: 5, left: 0, width: `${(e.perm / wageMax * 100).toFixed(1)}%`, background: C.saffron, opacity: 0.85, borderRadius: 4 }} />
                      </div>
                      <div style={{ width: 90, textAlign: "right", fontSize: 12, fontFamily: font.mono, flexShrink: 0 }}>
                        ${Math.round(e.perm / 1000)}K{" "}
                        <span style={{ color: e.ratio >= 1.5 ? "#166534" : C.text, fontWeight: 600, fontSize: 10 }}>{e.ratio.toFixed(1)}×</span>
                      </div>
                    </div>
                  ))}

                  <p style={{ fontSize: 11, color: C.textMuted, marginTop: 16, lineHeight: 1.6, fontStyle: "italic" }}>
                    PERM offered wages are from the most recent fiscal year with data. Local median income from Census ACS 5-year estimates. PERM wages reflect individual salaries; median household income may include multiple earners. Districts without verified local income data are excluded.
                  </p>
                </div>
              </Card>
            )}

            {/* EMPLOYERS SUB-TAB */}
            {permSubTab === "employers" && (
              <Card>
                <div style={{ padding: "20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: font.display, color: C.navy }}>Top Employers & Occupations</h3>
                    <select value={permEmpDistrict} onChange={e => setPermEmpDistrict(e.target.value)} style={{
                      padding: "6px 10px", fontSize: 12, fontFamily: font.mono, fontWeight: 600,
                      border: `1px solid ${C.border}`, borderRadius: 6, background: C.surface, color: C.text,
                    }}>
                      {permDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={permEmpYear} onChange={e => setPermEmpYear(e.target.value)} style={{
                      padding: "6px 10px", fontSize: 12, fontFamily: font.mono, fontWeight: 600,
                      border: `1px solid ${C.border}`, borderRadius: 6, background: C.surface, color: C.text,
                    }}>
                      {permYearsDesc.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>

                  {/* Source badge */}
                  {empRow ? (
                    <p style={{ fontSize: 12, color: C.textSecondary, margin: "0 0 16px" }}>
                      {permEmpYear} •{" "}
                      {empSource === "state" ? (
                        <>
                          <span style={{ display: "inline-block", padding: "2px 8px", background: C.saffronBg, color: C.saffronText, borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.3, verticalAlign: "middle" }}>STATE-LEVEL ({empState})</span>
                          {" "}District-specific employer data not available; showing state aggregate.
                        </>
                      ) : "District-level data"}
                    </p>
                  ) : (
                    <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 16px" }}>
                      No PERM data available for {permEmpDistrict} in {permEmpYear}. Try a different fiscal year.
                    </p>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
                    {/* Employers */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted, marginBottom: 8 }}>Top Employers</div>
                      {employers.length > 0 ? employers.map((e, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.borderLight}`, fontSize: 13 }}>
                          <span style={{ fontFamily: font.mono, fontWeight: 800, fontSize: 11, color: C.textMuted, width: 18 }}>{i + 1}</span>
                          <span>{e}</span>
                        </div>
                      )) : (
                        <p style={{ color: C.textMuted, padding: "20px 0", textAlign: "center", fontSize: 12 }}>No employer data for this selection</p>
                      )}
                    </div>

                    {/* Occupations */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted, marginBottom: 8 }}>Top Occupations</div>
                      {occupations.length > 0 ? occupations.map((o, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.borderLight}`, fontSize: 13 }}>
                          <span style={{ fontFamily: font.mono, fontWeight: 800, fontSize: 11, color: C.textMuted, width: 18 }}>{i + 1}</span>
                          <span>{o}</span>
                        </div>
                      )) : (
                        <p style={{ color: C.textMuted, padding: "20px 0", textAlign: "center", fontSize: 12 }}>No occupation data for this selection</p>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: 11, color: C.textMuted, marginTop: 16, lineHeight: 1.6, fontStyle: "italic" }}>
                    Employer and occupation data from DOL PERM disclosure files. For multi-district states, data may reflect the state-level aggregate.
                  </p>
                </div>
              </Card>
            )}

            {/* RANKINGS SUB-TAB */}
            {permSubTab === "rankings" && (
              <Card>
                <div style={{ padding: "20px 22px" }}>
                  <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, fontFamily: font.display, color: C.navy }}>Cumulative PERM Volume, {yearRange}</h3>
                  <p style={{ fontSize: 12, color: C.textSecondary, margin: "0 0 16px" }}>
                    Total India-born certified PERM applications by district across all available fiscal years
                  </p>

                  {leaderboard.map(([dist, total], i) => (
                    <div key={dist} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <div style={{ width: 20, fontFamily: font.mono, fontWeight: 800, fontSize: 11, color: i < 3 ? C.saffronText : C.textMuted, textAlign: "right" }}>{i + 1}</div>
                      <div style={{ width: 52, fontFamily: font.mono, fontWeight: 700, fontSize: 12, color: C.text }}>{dist}</div>
                      <div style={{ flex: 1, position: "relative", height: 14 }}>
                        <div style={{ position: "absolute", height: 10, top: 2, left: 0, width: `${(total / lbMax * 100).toFixed(1)}%`, background: `linear-gradient(90deg, ${C.saffron}, ${C.navy})`, opacity: 0.7, borderRadius: 4 }} />
                      </div>
                      <div style={{ width: 70, textAlign: "right", fontSize: 12, fontFamily: font.mono, fontWeight: 600 }}>{total.toLocaleString()}</div>
                    </div>
                  ))}

                  <p style={{ fontSize: 11, color: C.textMuted, marginTop: 16, lineHeight: 1.6, fontStyle: "italic" }}>
                    Cumulative totals sum all available fiscal years. Districts in single-tracked states receive exact state totals. Multi-district states are split proportionally by Indian American population share.
                  </p>
                </div>
              </Card>
            )}
            </>
            )}
          </div>
          );
        })()}

        {/* ═══ METHODOLOGY TAB ═══ */}
        {tab === "methodology" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: font.display, margin: "0 0 6px", color: C.navy }}>
                Methodology
              </h2>
              <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, maxWidth: 700, lineHeight: 1.6 }}>
                Two proprietary indices power this dashboard. The Community Density Index measures where Indian Americans are civically active. The Persuasion Index measures where that civic activity can be converted into electoral outcomes. The DOL PERM Data tab provides 17 years of employment-based green card sponsorship data as an independent economic signal.
              </p>
            </div>

            {/* COMMUNITY DENSITY INDEX */}
            <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: font.display, margin: "0 0 6px", color: C.navy }}>Community Density Index</h3>
            <p style={{ fontSize: 13, color: C.textSecondary, margin: "0 0 16px", lineHeight: 1.6 }}>
              A composite score (0–100) measuring not just where Indian Americans live, but where they are civically and economically active. Census alone misses the picture — our index captures political donor behavior, cultural infrastructure, economic presence, and digital engagement.
            </p>

            <div style={{ display: "grid", gap: 16, marginBottom: 32 }}>
              {DENSITY_METHODS.map((m, i) => (
                <Card key={i}>
                  <div style={{ padding: "18px 22px", display: "flex", gap: 16, alignItems: "start" }}>
                    <div style={{ fontSize: 24, lineHeight: 1 }}>{m.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.navy }}>{m.name}</h4>
                        <div style={{
                          fontSize: 13, fontWeight: 800, fontFamily: font.mono, color: C.saffronText,
                          background: C.saffronBg, padding: "2px 8px", borderRadius: 4,
                        }}>{m.weight}%</div>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>{m.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* PERSUASION INDEX */}
            <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: font.display, margin: "0 0 6px", color: C.navy }}>
              <span style={{ color: "#6D28D9" }}>NEW</span> — Indian American Persuasion Index
            </h3>
            <p style={{ fontSize: 13, color: C.textSecondary, margin: "0 0 6px", lineHeight: 1.6 }}>
              A composite score (0–100) answering the question campaigns and PACs are actually asking: <strong style={{ color: C.text }}>"Where should I spend money to move Indian American voters?"</strong>
            </p>
            <p style={{ fontSize: 13, color: C.textSecondary, margin: "0 0 16px", lineHeight: 1.6 }}>
              Cook's PVI tells you how partisan a district is. The Persuasion Index tells you how moveable the Indian American vote is within that district. A district can have 100,000 Indian Americans and a low persuasion score if the seat is uncontested — there's no race to influence. Conversely, a district with 30,000 Indian Americans in a toss-up race with evidence of recent swing scores high because every vote matters.
            </p>

            <div style={{ display: "grid", gap: 16, marginBottom: 32 }}>
              {PERSUASION_METHODS.map((m, i) => (
                <Card key={i}>
                  <div style={{ padding: "18px 22px", display: "flex", gap: 16, alignItems: "start" }}>
                    <div style={{ fontSize: 24, lineHeight: 1 }}>{m.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.navy }}>{m.name}</h4>
                        <div style={{
                          fontSize: 13, fontWeight: 800, fontFamily: font.mono, color: "#6D28D9",
                          background: "#EDE9FE", padding: "2px 8px", borderRadius: 4,
                        }}>{m.weight}%</div>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>{m.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* RANKED DISTRICTS — SIDE BY SIDE */}
            <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: font.display, margin: "0 0 14px", color: C.navy }}>District Rankings</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
              {/* Density rankings */}
              <Card>
                <div style={{ padding: "14px 18px 8px", borderBottom: `1px solid ${C.borderLight}` }}>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.saffronText, fontFamily: font.mono }}>BY DENSITY SCORE</h4>
                </div>
                <div style={{ padding: "4px 0" }}>
                  {[...districts].sort((a, b) => b.densityScore - a.densityScore).map((d, i) => (
                    <div key={d.id} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 16px",
                      borderBottom: i < districts.length - 1 ? `1px solid ${C.borderLight}` : "none",
                    }}>
                      <div style={{ width: 20, fontSize: 12, fontWeight: 800, fontFamily: font.mono, color: i < 3 ? C.saffronText : C.textMuted, textAlign: "right" }}>{i + 1}</div>
                      <div style={{ width: 52, fontFamily: font.mono, fontWeight: 700, fontSize: 12, color: d.party === "D" ? C.dem : C.gop }}>{d.id}</div>
                      <div style={{ flex: 1 }}><DensityBar score={d.densityScore} /></div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Persuasion rankings */}
              <Card>
                <div style={{ padding: "14px 18px 8px", borderBottom: `1px solid ${C.borderLight}` }}>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#6D28D9", fontFamily: font.mono }}>BY PERSUASION SCORE</h4>
                </div>
                <div style={{ padding: "4px 0" }}>
                  {[...districts].sort((a, b) => b.persuasionScore - a.persuasionScore).map((d, i) => (
                    <div key={d.id} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 16px",
                      borderBottom: i < districts.length - 1 ? `1px solid ${C.borderLight}` : "none",
                    }}>
                      <div style={{ width: 20, fontSize: 12, fontWeight: 800, fontFamily: font.mono, color: i < 3 ? "#6D28D9" : C.textMuted, textAlign: "right" }}>{i + 1}</div>
                      <div style={{ width: 52, fontFamily: font.mono, fontWeight: 700, fontSize: 12, color: d.party === "D" ? C.dem : C.gop }}>{d.id}</div>
                      <div style={{ flex: 1 }}><PersuasionBar score={d.persuasionScore} /></div>
                      <Badge color={getRatingColor(d.cook2026)} bg={getRatingBg(d.cook2026)}>{d.cook2026}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Key insight callout */}
            <Card style={{ marginBottom: 24, borderLeft: `4px solid #7C3AED`, borderColor: C.border, borderLeftColor: "#7C3AED" }}>
              <div style={{ padding: "16px 20px", fontSize: 13, color: C.textSecondary, lineHeight: 1.7 }}>
                <strong style={{ color: "#6D28D9" }}>Key insight:</strong> The Density Index and Persuasion Index answer different questions and produce different rankings. CA-17 tops the Density Index (94) because it has the largest, most civically active Indian American community in the country. But it ranks 16th on the Persuasion Index (42) because the district is D+30 — no amount of Indian American voter outreach changes the outcome. NJ-07 tops the Persuasion Index (93) because it combines a large Indian American population with a genuine toss-up race where that population is large enough to be decisive.
              </div>
            </Card>

            {/* Data sources */}
            <Card style={{ marginTop: 24 }}>
              <div style={{ padding: "18px 22px" }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 12px" }}>Data Sources</h4>
                <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.8, fontFamily: font.body }}>
                  Census ACS 5-Year Estimates (data.census.gov, Table B02015) · Cook Political Report 2026 Ratings & PVI · MIT Election Lab precinct-level returns · AAPI Data CVAP estimates & voter surveys · FEC individual contributions bulk data · Google Trends API · Google Places API · USCIS H-1B employer data · DOL OFLC PERM Disclosure Data (FY2008–FY2024) · FBI UCR/NIBRS hate crime statistics · Sikh Coalition Report Hate · CoHNA Incident Tracker · Stop AAPI Hate · Hindu American Foundation · CA Civil Rights Dept Hotline · ADL H.E.A.T. Map
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: isMobile ? "20px 16px" : "24px 32px", background: C.surface }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: C.textMuted, fontFamily: font.mono, lineHeight: 1.8 }}>
            Indian American Voter Atlas · Data: ACS 2019–2023, Cook Political Report, FEC, AAPI Data, FBI UCR, DOL PERM<br />
            Methodology: Community Density Index v1.0 · Persuasion Index v1.0 · Not affiliated with any political campaign or party<br />
            Published by <span style={{ color: C.saffronText }}>Anang Mittal</span> · Built for civic engagement and public interest research
          </div>
          <div style={{ marginTop: 12 }}>
            <a href={`mailto:${CONTACT_EMAIL}`} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, fontWeight: 600, fontFamily: font.body,
              color: C.action, textDecoration: "none",
              padding: "6px 14px", borderRadius: 6,
              border: `1px solid ${C.action}`,
              transition: "all 0.15s",
            }}>
              ✉ Contact & Feature Requests
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
