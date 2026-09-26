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

/*
 * Ranglar veb saytdagi bilan bir xil (client/src/index.css, :root va .dark).
 * Mijoz saytga ham, ilovaga ham kirsa bir xil ko'rinishni ko'rishi kerak —
 * shuning uchun bu qiymatlarni alohida o'zgartirmang, avval vebdagisini
 * o'zgartiring va shu yerga ko'chiring.
 */
const PRIMARY = "#16A249"; // hsl(142 76% 36%) — yashil
const PRIMARY_DARK = "#12823B"; // hsl(142 76% 29%)
const ACCENT = "#D8A84F"; // hsl(39 64% 58%) — tilla

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
  background: "#F8FAFC", // --background
  surface: "#F2F5F7", // --muted
  card: "#FFFFFF", // --card
  cardBorder: "#E9EDF2", // --card-border
  text: "#29333D", // --foreground
  textSecondary: "#6C7F93", // --muted-foreground
  border: "#DEE6ED", // --border
  success: "#16A34A",
  error: "#E23636", // --destructive
  warning: "#F59E0B",
  info: "#368CE2",
  overlay: "rgba(15,23,42,0.5)",
  shadow: "rgba(15,23,42,0.08)",
};

export const darkTheme: ThemeTokens = {
  primary: "#24C25E", // .dark --primary
  primaryDark: PRIMARY_DARK,
  primaryLight: "rgba(34,197,94,0.18)",
  accent: "#E2B25A",
  background: "#111922",
  surface: "#2D3843",
  card: "#19242E",
  cardBorder: "#283848",
  text: "#F0F2F4",
  textSecondary: "#9DA6AF",
  border: "#243342",
  success: "#22C55E",
  error: "#DF4949",
  warning: "#FBBF24",
  info: "#6CA6E0",
  overlay: "rgba(0,0,0,0.6)",
  shadow: "rgba(0,0,0,0.4)",
};
