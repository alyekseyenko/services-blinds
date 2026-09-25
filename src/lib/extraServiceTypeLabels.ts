import type { ExtraServiceType } from "@/lib/schemas";
import { getServiceTypeColor } from "@/lib/techniciansConfig";

export function getExtraServiceTypeLabel(type: string): string {
  return getServiceTypeColor(type).label;
}

export const EXTRA_SERVICE_TYPE_OPTIONS: { type: ExtraServiceType; label: string }[] = [
  { type: "TIRAR_MEDIDAS", label: getServiceTypeColor("TIRAR_MEDIDAS").label },
  { type: "REMEDICAO", label: getServiceTypeColor("REMEDICAO").label },
  { type: "MANUTENCAO", label: getServiceTypeColor("MANUTENCAO").label },
  { type: "REPARACAO", label: getServiceTypeColor("REPARACAO").label },
];
