/**
 * CRM CONTRACT LAYER
 * 
 * Única fonte de verdade (Single Source of Truth) para o esquema, nomes de objetos,
 * campos customizados, etapas (stages) e estados de tarefas do Twenty CRM.
 * 
 * Se no futuro alguma tabela, campo ou enum mudar no Twenty CRM, APENAS este ficheiro
 * precisará de ser atualizado.
 */

// ==========================================
// 1. OBJETOS E TABELAS DO TWENTY CRM
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
// 2. CAMPOS CUSTOMIZADOS (CUSTOM FIELDS)
// ==========================================
export const CRM_FIELDS = {
  opportunity: {
    nsi: 'nsi',
    serviceType: 'tipoDeServico',
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
// 3. MÁQUINA DE ESTADOS / ETAPAS (STAGES)
// ==========================================
export const CRM_STAGES = {
  ENTRADA: 'ENTRADA',
  TIRAR_MEDIDAS: 'TIRAR_MEDIDAS',
  ORCAMENTAR: 'ORCAMENTAR',
  PROPOSTA: 'PROPOSTA',
  PAGAMENTO_30: 'PAGAMENTO_30',
  ENCOMENDA: 'ENCOMENDA',
  PREPARACAO: 'PREPARACAO',
  MARCAR_INSTALACAO: 'MARCAR_INSTALACAO',
  AGENDAR_INSTALACAO: 'AGENDAR_INSTALACAO', // Suporte legado/alias
  INSTALACAO: 'INSTALACAO',
  PAGAMENTO_TOTAL: 'PAGAMENTO_TOTAL',
  CONCLUIDO: 'CONCLUIDO',
} as const;

export type CRMStage = typeof CRM_STAGES[keyof typeof CRM_STAGES];

// ==========================================
// 4. ESTADOS DE TAREFA (TASK STATUS)
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
// 5. ESTADOS DO ARMAZÉM (WAREHOUSE STATUS)
// ==========================================
export const WAREHOUSE_STATUS = {
  EM_PREPARACAO: 'EM_PREPARACAO',
  PREPARADO: 'PREPARADO',
  PROBLEMAS: 'PROBLEMAS',
  FALTA_DE_MATERIAL: 'FALTA_DE_MATERIAL',
} as const;

export type WarehouseStatus = typeof WAREHOUSE_STATUS[keyof typeof WAREHOUSE_STATUS];

// ==========================================
// 6. AGRUPAMENTOS E REGRAS DE NEGÓCIO
// ==========================================
export const STAGE_GROUPS = {
  /** Estágios que requerem agendamento de visita no Admin */
  NEEDS_SCHEDULING: [
    CRM_STAGES.ENTRADA,
    CRM_STAGES.TIRAR_MEDIDAS,
    CRM_STAGES.MARCAR_INSTALACAO,
    CRM_STAGES.AGENDAR_INSTALACAO,
  ] as string[],

  /** Estágios relacionados a medição / remedição */
  MEASUREMENT: [
    CRM_STAGES.ENTRADA,
    CRM_STAGES.TIRAR_MEDIDAS,
  ] as string[],

  /** Estágios relacionados a instalação / montagem */
  INSTALLATION: [
    CRM_STAGES.MARCAR_INSTALACAO,
    CRM_STAGES.AGENDAR_INSTALACAO,
    CRM_STAGES.INSTALACAO,
  ] as string[],

  /** Estágios que tornam uma tarefa de medição antiga obsoleta */
  OBSOLETE_AFTER_MEASUREMENT: [
    CRM_STAGES.ORCAMENTAR,
    CRM_STAGES.PROPOSTA,
    CRM_STAGES.PAGAMENTO_30,
    CRM_STAGES.ENCOMENDA,
    CRM_STAGES.PREPARACAO,
    CRM_STAGES.MARCAR_INSTALACAO,
    CRM_STAGES.AGENDAR_INSTALACAO,
    CRM_STAGES.INSTALACAO,
    CRM_STAGES.PAGAMENTO_TOTAL,
    CRM_STAGES.CONCLUIDO,
  ] as string[],

  /** Estágios que tornam uma tarefa de instalação obsoleta/concluída */
  OBSOLETE_AFTER_INSTALLATION: [
    CRM_STAGES.PAGAMENTO_TOTAL,
    CRM_STAGES.CONCLUIDO,
  ] as string[],
} as const;

// ==========================================
// 7. FUNÇÕES UTILITÁRIAS E CONTRATOS PUROS
// ==========================================

/**
 * Normaliza qualquer texto de stage/status removendo acentos e convertendo para uppercase.
 */
export function normalizeString(str?: string | null): string {
  return (str || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Normaliza status de tarefa: maiúsculas, sem acentos, espaços → underscore (EM CURSO = EM_CURSO). */
export function normalizeTaskStatus(status?: string | null): string {
  return normalizeString(status).replace(/\s+/g, '_');
}

/**
 * Converte status interno para o token do enum no Twenty CRM.
 * Valores válidos no CRM: AGENDADO, EM_CURSO, CONCLUIDO, INCOMPLETO, CANCELADO, ...
 */
export function toTwentyTaskStatus(status: string): string {
  return normalizeTaskStatus(status);
}

/** Tarefa ainda activa na agenda do técnico (Agendado ou Em Curso). */
export function isTaskActive(status?: string | null): boolean {
  const s = normalizeTaskStatus(status);
  return s === CRM_TASK_STATUS.AGENDADO || s === CRM_TASK_STATUS.EM_CURSO;
}

/** Técnico já chegou ao local — visita em curso. */
export function isTaskInProgress(status?: string | null): boolean {
  return normalizeTaskStatus(status) === CRM_TASK_STATUS.EM_CURSO;
}

// ==========================================
// 7b. ROLES TWENTY CRM → APP TÉCNICOS
// ==========================================
export const TWENTY_ROLE_LABELS = {
  ADMIN: 'Admin',
  MEMBER: 'Member',
  TECHNICIANS: 'Técnicos',
  CEO: 'CEO',
  WAREHOUSE: 'Armazem',
} as const;

export type AppRole = 'admin' | 'technician' | 'warehouse' | 'ceo';

export const TWENTY_ROLE_TO_APP_ROLE: Record<string, AppRole> = {
  ADMIN: 'admin',
  // Twenty "Member" is a CRM default role — not app admin (no CEO/SRE/admin panel).
  TECNICOS: 'technician',
  TECNICO: 'technician',
  CEO: 'ceo',
  ARMAZEM: 'warehouse',
};

export const APP_ROLE_HOME: Record<AppRole, string> = {
  admin: '/admin',
  technician: '/dashboard',
  warehouse: '/armazem',
  ceo: '/ceo',
};

/**
 * Converte o label de role do Twenty CRM para a role interna da app.
 */
export function mapTwentyRoleLabelToAppRole(label: string): AppRole | null {
  const normalized = normalizeString(label);
  return TWENTY_ROLE_TO_APP_ROLE[normalized] ?? null;
}

/**
 * Verifica se o status de uma tarefa ou oportunidade representa "Concluído"
 */
export function isTaskCompleted(status?: string | null): boolean {
  const s = normalizeString(status);
  return s === CRM_TASK_STATUS.CONCLUIDO || s === CRM_TASK_STATUS.DONE;
}

/**
 * Verifica se o status de uma tarefa ou oportunidade representa "Cancelado"
 */
export function isTaskCancelled(status?: string | null): boolean {
  const s = normalizeString(status);
  return s === CRM_TASK_STATUS.CANCELADO;
}

/**
 * Verifica se uma oportunidade/tarefa é do tipo Medição ou Remedição
 */
export function isMeasurementService(stage?: string | null, serviceTypes?: string[] | string | null, title?: string | null): boolean {
  const normStage = normalizeString(stage);
  const normTitle = normalizeString(title);
  
  const types: string[] = [];
  if (Array.isArray(serviceTypes)) {
    types.push(...serviceTypes.map(normalizeString));
  } else if (typeof serviceTypes === 'string') {
    types.push(normalizeString(serviceTypes));
  }

  const isRemed = normStage.includes('REMED') || types.some(t => t.includes('REMED'));
  const isMedicaoType = types.some(t => t === 'TIRAR_MEDIDAS' || t === 'MEDICAO');
  const isMedicaoTitle = normTitle.includes('MEDIDA') || normTitle.includes('MEDICAO');
  const isMedicaoStage = STAGE_GROUPS.MEASUREMENT.includes(normStage);

  return isRemed || isMedicaoType || isMedicaoTitle || isMedicaoStage;
}

/**
 * Verifica se uma oportunidade/tarefa é do tipo Instalação / Montagem
 */
export function isInstallationService(stage?: string | null, serviceTypes?: string[] | string | null, title?: string | null): boolean {
  const normStage = normalizeString(stage);
  const normTitle = normalizeString(title);
  
  const types: string[] = [];
  if (Array.isArray(serviceTypes)) {
    types.push(...serviceTypes.map(normalizeString));
  } else if (typeof serviceTypes === 'string') {
    types.push(normalizeString(serviceTypes));
  }

  const isInstType = types.some(t => t === 'INSTALACAO' || t === 'MONTAGEM');
  const isInstTitle = normTitle.includes('INSTALACAO') || normTitle.includes('MONTAGEM');
  const isInstStage = STAGE_GROUPS.INSTALLATION.includes(normStage);

  return isInstType || isInstTitle || isInstStage;
}

/**
 * Calcula a próxima etapa lógica ao agendar uma visita técnica no Admin
 */
export function getNextStageOnSchedule(currentStage?: string | null, serviceTypes?: string[] | string | null): string {
  const stage = currentStage || '';
  const stageNorm = normalizeString(stage);

  const types: string[] = [];
  if (Array.isArray(serviceTypes)) {
    types.push(...serviceTypes.map(normalizeString));
  } else if (typeof serviceTypes === 'string') {
    types.push(normalizeString(serviceTypes));
  }

  // Se for remedição, mantém o estágio atual
  if (stageNorm.includes('REMED') || types.some(t => t.includes('REMED'))) {
    return stage;
  }

  // Se estiver em ENTRADA, avança para TIRAR_MEDIDAS
  if (stageNorm === CRM_STAGES.ENTRADA) {
    return CRM_STAGES.TIRAR_MEDIDAS;
  }

  // Se estiver em MARCAR_INSTALACAO ou AGENDAR_INSTALACAO, avança para INSTALACAO
  if (stageNorm === CRM_STAGES.MARCAR_INSTALACAO || stageNorm === CRM_STAGES.AGENDAR_INSTALACAO) {
    return CRM_STAGES.INSTALACAO;
  }

  return stage;
}
