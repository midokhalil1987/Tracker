"use client";

import * as React from "react";
import {
  applyTheme,
  getStoredTheme,
  setStoredTheme,
  type ThemeMode,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    return getStoredTheme();
  });

  // Re-apply after hydration — React resets <html className> and can strip "dark".
  React.useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  React.useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = React.useCallback((mode: ThemeMode) => {
    setStoredTheme(mode);
    setThemeState(mode);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
