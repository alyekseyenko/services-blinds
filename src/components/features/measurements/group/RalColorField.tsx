"use client";

import { COMMON_RAL_QUICK_PICKS } from "@/lib/measurementLabels";
import { specOptionBtn } from "@/components/features/measurements/group/groupSpecFieldUtils";

export function RalColorField({
  inputId,
  value,
  locked,
  onChange,
}: {
  inputId: string;
  value: string;
  locked: boolean;
  onChange: (next: string) => void;
}) {
  if (locked) {
    return (
      <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
        {value || "-"}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Cores frequentes">
        {COMMON_RAL_QUICK_PICKS.map((pick) => (
          <button
            key={pick}
            type="button"
            aria-pressed={value === pick}
            className={specOptionBtn(value === pick)}
            onClick={() => onChange(value === pick ? "" : pick)}
          >
            {pick}
          </button>
        ))}
      </div>
      <input
        id={inputId}
        type="text"
        placeholder="Ex: 7016, Branco..."
        className="w-full min-h-12 bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none focus-visible:ring-2 focus-visible:ring-primary/25 transition-all disabled:bg-muted disabled:text-muted-foreground"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}