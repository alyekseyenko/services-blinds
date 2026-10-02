import "server-only";

const DEV_NOTIFICATIONS_URL =
  "http://localhost:5678/webhook-test/blinds-notifications";
const DEV_MEASUREMENTS_URL =
  "http://localhost:5678/webhook-test/blinds-measurements";
const DEV_REPORTS_URL =
  "http://localhost:5678/webhook-test/blinds-service-reports";

/**
 * Resolves the n8n webhook URL for a given outbox event type.
 * Scheduling notifications use N8N_AGENDAMENTO_WEBHOOK_URL when configured.
 */
function requireWebhookUrl(
  primary: string | undefined,
  fallback: string | undefined,
  label: string,
  devDefault?: string
): string {
  const url = primary?.trim() || fallback?.trim();
  if (url) return url;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${label} não configurado em produção.`);
  }
  return devDefault ?? "";
}

function resolveSchedulingWebhookUrl(): string {
  return requireWebhookUrl(
    process.env.N8N_AGENDAMENTO_WEBHOOK_URL,
    process.env.N8N_WEBHOOK_URL,
    "N8N_AGENDAMENTO_WEBHOOK_URL ou N8N_WEBHOOK_URL",
    DEV_NOTIFICATIONS_URL
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
    return requireWebhookUrl(
      process.env.N8N_WEBHOOK_URL,
      undefined,
      "N8N_WEBHOOK_URL",
      DEV_MEASUREMENTS_URL
    );
  }

  if (eventType === "SERVICE_REPORT_SUBMITTED") {
    return requireWebhookUrl(
      process.env.N8N_WEBHOOK_URL_REPORTS,
      process.env.N8N_WEBHOOK_URL,
      "N8N_WEBHOOK_URL_REPORTS ou N8N_WEBHOOK_URL",
      DEV_REPORTS_URL
    );
  }

  return requireWebhookUrl(
    process.env.N8N_WEBHOOK_URL,
    undefined,
    "N8N_WEBHOOK_URL",
    DEV_NOTIFICATIONS_URL
  );
}
