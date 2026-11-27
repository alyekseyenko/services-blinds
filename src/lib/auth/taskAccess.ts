import "server-only";

import type { AppRole } from "@/lib/schemas/auth";
import { getTaskTeamAccess } from "@/lib/crm/tasks/read";
import { canAccessAdminPanel } from "@/lib/auth/session";
import { getAppSession } from "@/lib/auth/session.server";
import { isOnboardingDemoId } from "@/lib/demo/demoIds";
import type { VisitTeamRole } from "@/lib/visits/team";

export type TaskAccessSuccess = {
  ok: true;
  userId: string;
  role: AppRole;
  visitRole?: "admin" | VisitTeamRole;
};

export type TaskAccessFailure = {
  ok: false;
  error: string;
  errorCode?: "business";
};

export type TaskAccessResult = TaskAccessSuccess | TaskAccessFailure;

async function resolveSession() {
  const ctx = await getAppSession();
  if (!ctx?.user.role) {
    return null;
  }
  return ctx;
}

/** Technicians may only mutate tasks assigned to them; operational admin roles may mutate any task. */
export async function assertCanMutateTask(taskId: string): Promise<TaskAccessResult> {
  return assertCanContributeToTask(taskId);
}

/** Admin, Master or assistant may contribute (fotos, notas, medições). */
export async function assertCanContributeToTask(taskId: string): Promise<TaskAccessResult> {
  if (isOnboardingDemoId(taskId)) {
    return { ok: false, error: "Entidade de formação — não sincroniza com o CRM." };
  }

  const ctx = await resolveSession();
  if (!ctx) {
    return { ok: false, error: "Não autenticado." };
  }

  const role = ctx.user.role;
  if (canAccessAdminPanel(role)) {
    return { ok: true, userId: ctx.user.id, role, visitRole: "admin" };
  }

  if (role !== "technician") {
    return { ok: false, error: "Acesso não autorizado." };
  }

  const teamAccess = await getTaskTeamAccess(taskId);
  if (!teamAccess) {
    return { ok: false, error: "Visita não encontrada." };
  }

  if (teamAccess.masterId === ctx.user.id) {
    return { ok: true, userId: ctx.user.id, role, visitRole: "master" };
  }

  if (teamAccess.assistantIds.includes(ctx.user.id)) {
    return { ok: true, userId: ctx.user.id, role, visitRole: "assistant" };
  }

  return { ok: false, error: "Não está atribuído a esta visita." };
}

/** Only admin or visit Master may start/close visits and control lifecycle. */
export async function assertCanControlVisitLifecycle(taskId: string): Promise<TaskAccessResult> {
  if (isOnboardingDemoId(taskId)) {
    return { ok: false, error: "Entidade de formação — não sincroniza com o CRM." };
  }

  const ctx = await resolveSession();
  if (!ctx) {
    return { ok: false, error: "Não autenticado." };
  }

  const role = ctx.user.role;
  if (canAccessAdminPanel(role)) {
    return { ok: true, userId: ctx.user.id, role, visitRole: "admin" };
  }

  if (role !== "technician") {
    return { ok: false, error: "Acesso não autorizado." };
  }

  const teamAccess = await getTaskTeamAccess(taskId);
  if (!teamAccess) {
    return { ok: false, error: "Visita não encontrada." };
  }

  if (teamAccess.masterId === ctx.user.id) {
    return { ok: true, userId: ctx.user.id, role, visitRole: "master" };
  }

  if (teamAccess.assistantIds.includes(ctx.user.id)) {
    return {
      ok: false,
      error: "Apenas o técnico Master pode iniciar ou fechar esta visita.",
      errorCode: "business",
    };
  }

  return { ok: false, error: "Não está atribuído a esta visita." };
}