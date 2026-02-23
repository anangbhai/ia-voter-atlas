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
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v}`;
};

export function HouseholdWealth({ data, districtId, isMobile }) {
  const hmda = data.hmda || [];

  const chartData = useMemo(() => {
    const byYear = {};
    hmda.forEach(r => {
      const y = r.year || r.dataYear;
      if (!y) return;
      if (!byYear[y]) byYear[y] = { year: y, originations: 0, totalAmount: 0, count: 0 };
      byYear[y].originations += r.originationCount || r.originations || 0;
      byYear[y].totalAmount += r.totalLoanAmount || r.avgLoanAmount || 0;
      byYear[y].count += 1;
    });
    return Object.values(byYear)
      .map(d => ({ ...d, avgLoanAmount: d.count > 0 ? Math.round(d.totalAmount / d.count) : 0 }))
      .sort((a, b) => a.year - b.year);
  }, [hmda]);

  const totalOriginations = chartData.reduce((s, d) => s + d.originations, 0);
  const latestYear = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const prevYear = chartData.length > 1 ? chartData[chartData.length - 2] : null;
  const yoyChange = latestYear && prevYear && prevYear.originations > 0
    ? ((latestYear.originations - prevYear.originations) / prevYear.originations * 100).toFixed(1)
    : null;

  // All-district average for comparison
  const allDistrictAvg = useMemo(() => {
    if (hmda.length === 0) return 0;
    const districtTotals = {};
    hmda.forEach(r => {
      const did = r.districtId;
      if (!did) return;
      districtTotals[did] = (districtTotals[did] || 0) + (r.originationCount || r.originations || 0);
    });
    const vals = Object.values(districtTotals);
    return vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
  }, [hmda]);

  const comparisonRatio = allDistrictAvg > 0 && totalOriginations > 0
    ? (totalOriginations / allDistrictAvg).toFixed(1)
    : null;

  if (hmda.length === 0) {
    return (
      <Card>
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted }}>
            HMDA Data Not Available
          </div>
          <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, marginTop: 8, maxWidth: 400, margin: "8px auto 0" }}>
            {districtId
              ? `HMDA data not available for ${districtId}. Coverage currently includes 8 of 24 tracked districts.`
              : "HMDA mortgage data is not yet loaded."}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: font.display, color: C.navy }}>
            Mortgage & Homeownership Activity
          </h3>
          <SourceBadge type="exact" />
        </div>
        <p style={{ fontSize: 13, color: C.textSecondary, margin: "0 0 4px" }}>
          CFPB Home Mortgage Disclosure Act (HMDA), 2018–2024
        </p>
        <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>
          Exact count — HMDA race code 21 (Asian Indian), borrower self-reported
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        <StatCard label="Total Originations" value={totalOriginations.toLocaleString()} sub="All years" />
        <StatCard
          label="Avg Loan Amount"
          value={latestYear ? fmtDollar(latestYear.avgLoanAmount) : "—"}
          sub={latestYear ? `${latestYear.year}` : ""}
        />
        <StatCard
          label={latestYear ? `${latestYear.year} Originations` : "Latest Year"}
          value={latestYear ? latestYear.originations.toLocaleString() : "—"}
        />
        <StatCard
          label="YoY Change"
          value={yoyChange !== null ? `${yoyChange > 0 ? "+" : ""}${yoyChange}%` : "—"}
          accent={yoyChange !== null ? (parseFloat(yoyChange) >= 0 ? C.positive : C.negative) : undefined}
        />
      </div>

      {/* Chart */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding: "16px 18px" }}>
          <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, fontFamily: font.display, color: C.navy }}>
            Originations & Avg Loan Amount by Year
          </h4>
          <div style={{ width: "100%", height: isMobile ? 200 : 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
                <XAxis dataKey="year" tick={{ fontSize: 10, fontFamily: font.mono, fill: C.textMuted }} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10, fontFamily: font.mono, fill: C.textMuted }}
                  tickLine={false} axisLine={false} width={40}
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
                    name === "originations" ? value.toLocaleString() : fmtDollar(value),
                    name === "originations" ? "Originations" : "Avg Loan Amount"
                  ]}
                />
                <Bar yAxisId="left" dataKey="originations" fill={C.saffron} opacity={0.8} radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="avgLoanAmount" stroke={C.royalBlue} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: C.textSecondary }}>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.saffron, borderRadius: 2, marginRight: 4, verticalAlign: "middle", opacity: 0.8 }} /> Originations</span>
            <span><span style={{ display: "inline-block", width: 10, height: 3, background: C.royalBlue, borderRadius: 1, marginRight: 4, verticalAlign: "middle" }} /> Avg Loan Amount</span>
          </div>
        </div>
      </Card>

      {/* District comparison */}
      {districtId && comparisonRatio && (
        <Card style={{ marginBottom: 16, borderLeft: `4px solid ${C.royalBlue}` }}>
          <div style={{ padding: "12px 16px", fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: C.navy }}>{districtId}</strong> Indian American mortgage originations are{" "}
            <strong style={{ color: C.royalBlue }}>{comparisonRatio}×</strong> the tracked-district average.
          </div>
        </Card>
      )}

      <MethodologyNote>
        HMDA data covers institutional lenders filing with CFPB. Cash purchases and private loans are excluded.
        Race coding is borrower-reported; mixed-race applicants may be coded inconsistently across applications.
        Coverage: 8 of 24 tracked districts have sufficient HMDA volume for reliable estimates.
      </MethodologyNote>
    </div>
  );
}
