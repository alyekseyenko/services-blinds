"use client";

import { formatRemeasureAnswer } from "@/lib/measurements/labels";

type Props = {
  needed: string;
  note: string;
  locked: boolean;
  onSetRemeasure: (value: string) => void;
};

export function MeasurementsRemeasureCard({ needed, note, locked, onSetRemeasure }: Props) {
  return (
    <div className="rounded-2xl border-2 border-border bg-card p-4 space-y-3">
      <p className="text-sm font-black text-foreground">Medidas Retificadas</p>
      {locked ? (
        <p className="text-sm font-bold text-foreground">{formatRemeasureAnswer(needed, note) || "—"}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "SIM", label: "Sim" },
                { value: "NAO", label: "Não" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={needed === opt.value}
                onClick={() => onSetRemeasure(needed === opt.value ? "" : opt.value)}
                className={`min-h-12 rounded-xl border-2 px-3 text-xs font-black uppercase ${
                  needed === opt.value
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {needed === "OUTROS" ? (
            <p className="px-1 text-xs font-bold text-muted-foreground">
              Resposta anterior: {formatRemeasureAnswer(needed, note)}. Escolha Sim ou Não.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}