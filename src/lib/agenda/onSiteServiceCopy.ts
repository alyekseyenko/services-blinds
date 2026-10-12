import type { VisitServiceMode } from "@/lib/schemas";

const SERVICE_TYPE_PT: Record<string, string> = {
  TIRAR_MEDIDAS: "Medidas",
  REMEDICAO: "Remedição",
  MANUTENCAO: "Manutenção",
  REPARACAO: "Reparação",
};

export function formatOnSiteServiceDetail(
  serviceType: string,
  mode: VisitServiceMode
): string {
  const label = SERVICE_TYPE_PT[serviceType] ?? serviceType.replace(/_/g, " ");
  const when = mode === "now" ? "feito agora" : "agendar depois";
  return `${label} · ${when}`;
}
