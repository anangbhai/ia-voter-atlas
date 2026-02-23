import { useMemo } from "react";
import { C, font } from "../../lib/theme.js";
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

// Helper: try multiple possible column names for a value
const getOrig = r => r.originationCount || r.totalOriginations || r.originations || r.count || 0;
const getLoan = r => r.avgLoanAmount || r.averageLoanAmount || r.medianLoanAmount || r.loanAmount || 0;
const getYear = r => r.year || r.dataYear || r.filingYear || null;

export function HouseholdWealth({ data, districtId, isMobile }) {
  const hmda = data.hmda || [];

  // TEMP DEBUG — log first row to find actual column names
  if (hmda.length > 0) {
    console.log("[DEBUG] hmda_by_district row count:", hmda.length, "first row keys:", Object.keys(hmda[0]), "first row:", hmda[0]);
  } else {
    console.log("[DEBUG] hmda_by_district: EMPTY array");
  }

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
      const y = getYear(r);
      if (y) years.add(y);
      const orig = getOrig(r);
      totalOriginations += orig;
      const avg = getLoan(r);
      if (avg > 0 && orig > 0) {
        loanAmountSum += avg * orig;
        loanAmountCount += orig;
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

  const hasHmda = hmdaSummary && hmdaSummary.totalOriginations > 0;

  if (!hasHmda) {
    return (
      <Card>
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted }}>
            Household Wealth Data Not Available
          </div>
          <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, marginTop: 8, maxWidth: 400, margin: "8px auto 0" }}>
            {districtId
              ? `HMDA mortgage data not available for ${districtId}. Coverage limited to 8 of 24 tracked districts.`
              : "HMDA mortgage data is not yet loaded."}
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

      {/* HMDA Summary */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <SourceBadge type="exact" label="HMDA Race Code 21 — Asian Indian" />
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

      <MethodologyNote>
        HMDA data covers institutional lenders filing with CFPB — cash purchases
        and private loans are excluded. Race coding is borrower-reported using HMDA
        race code 21 (Asian Indian specifically, not all Asian). Mixed-race applicants
        may be coded inconsistently.
      </MethodologyNote>
    </div>
  );
}
