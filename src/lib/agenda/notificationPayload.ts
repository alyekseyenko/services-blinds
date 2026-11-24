import type { AgendaDiffEvent } from "@/lib/agenda/diff";
import { formatAgendaDiffToast } from "@/lib/agenda/diff";
import { resolveVisitPhase } from "@/lib/agenda/visitLifecycle";
import type { AgendaTimelineEntry } from "@/lib/agenda/visitLifecycle";
import { formatVisitServiceTypeLabel } from "@/lib/visits/serviceTypeLabel";

export type AgendaNotificationVisit = {
  clientName?: string;
  nsi?: string;
  serviceNumber?: string;
  visitTitle?: string;
  technicianName?: string;
  dueAtIso?: string;
  serviceType?: string;
  urgent?: boolean;
};

export function buildVisitFromAgendaEvent(event: AgendaDiffEvent): AgendaNotificationVisit {
  return {
    clientName: event.clientName,
    nsi: event.nsi,
    serviceNumber: event.serviceNumber,
    visitTitle: event.visitTitle?.trim() || undefined,
    technicianName: event.technicianName,
    dueAtIso: event.dueAt,
    serviceType: event.serviceType,
    urgent: event.urgent || undefined,
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

const GENERIC_CLIENT_NAMES = new Set(["cliente", "client", ""]);

export function isGenericAgendaClientName(name?: string | null): boolean {
  const trimmed = name?.trim().toLowerCase() ?? "";
  return GENERIC_CLIENT_NAMES.has(trimmed);
}

/** Linha principal do cartão no sininho (cliente, ou título/morada quando o CRM manda «Cliente»). */
export function buildAgendaNotificationHeadline(visit?: AgendaNotificationVisit): string {
  if (!visit) return "";
  const chunks: string[] = [];
  if (!isGenericAgendaClientName(visit.clientName)) {
    chunks.push(visit.clientName!.trim());
  }
  if (visit.serviceNumber) chunks.push(`N.º ${visit.serviceNumber}`);
  if (visit.nsi) chunks.push(`NSI ${visit.nsi}`);
  if (chunks.length > 0) return chunks.join(" · ");
  return visit.visitTitle?.trim() || "";
}

/** Subtítulo (título da visita) — só quando não estiver já na headline. */
export function buildAgendaNotificationSubtitle(
  visit?: AgendaNotificationVisit
): string | undefined {
  const title = visit?.visitTitle?.trim();
  if (!title) return undefined;
  const headline = buildAgendaNotificationHeadline(visit);
  if (!headline || headline === title) return undefined;
  if (isGenericAgendaClientName(visit?.clientName)) return undefined;
  return title;
}
