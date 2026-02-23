import { useState, useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
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

const CYCLES = ["2008", "2010", "2012", "2014", "2016", "2018", "2020", "2022", "2024"];
const PRESIDENTIAL = new Set(["2008", "2012", "2016", "2020", "2024"]);

export function PoliticalEconomy({ data, isMobile }) {
  const fec = data.fec || [];
  const [selectedCycle, setSelectedCycle] = useState("2024");
  const [sortCol, setSortCol] = useState("totalContributions");
  const [sortDir, setSortDir] = useState("desc");
  const [filterType, setFilterType] = useState("all");

  // Available cycles from data
  const availableCycles = useMemo(() => {
    const set = new Set();
    fec.forEach(r => { if (r.electionCycle) set.add(String(r.electionCycle)); });
    return CYCLES.filter(c => set.has(c));
  }, [fec]);

  // Data for selected cycle
  const cycleData = useMemo(() => {
    return fec.filter(r => String(r.electionCycle) === selectedCycle);
  }, [fec, selectedCycle]);

  // Summary stats for selected cycle
  const stats = useMemo(() => {
    const total = cycleData.reduce((s, r) => s + (r.totalContributions || 0), 0);
    const donors = cycleData.reduce((s, r) => s + (r.estimatedDonors || 0), 0);
    const txns = cycleData.reduce((s, r) => s + (r.transactionCount || 0), 0);
    const topDistrict = cycleData
      .filter(r => (r.geographyType || "").toLowerCase() === "district")
      .sort((a, b) => (b.totalContributions || 0) - (a.totalContributions || 0))[0];
    return { total, donors, txns, topDistrict };
  }, [cycleData]);

  // Trend data — aggregate by cycle
  const trendData = useMemo(() => {
    const byCycle = {};
    fec.forEach(r => {
      const c = String(r.electionCycle);
      if (!c) return;
      if (!byCycle[c]) byCycle[c] = { cycle: c, total: 0, presidential: PRESIDENTIAL.has(c) };
      byCycle[c].total += r.totalContributions || 0;
    });
    return Object.values(byCycle).sort((a, b) => a.cycle.localeCompare(b.cycle));
  }, [fec]);

  // Geographic breakdown for selected cycle — top entries
  const geoBreakdown = useMemo(() => {
    const districts = cycleData
      .filter(r => (r.geographyType || "").toLowerCase() === "district")
      .sort((a, b) => (b.totalContributions || 0) - (a.totalContributions || 0))
      .slice(0, 5);
    const states = cycleData
      .filter(r => (r.geographyType || "").toLowerCase() === "state")
      .sort((a, b) => (b.totalContributions || 0) - (a.totalContributions || 0))
      .slice(0, 5);
    return [...districts.map(d => ({ ...d, _type: "District" })), ...states.map(s => ({ ...s, _type: "State" }))];
  }, [cycleData]);

  // Table data with sorting and filtering
  const tableData = useMemo(() => {
    let rows = [...cycleData];
    if (filterType === "district") rows = rows.filter(r => (r.geographyType || "").toLowerCase() === "district");
    if (filterType === "state") rows = rows.filter(r => (r.geographyType || "").toLowerCase() === "state");

    rows.sort((a, b) => {
      let va = a[sortCol] || 0;
      let vb = b[sortCol] || 0;
      if (sortCol === "geographyId") { va = a.geographyId || ""; vb = b.geographyId || ""; }
      if (sortCol === "geographyType") { va = a.geographyType || ""; vb = b.geographyType || ""; }
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return rows;
  }, [cycleData, filterType, sortCol, sortDir]);

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const sortArrow = col => sortCol === col ? (sortDir === "asc" ? " \u25B2" : " \u25BC") : "";

  // Insight callout — build from data
  const insightText = useMemo(() => {
    const cycleRows = fec.filter(r => String(r.electionCycle) === "2024");
    const totalAll = cycleRows.reduce((s, r) => s + (r.totalContributions || 0), 0);
    const topDistricts = cycleRows
      .filter(r => (r.geographyType || "").toLowerCase() === "district")
      .sort((a, b) => (b.totalContributions || 0) - (a.totalContributions || 0))
      .slice(0, 3);
    if (totalAll === 0 || topDistricts.length === 0) return null;
    const topList = topDistricts.map(d => `${d.geographyId} (${fmtDollar(d.totalContributions)})`).join(", ");
    return `In 2024, South Asian donors contributed an estimated ${fmtDollar(totalAll)} across tracked geographies, led by ${topList}. Presidential cycles average 3\u20134\u00D7 midterm contribution volumes.`;
  }, [fec]);

  // Compute all-time total for headline
  const allTimeTotal = useMemo(() => {
    const byCycle = {};
    fec.forEach(r => {
      const c = String(r.electionCycle);
      if (!c) return;
      byCycle[c] = (byCycle[c] || 0) + (r.totalContributions || 0);
    });
    return Object.values(byCycle).reduce((s, v) => s + v, 0);
  }, [fec]);

  const cycleCount = availableCycles.length;
  const yearRangeStr = availableCycles.length > 0 ? `${availableCycles[0]}–${availableCycles[availableCycles.length - 1]}` : "";

  if (fec.length === 0) {
    return (
      <Card>
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted }}>
            FEC Contribution Data Not Available
          </div>
          <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 8 }}>
            FEC contribution data is not yet available for this area.
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, fontFamily: font.display, color: C.navy }}>
          Political Contributions & Donor Activity
        </h3>
        <p style={{ margin: 0, fontSize: 12, color: C.textSecondary }}>
          Federal Election Commission Individual Contributions, 2008–2024
        </p>
      </div>

      {/* Headline summary callout */}
      <Card style={{ marginBottom: 20, borderLeft: `4px solid ${C.saffron}` }}>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, lineHeight: 1.6 }}>
            Indian American donors contributed an estimated {fmtDollar(allTimeTotal)}+ to federal campaigns across {cycleCount} election cycles ({yearRangeStr}).
          </div>
          <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 6, lineHeight: 1.6 }}>
            Presidential cycles average 3–4× midterm volumes. 2020 and 2024 each exceeded $60M.
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <SourceBadge type="surname" label="Surname estimate (~88-92%)" />
        <span style={{ fontSize: 11, color: C.textMuted }}>FEC data covers contributions &gt;$200 to federal committees only.</span>
      </div>

      {/* Cycle selector */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
        {availableCycles.map(c => (
          <button
            key={c}
            onClick={() => setSelectedCycle(c)}
            style={{
              padding: isMobile ? "6px 10px" : "6px 14px",
              fontSize: isMobile ? 10 : 12,
              fontWeight: 700,
              fontFamily: font.mono,
              border: `1px solid ${selectedCycle === c ? C.navy : C.borderLight}`,
              borderRadius: 6,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
              background: selectedCycle === c ? C.navy : C.surface,
              color: selectedCycle === c ? "#FFFFFF" : C.textSecondary,
            }}
          >
            {c}{PRESIDENTIAL.has(c) ? "*" : ""}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 10, color: C.textMuted, marginTop: -14, marginBottom: 16 }}>* Presidential cycle</div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        <StatCard label={`Total (${selectedCycle})`} value={fmtDollar(stats.total)} />
        <StatCard label="Est. Donors" value={stats.donors > 0 ? stats.donors.toLocaleString() : "—"} />
        <StatCard label="Transactions" value={stats.txns > 0 ? stats.txns.toLocaleString() : "—"} />
        <StatCard
          label="Top District"
          value={stats.topDistrict ? stats.topDistrict.geographyId : "—"}
          sub={stats.topDistrict ? fmtDollar(stats.topDistrict.totalContributions) : undefined}
        />
      </div>

      {/* Chart 1 — Trend Line */}
      {trendData.length > 1 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ padding: "16px 18px" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, fontFamily: font.display, color: C.navy }}>
              Contribution Trends by Election Cycle
            </h4>
            <div style={{ width: "100%", minHeight: isMobile ? 200 : 260 }}>
              <ResponsiveContainer width="100%" height={isMobile ? 200 : 260}>
                <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
                  <XAxis
                    dataKey="cycle"
                    tick={{ fontSize: 10, fontFamily: font.mono, fill: C.textMuted }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={fmtDollar}
                    tick={{ fontSize: 10, fontFamily: font.mono, fill: C.textMuted }}
                    tickLine={false} axisLine={false} width={55}
                  />
                  <Tooltip
                    contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12 }}
                    formatter={(value) => [fmtDollar(value), "Contributions"]}
                    labelFormatter={label => `${label}${PRESIDENTIAL.has(label) ? " (Presidential)" : " (Midterm)"}`}
                  />
                  {trendData.filter(d => d.presidential).map(d => (
                    <ReferenceLine key={d.cycle} x={d.cycle} stroke={C.saffron} strokeDasharray="3 3" strokeOpacity={0.4} />
                  ))}
                  <Line type="monotone" dataKey="total" stroke={C.royalBlue} strokeWidth={2.5} dot={{ fill: C.royalBlue, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: C.textSecondary }}>
              <span><span style={{ display: "inline-block", width: 10, height: 3, background: C.royalBlue, borderRadius: 1, marginRight: 4, verticalAlign: "middle" }} /> Contributions</span>
              <span><span style={{ display: "inline-block", width: 10, height: 0, borderTop: `2px dashed ${C.saffron}`, marginRight: 4, verticalAlign: "middle" }} /> Presidential cycle</span>
            </div>
          </div>
        </Card>
      )}

      {/* Chart 2 — Geographic breakdown */}
      {geoBreakdown.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ padding: "16px 18px" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, fontFamily: font.display, color: C.navy }}>
              Top Geographies — {selectedCycle}
            </h4>
            <div style={{ width: "100%", minHeight: Math.max(geoBreakdown.length * 32 + 30, 120) }}>
              <ResponsiveContainer width="100%" height={Math.max(geoBreakdown.length * 32 + 30, 120)}>
                <BarChart data={geoBreakdown} layout="vertical" margin={{ top: 5, right: 20, left: isMobile ? 50 : 70, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={fmtDollar}
                    tick={{ fontSize: 10, fontFamily: font.mono, fill: C.textMuted }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category" dataKey="geographyId"
                    tick={{ fontSize: 10, fontFamily: font.mono, fill: C.textMuted }}
                    tickLine={false} axisLine={false}
                    width={isMobile ? 50 : 70}
                  />
                  <Tooltip
                    contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12 }}
                    formatter={(value) => [fmtDollar(value), "Contributions"]}
                  />
                  <Bar
                    dataKey="totalContributions"
                    radius={[0, 4, 4, 0]}
                    fill={C.royalBlue}
                    opacity={0.8}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      )}

      {/* Insight callout */}
      {insightText && (
        <Card style={{ background: C.saffronBg, border: `1px solid ${C.saffronLight}`, marginBottom: 16 }}>
          <div style={{ padding: "12px 16px", fontSize: 13, color: C.saffronText, lineHeight: 1.6, fontWeight: 500 }}>
            {insightText}
          </div>
        </Card>
      )}

      {/* Table */}
      {cycleData.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, fontFamily: font.display, color: C.navy }}>
                Full Breakdown — {selectedCycle}
              </h4>
              <div style={{ display: "flex", gap: 4 }}>
                {[{ key: "all", label: "All" }, { key: "district", label: "Districts" }, { key: "state", label: "States" }].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilterType(f.key)}
                    style={{
                      padding: "4px 10px", fontSize: 10, fontWeight: 600,
                      fontFamily: font.body,
                      border: `1px solid ${filterType === f.key ? C.action : C.borderLight}`,
                      borderRadius: 4, cursor: "pointer",
                      background: filterType === f.key ? C.action : C.surface,
                      color: filterType === f.key ? "#FFFFFF" : C.textSecondary,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: font.body }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                    {[
                      { key: "geographyId", label: "Geography" },
                      { key: "geographyType", label: "Type" },
                      { key: "totalContributions", label: "Contributions ($)" },
                      { key: "transactionCount", label: "Transactions" },
                      { key: "estimatedDonors", label: "Est. Donors" },
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        style={{
                          padding: "8px 6px", textAlign: col.key === "geographyId" || col.key === "geographyType" ? "left" : "right",
                          cursor: "pointer", fontWeight: 700, fontSize: 10, textTransform: "uppercase",
                          letterSpacing: 0.5, color: C.textMuted, fontFamily: font.mono,
                          whiteSpace: "nowrap", userSelect: "none",
                        }}
                      >
                        {col.label}{sortArrow(col.key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                      <td style={{ padding: "6px", fontWeight: 600, color: C.navy }}>{row.geographyId}</td>
                      <td style={{ padding: "6px", color: C.textSecondary, textTransform: "capitalize" }}>{row.geographyType}</td>
                      <td style={{ padding: "6px", textAlign: "right", fontFamily: font.mono, fontWeight: 600, color: C.navy }}>{fmtDollar(row.totalContributions || 0)}</td>
                      <td style={{ padding: "6px", textAlign: "right", fontFamily: font.mono, color: C.textSecondary }}>{(row.transactionCount || 0).toLocaleString()}</td>
                      <td style={{ padding: "6px", textAlign: "right", fontFamily: font.mono, color: C.textSecondary }}>{(row.estimatedDonors || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  {tableData.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: "16px", textAlign: "center", color: C.textMuted, fontSize: 12 }}>
                        No data for this filter selection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      <MethodologyNote>
        South Asian surname filtering of FEC individual contributions data. Surname list (~150 high-precision names)
        derived from Census 2010 frequently occurring surnames, validated against community lists following
        Ramakrishnan et al. (AAPI Data) methodology. False positive rate ~8–12%; misses Indian Americans
        with non-South-Asian surnames. All figures are estimates. FEC data covers contributions &gt;$200 only —
        small-dollar donors are not represented.
      </MethodologyNote>
    </div>
  );
}
