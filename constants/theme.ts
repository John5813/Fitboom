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

export const Type = {
  h1: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  h2: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  h3: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  body: { fontSize: 14, fontFamily: "Inter_400Regular" },
  bodyBold: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  caption: { fontSize: 12, fontFamily: "Inter_500Medium" },
  small: { fontSize: 11, fontFamily: "Inter_500Medium" },
};

const PRIMARY = "#16A34A";
const PRIMARY_DARK = "#15803D";
const ACCENT = "#FBBF24";

export type ThemeTokens = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  background: string;
  surface: string;
  card: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  overlay: string;
  shadow: string;
};

export const lightTheme: ThemeTokens = {
  primary: PRIMARY,
  primaryDark: PRIMARY_DARK,
  primaryLight: "rgba(22,163,74,0.10)",
  accent: ACCENT,
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
  overlay: "rgba(15,23,42,0.5)",
  shadow: "rgba(15,23,42,0.08)",
};

export const darkTheme: ThemeTokens = {
  primary: PRIMARY,
  primaryDark: PRIMARY_DARK,
  primaryLight: "rgba(22,163,74,0.18)",
  accent: ACCENT,
  background: "#0B1229",
  surface: "#0F1A33",
  card: "#15213D",
  cardBorder: "#1E2B47",
  text: "#F1F5F9",
  textSecondary: "#94A3B8",
  border: "#1E2B47",
  success: "#22C55E",
  error: "#F87171",
  warning: "#FBBF24",
  info: "#38BDF8",
  overlay: "rgba(0,0,0,0.6)",
  shadow: "rgba(0,0,0,0.4)",
};
