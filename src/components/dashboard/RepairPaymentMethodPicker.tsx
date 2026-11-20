"use client";

import {
  REPAIR_PAYMENT_METHODS,
  REPAIR_PAYMENT_OTHER_DETAIL_MAX,
  type RepairPaymentMethodId,
} from "@/lib/visits/repairPayment";
import { cn } from "@/lib/cn";

export function RepairPaymentOtherDetailField({
  value,
  onChange,
  disabled,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
      <label htmlFor={id} className="block px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Motivo (obrigatório)
      </label>
      <p className="px-1 text-xs text-muted-foreground">
        Quando não houve cobrança (era manutenção, o cliente enganou-se, etc.).
      </p>
      <textarea
        id={id}
        value={value}
        disabled={disabled}
        maxLength={REPAIR_PAYMENT_OTHER_DETAIL_MAX}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex.: era manutenção, não reparação paga"
        rows={3}
        className="min-h-12 w-full rounded-xl border border-border bg-card px-4 py-3 text-xs font-semibold text-foreground placeholder:text-muted-foreground disabled:opacity-50"
      />
    </div>
  );
}

export function RepairPaymentMethodPicker({
  value,
  onChange,
  disabled,
}: {
  value?: RepairPaymentMethodId | "";
  onChange: (method: RepairPaymentMethodId) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {REPAIR_PAYMENT_METHODS.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={cn(
              "min-h-12 rounded-xl border px-4 text-left text-xs font-bold disabled:opacity-50",
              selected
                ? "border-border-strong bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
