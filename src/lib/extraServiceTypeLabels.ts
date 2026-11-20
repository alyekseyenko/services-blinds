import type { ExtraServiceType } from "@/lib/schemas";
import { getServiceTypeColor } from "@/lib/techniciansConfig";

export function getExtraServiceTypeLabel(type: string): string {
  return getServiceTypeColor(type).label;
}

/** Nome da oportunidade criada no local — distingue o extra da visita principal. */
export function buildOnSiteExtraOpportunityName(
  serviceType: string,
  clientLabel: string,
  mode: "now" | "later"
): string {
  const typeLabel = getExtraServiceTypeLabel(serviceType) || "Serviço";
  const when = mode === "later" ? "a agendar" : "feito agora";
  const client = clientLabel.trim() || "Cliente";
  return `Serviço extra no local (${typeLabel}, ${when}) — ${client}`;
}

export const EXTRA_SERVICE_TYPE_OPTIONS: { type: ExtraServiceType; label: string }[] = [
  { type: "TIRAR_MEDIDAS", label: getServiceTypeColor("TIRAR_MEDIDAS").label },
  { type: "REMEDICAO", label: getServiceTypeColor("REMEDICAO").label },
  { type: "MANUTENCAO", label: getServiceTypeColor("MANUTENCAO").label },
  { type: "REPARACAO", label: getServiceTypeColor("REPARACAO").label },
];
