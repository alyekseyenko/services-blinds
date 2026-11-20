import { CRM_STAGES, CRM_TASK_STATUS, normalizeString, normalizeTaskStatus } from "@/lib/crm/contract";

/** Extra criado no local não segue o fecho cancelado/incompleto da visita mãe. */
export function shouldKeepOnSiteExtraOnParentClose(
  apiStatus: string,
  isOnSiteExtra: boolean
): boolean {
  if (!isOnSiteExtra) return false;
  const status = normalizeTaskStatus(apiStatus);
  return status === CRM_TASK_STATUS.INCOMPLETO || status === CRM_TASK_STATUS.CANCELADO;
}

/**
 * Reparação (ou outro extra) já em cobrança/concluído não herda o crachá da visita mãe.
 * «Agendar depois» fica na fase de trabalho e não entra aqui.
 */
export function onSiteExtraDisplaysAsCompleted(input: {
  createdOnSite: boolean;
  deferred: boolean;
  stage?: string | null;
  inheritedStatus?: string | null;
}): boolean {
  if (!input.createdOnSite || input.deferred) return false;
  const stage = normalizeString(input.stage);
  const doneStage =
    stage === CRM_STAGES.PAGAMENTO_TOTAL || stage === CRM_STAGES.CONCLUIDO;
  if (!doneStage) return false;
  const inherited = normalizeTaskStatus(input.inheritedStatus);
  return (
    inherited === CRM_TASK_STATUS.CANCELADO ||
    inherited === CRM_TASK_STATUS.INCOMPLETO
  );
}
