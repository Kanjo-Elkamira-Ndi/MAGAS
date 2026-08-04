"use client";

import * as React from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "magas-theme";
const DEFAULT_THEME: Theme = "dark";

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeProviderContext = React.createContext<ThemeProviderState | undefined>(
  undefined,
);

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}

/**
 * ThemeProvider — class-based theme switching. MAGAS is dark-first:
 * the default theme is dark, light is an explicit opt-in toggle. The
 * choice is persisted to localStorage and mirrored to the <html> class
 * by the bootstrap script in app/layout.tsx so there is no FOUC.
 *
 * Hand-rolled on purpose: no dependency on next-themes.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(DEFAULT_THEME);

  React.useEffect(() => {
    let stored: Theme | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "light" || raw === "dark") stored = raw;
    } catch {
      // localStorage unavailable (privacy mode, etc.) — fall back to dark
    }
    const initial = stored ?? DEFAULT_THEME;
    setThemeState(initial);
    applyThemeClass(initial);
  }, []);

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next);
    applyThemeClass(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore persistence failures; theme still applies for this session
    }
  }, []);

  const toggleTheme = React.useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyThemeClass(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const value = React.useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeProviderContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
