import type { AdminCommercialServiceType } from "@/lib/schemas/adminCommercialService";
import { EXTRA_SERVICE_TYPE_OPTIONS } from "@/lib/extraServiceTypeLabels";
import { getServiceTypeColor } from "@/lib/techniciansConfig";

export const ADMIN_COMMERCIAL_SERVICE_OPTIONS: {
  type: AdminCommercialServiceType;
  label: string;
}[] = [
  ...EXTRA_SERVICE_TYPE_OPTIONS,
  { type: "INSTALACAO", label: getServiceTypeColor("INSTALACAO").label },
];

export function getAdminCommercialServiceLabel(type: AdminCommercialServiceType): string {
  const match = ADMIN_COMMERCIAL_SERVICE_OPTIONS.find((o) => o.type === type);
  return match?.label ?? type;
}
