import * as React from "react";
import { cn } from "@/lib/cn";
import { DS_CHIP_CLASS, type DesignTone } from "@/lib/design/tones";

export interface StatusChipProps {
  label: string;
  icon?: React.ReactNode;
  tone?: DesignTone;
  className?: string;
}

/** Etiqueta de estado com texto (e ícone opcional) — nunca só cor. */
export function StatusChip({ label, icon, tone = "neutral", className }: StatusChipProps) {
  return (
    <span className={cn(DS_CHIP_CLASS[tone], className)}>
      {icon ? <span className="shrink-0" aria-hidden>{icon}</span> : null}
      <span className="truncate">{label}</span>
    </span>
  );
}
