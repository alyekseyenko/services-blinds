"use server";

import { ActionResponse } from "@/lib/types/action-response";
import {
  CreateVisitServicePayloadSchema,
  DeleteVisitServicePayloadSchema,
  UpdateVisitServicePayloadSchema,
} from "@/lib/schemas";
import {
  createVisitService,
  deleteVisitService,
  updateVisitService,
} from "@/lib/crm/visitServices";
import { assertCanMutateTask } from "@/lib/auth/taskAccess";
import { getAppSession } from "@/lib/auth/session.server";
import { toUserMessage } from "@/lib/userMessages";

async function assertCanManageVisit(
  taskId: string
): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const access = await assertCanMutateTask(taskId);
  if (!access.ok) {
    return { ok: false, error: access.error };
  }
  const session = await getAppSession();
  const displayName = session?.user?.name || "Técnico";
  return { ok: true, name: displayName };
}

export async function createVisitServiceAction(
  raw: unknown
): Promise<ActionResponse<{ opportunityId: string }>> {
  try {
    const parsed = CreateVisitServicePayloadSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: "Dados do serviço extra inválidos." };
    }

    const auth = await assertCanManageVisit(parsed.data.taskId);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    const payload = {
      ...parsed.data,
      mode: parsed.data.mode ?? "now",
    };
    const result = await createVisitService(payload, auth.name);
    if (!result.success || !result.opportunityId) {
      return { success: false, error: result.error || "Não foi possível criar o serviço." };
    }

    return { success: true, data: { opportunityId: result.opportunityId } };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Erro inesperado.");
    return { success: false, error: message };
  }
}

export async function updateVisitServiceAction(
  raw: unknown
): Promise<ActionResponse<{ opportunityId: string }>> {
  try {
    const parsed = UpdateVisitServicePayloadSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: "Dados de atualização inválidos." };
    }

    const auth = await assertCanManageVisit(parsed.data.taskId);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    const result = await updateVisitService(
      { ...parsed.data, mode: parsed.data.mode ?? "now" },
      auth.name
    );
    if (!result.success || !result.opportunityId) {
      return { success: false, error: result.error || "Não foi possível atualizar o serviço." };
    }

    return { success: true, data: { opportunityId: result.opportunityId } };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Erro inesperado.");
    return { success: false, error: message };
  }
}

export async function deleteVisitServiceAction(
  raw: unknown
): Promise<ActionResponse<void>> {
  try {
    const parsed = DeleteVisitServicePayloadSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: "Pedido de eliminação inválido." };
    }

    const auth = await assertCanManageVisit(parsed.data.taskId);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    const result = await deleteVisitService(parsed.data.taskId, parsed.data.opportunityId);
    if (!result.success) {
      return { success: false, error: result.error || "Não foi possível apagar o serviço." };
    }

    return { success: true };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Erro inesperado.");
    return { success: false, error: message };
  }
}
