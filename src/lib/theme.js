export const C = {
  // Surfaces
  bg: "#FAF8F3",
  surface: "#FFFFFF",
  surfaceAlt: "#F5F2EB",
  // Borders: two-tier system
  border: "#8F8778",          // structural borders: cards, controls (3.5:1 on white, 3.35:1 on base)
  borderLight: "#E8E3D8",     // hairline dividers: table rows, section breaks
  // Typography
  text: "#1E2D3D",
  textSecondary: "#4A5568",   // body copy secondary
  textMuted: "#6B7280",       // raised from #94A3B8 — passes 4.5:1 on white
  // Brand: saffron
  saffron: "#D97706",         // NON-TEXT only: underlines, chart bars, indicators, icons ≥24px
  saffronText: "#92400E",     // TEXT-SAFE: passes 4.5:1 on white (#FFF) and base (#FAF8F3)
  saffronDark: "#B45309",     // white-text-on-saffron buttons/chips (passes 4.5:1)
  saffronLight: "#FEF3C7",
  saffronBg: "#FFFBEB",
  // Structural brand
  navy: "#1E3A5F",            // headers, section titles, structural chrome (NOT interactive)
  navyLight: "#E8EDF4",
  // Interactive
  action: "#1E40AF",          // links, primary buttons, toggles, selected states
  actionLight: "#DBEAFE",
  // Party coding (categorical, not severity)
  dem: "#1E40AF",
  demLight: "#DBEAFE",
  gop: "#B91C1C",             // darkened from #DC2626 for better contrast on light bg
  gopLight: "#FEE2E2",
  gopText: "#991B1B",         // text-safe GOP red
  toss: "#7C3AED",
  tossLight: "#EDE9FE",
  // Severity (separate system from party)
  sevCritical: "#991B1B",     // death, mass casualty
  sevHigh: "#B45309",         // significant damage, coordinated
  sevMedium: "#4B5563",       // isolated
  // Sentiment
  positive: "#047857",
  positiveBg: "#ECFDF5",
  negative: "#B91C1C",
  negativeBg: "#FEF2F2",
  // Royal blue accent (survey/poll cards)
  royalBlue: "#305CDE",
  royalBlueLight: "#EEF2FF",
  // Data visualization warm accent
  dataWarm: "#895129",
  // Legacy aliases (severity — deprecated in favor of sev* tokens)
  red: "#9B2335",
  redLight: "#FEE2E2",
  critical: "#991B1B",
  high: "#D97706",
  medium: "#6B7280",
};

export const font = {
  display: "'Roboto Slab', 'Rockwell', 'Courier New', serif",
  body: "'DM Sans', 'Helvetica Neue', sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', monospace",
};
