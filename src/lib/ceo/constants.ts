import { CRM_STAGES } from "@/lib/crm/contract";
import type { CeoMetrics } from "@/lib/schemas/ceoMetrics";

export const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  [CRM_STAGES.ENTRADA]: { label: "Entrada / Pedido", color: "#64748b" },
  [CRM_STAGES.TIRAR_MEDIDAS]: { label: "Visita de Medição", color: "#3b82f6" },
  REMEDICAO: { label: "Medidas Retificadas", color: "#a855f7" },
  [CRM_STAGES.ORCAMENTAR]: { label: "Orçamentação", color: "#6366f1" },
  [CRM_STAGES.PROPOSTA]: { label: "Proposta Enviada", color: "#8b5cf6" },
  [CRM_STAGES.MANUTENCAO]: { label: "Manutenção", color: "#64748b" },
  [CRM_STAGES.REPARACAO]: { label: "Reparação", color: "#f97316" },
  [CRM_STAGES.PAGAMENTO_30]: { label: "Adjudicado (Sinal 30%)", color: "#ec4899" },
  [CRM_STAGES.ENCOMENDA]: { label: "Encomenda Fornecedor", color: "#f97316" },
  [CRM_STAGES.PREPARACAO]: { label: "Preparação Armazém", color: "#eab308" },
  [CRM_STAGES.MARCAR_INSTALACAO]: { label: "Aguardar Montagem", color: "#14b8a6" },
  [CRM_STAGES.AGENDAR_INSTALACAO]: { label: "Agendar Instalação", color: "#0d9488" },
  [CRM_STAGES.INSTALACAO]: { label: "Em Montagem", color: "#06b6d4" },
  [CRM_STAGES.PAGAMENTO_TOTAL]: { label: "Cobrança Final", color: "#f59e0b" },
  [CRM_STAGES.CONCLUIDO]: { label: "Obra Concluída", color: "#84cc16" },
  CANCELADO: { label: "Cancelado / Perdido", color: "#ef4444" },
};

export const STAGE_WEIGHTS: Record<string, number> = {
  [CRM_STAGES.ENTRADA]: 0.15,
  [CRM_STAGES.TIRAR_MEDIDAS]: 0.25,
  REMEDICAO: 0.30,
  [CRM_STAGES.ORCAMENTAR]: 0.40,
  [CRM_STAGES.PROPOSTA]: 0.50,
  [CRM_STAGES.MANUTENCAO]: 0.75,
  [CRM_STAGES.REPARACAO]: 0.75,
  [CRM_STAGES.PAGAMENTO_30]: 0.85,
  [CRM_STAGES.ENCOMENDA]: 0.90,
  [CRM_STAGES.PREPARACAO]: 0.95,
  [CRM_STAGES.MARCAR_INSTALACAO]: 0.98,
  [CRM_STAGES.AGENDAR_INSTALACAO]: 0.98,
  [CRM_STAGES.INSTALACAO]: 0.98,
  [CRM_STAGES.PAGAMENTO_TOTAL]: 1.00,
  [CRM_STAGES.CONCLUIDO]: 1.00,
  CANCELADO: 0.00,
};

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const MONTH_SHORTS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function haversineDistanceKm(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371;
  const dLat = (coord2[0] - coord1[0]) * (Math.PI / 180);
  const dLon = (coord2[1] - coord1[1]) * (Math.PI / 180);
  const lat1 = coord1[0] * (Math.PI / 180);
  const lat2 = coord2[0] * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const formatEUR = (val: number): string => {
  return `${Math.round(val).toLocaleString("pt-PT")} €`;
};

export function formatCrmDateOnly(value: unknown): string | null {
  if (value == null || value === "") return null;
  const day = String(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function createEmptyCeoMetricsFallback(selectedYear?: number | null): CeoMetrics {
  const fallbackYear = selectedYear ?? new Date().getFullYear();
  return {
    availableYears: [fallbackYear],
    selectedYear: fallbackYear,
    financial: {
      wonRevenue: 0,
      forecastPipeline: 0,
      weightedForecast: 0,
      lostRevenue: 0,
      financialWinRate: 0,
      dealWinRate: 0,
      averageDealSize: 0,
      wonDealsCount: 0,
      lostDealsCount: 0,
      pipelineDealsCount: 0,
      formattedWonRevenue: "0 €",
      formattedForecastPipeline: "0 €",
      formattedWeightedForecast: "0 €",
      formattedLostRevenue: "0 €",
      formattedAverageDealSize: "0 €",
    },
    overview: {
      totalActiveOpportunities: 0,
      completedOpportunities: 0,
      globalConversionRate: 0,
      averageRating: 0,
      totalRatingsCount: 0,
      firstTimeSuccessRate: 0,
    },
    monthlyEvolution: Array.from({ length: 12 }, (_, i) => ({
      monthName: MONTH_NAMES[i],
      shortName: MONTH_SHORTS[i],
      monthIndex: i + 1,
      total: 0,
      completed: 0,
      revenue: 0,
      formattedRevenue: "0 €",
    })),
    fleetKmStats: {
      totalFleetKm: 0,
      technicians: [],
    },
    pipelineFunnel: [],
    fieldEfficiency: {
      totalTasks: 0,
      completedTasks: 0,
      incompleteTasks: 0,
      cancelledTasks: 0,
      scheduledTasks: 0,
      inProgressTasks: 0,
    },
    warehouseStats: {
      totalItems: 0,
      preparedItems: 0,
      pendingItems: 0,
      preparationRate: 0,
    },
    recentFeedback: [],
    topTechnicians: [],
    technicianRankings: [],
    onSiteDuration: { sampleCount: 0, avgMinutes: 0, formattedAvg: "—" },
    fairServiceTypeDurations: [],
    technicianOnSiteDurations: [],
    upcomingFollowUps: [],
    servicesList: [],
  };
}