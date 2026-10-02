import * as React from "react";
import { cn } from "@/lib/cn";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "ghost" | "primary" | "danger";
}

export function IconButton({
  className = "",
  size = "md",
  variant = "default",
  children,
  ...props
}: IconButtonProps) {
  const sizes = {
    sm: "min-h-12 min-w-12 md:min-h-10 md:min-w-10",
    md: "min-h-12 min-w-12",
    lg: "min-h-14 min-w-14",
  };

  const variants = {
    default:
      "bg-card border-2 border-border-strong text-muted-foreground hover:text-primary-ink hover:border-primary",
    ghost: "border-2 border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
    primary: "bg-primary text-primary-foreground hover:bg-primary-hover border-2 border-border-strong",
    danger:
      "bg-card border-2 border-border-strong text-muted-foreground hover:text-danger-solid hover:border-danger-solid",
  };

  return (
    <button
      type="button"
      className={cn(
        "inline-flex touch-manipulation select-none items-center justify-center rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-95 disabled:opacity-50",
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
