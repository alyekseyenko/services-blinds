import type { AgendaDiffKind } from "@/lib/agendaDiff";
import type { ToastType } from "@/components/ui/ToastContext";

/** Cores alinhadas com ToastContext: verde / vermelho / laranja / azul. */
export function agendaKindToToastType(kind: AgendaDiffKind): ToastType {
  switch (kind) {
    case "concluida":
      return "success";
    case "cancelada":
      return "error";
    case "incompleta":
    case "atrasada":
      return "warning";
    case "servico_extra":
    case "armazem_pronto":
    case "medicoes_guardadas":
      return "success";
    default:
      return "info";
  }
}

export function inferAgendaKindFromNotificationTitle(title: string): AgendaDiffKind | undefined {
  const t = title.toLowerCase();
  if (t.includes("cancelad")) return "cancelada";
  if (t.includes("conclu")) return "concluida";
  if (t.includes("incomplet")) return "incompleta";
  if (t.includes("em curso")) return "em_curso";
  if (t.includes("reagendad")) return "reagendada";
  if (t.includes("nova visita")) return "nova";
  if (t.includes("saiu da agenda") || t.includes("removida")) return "removida";
  if (t.includes("reatribu")) return "reatribuida";
  if (t.includes("atrasad")) return "atrasada";
  if (t.includes("serviço extra") || t.includes("servico extra")) return "servico_extra";
  if (t.includes("armazém") || t.includes("armazem")) return "armazem_pronto";
  return undefined;
}

export function observabilityNotificationToastType(): ToastType {
  return "warning";
}

export function resolveAgendaNotificationToastType(
  agendaKind?: AgendaDiffKind | null,
  title?: string,
  notificationKind?: "agenda" | "observability" | null
): ToastType {
  if (notificationKind === "observability") return observabilityNotificationToastType();
  if (agendaKind) return agendaKindToToastType(agendaKind);
  const inferred = title ? inferAgendaKindFromNotificationTitle(title) : undefined;
  if (inferred) return agendaKindToToastType(inferred);
  return "info";
}
