import "server-only";

/** Workspace member attribution for Twenty REST creates (timeline + createdBy). */
export type CrmManualActor = {
  name: string;
  workspaceMemberId: string;
};

export function crmManualCreatedBy(actor: CrmManualActor): Record<string, unknown> {
  return {
    source: "MANUAL",
    name: actor.name,
    workspaceMemberId: actor.workspaceMemberId,
    context: {},
  };
}
