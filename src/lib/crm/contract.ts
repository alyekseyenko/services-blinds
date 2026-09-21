/**
 * CRM CONTRACT LAYER
 *
 * Single source of truth for Twenty CRM schema, custom fields, stages, and task statuses.
 */

// ==========================================
// 1. CRM OBJECTS
// ==========================================
export const CRM_OBJECTS = {
  opportunity: {
    name: 'Opportunity',
    queryName: 'opportunities',
    mutationCreate: 'createOpportunity',
    mutationUpdate: 'updateOpportunity',
    mutationDelete: 'deleteOpportunity',
  },
  task: {
    name: 'Task',
    queryName: 'tasks',
    mutationCreate: 'createTask',
    mutationUpdate: 'updateTask',
    mutationDelete: 'deleteTask',
  },
  taskTarget: {
    name: 'TaskTarget',
    queryName: 'taskTargets',
    mutationCreate: 'createTaskTarget',
  },
  serviceItem: {
    name: 'Itemdeservico',
    queryName: 'itemdeservicos',
    mutationCreate: 'createItemdeservico',
    mutationCreateMany: 'createItemdeservicos',
    mutationUpdate: 'updateItemdeservico',
    mutationDelete: 'deleteItemdeservico',
  },
  note: {
    name: 'Note',
    queryName: 'notes',
    mutationCreate: 'createNote',
    mutationUpdate: 'updateNote',
  },
  noteTarget: {
    name: 'NoteTarget',
    queryName: 'noteTargets',
    mutationCreate: 'createNoteTarget',
  },
  workspaceMember: {
    name: 'WorkspaceMember',
    queryName: 'workspaceMembers',
  },
} as const;

// ==========================================
// 2. CUSTOM FIELDS
// ==========================================
export const CRM_FIELDS = {
  opportunity: {
    nsi: 'nsi',
    serviceAddress: 'moradaDeServico',
    importantNotes: 'notasImportantes',
    clientRating: 'avaliacaoDoCliente',
    clientFeedback: 'feedbackDoCliente',
    serviceItemsRelation: 'servicoitem',
  },
  task: {
    repairAddress: 'moradaDaReparacao',
    technicianName: 'technicianName',
    scheduledBy: 'scheduledBy',
    body: 'bodyV2',
  },
  serviceItem: {
    opportunityRelationId: 'servicoitemId',
    product: 'produto',
    width: 'largura',
    height: 'altura',
    quantity: 'quantidade',
    color: 'cor',
    location: 'localizacao',
    prepared: 'preparado',
    warehouseState: 'estadoDoArmazem',
  },
  auth: {
    email: 'email',
    password: 'password',
    role: 'appRole',
    active: 'ativo',
    name: 'name',
  },
} as const;

// ==========================================
// 3. PIPELINE STAGES
// ==========================================
export const CRM_STAGES = {
  ENTRADA: 'ENTRADA',
  TIRAR_MEDIDAS: 'TIRAR_MEDIDAS',
  REMEDICAO: 'REMEDICAO',
  ORCAMENTAR: 'ORCAMENTAR',
  PROPOSTA: 'PROPOSTA',
  MANUTENCAO: 'MANUTENCAO',
  REPARACAO: 'REPARACAO',
  PAGAMENTO_30: 'PAGAMENTO_30',
  ENCOMENDA: 'ENCOMENDA',
  PREPARACAO: 'PREPARACAO',
  MARCAR_INSTALACAO: 'MARCAR_INSTALACAO',
  AGENDAR_INSTALACAO: 'AGENDAR_INSTALACAO',
  INSTALACAO: 'INSTALACAO',
  PAGAMENTO_TOTAL: 'PAGAMENTO_TOTAL',
  CONCLUIDO: 'CONCLUIDO',
} as const;

export type CRMStage = typeof CRM_STAGES[keyof typeof CRM_STAGES];

export type OpportunityWorkflow =
  | 'installation'
  | 'measurement'
  | 'maintenance'
  | 'repair'
  | 'other';

// ==========================================
// 4. TASK STATUS
// ==========================================
export const CRM_TASK_STATUS = {
  AGENDADO: 'AGENDADO',
  EM_CURSO: 'EM_CURSO',
  CONCLUIDO: 'CONCLUIDO',
  INCOMPLETO: 'INCOMPLETO',
  CANCELADO: 'CANCELADO',
  DONE: 'DONE',
} as const;

export type CRMTaskStatus = typeof CRM_TASK_STATUS[keyof typeof CRM_TASK_STATUS];

// ==========================================
// 5. WAREHOUSE STATUS
// ==========================================
export const WAREHOUSE_STATUS = {
  EM_PREPARACAO: 'EM_PREPARACAO',
  PREPARADO: 'PREPARADO',
  PROBLEMAS: 'PROBLEMAS',
  FALTA_DE_MATERIAL: 'FALTA_DE_MATERIAL',
} as const;

export type WarehouseStatus = typeof WAREHOUSE_STATUS[keyof typeof WAREHOUSE_STATUS];

// ==========================================
// 6. STAGE GROUPS
// ==========================================
export const STAGE_GROUPS = {
  NEEDS_SCHEDULING: [
    CRM_STAGES.ENTRADA,
    CRM_STAGES.TIRAR_MEDIDAS,
    CRM_STAGES.REMEDICAO,
    CRM_STAGES.MANUTENCAO,
    CRM_STAGES.REPARACAO,
    CRM_STAGES.MARCAR_INSTALACAO,
    CRM_STAGES.AGENDAR_INSTALACAO,
  ] as string[],

  MEASUREMENT: [CRM_STAGES.ENTRADA, CRM_STAGES.TIRAR_MEDIDAS, CRM_STAGES.REMEDICAO] as string[],

  ASSISTANCE: [CRM_STAGES.MANUTENCAO, CRM_STAGES.REPARACAO] as string[],

  INSTALLATION: [
    CRM_STAGES.MARCAR_INSTALACAO,
    CRM_STAGES.AGENDAR_INSTALACAO,
    CRM_STAGES.INSTALACAO,
  ] as string[],

  OBSOLETE_AFTER_MEASUREMENT: [
    CRM_STAGES.ORCAMENTAR,
    CRM_STAGES.PROPOSTA,
    CRM_STAGES.PAGAMENTO_30,
    CRM_STAGES.ENCOMENDA,
    CRM_STAGES.PREPARACAO,
    CRM_STAGES.MARCAR_INSTALACAO,
    CRM_STAGES.AGENDAR_INSTALACAO,
    CRM_STAGES.INSTALACAO,
    CRM_STAGES.MANUTENCAO,
    CRM_STAGES.REPARACAO,
    CRM_STAGES.PAGAMENTO_TOTAL,
    CRM_STAGES.CONCLUIDO,
  ] as string[],

  OBSOLETE_AFTER_INSTALLATION: [CRM_STAGES.PAGAMENTO_TOTAL, CRM_STAGES.CONCLUIDO] as string[],

  OBSOLETE_AFTER_ASSISTANCE: [CRM_STAGES.PAGAMENTO_TOTAL, CRM_STAGES.CONCLUIDO] as string[],
} as const;

// ==========================================
// 7. UTILITIES
// ==========================================
export function normalizeString(str?: string | null): string {
  return (str || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function normalizeTaskStatus(status?: string | null): string {
  return normalizeString(status).replace(/\s+/g, '_');
}

export function toTwentyTaskStatus(status: string): string {
  return normalizeTaskStatus(status);
}

export function isTaskActive(status?: string | null): boolean {
  const s = normalizeTaskStatus(status);
  return s === CRM_TASK_STATUS.AGENDADO || s === CRM_TASK_STATUS.EM_CURSO;
}

export function isTaskInProgress(status?: string | null): boolean {
  return normalizeTaskStatus(status) === CRM_TASK_STATUS.EM_CURSO;
}

export const TWENTY_ROLE_LABELS = {
  ADMIN: 'Admin',
  MEMBER: 'Member',
  TECHNICIANS: 'Técnicos',
  CEO: 'CEO',
  WAREHOUSE: 'Armazem',
} as const;

export type AppRole = 'admin' | 'member' | 'technician' | 'warehouse' | 'ceo';

export const TWENTY_ROLE_TO_APP_ROLE: Record<string, AppRole> = {
  ADMIN: 'admin',
  MEMBER: 'member',
  TECNICOS: 'technician',
  TECNICO: 'technician',
  CEO: 'ceo',
  ARMAZEM: 'warehouse',
};

export const APP_ROLE_HOME: Record<AppRole, string> = {
  admin: '/admin',
  member: '/admin',
  technician: '/dashboard',
  warehouse: '/armazem',
  ceo: '/ceo',
};

export function mapTwentyRoleLabelToAppRole(label: string): AppRole | null {
  const normalized = normalizeString(label);
  return TWENTY_ROLE_TO_APP_ROLE[normalized] ?? null;
}

export function isTaskCompleted(status?: string | null): boolean {
  const s = normalizeString(status);
  return s === CRM_TASK_STATUS.CONCLUIDO || s === CRM_TASK_STATUS.DONE;
}

export function isTaskCancelled(status?: string | null): boolean {
  const s = normalizeString(status);
  return s === CRM_TASK_STATUS.CANCELADO;
}

export function isRemediationStage(stage?: string | null): boolean {
  const normStage = normalizeString(stage);
  return normStage === CRM_STAGES.REMEDICAO || normStage.includes('REMED');
}

/** True when an opportunity should appear on the admin scheduling map / drawer. */
export function isNeedsSchedulingStage(stage?: string | null): boolean {
  const stageNorm = normalizeString(stage);
  return STAGE_GROUPS.NEEDS_SCHEDULING.includes(stageNorm) || isRemediationStage(stageNorm);
}

export function isMaintenanceService(stage?: string | null, title?: string | null): boolean {
  const normStage = normalizeString(stage);
  const normTitle = normalizeString(title);
  return normStage === CRM_STAGES.MANUTENCAO || normTitle.includes('MANUTENCAO');
}

export function isRepairService(stage?: string | null, title?: string | null): boolean {
  const normStage = normalizeString(stage);
  const normTitle = normalizeString(title);
  return normStage === CRM_STAGES.REPARACAO || normTitle.includes('REPARACAO');
}

export function isAssistanceService(stage?: string | null, title?: string | null): boolean {
  return isMaintenanceService(stage, title) || isRepairService(stage, title);
}

export function isMeasurementService(stage?: string | null, title?: string | null): boolean {
  const normStage = normalizeString(stage);
  const normTitle = normalizeString(title);
  if (isAssistanceService(normStage, normTitle)) return false;
  if (isRemediationStage(normStage)) return true;
  if (normTitle.includes('MEDIDA') || normTitle.includes('MEDICAO')) return true;
  return STAGE_GROUPS.MEASUREMENT.includes(normStage);
}

export function isInstallationService(stage?: string | null, title?: string | null): boolean {
  const normStage = normalizeString(stage);
  const normTitle = normalizeString(title);
  if (isAssistanceService(normStage, normTitle)) return false;
  if (normTitle.includes('INSTALACAO') || normTitle.includes('MONTAGEM')) return true;
  return STAGE_GROUPS.INSTALLATION.includes(normStage);
}

export function classifyOpportunityWorkflow(
  stage?: string | null,
  title?: string | null
): OpportunityWorkflow {
  if (isInstallationService(stage, title)) return 'installation';
  if (isMaintenanceService(stage, title)) return 'maintenance';
  if (isRepairService(stage, title)) return 'repair';
  if (isMeasurementService(stage, title)) return 'measurement';
  return 'other';
}

/** Marker / badge key used by map colors and technician UI. */
export function deriveWorkflowMarkerKey(stage?: string | null, title?: string | null): string {
  const workflow = classifyOpportunityWorkflow(stage, title);
  if (workflow === 'installation') return CRM_STAGES.INSTALACAO;
  if (workflow === 'maintenance') return CRM_STAGES.MANUTENCAO;
  if (workflow === 'repair') return CRM_STAGES.REPARACAO;
  if (workflow === 'measurement') {
    return isRemediationStage(stage) ? CRM_STAGES.REMEDICAO : CRM_STAGES.TIRAR_MEDIDAS;
  }
  return 'GERAL';
}

export function getFallbackStageOnIncompleteWorkflow(workflow: OpportunityWorkflow): string {
  switch (workflow) {
    case 'installation':
      return CRM_STAGES.MARCAR_INSTALACAO;
    case 'maintenance':
      return CRM_STAGES.MANUTENCAO;
    case 'repair':
      return CRM_STAGES.REPARACAO;
    case 'measurement':
    default:
      return CRM_STAGES.ENTRADA;
  }
}

export function getCompletionStageForWorkflow(workflow: OpportunityWorkflow): string | null {
  switch (workflow) {
    case 'installation':
    case 'maintenance':
    case 'repair':
      return CRM_STAGES.PAGAMENTO_TOTAL;
    case 'measurement':
      return CRM_STAGES.ORCAMENTAR;
    default:
      return null;
  }
}

/** Next pipeline stage when admin schedules a field visit. */
export function getNextStageOnSchedule(currentStage?: string | null): string {
  const stageNorm = normalizeString(currentStage);

  if (isRemediationStage(stageNorm)) {
    return currentStage || CRM_STAGES.REMEDICAO;
  }

  if (stageNorm === CRM_STAGES.ENTRADA) {
    return CRM_STAGES.TIRAR_MEDIDAS;
  }

  if (stageNorm === CRM_STAGES.MARCAR_INSTALACAO || stageNorm === CRM_STAGES.AGENDAR_INSTALACAO) {
    return CRM_STAGES.INSTALACAO;
  }

  return currentStage || stageNorm;
}

/** Maps legacy `tipoDeServico` values to stages (migration helper). */
export function mapLegacyServiceTypeToStage(
  serviceTypes: string[] | string | null | undefined,
  currentStage?: string | null
): string | null {
  const types: string[] = [];
  if (Array.isArray(serviceTypes)) {
    types.push(...serviceTypes.map(normalizeString));
  } else if (typeof serviceTypes === 'string') {
    types.push(normalizeString(serviceTypes));
  }
  if (types.length === 0) return null;

  const primary = types[0];
  const stageNorm = normalizeString(currentStage);

  if (primary === 'MANUTENCAO') return CRM_STAGES.MANUTENCAO;
  if (primary === 'REPARACAO') return CRM_STAGES.REPARACAO;
  if (primary === 'REMEDICAO' || primary === 'REAGENDAR') {
    return isRemediationStage(stageNorm) ? currentStage || CRM_STAGES.REMEDICAO : CRM_STAGES.REMEDICAO;
  }
  if (primary === 'TIRAR_MEDIDAS' && stageNorm === CRM_STAGES.ENTRADA) {
    return CRM_STAGES.TIRAR_MEDIDAS;
  }
  if (primary === 'INSTALACAO') {
    const installPrepStages: string[] = [
      CRM_STAGES.PROPOSTA,
      CRM_STAGES.PAGAMENTO_30,
      CRM_STAGES.ENCOMENDA,
    ];
    if (installPrepStages.includes(stageNorm)) {
      return CRM_STAGES.MARCAR_INSTALACAO;
    }
  }

  return null;
}
