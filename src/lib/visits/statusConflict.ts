import { CRM_TASK_STATUS, normalizeTaskStatus } from "@/lib/crm/contract";

export const OFFICE_CANCELLED_VISIT_MESSAGE =
  "A visita foi cancelada pelo escritório. Actualize a agenda.";

/** When CRM already cancelled the visit, block offline technician status overwrites. */
export function offlineStatusConflict(
  crmStatus: string | undefined | null,
  incomingStatus: string
): string | null {
  const crm = normalizeTaskStatus(crmStatus ?? "");
  const incoming = normalizeTaskStatus(incomingStatus);
  if (crm === CRM_TASK_STATUS.CANCELADO && incoming !== CRM_TASK_STATUS.CANCELADO) {
    return OFFICE_CANCELLED_VISIT_MESSAGE;
  }
  return null;
}
