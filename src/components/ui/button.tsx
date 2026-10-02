import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "inverse" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  loadingText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      loading,
      loadingText,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-bold tracking-wide rounded-xl border-2 border-transparent transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

    const variants = {
      primary:
        "border-border-strong bg-primary text-primary-foreground hover:bg-primary-hover",
      secondary:
        "border-border-strong bg-ink text-ink-foreground hover:bg-ink/90",
      inverse:
        "border-border-strong bg-surface-card-dark text-ink-foreground hover:bg-ink/90",
      outline:
        "border-border-strong bg-card text-foreground hover:border-primary hover:bg-primary/10",
      ghost: "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted bg-transparent",
      destructive:
        "border-danger-solid bg-danger-solid text-destructive-foreground hover:bg-danger-solid/90",
    };

    const sizes = {
      sm: "min-h-12 min-w-12 px-4 py-2 text-xs uppercase tracking-widest md:min-h-10 md:min-w-0",
      md: "min-h-12 px-6 py-3 text-xs uppercase tracking-wider",
      lg: "min-h-14 px-8 py-4 text-sm uppercase tracking-widest",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            {loadingText ?? children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
