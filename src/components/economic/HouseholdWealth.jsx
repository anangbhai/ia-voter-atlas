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
  if (v >= 1000000000) return `$${(v / 1000000000).toFixed(1)}B`;
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v}`;
};

export function HouseholdWealth({ data, districtId, isMobile }) {
  const hmda = data.hmda || [];

  // HMDA schema (from debug):
  //   originations, applicationsTotal, approvalRate, denials,
  //   avgLoanAmountThousands, medianLoanAmountThousands, totalLoanAmountThousands,
  //   avgApplicantIncomeThousands, medianApplicantIncomeThousands,
  //   purchaseCount, refinanceCount, singleFamilyCount, multifamilyCount,
  //   districtId, dataYear, boundaryCongress, sourceUrl, updatedAt
  //
  // "Thousands" columns are in $1,000 units — multiply by 1000 for actual dollars

  const hmdaSummary = useMemo(() => {
    if (hmda.length === 0) return null;
    const districts = new Set();
    let totalOriginations = 0;
    let totalLoanThousands = 0;
    let totalApplications = 0;
    let totalPurchase = 0;
    let totalRefi = 0;
    const years = new Set();

    hmda.forEach(r => {
      if (r.districtId) districts.add(r.districtId);
      if (r.dataYear) years.add(r.dataYear);
      totalOriginations += r.originations || 0;
      totalLoanThousands += r.totalLoanAmountThousands || 0;
      totalApplications += r.applicationsTotal || 0;
      totalPurchase += r.purchaseCount || 0;
      totalRefi += r.refinanceCount || 0;
    });

    const sortedYears = [...years].sort();
    const yearRange = sortedYears.length > 0 ? `${sortedYears[0]}–${sortedYears[sortedYears.length - 1]}` : "";
    // Convert from thousands to actual dollars
    const avgLoan = totalOriginations > 0 ? Math.round((totalLoanThousands / totalOriginations) * 1000) : 0;
    const avgApproval = hmda.length > 0
      ? hmda.reduce((s, r) => s + (r.approvalRate || 0), 0) / hmda.length
      : 0;

    return {
      totalOriginations,
      totalLoanDollars: totalLoanThousands * 1000,
      avgLoanAmount: avgLoan,
      avgApprovalRate: avgApproval,
      totalApplications,
      totalPurchase,
      totalRefi,
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
              {" · "}Total volume: <strong style={{ color: C.navy }}>{fmtDollar(hmdaSummary.totalLoanDollars)}</strong>
            </div>
          </div>
        </Card>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
          <Card>
            <div style={{ padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted, fontFamily: font.mono }}>Applications</div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: font.mono, color: C.navy, margin: "2px 0" }}>{hmdaSummary.totalApplications.toLocaleString()}</div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted, fontFamily: font.mono }}>Avg Approval Rate</div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: font.mono, color: C.navy, margin: "2px 0" }}>{(hmdaSummary.avgApprovalRate * 100).toFixed(0)}%</div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted, fontFamily: font.mono }}>Purchases</div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: font.mono, color: C.navy, margin: "2px 0" }}>{hmdaSummary.totalPurchase.toLocaleString()}</div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted, fontFamily: font.mono }}>Refinances</div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: font.mono, color: C.navy, margin: "2px 0" }}>{hmdaSummary.totalRefi.toLocaleString()}</div>
            </div>
          </Card>
        </div>

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
