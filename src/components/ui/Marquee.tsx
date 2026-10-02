"use client";

import { Asterisk } from "lucide-react";
import { cn } from "@/lib/cn";

export interface MarqueeProps {
  /** Segmentos de texto (repetidos na faixa) */
  segments: string[];
  className?: string;
  variant?: "neon" | "dark";
}

export function Marquee({ segments, className = "", variant = "neon" }: MarqueeProps) {
  const content = segments.flatMap((text, i) => [
    <span key={`${text}-${i}`} className="px-3 text-xs font-black uppercase tracking-[0.2em]">
      {text}
    </span>,
    <Asterisk key={`star-${i}`} className="h-3 w-3 shrink-0 opacity-80" aria-hidden />,
  ]);

  const barStyles =
    variant === "neon"
      ? "border-y border-border-strong bg-neon text-neon-foreground"
      : "border-y border-border-strong bg-ink text-ink-foreground";

  return (
    <div className={cn("brutal-marquee w-full", barStyles, className)} aria-hidden>
      <div className="brutal-marquee-track items-center py-2">
        {content}
        {content}
      </div>
    </div>
  );
}
