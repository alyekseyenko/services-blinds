import "server-only";
import { crmFetch } from "./client";
import { invalidateAdminCrmCache } from "@/lib/crmCache";

export { invalidateAdminCrmCache };
export * from "./opportunities/mapper";
export * from "./opportunities/queries";
export * from "./opportunities/mutations";
export * from "./opportunities/preparation";

/** CRM stage write — use only via `pipelineTransitions` (not exported to actions/UI). */
export async function writeOpportunityStageToCrm(id: string, stage: string) {
  const mutation = `
    mutation updateOppStage($id: UUID!, $stage: OpportunityStageEnum!) {
      updateOpportunity(id: $id, data: { stage: $stage }) {
        id
      }
    }
  `;
  const result = await crmFetch(mutation, { id, stage });
  await invalidateAdminCrmCache();
  return result;
}
