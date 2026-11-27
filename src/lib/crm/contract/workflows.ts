import { CRM_STAGES, STAGE_GROUPS, type OpportunityWorkflow } from "./schema";
import { isTaskActive, normalizeString } from "./tasks";

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
  if (
    normTitle.includes('MEDIDA') ||
    normTitle.includes('MEDICAO') ||
    normTitle.includes('MDIDA')
  ) {
    return true;
  }
  return STAGE_GROUPS.MEASUREMENT.includes(normStage);
}

/** Visita já fechada que ainda deve abrir a ficha (etapa passou a orçamentar, ou o nome é «mdidas»). */
export function closedVisitCanOpenMeasurementSheet(input: {
  status?: string | null;
  stage?: string | null;
  title?: string | null;
  name?: string | null;
  serviceType?: string | null;
}): boolean {
  if (isTaskActive(input.status)) return false;
  const type = normalizeString(input.serviceType);
  if (type === 'TIRAR_MEDIDAS' || type === 'REMEDICAO') return true;
  if (isMeasurementService(input.stage, input.title)) return true;
  if (isMeasurementService(input.stage, input.name)) return true;
  if (isMeasurementService(input.stage, input.serviceType)) return true;
  const stage = normalizeString(input.stage);
  return stage === CRM_STAGES.ORCAMENTAR;
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
  const stageNorm = normalizeString(stage);
  // CRM stage wins over opportunity title (e.g. "Instalação — Cliente" while still TIRAR_MEDIDAS).
  if (STAGE_GROUPS.INSTALLATION.includes(stageNorm)) return 'installation';
  if (STAGE_GROUPS.MEASUREMENT.includes(stageNorm) || isRemediationStage(stageNorm)) {
    return 'measurement';
  }
  if (stageNorm === CRM_STAGES.MANUTENCAO) return 'maintenance';
  if (stageNorm === CRM_STAGES.REPARACAO) return 'repair';

  if (isInstallationService(stage, title)) return 'installation';
  if (isMaintenanceService(stage, title)) return 'maintenance';
  if (isRepairService(stage, title)) return 'repair';
  if (isMeasurementService(stage, title)) return 'measurement';
  return 'other';
}

/** Pipeline classification when a field visit is closed (task title reflects real work). */
export function classifyOpportunityWorkflowOnTaskClose(
  stage?: string | null,
  opportunityName?: string | null,
  taskTitle?: string | null
): OpportunityWorkflow {
  const taskNorm = normalizeString(taskTitle);
  if (
    taskNorm.includes("TIRAR") &&
    (taskNorm.includes("MEDIDA") || taskNorm.includes("MEDICAO"))
  ) {
    return "measurement";
  }
  return classifyOpportunityWorkflow(stage, opportunityName || taskTitle);
}

/** Marker / badge key used by map colors and technician UI. */
export function deriveWorkflowMarkerKey(stage?: string | null, title?: string | null): string {
  const normStage = normalizeString(stage);
  const normTitle = normalizeString(title);
  if (normStage.includes("REAGEND") || normTitle.includes("REAGEND")) {
    return "REAGENDAR";
  }
  const workflow = classifyOpportunityWorkflow(stage, title);
  if (workflow === 'installation') return CRM_STAGES.INSTALACAO;
  if (workflow === 'maintenance') return CRM_STAGES.MANUTENCAO;
  if (workflow === 'repair') return CRM_STAGES.REPARACAO;
  if (workflow === 'measurement') {
    return isRemediationStage(stage) ? CRM_STAGES.REMEDICAO : CRM_STAGES.TIRAR_MEDIDAS;
  }
  return 'GERAL';
}

/**
 * After cancel/incomplete, keep the operational service type — do not dump
 * remediação (or a visit already in TIRAR_MEDIDAS) back to ENTRADA.
 */
export function getFallbackStageOnIncompleteWorkflow(
  workflow: OpportunityWorkflow,
  currentStage?: string | null
): string {
  switch (workflow) {
    case 'installation':
      return CRM_STAGES.MARCAR_INSTALACAO;
    case 'maintenance':
      return CRM_STAGES.MANUTENCAO;
    case 'repair':
      return CRM_STAGES.REPARACAO;
    case 'measurement': {
      const stageNorm = normalizeString(currentStage);
      if (isRemediationStage(stageNorm)) return CRM_STAGES.REMEDICAO;
      if (stageNorm === CRM_STAGES.TIRAR_MEDIDAS) return CRM_STAGES.TIRAR_MEDIDAS;
      return CRM_STAGES.ENTRADA;
    }
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

/** Twenty SELECT/TEXT rating fields expect enum strings like `RATING_5`. */
export function formatCrmClientRating(rating: number): string {
  const stars = Math.round(rating);
  if (stars < 1 || stars > 5) {
    throw new Error(`Client rating must be between 1 and 5, got ${rating}`);
  }
  return `RATING_${stars}`;
}

/** Twenty RATING fields return enum strings like `RATING_5`; NUMBER fields return integers. */
export function parseCrmClientRating(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) {
    const rounded = Math.round(value);
    return rounded >= 1 && rounded <= 5 ? rounded : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const enumMatch = trimmed.match(/^RATING_(\d+)$/i);
    if (enumMatch) {
      const stars = parseInt(enumMatch[1], 10);
      return stars >= 1 && stars <= 5 ? stars : null;
    }
    const parsed = parseInt(trimmed, 10);
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 5) {
      return parsed;
    }
  }

  return null;
}

