import { useMemo } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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
  if (v >= 1000000000) return `$${(v / 1000000000).toFixed(1)}B`;
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v}`;
};

export function ResearchInnovation({ data, isMobile }) {
  const grants = data.grants || [];

  // NIH grants by year — columns: dataYear, state, nihMatchedAwards, nihMatchedAmount
  const grantsByYear = useMemo(() => {
    const byYear = {};
    grants.forEach(r => {
      const y = r.dataYear;
      if (!y) return;
      if (!byYear[y]) byYear[y] = { year: y, awards: 0, amount: 0 };
      byYear[y].awards += r.nihMatchedAwards || 0;
      byYear[y].amount += r.nihMatchedAmount || 0;
    });
    return Object.values(byYear).sort((a, b) => a.year - b.year);
  }, [grants]);

  const totalAwards = grants.reduce((s, r) => s + (r.nihMatchedAwards || 0), 0);
  const totalAmount = grants.reduce((s, r) => s + (r.nihMatchedAmount || 0), 0);
  const latest = grantsByYear.length > 0 ? grantsByYear[grantsByYear.length - 1] : null;
  const prevYear = grantsByYear.length > 1 ? grantsByYear[grantsByYear.length - 2] : null;
  const yoyGrowth = latest && prevYear && prevYear.amount > 0
    ? ((latest.amount - prevYear.amount) / prevYear.amount * 100).toFixed(1)
    : null;

  // Note: grants_south_asian has no institution/org column — top institutions not available

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, fontFamily: font.display, color: C.navy }}>
          Scientific Research & Skilled Immigration
        </h3>
      </div>

      {/* Panel 1 — NIH Research Grants */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: font.display, color: C.navy }}>
            NIH Research Grants
          </h4>
          <SourceBadge type="surname" label="NIH Reporter API — Surname estimate" />
        </div>

        {grants.length === 0 ? (
          <Card>
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted }}>
                NIH Grant Data Not Available
              </div>
              <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 8 }}>
                NIH grant data not available for this state.
              </div>
            </div>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
              <StatCard label="Total NIH Awards" value={totalAwards.toLocaleString()} sub="All years" />
              <StatCard label="Total Value" value={fmtDollar(totalAmount)} />
              <StatCard
                label={latest ? `${latest.year}` : "Latest"}
                value={latest ? fmtDollar(latest.amount) : "—"}
              />
              <StatCard
                label="YoY Growth"
                value={yoyGrowth !== null ? `${yoyGrowth > 0 ? "+" : ""}${yoyGrowth}%` : "—"}
                accent={yoyGrowth !== null ? (parseFloat(yoyGrowth) >= 0 ? C.positive : C.negative) : undefined}
              />
            </div>

            {/* Chart */}
            {grantsByYear.length > 1 && (
              <Card style={{ marginBottom: 16 }}>
                <div style={{ padding: "16px 18px" }}>
                  <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, fontFamily: font.display, color: C.navy }}>
                    NIH Awards & Funding by Year
                  </h4>
                  <div style={{ width: "100%", minHeight: isMobile ? 200 : 260 }}>
                    <ResponsiveContainer width="100%" height={isMobile ? 200 : 260}>
                      <ComposedChart data={grantsByYear} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
                        <XAxis dataKey="year" tick={{ fontSize: 10, fontFamily: font.mono, fill: C.textMuted }} tickLine={false} />
                        <YAxis
                          yAxisId="left"
                          tick={{ fontSize: 10, fontFamily: font.mono, fill: C.textMuted }}
                          tickLine={false} axisLine={false} width={35}
                        />
                        <YAxis
                          yAxisId="right" orientation="right"
                          tickFormatter={fmtDollar}
                          tick={{ fontSize: 10, fontFamily: font.mono, fill: C.textMuted }}
                          tickLine={false} axisLine={false} width={50}
                        />
                        <Tooltip
                          contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12 }}
                          formatter={(value, name) => [
                            name === "awards" ? value.toLocaleString() : fmtDollar(value),
                            name === "awards" ? "Awards" : "Funding"
                          ]}
                        />
                        <Bar yAxisId="left" dataKey="awards" fill={C.saffron} opacity={0.8} radius={[3, 3, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="amount" stroke={C.royalBlue} strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: C.textSecondary }}>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.saffron, opacity: 0.8, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} /> Award Count</span>
                    <span><span style={{ display: "inline-block", width: 10, height: 3, background: C.royalBlue, borderRadius: 1, marginRight: 4, verticalAlign: "middle" }} /> Funding Amount</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Top institutions */}
            <MethodologyNote>
              Surname analysis on PI last names following Ramakrishnan et al. (AAPI Data) methodology.
              NIH does not collect PI race/ethnicity in public data. Underestimates Indian American
              researchers with non-South-Asian surnames.
            </MethodologyNote>
          </>
        )}

        <p style={{ fontSize: 11, color: C.textMuted, marginTop: 12, fontStyle: "italic" }}>
          NSF data integration pending API resolution. Will be added in a future update.
        </p>
      </div>

      {/* Panel 2 — H-1B Context */}
      <Card style={{ borderLeft: `4px solid ${C.action}` }}>
        <div style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: font.display, color: C.navy }}>
              H-1B Skilled Immigration
            </h4>
            <SourceBadge type="proxy" />
          </div>
          <p style={{ fontSize: 13, color: C.textSecondary, margin: "0 0 8px", lineHeight: 1.6 }}>
            H-1B visas as a leading indicator of community growth nodes.
          </p>
          <Card style={{ background: C.saffronBg, border: `1px solid ${C.saffronLight}` }}>
            <div style={{ padding: "10px 14px", fontSize: 13, color: C.saffronText, fontWeight: 600 }}>
              Indian nationals received ~72% of all H-1B visas in FY2024
            </div>
          </Card>
          <p style={{ fontSize: 11, color: C.textMuted, marginTop: 10, lineHeight: 1.6, fontStyle: "italic" }}>
            Detailed H-1B employer data is available in the Immigration Pipeline sub-section via the DOL PERM Data Explorer.
          </p>
        </div>
      </Card>
    </div>
  );
}
