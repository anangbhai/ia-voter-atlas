import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
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

function DataCard({ title, badge, children }) {
  return (
    <Card>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, fontFamily: font.display, color: C.navy }}>{title}</h4>
          {badge}
        </div>
        {children}
      </div>
    </Card>
  );
}

function Stat({ label, value, note }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted, fontFamily: font.mono }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: font.mono, color: C.navy, margin: "2px 0" }}>{value}</div>
      {note && <div style={{ fontSize: 10, color: C.textSecondary }}>{note}</div>}
    </div>
  );
}

export function BusinessOwnership({ data, districtId, isMobile }) {
  const acs = data.acs || [];
  const abs = data.abs || [];
  const sba = data.sba || [];

  const acsRow = acs.length > 0 ? acs[0] : null;
  const absRow = abs.length > 0 ? abs[0] : null;

  // SBA aggregation — columns: sba7aSurnameLoans, sba7aSurnameAmount, sba504SurnameLoans, sba504SurnameAmount, dataYear
  const sbaTotal = useMemo(() => {
    const total = { loans7a: 0, loans504: 0, amount7a: 0, amount504: 0, periods: [] };
    sba.forEach(r => {
      total.loans7a += r.sba7aSurnameLoans || 0;
      total.amount7a += r.sba7aSurnameAmount || 0;
      total.loans504 += r.sba504SurnameLoans || 0;
      total.amount504 += r.sba504SurnameAmount || 0;
      const period = r.dataYear || "";
      if (period && !total.periods.includes(period)) total.periods.push(period);
    });
    total.totalLoans = total.loans7a + total.loans504;
    total.totalAmount = total.amount7a + total.amount504;
    return total;
  }, [sba]);

  // SBA timeline chart data — group by data_year TEXT periods
  const sbaChartData = useMemo(() => {
    const byPeriod = {};
    sba.forEach(r => {
      const period = r.dataYear || "Unknown";
      if (!byPeriod[period]) byPeriod[period] = { period, loans7a: 0, loans504: 0, totalAmount: 0 };
      byPeriod[period].loans7a += r.sba7aSurnameLoans || 0;
      byPeriod[period].loans504 += r.sba504SurnameLoans || 0;
      byPeriod[period].totalAmount += (r.sba7aSurnameAmount || 0) + (r.sba504SurnameAmount || 0);
    });
    // Sort by first 4 chars of period string (not numerically)
    return Object.values(byPeriod).sort((a, b) => a.period.localeCompare(b.period));
  }, [sba]);

  const hasAnyData = acsRow || absRow || sba.length > 0;

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

      {/* Three data cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        {/* Card 1 — Self-Employment (ACS) */}
        <DataCard title="Self-Employment" badge={<SourceBadge type="exact" label="Census ACS 2023" />}>
          {acsRow ? (
            <>
              <Stat
                label="Self-employed Indian Americans"
                value={(acsRow.selfEmployed || acsRow.selfEmployedCount || 0).toLocaleString()}
                note={acsRow.selfEmploymentRate ? `${(acsRow.selfEmploymentRate * 100).toFixed(1)}% of labor force` : undefined}
              />
              {(acsRow.medianSelfEmploymentIncome || acsRow.selfEmploymentIncome) && (
                <Stat
                  label="Median SE Income"
                  value={fmtDollar(acsRow.medianSelfEmploymentIncome || acsRow.selfEmploymentIncome)}
                />
              )}
            </>
          ) : (
            <p style={{ fontSize: 12, color: C.textMuted }}>ACS data not available for this district.</p>
          )}
        </DataCard>

        {/* Card 2 — Employer Businesses (ABS) */}
        <DataCard title="Employer Businesses" badge={<SourceBadge type="exact" label="Census ABS 2023" />}>
          {absRow ? (
            <>
              <Stat
                label="Indian American-owned firms"
                value={(absRow.firmCount || absRow.businesses || 0).toLocaleString()}
              />
              {(absRow.totalEmployees || absRow.employees) && (
                <Stat label="Total employees" value={(absRow.totalEmployees || absRow.employees).toLocaleString()} />
              )}
              {(absRow.annualPayroll || absRow.payroll) && (
                <Stat label="Annual payroll" value={fmtDollar(absRow.annualPayroll || absRow.payroll)} />
              )}
              <p style={{ fontSize: 10, color: C.textMuted, marginTop: 6, fontStyle: "italic" }}>
                ABS data available at state level; district-level estimates are proportional.
              </p>
            </>
          ) : (
            <p style={{ fontSize: 12, color: C.textMuted }}>ABS data not available for this area.</p>
          )}
        </DataCard>

        {/* Card 3 — SBA Loans */}
        <DataCard title="SBA Loans" badge={<SourceBadge type="surname" />}>
          {sba.length > 0 ? (
            <>
              <Stat
                label="Total SBA loans"
                value={sbaTotal.totalLoans.toLocaleString()}
                note={`7(a): ${sbaTotal.loans7a.toLocaleString()} · 504: ${sbaTotal.loans504.toLocaleString()}`}
              />
              <Stat label="Total value" value={fmtDollar(sbaTotal.totalAmount)} />
              {sbaTotal.periods.length > 0 && (
                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>
                  Periods: {sbaTotal.periods.join(", ")}
                </div>
              )}
              <div style={{
                display: "inline-block", marginTop: 8, padding: "3px 8px",
                background: C.saffronBg, borderRadius: 4, fontSize: 9,
                fontWeight: 700, color: C.saffronText, letterSpacing: 0.3,
              }}>
                Floor estimate — surname-on-business-name undercounts
              </div>
            </>
          ) : (
            <p style={{ fontSize: 12, color: C.textMuted }}>SBA data not available for this area.</p>
          )}
        </DataCard>
      </div>

      {/* SBA Timeline Chart */}
      {sbaChartData.length > 1 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ padding: "16px 18px" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, fontFamily: font.display, color: C.navy }}>
              SBA Loan Activity by Period
            </h4>
            <div style={{ width: "100%", height: isMobile ? 180 : 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sbaChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fontFamily: font.mono, fill: C.textMuted }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontFamily: font.mono, fill: C.textMuted }} tickLine={false} axisLine={false} width={35} />
                  <Tooltip
                    contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12 }}
                    formatter={(value, name) => [value.toLocaleString(), name === "loans7a" ? "7(a) Loans" : "504 Loans"]}
                  />
                  <Bar dataKey="loans7a" fill={C.navy} opacity={0.7} radius={[3, 3, 0, 0]} name="loans7a" />
                  <Bar dataKey="loans504" fill={C.saffron} opacity={0.8} radius={[3, 3, 0, 0]} name="loans504" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: C.textSecondary }}>
              <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.navy, opacity: 0.7, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} /> 7(a) Loans</span>
              <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.saffron, opacity: 0.8, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} /> 504 Loans</span>
            </div>
          </div>
        </Card>
      )}

      <MethodologyNote>
        Three methodologies with different precision levels are combined here.
        ACS and ABS use exact federal race classification — these are counts, not estimates.
        SBA uses surname analysis on business names, which significantly undercounts firms where the business name
        does not contain the owner's surname. Treat SBA figures as minimums.
        All three sources are presented together because each captures a different part of the entrepreneurship picture:
        self-employment (ACS), established employer firms (ABS), and capital access (SBA).
      </MethodologyNote>
    </div>
  );
}
