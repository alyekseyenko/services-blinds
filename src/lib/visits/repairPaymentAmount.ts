/** IVA standard em reparações cobradas no local (Portugal). */
export const REPAIR_PAYMENT_VAT_RATE = 0.23;

export type RepairPaymentVatBreakdown = {
  exVatEuros: number;
  vatEuros: number;
  totalEuros: number;
  amountMicros: number;
};

/** Aceita vírgula ou ponto decimal; valor inválido ou ≤ 0 devolve null. */
export function parseRepairPaymentAmountExVat(input: string): number | null {
  const trimmed = input.trim().replace(/\s/g, "");
  if (!trimmed) return null;

  let normalized = trimmed;
  if (/,/.test(trimmed) && /\./.test(trimmed)) {
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (/,/.test(trimmed)) {
    normalized = trimmed.replace(",", ".");
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

export function computeRepairPaymentWithVat(exVatEuros: number): RepairPaymentVatBreakdown | null {
  if (!Number.isFinite(exVatEuros) || exVatEuros <= 0) return null;

  const exCents = Math.round(exVatEuros * 100);
  const totalCents = Math.round(exCents * (1 + REPAIR_PAYMENT_VAT_RATE));
  const vatCents = totalCents - exCents;

  return {
    exVatEuros: exCents / 100,
    vatEuros: vatCents / 100,
    totalEuros: totalCents / 100,
    amountMicros: totalCents * 10_000,
  };
}

export function repairPaymentAmountFromInput(input: string): RepairPaymentVatBreakdown | null {
  const exVat = parseRepairPaymentAmountExVat(input);
  if (exVat == null) return null;
  return computeRepairPaymentWithVat(exVat);
}

export function formatRepairPaymentEuros(value: number): string {
  return (
    value.toLocaleString("pt-PT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €"
  );
}

export function formatExVatEurosForInput(value: number): string {
  return value.toLocaleString("pt-PT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function visitServiceRepairTotalLabel(amountExVatEuros: number): string | null {
  const breakdown = computeRepairPaymentWithVat(amountExVatEuros);
  if (!breakdown) return null;
  return formatRepairPaymentEuros(breakdown.totalEuros);
}