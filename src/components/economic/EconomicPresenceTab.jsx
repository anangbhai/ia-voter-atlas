import { useState, useMemo } from "react";
import { C, font } from "../../lib/theme.js";
import { useEconomicData } from "../../hooks/useEconomicData.js";
import { ImmigrationPipeline } from "./ImmigrationPipeline.jsx";
import { HouseholdWealth } from "./HouseholdWealth.jsx";
import { BusinessOwnership } from "./BusinessOwnership.jsx";
import { ResearchInnovation } from "./ResearchInnovation.jsx";
import { PoliticalEconomy } from "./PoliticalEconomy.jsx";

function Card({ children, style = {} }) {
  return <div style={{
    background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`,
    boxShadow: "0 1px 3px rgba(30,45,61,0.04), 0 1px 2px rgba(30,45,61,0.02)",
    ...style
  }}>{children}</div>;
}

const fmtDollar = v => {
  if (v >= 1000000000) return `$${(v / 1000000000).toFixed(1)}B`;
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v}`;
};

const SUB_SECTIONS = [
  { key: "overview", label: "Overview" },
  { key: "immigration", label: "Immigration Pipeline" },
  { key: "wealth", label: "Household Wealth" },
  { key: "business", label: "Business Ownership" },
  { key: "research", label: "Scientific Research" },
  { key: "political", label: "Political Economy" },
];

// ─── Executive Summary ──────────────────────────────────────
function OverviewSummary({ economicData, permDistrictData, isMobile, onNavigate }) {
  const { uscis, hmda, abs, sba, grants, fec } = economicData;

  // PERM stats
  const permStats = useMemo(() => {
    const totalIndia = permDistrictData.reduce((s, r) => s + (r.permIndia || 0), 0);
    const districts = new Set(permDistrictData.map(r => r.districtId));
    const years = [...new Set(permDistrictData.map(r => r.dataFiscalYear))].sort();
    const latestYear = years[years.length - 1];
    const latestRows = permDistrictData.filter(r => r.dataFiscalYear === latestYear && r.avgOfferedWage);
    const avgWage = latestRows.length > 0
      ? Math.round(latestRows.reduce((s, r) => s + r.avgOfferedWage, 0) / latestRows.length)
      : null;
    return { totalIndia, districtCount: districts.size, avgWage, yearRange: years.length > 0 ? `${years[0]}–${years[years.length - 1]}` : "" };
  }, [permDistrictData]);

  // USCIS stats
  const uscisStats = useMemo(() => {
    if (!uscis || uscis.length === 0) return null;
    const sorted = [...uscis].sort((a, b) => (a.dataYear || 0) - (b.dataYear || 0));
    const latest = sorted[sorted.length - 1];
    const totalNat = uscis.reduce((s, r) => s + (r.indiaNaturalizations || 0), 0);
    return {
      latestLpr: latest?.indiaLprAdmissions || 0,
      latestNat: latest?.indiaNaturalizations || 0,
      totalNat,
      latestYear: latest?.dataYear,
    };
  }, [uscis]);

  // HMDA stats
  const hmdaStats = useMemo(() => {
    if (!hmda || hmda.length === 0) return null;
    const districts = new Set();
    let total = 0;
    let loanSum = 0;
    let loanCount = 0;
    hmda.forEach(r => {
      if (r.districtId) districts.add(r.districtId);
      total += r.originationCount || 0;
      const rowOrig = r.originationCount || 0;
      const rowAvg = r.avgLoanAmount || 0;
      if (rowAvg > 0 && rowOrig > 0) { loanSum += rowAvg * rowOrig; loanCount += rowOrig; }
    });
    return {
      originations: total,
      avgLoan: loanCount > 0 ? Math.round(loanSum / loanCount) : 0,
      districtCount: districts.size,
    };
  }, [hmda]);

  // ABS firms
  const firmCount = useMemo(() => {
    if (!abs || abs.length === 0) return 0;
    return abs.reduce((s, r) => s + (r.asianOwnedFirms || 0), 0);
  }, [abs]);

  // SBA
  const sbaStats = useMemo(() => {
    if (!sba || sba.length === 0) return null;
    let loans = 0, amount = 0;
    sba.forEach(r => {
      loans += (r.sba7aSurnameLoans || 0) + (r.sba504SurnameLoans || 0);
      amount += (r.sba7aSurnameAmount || 0) + (r.sba504SurnameAmount || 0);
    });
    return { loans, amount };
  }, [sba]);

  // NIH grants
  const nihStats = useMemo(() => {
    if (!grants || grants.length === 0) return null;
    const awards = grants.reduce((s, r) => s + (r.nihMatchedAwards || 0), 0);
    const amount = grants.reduce((s, r) => s + (r.nihMatchedAmount || 0), 0);
    return { awards, amount };
  }, [grants]);

  // FEC
  const fecStats = useMemo(() => {
    if (!fec || fec.length === 0) return null;
    const byCycle = {};
    fec.forEach(r => {
      const c = String(r.electionCycle);
      if (!c) return;
      byCycle[c] = (byCycle[c] || 0) + (r.totalContributions || 0);
    });
    const cycles = Object.keys(byCycle).sort();
    const total = Object.values(byCycle).reduce((s, v) => s + v, 0);
    return { total, cycleCount: cycles.length, yearRange: cycles.length > 0 ? `${cycles[0]}–${cycles[cycles.length - 1]}` : "" };
  }, [fec]);

  // Clickable summary card
  const SummaryRow = ({ icon, title, stat, detail, sectionKey }) => (
    <div
      onClick={() => onNavigate(sectionKey)}
      style={{
        display: "flex", gap: 14, padding: "14px 18px", cursor: "pointer",
        borderBottom: `1px solid ${C.borderLight}`, transition: "background 0.15s",
      }}
      onMouseOver={e => e.currentTarget.style.background = C.surfaceAlt}
      onMouseOut={e => e.currentTarget.style.background = "transparent"}
    >
      <div style={{ fontSize: 20, flexShrink: 0, width: 28, textAlign: "center", lineHeight: "28px" }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted, fontFamily: font.mono }}>{title}</div>
        <div style={{ fontSize: 18, fontWeight: 800, fontFamily: font.mono, color: C.navy, margin: "2px 0" }}>{stat}</div>
        <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.5 }}>{detail}</div>
      </div>
      <div style={{ alignSelf: "center", color: C.textMuted, fontSize: 14, flexShrink: 0 }}>{"\u203A"}</div>
    </div>
  );

  return (
    <div>
      {/* Big-picture framing */}
      <Card style={{ marginBottom: 20, borderLeft: `4px solid ${C.saffron}` }}>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, lineHeight: 1.6, fontFamily: font.display }}>
            Indian Americans are among the highest-earning, most-educated, and most civically active immigrant communities in the United States.
          </div>
          <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 8, lineHeight: 1.7 }}>
            This dashboard quantifies their economic footprint across labor markets, homeownership, business formation, scientific research, and political contributions — using federal data sources ranging from exact counts to surname-based estimates.
          </div>
        </div>
      </Card>

      {/* Summary rows */}
      <Card style={{ marginBottom: 20 }}>
        {/* Immigration Pipeline */}
        <SummaryRow
          sectionKey="immigration"
          icon={"\uD83D\uDCCB"}
          title="Immigration Pipeline"
          stat={permStats.avgWage ? `$${permStats.avgWage.toLocaleString()} avg offered wage` : `${permStats.totalIndia.toLocaleString()} PERM certifications`}
          detail={
            permStats.totalIndia > 0
              ? `${permStats.totalIndia.toLocaleString()} India-born PERM certifications across ${permStats.districtCount} districts (${permStats.yearRange}).${uscisStats ? ` ${uscisStats.totalNat.toLocaleString()} naturalizations since 2001.` : ""}`
              : uscisStats ? `${uscisStats.latestLpr.toLocaleString()} LPR admissions and ${uscisStats.latestNat.toLocaleString()} naturalizations (${uscisStats.latestYear}).` : "Data loading..."
          }
        />

        {/* Household Wealth */}
        <SummaryRow
          sectionKey="wealth"
          icon={"\uD83C\uDFE0"}
          title="Household Wealth"
          stat={hmdaStats ? `${hmdaStats.originations.toLocaleString()} mortgage originations` : "—"}
          detail={hmdaStats ? `Avg ${fmtDollar(hmdaStats.avgLoan)} loan amount across ${hmdaStats.districtCount} districts. HMDA race code 21 (Asian Indian), borrower self-reported.` : "Data loading..."}
        />

        {/* Business Ownership */}
        <SummaryRow
          sectionKey="business"
          icon={"\uD83C\uDFED"}
          title="Business Ownership"
          stat={
            firmCount > 0
              ? `${firmCount.toLocaleString()} Asian-owned employer firms`
              : sbaStats ? `${sbaStats.loans.toLocaleString()} SBA loans` : "—"
          }
          detail={[
            firmCount > 0 ? "Census ABS — all Asian ethnicities" : null,
            sbaStats ? `${sbaStats.loans.toLocaleString()} SBA loans totaling ${fmtDollar(sbaStats.amount)} (surname estimate)` : null,
          ].filter(Boolean).join(". ") || "Data loading..."}
        />

        {/* Scientific Research */}
        <SummaryRow
          sectionKey="research"
          icon={"\uD83D\uDD2C"}
          title="Scientific Research"
          stat={nihStats ? `${nihStats.awards.toLocaleString()} NIH-funded investigators` : "—"}
          detail={nihStats ? `${fmtDollar(nihStats.amount)} in total NIH research funding (surname estimate)` : "Data loading..."}
        />

        {/* Political Economy */}
        <SummaryRow
          sectionKey="political"
          icon={"\uD83D\uDDF3\uFE0F"}
          title="Political Contributions"
          stat={fecStats ? `${fmtDollar(fecStats.total)}+ to federal campaigns` : "—"}
          detail={fecStats ? `Across ${fecStats.cycleCount} election cycles (${fecStats.yearRange}). Presidential cycles average 3–4× midterm volumes.` : "Data loading..."}
        />
      </Card>

      {/* Data quality note */}
      <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6, fontStyle: "italic" }}>
        Data combines three methodologies: exact federal race classification (USCIS, HMDA, ACS, ABS), employer-reported filings (DOL PERM), and surname-based estimation (SBA, NIH, FEC — ~88–92% precision). Click any section above for detailed breakdowns.
      </div>
    </div>
  );
}

export function EconomicPresenceTab({
  permDistrictData, permStateData,
  permDistrict, setPermDistrict,
  permEmpDistrict, setPermEmpDistrict,
  permEmpYear, setPermEmpYear,
  permSubTab, setPermSubTab,
  isMobile,
}) {
  const [activeSection, setActiveSection] = useState("overview");
  const economicData = useEconomicData();

  return (
    <div>
      {/* Sub-navigation pills */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 24, overflowX: "auto",
        WebkitOverflowScrolling: "touch", paddingBottom: 2,
      }}>
        {SUB_SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            style={{
              padding: isMobile ? "8px 14px" : "8px 18px",
              fontSize: isMobile ? 11 : 13,
              fontWeight: 600,
              fontFamily: font.body,
              border: `1px solid ${activeSection === s.key ? C.saffronDark : C.royalBlue}`,
              borderRadius: 20,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
              background: activeSection === s.key ? C.saffronDark : C.surface,
              color: activeSection === s.key ? "#FFFFFF" : C.royalBlue,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      {activeSection === "overview" && (
        <OverviewSummary
          economicData={economicData}
          permDistrictData={permDistrictData}
          isMobile={isMobile}
          onNavigate={setActiveSection}
        />
      )}

      {activeSection === "immigration" && (
        <ImmigrationPipeline
          permDistrictData={permDistrictData}
          permStateData={permStateData}
          permDistrict={permDistrict}
          setPermDistrict={setPermDistrict}
          permEmpDistrict={permEmpDistrict}
          setPermEmpDistrict={setPermEmpDistrict}
          permEmpYear={permEmpYear}
          setPermEmpYear={setPermEmpYear}
          permSubTab={permSubTab}
          setPermSubTab={setPermSubTab}
          isMobile={isMobile}
        />
      )}

      {activeSection === "wealth" && (
        <HouseholdWealth data={economicData} isMobile={isMobile} />
      )}

      {activeSection === "business" && (
        <BusinessOwnership data={economicData} isMobile={isMobile} />
      )}

      {activeSection === "research" && (
        <ResearchInnovation data={economicData} isMobile={isMobile} />
      )}

      {activeSection === "political" && (
        <PoliticalEconomy data={economicData} isMobile={isMobile} />
      )}
    </div>
  );
}
