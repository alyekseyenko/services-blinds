import type { FairServiceTypeDuration } from "@/lib/schemas/ceoMetrics";
import { lookupFairServiceTypeDuration } from "@/lib/visitOnSiteDurationStats";
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
  }
): FairServiceTypeDuration | undefined {
  const key = resolveOpportunityServiceTypeKey(opportunity);
  return lookupFairServiceTypeDuration(fairDurations, key);
}
