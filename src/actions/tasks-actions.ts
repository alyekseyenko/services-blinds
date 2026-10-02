"use server";

import { ActionResponse } from "@/lib/types/action-response";
import { TaskStatusEnum, TaskStatus } from "@/lib/schemas";
import { SyncPhotosSchema, parseSyncTaskStatus } from "@/lib/schemas/syncQueue";
import { assertCanMutateTask } from "@/lib/auth/taskAccess";
import { updateTaskStatus } from "@/lib/crm/tasks";
import { toUserMessage } from "@/lib/userMessages";

export async function completeTaskAction(
  taskId: string,
  status: string,
  notes: string,
  photos: string[] = []
): Promise<ActionResponse<void>> {
  try {
    const access = await assertCanMutateTask(taskId);
    if (!access.ok) {
      return { success: false, error: access.error };
    }

    const normalizedStatus = status
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const photosResult = SyncPhotosSchema.safeParse(photos);
    if (!photosResult.success) {
      return { success: false, error: "Lista de fotos inválida." };
    }

    const validationResult = TaskStatusEnum.safeParse(normalizedStatus);

    if (!validationResult.success) {
      return {
        success: false,
        error: `Estado de tarefa inválido: "${status}" (normalizado: "${normalizedStatus}")`,
      };
    }

    const validStatus: TaskStatus = validationResult.data;

    await updateTaskStatus(taskId, validStatus, notes, photosResult.data);

    return { success: true };
  } catch (error: unknown) {
    console.error("[completeTaskAction] Error:", error);

    const message = toUserMessage(error, "Erro ao atualizar a tarefa.");
    return {
      success: false,
      error: message,
    };
  }
}

/** Offline sync and direct technician updates (preserves display labels like "Concluído"). */
export async function syncUpdateTaskStatusAction(
  taskId: string,
  status: string,
  observations?: string,
  photos: string[] = [],
  clientRequestId?: string
): Promise<ActionResponse<void>> {
  try {
    const access = await assertCanMutateTask(taskId);
    if (!access.ok) {
      return { success: false, error: access.error };
    }

    const photosResult = SyncPhotosSchema.safeParse(photos);
    if (!photosResult.success) {
      return { success: false, error: "Lista de fotos inválida." };
    }

    const statusCheck = parseSyncTaskStatus(status);
    if (!statusCheck.success) {
      return { success: false, error: `Estado de visita inválido: "${status}".` };
    }

    await updateTaskStatus(
      taskId,
      status,
      observations,
      photosResult.data,
      clientRequestId
    );
    return { success: true };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Erro ao sincronizar o estado da visita.");
    return { success: false, error: message };
  }
}
