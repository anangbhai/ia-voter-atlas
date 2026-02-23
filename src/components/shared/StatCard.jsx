import { C, font } from "../../lib/theme.js";

export function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`,
      boxShadow: "0 1px 3px rgba(30,45,61,0.04), 0 1px 2px rgba(30,45,61,0.02)",
      padding: "14px 18px", textAlign: "center",
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
        color: C.textMuted, fontFamily: font.mono, marginBottom: 6,
      }}>{label}</div>
      <div style={{
        fontSize: 24, fontWeight: 800, fontFamily: font.mono,
        color: accent || C.navy, margin: "4px 0", lineHeight: 1,
      }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.textSecondary, fontFamily: font.body, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
