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
    sm: "min-h-10 min-w-10",
    md: "min-h-12 min-w-12",
    lg: "min-h-14 min-w-14",
  };

  const variants = {
    default: "bg-white border border-slate-200 text-slate-600 hover:text-[#84cc16] hover:border-[#84cc16]/30",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800",
    primary: "bg-[#84cc16] text-[#090d16] hover:bg-[#9ae62e] border border-[#84cc16]",
    danger: "bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-300",
  };

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#84cc16] focus-visible:ring-offset-2 active:scale-95 disabled:opacity-50",
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
