"use server";

import { ActionResponse } from "@/lib/types/action-response";
import { TaskStatusEnum, TaskStatus } from "@/lib/schemas";
import { assertCanMutateTask } from "@/lib/auth/taskAccess";
import { updateTaskStatus } from "@/lib/crm/tasks";

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

    const validationResult = TaskStatusEnum.safeParse(normalizedStatus);

    if (!validationResult.success) {
      return {
        success: false,
        error: `Estado de tarefa inválido: "${status}" (normalizado: "${normalizedStatus}")`,
      };
    }

    const validStatus: TaskStatus = validationResult.data;

    await updateTaskStatus(taskId, validStatus, notes, photos);

    return { success: true };
  } catch (error: unknown) {
    console.error("[completeTaskAction] Error:", error);

    const message = error instanceof Error ? error.message : "Erro ao atualizar a tarefa.";
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
  photos: string[] = []
): Promise<ActionResponse<void>> {
  try {
    const access = await assertCanMutateTask(taskId);
    if (!access.ok) {
      return { success: false, error: access.error };
    }

    await updateTaskStatus(taskId, status, observations, photos);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao sincronizar o estado da visita.";
    return { success: false, error: message };
  }
}
