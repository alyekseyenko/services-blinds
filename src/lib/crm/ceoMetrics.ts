import { crmFetch } from "./client";
import { CRM_STAGES, CRM_TASK_STATUS, parseCrmClientRating, CRM_ADDRESS_GRAPHQL_FIELDS } from "./contract";
import { recentYears, yearToUtcRange } from "./dateFilters";
import { HQ_COORDINATES } from "@/lib/hq";
import { 
  CeoMetrics, 
  CeoMetricsSchema, 
  CeoServiceItem, 
  MonthlyData, 
  TechnicianKmStat, 
  FinancialMetrics,
  ClientFollowUp,
  TechnicianRanking
} from "@/lib/schemas/ceoMetrics";

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  [CRM_STAGES.ENTRADA]: { label: "Entrada / Pedido", color: "#64748b" },
  [CRM_STAGES.TIRAR_MEDIDAS]: { label: "Visita de Medição", color: "#3b82f6" },
  REMEDICAO: { label: "Remedição", color: "#a855f7" },
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

// Pesos percentuais de probabilidade de fecho para cada fase do funil
const STAGE_WEIGHTS: Record<string, number> = {
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

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const MONTH_SHORTS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

function haversineDistanceKm(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371; // Raio da Terra em km
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

const formatEUR = (val: number): string => {
  return `${Math.round(val).toLocaleString("pt-PT")} €`;
};

const CEO_OPP_NODE_FIELDS = `
  id
  name
  nsi
  stage
  avaliacaoDoCliente
  feedbackDoCliente
  dataDeFollowUp
  pointOfContact {
    id
    name {
      firstName
      lastName
    }
    phones {
      primaryPhoneNumber
    }
  }
  createdAt
  amount {
    amountMicros
    currencyCode
  }
  moradaDeServico {
    ${CRM_ADDRESS_GRAPHQL_FIELDS}
  }
  taskTargets {
    edges {
      node {
        task {
          id
          status
          technicianName
          dueAt
        }
      }
    }
  }
`;

const CEO_FETCH_LIMIT_ALL = 1000;
const CEO_FETCH_LIMIT_YEAR = 500;

async function fetchCeoYearSample(): Promise<number[]> {
  const query = `
    query getCeoYearSample {
      opportunities(orderBy: { createdAt: DescNullsLast }, first: 200) {
        edges {
          node {
            createdAt
          }
        }
      }
    }
  `;

  try {
    const data = await crmFetch<{ opportunities: { edges: Array<{ node: { createdAt?: string } }> } }>(query);
    const yearsSet = new Set(recentYears(8));
    data.opportunities?.edges?.forEach(({ node }) => {
      if (!node.createdAt) return;
      const yr = new Date(node.createdAt).getFullYear();
      if (!Number.isNaN(yr)) yearsSet.add(yr);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  } catch {
    return recentYears(8);
  }
}

async function fetchCeoOpportunityNodes(activeYear: number | null): Promise<any[]> {
  if (activeYear === null) {
    const query = `
      query getCeoOpportunitiesAll($first: Int!) {
        opportunities(orderBy: { createdAt: DescNullsLast }, first: $first) {
          edges {
            node {
              ${CEO_OPP_NODE_FIELDS}
            }
          }
        }
      }
    `;
    const data = await crmFetch<{ opportunities: { edges: Array<{ node: any }> } }>(query, {
      first: CEO_FETCH_LIMIT_ALL,
    });
    return data.opportunities?.edges?.map((edge) => edge.node) || [];
  }

  const { gte, lte } = yearToUtcRange(activeYear);
  const query = `
    query getCeoOpportunitiesByYear($gte: DateTime!, $lte: DateTime!, $first: Int!) {
      opportunities(
        orderBy: { createdAt: DescNullsLast }
        first: $first
        filter: { and: [{ createdAt: { gte: $gte } }, { createdAt: { lte: $lte } }] }
      ) {
        edges {
          node {
            ${CEO_OPP_NODE_FIELDS}
          }
        }
      }
    }
  `;
  const data = await crmFetch<{ opportunities: { edges: Array<{ node: any }> } }>(query, {
    gte,
    lte,
    first: CEO_FETCH_LIMIT_YEAR,
  });
  return data.opportunities?.edges?.map((edge) => edge.node) || [];
}

async function fetchCeoTaskNodes(activeYear: number | null): Promise<any[]> {
  if (activeYear === null) {
    const query = `
      query getCeoTasksAll($first: Int!) {
        tasks(orderBy: { createdAt: DescNullsLast }, first: $first) {
          edges {
            node {
              id
              status
              technicianName
              createdAt
              dueAt
            }
          }
        }
      }
    `;
    const data = await crmFetch<{ tasks: { edges: Array<{ node: any }> } }>(query, {
      first: CEO_FETCH_LIMIT_ALL,
    });
    return data.tasks?.edges?.map((edge) => edge.node) || [];
  }

  const { gte, lte } = yearToUtcRange(activeYear);
  const query = `
    query getCeoTasksByYear($gte: DateTime!, $lte: DateTime!, $first: Int!) {
      tasks(
        orderBy: { createdAt: DescNullsLast }
        first: $first
        filter: { and: [{ createdAt: { gte: $gte } }, { createdAt: { lte: $lte } }] }
      ) {
        edges {
          node {
            id
            status
            technicianName
            createdAt
            dueAt
          }
        }
      }
    }
  `;
  const data = await crmFetch<{ tasks: { edges: Array<{ node: any }> } }>(query, {
    gte,
    lte,
    first: CEO_FETCH_LIMIT_YEAR,
  });
  return data.tasks?.edges?.map((edge) => edge.node) || [];
}

export async function fetchCeoMetricsFromCRM(selectedYear?: number | null): Promise<CeoMetrics> {
  try {
    const availableYears = await fetchCeoYearSample();
    const activeYear = selectedYear === undefined ? availableYears[0] : selectedYear;

    const itemsQuery = `
      query getCeoItems {
        produtos(first: 1000) {
          edges {
            node {
              id
              preparado
              estadoDoArmazem
            }
          }
        }
      }
    `;

    const [oppsRes, tasksRes, itemsRes] = await Promise.allSettled([
      fetchCeoOpportunityNodes(activeYear),
      fetchCeoTaskNodes(activeYear),
      crmFetch<{ produtos: { edges: Array<{ node: any }> } }>(itemsQuery),
    ]);

    const filteredOpps = oppsRes.status === "fulfilled" ? oppsRes.value : [];
    const allTaskNodes = tasksRes.status === "fulfilled" ? tasksRes.value : [];
    const itemNodes = itemsRes.status === "fulfilled" ? itemsRes.value.produtos?.edges?.map(e => e.node) || [] : [];

    // --- CÁLCULOS FINANCEIROS (RECEITA GANHA, FORECAST, VALOR PERDIDO, WIN RATE) ---
    let wonRevenue = 0;
    let forecastPipeline = 0;
    let weightedForecast = 0;
    let lostRevenue = 0;
    let wonDealsCount = 0;
    let lostDealsCount = 0;
    let pipelineDealsCount = 0;

    filteredOpps.forEach((node) => {
      const stageNorm = (node.stage || "").toUpperCase();
      const rawMicros = node.amount?.amountMicros;
      const amountVal = (typeof rawMicros === 'number' && rawMicros > 0)
        ? Math.round(rawMicros / 1_000_000)
        : 0;

      if (stageNorm === CRM_STAGES.CONCLUIDO || stageNorm === CRM_STAGES.PAGAMENTO_TOTAL) {
        wonRevenue += amountVal;
        wonDealsCount += 1;
      } else if (stageNorm === "CANCELADO") {
        lostRevenue += amountVal;
        lostDealsCount += 1;
      } else {
        // Em Pipeline Aberto
        forecastPipeline += amountVal;
        pipelineDealsCount += 1;
        const weight = STAGE_WEIGHTS[stageNorm] ?? 0.35;
        weightedForecast += amountVal * weight;
      }
    });

    const totalClosedAmount = wonRevenue + lostRevenue;
    const financialWinRate = totalClosedAmount > 0 
      ? Number(((wonRevenue / totalClosedAmount) * 100).toFixed(1))
      : (wonDealsCount > 0 ? 100 : 0);

    const totalClosedDeals = wonDealsCount + lostDealsCount;
    const dealWinRate = totalClosedDeals > 0
      ? Number(((wonDealsCount / totalClosedDeals) * 100).toFixed(1))
      : (wonDealsCount > 0 ? 100 : 0);

    const averageDealSize = wonDealsCount > 0 && wonRevenue > 0
      ? Math.round(wonRevenue / wonDealsCount)
      : 0;

    const financial: FinancialMetrics = {
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

    // --- EVOLUÇÃO MENSAL (12 Meses) COM RECEITA ---
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
      if (node.createdAt) {
        const d = new Date(node.createdAt);
        const m = d.getMonth(); // 0 to 11
        if (m >= 0 && m < 12) {
          monthlyEvolution[m].total += 1;
          const stageNorm = (node.stage || "").toUpperCase();
          const rawMicros = node.amount?.amountMicros;
          const amountVal = (typeof rawMicros === 'number' && rawMicros > 0)
            ? Math.round(rawMicros / 1_000_000)
            : 0;

          if (stageNorm === CRM_STAGES.CONCLUIDO || stageNorm === CRM_STAGES.PAGAMENTO_TOTAL) {
            monthlyEvolution[m].completed += 1;
            monthlyEvolution[m].revenue += amountVal;
          }
        }
      }
    });

    monthlyEvolution.forEach((m) => {
      m.formattedRevenue = formatEUR(m.revenue);
    });

    // --- CÁLCULO ESTIMADO DE QUILÓMETROS POR TÉCNICO (ROTEIRO A PARTIR DA SEDE) ---
    const techDailyVisits: Record<string, Record<string, Array<{ coords: [number, number] | null; time: number }>>> = {};

    filteredOpps.forEach((opp) => {
      const coords: [number, number] | null = (opp.moradaDeServico?.addressLat && opp.moradaDeServico?.addressLng)
        ? [opp.moradaDeServico.addressLat, opp.moradaDeServico.addressLng]
        : null;

      if (opp.taskTargets?.edges?.length > 0) {
        opp.taskTargets.edges.forEach((edge: any) => {
          const task = edge.node?.task;
          const tech = task.technicianName?.trim();
          if (!tech) return;
          const dateStr = task.dueAt ? task.dueAt.split('T')[0] : (opp.createdAt ? opp.createdAt.split('T')[0] : null);
          if (!dateStr) return;

          if (!techDailyVisits[tech]) techDailyVisits[tech] = {};
          if (!techDailyVisits[tech][dateStr]) techDailyVisits[tech][dateStr] = [];

          techDailyVisits[tech][dateStr].push({
            coords,
            time: task.dueAt ? new Date(task.dueAt).getTime() : 0,
          });
        });
      }
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
          const dist = haversineDistanceKm(prevCoords, visitCoords) * 1.28;
          techKm += dist;
          prevCoords = visitCoords;
        }
        const returnDist = haversineDistanceKm(prevCoords, HQ_COORDINATES) * 1.28;
        techKm += returnDist;
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

    // --- LISTA DETALHADA DE SERVIÇOS DO ANO COM VALOR E ESTADO FINANCEIRO ---
    const servicesList: CeoServiceItem[] = filteredOpps.map((node) => {
      const createdD = node.createdAt ? new Date(node.createdAt) : new Date();
      const yr = createdD.getFullYear();
      const mIdx = createdD.getMonth();
      const stageNorm = (node.stage || "ENTRADA").toUpperCase();
      const stageInfo = STAGE_LABELS[stageNorm] || { label: node.stage || "Desconhecido", color: "#94a3b8" };

      let technician: string | null = null;
      if (node.taskTargets?.edges?.length > 0) {
        for (const edge of node.taskTargets.edges) {
          const tName = edge.node?.task?.technicianName;
          if (tName) {
            technician = tName;
            break;
          }
        }
      }

      const serviceTypeStr = stageInfo.label;

      const rawMicros = node.amount?.amountMicros;
      const amountVal = (typeof rawMicros === 'number' && rawMicros > 0)
        ? Math.round(rawMicros / 1_000_000)
        : null;

      let financialStatus: "WON" | "LOST" | "PIPELINE" = "PIPELINE";
      if (stageNorm === CRM_STAGES.CONCLUIDO || stageNorm === CRM_STAGES.PAGAMENTO_TOTAL) {
        financialStatus = "WON";
      } else if (stageNorm === "CANCELADO") {
        financialStatus = "LOST";
      }

      return {
        id: node.id,
        name: node.name || "Serviço Sem Nome",
        nsi: node.nsi != null ? String(node.nsi) : null,
        stage: stageNorm,
        stageLabel: stageInfo.label,
        serviceType: serviceTypeStr,
        createdAt: node.createdAt || new Date().toISOString(),
        formattedDate: createdD.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }),
        year: yr,
        month: mIdx + 1,
        monthName: MONTH_NAMES[mIdx] || "",
        rating: parseCrmClientRating(node.avaliacaoDoCliente),
        technician: technician,
        amount: amountVal,
        formattedAmount: amountVal !== null ? formatEUR(amountVal) : "Sob Orçamento",
        financialStatus,
      };
    });

    // --- PIPELINE FUNNEL COM VALOR ACUMULADO POR ETAPA ---
    const stageCounts: Record<string, number> = {};
    const stageAmounts: Record<string, number> = {};
    for (const stageKey of Object.keys(STAGE_LABELS)) {
      stageCounts[stageKey] = 0;
      stageAmounts[stageKey] = 0;
    }

    const ratings: number[] = [];
    const recentFeedback: Array<{ id: string; clientName: string; nsi?: string; rating: number; feedback?: string; date: string }> = [];

    filteredOpps.forEach((node) => {
      const stage = (node.stage || "").toUpperCase();
      const rawMicros = node.amount?.amountMicros;
      const amountVal = (typeof rawMicros === 'number' && rawMicros > 0)
        ? Math.round(rawMicros / 1_000_000)
        : 0;

      if (stageCounts[stage] !== undefined) {
        stageCounts[stage] += 1;
        stageAmounts[stage] += amountVal;
      }

      const clientRating = parseCrmClientRating(node.avaliacaoDoCliente);
      const clientFeedback = typeof node.feedbackDoCliente === "string"
        ? node.feedbackDoCliente.trim()
        : "";

      if (clientRating !== null) {
        ratings.push(clientRating);
      }

      if (clientRating !== null || clientFeedback) {
        recentFeedback.push({
          id: node.id,
          clientName: node.name || "Cliente",
          nsi: node.nsi != null ? String(node.nsi) : undefined,
          rating: clientRating ?? 0,
          feedback: clientFeedback || undefined,
          date: node.updatedAt
            ? new Date(node.updatedAt).toLocaleDateString("pt-PT")
            : node.createdAt
              ? new Date(node.createdAt).toLocaleDateString("pt-PT")
              : "Recent",
        });
      }
    });

    const totalOpps = filteredOpps.length;
    const completedOpps = (stageCounts[CRM_STAGES.CONCLUIDO] || 0) + (stageCounts[CRM_STAGES.PAGAMENTO_TOTAL] || 0);
    const activeOpps = totalOpps - completedOpps - (stageCounts["CANCELADO"] || 0);
    const globalConversionRate = totalOpps > 0 ? Number(((completedOpps / totalOpps) * 100).toFixed(1)) : 0;

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

    // --- FIELD EFFICIENCY (Tarefas do ano — já filtradas no CRM quando há ano ativo) ---
    const filteredTasks = allTaskNodes;

    let completedTasks = 0;
    let incompleteTasks = 0;
    let cancelledTasks = 0;
    let scheduledTasks = 0;
    let inProgressTasks = 0;

    const techStatsMap: Record<string, {
      completed: number;
      incomplete: number;
      cancelled: number;
      scheduled: number;
      inProgress: number;
      total: number;
    }> = {};

    filteredTasks.forEach((task) => {
      const status = (task.status || "").toUpperCase();
      const techName = task.technicianName?.trim();

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
    const firstTimeSuccessRate = totalInterventions > 0 
      ? Number(((completedTasks / totalInterventions) * 100).toFixed(1))
      : 0;

    // KM map por técnico para cruzar no ranking
    const techKmByName: Record<string, number> = {};
    technicianKmStats.forEach((t) => {
      techKmByName[t.name] = t.totalKm;
    });

    // Ranking dos Técnicos com Success Rate:
    // Fórmula pedida pelo CEO: Concluídos vs Cancelados + Incompletos
    const technicianRankings: TechnicianRanking[] = Object.entries(techStatsMap)
      .map(([name, stats]) => {
        const finishedVolume = stats.completed + stats.incomplete + stats.cancelled;
        const successRate = finishedVolume > 0
          ? Number(((stats.completed / finishedVolume) * 100).toFixed(1))
          : (stats.completed > 0 ? 100 : 0);

        return {
          rank: 1, // Atribuído a seguir
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
        // Ordenar primeiro por concluídos; em caso de empate, por taxa de sucesso
        if (b.completedCount !== a.completedCount) {
          return b.completedCount - a.completedCount;
        }
        return b.successRate - a.successRate;
      })
      .map((t, idx) => ({
        ...t,
        rank: idx + 1,
      }));

    const topTechnicians = technicianRankings.map((t) => ({
      name: t.name,
      completedCount: t.completedCount,
      successRate: Math.round(t.successRate),
    })).slice(0, 5);

    // --- CLIENTES COM PRÓXIMO FOLLOW UP ---
    const upcomingFollowUps: ClientFollowUp[] = [];
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    filteredOpps.forEach((opp) => {
      if (!opp.dataDeFollowUp) return;
      const fDate = new Date(opp.dataDeFollowUp);
      if (isNaN(fDate.getTime())) return;

      const fMidnight = new Date(fDate.getFullYear(), fDate.getMonth(), fDate.getDate()).getTime();
      const diffDays = Math.round((fMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

      let urgencyStatus: "OVERDUE" | "TODAY" | "TOMORROW" | "UPCOMING" = "UPCOMING";
      if (diffDays < 0) urgencyStatus = "OVERDUE";
      else if (diffDays === 0) urgencyStatus = "TODAY";
      else if (diffDays === 1) urgencyStatus = "TOMORROW";

      const stageNorm = (opp.stage || "ENTRADA").toUpperCase();
      const stageInfo = STAGE_LABELS[stageNorm] || { label: opp.stage || "Desconhecido", color: "#94a3b8" };

      const rawMicros = opp.amount?.amountMicros;
      const amountVal = (typeof rawMicros === 'number' && rawMicros > 0)
        ? Math.round(rawMicros / 1_000_000)
        : null;

      const contactPerson = opp.pointOfContact?.name
        ? `${opp.pointOfContact.name.firstName || ""} ${opp.pointOfContact.name.lastName || ""}`.trim()
        : null;

      const contactPhone = opp.pointOfContact?.phones?.primaryPhoneNumber || null;

      upcomingFollowUps.push({
        id: opp.id,
        clientName: opp.name || "Cliente Sem Nome",
        nsi: opp.nsi != null ? String(opp.nsi) : null,
        stage: stageNorm,
        stageLabel: stageInfo.label,
        followUpDate: opp.dataDeFollowUp,
        formattedFollowUpDate: fDate.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }),
        daysRemaining: diffDays,
        urgencyStatus,
        contactPhone,
        contactPerson,
        amount: amountVal,
        formattedAmount: amountVal !== null ? formatEUR(amountVal) : "Sob Orçamento",
      });
    });

    // Ordenar follow-ups por urgência temporal (atrasados e hoje primeiro)
    upcomingFollowUps.sort((a, b) => a.daysRemaining - b.daysRemaining);

    // --- WAREHOUSE CALCULATIONS ---
    let preparedItems = 0;
    itemNodes.forEach((item) => {
      if (item.preparado === true || item.estadoDoArmazem === "PREPARADO") {
        preparedItems += 1;
      }
    });

    const totalItems = itemNodes.length;
    const pendingItems = totalItems - preparedItems;
    const preparationRate = totalItems > 0 ? Number(((preparedItems / totalItems) * 100).toFixed(1)) : 0;

    // --- SATISFACTION / NPS ---
    const averageRating = ratings.length > 0 
      ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) 
      : 0;

    const rawResult: CeoMetrics = {
      availableYears,
      selectedYear: activeYear,
      financial,
      overview: {
        totalActiveOpportunities: activeOpps,
        completedOpportunities: completedOpps,
        globalConversionRate,
        averageRating,
        totalRatingsCount: ratings.length,
        firstTimeSuccessRate,
      },
      monthlyEvolution,
      fleetKmStats: {
        totalFleetKm,
        technicians: technicianKmStats,
      },
      pipelineFunnel,
      fieldEfficiency: {
        totalTasks: filteredTasks.length,
        completedTasks,
        incompleteTasks,
        cancelledTasks,
        scheduledTasks,
        inProgressTasks,
      },
      warehouseStats: {
        totalItems,
        preparedItems,
        pendingItems,
        preparationRate,
      },
      recentFeedback: recentFeedback.slice(0, 6),
      topTechnicians,
      technicianRankings,
      upcomingFollowUps,
      servicesList,
    };

    return CeoMetricsSchema.parse(rawResult);
  } catch (error) {
    console.error("❌ Erro ao compilar métricas do CEO no Twenty CRM:", error);
    const fallbackYear = new Date().getFullYear();
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
      upcomingFollowUps: [],
      servicesList: [],
    };
  }
}
