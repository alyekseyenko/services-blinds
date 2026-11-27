import { CRM_STAGES, CRM_TASK_STATUS, parseCrmClientRating } from "@/lib/crm/contract";
import { canonicalTechnicianName } from "@/lib/technicianIdentity";
import { formatServiceNumber } from "@/lib/crm/serviceNumber";
import { HQ_COORDINATES } from "@/lib/hq";
import {
  applyTeamSupportVisitsToRankings,
  creditTeamSupportVisits,
  teamFieldsFromCeoServiceTask,
} from "@/lib/ceo/teamStats";
export { computeCeoOnSiteDuration } from "@/lib/ceo/onSiteDurationMetrics";
import type {
  ClientFollowUp,
  CeoServiceItem,
  FinancialMetrics,
  MonthlyData,
  TechnicianKmStat,
  TechnicianRanking,
} from "@/lib/schemas/ceoMetrics";
import {
  STAGE_LABELS,
  STAGE_WEIGHTS,
  MONTH_NAMES,
  MONTH_SHORTS,
  formatEUR,
  formatCrmDateOnly,
  haversineDistanceKm,
} from "@/lib/ceo/constants";

type OppNode = Record<string, unknown>;
type TaskNode = Record<string, unknown>;

function oppStage(node: OppNode): string {
  return String(node.stage || "").toUpperCase();
}

function oppAmountEuros(node: OppNode): number {
  const amount = node.amount as { amountMicros?: number } | undefined;
  const rawMicros = amount?.amountMicros;
  return typeof rawMicros === "number" && rawMicros > 0 ? Math.round(rawMicros / 1_000_000) : 0;
}

export function computeCeoFinancialMetrics(filteredOpps: OppNode[]): FinancialMetrics {
  let wonRevenue = 0;
  let forecastPipeline = 0;
  let weightedForecast = 0;
  let lostRevenue = 0;
  let wonDealsCount = 0;
  let lostDealsCount = 0;
  let pipelineDealsCount = 0;

  filteredOpps.forEach((node) => {
    const stageNorm = oppStage(node);
    const amountVal = oppAmountEuros(node);

    if (stageNorm === CRM_STAGES.CONCLUIDO || stageNorm === CRM_STAGES.PAGAMENTO_TOTAL) {
      wonRevenue += amountVal;
      wonDealsCount += 1;
    } else if (stageNorm === "CANCELADO") {
      lostRevenue += amountVal;
      lostDealsCount += 1;
    } else {
      forecastPipeline += amountVal;
      pipelineDealsCount += 1;
      const weight = STAGE_WEIGHTS[stageNorm] ?? 0.35;
      weightedForecast += amountVal * weight;
    }
  });

  const totalClosedAmount = wonRevenue + lostRevenue;
  const financialWinRate =
    totalClosedAmount > 0
      ? Number(((wonRevenue / totalClosedAmount) * 100).toFixed(1))
      : wonDealsCount > 0
        ? 100
        : 0;

  const totalClosedDeals = wonDealsCount + lostDealsCount;
  const dealWinRate =
    totalClosedDeals > 0
      ? Number(((wonDealsCount / totalClosedDeals) * 100).toFixed(1))
      : wonDealsCount > 0
        ? 100
        : 0;

  const averageDealSize =
    wonDealsCount > 0 && wonRevenue > 0 ? Math.round(wonRevenue / wonDealsCount) : 0;

  return {
    wonRevenue,
    forecastPipeline,
    weightedForecast: Math.round(weightedForecast),
    lostRevenue,
    financialWinRate,
    dealWinRate,
    averageDealSize,
    wonDealsCount,
    lostDealsCount,
    pipelineDealsCount,
    formattedWonRevenue: formatEUR(wonRevenue),
    formattedForecastPipeline: formatEUR(forecastPipeline),
    formattedWeightedForecast: formatEUR(weightedForecast),
    formattedLostRevenue: formatEUR(lostRevenue),
    formattedAverageDealSize: formatEUR(averageDealSize),
  };
}

export function computeCeoMonthlyEvolution(filteredOpps: OppNode[]): MonthlyData[] {
  const monthlyEvolution: MonthlyData[] = Array.from({ length: 12 }, (_, i) => ({
    monthName: MONTH_NAMES[i],
    shortName: MONTH_SHORTS[i],
    monthIndex: i + 1,
    total: 0,
    completed: 0,
    revenue: 0,
    formattedRevenue: "0 €",
  }));

  filteredOpps.forEach((node) => {
    const createdAt = node.createdAt as string | undefined;
    if (!createdAt) return;
    const d = new Date(createdAt);
    const m = d.getMonth();
    if (m < 0 || m >= 12) return;

    monthlyEvolution[m].total += 1;
    const stageNorm = oppStage(node);
    const amountVal = oppAmountEuros(node);

    if (stageNorm === CRM_STAGES.CONCLUIDO || stageNorm === CRM_STAGES.PAGAMENTO_TOTAL) {
      monthlyEvolution[m].completed += 1;
      monthlyEvolution[m].revenue += amountVal;
    }
  });

  monthlyEvolution.forEach((month) => {
    month.formattedRevenue = formatEUR(month.revenue);
  });

  return monthlyEvolution;
}

export function computeCeoFleetKmStats(filteredOpps: OppNode[]): {
  totalFleetKm: number;
  technicians: TechnicianKmStat[];
} {
  const techDailyVisits: Record<string, Record<string, Array<{ coords: [number, number] | null; time: number }>>> = {};

  filteredOpps.forEach((opp) => {
    const morada = opp.moradaDeServico as { addressLat?: number; addressLng?: number } | undefined;
    const coords: [number, number] | null =
      morada?.addressLat && morada?.addressLng ? [morada.addressLat, morada.addressLng] : null;

    const taskTargets = opp.taskTargets as { edges?: Array<{ node?: { task?: TaskNode } }> } | undefined;
    if (!taskTargets?.edges?.length) return;

    taskTargets.edges.forEach((edge) => {
      const task = edge.node?.task;
      if (!task) return;
      const tech = canonicalTechnicianName(String(task.technicianName ?? ""));
      if (!tech) return;

      const dueAt = task.dueAt as string | undefined;
      const createdAt = opp.createdAt as string | undefined;
      const dateStr = dueAt ? dueAt.split("T")[0] : createdAt ? createdAt.split("T")[0] : null;
      if (!dateStr) return;

      if (!techDailyVisits[tech]) techDailyVisits[tech] = {};
      if (!techDailyVisits[tech][dateStr]) techDailyVisits[tech][dateStr] = [];

      techDailyVisits[tech][dateStr].push({
        coords,
        time: dueAt ? new Date(dueAt).getTime() : 0,
      });
    });
  });

  const technicianKmStats: TechnicianKmStat[] = [];
  let totalFleetKm = 0;

  for (const [tech, daysMap] of Object.entries(techDailyVisits)) {
    let techKm = 0;
    let servicesCount = 0;
    const days = Object.keys(daysMap);

    for (const visits of Object.values(daysMap)) {
      servicesCount += visits.length;
      visits.sort((a, b) => a.time - b.time);

      let prevCoords: [number, number] = HQ_COORDINATES;
      for (const visit of visits) {
        const visitCoords = visit.coords || [HQ_COORDINATES[0] + 0.12, HQ_COORDINATES[1] + 0.08];
        techKm += haversineDistanceKm(prevCoords, visitCoords) * 1.28;
        prevCoords = visitCoords;
      }
      techKm += haversineDistanceKm(prevCoords, HQ_COORDINATES) * 1.28;
    }

    const roundedKm = Math.round(techKm);
    totalFleetKm += roundedKm;
    technicianKmStats.push({
      name: tech,
      totalKm: roundedKm,
      servicesCount,
      daysOnRoad: days.length,
      avgKmPerService: servicesCount > 0 ? Number((roundedKm / servicesCount).toFixed(1)) : 0,
      avgKmPerDay: days.length > 0 ? Number((roundedKm / days.length).toFixed(1)) : 0,
    });
  }

  technicianKmStats.sort((a, b) => b.totalKm - a.totalKm);
  return { totalFleetKm, technicians: technicianKmStats };
}

export function computeCeoServicesList(filteredOpps: OppNode[]): CeoServiceItem[] {
  return filteredOpps.map((node) => {
    const createdAt = (node.createdAt as string | undefined) || new Date().toISOString();
    const createdD = new Date(createdAt);
    const yr = createdD.getFullYear();
    const mIdx = createdD.getMonth();
    const stageNorm = String(node.stage || "ENTRADA").toUpperCase();
    const stageInfo = STAGE_LABELS[stageNorm] || { label: String(node.stage || "Desconhecido"), color: "#94a3b8" };

    let technician: string | null = null;
    let assistantTechnicians: string[] = [];
    let teamSize = 1;
    const taskTargets = node.taskTargets as { edges?: Array<{ node?: { task?: TaskNode } }> } | undefined;
    if (taskTargets?.edges?.length) {
      for (const edge of taskTargets.edges) {
        const task = edge.node?.task;
        const tName = task?.technicianName;
        if (tName) {
          technician = canonicalTechnicianName(String(tName));
          const team = teamFieldsFromCeoServiceTask(
            task as Parameters<typeof teamFieldsFromCeoServiceTask>[0]
          );
          teamSize = team.teamSize;
          assistantTechnicians = team.assistantTechnicians;
          break;
        }
      }
    }

    const rawMicros = (node.amount as { amountMicros?: number } | undefined)?.amountMicros;
    const amountVal =
      typeof rawMicros === "number" && rawMicros > 0 ? Math.round(rawMicros / 1_000_000) : null;

    let financialStatus: "WON" | "LOST" | "PIPELINE" = "PIPELINE";
    if (stageNorm === CRM_STAGES.CONCLUIDO || stageNorm === CRM_STAGES.PAGAMENTO_TOTAL) {
      financialStatus = "WON";
    } else if (stageNorm === "CANCELADO") {
      financialStatus = "LOST";
    }

    return {
      id: String(node.id),
      name: String(node.name || "Serviço Sem Nome"),
      nsi: node.nsi != null ? String(node.nsi) : null,
      serviceNumber: formatServiceNumber(node.numeroDeServico as number | string | null | undefined) ?? null,
      stage: stageNorm,
      stageLabel: stageInfo.label,
      serviceType: stageInfo.label,
      createdAt,
      formattedDate: createdD.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }),
      year: yr,
      month: mIdx + 1,
      monthName: MONTH_NAMES[mIdx] || "",
      rating: parseCrmClientRating(node.avaliacaoDoCliente),
      technician,
      assistantTechnicians: assistantTechnicians.length > 0 ? assistantTechnicians : undefined,
      teamSize: teamSize > 1 ? teamSize : undefined,
      amount: amountVal,
      formattedAmount: amountVal !== null ? formatEUR(amountVal) : "Sob Orçamento",
      financialStatus,
    };
  });
}

export type CeoPipelineAndFeedbackResult = {
  pipelineFunnel: Array<{
    stage: string;
    label: string;
    count: number;
    percentage: number;
    color: string;
    totalAmount: number;
    formattedTotalAmount: string;
  }>;
  totalOpps: number;
  completedOpps: number;
  activeOpps: number;
  globalConversionRate: number;
  ratings: number[];
  recentFeedback: Array<{
    id: string;
    clientName: string;
    nsi?: string;
    rating: number;
    feedback?: string;
    date: string;
    sortAt: string;
  }>;
};

export function computeCeoPipelineAndFeedback(filteredOpps: OppNode[]): CeoPipelineAndFeedbackResult {
  const stageCounts: Record<string, number> = {};
  const stageAmounts: Record<string, number> = {};
  for (const stageKey of Object.keys(STAGE_LABELS)) {
    stageCounts[stageKey] = 0;
    stageAmounts[stageKey] = 0;
  }

  const ratings: number[] = [];
  const recentFeedback: CeoPipelineAndFeedbackResult["recentFeedback"] = [];

  filteredOpps.forEach((node) => {
    const stage = oppStage(node);
    const amountVal = oppAmountEuros(node);

    if (stageCounts[stage] !== undefined) {
      stageCounts[stage] += 1;
      stageAmounts[stage] += amountVal;
    }

    const clientRating = parseCrmClientRating(node.avaliacaoDoCliente);
    const clientFeedback =
      typeof node.feedbackDoCliente === "string" ? node.feedbackDoCliente.trim() : "";

    if (clientRating !== null) ratings.push(clientRating);

    if (clientRating !== null || clientFeedback) {
      const updatedAt = node.updatedAt as string | undefined;
      const createdAt = node.createdAt as string | undefined;
      const sortAt = updatedAt || createdAt || "";
      recentFeedback.push({
        id: String(node.id),
        clientName: String(node.name || "Cliente"),
        nsi: node.nsi != null ? String(node.nsi) : undefined,
        rating: clientRating ?? 0,
        feedback: clientFeedback || undefined,
        date: sortAt ? new Date(sortAt).toLocaleDateString("pt-PT") : "Recent",
        sortAt,
      });
    }
  });

  const totalOpps = filteredOpps.length;
  const completedOpps =
    (stageCounts[CRM_STAGES.CONCLUIDO] || 0) + (stageCounts[CRM_STAGES.PAGAMENTO_TOTAL] || 0);
  const activeOpps = totalOpps - completedOpps - (stageCounts.CANCELADO || 0);
  const globalConversionRate =
    totalOpps > 0 ? Number(((completedOpps / totalOpps) * 100).toFixed(1)) : 0;

  const pipelineFunnel = Object.entries(STAGE_LABELS).map(([stage, info]) => {
    const count = stageCounts[stage] || 0;
    const amount = stageAmounts[stage] || 0;
    const percentage = totalOpps > 0 ? Number(((count / totalOpps) * 100).toFixed(1)) : 0;
    return {
      stage,
      label: info.label,
      count,
      percentage,
      color: info.color,
      totalAmount: amount,
      formattedTotalAmount: formatEUR(amount),
    };
  });

  return {
    pipelineFunnel,
    totalOpps,
    completedOpps,
    activeOpps,
    globalConversionRate,
    ratings,
    recentFeedback,
  };
}

export type CeoFieldEfficiencyResult = {
  fieldEfficiency: {
    totalTasks: number;
    completedTasks: number;
    incompleteTasks: number;
    cancelledTasks: number;
    scheduledTasks: number;
    inProgressTasks: number;
  };
  firstTimeSuccessRate: number;
  technicianRankings: TechnicianRanking[];
  topTechnicians: Array<{ name: string; completedCount: number; successRate: number }>;
};

export function computeCeoFieldEfficiencyAndRankings(
  filteredTasks: TaskNode[],
  technicianKmStats: TechnicianKmStat[]
): CeoFieldEfficiencyResult {
  let completedTasks = 0;
  let incompleteTasks = 0;
  let cancelledTasks = 0;
  let scheduledTasks = 0;
  let inProgressTasks = 0;

  const techStatsMap: Record<
    string,
    { completed: number; incomplete: number; cancelled: number; scheduled: number; inProgress: number; total: number }
  > = {};

  const teamSupportByName: Record<string, number> = {};

  filteredTasks.forEach((task) => {
    const status = String(task.status || "").toUpperCase();
    const techName = canonicalTechnicianName(String(task.technicianName ?? ""));

    creditTeamSupportVisits(task as Parameters<typeof creditTeamSupportVisits>[0], teamSupportByName);

    if (techName) {
      if (!techStatsMap[techName]) {
        techStatsMap[techName] = {
          completed: 0,
          incomplete: 0,
          cancelled: 0,
          scheduled: 0,
          inProgress: 0,
          total: 0,
        };
      }
    }

    if (status === CRM_TASK_STATUS.CONCLUIDO || status === "CONCLUÍDO" || status === "DONE") {
      completedTasks += 1;
      if (techName) techStatsMap[techName].completed += 1;
    } else if (status === CRM_TASK_STATUS.INCOMPLETO) {
      incompleteTasks += 1;
      if (techName) techStatsMap[techName].incomplete += 1;
    } else if (status === CRM_TASK_STATUS.CANCELADO) {
      cancelledTasks += 1;
      if (techName) techStatsMap[techName].cancelled += 1;
    } else if (status === CRM_TASK_STATUS.EM_CURSO) {
      inProgressTasks += 1;
      if (techName) techStatsMap[techName].inProgress += 1;
    } else {
      scheduledTasks += 1;
      if (techName) techStatsMap[techName].scheduled += 1;
    }
    if (techName) techStatsMap[techName].total += 1;
  });

  const totalInterventions = completedTasks + incompleteTasks;
  const firstTimeSuccessRate =
    totalInterventions > 0 ? Number(((completedTasks / totalInterventions) * 100).toFixed(1)) : 0;

  const techKmByName: Record<string, number> = {};
  technicianKmStats.forEach((t) => {
    techKmByName[t.name] = t.totalKm;
  });

  const technicianRankings: TechnicianRanking[] = applyTeamSupportVisitsToRankings(
    Object.entries(techStatsMap)
      .map(([name, stats]) => {
        const finishedVolume = stats.completed + stats.incomplete + stats.cancelled;
        const successRate =
          finishedVolume > 0
            ? Number(((stats.completed / finishedVolume) * 100).toFixed(1))
            : stats.completed > 0
              ? 100
              : 0;

        return {
          rank: 1,
          name,
          totalTasks: stats.total,
          completedCount: stats.completed,
          incompleteCount: stats.incomplete,
          cancelledCount: stats.cancelled,
          scheduledCount: stats.scheduled,
          inProgressCount: stats.inProgress,
          successRate,
          totalKm: techKmByName[name] || 0,
        };
      })
      .sort((a, b) => {
        if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;
        return b.successRate - a.successRate;
      })
      .map((t, idx) => ({ ...t, rank: idx + 1 })),
    teamSupportByName
  );

  const topTechnicians = technicianRankings
    .map((t) => ({
      name: t.name,
      completedCount: t.completedCount,
      successRate: Math.round(t.successRate),
    }))
    .slice(0, 5);

  return {
    fieldEfficiency: {
      totalTasks: filteredTasks.length,
      completedTasks,
      incompleteTasks,
      cancelledTasks,
      scheduledTasks,
      inProgressTasks,
    },
    firstTimeSuccessRate,
    technicianRankings,
    topTechnicians,
  };
}

export function computeCeoUpcomingFollowUps(filteredOpps: OppNode[]): ClientFollowUp[] {
  const upcomingFollowUps: ClientFollowUp[] = [];
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  filteredOpps.forEach((opp) => {
    if (!opp.dataDeFollowUp) return;
    const fDate = new Date(String(opp.dataDeFollowUp));
    if (isNaN(fDate.getTime())) return;

    const fMidnight = new Date(fDate.getFullYear(), fDate.getMonth(), fDate.getDate()).getTime();
    const diffDays = Math.round((fMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

    let urgencyStatus: "OVERDUE" | "TODAY" | "TOMORROW" | "UPCOMING" = "UPCOMING";
    if (diffDays < 0) urgencyStatus = "OVERDUE";
    else if (diffDays === 0) urgencyStatus = "TODAY";
    else if (diffDays === 1) urgencyStatus = "TOMORROW";

    const stageNorm = String(opp.stage || "ENTRADA").toUpperCase();
    const stageInfo = STAGE_LABELS[stageNorm] || { label: String(opp.stage || "Desconhecido"), color: "#94a3b8" };

    const rawMicros = (opp.amount as { amountMicros?: number } | undefined)?.amountMicros;
    const amountVal =
      typeof rawMicros === "number" && rawMicros > 0 ? Math.round(rawMicros / 1_000_000) : null;

    const pointOfContact = opp.pointOfContact as
      | {
          name?: { firstName?: string; lastName?: string };
          phones?: { primaryPhoneNumber?: string };
        }
      | undefined;

    const contactPerson = pointOfContact?.name
      ? `${pointOfContact.name.firstName || ""} ${pointOfContact.name.lastName || ""}`.trim()
      : null;
    const contactPhone = pointOfContact?.phones?.primaryPhoneNumber || null;

    upcomingFollowUps.push({
      id: String(opp.id),
      clientName: String(opp.name || "Cliente Sem Nome"),
      nsi: opp.nsi != null ? String(opp.nsi) : null,
      serviceNumber: formatServiceNumber(opp.numeroDeServico as number | string | null | undefined) ?? null,
      stage: stageNorm,
      stageLabel: stageInfo.label,
      followUpDate: String(opp.dataDeFollowUp),
      formattedFollowUpDate: fDate.toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      reminderDate: (opp.dataDeLembrete as string | null) ?? null,
      formattedReminderDate: formatCrmDateOnly(opp.dataDeLembrete),
      daysRemaining: diffDays,
      urgencyStatus,
      contactPhone,
      contactPerson,
      amount: amountVal,
      formattedAmount: amountVal !== null ? formatEUR(amountVal) : "Sob Orçamento",
    });
  });

  upcomingFollowUps.sort((a, b) => a.daysRemaining - b.daysRemaining);
  return upcomingFollowUps;
}

export function computeCeoWarehouseStats(
  dbWarehouseStats: { preparedItems: number; totalItems: number; pendingItems: number; preparationRate: number } | null,
  itemNodes: OppNode[]
): { totalItems: number; preparedItems: number; pendingItems: number; preparationRate: number } {
  if (dbWarehouseStats) {
    return {
      totalItems: dbWarehouseStats.totalItems,
      preparedItems: dbWarehouseStats.preparedItems,
      pendingItems: dbWarehouseStats.pendingItems,
      preparationRate: dbWarehouseStats.preparationRate,
    };
  }

  let preparedItems = 0;
  itemNodes.forEach((item) => {
    if (item.preparado === true || item.estadoDoArmazem === "PREPARADO") preparedItems += 1;
  });
  const totalItems = itemNodes.length;
  const pendingItems = totalItems - preparedItems;
  const preparationRate = totalItems > 0 ? Number(((preparedItems / totalItems) * 100).toFixed(1)) : 0;
  return { totalItems, preparedItems, pendingItems, preparationRate };
}
