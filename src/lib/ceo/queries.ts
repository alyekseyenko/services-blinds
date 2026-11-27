import "server-only";

import { crmFetch } from "@/lib/crm/client";
import { CRM_ADDRESS_GRAPHQL_FIELDS } from "@/lib/crm/contract";
import { recentYears, yearToUtcRange } from "@/lib/crm/dateFilters";
import { fetchAllGraphqlPages } from "@/lib/crm/graphqlPagination";

export const CEO_OPP_NODE_FIELDS = `
  id
  name
  nsi
  numeroDeServico
  stage
  avaliacaoDoCliente
  feedbackDoCliente
  dataDeFollowUp
  dataDeLembrete
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
  updatedAt
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
          title
          status
          technicianName
          assigneeId
          equipaAuxiliarIds
          equipaAuxiliarNomes
          dueAt
          bodyV2 { markdown }
        }
      }
    }
  }
`;

export async function fetchCeoYearSample(): Promise<number[]> {
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

export async function fetchCeoOpportunityNodes(activeYear: number | null): Promise<Record<string, unknown>[]> {
  const pageSize = 100;
  const maxPages = activeYear === null ? 20 : 10;
  const yearRange = activeYear === null ? null : yearToUtcRange(activeYear);

  return fetchAllGraphqlPages({
    pageSize,
    maxPages,
    fetchPage: async (after) => {
      const query = yearRange
        ? `
          query getCeoOpportunitiesByYear($gte: DateTime!, $lte: DateTime!, $first: Int!, $after: String) {
            opportunities(
              orderBy: { createdAt: DescNullsLast }
              first: $first
              after: $after
              filter: { and: [{ createdAt: { gte: $gte } }, { createdAt: { lte: $lte } }] }
            ) {
              pageInfo { hasNextPage endCursor }
              edges {
                node {
                  ${CEO_OPP_NODE_FIELDS}
                }
              }
            }
          }
        `
        : `
          query getCeoOpportunitiesAll($first: Int!, $after: String) {
            opportunities(orderBy: { createdAt: DescNullsLast }, first: $first, after: $after) {
              pageInfo { hasNextPage endCursor }
              edges {
                node {
                  ${CEO_OPP_NODE_FIELDS}
                }
              }
            }
          }
        `;

      const variables = yearRange
        ? { gte: yearRange.gte, lte: yearRange.lte, first: pageSize, after }
        : { first: pageSize, after };

      const data = await crmFetch<{
        opportunities: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          edges: Array<{ node: Record<string, unknown> }>;
        };
      }>(query, variables);

      return {
        nodes: data.opportunities?.edges?.map((edge) => edge.node) || [],
        pageInfo: data.opportunities.pageInfo,
      };
    },
  });
}

export async function fetchCeoTaskNodes(activeYear: number | null): Promise<Record<string, unknown>[]> {
  const pageSize = 100;
  const maxPages = activeYear === null ? 20 : 10;
  const yearRange = activeYear === null ? null : yearToUtcRange(activeYear);

  return fetchAllGraphqlPages({
    pageSize,
    maxPages,
    fetchPage: async (after) => {
      const query = yearRange
        ? `
          query getCeoTasksByYear($gte: DateTime!, $lte: DateTime!, $first: Int!, $after: String) {
            tasks(
              orderBy: { createdAt: DescNullsLast }
              first: $first
              after: $after
              filter: { and: [{ createdAt: { gte: $gte } }, { createdAt: { lte: $lte } }] }
            ) {
              pageInfo { hasNextPage endCursor }
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
        `
        : `
          query getCeoTasksAll($first: Int!, $after: String) {
            tasks(orderBy: { createdAt: DescNullsLast }, first: $first, after: $after) {
              pageInfo { hasNextPage endCursor }
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

      const variables = yearRange
        ? { gte: yearRange.gte, lte: yearRange.lte, first: pageSize, after }
        : { first: pageSize, after };

      const data = await crmFetch<{
        tasks: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          edges: Array<{ node: Record<string, unknown> }>;
        };
      }>(query, variables);

      return {
        nodes: data.tasks?.edges?.map((edge) => edge.node) || [],
        pageInfo: data.tasks.pageInfo,
      };
    },
  });
}

const CEO_WAREHOUSE_ITEMS_QUERY = `
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

export type CeoWarehouseDbStats = {
  preparedItems: number;
  totalItems: number;
  pendingItems: number;
  preparationRate: number;
};

export async function fetchCeoWarehouseItemsFromCrm(): Promise<{
  dbWarehouseStats: CeoWarehouseDbStats | null;
  itemNodes: Record<string, unknown>[];
}> {
  const { fetchCeoWarehouseItemStatsFromDb } = await import("@/lib/measurements/warehouseQueries");
  const dbWarehouseStats = await fetchCeoWarehouseItemStatsFromDb();
  if (dbWarehouseStats) {
    return { dbWarehouseStats, itemNodes: [] };
  }
  const itemsRes = await crmFetch<{ produtos: { edges: Array<{ node: Record<string, unknown> }> } }>(
    CEO_WAREHOUSE_ITEMS_QUERY
  );
  const itemNodes = itemsRes.produtos?.edges?.map((e) => e.node) || [];
  return { dbWarehouseStats: null, itemNodes };
}