import {
  CRM_STAGES,
  STAGE_GROUPS,
  isAssistanceService,
  isInstallationService,
  isMeasurementService,
  isRemediationStage,
  isTaskCompleted,
  normalizeString,
} from "@/lib/crm/contract";
import type { MapCategoryFilter, Opportunity } from "@/types/admin";

export interface MapFilterOptions {
  mapTab: string;
  cityFilter: string | null;
  categoryFilter: MapCategoryFilter;
}

export function filterMapOpportunities(
  opportunities: Opportunity[],
  { mapTab, cityFilter, categoryFilter }: MapFilterOptions
): Opportunity[] {
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
    filtered = filtered.filter((opp) => (opp.addressCity || "Outros") === cityFilter);
  }

  if (categoryFilter === "medicoes") {
    filtered = filtered.filter((opp) => isMeasurementService(opp.stage, opp.title));
  } else if (categoryFilter === "instalacoes") {
    filtered = filtered.filter((opp) => isInstallationService(opp.stage, opp.title));
  } else if (categoryFilter === "assistencia") {
    filtered = filtered.filter((opp) => isAssistanceService(opp.stage, opp.title));
  }

  return filtered;
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
