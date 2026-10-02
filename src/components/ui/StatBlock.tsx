import * as React from "react";
import { cn } from "@/lib/cn";

export interface StatBlockProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  className?: string;
}

/** KPI brutalista — número display, legenda Inter. */
export function StatBlock({ label, value, hint, className }: StatBlockProps) {
  return (
    <div className={cn("rounded-2xl border-2 border-border-strong bg-card p-4 sm:p-5", className)}>
      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="ds-title mt-1 text-display-md tracking-tight text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-xs font-semibold text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
