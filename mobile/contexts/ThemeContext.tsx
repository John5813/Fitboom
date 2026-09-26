import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { lightTheme, darkTheme, ThemeTokens } from "@/constants/theme";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  theme: ThemeTokens;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
}

const STORAGE_KEY = "fitboom_theme_mode";

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  mode: "light",
  isDark: false,
  setMode: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (cancelled) return;
        if (v === "light" || v === "dark" || v === "system") setModeState(v);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  const isDark = mode === "dark" || (mode === "system" && systemScheme === "dark");
  const theme = isDark ? darkTheme : lightTheme;

  const toggle = useCallback(() => {
    setMode(isDark ? "light" : "dark");
  }, [isDark, setMode]);

  const value = useMemo(
    () => ({ theme, mode, isDark, setMode, toggle }),
    [theme, mode, isDark, setMode, toggle]
  );

  return (
    <ThemeContext.Provider value={hydrated ? value : { ...value, theme: lightTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
