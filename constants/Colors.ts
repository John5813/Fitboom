const GREEN = "#16A34A";
const GREEN_DARK = "#15803D";
const GREEN_LIGHT = "rgba(22,163,74,0.10)";
const AMBER = "#FBBF24";

const NAVY_900 = "#0B1229";
const NAVY_800 = "#0F1A33";
const NAVY_700 = "#15213D";

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const Text = {
  h1: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  h2: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  h3: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  body: { fontSize: 14, fontFamily: "Inter_400Regular" },
  bodyBold: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  caption: { fontSize: 12, fontFamily: "Inter_500Medium" },
  small: { fontSize: 11, fontFamily: "Inter_500Medium" },
};

export default {
  primary: GREEN,
  primaryDark: GREEN_DARK,
  primaryLight: GREEN_LIGHT,
  accent: AMBER,

  background: "#FFFFFF",
  surface: "#F8F9FA",
  card: "#FFFFFF",
  cardBorder: "#E5E7EB",
  text: "#0F172A",
  textSecondary: "#64748B",
  border: "#E2E8F0",

  success: "#16A34A",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#0EA5E9",

  green: "#16a34a",
  purple: "#7C3AED",
  coursePurple: "#7C3AED",

  navy: NAVY_900,
  navy2: NAVY_800,
  navy3: NAVY_700,

  light: {
    text: "#0F172A",
    background: "#FFFFFF",
    tint: GREEN,
    tabIconDefault: "#94A3B8",
    tabIconSelected: GREEN,
  },
  dark: {
    text: "#F8FAFC",
    background: NAVY_900,
    tint: GREEN,
    tabIconDefault: "#64748B",
    tabIconSelected: GREEN,
  },
};
