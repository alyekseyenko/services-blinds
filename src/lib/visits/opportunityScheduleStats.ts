import type { AgendaTimelineEntry } from "@/lib/agendaVisitLifecycle";

const SCHEDULING_NOTE_TITLE_MARKERS = [
  "instruções de agendamento",
  "agendamento urgente",
  "agendamento em massa",
] as const;

export type OpportunityScheduleStats = {
  /** Primeiro agendamento + cada reagendamento registado na app (sininho). */
  scheduleEvents: number;
  reschedules: number;
};

export type OpportunityScheduleNoteStats = {
  /** Notas CRM criadas ao agendar (histórico operacional). */
  schedulingNotes: number;
};

function normalizeTitle(title?: string): string {
  return (title ?? "").trim().toLowerCase();
}

export function isSchedulingCrmNoteTitle(title?: string): boolean {
  const t = normalizeTitle(title);
  return SCHEDULING_NOTE_TITLE_MARKERS.some((m) => t.includes(m));
}

export function countSchedulingNotes(
  notes: ReadonlyArray<{ title?: string | null }>
): OpportunityScheduleNoteStats {
  let schedulingNotes = 0;
  for (const note of notes) {
    if (isSchedulingCrmNoteTitle(note.title ?? undefined)) schedulingNotes += 1;
  }
  return { schedulingNotes };
}

/** Conta ciclos a partir da timeline do sininho (local ao browser do operador). */
export function countScheduleEventsFromTimeline(
  timeline: ReadonlyArray<Pick<AgendaTimelineEntry, "kind">>
): OpportunityScheduleStats {
  let scheduleEvents = 0;
  let reschedules = 0;
  for (const entry of timeline) {
    if (entry.kind === "nova") scheduleEvents += 1;
    if (entry.kind === "reagendada") {
      scheduleEvents += 1;
      reschedules += 1;
    }
  }
  return { scheduleEvents, reschedules };
}

export function formatScheduleStatsLabel(stats: OpportunityScheduleNoteStats): string | null {
  if (stats.schedulingNotes <= 0) return null;
  if (stats.schedulingNotes === 1) return "1 agendamento registado no CRM";
  return `${stats.schedulingNotes} agendamentos registados no CRM`;
}
