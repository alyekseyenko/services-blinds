import { CRM_OBJECTS } from "@/lib/crm/contract";
import { crmFetch } from "@/lib/crm/client";
import { defineE2ECheck } from "../checkHelpers";

export const produtosGraphqlCheck = defineE2ECheck({
  id: "crm-produtos-query",
  name: "Twenty CRM Produtos",
  category: "CRM",
  description: "Warehouse product lines use the Produto object (produtos query)",
  tier: "safe",
  remediation: "Align CRM_OBJECTS.serviceItem in src/lib/crm/contract.ts with Twenty metadata.",
  async run() {
    const qn = CRM_OBJECTS.serviceItem.queryName;
    const result = await crmFetch<Record<string, { edges: unknown[] }>>(
      `query { ${qn}(first: 1) { edges { node { id } } } }`,
      {},
      { timeoutMs: 8000, maxRetries: 1 }
    );
    const edges = result[qn]?.edges;
    if (!Array.isArray(edges)) {
      return {
        status: "FAIL",
        message: `Query "${qn}" did not return edges.`,
        details: { queryName: qn },
      };
    }
    return {
      status: "PASS",
      message: `Query "${qn}" is available (${edges.length} sample edge).`,
      details: { queryName: qn },
    };
  },
});
