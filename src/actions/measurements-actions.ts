"use server";

import { ActionResponse } from "@/lib/types/action-response";
import { MeasurementsPayloadSchema, MeasurementsPayload } from "@/lib/schemas";
import { saveMeasurements } from "@/lib/crm/measurements";
import { fetchServiceItemsByOpportunity } from "@/lib/crm/items";

export async function submitMeasurementsAction(
  taskId: string,
  oppId: string,
  rawData: any
): Promise<ActionResponse<void>> {
  try {
    // 1. Validar a entrada com Zod
    const validationResult = MeasurementsPayloadSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      console.error("[Zod Validation Error]", validationResult.error.format());
      return {
        success: false,
        error: "Dados de medidas inválidos. Por favor, verifique o formulário."
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
  } catch (error: any) {
    console.error("[submitMeasurementsAction] Falha crítica:", error);
    
    // Devolver resposta gracefull
    return {
      success: false,
      error: error.message || "Ocorreu um erro ao comunicar com a Base de Dados."
    };
  }
}

export async function getServiceItemsByOpportunityAction(
  opportunityId: string
): Promise<ActionResponse<any[]>> {
  try {
    if (!opportunityId) {
      return { success: false, error: "ID de Oportunidade em falta." };
    }
    const items = await fetchServiceItemsByOpportunity(opportunityId);
    return { success: true, data: items };
  } catch (error: any) {
    console.error("[getServiceItemsByOpportunityAction] Error:", error);
    return { success: false, error: error.message || "Não foi possível carregar os itens." };
  }
}
