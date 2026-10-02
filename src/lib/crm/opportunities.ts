import "server-only";
import { crmFetch } from './client';
import { 
  CRM_STAGES, 
  CRM_TASK_STATUS, 
  STAGE_GROUPS, 
  normalizeString,
  normalizeTaskStatus,
  isTaskActive,
  isTaskPendingConfirmation,
  isTaskBlockingSchedule,
  isTaskCompleted,
  isTaskCancelled,
  isTaskIncomplete,
  isTaskTerminal,
  isMeasurementService,
  isInstallationService,
  isAssistanceService,
  deriveWorkflowMarkerKey,
  parseCrmClientRating,
  formatCrmClientRating,
  CRM_ADDRESS_GRAPHQL_FIELDS,
} from './contract';
import { isOpportunityCreatedOnSite, isOpportunityDeferredInTask } from './visitServicesMarker';
import {
  ADMIN_HISTORY_PAGE_SIZE,
  ADMIN_PIPELINE_FETCH_LIMIT,
  isTerminalHistoryStatus,
  sortOpportunitiesByRecentDate,
} from './dateFilters';
import { fetchAllGraphqlPages } from './graphqlPagination';
import { extractPhonesFromTwenty, getPrimaryPhone } from './phones';
import {
  CRM_CACHE_KEYS,
  ADMIN_TTL_SEC,
  DEFAULT_TTL_SEC,
  adminHistoryPageCacheKey,
  cacheGet,
  cacheGetOrCompute,
  cacheSet,
  invalidateAdminCrmCache,
} from '@/lib/crmCache';

export { invalidateAdminCrmCache };

const OPPORTUNITY_ADMIN_NODE_FIELDS = `
  id
  name
  nsi
  stage
  createdAt
  moradaDeServico {
    ${CRM_ADDRESS_GRAPHQL_FIELDS}
  }
  pointOfContact {
    id
    name {
      firstName
      lastName
    }
    emails {
      primaryEmail
    }
    phones {
      primaryPhoneNumber
      primaryPhoneCallingCode
      additionalPhones {
        number
        callingCode
        countryCode
      }
    }
  }
  taskTargets {
    edges {
      node {
        task {
          id
          status
          dueAt
          assigneeId
          technicianName
          scheduledBy
          bodyV2 { markdown }
        }
      }
    }
  }
`;

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

export async function fetchAdminOpportunities() {
  return cacheGetOrCompute(
    CRM_CACHE_KEYS.adminOpportunities,
    ADMIN_TTL_SEC,
    fetchAdminOpportunitiesFromCrm
  );
}

export async function fetchAdminHistoryOpportunities() {
  return cacheGetOrCompute(
    CRM_CACHE_KEYS.adminHistory,
    ADMIN_TTL_SEC,
    fetchAdminHistoryOpportunitiesFromCrm
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
  };
};

export async function fetchAdminHistoryPage(
  page: number,
  pageSize: number = ADMIN_HISTORY_PAGE_SIZE
): Promise<AdminHistoryPageResult> {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const cacheKey = adminHistoryPageCacheKey(safePage, safePageSize);
  return cacheGetOrCompute(cacheKey, ADMIN_TTL_SEC, async () => {
  const [pipeline, archived] = await Promise.all([
    fetchAdminOpportunities(),
    fetchAdminHistoryOpportunities(),
  ]);

  const merged = new Map<string, ReturnType<typeof mapOpportunityNode>>();
  pipeline
    .filter((opp) => isTerminalHistoryStatus(opp.status))
    .forEach((opp) => merged.set(opp.twentyId, opp));
  archived.forEach((opp) => merged.set(opp.twentyId, opp));

  const historyItems = sortOpportunitiesByRecentDate(
    Array.from(merged.values()).filter((opp) => isTerminalHistoryStatus(opp.status))
  );

  const total = historyItems.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const start = (safePage - 1) * safePageSize;

  const isCompleted = (status: string) => status === "Concluído" || status === "CONCLUIDO";
  const isIncomplete = (status: string) => status === "Incompleto" || status === "INCOMPLETO";
  const isCancelled = (status: string) => status === "Cancelado" || status === "CANCELADO";

  const result: AdminHistoryPageResult = {
    items: historyItems.slice(start, start + safePageSize),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
    summary: {
      completed: historyItems.filter((opp) => isCompleted(opp.status || "")).length,
      incomplete: historyItems.filter((opp) => isIncomplete(opp.status || "")).length,
      cancelled: historyItems.filter((opp) => isCancelled(opp.status || "")).length,
    },
  };

  return result;
  });
}

type CrmTaskNode = {
  id: string;
  status?: string;
  dueAt?: string | null;
  assigneeId?: string | null;
  technicianName?: string | null;
  scheduledBy?: string | null;
  title?: string | null;
  bodyV2?: { markdown?: string | null } | null;
};

/** Escolhe a tarefa que define estado no mapa/histórico (terminais têm prioridade sobre reagendamentos). */
export function pickRepresentativeTaskForOpportunity(
  tasks: CrmTaskNode[]
): CrmTaskNode | null {
  if (tasks.length === 0) return null;

  const terminal = tasks.filter((t) => isTaskTerminal(t.status));
  if (terminal.length > 0) {
    const terminalRank = (status?: string) => {
      if (isTaskCompleted(status)) return 3;
      if (isTaskIncomplete(status)) return 2;
      if (isTaskCancelled(status)) return 1;
      return 0;
    };
    return [...terminal].sort((a, b) => {
      const rank = terminalRank(b.status) - terminalRank(a.status);
      if (rank !== 0) return rank;
      const dueB = new Date(b.dueAt || 0).getTime();
      const dueA = new Date(a.dueAt || 0).getTime();
      return dueB - dueA;
    })[0];
  }

  const taskStatusPriority = (status: string) => {
    const s = normalizeTaskStatus(status);
    if (s === CRM_TASK_STATUS.AGENDADO) return 5;
    if (s === CRM_TASK_STATUS.POR_AGENDAR) return 4;
    if (s === CRM_TASK_STATUS.EM_CURSO) return 4;
    if (s === CRM_TASK_STATUS.INCOMPLETO) return 3;
    if (s === CRM_TASK_STATUS.CONCLUIDO || s === CRM_TASK_STATUS.DONE) return 2;
    return 1;
  };

  return [...tasks].sort((a, b) => taskStatusPriority(b.status || "") - taskStatusPriority(a.status || ""))[0];
}

function mapOpportunityNode(node: any) {
  const contact = node.pointOfContact;
  const allTasks = (node.taskTargets?.edges?.map((e: any) => e.node?.task).filter(Boolean) || [])
    .filter((t: any) => !isOpportunityDeferredInTask(node.id, t.bodyV2?.markdown)) as CrmTaskNode[];

  const task = pickRepresentativeTaskForOpportunity(allTasks);

  const createdOnSite = (node.taskTargets?.edges || []).some((e: any) =>
    isOpportunityCreatedOnSite(node.id, e.node?.task?.bodyV2?.markdown)
  );

  let isTaskObsolete = false;
  if (task && isTaskActive(task.status)) {
    const stageNorm = normalizeString(node.stage);

    const isMeasurement = isMeasurementService(node.stage, task.title);
    const isInstallation = isInstallationService(node.stage, task.title);
    const isAssistance = isAssistanceService(node.stage, task.title);

    if (isMeasurement && STAGE_GROUPS.OBSOLETE_AFTER_MEASUREMENT.includes(stageNorm)) {
      isTaskObsolete = true;
    }

    if (isInstallation && STAGE_GROUPS.OBSOLETE_AFTER_INSTALLATION.includes(stageNorm)) {
      isTaskObsolete = true;
    }

    if (isAssistance && STAGE_GROUPS.OBSOLETE_AFTER_ASSISTANCE.includes(stageNorm)) {
      isTaskObsolete = true;
    }
  }

  let computedStatus = node.stage;
  if (task) {
    const taskStatusNormalized = normalizeTaskStatus(task.status);
    if (taskStatusNormalized === CRM_TASK_STATUS.CONCLUIDO || taskStatusNormalized === CRM_TASK_STATUS.DONE) {
      computedStatus = CRM_TASK_STATUS.CONCLUIDO;
    } else if (taskStatusNormalized === CRM_TASK_STATUS.CANCELADO) {
      computedStatus = CRM_TASK_STATUS.CANCELADO;
    } else if (taskStatusNormalized === CRM_TASK_STATUS.INCOMPLETO) {
      computedStatus = CRM_TASK_STATUS.INCOMPLETO;
    } else if (taskStatusNormalized === CRM_TASK_STATUS.EM_CURSO) {
      computedStatus = CRM_TASK_STATUS.EM_CURSO;
    } else if (taskStatusNormalized === CRM_TASK_STATUS.AGENDADO) {
      computedStatus = CRM_TASK_STATUS.AGENDADO;
    } else if (taskStatusNormalized === CRM_TASK_STATUS.POR_AGENDAR) {
      computedStatus = CRM_TASK_STATUS.POR_AGENDAR;
    }
  }

  const stageNorm = normalizeString(node.stage);
  if (
    (stageNorm === CRM_STAGES.PAGAMENTO_TOTAL || stageNorm === CRM_STAGES.CONCLUIDO) &&
    !isTerminalHistoryStatus(computedStatus)
  ) {
    computedStatus = CRM_TASK_STATUS.CONCLUIDO;
  } else if (stageNorm === 'CANCELADO' && !isTerminalHistoryStatus(computedStatus)) {
    computedStatus = CRM_TASK_STATUS.CANCELADO;
  }

  const pointOfContactPhones = extractPhonesFromTwenty(contact?.phones);

  return {
    id: node.id,
    twentyId: node.id,
    title: node.name,
    stage: node.stage,
    status: computedStatus,
    dueDate: node.createdAt,
    address: [
      node.moradaDeServico?.addressStreet1,
      node.moradaDeServico?.addressCity,
      node.moradaDeServico?.addressPostcode,
    ].filter(Boolean).join(", ") || "N/A",
    addressCity: node.moradaDeServico?.addressCity || "Outros",
    coordinates: node.moradaDeServico?.addressLat ? [node.moradaDeServico.addressLat, node.moradaDeServico.addressLng] : null,
    rawAddress: node.moradaDeServico,
    pointOfContactId: contact?.id,
    pointOfContactEmail: contact?.emails?.primaryEmail,
    pointOfContactPhone: getPrimaryPhone(pointOfContactPhones),
    pointOfContactPhones,
    client: contact ? `${contact.name?.firstName || ""} ${contact.name?.lastName || ""}`.trim() : "Cliente",
    hasScheduledTask: !!task && isTaskActive(task.status) && !isTaskObsolete,
    hasPendingProposal:
      !!task && isTaskPendingConfirmation(task.status) && !isTaskObsolete,
    taskStatus: isTaskObsolete ? "CONCLUIDO" : task?.status,
    taskId: task?.id,
    scheduledAt:
      isTaskObsolete || !task
        ? null
        : isTaskTerminal(task.status)
          ? task.dueAt
          : isTaskBlockingSchedule(task.status)
            ? task.dueAt
            : null,
    technician: isTaskObsolete ? "Não Atribuído" : task?.technicianName || "Não Atribuído",
    technicianId: isTaskObsolete ? null : task?.assigneeId,
    scheduledBy: isTaskObsolete ? undefined : task?.scheduledBy || undefined,
    nsi: node.nsi || "N/A",
    serviceType: deriveWorkflowMarkerKey(node.stage, node.name),
    createdOnSite,
  };
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

export async function updateOpportunityClientAvailability(id: string, disponibilidadeIso: string) {
  const mutation = `
    mutation updateOppAvailability($id: UUID!, $disponibilidade: DateTime!) {
      updateOpportunity(id: $id, data: { disponibilidadeDoCliente: $disponibilidade }) {
        id
      }
    }
  `;
  const result = await crmFetch(mutation, { id, disponibilidade: disponibilidadeIso });
  await invalidateAdminCrmCache();
  return result;
}

/** Fresh pipeline stage read — use from `pipelineTransitions` before stage writes. */
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

/** CRM stage write — use only via `pipelineTransitions` (not exported to actions/UI). */
export async function writeOpportunityStageToCrm(id: string, stage: string) {
  const mutation = `
    mutation updateOppStage($id: UUID!, $stage: OpportunityStageEnum!) {
      updateOpportunity(id: $id, data: { stage: $stage }) {
        id
      }
    }
  `;
  const result = await crmFetch(mutation, { id, stage });
  await invalidateAdminCrmCache();
  return result;
}

export type OpportunityServiceAddressInput = {
  addressStreet1?: string;
  addressStreet2?: string;
  addressCity?: string;
  addressState?: string;
  addressPostcode?: string;
  addressCountry?: string;
  addressLat?: number | null;
  addressLng?: number | null;
};

/** Sync service address on the Opportunity (official field: moradaDeServico). */
export async function updateOpportunityServiceAddress(
  id: string,
  morada: OpportunityServiceAddressInput
) {
  const hasText =
    Boolean(morada.addressStreet1?.trim()) ||
    Boolean(morada.addressCity?.trim()) ||
    Boolean(morada.addressPostcode?.trim());
  if (!hasText && morada.addressLat == null && morada.addressLng == null) {
    return;
  }

  const mutation = `
    mutation updateOppServiceAddress($id: UUID!, $moradaDeServico: AddressObjectInput!) {
      updateOpportunity(id: $id, data: { moradaDeServico: $moradaDeServico }) {
        id
      }
    }
  `;
  const moradaDeServico = {
    addressStreet1: morada.addressStreet1 ?? "",
    addressStreet2: morada.addressStreet2 ?? "",
    addressCity: morada.addressCity ?? "",
    addressState: morada.addressState ?? "",
    addressPostcode: morada.addressPostcode ?? "",
    addressCountry: morada.addressCountry ?? "Portugal",
    addressLat: morada.addressLat ?? null,
    addressLng: morada.addressLng ?? null,
  };
  const result = await crmFetch(mutation, { id, moradaDeServico });
  await invalidateAdminCrmCache();
  return result;
}

export async function updateOpportunityCoordinates(id: string, lat: number, lng: number, existingAddress?: any) {
  const mutation = `
    mutation updateOppCoords($id: UUID!, $moradaDeServico: AddressObjectInput!) {
      updateOpportunity(id: $id, data: { moradaDeServico: $moradaDeServico }) {
        id
      }
    }
  `;
  const moradaInput: any = {
    addressLat: lat,
    addressLng: lng,
  };
  if (existingAddress) {
    if (existingAddress.addressStreet1) moradaInput.addressStreet1 = existingAddress.addressStreet1;
    if (existingAddress.addressStreet2) moradaInput.addressStreet2 = existingAddress.addressStreet2;
    if (existingAddress.addressCity) moradaInput.addressCity = existingAddress.addressCity;
    if (existingAddress.addressState) moradaInput.addressState = existingAddress.addressState;
    if (existingAddress.addressPostcode) moradaInput.addressPostcode = existingAddress.addressPostcode;
    if (existingAddress.addressCountry) moradaInput.addressCountry = existingAddress.addressCountry;
  }
  const result = await crmFetch(mutation, {
    id,
    moradaDeServico: moradaInput,
  });
  await invalidateAdminCrmCache();
  return result;
}

export async function getOpportunityClientRating(opportunityId: string): Promise<number | null> {
  const query = `
    query getOpportunityRating($id: UUID!) {
      opportunities(filter: { id: { eq: $id } }, first: 1) {
        edges {
          node {
            avaliacaoDoCliente
          }
        }
      }
    }
  `;

  const data = await crmFetch<{
    opportunities: { edges: Array<{ node: { avaliacaoDoCliente?: unknown } }> };
  }>(query, { id: opportunityId });

  return parseCrmClientRating(data.opportunities.edges[0]?.node?.avaliacaoDoCliente);
}

export async function submitServiceFeedback(opportunityId: string, rating: number, feedback: string) {
  const mutation = `
    mutation updateFeedback($id: UUID!, $rating: String, $feedback: String) {
      updateOpportunity(id: $id, data: { avaliacaoDoCliente: $rating, feedbackDoCliente: $feedback }) { 
        id 
      }
    }
  `;

  await crmFetch(mutation, {
    id: opportunityId,
    rating: formatCrmClientRating(rating),
    feedback,
  });

  return true;
}

function parseMarkdownTable(markdown: string) {
  const groups: any[] = [];
  const sections = markdown.split(/###\s+\d+\.\s+/);
  
  // Skip the first part (usually the header)
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const titleMatch = section.match(/^(.*?)\(/);
    const type = titleMatch ? titleMatch[1].trim() : "PRODUTO";
    
    // Extract specifications
    const materialMatch = section.match(/\*\*Material\/Modelo:\*\*\s*(.*)/);
    const ralMatch = section.match(/\*\*RAL\/Cor:\*\*\s*(.*)/);
    const activationMatch = section.match(/\*\*Acionamento:\*\*\s*(.*)/);
    
    // Extract Table Rows
    const rows: any[] = [];
    const tableLines = section.split('\n').filter(l => l.includes('|') && !l.includes('---') && !l.toLowerCase().includes('largura'));
    
    tableLines.forEach(line => {
      const cols = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 3) {
        rows.push({
          qty: cols[0],
          width: cols[1].replace('mm', ''),
          height: cols[2].replace('mm', ''),
          fixation: cols[3] || '-',
          controls: cols[4] || '-',
          notes: cols[5] || '-',
          price: cols[6] || '-'
        });
      }
    });

    if (rows.length > 0) {
      groups.push({
        id: `parsed-${i}`,
        type: type.toUpperCase().replace(/\s+/g, '_'),
        details: {
          material: materialMatch ? materialMatch[1].trim() : "",
          ral: ralMatch ? ralMatch[1].trim() : "",
          activation: activationMatch ? activationMatch[1].trim() : ""
        },
        measurements: rows
      });
    }
  }
  return groups.length > 0 ? { groups } : null;
}

export async function fetchPreparationList() {
  const query = `
    query getPrepList {
      opportunities(filter: { stage: { eq: "PREPARACAO" } }, orderBy: { createdAt: DescNullsLast }, first: 100) {
        edges {
          node {
            id
            name
            nsi
            stage
            createdAt
            notasImportantes { markdown }
            servicoitem {
              edges {
                node {
                  id
                  produto
                  largura
                  altura
                  quantidade
                  cor
                  localizacao
                  preparado
                  estadoDoArmazem
                }
              }
            }
            pointOfContact {
              name {
                firstName
                lastName
              }
            }
            taskTargets {
              edges {
                node {
                  task {
                    id
                    status
                    bodyV2 { markdown }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await crmFetch<{ opportunities: { edges: any[] } }>(query);
  
  return data.opportunities.edges.map(edge => {
    const node = edge.node;
    const contact = node.pointOfContact;
    const rawNotes = node.notasImportantes?.markdown || "";
    let measurements = null;
    
    // 1. New: Check for structured items in the Twenty relation first
    const structuredItems = node.servicoitem?.edges || [];
    if (structuredItems.length > 0) {
      const groups: any = {};
      structuredItems.forEach((edge: any) => {
        const item = edge.node;
        const type = item.produto || "PRODUTO";
        
        // Extrair detalhes da string de localização para preencher os campos corretamente
        const loc = item.localizacao || "";
        const extract = (key: string) => {
          const match = loc.match(new RegExp(`${key}: ([^|]+)`));
          return match ? match[1].trim() : null;
        };

        const fixation = extract("Fixação");
        const controls = extract("Comandos");
        const material = extract("Mat");
        const model = extract("Mod");
        const activation = extract("Acion");
        const observations = extract("Obs");
        const local = extract("Local") || loc.split(' | ')[0];

        if (!groups[type]) {
          groups[type] = {
            id: `twenty-${type}`,
            type: type,
            details: { 
              ral: item.cor,
              material: material,
              model: model,
              activation: activation,
              observations: observations
            },
            measurements: []
          };
        }
        groups[type].measurements.push({
          id: item.id,
          qty: item.quantidade,
          width: item.largura,
          height: item.altura,
          notes: local,
          fixation: fixation,
          controls: controls,
          isPrepared: item.preparado,
          estadoDoArmazem: item.estadoDoArmazem && item.estadoDoArmazem.length > 0 ? item.estadoDoArmazem[0] : "EM_PREPARACAO"
        });
      });
      measurements = { groups: Object.values(groups) };
    }

    // 2. Fallback: Try to find structured JSON measurements (Old way)
    if (!measurements) {
      let markdownSource = rawNotes;
      if (!markdownSource.includes('[MEASUREMENTS]')) {
        const taskWithData = node.taskTargets?.edges?.find((e: any) => e.node.task?.bodyV2?.markdown?.includes('[MEASUREMENTS]'));
        if (taskWithData) markdownSource = taskWithData.node.task.bodyV2.markdown;
      }

      if (markdownSource.includes('[MEASUREMENTS]')) {
        try {
          const jsonPart = markdownSource.split('[MEASUREMENTS]')[1].split('\n')[0].trim();
          measurements = JSON.parse(jsonPart);
        } catch (e) {
          try {
            const regex = /\[MEASUREMENTS\](\{.*\})/;
            const match = markdownSource.match(regex);
            if (match) measurements = JSON.parse(match[1]);
          } catch (innerE) {}
        }
      }
    }

    // 3. Last Fallback: Parse the human-readable Markdown table
    if (!measurements && rawNotes.includes('|') && rawNotes.includes('###')) {
      measurements = parseMarkdownTable(rawNotes);
    }

    return {
      id: node.id,
      twentyId: node.id,
      title: node.name,
      nsi: node.nsi || 'N/A',
      createdAt: node.createdAt,
      client: contact ? `${contact.name?.firstName || ''} ${contact.name?.lastName || ''}`.trim() : 'Cliente',
      measurements: measurements,
      rawNotes: rawNotes,
      taskId: node.taskTargets?.edges?.[0]?.node?.task?.id
    };
  });
}
