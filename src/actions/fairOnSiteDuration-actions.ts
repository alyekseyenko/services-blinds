"use server";

import { canAccessAdminPanel } from "@/lib/auth/session";
import { getAppSession } from "@/lib/auth/session.server";
import { toUserMessage } from "@/lib/userMessages";
import { fetchOnSiteDurationBenchmarks } from "@/lib/visits/fairOnSiteBenchmarks.server";
import type { ActionResponse } from "@/lib/types/action-response";
import type { FairServiceTypeDuration } from "@/lib/schemas/ceoMetrics";
import type { ServiceTypeDurationAverage } from "@/lib/visits/onSiteDurationStats";

export async function getFairOnSiteDurationBenchmarksAction(): Promise<
  ActionResponse<{
    fair: FairServiceTypeDuration[];
    averages: ServiceTypeDurationAverage[];
  }>
> {
  try {
    const auth = await getAppSession();
    if (!auth?.user.role || !canAccessAdminPanel(auth.user.role)) {
      return { success: false, error: "Acesso não autorizado." };
    }

    const data = await fetchOnSiteDurationBenchmarks();
    return { success: true, data };
  } catch (error: unknown) {
    console.error("[getFairOnSiteDurationBenchmarksAction]", error);
    return {
      success: false,
      error: toUserMessage(error, "Não foi possível carregar os tempos médios por tipo de serviço."),
    };
  }
}
