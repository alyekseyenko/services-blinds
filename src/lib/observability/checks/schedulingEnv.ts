import { defineE2ECheck, isLocalhostUrl, resolveSchedulingWebhookUrl } from "../checkHelpers";

export const schedulingEnvCheck = defineE2ECheck({
  id: "env-scheduling-webhook",
  name: "Scheduling Webhook Config",
  category: "N8N",
  description: "N8N_AGENDAMENTO_WEBHOOK_URL must be configured for production",
  tier: "safe",
  remediation:
    "Set N8N_AGENDAMENTO_WEBHOOK_URL in .env.local (server) and rebuild Docker if needed.",
  async run() {
    const url = resolveSchedulingWebhookUrl();
    if (!url) {
      return {
        status: "FAIL",
        message: "N8N_AGENDAMENTO_WEBHOOK_URL and N8N_WEBHOOK_URL are both missing.",
      };
    }
    if (isLocalhostUrl(url)) {
      return {
        status: "WARN",
        message: `Scheduling webhook points to localhost (${url}).`,
        details: { url },
      };
    }
    return {
      status: "PASS",
      message: "Scheduling webhook URL is configured.",
      details: { host: new URL(url).host },
    };
  },
});

export const n8nWebhookRoutingCheck = defineE2ECheck({
  id: "n8n-webhook-routing",
  name: "n8n Event Routing",
  category: "N8N",
  description: "appointment_scheduled must resolve to the scheduling webhook",
  tier: "safe",
  remediation:
    "Ensure resolveN8nWebhookUrl maps scheduling events to N8N_AGENDAMENTO_WEBHOOK_URL.",
  async run() {
    const { resolveN8nWebhookUrl } = await import("@/lib/n8nWebhooks");
    const scheduledUrl = resolveN8nWebhookUrl("appointment_scheduled");
    const cancelUrl = resolveN8nWebhookUrl("appointment_cancelled_by_client");
    const configured = resolveSchedulingWebhookUrl();

    if (!configured) {
      return {
        status: "FAIL",
        message: "No scheduling webhook env var is set.",
      };
    }

    const routesMatch =
      scheduledUrl === configured && cancelUrl === configured;

    return {
      status: routesMatch ? "PASS" : "WARN",
      message: routesMatch
        ? "Scheduling and cancel events route to the same n8n webhook."
        : "Scheduling events may not use N8N_AGENDAMENTO_WEBHOOK_URL.",
      details: { scheduledUrl, cancelUrl, configured },
    };
  },
});
