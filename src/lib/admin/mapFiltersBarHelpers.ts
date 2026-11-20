import { MAP_SERVICE_TYPE_OPTIONS } from "@/lib/admin/mapFilterConfig";
import type { MapHistoryOutcome } from "@/lib/admin/mapHistoryStatus";
import type { UnscheduledWithoutGps } from "@/lib/admin/zoneInsights";
import type { MapCategoryFilter, MapStallFilter, ZoneInsight } from "@/types/admin";

export function countActiveFilters(
  mapTab: string,
  serviceTypeFilters: MapCategoryFilter[],
  stallFilter: MapStallFilter,
  pendingClosureOnly: boolean,
  cityFilter: string | null,
  mapTechnicianFilter: string | null,
  historyOutcomes: MapHistoryOutcome[]
): number {
  let n = 0;
  if (mapTab !== "unscheduled") n += 1;
  if (serviceTypeFilters.length > 0) n += 1;
  if (stallFilter !== "all") n += 1;
  if (pendingClosureOnly) n += 1;
  if (cityFilter) n += 1;
  if (mapTechnicianFilter) n += 1;
  if (historyOutcomes.length > 0) n += 1;
  return n;
}

export function formatActiveTypeLabel(serviceTypeFilters: MapCategoryFilter[]): string {
  if (serviceTypeFilters.length === 0) return "Todos os tipos";
  if (serviceTypeFilters.length === 1) {
    return (
      MAP_SERVICE_TYPE_OPTIONS.find((o) => o.value === serviceTypeFilters[0])?.label ??
      serviceTypeFilters[0]
    );
  }
  return `${serviceTypeFilters.length} tipos`;
}

export function priorityBadgeClass(priority: ZoneInsight["priority"]): string {
  switch (priority) {
    case "Critical":
      return "bg-danger-solid text-ink-foreground";
    case "High":
      return "bg-warning-solid text-primary-foreground";
    case "Medium":
      return "bg-primary text-primary-foreground";
    default:
      return "bg-secondary text-foreground";
  }
}

export function priorityLabel(priority: ZoneInsight["priority"]): string {
  switch (priority) {
    case "Critical":
      return "Crítica";
    case "High":
      return "Alta";
    case "Medium":
      return "Média";
    default:
      return "Baixa";
  }
}

export function withoutGpsHeading(svc: UnscheduledWithoutGps): string {
  return svc.client || svc.title || "Serviço sem nome";
}

export function withoutGpsIdentity(svc: UnscheduledWithoutGps): string {
  const refs = [
    svc.serviceNumber ? `N.º ${svc.serviceNumber}` : null,
    svc.nsi ? `NSI ${svc.nsi}` : null,
  ].filter(Boolean);
  const title =
    svc.title && svc.title !== svc.client && svc.title !== withoutGpsHeading(svc) ? svc.title : "";
  return [refs.join(" · "), title].filter(Boolean).join(" · ");
}