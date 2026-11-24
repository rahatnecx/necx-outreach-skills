// NECX brand colours: primary #31A3B6, secondary #172631. Everything else is
// derived from them, plus one accent per module for the infographics.
export const C = {
  primary: "#31A3B6",
  primaryLight: "#e6f6f9", // tint for light mock-UI surfaces
  primaryDark: "#237886",
  primaryBright: "#7fd8e6", // gradient highlight on dark
  secondary: "#172631",
  secondaryMid: "#22394a",
  secondaryDeep: "#0c141a",
  ink: "#070d12",

  // module accents (tuned to sit next to the brand teal)
  teal: "#31A3B6",
  tealSoft: "#7fd8e6",
  mint: "#2cc59a",
  sky: "#4f9dff",
  violet: "#8b7cf6",
  lavender: "#a78bfa",
  coral: "#ff6b6b",
  orange: "#ff9f5a",
  amber: "#f6c445",
  green: "#46d483",
  pink: "#f472b6",
  success: "#46d483",

  white: "#ffffff",
  text: "#e9f2f6",
  dim: "rgba(233,242,246,0.68)",
  faint: "rgba(233,242,246,0.40)",
  glass: "rgba(255,255,255,0.06)",
  glassStrong: "rgba(255,255,255,0.10)",
  line: "rgba(255,255,255,0.12)",

  // light mock-UI cards
  card: "#ffffff",
  page: "#f3f8fa",
  uiText: "#172631",
  uiDim: "#5f7180",
  uiBorder: "#dde7ec",
};

export const GRAD = `linear-gradient(135deg, ${C.primaryBright} 0%, ${C.primary} 55%, ${C.primaryDark} 100%)`;
export const GRAD_TEXT = {
  background: `linear-gradient(90deg, ${C.primaryBright} 0%, ${C.primary} 70%)`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

export const FONT = "Poppins, system-ui, -apple-system, Segoe UI, sans-serif";
export const FPS = 30;

export const MODULE = {
  cases: { color: C.primary, label: "Case Management" },
  survivor: { color: C.tealSoft, label: "NECX Survivor App" },
  referrals: { color: C.violet, label: "Case Referrals" },
  hotline: { color: C.coral, label: "24/7 Hotline" },
  shelters: { color: C.mint, label: "Shelter Management" },
  drive: { color: C.sky, label: "NECX Drive" },
  calendar: { color: C.orange, label: "Calendar & Appointments" },
  notes: { color: C.amber, label: "Notes Center" },
  reports: { color: C.green, label: "Reports Library" },
  builder: { color: C.lavender, label: "AI Report Builder" },
  access: { color: C.pink, label: "Role-Based Access" },
  workspace: { color: C.primaryBright, label: "NECX Workspace" },
};
