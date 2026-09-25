import { crmFetch } from "@/lib/crm/client";
import { defineE2ECheck } from "../checkHelpers";

export const crmGraphqlCheck = defineE2ECheck({
  id: "crm-graphql-connectivity",
  name: "Twenty CRM GraphQL",
  category: "CRM",
  description: "Read-only GraphQL probe against Twenty CRM",
  tier: "safe",
  remediation:
    "Verify TWENTY_API_URL and TWENTY_API_KEY on the server and that Twenty is reachable.",
  async run() {
    const start = Date.now();
    const result = await crmFetch<{ __typename?: string }>(
      `query { __typename }`,
      {},
      { timeoutMs: 8000, maxRetries: 1 }
    );
    const latencyMs = Date.now() - start;
    return {
      status: latencyMs < 3000 ? "PASS" : "WARN",
      message: `GraphQL responded in ${latencyMs}ms (typename: ${result.__typename ?? "Query"}).`,
      details: { latencyMs, typename: result.__typename },
    };
  },
});
