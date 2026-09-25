import {
  normalizeServiceTypeKey,
  resolveServiceType,
  serviceTypeConfig,
} from "@/lib/techniciansConfig";
import type { MapHistoryOutcome } from "@/lib/admin/mapHistoryStatus";
import type { MapCategoryFilter, MapStallFilter, Opportunity } from "@/types/admin";

export const MAP_STATUS_TABS: { value: string; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "unscheduled", label: "Por agendar" },
  { value: "scheduled", label: "Agendados" },
];

export const MAP_HISTORY_OUTCOME_OPTIONS: {
  value: MapHistoryOutcome;
  label: string;
}[] = [
  { value: "completed", label: "Concluído" },
  { value: "incomplete", label: "Incompleto" },
  { value: "cancelled", label: "Cancelado" },
];

export const MAP_STALL_FILTERS: { value: MapStallFilter; label: string; hint: string }[] = [
  { value: "all", label: "Qualquer tempo", hint: "Sem filtro de espera" },
  { value: "idle14", label: "+14 dias parado", hint: "Alerta laranja" },
  { value: "idle30", label: "+30 dias parado", hint: "Alerta vermelho" },
];

/** Types shown in map filters (markers/legend may still include others). */
const FILTER_EXCLUDED_SERVICE_KEYS = new Set(["GERAL", "REAGENDAR"]);

const SERVICE_KEYS = (
  Object.keys(serviceTypeConfig) as Array<keyof typeof serviceTypeConfig>
).filter((key) => !FILTER_EXCLUDED_SERVICE_KEYS.has(key));

export const MAP_SERVICE_TYPE_OPTIONS: {
  value: MapCategoryFilter;
  label: string;
  pin: string;
}[] = [
  { value: "all", label: "Todos os tipos", pin: "#64748b" },
  ...SERVICE_KEYS.map((key) => ({
    value: key as MapCategoryFilter,
    label: serviceTypeConfig[key].label,
    pin: serviceTypeConfig[key].pin,
  })),
];

export function opportunityServiceTypeKey(opp: Opportunity): string {
  return normalizeServiceTypeKey(resolveServiceType(opp));
}

export function matchesServiceTypeFilter(
  opp: Opportunity,
  categoryFilter: MapCategoryFilter
): boolean {
  if (categoryFilter === "all") return true;
  return opportunityServiceTypeKey(opp) === categoryFilter;
}

export function matchesServiceTypeFilters(
  opp: Opportunity,
  filters: readonly MapCategoryFilter[]
): boolean {
  if (filters.length === 0) return true;
  const key = opportunityServiceTypeKey(opp);
  return filters.some((f) => f === "all" || f === key);
}

export function matchesTechnicianFilter(
  opp: Opportunity,
  technicianFilter: string | null | undefined
): boolean {
  if (!technicianFilter) return true;
  return (opp.technician || "").trim() === technicianFilter;
}

export function matchesStallFilter(
  opp: Opportunity,
  stallFilter: MapStallFilter
): boolean {
  if (stallFilter === "all") return true;
  if (stallFilter === "idle14") {
    return opp.delayAlert === "orange" || opp.delayAlert === "red";
  }
  if (stallFilter === "idle30") {
    return opp.delayAlert === "red";
  }
  return true;
}
