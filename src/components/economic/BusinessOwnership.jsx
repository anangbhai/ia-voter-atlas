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

  // ABS data — asianOwnedFirms is the real column
  const firmCount = absRow?.asianOwnedFirms || 0;

  // SBA aggregation — columns: sba7aSurnameLoans, sba7aSurnameAmount, sba504SurnameLoans, sba504SurnameAmount
  const sbaTotal = useMemo(() => {
    const total = { loans7a: 0, loans504: 0, amount7a: 0, amount504: 0 };
    sba.forEach(r => {
      total.loans7a += r.sba7aSurnameLoans || 0;
      total.amount7a += r.sba7aSurnameAmount || 0;
      total.loans504 += r.sba504SurnameLoans || 0;
      total.amount504 += r.sba504SurnameAmount || 0;
    });
    total.totalLoans = total.loans7a + total.loans504;
    total.totalAmount = total.amount7a + total.amount504;
    return total;
  }, [sba]);

  const hasAnyData = absRow || sba.length > 0;

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
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <StatCard
          label="Asian-Owned Employer Firms"
          badge={<SourceBadge type="exact" label="Census ABS 2023" />}
          value={firmCount.toLocaleString()}
          note="All Asian ethnicities — ABS does not break out Asian Indian separately"
        />

        <StatCard
          label="Total SBA Loans"
          badge={<SourceBadge type="surname" />}
          value={sbaTotal.totalLoans.toLocaleString()}
          note={`7(a): ${sbaTotal.loans7a.toLocaleString()} · 504: ${sbaTotal.loans504.toLocaleString()}`}
        />

        <StatCard
          label="Total SBA Capital"
          badge={<SourceBadge type="surname" />}
          value={fmtDollar(sbaTotal.totalAmount)}
          note="Floor estimate — surname-on-business-name undercounts"
        />
      </div>

      <MethodologyNote>
        Two methodologies with different precision levels are combined here.
        ABS uses exact federal race classification but reports "Asian" as a single category — Asian Indian
        is not broken out separately. SBA uses surname analysis on business names, which significantly
        undercounts firms where the business name does not contain the owner's surname.
        Treat SBA figures as minimums.
      </MethodologyNote>
    </div>
  );
}
