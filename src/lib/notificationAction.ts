"use server";

import { outboxQueue } from './outboxQueue';
import { buildCancellationUrl, buildEvaluationUrl } from '@/lib/publicTokens';

export interface NotificationResponse {
  success: boolean;
  error?: string;
  outboxId?: string;
}

/**
 * Server Action to trigger notifications with Outbox Guarantee and Idempotency
 */
export async function serverTriggerNotification(event: string, data: Record<string, any>): Promise<NotificationResponse> {
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook-test/habitarmos-notifications';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    console.log(`[Server:Outbox] Triggering notification: ${event}`, data);
    
    const taskId = typeof data.taskId === "string" ? data.taskId : undefined;
    const opportunityId = typeof data.opportunityId === "string" ? data.opportunityId : undefined;
    const cancelUrl = taskId ? buildCancellationUrl(taskId, baseUrl) : undefined;
    const evaluationUrl = opportunityId ? buildEvaluationUrl(opportunityId, baseUrl) : undefined;
    const id = opportunityId || taskId;
    const idempotencyKey = `idemp_notif_${event}_${id || 'global'}_${Date.now()}`;

    const payload = {
      event,
      ...data,
      cancelUrl,
      evaluationUrl,
      baseUrl
    };

    const outboxResult = await outboxQueue.enqueue(event, n8nWebhookUrl, payload, idempotencyKey);
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
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook-test/habitarmos-measurements';
  const id = payload.opportunityId || payload.taskId || 'measurements';
  const idempotencyKey = `idemp_meas_report_${id}_${Date.now()}`;
  
  try {
    console.log('[Server:Outbox] Enqueueing Measurements Report Automation');
    const result = await outboxQueue.enqueue('MEASUREMENTS_REPORT_GENERATION', n8nWebhookUrl, {
      ...payload,
      timestamp: new Date().toISOString(),
    }, idempotencyKey);

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
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL_REPORTS || 'http://localhost:5678/webhook-test/habitarmos-service-reports';
  const id = payload.opportunityId || payload.taskId || 'report';
  const idempotencyKey = `idemp_svc_report_${id}_${Date.now()}`;
  
  try {
    console.log('[Server:Outbox] Enqueueing Full Service Report Automation with Photos');
    
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

    const result = await outboxQueue.enqueue('SERVICE_REPORT_SUBMITTED', n8nWebhookUrl, {
      ...payload,
      folderMetadata,
      timestamp: now.toISOString(),
    }, idempotencyKey);

    return { success: result.success, outboxId: result.eventId };
  } catch (error: any) {
    console.error('[Server] Error in serverTriggerServiceReport:', error);
    return { success: false, error: error.message };
  }
}
