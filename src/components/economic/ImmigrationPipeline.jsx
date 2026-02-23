import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { C, font } from "../../lib/theme.js";
import { useEconomicData } from "../../hooks/useEconomicData.js";
import { SourceBadge } from "../shared/SourceBadge.jsx";

// Local Card matching monolith pattern
function Card({ children, style = {} }) {
  return <div style={{
    background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`,
    boxShadow: "0 1px 3px rgba(30,45,61,0.04), 0 1px 2px rgba(30,45,61,0.02)",
    ...style
  }}>{children}</div>;
}

// Local median household income by district (Census ACS — approximate)
const LOCAL_MEDIAN_INCOME = {
  'CA-17': 168000, 'CA-06': 105000, 'CA-14': 128000, 'CA-16': 142000, 'CA-32': 82000,
  'NJ-06': 85000, 'NJ-07': 120000, 'NJ-11': 130000, 'NJ-12': 78000, 'NJ-05': 105000,
  'TX-22': 95000, 'TX-24': 88000, 'TX-03': 105000,
  'VA-10': 145000, 'VA-11': 125000,
  'IL-08': 90000, 'GA-07': 85000,
  'NY-03': 115000, 'NY-04': 105000,
  'WA-07': 110000, 'MD-06': 95000,
  'PA-06': 100000, 'NC-02': 80000, 'MI-13': 32000,
};

const fmtK = v => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 || v % 1000 === 0 ? 0 : 1)}K`;
  return String(v);
};

// ═══════════════════════════════════════════════════════════
// USCIS National Trends Panel
// ═══════════════════════════════════════════════════════════
function UscisPanel({ isMobile }) {
  const { uscis, loading } = useEconomicData();

  const chartData = useMemo(() => {
    if (!uscis || uscis.length === 0) return [];
    return uscis
      .map(r => ({
        year: r.year,
        lpr: r.indiaLprAdmissions || 0,
        nat: r.indiaNaturalizations || 0,
        ratio: r.natToLprRatio || 0,
      }))
      .sort((a, b) => a.year - b.year);
  }, [uscis]);

  // Compute summary stats
  const peak = useMemo(() => {
    if (chartData.length === 0) return null;
    return chartData.reduce((max, d) => d.lpr > max.lpr ? d : max, chartData[0]);
  }, [chartData]);

  const latest = chartData.length > 0 ? chartData[chartData.length - 1] : null;

  const avgLpr = useMemo(() => {
    const recent = chartData.filter(d => d.year >= 2015);
    if (recent.length === 0) return 0;
    return Math.round(recent.reduce((s, d) => s + d.lpr, 0) / recent.length);
  }, [chartData]);

  const excessYears = useMemo(() => {
    return chartData.filter(d => d.nat > d.lpr).map(d => d.year);
  }, [chartData]);

  if (loading) {
    return (
      <Card>
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: C.textMuted }}>Loading USCIS data...</div>
        </div>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted }}>USCIS Data Not Available</div>
          <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, marginTop: 8 }}>
            National immigration pipeline data is not yet loaded.
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: font.display, color: C.navy }}>
            National Immigration Pipeline — India
          </h3>
          <SourceBadge type="exact" />
        </div>
        <p style={{ fontSize: 12, color: C.textSecondary, margin: "0 0 4px" }}>
          USCIS Yearbook of Immigration Statistics, 2001–2023
        </p>
        <p style={{ fontSize: 11, color: C.textMuted, margin: "0 0 16px", fontStyle: "italic" }}>
          No filtering applied — USCIS tabulates by country of birth as recorded on I-485 (LPR) and N-400 (naturalization) forms.
        </p>

        {/* Chart */}
        <div style={{ width: "100%", height: isMobile ? 220 : 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 10, fontFamily: font.mono, fill: C.textMuted }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmtK}
                tick={{ fontSize: 10, fontFamily: font.mono, fill: C.textMuted }}
                tickLine={false}
                axisLine={false}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 6, fontSize: 12, fontFamily: font.body,
                }}
                formatter={(value, name) => [value.toLocaleString(), name === "lpr" ? "LPR Admissions" : "Naturalizations"]}
                labelFormatter={(label) => `Year: ${label}`}
              />
              <Line type="monotone" dataKey="lpr" stroke={C.royalBlue} strokeWidth={2} dot={false} name="lpr" />
              <Line type="monotone" dataKey="nat" stroke={C.saffron} strokeWidth={2} dot={false} name="nat" />
              {/* Annotate 2003 dip */}
              {chartData.find(d => d.year === 2003) && (
                <ReferenceDot x={2003} y={chartData.find(d => d.year === 2003).lpr}
                  r={4} fill={C.royalBlue} stroke="#fff" strokeWidth={2} />
              )}
              {/* Annotate 2022 spike */}
              {chartData.find(d => d.year === 2022) && (
                <ReferenceDot x={2022} y={chartData.find(d => d.year === 2022).lpr}
                  r={4} fill={C.royalBlue} stroke="#fff" strokeWidth={2} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: C.textSecondary }}>
          <span><span style={{ display: "inline-block", width: 10, height: 3, background: C.royalBlue, borderRadius: 1, marginRight: 4, verticalAlign: "middle" }} /> LPR Admissions</span>
          <span><span style={{ display: "inline-block", width: 10, height: 3, background: C.saffron, borderRadius: 1, marginRight: 4, verticalAlign: "middle" }} /> Naturalizations</span>
        </div>

        {/* Summary stats */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginTop: 16 }}>
          <div style={{ padding: "10px 12px", background: C.surfaceAlt, borderRadius: 6 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.textMuted, fontFamily: font.mono }}>Peak LPR Year</div>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: font.mono, color: C.navy, marginTop: 2 }}>
              {peak ? `${peak.year} (${peak.lpr.toLocaleString()})` : "—"}
            </div>
          </div>
          <div style={{ padding: "10px 12px", background: C.surfaceAlt, borderRadius: 6 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.textMuted, fontFamily: font.mono }}>Current Nat. Rate</div>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: font.mono, color: C.navy, marginTop: 2 }}>
              {latest ? latest.nat.toLocaleString() : "—"}
            </div>
          </div>
          <div style={{ padding: "10px 12px", background: C.surfaceAlt, borderRadius: 6 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.textMuted, fontFamily: font.mono }}>Avg LPR (2015–23)</div>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: font.mono, color: C.navy, marginTop: 2 }}>
              {avgLpr > 0 ? avgLpr.toLocaleString() : "—"}
            </div>
          </div>
        </div>

        {/* Nat-to-LPR ratio note */}
        {excessYears.length > 0 && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: C.saffronBg, borderRadius: 6, fontSize: 11, color: C.textSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: C.saffronText }}>Years where naturalizations exceeded new admissions:</strong>{" "}
            {excessYears.join(", ")}
            <span style={{ display: "block", marginTop: 4, fontSize: 10, color: C.textMuted }}>
              Reflects 5-year wait period between LPR admission and naturalization eligibility.
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
// PERM Data Panel (existing logic extracted from monolith)
// ═══════════════════════════════════════════════════════════
export function ImmigrationPipeline({
  permDistrictData, permStateData,
  permDistrict, setPermDistrict,
  permEmpDistrict, setPermEmpDistrict,
  permEmpYear, setPermEmpYear,
  permSubTab, setPermSubTab,
  isMobile,
}) {
  const permDistricts = useMemo(() => [...new Set(permDistrictData.map(r => r.districtId))].sort(), [permDistrictData]);
  const permYears = useMemo(() => [...new Set(permDistrictData.map(r => r.dataFiscalYear))].sort(), [permDistrictData]);
  const permYearsDesc = useMemo(() => [...permYears].reverse(), [permYears]);

  // Summary stats
  const totalIndia = permDistrictData.reduce((s, r) => s + (r.permIndia || 0), 0);
  const yearRange = permYears.length > 0 ? `${permYears[0]}–${permYears[permYears.length - 1]}` : "—";
  const latestYear = permYears[permYears.length - 1];
  const latestRows = permDistrictData.filter(r => r.dataFiscalYear === latestYear && r.avgOfferedWage);
  const avgWage = latestRows.length > 0 ? Math.round(latestRows.reduce((s, r) => s + r.avgOfferedWage, 0) / latestRows.length) : null;
  const cumulative = {};
  permDistrictData.forEach(r => { cumulative[r.districtId] = (cumulative[r.districtId] || 0) + (r.permIndia || 0); });
  const topDist = Object.entries(cumulative).sort((a, b) => b[1] - a[1])[0];

  // Trend data for selected district
  const trendRows = permDistrictData.filter(r => r.districtId === permDistrict).sort((a, b) => a.dataFiscalYear.localeCompare(b.dataFiscalYear));
  const trendCumTotal = trendRows.reduce((s, r) => s + (r.permIndia || 0), 0);

  // Wage comparison
  const wageByDist = {};
  permDistrictData.forEach(r => {
    if (r.avgOfferedWage && r.avgOfferedWage > 0) {
      if (!wageByDist[r.districtId] || r.dataFiscalYear > wageByDist[r.districtId].fy) {
        wageByDist[r.districtId] = { wage: r.avgOfferedWage, fy: r.dataFiscalYear };
      }
    }
  });
  const wageEntries = permDistricts
    .filter(d => wageByDist[d] && LOCAL_MEDIAN_INCOME[d])
    .map(d => ({ district: d, perm: wageByDist[d].wage, local: LOCAL_MEDIAN_INCOME[d], ratio: wageByDist[d].wage / LOCAL_MEDIAN_INCOME[d] }))
    .sort((a, b) => b.ratio - a.ratio);
  const wageMax = wageEntries.length > 0 ? Math.max(...wageEntries.map(e => Math.max(e.perm, e.local))) : 1;

  // Employers
  const empState = permEmpDistrict.split("-")[0];
  let empRow = permDistrictData.find(r => r.districtId === permEmpDistrict && r.dataFiscalYear === permEmpYear);
  let empSource = "district";
  if (!empRow) { empRow = permStateData.find(r => r.state === empState && r.dataFiscalYear === permEmpYear); empSource = "state"; }
  const employers = empRow?.topEmployers || [];
  const occupations = empRow?.topOccupations || [];

  // Leaderboard
  const leaderboard = Object.entries(cumulative).sort((a, b) => b[1] - a[1]);
  const lbMax = leaderboard[0] ? leaderboard[0][1] : 1;

  // Sub-tabs
  const permSubs = [
    { key: "trend", label: "Trend" },
    { key: "wages", label: "Wages" },
    { key: "employers", label: "Who's Hiring" },
    { key: "rankings", label: "Rankings" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 24 }}>
      {/* LEFT COLUMN — PERM Data */}
      <div>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: font.display, margin: "0 0 6px", color: C.navy }}>
            DOL PERM Data Explorer
          </h3>
          <p style={{ fontSize: 13, color: C.textSecondary, margin: "0 0 4px", lineHeight: 1.6 }}>
            Permanent labor certification (PERM) applications filed with the U.S. Department of Labor — a proxy for where Indian American economic roots are deepening through employment-based green card sponsorship.
          </p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6 }}>
            <SourceBadge type="exact" label="DOL OFLC data" />
            <span style={{ fontSize: 10, color: C.textMuted }}>{yearRange}</span>
          </div>
        </div>

        {/* Editorial framing */}
        <Card style={{ marginBottom: 16, borderLeft: `4px solid ${C.dataWarm}` }}>
          <div style={{ padding: "12px 16px", fontSize: 12, color: C.textSecondary, lineHeight: 1.7 }}>
            <strong style={{ color: C.navy }}>Reading this data:</strong> A PERM certification is Step 1 of the employment-based green card process — it means the Department of Labor certified that no qualified U.S. worker was available for the position. It does <em>not</em> mean a green card was issued. Many certified PERMs never result in a green card due to visa backlogs, employer withdrawal, or applicant departure. These numbers measure <strong style={{ color: C.text }}>employer demand for skilled immigrant labor</strong> and serve as a proxy for where Indian American economic roots are deepening — not immigration volume.
          </div>
        </Card>

        {/* Summary strip */}
        {permDistricts.length === 0 ? (
          <Card>
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted }}>No PERM Data Loaded</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: font.display, color: C.navy, margin: "8px 0" }}>Getting Started</div>
              <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>
                Run <code style={{ background: C.surfaceAlt, padding: "2px 6px", borderRadius: 3, fontSize: 11 }}>process_perm.py</code> on DOL PERM Excel files, then load the SQL into Supabase.
              </div>
            </div>
          </Card>
        ) : (
        <>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          <Card>
            <div style={{ padding: "10px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted }}>Total India PERM</div>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: font.mono, color: C.navy, margin: "2px 0" }}>{totalIndia.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: C.textSecondary }}>{permDistricts.length} districts</div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: "10px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted }}>Avg Offered Wage</div>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: font.mono, color: C.navy, margin: "2px 0" }}>{avgWage ? `$${avgWage.toLocaleString()}` : "—"}</div>
              <div style={{ fontSize: 10, color: C.textSecondary }}>{latestYear || "Latest"}</div>
            </div>
          </Card>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 16, overflowX: "auto" }}>
          {permSubs.map(s => (
            <button key={s.key} onClick={() => setPermSubTab(s.key)} style={{
              padding: "8px 14px", fontSize: 12, fontWeight: permSubTab === s.key ? 700 : 500,
              fontFamily: font.body, border: "none", background: "transparent", cursor: "pointer",
              color: permSubTab === s.key ? C.navy : C.textMuted,
              borderBottom: permSubTab === s.key ? `2px solid ${C.saffron}` : "2px solid transparent",
              whiteSpace: "nowrap",
            }}>{s.label}</button>
          ))}
        </div>

        {/* TREND SUB-TAB */}
        {permSubTab === "trend" && (
          <Card>
            <div style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, fontFamily: font.display, color: C.navy }}>Certifications Over Time</h4>
                <select value={permDistrict} onChange={e => setPermDistrict(e.target.value)} style={{
                  padding: "4px 8px", fontSize: 11, fontFamily: font.mono, fontWeight: 600,
                  border: `1px solid ${C.border}`, borderRadius: 6, background: C.surface, color: C.text,
                }}>
                  {permDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <p style={{ fontSize: 11, color: C.textSecondary, margin: "0 0 14px" }}>
                {permDistrict} — {trendCumTotal.toLocaleString()} cumulative
              </p>

              {/* Bar chart */}
              {(() => {
                const chartH = 160;
                const barArea = chartH - 10;
                const rawMax = Math.max(...trendRows.map(r => r.permCertified || 0), 1);
                const niceMax = rawMax <= 100 ? Math.ceil(rawMax / 20) * 20
                  : rawMax <= 500 ? Math.ceil(rawMax / 100) * 100
                  : rawMax <= 2000 ? Math.ceil(rawMax / 500) * 500
                  : rawMax <= 10000 ? Math.ceil(rawMax / 2000) * 2000
                  : Math.ceil(rawMax / 5000) * 5000;
                const tickCount = 4;
                const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round(niceMax * (tickCount - i) / tickCount));

                return (
                  <div style={{ display: "flex", gap: 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: chartH, paddingRight: 6, flexShrink: 0 }}>
                      {ticks.map(v => (
                        <div key={v} style={{ fontSize: 8, fontFamily: font.mono, color: C.textMuted, textAlign: "right", lineHeight: 1, minWidth: 24 }}>{fmtK(v)}</div>
                      ))}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
                      {ticks.map((v, i) => (
                        <div key={i} style={{ position: "absolute", top: `${(i / tickCount) * 100}%`, left: 0, right: 0, height: 1, background: i === tickCount ? C.border : C.borderLight, opacity: i === tickCount ? 0.5 : 0.6 }} />
                      ))}
                      <div style={{ display: "flex", alignItems: "flex-end", gap: isMobile ? 1 : 3, height: chartH, position: "relative" }}>
                        {trendRows.map(r => {
                          const total = r.permCertified || 0;
                          const india = r.permIndia || 0;
                          const totalH = niceMax > 0 ? Math.max(total / niceMax * barArea, total > 0 ? 3 : 0) : 0;
                          const indiaH = niceMax > 0 && total > 0 ? Math.max(india / niceMax * barArea, india > 0 ? 3 : 0) : 0;
                          return (
                            <div key={r.dataFiscalYear} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}
                              title={`${r.dataFiscalYear}: ${india.toLocaleString()} India / ${total.toLocaleString()} total`}>
                              <div style={{ width: "100%", maxWidth: 28, position: "relative", height: totalH }}>
                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: totalH, background: C.navyLight, borderRadius: "3px 3px 0 0" }} />
                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: indiaH, background: C.saffron, borderRadius: "3px 3px 0 0", opacity: 0.85 }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div style={{ display: "flex", gap: isMobile ? 1 : 3, marginTop: 4, paddingLeft: 30 }}>
                {trendRows.map(r => (
                  <div key={r.dataFiscalYear} style={{ flex: 1, minWidth: 0, textAlign: "center", fontSize: 7, fontFamily: font.mono, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.dataFiscalYear.replace("FY", "'")}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 10, color: C.textSecondary }}>
                <span><span style={{ display: "inline-block", width: 8, height: 8, background: C.saffron, borderRadius: 2, marginRight: 3, verticalAlign: "middle" }} /> India-born</span>
                <span><span style={{ display: "inline-block", width: 8, height: 8, background: C.navyLight, borderRadius: 2, marginRight: 3, verticalAlign: "middle" }} /> All</span>
              </div>
            </div>
          </Card>
        )}

        {/* WAGES SUB-TAB */}
        {permSubTab === "wages" && (
          <Card>
            <div style={{ padding: "16px 18px" }}>
              <h4 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, fontFamily: font.display, color: C.navy }}>PERM Wage vs. Local Median</h4>
              <p style={{ fontSize: 11, color: C.textSecondary, margin: "0 0 12px" }}>
                Sorted by wage ratio — highest multiplier first.
              </p>
              <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 10, color: C.textSecondary }}>
                <span><span style={{ display: "inline-block", width: 8, height: 8, background: C.saffron, borderRadius: 2, marginRight: 3, verticalAlign: "middle" }} /> PERM wage</span>
                <span><span style={{ display: "inline-block", width: 8, height: 8, background: C.navy, opacity: 0.3, borderRadius: 2, marginRight: 3, verticalAlign: "middle" }} /> Local median</span>
              </div>

              {wageEntries.length === 0 ? (
                <p style={{ color: C.textMuted, textAlign: "center", padding: "30px 0", fontSize: 12 }}>No wage data available.</p>
              ) : wageEntries.map(e => (
                <div key={e.district} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 44, fontFamily: font.mono, fontWeight: 700, fontSize: 11, color: C.text, flexShrink: 0 }}>{e.district}</div>
                  <div style={{ flex: 1, position: "relative", height: 14 }}>
                    <div style={{ position: "absolute", height: 6, top: 4, left: 0, width: `${(e.local / wageMax * 100).toFixed(1)}%`, background: C.navy, opacity: 0.2, borderRadius: 3 }} />
                    <div style={{ position: "absolute", height: 6, top: 4, left: 0, width: `${(e.perm / wageMax * 100).toFixed(1)}%`, background: C.saffron, opacity: 0.85, borderRadius: 3 }} />
                  </div>
                  <div style={{ width: 80, textAlign: "right", fontSize: 11, fontFamily: font.mono, flexShrink: 0 }}>
                    ${Math.round(e.perm / 1000)}K{" "}
                    <span style={{ color: e.ratio >= 1.5 ? "#166534" : C.text, fontWeight: 600, fontSize: 9 }}>{e.ratio.toFixed(1)}×</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* EMPLOYERS SUB-TAB */}
        {permSubTab === "employers" && (
          <Card>
            <div style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, fontFamily: font.display, color: C.navy }}>Top Employers & Occupations</h4>
                <select value={permEmpDistrict} onChange={e => setPermEmpDistrict(e.target.value)} style={{
                  padding: "4px 8px", fontSize: 11, fontFamily: font.mono, fontWeight: 600,
                  border: `1px solid ${C.border}`, borderRadius: 6, background: C.surface, color: C.text,
                }}>
                  {permDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={permEmpYear} onChange={e => setPermEmpYear(e.target.value)} style={{
                  padding: "4px 8px", fontSize: 11, fontFamily: font.mono, fontWeight: 600,
                  border: `1px solid ${C.border}`, borderRadius: 6, background: C.surface, color: C.text,
                }}>
                  {permYearsDesc.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {empRow ? (
                <p style={{ fontSize: 11, color: C.textSecondary, margin: "0 0 12px" }}>
                  {permEmpYear} •{" "}
                  {empSource === "state" ? (
                    <>
                      <span style={{ display: "inline-block", padding: "2px 6px", background: C.saffronBg, color: C.saffronText, borderRadius: 4, fontSize: 9, fontWeight: 700, letterSpacing: 0.3, verticalAlign: "middle" }}>STATE ({empState})</span>
                      {" "}Showing state aggregate.
                    </>
                  ) : "District-level data"}
                </p>
              ) : (
                <p style={{ fontSize: 11, color: C.textMuted, margin: "0 0 12px" }}>
                  No data for {permEmpDistrict} in {permEmpYear}.
                </p>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted, marginBottom: 6 }}>Top Employers</div>
                  {employers.length > 0 ? employers.map((e, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, padding: "6px 0", borderBottom: `1px solid ${C.borderLight}`, fontSize: 12 }}>
                      <span style={{ fontFamily: font.mono, fontWeight: 800, fontSize: 10, color: C.textMuted, width: 16 }}>{i + 1}</span>
                      <span>{e}</span>
                    </div>
                  )) : (
                    <p style={{ color: C.textMuted, padding: "16px 0", textAlign: "center", fontSize: 11 }}>No employer data</p>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.textMuted, marginBottom: 6 }}>Top Occupations</div>
                  {occupations.length > 0 ? occupations.map((o, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, padding: "6px 0", borderBottom: `1px solid ${C.borderLight}`, fontSize: 12 }}>
                      <span style={{ fontFamily: font.mono, fontWeight: 800, fontSize: 10, color: C.textMuted, width: 16 }}>{i + 1}</span>
                      <span>{o}</span>
                    </div>
                  )) : (
                    <p style={{ color: C.textMuted, padding: "16px 0", textAlign: "center", fontSize: 11 }}>No occupation data</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* RANKINGS SUB-TAB */}
        {permSubTab === "rankings" && (
          <Card>
            <div style={{ padding: "16px 18px" }}>
              <h4 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, fontFamily: font.display, color: C.navy }}>Cumulative PERM Volume</h4>
              <p style={{ fontSize: 11, color: C.textSecondary, margin: "0 0 12px" }}>
                Total India-born certified PERM, {yearRange}
              </p>

              {leaderboard.map(([dist, total], i) => (
                <div key={dist} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <div style={{ width: 18, fontFamily: font.mono, fontWeight: 800, fontSize: 10, color: i < 3 ? C.saffronText : C.textMuted, textAlign: "right" }}>{i + 1}</div>
                  <div style={{ width: 44, fontFamily: font.mono, fontWeight: 700, fontSize: 11, color: C.text }}>{dist}</div>
                  <div style={{ flex: 1, position: "relative", height: 12 }}>
                    <div style={{ position: "absolute", height: 8, top: 2, left: 0, width: `${(total / lbMax * 100).toFixed(1)}%`, background: `linear-gradient(90deg, ${C.saffron}, ${C.navy})`, opacity: 0.7, borderRadius: 3 }} />
                  </div>
                  <div style={{ width: 60, textAlign: "right", fontSize: 11, fontFamily: font.mono, fontWeight: 600 }}>{total.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </Card>
        )}
        </>
        )}
      </div>

      {/* RIGHT COLUMN — USCIS National Trends */}
      <div>
        <UscisPanel isMobile={isMobile} />
      </div>
    </div>
  );
}
