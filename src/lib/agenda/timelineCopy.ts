import type { AgendaDiffKind } from "@/lib/agenda/diff";
import type { AgendaTimelineEntry } from "@/lib/agenda/visitLifecycle";
import {
  isVisitDueBeforeToday,
  PENDING_CLOSURE_BELL_NOTE_PT,
} from "@/lib/visits/pendingClosure";

const UNASSIGNED_TECH = "Não Atribuído";

/** Nota automática ao marcar EM_CURSO — não deve aparecer como detalhe de conclusão. */
export function isArrivalStatusNote(note: string): boolean {
  const t = note.trim();
  if (!t) return false;
  if (/^t[eé]cnico chegou ao local\.?$/i.test(t)) return true;
  if (/chegou ao local\.?$/i.test(t)) return true;
  return false;
}

export function emCursoTimelineDetail(technicianName?: string): string {
  const tech = technicianName?.trim();
  if (tech && tech !== UNASSIGNED_TECH) return `${tech} chegou ao local.`;
  return "Técnico chegou ao local.";
}

export function concluidaTimelineDetail(
  technicianName?: string,
  statusNote?: string
): string {
  const note = statusNote?.trim();
  if (note && !isArrivalStatusNote(note)) return note;
  const tech = technicianName?.trim();
  if (tech && tech !== UNASSIGNED_TECH) {
    return `${tech} terminou o serviço e saiu do local.`;
  }
  return "Serviço concluído — técnico saiu do local.";
}

/** Texto secundário na linha temporal do sininho (corrige notas antigas mal atribuídas). */
export function resolveTimelineEntryDetail(
  entry: Pick<AgendaTimelineEntry, "kind" | "detail">,
  technicianName?: string
): string | undefined {
  switch (entry.kind) {
    case "em_curso":
      return entry.detail?.trim() || emCursoTimelineDetail(technicianName);
    case "concluida":
      return concluidaTimelineDetail(technicianName, entry.detail);
    case "incompleta":
    case "cancelada":
      return entry.detail?.trim() || undefined;
    default:
      return entry.detail?.trim() || undefined;
  }
}

function withPriorDayClosureNote(
  kind: AgendaDiffKind,
  dueAt?: string,
  detail?: string
): string | undefined {
  const needsPrior =
    (kind === "cancelada" || kind === "incompleta" || kind === "concluida") &&
    isVisitDueBeforeToday(dueAt);
  if (!needsPrior) return detail;
  if (detail?.trim()) return `${PENDING_CLOSURE_BELL_NOTE_PT} ${detail.trim()}`;
  return PENDING_CLOSURE_BELL_NOTE_PT;
}

export function timelineDetailForDiffEvent(
  kind: AgendaDiffKind,
  item: { technicianName?: string; statusNote?: string; dueAt?: string }
): string | undefined {
  switch (kind) {
    case "em_curso":
      return emCursoTimelineDetail(item.technicianName);
    case "concluida":
      return withPriorDayClosureNote(
        kind,
        item.dueAt,
        concluidaTimelineDetail(item.technicianName, item.statusNote)
      );
    case "incompleta":
    case "cancelada": {
      const note = item.statusNote?.trim();
      return withPriorDayClosureNote(kind, item.dueAt, note || undefined);
    }
    default:
      return undefined;
  }
}
