// Veb sayt bilan bir xil ranglar — constants/theme.ts dagi izohga qarang
const PRIMARY = "#16A249"; // yashil
const PRIMARY_DARK = "#12823B";
const PRIMARY_LIGHT = "rgba(22,163,74,0.10)";
const ACCENT = "#D8A84F"; // tilla

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
  primary: PRIMARY,
  primaryDark: PRIMARY_DARK,
  primaryLight: PRIMARY_LIGHT,
  accent: ACCENT,

  background: "#F8FAFC",
  surface: "#F2F5F7",
  card: "#FFFFFF",
  cardBorder: "#E9EDF2",
  text: "#29333D",
  textSecondary: "#6C7F93",
  border: "#DEE6ED",

  success: "#16A34A",
  error: "#E23636",
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
    tint: PRIMARY,
    tabIconDefault: "#6C7F93",
    tabIconSelected: PRIMARY,
  },
  dark: {
    text: "#F8FAFC",
    background: NAVY_900,
    tint: PRIMARY,
    tabIconDefault: "#64748B",
    tabIconSelected: PRIMARY,
  },
};
