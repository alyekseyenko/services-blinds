import * as React from "react";
import { cn } from "@/lib/cn";

export type PanelVariant = "default" | "ink" | "outline";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: PanelVariant;
}

/** Painel brutalista reutilizável (cartão, ink ou contorno). */
export function Panel({ className, variant = "default", children, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2",
        variant === "ink" && "ds-panel-ink",
        variant === "outline" && "rounded-2xl border-2 border-border-strong bg-transparent text-foreground",
        variant === "default" && "ds-panel",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
