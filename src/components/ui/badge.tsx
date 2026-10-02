import * as React from "react";
import { cn } from "@/lib/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "muted";
}

export function Badge({ className = "", variant = "default", children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-muted text-foreground border-border-strong",
    success: "bg-primary/15 text-primary-ink border-border-strong",
    warning: "bg-warning-surface text-warning-fg border-border-strong",
    error: "bg-danger-surface text-danger-fg border-border-strong",
    info: "bg-info-surface text-info-fg border-border-strong",
    muted: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border-2 px-2.5 py-1 text-xs font-black uppercase tracking-wider",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
