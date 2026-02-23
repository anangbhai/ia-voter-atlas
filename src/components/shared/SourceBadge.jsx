import { font } from "../../lib/theme.js";

const BADGE_STYLES = {
  exact: { color: "#065F46", bg: "#ECFDF5", label: "Exact count" },
  proxy: { color: "#1E40AF", bg: "#DBEAFE", label: "Employer proxy" },
  surname: { color: "#92400E", bg: "#FFFBEB", label: "Surname estimate (~90%)" },
};

export function SourceBadge({ type, label }) {
  const style = BADGE_STYLES[type] || BADGE_STYLES.exact;
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 700,
      padding: "3px 10px", borderRadius: 4,
      fontFamily: font.mono, letterSpacing: 0.5,
      background: style.bg, color: style.color, whiteSpace: "nowrap",
    }}>
      {label || style.label}
    </span>
  );
}
