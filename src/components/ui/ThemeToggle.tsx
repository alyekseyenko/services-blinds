"use client";

import { Moon, Sun } from "lucide-react";
import { useColorTheme } from "@/components/ThemeProvider";
import { useClientHydrated } from "@/hooks/useClientHydrated";
import { cn } from "@/lib/cn";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useColorTheme();
  const hydrated = useClientHydrated();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-2.5 text-foreground shadow-sm transition-colors hover:bg-muted",
        className
      )}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={isDark ? "Modo claro" : "Modo escuro"}
    >
      {isDark ? <Sun className="h-4 w-4 text-primary" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
      {showLabel && (
        <span className="text-xs font-black uppercase tracking-wide" suppressHydrationWarning>
          {!hydrated ? "\u00a0" : isDark ? "Claro" : "Escuro"}
        </span>
      )}
    </button>
  );
}
