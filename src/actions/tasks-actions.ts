"use server";

import { ActionResponse } from "@/lib/types/action-response";
import { TaskStatusEnum, TaskStatus } from "@/lib/schemas";
import { updateTaskStatus } from "@/lib/crm/tasks";

export async function completeTaskAction(
  taskId: string,
  status: string,
  notes: string,
  photos: string[] = []
): Promise<ActionResponse<void>> {
  try {
    // Normalizar o estado (remover acentos e colocar em maiúsculas, Ex: "Concluído" -> "CONCLUIDO")
    const normalizedStatus = status
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    // 1. Validate status enum using Zod
    const validationResult = TaskStatusEnum.safeParse(normalizedStatus);
    
    if (!validationResult.success) {
      return {
        success: false,
        error: `Estado de tarefa inválido: "${status}" (normalizado: "${normalizedStatus}")`
      };
    }

    const validStatus: TaskStatus = validationResult.data;


    // 2. Call infrastructure
    await updateTaskStatus(taskId, validStatus, notes, photos);

    return { success: true };
  } catch (error: any) {
    console.error("[completeTaskAction] Error:", error);
    
    return {
      success: false,
      error: error.message || "Não foi possível atualizar a tarefa no CRM."
    };
  }
}
