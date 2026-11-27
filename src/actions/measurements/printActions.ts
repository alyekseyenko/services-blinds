import { ActionResponse } from "@/lib/types/action-response";
import { getAppSession } from "@/lib/auth/session.server";
import { canAccessAdminPanel } from "@/lib/auth/rbac";
import { setMeasurementSheetPrinted } from "@/lib/measurements/repo/printState";
import { toUserMessage } from "@/lib/userMessages";

export async function setMeasurementSheetPrintedAction(
  sheetId: string,
  printed: boolean
): Promise<ActionResponse<{ printed: boolean }>> {
  try {
    const ctx = await getAppSession();
    if (!ctx?.user.role || !canAccessAdminPanel(ctx.user.role)) {
      return { success: false, error: "Acesso não autorizado." };
    }
    if (!sheetId) {
      return { success: false, error: "ID da ficha em falta." };
    }
    const result = await setMeasurementSheetPrinted({
      sheetId,
      printed,
      printedByName: printed ? ctx.user.name?.trim() || null : null,
    });
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, data: { printed } };
  } catch (error: unknown) {
    return {
      success: false,
      error: toUserMessage(error, "Não foi possível guardar o estado de impressão."),
    };
  }
}
