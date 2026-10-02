import { CRM_TASK_STATUS, normalizeTaskStatus } from "@/lib/crm/contract";

/** Etiqueta de estado da visita para notas CRM e UI (pt-PT). */
export function formatTaskStatusPt(status?: string | null): string {
  const s = normalizeTaskStatus(status);
  switch (s) {
    case CRM_TASK_STATUS.CONCLUIDO:
    case CRM_TASK_STATUS.DONE:
    case "COMPLETED":
      return "Concluída";
    case CRM_TASK_STATUS.CANCELADO:
    case "CANCELLED":
    case "CANCELED":
      return "Cancelada";
    case CRM_TASK_STATUS.INCOMPLETO:
    case "INCOMPLETE":
      return "Incompleta";
    case CRM_TASK_STATUS.EM_CURSO:
    case "IN_PROGRESS":
      return "Em curso";
    case CRM_TASK_STATUS.AGENDADO:
    case "SCHEDULED":
      return "Agendada";
    case CRM_TASK_STATUS.POR_AGENDAR:
    case "TO_SCHEDULE":
    case "UNSCHEDULED":
      return "Por agendar";
    default: {
      const raw = status?.trim();
      if (!raw) return "Estado desconhecido";
      if (/^completed$/i.test(raw)) return "Concluída";
      if (/^cancelled?$/i.test(raw)) return "Cancelada";
      if (/^incomplete$/i.test(raw)) return "Incompleta";
      return raw;
    }
  }
}

export function buildTechnicianLeftSiteNotePt(
  technicianName: string | null | undefined,
  closedStatus: string
): { title: string; body: string } {
  const tech = technicianName?.trim() || "Técnico";
  const estado = formatTaskStatusPt(closedStatus);
  return {
    title: "Saída do local do cliente",
    body: `${tech} saiu do local do cliente. Visita encerrada como: ${estado}.`,
  };
}
