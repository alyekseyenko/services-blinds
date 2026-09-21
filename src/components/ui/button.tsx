import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
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
      "inline-flex items-center justify-center font-bold tracking-wide rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#84cc16] focus-visible:ring-offset-2";

    const variants = {
      primary:
        "bg-[#84cc16] text-[#090d16] hover:bg-[#9ae62e] shadow-[0_10px_35px_rgba(132,204,22,0.25)] hover:shadow-[0_10px_35px_rgba(132,204,22,0.35)]",
      secondary: "bg-[#121622] text-white hover:bg-slate-800",
      outline:
        "border-2 border-slate-300 text-slate-700 hover:border-[#84cc16] hover:text-[#090d16] bg-white",
      ghost: "text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-transparent",
      destructive: "bg-red-500 text-white hover:bg-red-400",
    };

    const sizes = {
      sm: "min-h-10 px-4 py-2 text-xs uppercase tracking-widest",
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
