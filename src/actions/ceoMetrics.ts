"use server";

import { ActionResponse } from "@/lib/types/action-response";
import { CeoMetrics } from "@/lib/schemas/ceoMetrics";
import { fetchCeoMetricsFromCRM } from "@/lib/crm/ceoMetrics";
import { canAccessCeoPanel } from "@/lib/auth/session";
import { getAppSession } from "@/lib/auth/session.server";
import { toUserMessage } from "@/lib/userMessages";

export async function getCeoMetricsAction(year?: number | null): Promise<ActionResponse<CeoMetrics>> {
  try {
    const auth = await getAppSession();
    if (!auth || !canAccessCeoPanel(auth.user.role!)) {
      return { success: false, error: "Acesso não autorizado ao painel executivo." };
    }

    const data = await fetchCeoMetricsFromCRM(year);
    return {
      success: true,
      data,
    };
  } catch (error: unknown) {
    console.error("[getCeoMetricsAction] Error:", error);
    return {
      success: false,
      error: toUserMessage(error, "Não foi possível carregar os dados executivos do CRM."),
    };
  }
}
