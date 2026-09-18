"use server";
import { crmFetch } from './client';
import { 
  CRM_STAGES, 
  CRM_TASK_STATUS, 
  STAGE_GROUPS, 
  normalizeString,
  normalizeTaskStatus,
  isTaskActive,
  isTaskCompleted, 
  isTaskCancelled, 
  isMeasurementService,
  isInstallationService,
  isAssistanceService,
  deriveWorkflowMarkerKey,
} from './contract';
import {
  ADMIN_HISTORY_PAGE_SIZE,
  ADMIN_PIPELINE_FETCH_LIMIT,
  isTerminalHistoryStatus,
  sortOpportunitiesByRecentDate,
} from './dateFilters';
import {
  CRM_CACHE_KEYS,
  DEFAULT_TTL_SEC,
  adminHistoryPageCacheKey,
  cacheGet,
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
    addressStreet1
    addressCity
    addressLat
    addressLng
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
        }
      }
    }
  }
`;

const ADMIN_PIPELINE_STAGES = [
  CRM_STAGES.ENTRADA,
  CRM_STAGES.TIRAR_MEDIDAS,
  CRM_STAGES.REMEDICAO,
  CRM_STAGES.PROPOSTA,
  CRM_STAGES.MANUTENCAO,
  CRM_STAGES.REPARACAO,
  CRM_STAGES.MARCAR_INSTALACAO,
  CRM_STAGES.AGENDAR_INSTALACAO,
  CRM_STAGES.PREPARACAO,
  CRM_STAGES.INSTALACAO,
] as const;

const ADMIN_HISTORY_STAGES = [
  CRM_STAGES.CONCLUIDO,
  CRM_STAGES.PAGAMENTO_TOTAL,
  "CANCELADO",
] as const;

async function fetchAdminOpportunitiesFromCrm() {
  const batches = await Promise.all(
    ADMIN_PIPELINE_STAGES.map((stage) => fetchOpportunities(stage))
  );

  const merged = new Map<string, ReturnType<typeof mapOpportunityNode>>();
  batches.flat().forEach((opp) => {
    merged.set(opp.twentyId, opp);
  });

  return Array.from(merged.values());
}

async function fetchAdminHistoryOpportunitiesFromCrm() {
  const batches = await Promise.all(
    ADMIN_HISTORY_STAGES.map((stage) => fetchOpportunities(stage))
  );

  const merged = new Map<string, ReturnType<typeof mapOpportunityNode>>();
  batches.flat().forEach((opp) => {
    merged.set(opp.twentyId, opp);
  });

  return Array.from(merged.values());
}

export async function fetchAdminOpportunities() {
  const cached = await cacheGet<ReturnType<typeof mapOpportunityNode>[]>(
    CRM_CACHE_KEYS.adminOpportunities
  );
  if (cached) return cached;

  const result = await fetchAdminOpportunitiesFromCrm();
  await cacheSet(CRM_CACHE_KEYS.adminOpportunities, result, DEFAULT_TTL_SEC);
  return result;
}

export async function fetchAdminHistoryOpportunities() {
  const cached = await cacheGet<ReturnType<typeof mapOpportunityNode>[]>(
    CRM_CACHE_KEYS.adminHistory
  );
  if (cached) return cached;

  const result = await fetchAdminHistoryOpportunitiesFromCrm();
  await cacheSet(CRM_CACHE_KEYS.adminHistory, result, DEFAULT_TTL_SEC);
  return result;
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
  const cached = await cacheGet<AdminHistoryPageResult>(cacheKey);
  if (cached) return cached;

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

  await cacheSet(cacheKey, result, DEFAULT_TTL_SEC);
  return result;
}

function mapOpportunityNode(node: any) {
  const contact = node.pointOfContact;
  const allTasks = node.taskTargets?.edges?.map((e: any) => e.node?.task).filter(Boolean) || [];

  const taskStatusPriority = (status: string) => {
    const s = normalizeTaskStatus(status);
    if (s === CRM_TASK_STATUS.AGENDADO) return 5;
    if (s === "POR_AGENDAR") return 4;
    if (s === CRM_TASK_STATUS.EM_CURSO) return 4;
    if (s === CRM_TASK_STATUS.INCOMPLETO) return 3;
    if (s === CRM_TASK_STATUS.CONCLUIDO || s === CRM_TASK_STATUS.DONE) return 2;
    return 1;
  };

  const task = [...allTasks].sort((a, b) => taskStatusPriority(b.status) - taskStatusPriority(a.status))[0] || null;

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

  return {
    id: node.id,
    twentyId: node.id,
    title: node.name,
    stage: node.stage,
    status: computedStatus,
    dueDate: node.createdAt,
    address: [node.moradaDeServico?.addressStreet1, node.moradaDeServico?.addressCity].filter(Boolean).join(", ") || "N/A",
    addressCity: node.moradaDeServico?.addressCity || "Outros",
    coordinates: node.moradaDeServico?.addressLat ? [node.moradaDeServico.addressLat, node.moradaDeServico.addressLng] : null,
    rawAddress: node.moradaDeServico,
    pointOfContactId: contact?.id,
    pointOfContactEmail: contact?.emails?.primaryEmail,
    pointOfContactPhone: contact?.phones?.primaryPhoneNumber
      ? `${contact.phones.primaryPhoneCallingCode || ""} ${contact.phones.primaryPhoneNumber}`.trim()
      : null,
    client: contact ? `${contact.name?.firstName || ""} ${contact.name?.lastName || ""}`.trim() : "Cliente",
    hasScheduledTask: !!task && isTaskActive(task.status) && !isTaskObsolete,
    taskStatus: isTaskObsolete ? "CONCLUIDO" : task?.status,
    taskId: task?.id,
    scheduledAt: isTaskObsolete ? null : task?.dueAt,
    technician: isTaskObsolete ? "Não Atribuído" : task?.technicianName || "Não Atribuído",
    technicianId: isTaskObsolete ? null : task?.assigneeId,
    scheduledBy: isTaskObsolete ? undefined : task?.scheduledBy || undefined,
    nsi: node.nsi || "N/A",
    serviceType: deriveWorkflowMarkerKey(node.stage, node.name),
  };
}

export async function fetchOpportunities(
  stageFilter: string | null = null,
  first: number = ADMIN_PIPELINE_FETCH_LIMIT
) {
  const query = stageFilter
    ? `
      query getOppsWithFilter($stage: OpportunityStageEnum!, $first: Int!) {
        opportunities(orderBy: { createdAt: DescNullsLast }, first: $first, filter: { stage: { eq: $stage } }) {
          edges {
            node {
              ${OPPORTUNITY_ADMIN_NODE_FIELDS}
            }
          }
        }
      }
    `
    : `
      query getOpps {
        opportunities(orderBy: { createdAt: DescNullsLast }) {
          edges {
            node {
              ${OPPORTUNITY_ADMIN_NODE_FIELDS}
            }
          }
        }
      }
    `;

  const variables = stageFilter ? { stage: stageFilter, first } : {};
  const data = await crmFetch<{ opportunities: { edges: any[] } }>(query, variables, {
    timeoutMs: 8000,
    maxRetries: 1,
  });
  
  return data.opportunities.edges.map((edge) => mapOpportunityNode(edge.node));
}

export async function updateOpportunityStage(id: string, stage: string) {
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
    opportunities: { edges: Array<{ node: { avaliacaoDoCliente?: number | null } }> };
  }>(query, { id: opportunityId });

  const rating = data.opportunities.edges[0]?.node?.avaliacaoDoCliente;
  return typeof rating === "number" ? rating : null;
}

export async function submitServiceFeedback(opportunityId: string, rating: number, feedback: string) {
  const mutation = `
    mutation updateFeedback($id: UUID!, $rating: Int, $feedback: String) {
      updateOpportunity(id: $id, data: { avaliacaoDoCliente: $rating, feedbackDoCliente: $feedback }) { 
        id 
      }
    }
  `;
  
  await crmFetch(mutation, { 
    id: opportunityId, 
    rating: parseInt(rating.toString()), 
    feedback 
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
