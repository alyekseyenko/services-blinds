import type { AgendaDiffEvent } from "@/lib/agendaDiff";
import { formatAgendaDiffToast } from "@/lib/agendaDiff";
import { resolveVisitPhase } from "@/lib/agendaVisitLifecycle";
import type { AgendaTimelineEntry } from "@/lib/agendaVisitLifecycle";
import { formatVisitServiceTypeLabel } from "@/lib/visitServiceTypeLabel";

export type AgendaNotificationVisit = {
  clientName?: string;
  nsi?: string;
  visitTitle?: string;
  technicianName?: string;
  dueAtIso?: string;
  serviceType?: string;
};

export function buildVisitFromAgendaEvent(event: AgendaDiffEvent): AgendaNotificationVisit {
  return {
    clientName: event.clientName,
    nsi: event.nsi,
    visitTitle: event.visitTitle?.trim() || undefined,
    technicianName: event.technicianName,
    dueAtIso: event.dueAt,
    serviceType: event.serviceType,
  };
}

export function visitServiceTypeLabel(visit?: AgendaNotificationVisit): string | undefined {
  if (!visit) return undefined;
  return formatVisitServiceTypeLabel({
    serviceType: visit.serviceType,
    visitTitle: visit.visitTitle,
  });
}

export function bellTitleForTimeline(timeline: AgendaTimelineEntry[]): string {
  const { label } = resolveVisitPhase(timeline);
  return `Visita ${label.toLowerCase()}`;
}

export function bellDescriptionFallback(event: AgendaDiffEvent): string {
  return formatAgendaDiffToast(event).description;
}
