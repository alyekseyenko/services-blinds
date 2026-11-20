"use server";

import { canAccessAdminPanel } from "@/lib/auth/session";
import { getAppSession } from "@/lib/auth/session.server";
import type { FairServiceTypeDuration } from "@/lib/schemas/ceoMetrics";
import { toUserMessage } from "@/lib/userMessages";
import { fetchFairOnSiteDurationBenchmarks } from "@/lib/visits/fairOnSiteBenchmarks.server";
import type { ActionResponse } from "@/lib/types/action-response";

export async function getFairOnSiteDurationBenchmarksAction(): Promise<
  ActionResponse<FairServiceTypeDuration[]>
> {
  try {
    const auth = await getAppSession();
    if (!auth?.user.role || !canAccessAdminPanel(auth.user.role)) {
      return { success: false, error: "Acesso não autorizado." };
    }

    const data = await fetchFairOnSiteDurationBenchmarks();
    return { success: true, data };
  } catch (error: unknown) {
    console.error("[getFairOnSiteDurationBenchmarksAction]", error);
    return {
      success: false,
      error: toUserMessage(error, "Não foi possível carregar os tempos médios por tipo de serviço."),
    };
  }
}
