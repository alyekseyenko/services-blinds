import "server-only";
import { crmFetch } from "../client";
import { CRM_STAGES } from "../contract";
import {
  ADMIN_HISTORY_PAGE_SIZE,
  ADMIN_PIPELINE_FETCH_LIMIT,
  isTerminalHistoryStatus,
  sortOpportunitiesByRecentDate,
} from "../dateFilters";
import { fetchAllGraphqlPages } from "../graphqlPagination";
import type { MapHistoryOutcome } from "@/lib/admin/mapHistoryStatus";
import { matchesHistoryOutcomeFilter } from "@/lib/admin/mapHistoryStatus";
import { matchesHistoryVisitDate, type HistoryDateRange } from "@/lib/visits/historyFilters";
import { formatOnSiteDurationPt } from "@/lib/visitSiteTimes";
import {
  CRM_CACHE_KEYS,
  ADMIN_TTL_SEC,
  adminHistoryPageCacheKey,
  cacheGetOrCompute,
} from "@/lib/crmCache";
import {
  mapOpportunityNode,
  OPPORTUNITY_ADMIN_NODE_FIELDS,
} from "./mapper";

/** Stages that exist in the live Twenty CRM workspace enum (excludes app-only aliases). */
const ADMIN_PIPELINE_STAGES = [
  CRM_STAGES.ENTRADA,
  CRM_STAGES.TIRAR_MEDIDAS,
  CRM_STAGES.REMEDICAO,
  CRM_STAGES.PROPOSTA,
  CRM_STAGES.MANUTENCAO,
  CRM_STAGES.REPARACAO,
  CRM_STAGES.MARCAR_INSTALACAO,
  CRM_STAGES.PREPARACAO,
  CRM_STAGES.INSTALACAO,
] as const;

async function fetchOpportunitiesWithStagesIn(stages: readonly string[]) {
  if (stages.length === 0) return [];

  const pageSize = Math.min(100, ADMIN_PIPELINE_FETCH_LIMIT);

  const nodes = await fetchAllGraphqlPages({
    pageSize,
    maxPages: 30,
    fetchPage: async (after) => {
      const query = `
        query getOppsStagesIn($stages: [OpportunityStageEnum!]!, $first: Int!, $after: String) {
          opportunities(
            orderBy: { createdAt: DescNullsLast }
            first: $first
            after: $after
            filter: { stage: { in: $stages } }
          ) {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                ${OPPORTUNITY_ADMIN_NODE_FIELDS}
              }
            }
          }
        }
      `;

      const data = await crmFetch<{
        opportunities: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          edges: Array<{ node: unknown }>;
        };
      }>(query, { stages: [...stages], first: pageSize, after }, {
        timeoutMs: 12000,
        maxRetries: 1,
      });

      return {
        nodes: data.opportunities.edges.map((edge) =>
          mapOpportunityNode(edge.node as Parameters<typeof mapOpportunityNode>[0])
        ),
        pageInfo: data.opportunities.pageInfo,
      };
    },
  });

  return nodes;
}

async function fetchOpportunitiesByStages(stages: readonly string[]) {
  try {
    return await fetchOpportunitiesWithStagesIn(stages);
  } catch (combinedError) {
    console.warn(
      "[CRM] Combined stage query failed; falling back to per-stage fetch:",
      combinedError instanceof Error ? combinedError.message : combinedError
    );
  }

  const results = await Promise.allSettled(stages.map((stage) => fetchOpportunities(stage)));

  const merged = new Map<string, ReturnType<typeof mapOpportunityNode>>();
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      result.value.forEach((opp) => merged.set(opp.twentyId, opp));
      return;
    }

    console.warn(
      `[CRM] Skipping admin pipeline stage "${stages[index]}":`,
      result.reason instanceof Error ? result.reason.message : result.reason
    );
  });

  return Array.from(merged.values());
}

/** Estágios onde visitas concluídas ficam antes de arquivo final (ex.: medição → Orçamentar). */
const ADMIN_HISTORY_STAGES = [
  CRM_STAGES.ORCAMENTAR,
  CRM_STAGES.PROPOSTA,
  CRM_STAGES.PAGAMENTO_TOTAL,
  CRM_STAGES.CONCLUIDO,
  "CANCELADO",
] as const;

async function fetchAdminOpportunitiesFromCrm() {
  return fetchOpportunitiesByStages(ADMIN_PIPELINE_STAGES);
}

async function fetchAdminHistoryOpportunitiesFromCrm() {
  return fetchOpportunitiesByStages(ADMIN_HISTORY_STAGES);
}

export async function fetchAdminOpportunities(options?: { fresh?: boolean }) {
  return cacheGetOrCompute(
    CRM_CACHE_KEYS.adminOpportunities,
    ADMIN_TTL_SEC,
    fetchAdminOpportunitiesFromCrm,
    options
  );
}

export async function fetchAdminHistoryOpportunities(options?: { fresh?: boolean }) {
  return cacheGetOrCompute(
    CRM_CACHE_KEYS.adminHistory,
    ADMIN_TTL_SEC,
    fetchAdminHistoryOpportunitiesFromCrm,
    options
  );
}

export type AdminHistoryPageResult = {
  items: ReturnType<typeof mapOpportunityNode>[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: {
    completed: number;
    incomplete: number;
    cancelled: number;
    onSiteDurationSampleCount: number;
    onSiteDurationAvgMinutes: number | null;
    onSiteDurationFormattedAvg: string | null;
  };
};

export async function fetchAdminHistoryPage(
  page: number,
  pageSize: number = ADMIN_HISTORY_PAGE_SIZE,
  scope?: {
    outcomes?: readonly MapHistoryOutcome[];
    withCoordinates?: boolean;
    fresh?: boolean;
    from?: string | null;
    to?: string | null;
  }
): Promise<AdminHistoryPageResult> {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const outcomeKey = scope?.outcomes?.length ? [...scope.outcomes].sort().join(",") : "";
  const dateKey = `${scope?.from ?? ""}|${scope?.to ?? ""}`;
  const cacheKey = adminHistoryPageCacheKey(
    safePage,
    safePageSize,
    `${outcomeKey}${scope?.withCoordinates ? ":gps" : ""}${dateKey !== "|" ? `:d:${dateKey}` : ""}`
  );
  const fresh = scope?.fresh ? { fresh: true as const } : undefined;
  return cacheGetOrCompute(cacheKey, ADMIN_TTL_SEC, async () => {
  const [pipeline, archived] = await Promise.all([
    fetchAdminOpportunities(fresh),
    fetchAdminHistoryOpportunities(fresh),
  ]);

  const merged = new Map<string, ReturnType<typeof mapOpportunityNode>>();
  pipeline
    .filter((opp) => isTerminalHistoryStatus(opp.status))
    .forEach((opp) => merged.set(opp.twentyId, opp));
  archived.forEach((opp) => merged.set(opp.twentyId, opp));

  const historyItems = sortOpportunitiesByRecentDate(
    Array.from(merged.values()).filter((opp) => isTerminalHistoryStatus(opp.status))
  );

  const outcomes = scope?.outcomes ?? [];
  const dateRange: HistoryDateRange = { from: scope?.from, to: scope?.to };
  const dateFiltered = historyItems.filter((opp) => matchesHistoryVisitDate(opp, dateRange));

  let onSiteDurationTotalMs = 0;
  let onSiteDurationSampleCount = 0;
  for (const opp of dateFiltered) {
    const ms = opp.visitOnSiteDurationMs;
    if (ms != null && ms > 0) {
      onSiteDurationTotalMs += ms;
      onSiteDurationSampleCount += 1;
    }
  }
  const onSiteDurationAvgMinutes =
    onSiteDurationSampleCount > 0
      ? Math.max(1, Math.round(onSiteDurationTotalMs / onSiteDurationSampleCount / 60_000))
      : null;
  const onSiteDurationFormattedAvg =
    onSiteDurationSampleCount > 0
      ? formatOnSiteDurationPt(Math.round(onSiteDurationTotalMs / onSiteDurationSampleCount))
      : null;

  const scopedItems = dateFiltered.filter((opp) => {
    if (outcomes.length > 0 && !matchesHistoryOutcomeFilter(opp, outcomes)) return false;
    if (scope?.withCoordinates) {
      return Array.isArray(opp.coordinates) && opp.coordinates.length === 2;
    }
    return true;
  });

  const total = scopedItems.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const start = (safePage - 1) * safePageSize;

  const isCompleted = (status: string) => status === "Concluído" || status === "CONCLUIDO";
  const isIncomplete = (status: string) => status === "Incompleto" || status === "INCOMPLETO";
  const isCancelled = (status: string) => status === "Cancelado" || status === "CANCELADO";

  const result: AdminHistoryPageResult = {
    items: scopedItems.slice(start, start + safePageSize),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
    summary: {
      completed: dateFiltered.filter((opp) => isCompleted(opp.status || "")).length,
      incomplete: dateFiltered.filter((opp) => isIncomplete(opp.status || "")).length,
      cancelled: dateFiltered.filter((opp) => isCancelled(opp.status || "")).length,
      onSiteDurationSampleCount,
      onSiteDurationAvgMinutes,
      onSiteDurationFormattedAvg,
    },
  };

  return result;
  });
}

export async function fetchOpportunities(
  stageFilter: string | null = null,
  first: number = ADMIN_PIPELINE_FETCH_LIMIT
) {
  const pageSize = Math.min(100, Math.max(1, first));

  const nodes = await fetchAllGraphqlPages({
    pageSize,
    maxPages: 30,
    fetchPage: async (after) => {
      const query = stageFilter
        ? `
          query getOppsWithFilter($stage: OpportunityStageEnum!, $first: Int!, $after: String) {
            opportunities(
              orderBy: { createdAt: DescNullsLast }
              first: $first
              after: $after
              filter: { stage: { eq: $stage } }
            ) {
              pageInfo { hasNextPage endCursor }
              edges {
                node {
                  ${OPPORTUNITY_ADMIN_NODE_FIELDS}
                }
              }
            }
          }
        `
        : `
          query getOpps($first: Int!, $after: String) {
            opportunities(orderBy: { createdAt: DescNullsLast }, first: $first, after: $after) {
              pageInfo { hasNextPage endCursor }
              edges {
                node {
                  ${OPPORTUNITY_ADMIN_NODE_FIELDS}
                }
              }
            }
          }
        `;

      const variables = stageFilter
        ? { stage: stageFilter, first: pageSize, after }
        : { first: pageSize, after };

      const data = await crmFetch<{
        opportunities: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          edges: Array<{ node: unknown }>;
        };
      }>(query, variables, {
        timeoutMs: 12000,
        maxRetries: 1,
      });

      return {
        nodes: data.opportunities.edges.map((edge) => mapOpportunityNode(edge.node as Parameters<typeof mapOpportunityNode>[0])),
        pageInfo: data.opportunities.pageInfo,
      };
    },
  });

  return nodes;
}
async function resolveOpportunityIdFromTaskId(taskId: string): Promise<string | null> {
  const data = await crmFetch<{
    tasks: {
      edges: Array<{
        node?: {
          taskTargets?: {
            edges?: Array<{ node?: { targetOpportunityId?: string | null } }>;
          };
        };
      }>;
    };
  }>(
    `query taskOppLookup($id: UUID!) {
      tasks(filter: { id: { eq: $id } }, first: 1) {
        edges {
          node {
            taskTargets {
              edges {
                node {
                  targetOpportunityId
                }
              }
            }
          }
        }
      }
    }`,
    { id: taskId },
    { timeoutMs: 12000, maxRetries: 1 }
  );

  const edges = data.tasks.edges[0]?.node?.taskTargets?.edges ?? [];
  for (const edge of edges) {
    const oppId = edge.node?.targetOpportunityId;
    if (oppId) return oppId;
  }
  return null;
}

export async function fetchAdminOpportunityById(
  opportunityId: string
): Promise<ReturnType<typeof mapOpportunityNode> | null> {
  const data = await crmFetch<{
    opportunities: { edges: Array<{ node: unknown }> };
  }>(
    `query adminOppById($id: UUID!) {
      opportunities(filter: { id: { eq: $id } }, first: 1) {
        edges {
          node {
            ${OPPORTUNITY_ADMIN_NODE_FIELDS}
          }
        }
      }
    }`,
    { id: opportunityId },
    { timeoutMs: 12000, maxRetries: 1 }
  );

  const node = data.opportunities.edges[0]?.node;
  if (!node) return null;
  return mapOpportunityNode(node as Parameters<typeof mapOpportunityNode>[0]);
}

export async function fetchAdminOpportunityLookup(params: {
  opportunityId?: string;
  taskId?: string;
}): Promise<ReturnType<typeof mapOpportunityNode> | null> {
  let opportunityId = params.opportunityId?.trim() || null;
  if (!opportunityId && params.taskId?.trim()) {
    opportunityId = await resolveOpportunityIdFromTaskId(params.taskId.trim());
  }
  if (!opportunityId) return null;
  return fetchAdminOpportunityById(opportunityId);
}

export async function fetchOpportunityStageFromCrm(
  opportunityId: string
): Promise<string | null> {
  const data = await crmFetch<{
    opportunities: { edges: Array<{ node: { stage?: string | null } }> };
  }>(
    `query oppStageForPipeline($id: UUID!) {
      opportunities(filter: { id: { eq: $id } }, first: 1) {
        edges {
          node {
            stage
          }
        }
      }
    }`,
    { id: opportunityId }
  );
  const stage = data.opportunities.edges[0]?.node?.stage;
  return stage != null && String(stage).trim() !== "" ? String(stage) : null;
}
