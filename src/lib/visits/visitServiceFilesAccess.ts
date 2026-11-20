import "server-only";

import { assertCanAccessOpportunity } from "@/lib/auth/opportunityAccess";
import { assertTaskLinkedToOpportunity } from "@/lib/visits/visitPhotoTaskAccess";

export type VisitServiceFilesAccessResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export async function assertVisitServiceFilesAccess(
  opportunityId: string,
  taskId: string
): Promise<VisitServiceFilesAccessResult> {
  const trimmedTask = taskId.trim();
  const trimmedOpp = opportunityId.trim();
  if (!trimmedTask || !trimmedOpp) {
    return { ok: false, error: "Parâmetros inválidos.", status: 400 };
  }

  const access = await assertCanAccessOpportunity(trimmedOpp, trimmedTask);
  if (!access.ok) {
    const status = access.error === "Não autenticado." ? 401 : 403;
    return { ok: false, error: access.error, status };
  }

  const link = await assertTaskLinkedToOpportunity(trimmedTask, trimmedOpp);
  if (!link.ok) {
    return { ok: false, error: link.error, status: 403 };
  }

  return { ok: true };
}