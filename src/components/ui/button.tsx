import * as React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-bold tracking-wide rounded-2xl transition-all active:scale-98 disabled:opacity-50 disabled:pointer-events-none";
    
    const variants = {
      primary: "bg-emerald-500 text-white hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10",
      secondary: "bg-slate-800 text-white hover:bg-slate-700",
      outline: "border-2 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white bg-transparent",
      ghost: "text-slate-400 hover:text-white hover:bg-slate-900 bg-transparent",
      destructive: "bg-red-500 text-white hover:bg-red-400",
    };

    const sizes = {
      sm: "px-4 py-2.5 text-[11px] uppercase tracking-widest",
      md: "px-6 py-4 text-xs uppercase tracking-wider",
      lg: "px-8 py-5 text-sm uppercase tracking-widest",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
