import {
  OUTBOX_EVENT_TYPES,
  type OutboxEventType,
} from "@/lib/integrations/outboxEvents";
import { getN8nWebhookSecret } from "@/lib/n8nPost";
import { resolveN8nWebhookUrl } from "@/lib/n8nWebhooks";
import { defineE2ECheck, isLocalhostUrl } from "../checkHelpers";

function n8nSystemForEvent(eventType: OutboxEventType): string {
  if (
    eventType === "appointment_scheduled" ||
    eventType === "appointment_cancelled_by_client" ||
    eventType === "appointment_cancelled_in_crm" ||
    eventType === "appointment_cancelled_by_admin"
  ) {
    return "n8n-scheduling";
  }
  if (eventType === "SERVICE_REPORT_SUBMITTED") {
    return "n8n-reports";
  }
  return "n8n-default";
}

function buildOutboxEventRoutingCheck(eventType: OutboxEventType) {
  const systemId = n8nSystemForEvent(eventType);
  return defineE2ECheck({
    id: `outbox-event-routing-${eventType}`,
    name: `Rota n8n — ${eventType}`,
    category: "N8N",
    description: `URL e segredo HMAC para o evento outbox ${eventType}`,
    tier: "safe",
    covers: [`event:${eventType}`, `system:${systemId}`],
    remediation:
      "Configure N8N_* no servidor e N8N_WEBHOOK_SECRET em produção; evite URLs localhost.",
    async run() {
      let url: string;
      try {
        url = resolveN8nWebhookUrl(eventType);
      } catch (error) {
        return {
          status: "FAIL",
          message:
            error instanceof Error ? error.message : "Falha ao resolver URL n8n.",
        };
      }

      if (!url?.trim()) {
        return {
          status: "FAIL",
          message: `Nenhum URL n8n configurado para ${eventType}.`,
        };
      }

      const localhost = isLocalhostUrl(url);
      const secret = getN8nWebhookSecret();
      const inProd = process.env.NODE_ENV === "production";

      if (inProd && localhost) {
        return {
          status: "FAIL",
          message: `URL aponta para localhost em produção.`,
          details: { eventType, host: new URL(url).host },
        };
      }

      if (inProd && !secret) {
        return {
          status: "WARN",
          message: "N8N_WEBHOOK_SECRET em falta em produção.",
          details: { eventType, host: new URL(url).host },
        };
      }

      if (localhost) {
        return {
          status: "WARN",
          message: `URL de desenvolvimento (${new URL(url).host}).`,
          details: { eventType },
        };
      }

      return {
        status: "PASS",
        message: `Webhook configurado (${new URL(url).host}).`,
        details: { eventType, hasSecret: Boolean(secret) },
      };
    },
  });
}

export const generatedOutboxEventChecks = OUTBOX_EVENT_TYPES.map((eventType) =>
  buildOutboxEventRoutingCheck(eventType)
);
