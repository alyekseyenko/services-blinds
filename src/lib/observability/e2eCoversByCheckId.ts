/**
 * Mapa id → covers para UI cliente (sem importar implementações server-only).
 * O teste coverage.test.ts garante alinhamento com e2eRegistry.
 */
import {
  OUTBOX_EVENT_TYPES,
  type OutboxEventType,
} from "@/lib/integrations/outboxEvents";

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

const generatedOutboxCovers: Record<string, string[]> = {};
for (const eventType of OUTBOX_EVENT_TYPES) {
  generatedOutboxCovers[`outbox-event-routing-${eventType}`] = [
    `event:${eventType}`,
    `system:${n8nSystemForEvent(eventType)}`,
  ];
}

export const E2E_COVERS_BY_CHECK_ID: Record<string, string[]> = {
  "crm-graphql-connectivity": ["system:twenty-graphql"],
  "crm-produtos-query": ["system:twenty-graphql"],
  "twenty-metadata": ["system:twenty-metadata"],
  "twenty-auth-origin": ["system:twenty-rest"],
  "crm-circuit-breaker": ["system:twenty-graphql"],
  "redis-ping": ["system:redis"],
  "app-data-dir-writable": ["system:app-data-dir"],
  "outbox-drain-heartbeat": ["system:outbox-drain"],
  "outbox-queue-health": [],
  "scheduling-contract-por-agendar": ["system:twenty-graphql"],
  "urgent-scheduling-bypass": ["system:n8n-scheduling"],
  "app-health-endpoint": ["api:/api/health", "system:twenty-graphql"],
  "app-build-version": ["system:app-version", "api:/api/app-version"],
  "google-maps-key": ["system:google-maps-key"],
  "geocoder-config": ["system:geocoder"],
  "location-store-roundtrip": ["system:location-store"],
  "field-sync-health": ["system:field-sync", "api:/api/sync-telemetry"],
  "admin-agenda-feed-api": ["api:/api/agenda/feed", "system:twenty-graphql"],
  "public-cancel-token": ["system:public-portals"],
  "public-evaluation-token": ["system:public-portals"],
  "evaluation-link-api": ["system:public-portals", "api:/api/public-links/evaluation"],
  "env-scheduling-webhook": ["system:n8n-scheduling"],
  "n8n-webhook-routing": ["system:n8n-scheduling"],
  "geocoder-live": ["system:geocoder"],
  "n8n-scheduling-webhook-live": ["system:n8n-scheduling"],
  "n8n-form-endpoint-live": ["system:n8n-scheduling"],
  ...generatedOutboxCovers,
};
