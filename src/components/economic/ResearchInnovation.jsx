import { useState, useMemo } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
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
  const [showAgency, setShowAgency] = useState("combined"); // combined | nih | nsf

  // Aggregate by year — with NIH and NSF breakdowns
  const grantsByYear = useMemo(() => {
    const byYear = {};
    grants.forEach(r => {
      const y = r.dataYear;
      if (!y) return;
      if (!byYear[y]) byYear[y] = { year: y, nihAwards: 0, nihAmount: 0, nsfAwards: 0, nsfAmount: 0 };
      byYear[y].nihAwards += r.nihMatchedAwards || 0;
      byYear[y].nihAmount += r.nihMatchedAmount || 0;
      byYear[y].nsfAwards += r.nsfMatchedAwards || 0;
      byYear[y].nsfAmount += r.nsfMatchedAmount || 0;
    });
    return Object.values(byYear)
      .map(d => ({
        ...d,
        totalAwards: d.nihAwards + d.nsfAwards,
        totalAmount: d.nihAmount + d.nsfAmount,
      }))
      .sort((a, b) => a.year - b.year);
  }, [grants]);

  const totals = useMemo(() => {
    const nihAwards = grants.reduce((s, r) => s + (r.nihMatchedAwards || 0), 0);
    const nihAmount = grants.reduce((s, r) => s + (r.nihMatchedAmount || 0), 0);
    const nsfAwards = grants.reduce((s, r) => s + (r.nsfMatchedAwards || 0), 0);
    const nsfAmount = grants.reduce((s, r) => s + (r.nsfMatchedAmount || 0), 0);
    return {
      nihAwards, nihAmount, nsfAwards, nsfAmount,
      totalAwards: nihAwards + nsfAwards,
      totalAmount: nihAmount + nsfAmount,
    };
  }, [grants]);

  const yearRange = grantsByYear.length > 0
    ? `${grantsByYear[0].year}–${grantsByYear[grantsByYear.length - 1].year}`
    : "";

  // Chart data keys based on toggle
  const chartAwardsKey = showAgency === "nih" ? "nihAwards" : showAgency === "nsf" ? "nsfAwards" : "totalAwards";
  const chartAmountKey = showAgency === "nih" ? "nihAmount" : showAgency === "nsf" ? "nsfAmount" : "totalAmount";
  const chartLabel = showAgency === "nih" ? "NIH" : showAgency === "nsf" ? "NSF" : "NIH + NSF";

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
              Research Grant Data Not Available
            </div>
            <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 8 }}>
              NIH and NSF grant data not available for this state.
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Hero stat */}
          <Card style={{ marginBottom: 20, borderLeft: `4px solid ${C.saffron}` }}>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                <SourceBadge type="surname" label="Surname estimate — NIH Reporter + NSF Awards" />
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: font.mono, color: C.navy }}>
                {totals.totalAwards.toLocaleString()} South Asian PI awards
              </div>
              <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 4, lineHeight: 1.6 }}>
                {totals.nihAwards.toLocaleString()} NIH + {totals.nsfAwards.toLocaleString()} NSF
                {yearRange ? ` (${yearRange})` : ""}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginTop: 8 }}>
                {fmtDollar(totals.totalAmount)} total research funding
              </div>
              <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>
                {fmtDollar(totals.nihAmount)} NIH + {fmtDollar(totals.nsfAmount)} NSF
              </div>
            </div>
          </Card>

          {/* Stat cards — NIH vs NSF breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <Card>
              <div style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 4, height: 24, borderRadius: 2, background: C.royalBlue }} />
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted, fontFamily: font.mono }}>NIH</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: font.mono, color: C.navy }}>
                  {totals.nihAwards.toLocaleString()} awards
                </div>
                <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>
                  {fmtDollar(totals.nihAmount)} in funding
                </div>
              </div>
            </Card>
            <Card>
              <div style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 4, height: 24, borderRadius: 2, background: C.saffron }} />
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted, fontFamily: font.mono }}>NSF</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: font.mono, color: C.navy }}>
                  {totals.nsfAwards.toLocaleString()} awards
                </div>
                <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>
                  {fmtDollar(totals.nsfAmount)} in funding
                </div>
              </div>
            </Card>
          </div>

          {/* Chart with agency toggle */}
          {grantsByYear.length > 1 && (
            <Card style={{ marginBottom: 16 }}>
              <div style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, fontFamily: font.display, color: C.navy }}>
                    Investigators Funded & Research Value by Year
                  </h4>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[
                      { key: "combined", label: "Combined" },
                      { key: "nih", label: "NIH" },
                      { key: "nsf", label: "NSF" },
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => setShowAgency(f.key)}
                        style={{
                          padding: "4px 10px", fontSize: 10, fontWeight: 600,
                          fontFamily: font.body,
                          border: `1px solid ${showAgency === f.key ? C.action : C.borderLight}`,
                          borderRadius: 4, cursor: "pointer",
                          background: showAgency === f.key ? C.action : C.surface,
                          color: showAgency === f.key ? "#FFFFFF" : C.textSecondary,
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
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
                          name.includes("Awards") || name.includes("awards") ? value.toLocaleString() : fmtDollar(value),
                          name.includes("Awards") || name.includes("awards") ? `${chartLabel} Awards` : `${chartLabel} Funding`
                        ]}
                      />
                      <Bar yAxisId="left" dataKey={chartAwardsKey} name={`${chartLabel} Awards`} fill={showAgency === "nsf" ? C.saffron : C.royalBlue} opacity={0.8} radius={[3, 3, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey={chartAmountKey} name={`${chartLabel} Funding`} stroke={showAgency === "nsf" ? "#D97706" : C.navy} strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: C.textSecondary }}>
                  <span><span style={{ display: "inline-block", width: 10, height: 10, background: showAgency === "nsf" ? C.saffron : C.royalBlue, opacity: 0.8, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} /> Awards</span>
                  <span><span style={{ display: "inline-block", width: 10, height: 3, background: showAgency === "nsf" ? "#D97706" : C.navy, borderRadius: 1, marginRight: 4, verticalAlign: "middle" }} /> Funding</span>
                </div>
              </div>
            </Card>
          )}

          <MethodologyNote>
            Indian surname analysis on PI last names following Ramakrishnan et al. (AAPI Data) methodology.
            Neither NIH nor NSF collects PI race/ethnicity in public data. Underestimates Indian American
            researchers with non-Indian surnames. NIH data from NIH Reporter API; NSF data from NSF Award Search API.
          </MethodologyNote>
        </>
      )}
    </div>
  );
}
