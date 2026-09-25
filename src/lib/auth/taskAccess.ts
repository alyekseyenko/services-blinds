import "server-only";

import type { AppRole } from "@/lib/schemas/auth";
import { getTaskAssigneeId } from "@/lib/crm/tasks";
import { canAccessAdminPanel } from "@/lib/auth/session";
import { getAppSession } from "@/lib/auth/session.server";

export type TaskAccessSuccess = {
  ok: true;
  userId: string;
  role: AppRole;
};

export type TaskAccessFailure = {
  ok: false;
  error: string;
};

export type TaskAccessResult = TaskAccessSuccess | TaskAccessFailure;

/** Technicians may only mutate tasks assigned to them; operational admin roles may mutate any task. */
export async function assertCanMutateTask(taskId: string): Promise<TaskAccessResult> {
  const ctx = await getAppSession();
  if (!ctx?.user.role) {
    return { ok: false, error: "Não autenticado." };
  }

  const role = ctx.user.role;
  if (canAccessAdminPanel(role)) {
    return { ok: true, userId: ctx.user.id, role };
  }

  if (role !== "technician") {
    return { ok: false, error: "Acesso não autorizado." };
  }

  const assigneeId = await getTaskAssigneeId(taskId);
  if (!assigneeId || assigneeId !== ctx.user.id) {
    return { ok: false, error: "Não está atribuído a esta visita." };
  }

  return { ok: true, userId: ctx.user.id, role };
}
