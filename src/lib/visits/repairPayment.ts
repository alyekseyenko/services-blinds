import { classifyOpportunityWorkflow } from "@/lib/crm/contract";
import {
  computeRepairPaymentWithVat,
  formatRepairPaymentEuros,
} from "@/lib/visits/repairPaymentAmount";

export const REPAIR_PAYMENT_OTHER_DETAIL_MAX = 500;

export const REPAIR_PAYMENT_METHODS = [
  { id: "tpa_local", label: "TPA no local" },
  { id: "tpa_sede", label: "TPA na sede" },
  { id: "transferencia", label: "Transferência" },
  { id: "numerario_local", label: "Numerário no local" },
  { id: "numerario_sede", label: "Numerário na sede" },
  { id: "outros", label: "Outros" },
] as const;

export type RepairPaymentMethodId = (typeof REPAIR_PAYMENT_METHODS)[number]["id"];

export type RepairPaymentNote = {
  opportunityId: string;
  method: RepairPaymentMethodId;
  detail?: string;
  /** Valor recebido sem IVA (euros). Opcional; não bloqueia o fecho. */
  amountExVatEuros?: number;
  /** Montante sem IVA que estava confirmado antes da última confirmação (só para a nota). */
  amountRevisedFromExVatEuros?: number;
};

type RepairCandidate = {
  opportunityId: string;
  serviceType?: string | null;
  stage?: string | null;
  name?: string | null;
  mode?: string | null;
  paymentMethod?: string | null;
  paymentDetail?: string | null;
};

const METHOD_IDS = new Set<string>(REPAIR_PAYMENT_METHODS.map((item) => item.id));

export function repairPaymentLabel(method: RepairPaymentMethodId): string {
  return REPAIR_PAYMENT_METHODS.find((item) => item.id === method)?.label ?? method;
}

export function repairPaymentDisplayLabel(
  method: RepairPaymentMethodId,
  detail?: string | null
): string {
  if (method === "outros") {
    const trimmed = detail?.trim();
    return trimmed ? `Outros — ${trimmed}` : "Outros";
  }
  return repairPaymentLabel(method);
}

export function isRepairPaymentComplete(
  method: string | null | undefined,
  detail?: string | null
): boolean {
  if (!isRepairPaymentMethod(method || "")) return false;
  if (method === "outros") return Boolean(detail?.trim());
  return true;
}

export function repairPaymentNoteBody(
  note: Pick<
    RepairPaymentNote,
    "method" | "detail" | "amountExVatEuros" | "amountRevisedFromExVatEuros"
  >
): string {
  const lines = [`Pagamento: ${repairPaymentDisplayLabel(note.method, note.detail)}`];
  if (note.amountExVatEuros != null && note.amountExVatEuros > 0) {
    const breakdown = computeRepairPaymentWithVat(note.amountExVatEuros);
    if (breakdown) {
      lines.push(
        `Valor (sem IVA): ${formatRepairPaymentEuros(breakdown.exVatEuros)}`,
        `IVA (23%): ${formatRepairPaymentEuros(breakdown.vatEuros)}`,
        `Total: ${formatRepairPaymentEuros(breakdown.totalEuros)}`
      );
      lines.push(
        "Cópia de segurança: o montante fica registado nesta nota, mesmo que o campo Montante no CRM falhe ou seja alterado depois."
      );
      if (note.amountRevisedFromExVatEuros != null && note.amountRevisedFromExVatEuros > 0) {
        const prior = computeRepairPaymentWithVat(note.amountRevisedFromExVatEuros);
        if (prior) {
          lines.push(
            `Valor revisto: estava confirmado ${formatRepairPaymentEuros(prior.exVatEuros)} (sem IVA) — editado e confirmado para ${formatRepairPaymentEuros(breakdown.exVatEuros)} (sem IVA); total ${formatRepairPaymentEuros(breakdown.totalEuros)}.`
          );
        }
      }
    }
  }
  return lines.join("\n");
}

export function extraRepairPaymentNoteBody(
  method: RepairPaymentMethodId,
  detail?: string | null,
  amounts?: Pick<RepairPaymentNote, "amountExVatEuros" | "amountRevisedFromExVatEuros">
): string {
  const head = `Pagamento do serviço extra (feito no local): ${repairPaymentDisplayLabel(method, detail)}.`;
  if (amounts?.amountExVatEuros == null || amounts.amountExVatEuros <= 0) {
    return head;
  }
  const withAmount = repairPaymentNoteBody({
    method,
    detail: detail ?? undefined,
    amountExVatEuros: amounts.amountExVatEuros,
    amountRevisedFromExVatEuros: amounts.amountRevisedFromExVatEuros,
  });
  const tail = withAmount
    .split("\n")
    .slice(1)
    .join("\n")
    .trim();
  return tail ? `${head}\n${tail}` : head;
}

export function extraServiceNeedsPaymentNow(
  serviceType: string | null | undefined,
  mode: string | null | undefined
): boolean {
  if (mode === "later") return false;
  return (serviceType || "").toUpperCase() === "REPARACAO";
}

export function isRepairPaymentMethod(value: string): value is RepairPaymentMethodId {
  return METHOD_IDS.has(value);
}

/** CRM stage wins over opportunity name (e.g. reclassified maintenance while title still says Reparação). */
export function opportunityRequiresRepairPayment(service: {
  stage?: string | null;
  name?: string | null;
  serviceType?: string | null;
  mode?: string | null;
}): boolean {
  if (service.mode === "later") return false;
  const type = (service.serviceType || "").toUpperCase();
  if (type === "MANUTENCAO") return false;
  const workflow = classifyOpportunityWorkflow(service.stage, service.name ?? undefined);
  if (workflow === "maintenance") return false;
  if (workflow === "repair") return true;
  return type === "REPARACAO";
}

export function isRepairNeedingPayment(service: RepairCandidate): boolean {
  if (!service.opportunityId) return false;
  if (isRepairPaymentComplete(service.paymentMethod, service.paymentDetail)) return false;
  return opportunityRequiresRepairPayment(service);
}

export function repairsNeedingPayment<T extends RepairCandidate>(services: readonly T[]): T[] {
  return services.filter(isRepairNeedingPayment);
}

export function missingRepairPayments(
  services: readonly RepairCandidate[],
  chosen: Readonly<Record<string, string>>,
  details?: Readonly<Record<string, string>>
): RepairCandidate[] {
  return repairsNeedingPayment(services).filter(
    (service) => !isRepairPaymentComplete(chosen[service.opportunityId], details?.[service.opportunityId])
  );
}