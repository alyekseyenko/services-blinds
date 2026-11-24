"use client";

import {
  REPAIR_PAYMENT_METHODS,
  REPAIR_PAYMENT_OTHER_DETAIL_MAX,
  type RepairPaymentMethodId,
} from "@/lib/visits/repairPayment";
import {
  formatRepairPaymentEuros,
  repairPaymentAmountFromInput,
} from "@/lib/visits/repairPaymentAmount";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { cueClick } from "@/lib/feedbackCue";
import { hapticTap } from "@/lib/haptics";

export function RepairPaymentAmountField({
  value,
  onChange,
  disabled,
  id,
  amountLocked,
  onConfirmAmount,
  onEditAmount,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  amountLocked?: boolean;
  onConfirmAmount: (exVatEuros: number) => void;
  onEditAmount: () => void;
}) {
  const breakdown = value.trim() ? repairPaymentAmountFromInput(value) : null;
  const inputDisabled = disabled || amountLocked;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Valor recebido (sem IVA)
      </label>
      <p className="px-1 text-xs text-muted-foreground">Opcional · confirmar grava no CRM e na nota.</p>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          disabled={inputDisabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex. 100"
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-3 text-xs font-semibold text-foreground placeholder:text-muted-foreground disabled:opacity-50"
        />
        {breakdown && !amountLocked ? (
          <Button
            type="button"
            disabled={disabled}
            className="min-h-12 shrink-0 px-3 text-xs"
            onClick={() => {
              cueClick();
              hapticTap();
              onConfirmAmount(breakdown.exVatEuros);
            }}
          >
            Confirmar
          </Button>
        ) : null}
        {breakdown && amountLocked ? (
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="min-h-12 shrink-0 px-3 text-xs"
            onClick={() => {
              cueClick();
              hapticTap();
              onEditAmount();
            }}
          >
            Editar
          </Button>
        ) : null}
      </div>
      {breakdown ? (
        <p className="px-1 text-xs text-foreground">
          IVA 23%: <span className="font-bold">{formatRepairPaymentEuros(breakdown.vatEuros)}</span>
          {" · "}
          Total: <span className="font-bold text-primary">{formatRepairPaymentEuros(breakdown.totalEuros)}</span>
        </p>
      ) : null}
      {breakdown && amountLocked ? (
        <p className="rounded-xl border border-success-border bg-success-surface px-3 py-2 text-xs font-bold text-success-fg">
          Confirmado (sem IVA): {formatRepairPaymentEuros(breakdown.exVatEuros)}
        </p>
      ) : null}
    </div>
  );
}

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
  /** Em grelha com montante: 2 col. no telemóvel, 1 col. na metade do drawer em ecrãs maiores. */
  splitWithAmount = false,
}: {
  value?: RepairPaymentMethodId | "";
  onChange: (method: RepairPaymentMethodId) => void;
  disabled?: boolean;
  splitWithAmount?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-2",
        splitWithAmount ? "grid-cols-2 sm:grid-cols-1" : "grid-cols-2"
      )}
    >
      {REPAIR_PAYMENT_METHODS.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={cn(
              "min-h-12 rounded-xl border px-3 text-left text-xs font-bold leading-tight disabled:opacity-50",
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
