import { useMemo } from "react";
import { C, font } from "../../lib/theme.js";
import { StatCard } from "../shared/StatCard.jsx";
import { SourceBadge } from "../shared/SourceBadge.jsx";
import { MethodologyNote } from "../shared/MethodologyNote.jsx";

function Card({ children, style = {} }) {
  return <div style={{
    background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`,
    boxShadow: "0 1px 3px rgba(30,45,61,0.04), 0 1px 2px rgba(30,45,61,0.02)",
    ...style
  }}>{children}</div>;
}

const fmtDollar = v => {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v}`;
};

export function HouseholdWealth({ data, districtId, isMobile }) {
  const hmda = data.hmda || [];
  const acs = data.acs || [];

  // HMDA national summary — aggregate across all districts
  const hmdaSummary = useMemo(() => {
    if (hmda.length === 0) return null;
    const districts = new Set();
    let totalOriginations = 0;
    let loanAmountSum = 0;
    let loanAmountCount = 0;
    const years = new Set();

    hmda.forEach(r => {
      if (r.districtId) districts.add(r.districtId);
      const y = r.year || r.dataYear;
      if (y) years.add(y);
      totalOriginations += r.originationCount || 0;
      const rowOrig = r.originationCount || 0;
      const rowAvg = r.avgLoanAmount || 0;
      if (rowAvg > 0 && rowOrig > 0) {
        loanAmountSum += rowAvg * rowOrig;
        loanAmountCount += rowOrig;
      }
    });

    const sortedYears = [...years].sort();
    const yearRange = sortedYears.length > 0 ? `${sortedYears[0]}–${sortedYears[sortedYears.length - 1]}` : "";
    const avgLoan = loanAmountCount > 0 ? Math.round(loanAmountSum / loanAmountCount) : 0;

    return {
      totalOriginations,
      avgLoanAmount: avgLoan,
      districtCount: districts.size,
      yearRange,
    };
  }, [hmda]);

  // ACS homeownership data — aggregate across rows
  const homeownership = useMemo(() => {
    if (acs.length === 0) return null;
    // If filtered to one district, use first row; otherwise average across all
    if (acs.length === 1) {
      const r = acs[0];
      return {
        rate: r.asianHomeownershipRate,
        units: r.ownerOccupiedAsianHouseholder,
      };
    }
    // Multiple rows: compute weighted average or sum
    let totalUnits = 0;
    let rateSum = 0;
    let rateCount = 0;
    acs.forEach(r => {
      if (r.ownerOccupiedAsianHouseholder) totalUnits += r.ownerOccupiedAsianHouseholder;
      if (r.asianHomeownershipRate != null) {
        rateSum += r.asianHomeownershipRate;
        rateCount++;
      }
    });
    return {
      rate: rateCount > 0 ? rateSum / rateCount : null,
      units: totalUnits,
    };
  }, [acs]);

  const hasHmda = hmdaSummary && hmdaSummary.totalOriginations > 0;
  const hasHomeownership = homeownership && (homeownership.rate != null || homeownership.units > 0);

  if (!hasHmda && !hasHomeownership) {
    return (
      <Card>
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted }}>
            Household Wealth Data Not Available
          </div>
          <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, marginTop: 8, maxWidth: 400, margin: "8px auto 0" }}>
            {districtId
              ? `Household wealth data not available for ${districtId}.`
              : "Household wealth data is not yet loaded."}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, fontFamily: font.display, color: C.navy }}>
          Household Wealth & Homeownership
        </h3>
      </div>

      {/* ACS Homeownership stats */}
      {hasHomeownership && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: font.display, color: C.navy }}>
              Homeownership
            </h4>
            <SourceBadge type="exact" label="Census ACS 2023" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
            {homeownership.rate != null && (
              <StatCard
                label="Asian Homeownership Rate"
                value={`${(homeownership.rate * 100).toFixed(1)}%`}
                sub="All Asian ethnicities — Census ACS"
              />
            )}
            {homeownership.units > 0 && (
              <StatCard
                label="Owner-Occupied Units"
                value={homeownership.units.toLocaleString()}
                sub="Asian householders"
              />
            )}
          </div>
          <p style={{ fontSize: 11, color: C.textMuted, marginTop: 8, fontStyle: "italic" }}>
            Census ACS reports "Asian" as a single category — Asian Indian is not broken out separately.
          </p>
        </div>
      )}

      {/* HMDA National Summary */}
      {hasHmda && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: font.display, color: C.navy }}>
              Mortgage Activity
            </h4>
            <SourceBadge type="exact" />
          </div>

          {/* Hero callout */}
          <Card style={{ marginBottom: 16, borderLeft: `4px solid ${C.royalBlue}` }}>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, lineHeight: 1.6 }}>
                {hmdaSummary.totalOriginations.toLocaleString()} mortgage originations tracked across {hmdaSummary.districtCount} districts, {hmdaSummary.yearRange}
              </div>
              <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 4 }}>
                Average loan amount: <strong style={{ color: C.navy }}>{fmtDollar(hmdaSummary.avgLoanAmount)}</strong>
              </div>
            </div>
          </Card>

          <p style={{ fontSize: 11, color: C.textMuted, margin: "0 0 4px" }}>
            CFPB Home Mortgage Disclosure Act (HMDA), {hmdaSummary.yearRange}. Exact count — HMDA race code 21 (Asian Indian), borrower self-reported.
          </p>
          <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>
            Coverage: {hmdaSummary.districtCount} of 24 tracked districts have sufficient HMDA volume for reliable estimates.
          </p>
        </div>
      )}

      <MethodologyNote>
        Homeownership data from Census ACS uses federal race classification but groups all Asian
        ethnicities together. HMDA data covers institutional lenders filing with CFPB — cash purchases
        and private loans are excluded. Race coding is borrower-reported; mixed-race applicants may be
        coded inconsistently.
      </MethodologyNote>
    </div>
  );
}
