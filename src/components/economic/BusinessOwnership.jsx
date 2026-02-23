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

function StatCard({ label, value, note, badge }) {
  return (
    <Card>
      <div style={{ padding: "16px 18px" }}>
        {badge && <div style={{ marginBottom: 8 }}>{badge}</div>}
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted, fontFamily: font.mono }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: font.mono, color: C.navy, margin: "4px 0" }}>{value}</div>
        {note && <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.5 }}>{note}</div>}
      </div>
    </Card>
  );
}

export function BusinessOwnership({ data, districtId, isMobile }) {
  const abs = data.abs || [];
  const sba = data.sba || [];

  const absRow = abs.length > 0 ? abs[0] : null;
  const firmCount = absRow?.asianOwnedFirms || 0;

  // TEMP DEBUG — discover SBA columns
  if (sba.length > 0) {
    console.log("[DEBUG] sba_loans first row keys:", Object.keys(sba[0]), "first row:", sba[0]);
  }

  // SBA aggregation — columns: sba7aSurnameLoans, sba7aSurnameAmount, sba504SurnameLoans, sba504SurnameAmount
  const sbaTotal = useMemo(() => {
    const total = { loans7a: 0, loans504: 0, amount7a: 0, amount504: 0 };
    const years = new Set();
    sba.forEach(r => {
      total.loans7a += r.sba7aSurnameLoans || 0;
      total.amount7a += r.sba7aSurnameAmount || 0;
      total.loans504 += r.sba504SurnameLoans || 0;
      total.amount504 += r.sba504SurnameAmount || 0;
      // Try multiple possible year column names
      const y = r.dataYear || r.fiscalYear || r.approvalYear || r.year;
      if (y) years.add(String(y));
    });
    total.totalLoans = total.loans7a + total.loans504;
    total.totalAmount = total.amount7a + total.amount504;
    const sortedYears = [...years].sort();
    total.yearRange = sortedYears.length > 0
      ? `${sortedYears[0]}–${sortedYears[sortedYears.length - 1]}`
      : null;
    return total;
  }, [sba]);

  const hasAnyData = sba.length > 0 || absRow;

  if (!hasAnyData) {
    return (
      <Card>
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted }}>
            Business Ownership Data Not Available
          </div>
          <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, marginTop: 8 }}>
            {districtId ? `No business ownership data for ${districtId}.` : "Business data is not yet loaded."}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, fontFamily: font.display, color: C.navy }}>
          Business Formation & Entrepreneurship
        </h3>
        {sbaTotal.yearRange && (
          <p style={{ margin: 0, fontSize: 12, color: C.textSecondary }}>
            SBA loan data, {sbaTotal.yearRange}
          </p>
        )}
      </div>

      {/* Hero callout — SBA surname-based (primary) */}
      {sba.length > 0 && (
        <Card style={{ marginBottom: 20, borderLeft: `4px solid ${C.saffron}` }}>
          <div style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <SourceBadge type="surname" label="SBA — Indian surname estimate" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: font.mono, color: C.navy }}>
              {sbaTotal.totalLoans.toLocaleString()} SBA loans
            </div>
            <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 4 }}>
              {fmtDollar(sbaTotal.totalAmount)} in total SBA capital
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <StatCard
          label="7(a) Program Loans"
          badge={<SourceBadge type="surname" />}
          value={sbaTotal.loans7a.toLocaleString()}
          note={`${fmtDollar(sbaTotal.amount7a)} in approved capital`}
        />

        <StatCard
          label="504 Program Loans"
          badge={<SourceBadge type="surname" />}
          value={sbaTotal.loans504.toLocaleString()}
          note={`${fmtDollar(sbaTotal.amount504)} in approved capital`}
        />
      </div>

      {/* ABS context — de-emphasized, broader Asian category */}
      {firmCount > 0 && (
        <Card style={{ marginBottom: 16, opacity: 0.75 }}>
          <div style={{ padding: "12px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <SourceBadge type="exact" label="Census ABS 2023" />
            </div>
            <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.6 }}>
              For context: <strong style={{ color: C.navy }}>{firmCount.toLocaleString()}</strong> Asian-owned employer firms nationally (Census ABS — all Asian ethnicities, not Indian-specific).
              Indian Americans are estimated to own 20–25% of Asian-owned businesses based on population share.
            </div>
          </div>
        </Card>
      )}

      <MethodologyNote>
        SBA loan data uses Indian surname analysis on business owner names following
        Ramakrishnan et al. (AAPI Data) methodology. This significantly undercounts
        firms where the business name does not contain the owner's surname.
        Treat SBA figures as floor estimates. ABS data uses Census race classification
        but only reports "Asian" as a single category — Asian Indian is not broken out.
      </MethodologyNote>
    </div>
  );
}
