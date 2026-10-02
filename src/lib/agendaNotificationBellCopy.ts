import type { AgendaDiffEvent, AgendaDiffKind } from "@/lib/agendaDiff";
import { formatAgendaDiffToast } from "@/lib/agendaDiff";

export const AGENDA_KIND_LABEL_PT: Record<AgendaDiffKind, string> = {
  nova: "Nova",
  reagendada: "Reagendada",
  cancelada: "Cancelada",
  concluida: "Concluída",
  incompleta: "Incompleta",
  em_curso: "Em curso",
  removida: "Saiu da agenda",
  reatribuida: "Reatribuída",
  atrasada: "Atrasada",
  servico_extra: "Serviço extra",
  armazem_pronto: "Armazém pronto",
  medicoes_guardadas: "Medições",
};

export function appendAgendaProgressTrail(
  previous: AgendaDiffKind[] | undefined,
  kind: AgendaDiffKind
): AgendaDiffKind[] {
  const trail = previous?.length ? [...previous] : [];
  if (trail[trail.length - 1] === kind) return trail;
  return [...trail, kind];
}

/** Título e descrição base do sininho (progresso vai em `agendaProgress`, não no texto). */
export function formatAgendaBellCopy(
  event: AgendaDiffEvent,
  _progressTrail?: AgendaDiffKind[]
): { title: string; description: string } {
  return formatAgendaDiffToast(event);
}

/** Remove sufixo legado “· Progresso: …” de avisos já guardados no dispositivo. */
export function stripLegacyAgendaProgressFromDescription(description: string): string {
  const marker = " · Progresso:";
  const idx = description.indexOf(marker);
  if (idx < 0) return description;
  return description.slice(0, idx).trim();
}
