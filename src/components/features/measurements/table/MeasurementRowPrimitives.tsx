"use client";

import { Plus } from "lucide-react";
import type { KeyboardEvent, Ref } from "react";
import { parseRowQty } from "@/lib/measurements/tableHelpers";

export const MEASUREMENT_DIM_LABEL =
  "flex items-center justify-between px-1 text-sm font-bold text-foreground";
export const MEASUREMENT_DIM_INPUT =
  "ds-num w-full min-h-14 rounded-xl border-2 border-border-strong bg-input p-3 text-xl font-black text-foreground outline-none transition-all focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 md:text-2xl";
export const MEASUREMENT_DIM_READ =
  "ds-num rounded-xl border-2 border-border-strong bg-input p-3 text-xl font-black text-foreground md:text-2xl";

export function DimField({
  label,
  value,
  locked,
  placeholder,
  onChange,
  inputRef,
  inputId,
  ariaDescribedBy,
  enterKeyHint = "done",
  onEnterPress,
}: {
  label: string;
  value: string;
  locked: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  inputRef?: Ref<HTMLInputElement>;
  inputId?: string;
  ariaDescribedBy?: string;
  enterKeyHint?: "next" | "done";
  onEnterPress?: () => void;
}) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEnterPress?.();
    }
  };

  return (
    <div className="space-y-1">
      <label className={MEASUREMENT_DIM_LABEL} htmlFor={inputId}>
        <span>{label}</span> <span className="text-sm font-bold text-primary-ink">mm</span>
      </label>
      {locked ? (
        <div className={MEASUREMENT_DIM_READ}>{value || "-"}</div>
      ) : (
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint={enterKeyHint}
          className={MEASUREMENT_DIM_INPUT}
          value={value}
          placeholder={placeholder}
          aria-describedby={ariaDescribedBy}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          onKeyDown={handleKeyDown}
        />
      )}
    </div>
  );
}

export function DimensionSanityAlerts({ messages, id }: { messages: string[]; id: string }) {
  if (messages.length === 0) return null;
  return (
    <div id={id} className="space-y-1 px-1" role="status">
      {messages.map((msg) => (
        <p
          key={msg}
          className="rounded-lg border border-warning-border bg-warning-surface px-2 py-1.5 text-xs font-bold leading-snug text-warning-fg"
        >
          {msg}
        </p>
      ))}
    </div>
  );
}

export function MeasurementQtyStepper({
  value,
  locked,
  onChange,
}: {
  value: string | number | undefined;
  locked: boolean;
  onChange: (next: string) => void;
}) {
  const current = parseRowQty(value);
  if (locked) {
    return (
      <div className="rounded-xl border border-border bg-card p-3 text-sm font-black text-foreground">
        {value || "-"}
      </div>
    );
  }
  const stepBtn =
    "flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-border-strong bg-card text-lg font-black text-foreground active:scale-95";
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={stepBtn}
        aria-label="Diminuir quantidade"
        onClick={() => onChange(String(Math.max(1, current - 1)))}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className="ds-num h-12 w-14 rounded-xl border-2 border-border-strong bg-card text-center text-sm font-black text-foreground outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
        value={value}
        aria-label="Quantidade"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      />
      <button
        type="button"
        className={stepBtn}
        aria-label="Aumentar quantidade"
        onClick={() => onChange(String(Math.min(99, current + 1)))}
      >
        +
      </button>
    </div>
  );
}

export function AddMeasurementRowFooter({
  rowCount,
  fieldsLocked,
  onAdd,
  triggerHaptic,
  onBeforeAdd,
}: {
  rowCount: number;
  fieldsLocked: boolean;
  onAdd: () => void;
  triggerHaptic: (ms?: number) => void;
  onBeforeAdd?: () => void;
}) {
  if (fieldsLocked) return null;
  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        data-tour="tech-measurements-add-row"
        onClick={() => {
          triggerHaptic(40);
          onBeforeAdd?.();
          onAdd();
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border-strong bg-primary px-6 py-3.5 text-xs font-black uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary-hover md:w-auto"
      >
        <Plus className="h-4 w-4 stroke-[3] text-foreground" />
        {rowCount > 0 ? "Adicionar outra na mesma divisão" : "Adicionar janela (linha)"}
      </button>
      {rowCount > 0 ? (
        <p className="px-2 text-center text-xs font-semibold text-muted-foreground">
          Mantém divisão, fixação e comandos da linha anterior; preencha novas medidas. Recolha
          janelas concluídas no cabeçalho.
        </p>
      ) : null}
    </div>
  );
}