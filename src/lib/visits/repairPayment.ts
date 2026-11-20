import { classifyOpportunityWorkflow } from "@/lib/crm/contract";

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
  note: Pick<RepairPaymentNote, "method" | "detail">
): string {
  return `Pagamento: ${repairPaymentDisplayLabel(note.method, note.detail)}`;
}

export function extraRepairPaymentNoteBody(
  method: RepairPaymentMethodId,
  detail?: string | null
): string {
  return `Pagamento do serviço extra (feito no local): ${repairPaymentDisplayLabel(method, detail)}.`;
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