import "server-only";

import { outboxQueue } from './outboxQueue';
import { resolveN8nWebhookUrl } from './n8nWebhooks';
import {
  assertOutboxEventType,
  OUTBOX_SCHEMA_VERSION,
} from '@/lib/integrations/outboxEvents';
import { buildCancellationUrl, buildEvaluationUrl } from '@/lib/publicTokens';
import { getPublicAppBaseUrl } from '@/lib/publicAppUrl';
import { logger } from '@/lib/logger';

export function buildNotificationIdempotencyKey(
  eventType: string,
  data: Record<string, unknown>,
  explicit?: string
): string {
  if (explicit) return explicit;
  const taskId = typeof data.taskId === "string" ? data.taskId : undefined;
  const opportunityId =
    typeof data.opportunityId === "string" ? data.opportunityId : undefined;
  const status = typeof data.status === "string" ? data.status : "na";
  const dueAt =
    typeof data.dueAt === "string"
      ? data.dueAt
      : typeof data.scheduledAt === "string"
        ? data.scheduledAt
        : "";
  const clientRequestId =
    typeof data.clientRequestId === "string" ? data.clientRequestId : "";
  if (eventType === "technician_login") {
    const tech = data.technician as { email?: string } | undefined;
    const email = (tech?.email ?? "unknown").toLowerCase();
    const loginAt =
      typeof data.loginAt === "string" ? data.loginAt : new Date().toISOString();
    return `idemp_notif_technician_login_${email}_${loginAt}`;
  }

  const id = taskId ?? opportunityId ?? "global";
  const suffix = clientRequestId || dueAt || "v1";
  return `idemp_notif_${eventType}_${id}_${status}_${suffix}`;
}

export interface NotificationResponse {
  success: boolean;
  error?: string;
  outboxId?: string;
}

/**
 * Server Action to trigger notifications with Outbox Guarantee and Idempotency
 */
export async function serverTriggerNotification(event: string, data: Record<string, unknown>): Promise<NotificationResponse> {
  const eventType = assertOutboxEventType(event);
  const n8nWebhookUrl = resolveN8nWebhookUrl(eventType);
  const baseUrl = getPublicAppBaseUrl();

  try {
    logger.info("[Server:Outbox] Enfileirar notificação", {
      event,
      taskId: data.taskId,
      opportunityId: data.opportunityId,
    });
    
    const taskId = typeof data.taskId === "string" ? data.taskId : undefined;
    const opportunityId = typeof data.opportunityId === "string" ? data.opportunityId : undefined;
    const cancelUrl = taskId ? buildCancellationUrl(taskId, baseUrl) : undefined;
    const evaluationUrl = opportunityId ? buildEvaluationUrl(opportunityId, baseUrl) : undefined;
    const idempotencyKey = buildNotificationIdempotencyKey(eventType, data);

    const payload = {
      schemaVersion: OUTBOX_SCHEMA_VERSION,
      event: eventType,
      ...data,
      cancelUrl,
      evaluationUrl,
      baseUrl,
    };

    const outboxResult = await outboxQueue.enqueue(
      eventType,
      n8nWebhookUrl,
      payload,
      idempotencyKey
    );
    return { success: outboxResult.success, outboxId: outboxResult.eventId };
  } catch (error: any) {
    console.error('[Server] Error in serverTriggerNotification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Server Action to trigger measurements report generation (PDF/Excel)
 */
export async function serverTriggerMeasurementsReport(payload: Record<string, any>): Promise<NotificationResponse> {
  const n8nWebhookUrl = resolveN8nWebhookUrl("MEASUREMENTS_REPORT_GENERATION");
  const taskId = typeof payload.taskId === "string" ? payload.taskId : undefined;
  const opportunityId =
    typeof payload.opportunityId === "string" ? payload.opportunityId : undefined;
  const clientRequestId =
    typeof payload.clientRequestId === "string" ? payload.clientRequestId : undefined;
  const idempotencyKey = `idemp_meas_report_${taskId ?? opportunityId ?? "measurements"}_${clientRequestId ?? "legacy"}`;
  
  try {
    logger.info("[Server:Outbox] Enfileirar relatório de medições", {
      taskId: payload.taskId,
      opportunityId: payload.opportunityId,
    });
    const result = await outboxQueue.enqueue(
      "MEASUREMENTS_REPORT_GENERATION",
      n8nWebhookUrl,
      {
        schemaVersion: OUTBOX_SCHEMA_VERSION,
        ...payload,
        timestamp: new Date().toISOString(),
      },
      idempotencyKey
    );

    return { success: result.success, outboxId: result.eventId };
  } catch (error: any) {
    console.error('[Server] Error in serverTriggerMeasurementsReport:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Server Action to trigger a full service report with photos and organized storage
 */
export async function serverTriggerServiceReport(payload: Record<string, any>): Promise<NotificationResponse> {
  const n8nWebhookUrl = resolveN8nWebhookUrl("SERVICE_REPORT_SUBMITTED");
  const taskId = typeof payload.taskId === "string" ? payload.taskId : undefined;
  const status = typeof payload.status === "string" ? payload.status : "na";
  const idempotencyKey = `idemp_svc_report_${taskId ?? payload.opportunityId ?? "report"}_${status}`;
  
  try {
    logger.info("[Server:Outbox] Enfileirar relatório de serviço com fotos", {
      taskId: payload.taskId,
      opportunityId: payload.opportunityId,
    });
    
    const now = new Date();
    const folderMetadata = {
      year: now.getFullYear().toString(),
      month: (now.getMonth() + 1).toString().padStart(2, '0'),
      day: now.getDate().toString().padStart(2, '0'),
      clientName: payload.clientName || 'Cliente Desconhecido',
      serviceType: payload.serviceType || 'Geral',
      nsi: payload.nsi || 'N-A',
      taskTitle: payload.taskTitle || 'Serviço'
    };

    const result = await outboxQueue.enqueue(
      "SERVICE_REPORT_SUBMITTED",
      n8nWebhookUrl,
      {
        schemaVersion: OUTBOX_SCHEMA_VERSION,
        ...payload,
        folderMetadata,
        timestamp: now.toISOString(),
      },
      idempotencyKey
    );

    return { success: result.success, outboxId: result.eventId };
  } catch (error: any) {
    console.error('[Server] Error in serverTriggerServiceReport:', error);
    return { success: false, error: error.message };
  }
}
