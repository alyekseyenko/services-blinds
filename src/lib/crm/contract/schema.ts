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
    name: 'Produto',
    queryName: 'produtos',
    mutationCreate: 'createProduto',
    mutationCreateMany: 'createProdutos',
    mutationUpdate: 'updateProduto',
    mutationDelete: 'deleteProduto',
    warehouseStateEnum: 'ProdutoEstadoDoArmazemEnum',
    createInputType: 'ProdutoCreateInput',
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
    serviceNumber: 'numeroDeServico',
    serviceAddress: 'moradaDeServico',
    importantNotes: 'notasImportantes',
    followUpDate: 'dataDeFollowUp',
    reminderDate: 'dataDeLembrete',
    clientAvailability: 'disponibilidadeDoCliente',
    clientRating: 'avaliacaoDoCliente',
    clientFeedback: 'feedbackDoCliente',
    serviceItemsRelation: 'servicoitem',
  },
  task: {
    repairAddress: 'moradaDaReparacao',
    technicianName: 'technicianName',
    scheduledBy: 'scheduledBy',
    clientAvailability: 'disponibilidadeDoCliente',
    body: 'bodyV2',
    scheduleEndAt: 'horaDeFim',
    assistantTechnicianIds: 'equipaAuxiliarIds',
    assistantTechnicianNames: 'equipaAuxiliarNomes',
  },
  address: {
    street1: 'addressStreet1',
    street2: 'addressStreet2',
    city: 'addressCity',
    state: 'addressState',
    postcode: 'addressPostcode',
    country: 'addressCountry',
    lat: 'addressLat',
    lng: 'addressLng',
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
    /** Custom measurement fields (Twenty metadata — see docs/TWENTY_PRODUTO_MEDICOES_FIELDS.md) */
    division: 'divisao',
    fixation: 'fixacao',
    controls: 'comandos',
    material: 'material',
    materialOther: 'materialOutro',
    model: 'modelo',
    ralColor: 'ralCor',
    fabric: 'tecido',
    reference: 'referencia',
    activation: 'acionamento',
    productObservations: 'observacoesProduto',
    measurementGroupId: 'grupoMedicaoId',
    price: 'preco',
    /** URL para ficha de medições na app (Twenty LINKS field) */
    appLink: 'linkAppTecnicos',
  },
  auth: {
    email: 'email',
    password: 'password',
    role: 'appRole',
    active: 'ativo',
    name: 'name',
  },
  person: {
    morada: 'morada',
    nif: 'nif',
    quickNotes: 'observacoesRapidas',
    companyId: 'companyId',
    /** Twenty `PersonTipoDeClienteEnum` (MULTI_SELECT → lista com um valor). */
    clientType: 'tipoDeCliente',
  },
} as const;

/** Values for `CRM_FIELDS.person.clientType` / `PersonTipoDeClienteEnum`. */
export const CRM_PERSON_CLIENT_TYPES = {
  EMPRESA: 'EMPRESA',
  PARTICULAR: 'PARTICULAR',
} as const;

/** GraphQL sub-selection for Twenty `Address` composite fields. */
export const CRM_ADDRESS_GRAPHQL_FIELDS = `
  addressStreet1
  addressStreet2
  addressCity
  addressState
  addressPostcode
  addressCountry
  addressLat
  addressLng
`;

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
export const CRM_TASK_CLIENT_AVAILABILITY = {
  AWAITING_RESPONSE: 'CLIENTE_NAO_RESPONDEU',
  CLIENT_CAN: 'CLIENTE_PODE',
  CLIENT_CANNOT: 'CLIENTE_NAO_PODE',
} as const;

export const CRM_TASK_STATUS = {
  POR_AGENDAR: 'POR_AGENDAR',
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
