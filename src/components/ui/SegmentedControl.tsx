"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  /** Grelha 2 colunas — útil para filtros com etiquetas longas (ex. centro de avisos). */
  layout?: "inline" | "grid";
  "aria-label"?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  layout = "inline",
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  const isGrid = layout === "grid";
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "rounded-xl border-2 border-border-strong bg-muted p-1",
        isGrid
          ? "grid grid-cols-2 gap-1"
          : "flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex min-h-11 w-full min-w-0 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-bold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isGrid ? "normal-case tracking-normal" : "min-h-12 min-w-[3rem] font-black uppercase tracking-wider",
              active
                ? "bg-neon text-neon-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground active:bg-secondary",
              opt.disabled && "pointer-events-none opacity-50"
            )}
          >
            {opt.icon}
            <span className="whitespace-nowrap">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
