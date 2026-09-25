import {
  CRM_STAGES,
  STAGE_GROUPS,
  isRemediationStage,
  isTaskCompleted,
  normalizeString,
} from "@/lib/crm/contract";
import { citiesMatch } from "@/lib/admin/geo";
import { matchesHistoryOutcomeFilter, type MapHistoryOutcome } from "@/lib/admin/mapHistoryStatus";
import {
  matchesServiceTypeFilters,
  matchesStallFilter,
  matchesTechnicianFilter,
} from "@/lib/admin/mapFilterConfig";
import type { MapCategoryFilter, MapStallFilter, Opportunity } from "@/types/admin";
import type { TechnicianLocation } from "@/hooks/useTechnicianLocations";

export interface MapFilterOptions {
  mapTab: string;
  cityFilter: string | null;
  serviceTypeFilters: readonly MapCategoryFilter[];
  stallFilter?: MapStallFilter;
  technicianFilter?: string | null;
  historyOutcomes?: readonly MapHistoryOutcome[];
  historyItems?: Opportunity[];
}

function dedupeOpportunities(items: Opportunity[]): Opportunity[] {
  const seen = new Set<string>();
  const out: Opportunity[] = [];
  for (const opp of items) {
    const key = opp.twentyId || opp.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(opp);
  }
  return out;
}

function filterHistoryPins(
  historyItems: Opportunity[],
  options: Pick<
    MapFilterOptions,
    "cityFilter" | "serviceTypeFilters" | "technicianFilter" | "historyOutcomes"
  >
): Opportunity[] {
  const outcomes = options.historyOutcomes ?? [];
  if (outcomes.length === 0) return [];

  return historyItems.filter((opp) => {
    if (!opp.coordinates || !Array.isArray(opp.coordinates)) return false;
    if (!matchesHistoryOutcomeFilter(opp, outcomes)) return false;
    if (!matchesServiceTypeFilters(opp, options.serviceTypeFilters)) return false;
    if (!matchesTechnicianFilter(opp, options.technicianFilter)) return false;
    if (
      options.cityFilter &&
      !citiesMatch(opp.addressCity || "Other Zones", options.cityFilter)
    ) {
      return false;
    }
    return true;
  });
}

export function filterMapOpportunities(
  opportunities: Opportunity[],
  options: MapFilterOptions
): Opportunity[] {
  const {
    mapTab,
    cityFilter,
    serviceTypeFilters,
    stallFilter = "all",
    technicianFilter = null,
    historyOutcomes = [],
    historyItems = [],
  } = options;

  let filtered = opportunities.map((opp) => {
    const createdDate = opp.dueDate || new Date();
    const diffDays = Math.ceil(
      Math.abs(new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const delayAlert: Opportunity["delayAlert"] =
      diffDays > 30 ? "red" : diffDays > 14 ? "orange" : null;
    return { ...opp, delayDays: diffDays, delayAlert };
  });

  filtered = filtered.filter((opp) => {
    const stageNorm = normalizeString(opp.stage);
    const needsScheduling =
      STAGE_GROUPS.NEEDS_SCHEDULING.includes(stageNorm) || stageNorm.includes("REMED");

    if (needsScheduling) return true;

    const isDone =
      isTaskCompleted(opp.taskStatus) ||
      stageNorm === CRM_STAGES.PREPARACAO ||
      stageNorm === CRM_STAGES.CONCLUIDO;

    return !isDone;
  });

  if (mapTab === "unscheduled") {
    filtered = filtered.filter((opp) => {
      const stageNorm = normalizeString(opp.stage);
      const isUnscheduledStage =
        STAGE_GROUPS.NEEDS_SCHEDULING.includes(stageNorm) || stageNorm.includes("REMED");
      const isRemedicaoStage = isRemediationStage(opp.stage);
      return (isUnscheduledStage || isRemedicaoStage) && !opp.hasScheduledTask;
    });
  }

  if (mapTab === "scheduled") {
    filtered = filtered.filter((opp) => opp.hasScheduledTask);
  }

  if (cityFilter) {
    filtered = filtered.filter((opp) => citiesMatch(opp.addressCity || "Other Zones", cityFilter));
  }

  filtered = filtered.filter(
    (opp) =>
      matchesServiceTypeFilters(opp, serviceTypeFilters) &&
      matchesStallFilter(opp, stallFilter) &&
      matchesTechnicianFilter(opp, technicianFilter)
  );

  const historyPins = filterHistoryPins(historyItems, {
    cityFilter,
    serviceTypeFilters,
    technicianFilter,
    historyOutcomes,
  });

  return dedupeOpportunities([...filtered, ...historyPins]);
}

export function filterCalendarOpportunities(
  opportunities: Opportunity[],
  selectedTechnician: string
): Opportunity[] {
  let filtered = opportunities
    .filter((opp) => opp.scheduledAt)
    .map((opp) => ({
      ...opp,
      start: opp.scheduledAt as Date,
      end: new Date(new Date(opp.scheduledAt as Date).getTime() + 60 * 60 * 1000),
    }));

  if (selectedTechnician !== "all") {
    filtered = filtered.filter((opp) => opp.technician === selectedTechnician);
  }

  return filtered;
}

export function extractTechnicianNames(opportunities: Opportunity[]): string[] {
  return opportunities.reduce<string[]>((acc, opp) => {
    if (opp.technician && !acc.includes(opp.technician)) acc.push(opp.technician);
    return acc;
  }, []);
}

export interface MapTechnicianOption {
  name: string;
  isLive: boolean;
}

export function buildMapTechnicianOptions(
  opportunities: Opportunity[],
  techniciansLocations: TechnicianLocation[]
): MapTechnicianOption[] {
  const live = new Set(techniciansLocations.map((t) => t.technicianName));
  const names = new Set<string>();
  techniciansLocations.forEach((t) => names.add(t.technicianName));
  opportunities.forEach((opp) => {
    if (opp.technician) names.add(opp.technician);
  });
  return [...names]
    .sort((a, b) => a.localeCompare(b, "pt-PT"))
    .map((name) => ({ name, isLive: live.has(name) }));
}
