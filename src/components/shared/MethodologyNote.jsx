import { useState } from "react";
import { C, font } from "../../lib/theme.js";

export function MethodologyNote({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginTop: 16 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "transparent", border: "none", cursor: "pointer",
          fontSize: 11, fontWeight: 600, color: C.action, fontFamily: font.body,
          padding: 0, display: "flex", alignItems: "center", gap: 4,
        }}
      >
        <span style={{
          display: "inline-block", transition: "transform 0.2s",
          transform: open ? "rotate(90deg)" : "rotate(0deg)", fontSize: 10,
        }}>▶</span>
        Methodology & limitations
      </button>
      {open && (
        <div style={{
          marginTop: 8, padding: "12px 16px", background: C.surfaceAlt,
          borderRadius: 6, fontSize: 12, color: C.textSecondary,
          lineHeight: 1.7, fontFamily: font.body, borderLeft: `3px solid ${C.borderLight}`,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}
