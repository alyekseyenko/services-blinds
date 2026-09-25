const DEFAULT_NOTIFICATIONS_URL =
  "http://localhost:5678/webhook-test/blinds-notifications";
const DEFAULT_MEASUREMENTS_URL =
  "http://localhost:5678/webhook-test/blinds-measurements";
const DEFAULT_REPORTS_URL =
  "http://localhost:5678/webhook-test/blinds-service-reports";

/**
 * Resolves the n8n webhook URL for a given outbox event type.
 * Scheduling notifications use N8N_AGENDAMENTO_WEBHOOK_URL when configured.
 */
function resolveSchedulingWebhookUrl(): string {
  return (
    process.env.N8N_AGENDAMENTO_WEBHOOK_URL ||
    process.env.N8N_WEBHOOK_URL ||
    DEFAULT_NOTIFICATIONS_URL
  );
}

export function resolveN8nWebhookUrl(eventType: string): string {
  if (
    eventType === "appointment_scheduled" ||
    eventType === "appointment_cancelled_by_client" ||
    eventType === "appointment_cancelled_in_crm" ||
    eventType === "appointment_cancelled_by_admin"
  ) {
    return resolveSchedulingWebhookUrl();
  }

  if (eventType === "MEASUREMENTS_REPORT_GENERATION") {
    return process.env.N8N_WEBHOOK_URL || DEFAULT_MEASUREMENTS_URL;
  }

  if (eventType === "SERVICE_REPORT_SUBMITTED") {
    return process.env.N8N_WEBHOOK_URL_REPORTS || DEFAULT_REPORTS_URL;
  }

  return process.env.N8N_WEBHOOK_URL || DEFAULT_NOTIFICATIONS_URL;
}
