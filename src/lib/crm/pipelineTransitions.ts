import "server-only";

import type { ExtraServiceType } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { crmFetch } from "./client";
import { invalidateAdminCrmCache } from "@/lib/crmCache";
import {
  CRM_STAGES,
  CRM_TASK_STATUS,
  classifyOpportunityWorkflow,
  classifyOpportunityWorkflowOnTaskClose,
  getCompletionStageForWorkflow,
  getFallbackStageOnIncompleteWorkflow,
  getNextStageOnSchedule,
  isRemediationStage,
  normalizeString,
  normalizeTaskStatus,
  type OpportunityWorkflow,
} from "./contract";
import {
  fetchOpportunityStageFromCrm,
  writeOpportunityStageToCrm,
} from "./opportunities";

export type OpportunityStageTransitionReason =
  | "schedule_visit"
  | "task_completed"
  | "task_incomplete_or_cancelled"
  | "visit_service_stage"
  | "warehouse_prep_complete"
  | "visit_service_create"
  | "visit_service_update";

export type OpportunityStageTransitionStatus = "applied" | "unchanged" | "conflict";

export type OpportunityStageTransitionResult = {
  status: OpportunityStageTransitionStatus;
  currentStage: string;
  targetStage?: string;
};

export const PIPELINE_STAGE_CONFLICT_MESSAGE =
  "Esta oportunidade foi alterada por outra pessoa. Atualize a página e tente novamente.";

export class OpportunityStageConflictError extends Error {
  readonly result: OpportunityStageTransitionResult;

  constructor(result: OpportunityStageTransitionResult) {
    super(PIPELINE_STAGE_CONFLICT_MESSAGE);
    this.name = "OpportunityStageConflictError";
    this.result = result;
  }
}

const VISIT_SERVICE_STAGE: Record<ExtraServiceType, string> = {
  TIRAR_MEDIDAS: CRM_STAGES.TIRAR_MEDIDAS,
  REMEDICAO: CRM_STAGES.REMEDICAO,
  MANUTENCAO: CRM_STAGES.MANUTENCAO,
  REPARACAO: CRM_STAGES.REPARACAO,
};

export function getVisitServiceStage(serviceType: ExtraServiceType): string {
  return VISIT_SERVICE_STAGE[serviceType];
}

/**
 * ADR 001: EM_CURSO is operational only — never moves the opportunity pipeline.
 */
export function shouldSkipPipelineTransitionForTaskStatus(
  taskStatus?: string | null
): boolean {
  return normalizeTaskStatus(taskStatus) === CRM_TASK_STATUS.EM_CURSO;
}

export function resolveStageAfterSchedule(currentStage?: string | null): string {
  return getNextStageOnSchedule(currentStage);
}

export function resolveStageAfterTaskStatusChange(
  workflow: OpportunityWorkflow,
  taskStatus: string
): string | null {
  const apiStatus = normalizeTaskStatus(taskStatus);
  if (apiStatus === CRM_TASK_STATUS.CONCLUIDO || apiStatus === CRM_TASK_STATUS.DONE) {
    return getCompletionStageForWorkflow(workflow);
  }
  if (
    apiStatus === CRM_TASK_STATUS.INCOMPLETO ||
    apiStatus === CRM_TASK_STATUS.CANCELADO
  ) {
    return getFallbackStageOnIncompleteWorkflow(workflow);
  }
  return null;
}

function normalizeStage(stage?: string | null): string {
  return normalizeString(stage);
}

function expectedTargetForReason(
  actualFrom: string,
  targetStage: string,
  reason: OpportunityStageTransitionReason,
  context?: {
    opportunityName?: string | null;
    taskTitle?: string | null;
    taskStatus?: string | null;
  }
): string | null {
  const toN = normalizeStage(targetStage);
  switch (reason) {
    case "schedule_visit": {
      const expected = normalizeStage(getNextStageOnSchedule(actualFrom));
      return expected === toN ? targetStage.trim() : null;
    }
    case "warehouse_prep_complete":
      return toN === CRM_STAGES.MARCAR_INSTALACAO ? CRM_STAGES.MARCAR_INSTALACAO : null;
    case "task_completed": {
      const workflow = classifyOpportunityWorkflowOnTaskClose(
        actualFrom,
        context?.opportunityName,
        context?.taskTitle
      );
      const expected = resolveStageAfterTaskStatusChange(
        workflow,
        context?.taskStatus ?? CRM_TASK_STATUS.CONCLUIDO
      );
      return expected && normalizeStage(expected) === toN ? expected : null;
    }
    case "task_incomplete_or_cancelled": {
      const workflow = classifyOpportunityWorkflow(actualFrom, context?.opportunityName);
      const expected = resolveStageAfterTaskStatusChange(
        workflow,
        context?.taskStatus ?? CRM_TASK_STATUS.CANCELADO
      );
      return expected && normalizeStage(expected) === toN ? expected : null;
    }
    default:
      return null;
  }
}

/**
 * ADR 005 Fase B: validates that a stage write matches operational rules for the reason.
 */
export function assertAllowedTransition(
  from: string,
  to: string,
  reason: OpportunityStageTransitionReason
): boolean {
  const fromN = normalizeStage(from);
  const toN = normalizeStage(to);
  if (!fromN || !toN || fromN === toN) return false;

  switch (reason) {
    case "schedule_visit":
      return toN === normalizeStage(getNextStageOnSchedule(from));
    case "warehouse_prep_complete":
      return fromN === CRM_STAGES.PREPARACAO && toN === CRM_STAGES.MARCAR_INSTALACAO;
    case "task_completed":
      return isAllowedTaskCompletionTransition(fromN, toN);
    case "task_incomplete_or_cancelled":
      return isAllowedTaskFallbackTransition(fromN, toN);
    default:
      return false;
  }
}

function isAllowedTaskCompletionTransition(fromN: string, toN: string): boolean {
  if (toN === CRM_STAGES.ORCAMENTAR) {
    // Assistance stages reach ORCAMENTAR only when the closed visit was a measurement
    // (enforced by expectedTargetForReason via the task title).
    return (
      STAGE_MEASUREMENT_OR_REMEDIATION(fromN) ||
      fromN === CRM_STAGES.MANUTENCAO ||
      fromN === CRM_STAGES.REPARACAO
    );
  }
  if (toN === CRM_STAGES.PAGAMENTO_TOTAL) {
    return (
      fromN === CRM_STAGES.MANUTENCAO ||
      fromN === CRM_STAGES.REPARACAO ||
      fromN === CRM_STAGES.INSTALACAO ||
      fromN === CRM_STAGES.MARCAR_INSTALACAO ||
      fromN === CRM_STAGES.AGENDAR_INSTALACAO
    );
  }
  return false;
}

function STAGE_MEASUREMENT_OR_REMEDIATION(fromN: string): boolean {
  return (
    fromN === CRM_STAGES.ENTRADA ||
    fromN === CRM_STAGES.TIRAR_MEDIDAS ||
    isRemediationStage(fromN)
  );
}

function isAllowedTaskFallbackTransition(fromN: string, toN: string): boolean {
  if (toN === CRM_STAGES.ENTRADA) {
    return STAGE_MEASUREMENT_OR_REMEDIATION(fromN) || fromN === CRM_STAGES.ORCAMENTAR;
  }
  if (toN === CRM_STAGES.MARCAR_INSTALACAO) {
    return (
      fromN === CRM_STAGES.INSTALACAO ||
      fromN === CRM_STAGES.AGENDAR_INSTALACAO ||
      fromN === CRM_STAGES.PREPARACAO ||
      fromN === CRM_STAGES.ENCOMENDA
    );
  }
  if (toN === CRM_STAGES.MANUTENCAO) return fromN === CRM_STAGES.MANUTENCAO;
  if (toN === CRM_STAGES.REPARACAO) return fromN === CRM_STAGES.REPARACAO;
  return false;
}

function buildConflictResult(
  currentStage: string,
  targetStage: string
): OpportunityStageTransitionResult {
  return { status: "conflict", currentStage, targetStage };
}

/**
 * Single entry point for app-driven opportunity stage writes (Twenty CRM).
 */
export async function applyOpportunityStageTransition(
  opportunityId: string,
  targetStage: string,
  reason: OpportunityStageTransitionReason,
  context?: {
    currentStage?: string | null;
    taskStatus?: string | null;
    opportunityName?: string | null;
    taskTitle?: string | null;
  }
): Promise<OpportunityStageTransitionResult> {
  if (shouldSkipPipelineTransitionForTaskStatus(context?.taskStatus)) {
    const skippedFrom = (context?.currentStage || "").trim();
    return { status: "unchanged", currentStage: skippedFrom };
  }

  const to = targetStage.trim();
  if (!to) {
    return { status: "unchanged", currentStage: "" };
  }

  const freshStage = await fetchOpportunityStageFromCrm(opportunityId);
  const actualFrom = (freshStage || "").trim();
  if (!actualFrom) {
    logger.warn("[Pipeline] Cannot read opportunity stage before transition", {
      opportunityId,
      reason,
    });
    return buildConflictResult("", to);
  }

  const fromN = normalizeStage(actualFrom);
  const toN = normalizeStage(to);

  if (fromN === toN) {
    return { status: "unchanged", currentStage: actualFrom };
  }

  if (reason === "schedule_visit" && context?.currentStage != null) {
    const clientFrom = normalizeStage(context.currentStage);
    if (clientFrom && clientFrom !== fromN) {
      logger.warn("[Pipeline] Schedule stage conflict (stale admin UI)", {
        opportunityId,
        clientStage: clientFrom,
        crmStage: fromN,
        targetStage: toN,
      });
      return buildConflictResult(actualFrom, to);
    }
  }

  const expectedTarget = expectedTargetForReason(actualFrom, to, reason, context);
  if (!expectedTarget) {
    logger.warn("[Pipeline] Stage transition target mismatch after CRM read", {
      opportunityId,
      reason,
      crmStage: fromN,
      requestedTarget: toN,
    });
    return buildConflictResult(actualFrom, to);
  }

  if (!assertAllowedTransition(actualFrom, expectedTarget, reason)) {
    logger.warn("[Pipeline] Stage transition not allowed", {
      opportunityId,
      reason,
      from: fromN,
      to: toN,
    });
    return buildConflictResult(actualFrom, to);
  }

  logger.info("[Pipeline] Opportunity stage transition", {
    opportunityId,
    from: fromN,
    to: toN,
    reason,
  });
  await writeOpportunityStageToCrm(opportunityId, expectedTarget);
  return { status: "applied", currentStage: actualFrom, targetStage: expectedTarget };
}

export async function createVisitServiceOpportunity(
  createData: Record<string, unknown>,
  serviceType: ExtraServiceType
): Promise<string> {
  const stage = getVisitServiceStage(serviceType);
  const data = { ...createData, stage };

  logger.info("[Pipeline] create visit-service opportunity", { stage, serviceType });

  const created = await crmFetch<{ createOpportunity: { id: string } }>(
    `mutation createVisitOpp($data: OpportunityCreateInput!) {
      createOpportunity(data: $data) { id }
    }`,
    { data }
  );

  await invalidateAdminCrmCache();
  return created.createOpportunity.id;
}

export async function updateVisitServiceOpportunityFields(
  opportunityId: string,
  input: {
    name: string;
    serviceType: ExtraServiceType;
    notesMarkdown: string;
  },
  context?: { currentStage?: string | null }
): Promise<void> {
  const stage = getVisitServiceStage(input.serviceType);
  const from = (context?.currentStage || "").trim();

  logger.info("[Pipeline] visit_service_update", {
    opportunityId,
    from: from || "?",
    to: stage,
  });

  await crmFetch(
    `mutation updateVisitOpp($id: UUID!, $data: OpportunityUpdateInput!) {
      updateOpportunity(id: $id, data: $data) { id }
    }`,
    {
      id: opportunityId,
      data: {
        name: input.name,
        stage,
        notasImportantes: { markdown: input.notesMarkdown },
      },
    }
  );

  await invalidateAdminCrmCache();
}
