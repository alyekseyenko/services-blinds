/**
 * Central registry for the Complete E2E Observability Suite.
 *
 * When you add a new automation or integration, register its check here.
 * See docs/E2E_OBSERVABILITY_SUITE.md for the step-by-step guide.
 */
import type { E2ECheckDefinition } from "./e2eTypes";
import { appHealthCheck } from "./checks/appHealth";
import { circuitBreakerCheck } from "./checks/circuitBreaker";
import { crmGraphqlCheck } from "./checks/crmGraphql";
import { produtosGraphqlCheck } from "./checks/produtosGraphql";
import {
  n8nFormEndpointLiveCheck,
  n8nSchedulingWebhookLiveCheck,
} from "./checks/n8nLive";
import { outboxQueueCheck } from "./checks/outboxQueue";
import {
  publicCancelTokenCheck,
  publicEvaluationTokenCheck,
} from "./checks/publicPortals";
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
  circuitBreakerCheck,
  outboxQueueCheck,

  // App contract & health
  schedulingContractCheck,
  urgentSchedulingCheck,
  appHealthCheck,

  // Public portals (HMAC)
  publicCancelTokenCheck,
  publicEvaluationTokenCheck,

  // n8n configuration
  schedulingEnvCheck,
  n8nWebhookRoutingCheck,

  // Live probes (tier: live — skipped unless depth === "full")
  n8nSchedulingWebhookLiveCheck,
  n8nFormEndpointLiveCheck,
];

export function listRegisteredE2EChecks(): Array<{
  id: string;
  name: string;
  category: string;
  tier: string;
  description: string;
}> {
  return E2E_CHECK_REGISTRY.map((check) => ({
    id: check.id,
    name: check.name,
    category: check.category,
    tier: check.tier,
    description: check.description,
  }));
}
