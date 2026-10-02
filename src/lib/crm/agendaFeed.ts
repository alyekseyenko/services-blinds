import "server-only";
import { crmFetch } from "./client";
import { CRM_STAGES, deriveWorkflowMarkerKey, normalizeString } from "./contract";
import { fetchAllGraphqlPages } from "./graphqlPagination";
import { fetchAdminOpportunities } from "./opportunities";
import { parseVisitServicesMarker } from "./visitServicesMarker";
import { extractTaskStatusNote } from "@/lib/agendaTaskStatusNote";
import {
  AdminAgendaFeedSchema,
  type AdminAgendaFeedFromSchema,
} from "@/lib/schemas/agendaFeed";
import {
  ADMIN_AGENDA_FEED_TTL_SEC,
  CRM_CACHE_KEYS,
  cacheGetOrCompute,
} from "@/lib/crmCache";

const AGENDA_FEED_PAGE_SIZE = 80;
const AGENDA_FEED_MAX_PAGES = 40;

const AGENDA_TASK_NODE_FIELDS = `
  id
  title
  status
  dueAt
  updatedAt
  assigneeId
  technicianName
  scheduledBy
  bodyV2 { markdown }
  taskTargets {
    edges {
      node {
        targetOpportunity {
          id
          name
          nsi
          stage
          pointOfContact {
            name {
              firstName
              lastName
            }
          }
        }
      }
    }
  }
`;

export function adminAgendaFeedDateWindow(): {
  dueFrom: string;
  dueTo: string;
  updatedSince: string;
} {
  const now = new Date();
  const dueFrom = new Date(now);
  dueFrom.setUTCDate(dueFrom.getUTCDate() - 2);
  dueFrom.setUTCHours(0, 0, 0, 0);

  const dueTo = new Date(now);
  dueTo.setUTCDate(dueTo.getUTCDate() + 90);
  dueTo.setUTCHours(23, 59, 59, 999);

  const updatedSince = new Date(now);
  updatedSince.setUTCDate(updatedSince.getUTCDate() - 3);
  updatedSince.setUTCHours(0, 0, 0, 0);

  return {
    dueFrom: dueFrom.toISOString(),
    dueTo: dueTo.toISOString(),
    updatedSince: updatedSince.toISOString(),
  };
}

type RawTaskNode = {
  id: string;
  title?: string | null;
  status?: string | null;
  dueAt?: string | null;
  assigneeId?: string | null;
  technicianName?: string | null;
  scheduledBy?: string | null;
  bodyV2?: { markdown?: string | null } | null;
  taskTargets?: {
    edges?: Array<{
      node?: {
        targetOpportunity?: {
          id: string;
          name?: string | null;
          nsi?: number | string | null;
          stage?: string | null;
          pointOfContact?: {
            name?: { firstName?: string | null; lastName?: string | null };
          } | null;
        } | null;
      } | null;
    }>;
  } | null;
};

function buildPipelineLabel(client: string, nsi: string, title: string): string {
  return (
    [
      client && client !== "Cliente" ? client : null,
      nsi ? `NSI ${nsi}` : null,
      title || null,
    ]
      .filter(Boolean)
      .join(" · ") || title || client || "Serviço"
  );
}

/** Maps a CRM task node into the admin agenda feed task shape (unit-tested). */
export function mapAgendaFeedTaskNode(node: RawTaskNode): AdminAgendaFeedFromSchema["tasks"][number] {
  const edges = node.taskTargets?.edges || [];
  const opps =
    edges
      .map((e) => e.node?.targetOpportunity)
      .filter((o): o is NonNullable<typeof o> => Boolean(o?.id)) ?? [];

  const primaryOpp = opps[0];
  const contact = primaryOpp?.pointOfContact;
  const client = contact
    ? `${contact.name?.firstName || ""} ${contact.name?.lastName || ""}`.trim()
    : "Cliente";
  const nsiRaw = primaryOpp?.nsi != null ? String(primaryOpp.nsi).trim() : "";
  const nsi = nsiRaw && nsiRaw !== "N/A" ? nsiRaw : "";

  const markerRecords = parseVisitServicesMarker(node.bodyV2?.markdown);
  const onSiteOpportunityIds = markerRecords.map((r) => r.opportunityId);
  const onSiteServices = markerRecords.map((r) => ({
    opportunityId: r.opportunityId,
    serviceType: r.serviceType,
    mode: r.mode,
  }));
  const statusNote = extractTaskStatusNote(node.bodyV2?.markdown);

  return {
    id: node.id,
    status: node.status || "",
    dueAt: node.dueAt ?? null,
    assigneeId: node.assigneeId ?? null,
    technicianName: node.technicianName ?? null,
    scheduledBy: node.scheduledBy ?? undefined,
    client: client || undefined,
    nsi: nsi || undefined,
    visitTitle: node.title?.trim() || primaryOpp?.name?.trim() || undefined,
    opportunityId: primaryOpp?.id,
    onSiteOpportunityIds,
    onSiteServices: onSiteServices.length > 0 ? onSiteServices : undefined,
    statusNote,
    serviceType: deriveWorkflowMarkerKey(primaryOpp?.stage, node.title?.trim()),
  };
}

async function fetchAgendaTasksByDueWindow(dueFrom: string, dueTo: string): Promise<RawTaskNode[]> {
  return fetchAllGraphqlPages({
    pageSize: AGENDA_FEED_PAGE_SIZE,
    maxPages: AGENDA_FEED_MAX_PAGES,
    fetchPage: async (after) => {
      const query = `
        query AdminAgendaTasksDue($dueFrom: DateTime!, $dueTo: DateTime!, $first: Int!, $after: String) {
          tasks(
            filter: {
              and: [
                { dueAt: { gte: $dueFrom } }
                { dueAt: { lte: $dueTo } }
              ]
            }
            orderBy: { dueAt: AscNullsLast }
            first: $first
            after: $after
          ) {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                ${AGENDA_TASK_NODE_FIELDS}
              }
            }
          }
        }
      `;

      const data = await crmFetch<{
        tasks: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          edges: Array<{ node: RawTaskNode }>;
        };
      }>(
        query,
        { dueFrom, dueTo, first: AGENDA_FEED_PAGE_SIZE, after },
        { timeoutMs: 20000, maxRetries: 1 }
      );

      return {
        nodes: data.tasks.edges.map((e) => e.node),
        pageInfo: data.tasks.pageInfo,
      };
    },
  });
}

async function fetchAgendaTasksByUpdatedSince(updatedSince: string): Promise<RawTaskNode[]> {
  return fetchAllGraphqlPages({
    pageSize: AGENDA_FEED_PAGE_SIZE,
    maxPages: AGENDA_FEED_MAX_PAGES,
    fetchPage: async (after) => {
      const query = `
        query AdminAgendaTasksUpdated($updatedSince: DateTime!, $first: Int!, $after: String) {
          tasks(
            filter: { updatedAt: { gte: $updatedSince } }
            orderBy: { updatedAt: DescNullsLast }
            first: $first
            after: $after
          ) {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                ${AGENDA_TASK_NODE_FIELDS}
              }
            }
          }
        }
      `;

      const data = await crmFetch<{
        tasks: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          edges: Array<{ node: RawTaskNode }>;
        };
      }>(
        query,
        { updatedSince, first: AGENDA_FEED_PAGE_SIZE, after },
        { timeoutMs: 20000, maxRetries: 1 }
      );

      return {
        nodes: data.tasks.edges.map((e) => e.node),
        pageInfo: data.tasks.pageInfo,
      };
    },
  });
}

async function fetchMergedAgendaTaskNodes(): Promise<RawTaskNode[]> {
  const { dueFrom, dueTo, updatedSince } = adminAgendaFeedDateWindow();
  const [byDue, byUpdated] = await Promise.all([
    fetchAgendaTasksByDueWindow(dueFrom, dueTo),
    fetchAgendaTasksByUpdatedSince(updatedSince),
  ]);

  const byId = new Map<string, RawTaskNode>();
  for (const node of [...byDue, ...byUpdated]) {
    if (node?.id) byId.set(node.id, node);
  }
  return [...byId.values()];
}

async function buildPipelineItems(): Promise<AdminAgendaFeedFromSchema["pipeline"]> {
  const opportunities = await fetchAdminOpportunities();
  const pipelineStages = new Set([
    normalizeString(CRM_STAGES.PREPARACAO),
    normalizeString(CRM_STAGES.MARCAR_INSTALACAO),
  ]);

  const items: AdminAgendaFeedFromSchema["pipeline"] = [];
  for (const opp of opportunities) {
    const stageNorm = normalizeString(opp.stage);
    if (!pipelineStages.has(stageNorm)) continue;
    const client = opp.client?.trim() || "Cliente";
    const nsi = opp.nsi != null && String(opp.nsi) !== "N/A" ? String(opp.nsi) : "";
    items.push({
      opportunityId: opp.twentyId,
      stage: opp.stage,
      label: buildPipelineLabel(client, nsi, opp.title || ""),
    });
  }
  return items;
}

async function fetchAdminAgendaFeedFromCrm(): Promise<AdminAgendaFeedFromSchema> {
  const nodes = await fetchMergedAgendaTaskNodes();
  const tasks = nodes.map(mapAgendaFeedTaskNode);
  const pipeline = await buildPipelineItems();

  const parsed = AdminAgendaFeedSchema.safeParse({ tasks, pipeline });
  if (!parsed.success) {
    throw new Error(`Invalid admin agenda feed: ${parsed.error.message}`);
  }
  return parsed.data;
}

export async function fetchAdminAgendaFeed(): Promise<AdminAgendaFeedFromSchema> {
  return cacheGetOrCompute(
    CRM_CACHE_KEYS.adminAgendaFeed,
    ADMIN_AGENDA_FEED_TTL_SEC,
    fetchAdminAgendaFeedFromCrm
  );
}
