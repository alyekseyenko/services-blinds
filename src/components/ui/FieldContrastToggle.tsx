"use client";

import { SunMedium } from "lucide-react";
import { useColorTheme } from "@/components/ThemeProvider";
import { useClientHydrated } from "@/hooks/useClientHydrated";
import { cn } from "@/lib/cn";

interface FieldContrastToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function FieldContrastToggle({ className, showLabel = false }: FieldContrastToggleProps) {
  const { fieldContrast, toggleFieldContrast } = useColorTheme();
  const hydrated = useClientHydrated();
  const isHigh = fieldContrast === "high";

  return (
    <button
      type="button"
      onClick={toggleFieldContrast}
      className={cn(
        "inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-2.5 text-foreground shadow-sm transition-colors hover:bg-muted",
        isHigh && "border-border-strong bg-primary/10",
        className
      )}
      aria-pressed={isHigh}
      aria-label={isHigh ? "Desactivar modo sol" : "Activar modo sol (alto contraste)"}
      title={isHigh ? "Modo sol activo" : "Modo sol"}
    >
      <SunMedium className={cn("h-4 w-4", isHigh ? "text-primary-ink" : "text-muted-foreground")} />
      {showLabel && (
        <span className="text-xs font-black uppercase tracking-wide" suppressHydrationWarning>
          {!hydrated ? "\u00a0" : isHigh ? "Modo sol activo" : "Modo sol"}
        </span>
      )}
    </button>
  );
}
