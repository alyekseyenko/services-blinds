"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  applyColorTheme,
  readAppliedColorThemeFromDom,
  type AppColorTheme,
  resolveInitialTheme,
} from "@/lib/theme/colorTheme";
import {
  applyFieldContrast,
  readAppliedFieldContrastFromDom,
  type FieldContrastMode,
  resolveInitialFieldContrast,
} from "@/lib/theme/fieldContrast";

type ThemeContextValue = {
  theme: AppColorTheme;
  setTheme: (theme: AppColorTheme) => void;
  toggleTheme: () => void;
  fieldContrast: FieldContrastMode;
  setFieldContrast: (mode: FieldContrastMode) => void;
  toggleFieldContrast: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: React.ReactNode;
  /** Deve coincidir com o SSR em `layout.tsx` (cookie) para evitar React #418. */
  initialTheme?: AppColorTheme;
};

export function ThemeProvider({ children, initialTheme = "light" }: ThemeProviderProps) {
  // Estado inicial fixo — o tema real aplica-se só após hidratação (evita #418 no html/body).
  const [theme, setThemeState] = useState<AppColorTheme>("light");
  const [fieldContrast, setFieldContrastState] = useState<FieldContrastMode>("default");

  useEffect(() => {
    const fromCookie =
      initialTheme === "dark" || initialTheme === "light" ? initialTheme : null;
    const initial =
      readAppliedColorThemeFromDom() ?? fromCookie ?? resolveInitialTheme();
    setThemeState(initial);
    applyColorTheme(initial);

    const initialContrast =
      readAppliedFieldContrastFromDom() ?? resolveInitialFieldContrast();
    setFieldContrastState(initialContrast);
    applyFieldContrast(initialContrast);
  }, [initialTheme]);

  const setTheme = useCallback((next: AppColorTheme) => {
    setThemeState(next);
    applyColorTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyColorTheme(next);
      return next;
    });
  }, []);

  const setFieldContrast = useCallback((mode: FieldContrastMode) => {
    setFieldContrastState(mode);
    applyFieldContrast(mode);
  }, []);

  const toggleFieldContrast = useCallback(() => {
    setFieldContrastState((prev) => {
      const next = prev === "high" ? "default" : "high";
      applyFieldContrast(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      fieldContrast,
      setFieldContrast,
      toggleFieldContrast,
    }),
    [theme, setTheme, toggleTheme, fieldContrast, setFieldContrast, toggleFieldContrast]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useColorTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useColorTheme must be used within ThemeProvider");
  }
  return ctx;
}
