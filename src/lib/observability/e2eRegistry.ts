import "server-only";

/**
 * Central registry for the Complete E2E Observability Suite.
 *
 * When you add a new automation or integration, register its check here.
 * Coverage is enforced by `__tests__/coverage.test.ts`.
 */
import type { E2ECheckDefinition } from "./e2eTypes";
import { appBuildVersionCheck } from "./checks/appBuild";
import { circuitBreakerCheck } from "./checks/circuitBreaker";
import { crmGraphqlCheck } from "./checks/crmGraphql";
import { adminAgendaFeedApiCheck } from "./checks/adminAgendaFeedApi";
import { fieldSyncHealthCheck } from "./checks/fieldSyncHealth";
import {
  geocoderConfigCheck,
  geocoderLiveCheck,
  googleMapsKeyCheck,
} from "./checks/geocoderChecks";
import { generatedOutboxEventChecks } from "./checks/generated";
import {
  appDataDirWritableCheck,
  appHealthProbesCheck,
  outboxDrainHeartbeatCheck,
  redisPingCheck,
  twentyMetadataCheck,
  twentyRestAuthCheck,
} from "./checks/infra";
import { locationStoreRoundtripCheck } from "./checks/locationStore";
import {
  n8nFormEndpointLiveCheck,
  n8nSchedulingWebhookLiveCheck,
} from "./checks/n8nLive";
import { outboxQueueCheck } from "./checks/outboxQueue";
import { produtosGraphqlCheck } from "./checks/produtosGraphql";
import {
  publicCancelTokenCheck,
  publicEvaluationTokenCheck,
} from "./checks/publicPortals";
import { evaluationLinkApiCheck } from "./checks/evaluationLinkApi";
import { schedulingContractCheck } from "./checks/schedulingContract";
import { urgentSchedulingCheck } from "./checks/urgentScheduling";
import {
  n8nWebhookRoutingCheck,
  schedulingEnvCheck,
} from "./checks/schedulingEnv";

/** Add new checks to this array — order determines execution sequence. */
export const E2E_CHECK_REGISTRY: E2ECheckDefinition[] = [
  // CRM & resilience
  crmGraphqlCheck,
  produtosGraphqlCheck,
  twentyMetadataCheck,
  twentyRestAuthCheck,
  circuitBreakerCheck,

  // Infra
  redisPingCheck,
  appDataDirWritableCheck,
  outboxDrainHeartbeatCheck,
  outboxQueueCheck,

  // App contract & health
  schedulingContractCheck,
  urgentSchedulingCheck,
  appHealthProbesCheck,
  appBuildVersionCheck,
  googleMapsKeyCheck,
  geocoderConfigCheck,
  locationStoreRoundtripCheck,
  fieldSyncHealthCheck,
  adminAgendaFeedApiCheck,

  // Public portals (HMAC)
  publicCancelTokenCheck,
  publicEvaluationTokenCheck,
  evaluationLinkApiCheck,

  // n8n configuration (generated per OUTBOX_EVENT_TYPE + routing helpers)
  schedulingEnvCheck,
  n8nWebhookRoutingCheck,
  ...generatedOutboxEventChecks,

  // Live probes (tier: live — skipped unless depth === "full")
  geocoderLiveCheck,
  n8nSchedulingWebhookLiveCheck,
  n8nFormEndpointLiveCheck,
];

export function listRegisteredE2EChecks(): Array<{
  id: string;
  name: string;
  category: string;
  tier: string;
  description: string;
  covers: string[];
}> {
  return E2E_CHECK_REGISTRY.map((check) => ({
    id: check.id,
    name: check.name,
    category: check.category,
    tier: check.tier,
    description: check.description,
    covers: check.covers,
  }));
}

export function collectRegistryCovers(): Set<string> {
  const covers = new Set<string>();
  for (const check of E2E_CHECK_REGISTRY) {
    for (const tag of check.covers) {
      covers.add(tag);
    }
  }
  return covers;
}
