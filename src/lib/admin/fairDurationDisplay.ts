import type { FairServiceTypeDuration } from "@/lib/schemas/ceoMetrics";
import {
  lookupFairServiceTypeDuration,
  lookupFairServiceTypeDurationForAllocation,
} from "@/lib/visitOnSiteDurationStats";
import { normalizeServiceTypeKey, resolveServiceType } from "@/lib/techniciansConfig";

export function resolveOpportunityServiceTypeKey(input: {
  serviceType?: string | string[] | null;
  title?: string | null;
  stage?: string | null;
}): string {
  const resolved = resolveServiceType({
    serviceType: Array.isArray(input.serviceType)
      ? input.serviceType[0]
      : input.serviceType ?? undefined,
    title: input.title ?? undefined,
    stage: input.stage ?? undefined,
  });
  return normalizeServiceTypeKey(resolved || input.serviceType?.toString() || "GERAL");
}

export function fairDurationForOpportunity(
  fairDurations: readonly FairServiceTypeDuration[],
  opportunity: {
    serviceType?: string | string[] | null;
    title?: string | null;
    stage?: string | null;
  },
  options?: {
    isTeam?: boolean;
    fairTeamDurations?: readonly FairServiceTypeDuration[];
  }
): FairServiceTypeDuration | undefined {
  const key = resolveOpportunityServiceTypeKey(opportunity);
  if (options?.isTeam || options?.fairTeamDurations) {
    return lookupFairServiceTypeDurationForAllocation(
      fairDurations,
      options.fairTeamDurations ?? [],
      fairDurations,
      key,
      Boolean(options.isTeam)
    );
  }
  return lookupFairServiceTypeDuration(fairDurations, key);
}
