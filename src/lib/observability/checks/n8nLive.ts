import {
  defineE2ECheck,
  resolveN8nFormConfirmUrl,
  resolveSchedulingWebhookUrl,
} from "../checkHelpers";

export const n8nSchedulingWebhookLiveCheck = defineE2ECheck({
  id: "n8n-scheduling-webhook-live",
  name: "n8n Scheduling Webhook (live)",
  category: "N8N",
  description: "POST observability probe to the scheduling webhook",
  tier: "live",
  remediation:
    "Check n8n workflow is active, URL is reachable, and container networking allows outbound HTTPS.",
  async run() {
    const url = resolveSchedulingWebhookUrl();
    if (!url) {
      return {
        status: "SKIP",
        message: "Skipped — scheduling webhook URL is not configured.",
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "observability_probe",
        source: "e2e-suite",
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(15000),
    });

    const body = await response.text();
    if (!response.ok) {
      return {
        status: "FAIL",
        message: `Webhook returned HTTP ${response.status}.`,
        details: { status: response.status, body: body.slice(0, 200) },
      };
    }

    const started =
      body.includes("Workflow was started") || body.includes('"success"');

    return {
      status: started ? "PASS" : "WARN",
      message: started
        ? `Webhook accepted probe (HTTP ${response.status}).`
        : `Webhook responded HTTP ${response.status} but workflow start is unclear.`,
      details: { status: response.status, body: body.slice(0, 200) },
    };
  },
});

export const n8nFormEndpointLiveCheck = defineE2ECheck({
  id: "n8n-form-endpoint-live",
  name: "n8n Client Form (live)",
  category: "N8N",
  description: "Client confirmation form endpoint must be reachable",
  tier: "live",
  remediation:
    "Set N8N_FORM_CONFIRM_URL or ensure n8n form /confirmar-visita-tecnica is published.",
  async run() {
    const formUrl = resolveN8nFormConfirmUrl();
    if (!formUrl) {
      return {
        status: "SKIP",
        message: "Skipped — could not derive n8n form URL.",
      };
    }

    const response = await fetch(formUrl, {
      method: "GET",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return {
        status: "FAIL",
        message: `Form URL returned HTTP ${response.status}.`,
        details: { formUrl, status: response.status },
      };
    }

    const html = await response.text();
    const looksLikeForm =
      html.includes("form") ||
      html.includes("Confirmar") ||
      html.includes("n8n");

    return {
      status: looksLikeForm ? "PASS" : "WARN",
      message: looksLikeForm
        ? `Form endpoint reachable (HTTP ${response.status}).`
        : `Form URL responded but content looks unexpected.`,
      details: { formUrl, status: response.status },
    };
  },
});
