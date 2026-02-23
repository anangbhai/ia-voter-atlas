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
  const yearRange = grantsByYear.length > 0
    ? `${grantsByYear[0].year}–${grantsByYear[grantsByYear.length - 1].year}`
    : "";

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, fontFamily: font.display, color: C.navy }}>
          Scientific Research
        </h3>
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
          {/* Hero stat — people, not dollars */}
          <Card style={{ marginBottom: 20, borderLeft: `4px solid ${C.saffron}` }}>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                <SourceBadge type="surname" label="NIH Reporter API — Indian surname estimate" />
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: font.mono, color: C.navy }}>
                {totalAwards.toLocaleString()}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.textSecondary, marginTop: 2 }}>
                Indian American principal investigators funded by NIH{yearRange ? ` since ${grantsByYear[0].year}` : ""}
              </div>
              <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 8 }}>
                {fmtDollar(totalAmount)} in total research funding
              </div>
            </div>
          </Card>

          {/* Chart */}
          {grantsByYear.length > 1 && (
            <Card style={{ marginBottom: 16 }}>
              <div style={{ padding: "16px 18px" }}>
                <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, fontFamily: font.display, color: C.navy }}>
                  NIH-Funded Investigators & Research Value by Year
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
                          name === "awards" ? "Investigators Funded" : "Research Value"
                        ]}
                      />
                      <Bar yAxisId="left" dataKey="awards" fill={C.saffron} opacity={0.8} radius={[3, 3, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="amount" stroke={C.royalBlue} strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: C.textSecondary }}>
                  <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.saffron, opacity: 0.8, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} /> Investigators Funded</span>
                  <span><span style={{ display: "inline-block", width: 10, height: 3, background: C.royalBlue, borderRadius: 1, marginRight: 4, verticalAlign: "middle" }} /> Research Value</span>
                </div>
              </div>
            </Card>
          )}

          <MethodologyNote>
            Indian surname analysis on PI last names following Ramakrishnan et al. (AAPI Data) methodology.
            NIH does not collect PI race/ethnicity in public data. Underestimates Indian American
            researchers with non-Indian surnames.
          </MethodologyNote>
        </>
      )}
    </div>
  );
}
