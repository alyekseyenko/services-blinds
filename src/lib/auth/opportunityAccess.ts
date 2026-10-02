import "server-only";

import { technicianHasLinkedOpportunity } from "@/lib/crm/tasks";
import { canAccessAdminPanel } from "@/lib/auth/session";
import { getAppSession } from "@/lib/auth/session.server";
import type { TaskAccessResult } from "@/lib/auth/taskAccess";
import { assertCanMutateTask } from "@/lib/auth/taskAccess";

/** Read or write CRM notes/items for an opportunity (admin panel or assigned technician). */
export async function assertCanAccessOpportunity(
  opportunityId: string,
  taskId?: string
): Promise<TaskAccessResult> {
  const ctx = await getAppSession();
  if (!ctx?.user.role) {
    return { ok: false, error: "Não autenticado." };
  }

  if (canAccessAdminPanel(ctx.user.role)) {
    return { ok: true, userId: ctx.user.id, role: ctx.user.role };
  }

  if (taskId) {
    const taskAccess = await assertCanMutateTask(taskId);
    if (!taskAccess.ok) return taskAccess;
  }

  if (ctx.user.role !== "technician") {
    return { ok: false, error: "Acesso não autorizado." };
  }

  const linked = await technicianHasLinkedOpportunity(ctx.user.id, opportunityId);

  if (!linked) {
    return { ok: false, error: "Não tem acesso a esta oportunidade." };
  }

  return { ok: true, userId: ctx.user.id, role: ctx.user.role };
}
