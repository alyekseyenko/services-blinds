import type { AgendaDiffKind } from "@/lib/agendaDiff";

export type AgendaTimelineEntry = {
  kind: AgendaDiffKind;
  at: number;
  detail?: string;
  /** Novo ciclo após incompleta/cancelada + reagendamento */
  cycleBreak?: boolean;
};

export type VisitPhaseId =
  | "agendada"
  | "em_curso"
  | "atrasada"
  | "concluida"
  | "incompleta"
  | "cancelada"
  | "saiu"
  | "armazem";

export type VisitPhaseToastVariant = "success" | "error" | "warning" | "info";

export type ResolvedVisitPhase = {
  phase: VisitPhaseId;
  label: string;
  toastVariant: VisitPhaseToastVariant;
};

const TIMELINE_CAP = 10;
const TERMINAL_KINDS: AgendaDiffKind[] = ["concluida", "incompleta", "cancelada", "removida"];

const PHASE_LABEL_PT: Record<VisitPhaseId, string> = {
  agendada: "Agendada",
  em_curso: "Em curso",
  atrasada: "Atrasada",
  concluida: "Concluída",
  incompleta: "Incompleta",
  cancelada: "Cancelada",
  saiu: "Saiu da agenda",
  armazem: "Armazém pronto",
};

function capTimeline(timeline: AgendaTimelineEntry[]): AgendaTimelineEntry[] {
  if (timeline.length <= TIMELINE_CAP) return timeline;
  return timeline.slice(-TIMELINE_CAP);
}

function shouldStartNewCycle(timeline: AgendaTimelineEntry[], kind: AgendaDiffKind): boolean {
  if (kind !== "reagendada") return false;
  return timeline.some((e) => e.kind === "incompleta" || e.kind === "cancelada");
}

function lastIndexOfKind(timeline: AgendaTimelineEntry[], kind: AgendaDiffKind): number {
  for (let i = timeline.length - 1; i >= 0; i--) {
    if (timeline[i].kind === kind) return i;
  }
  return -1;
}

function kindToPhase(kind: AgendaDiffKind): VisitPhaseId {
  switch (kind) {
    case "nova":
    case "reagendada":
    case "reatribuida":
      return "agendada";
    case "em_curso":
      return "em_curso";
    case "atrasada":
      return "atrasada";
    case "concluida":
      return "concluida";
    case "incompleta":
      return "incompleta";
    case "cancelada":
      return "cancelada";
    case "removida":
      return "saiu";
    case "armazem_pronto":
      return "armazem";
    case "servico_extra":
    case "medicoes_guardadas":
      return "em_curso";
    default:
      return "agendada";
  }
}

function phaseToastVariant(phase: VisitPhaseId): VisitPhaseToastVariant {
  switch (phase) {
    case "concluida":
    case "armazem":
      return "success";
    case "cancelada":
      return "error";
    case "incompleta":
    case "atrasada":
    case "saiu":
      return "warning";
    case "em_curso":
      return "info";
    default:
      return "info";
  }
}

/** Último passo relevante para a fase do cartão (ignora serviço extra; atraso superado por em curso/final). */
export function resolveVisitPhase(timeline: AgendaTimelineEntry[]): ResolvedVisitPhase {
  if (timeline.length === 0) {
    return { phase: "agendada", label: PHASE_LABEL_PT.agendada, toastVariant: "info" };
  }

  for (let i = timeline.length - 1; i >= 0; i--) {
    const entry = timeline[i];
    if (entry.kind === "servico_extra" || entry.kind === "medicoes_guardadas") continue;
    if (entry.kind === "atrasada") {
      const superseded = timeline.slice(i + 1).some(
        (e) => e.kind === "em_curso" || TERMINAL_KINDS.includes(e.kind)
      );
      if (superseded) continue;
    }
    const phase = kindToPhase(entry.kind);
    return {
      phase,
      label: PHASE_LABEL_PT[phase],
      toastVariant: phaseToastVariant(phase),
    };
  }

  const fallback = kindToPhase(timeline[timeline.length - 1].kind);
  return {
    phase: fallback,
    label: PHASE_LABEL_PT[fallback],
    toastVariant: phaseToastVariant(fallback),
  };
}

export function appendTimelineEvent(
  timeline: AgendaTimelineEntry[],
  event: { kind: AgendaDiffKind; detail?: string },
  now: number
): AgendaTimelineEntry[] {
  const last = timeline[timeline.length - 1];
  if (last?.kind === event.kind && last.detail === event.detail && !event.detail) {
    return timeline;
  }

  const cycleBreak = shouldStartNewCycle(timeline, event.kind);
  const next: AgendaTimelineEntry[] = [...timeline];

  if (event.kind === "atrasada") {
    const lateIdx = lastIndexOfKind(next, "atrasada");
    if (lateIdx >= 0) {
      const superseded = next
        .slice(lateIdx + 1)
        .some((e) => e.kind === "em_curso" || TERMINAL_KINDS.includes(e.kind));
      if (!superseded) return timeline;
    }
  }

  next.push({
    kind: event.kind,
    at: now,
    detail: event.detail,
    cycleBreak: cycleBreak || undefined,
  });

  return capTimeline(next);
}

export function migrateAgendaProgressToTimeline(
  progress: AgendaDiffKind[] | undefined,
  fallbackAt: number
): AgendaTimelineEntry[] {
  if (!progress?.length) return [];
  return progress.map((kind, index) => ({
    kind,
    at: fallbackAt - (progress.length - index) * 60_000,
  }));
}

export function timelineKindLabelPt(kind: AgendaDiffKind): string {
  const map: Record<AgendaDiffKind, string> = {
    nova: "Nova visita",
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
    medicoes_guardadas: "Medições guardadas",
  };
  return map[kind] ?? kind;
}

export function notificationMatchesFilter(
  phase: VisitPhaseId,
  filter: "all" | "active" | "done" | "problems"
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "active":
      return phase === "agendada" || phase === "em_curso" || phase === "atrasada";
    case "done":
      return phase === "concluida" || phase === "armazem";
    case "problems":
      return (
        phase === "incompleta" ||
        phase === "cancelada" ||
        phase === "atrasada" ||
        phase === "saiu"
      );
    default:
      return true;
  }
}

export function formatTimelinePathShort(timeline: AgendaTimelineEntry[]): string {
  const labels = timeline.map((e) => timelineKindLabelPt(e.kind));
  const unique: string[] = [];
  for (const l of labels) {
    if (unique[unique.length - 1] !== l) unique.push(l);
  }
  if (unique.length <= 1) return unique[0] ?? "";
  return unique.join(" → ");
}
