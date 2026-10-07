import {
  isNeedsSchedulingStage,
  isTaskActive,
  isTaskCompleted,
  isTaskIncomplete,
  isTaskInProgress,
  isTaskPendingConfirmation,
} from "@/lib/crm/contract";
import { opportunityServiceTypeKey } from "@/lib/admin/mapFilterConfig";
import { countUnscheduledWithoutGps } from "@/lib/admin/zoneInsights";
import { getServiceTypeColor } from "@/lib/techniciansConfig";
import type { Opportunity } from "@/types/admin";

export type AdminHomeStatusBucket = {
  id: string;
  label: string;
  count: number;
  tone: "primary" | "warning" | "info" | "danger" | "success" | "muted";
};

export type AdminHomeServiceTypeBucket = {
  id: string;
  label: string;
  count: number;
  pin: string;
};

export type AdminHomeDashboardStats = {
  /** Serviços em aberto no mapa (exclui concluídos). */
  activePipeline: number;
  totalPipeline: number;
  toSchedule: number;
  pendingConfirmation: number;
  scheduledActive: number;
  inProgress: number;
  incomplete: number;
  completed: number;
  withoutGps: number;
  statusChart: AdminHomeStatusBucket[];
  serviceTypeChart: AdminHomeServiceTypeBucket[];
};

function buildServiceTypeChart(opportunities: Opportunity[]): AdminHomeServiceTypeBucket[] {
  const counts = new Map<string, number>();
  for (const opp of opportunities) {
    if (isTaskCompleted(opp.status)) continue;
    const key = opportunityServiceTypeKey(opp);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => {
      const cfg = getServiceTypeColor(id);
      return { id, label: cfg.label, count, pin: cfg.pin };
    })
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function computeAdminHomeDashboardStats(
  opportunities: Opportunity[]
): AdminHomeDashboardStats {
  let toSchedule = 0;
  let pendingConfirmation = 0;
  let scheduledActive = 0;
  let inProgress = 0;
  let incomplete = 0;
  let completed = 0;

  for (const opp of opportunities) {
    if (isTaskIncomplete(opp.status)) {
      incomplete += 1;
      continue;
    }
    if (isTaskCompleted(opp.status)) {
      completed += 1;
      continue;
    }
    if (isTaskInProgress(opp.status)) {
      inProgress += 1;
      continue;
    }
    if (isTaskPendingConfirmation(opp.status)) {
      pendingConfirmation += 1;
      continue;
    }
    if (isNeedsSchedulingStage(opp.stage)) {
      toSchedule += 1;
      continue;
    }
    if (isTaskActive(opp.status)) {
      scheduledActive += 1;
    }
  }

  const withoutGps = countUnscheduledWithoutGps(opportunities);

  const statusChart = (
    [
      { id: "toSchedule", label: "Por agendar", count: toSchedule, tone: "warning" as const },
      { id: "scheduled", label: "Agendados", count: scheduledActive, tone: "primary" as const },
      { id: "inProgress", label: "Em curso", count: inProgress, tone: "info" as const },
      { id: "incomplete", label: "Incompletos", count: incomplete, tone: "danger" as const },
      { id: "pending", label: "Por confirmar", count: pendingConfirmation, tone: "muted" as const },
    ] satisfies AdminHomeStatusBucket[]
  ).filter((b) => b.count > 0);

  const activePipeline = opportunities.length - completed;

  return {
    activePipeline,
    totalPipeline: opportunities.length,
    toSchedule,
    pendingConfirmation,
    scheduledActive,
    inProgress,
    incomplete,
    completed,
    withoutGps,
    statusChart,
    serviceTypeChart: buildServiceTypeChart(opportunities),
  };
}
