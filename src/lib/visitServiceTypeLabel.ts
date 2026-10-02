import {
  getServiceTypeColor,
  normalizeServiceTypeKey,
  resolveServiceType,
} from "@/lib/techniciansConfig";

export function formatVisitServiceTypeLabel(input: {
  serviceType?: string | null;
  visitTitle?: string | null;
  stage?: string | null;
}): string | undefined {
  const resolved = resolveServiceType({
    serviceType: input.serviceType ?? undefined,
    title: input.visitTitle ?? undefined,
    stage: input.stage ?? undefined,
  });
  const key = normalizeServiceTypeKey(resolved || input.serviceType || input.visitTitle);
  const label = getServiceTypeColor(key).label;
  if (label === "Geral" && !resolved && !input.serviceType?.trim()) {
    return undefined;
  }
  return label;
}
