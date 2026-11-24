import "server-only";

import {
  cacheGet,
  cacheInvalidatePrefix,
  cacheSet,
  ceoMetricsYearCacheKey,
} from "@/lib/crmCache";
import { CeoMetrics, CeoMetricsSchema } from "@/lib/schemas/ceoMetrics";
import { createEmptyCeoMetricsFallback } from "@/lib/ceo/constants";
import {
  computeCeoFinancialMetrics,
  computeCeoMonthlyEvolution,
  computeCeoFleetKmStats,
  computeCeoServicesList,
  computeCeoPipelineAndFeedback,
  computeCeoFieldEfficiencyAndRankings,
  computeCeoUpcomingFollowUps,
  computeCeoWarehouseStats,
  computeCeoOnSiteDuration,
} from "@/lib/ceo/aggregators";
import {
  fetchCeoYearSample,
  fetchCeoOpportunityNodes,
  fetchCeoTaskNodes,
  fetchCeoWarehouseItemsFromCrm,
} from "@/lib/ceo/queries";

const CEO_METRICS_CACHE_TTL_SEC = 300;

/** Todas as oportunidades recentes — usado nos benchmarks de tempo no local (sem filtrar por ano). */
export async function fetchOpportunityNodesForOnSiteBenchmarks() {
  return fetchCeoOpportunityNodes(null);
}

export async function fetchCeoMetricsFromCRM(
  selectedYear?: number | null,
  options?: { fresh?: boolean }
): Promise<CeoMetrics> {
  const fresh = options?.fresh === true;
  const availableYears = await fetchCeoYearSample();
  const activeYear = selectedYear === undefined ? availableYears[0] : selectedYear;
  const cacheKey = ceoMetricsYearCacheKey(activeYear ?? "all");
  if (fresh) {
    await cacheInvalidatePrefix("crm:ceo:");
  } else {
    const cached = await cacheGet<CeoMetrics>(cacheKey);
    if (cached) return cached;
  }

  try {
    const [oppsRes, tasksRes, warehouseRes] = await Promise.allSettled([
      fetchCeoOpportunityNodes(activeYear),
      fetchCeoTaskNodes(activeYear),
      fetchCeoWarehouseItemsFromCrm(),
    ]);

    if (oppsRes.status === "rejected") {
      throw new Error(
        oppsRes.reason instanceof Error
          ? oppsRes.reason.message
          : "Não foi possível carregar oportunidades do CRM para o painel CEO."
      );
    }
    if (tasksRes.status === "rejected") {
      throw new Error(
        tasksRes.reason instanceof Error
          ? tasksRes.reason.message
          : "Não foi possível carregar tarefas do CRM para o painel CEO."
      );
    }
    if (warehouseRes.status === "rejected") {
      throw new Error(
        warehouseRes.reason instanceof Error
          ? warehouseRes.reason.message
          : "Não foi possível carregar itens de armazém para o painel CEO."
      );
    }

    const filteredOpps = oppsRes.value;
    const allTaskNodes = tasksRes.value;
    const { dbWarehouseStats, itemNodes } = warehouseRes.value;

    const financial = computeCeoFinancialMetrics(filteredOpps);
    const monthlyEvolution = computeCeoMonthlyEvolution(filteredOpps);
    const fleetKmStats = computeCeoFleetKmStats(filteredOpps);
    const servicesList = computeCeoServicesList(filteredOpps);
    const pipeline = computeCeoPipelineAndFeedback(filteredOpps);
    const field = computeCeoFieldEfficiencyAndRankings(allTaskNodes, fleetKmStats.technicians);
    const upcomingFollowUps = computeCeoUpcomingFollowUps(filteredOpps);
    const warehouseStats = computeCeoWarehouseStats(dbWarehouseStats, itemNodes);
    const onSite = computeCeoOnSiteDuration(filteredOpps);

    const averageRating =
      pipeline.ratings.length > 0
        ? Number((pipeline.ratings.reduce((a, b) => a + b, 0) / pipeline.ratings.length).toFixed(1))
        : 0;

    const rawResult: CeoMetrics = {
      availableYears,
      selectedYear: activeYear,
      financial,
      overview: {
        totalActiveOpportunities: pipeline.activeOpps,
        completedOpportunities: pipeline.completedOpps,
        globalConversionRate: pipeline.globalConversionRate,
        averageRating,
        totalRatingsCount: pipeline.ratings.length,
        firstTimeSuccessRate: field.firstTimeSuccessRate,
      },
      monthlyEvolution,
      fleetKmStats,
      pipelineFunnel: pipeline.pipelineFunnel,
      fieldEfficiency: field.fieldEfficiency,
      warehouseStats,
      recentFeedback: [...pipeline.recentFeedback]
        .sort((a, b) => b.sortAt.localeCompare(a.sortAt))
        .slice(0, 6)
        .map(({ sortAt: _sortAt, ...rest }) => rest),
      topTechnicians: field.topTechnicians,
      technicianRankings: field.technicianRankings,
      onSiteDuration: onSite.onSiteDuration,
      fairServiceTypeDurations: onSite.fairServiceTypeDurations,
      technicianOnSiteDurations: onSite.technicianOnSiteDurations,
      upcomingFollowUps,
      servicesList,
    };

    const parsed = CeoMetricsSchema.parse(rawResult);
    await cacheSet(cacheKey, parsed, CEO_METRICS_CACHE_TTL_SEC);
    return parsed;
  } catch (error) {
    console.error("❌ Erro ao compilar métricas do CEO no Twenty CRM:", error);
    if (fresh) {
      throw error instanceof Error
        ? error
        : new Error("Não foi possível atualizar as métricas do CRM.");
    }
    return createEmptyCeoMetricsFallback(selectedYear ?? undefined);
  }
}