"use server";

import { ActionResponse } from "@/lib/types/action-response";
import { MeasurementsPayloadSchema, MeasurementsPayload } from "@/lib/schemas";
import { assertCanMutateTask } from "@/lib/auth/taskAccess";
import { assertCanAccessOpportunity } from "@/lib/auth/opportunityAccess";
import { saveMeasurements } from "@/lib/crm/measurements";
import { fetchServiceItemsByOpportunity } from "@/lib/crm/items";

export async function submitMeasurementsAction(
  taskId: string,
  oppId: string,
  rawData: unknown
): Promise<ActionResponse<void>> {
  try {
    const access = await assertCanMutateTask(taskId);
    if (!access.ok) {
      return { success: false, error: access.error };
    }

    const validationResult = MeasurementsPayloadSchema.safeParse(rawData);

    if (!validationResult.success) {
      console.error("[Zod Validation Error]", validationResult.error.format());
      return {
        success: false,
        error: "Dados de medidas inválidos. Por favor, verifique o formulário.",
      };
    }

    const payload: MeasurementsPayload = validationResult.data;

    const result = await saveMeasurements(taskId, oppId, payload);
    if (!result.success) {
      return {
        success: false,
        error: result.error || "Falha ao guardar medições no CRM.",
      };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("[submitMeasurementsAction] Falha crítica:", error);

    const message = error instanceof Error ? error.message : "Ocorreu um erro ao comunicar com a Base de Dados.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function getServiceItemsByOpportunityAction(
  opportunityId: string,
  taskId?: string
): Promise<ActionResponse<unknown[]>> {
  try {
    if (!opportunityId) {
      return { success: false, error: "ID de Oportunidade em falta." };
    }

    const access = await assertCanAccessOpportunity(opportunityId, taskId);
    if (!access.ok) {
      return { success: false, error: access.error };
    }

    const items = await fetchServiceItemsByOpportunity(opportunityId);
    return { success: true, data: items };
  } catch (error: unknown) {
    console.error("[getServiceItemsByOpportunityAction] Error:", error);
    const message = error instanceof Error ? error.message : "Não foi possível carregar os itens.";
    return { success: false, error: message };
  }
}
