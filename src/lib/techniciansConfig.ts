import { deriveWorkflowMarkerKey } from "@/lib/crm/contract";
import { readDesignToken } from "@/lib/design/cssVar";
import {
  buildTeardropMarkerSvg,
  type MarkerStatusBadge,
} from "@/lib/map/serviceMarkerArt";

const TECHNICIAN_PALETTE_VARS = [
  "--technician-palette-1",
  "--technician-palette-2",
  "--technician-palette-3",
  "--technician-palette-4",
  "--technician-palette-5",
  "--technician-palette-6",
  "--technician-palette-7",
  "--technician-palette-8",
] as const;

export function getTechnicianColor(technicianId: string | null | undefined): string {
  if (!technicianId) return readDesignToken("--technician-default");
  const index =
    Math.abs(
      technicianId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    ) % TECHNICIAN_PALETTE_VARS.length;
  return readDesignToken(TECHNICIAN_PALETTE_VARS[index]);
}

export interface ServiceTypeColorInfo {
  bg: string;
  text: string;
  pin: string;
  label: string;
  badge: string;
}

type ServiceMeta = { label: string; badge: string; tokenPrefix: string };

const SERVICE_META: Record<string, ServiceMeta> = {
  INSTALACAO: { label: "Instalação", badge: "IN", tokenPrefix: "instalacao" },
  MANUTENCAO: { label: "Manutenção", badge: "MN", tokenPrefix: "manutencao" },
  REPARACAO: { label: "Reparação", badge: "RP", tokenPrefix: "reparacao" },
  TIRAR_MEDIDAS: { label: "Tirar Medidas", badge: "MD", tokenPrefix: "medidas" },
  REMEDICAO: { label: "Retificação Medidas", badge: "RM", tokenPrefix: "remedicao" },
  REAGENDAR: { label: "Reagendar", badge: "RG", tokenPrefix: "reagendar" },
  GERAL: { label: "Geral", badge: "SV", tokenPrefix: "geral" },
};

function colorsFromPrefix(prefix: string): Pick<ServiceTypeColorInfo, "bg" | "text" | "pin"> {
  return {
    bg: readDesignToken(`--service-${prefix}-bg`),
    text: readDesignToken(`--service-${prefix}-fg`),
    pin: readDesignToken(`--service-${prefix}-pin`),
  };
}

export const serviceTypeConfig: Record<string, ServiceTypeColorInfo> = Object.fromEntries(
  Object.entries(SERVICE_META).map(([key, meta]) => [
    key,
    { ...colorsFromPrefix(meta.tokenPrefix), label: meta.label, badge: meta.badge },
  ])
) as Record<string, ServiceTypeColorInfo>;

export function normalizeServiceTypeKey(type: string | undefined | null): string {
  const t = (type || "").toUpperCase().replace(/\s/g, "_");
  if (!t) return "GERAL";
  if (t === "GERAL") return "GERAL";
  if (t.includes("INSTAL") || t.includes("AGENDAR_INST") || t.includes("MARCAR_INST")) {
    return "INSTALACAO";
  }
  if (t.includes("MEDID") || t === "TIRAR_MEDIDAS" || t.includes("ORCAMENT")) {
    return "TIRAR_MEDIDAS";
  }
  if (t.includes("REMED")) return "REMEDICAO";
  if (t.includes("REPAR") || t.includes("ASSIST")) return "REPARACAO";
  if (t.includes("MANUT")) return "MANUTENCAO";
  if (t.includes("REAGEND")) return "REAGENDAR";
  if (SERVICE_META[t]) return t;
  return "GERAL";
}

export function getServiceTypeColor(type: string | undefined | null): ServiceTypeColorInfo {
  const key = normalizeServiceTypeKey(type);
  return serviceTypeConfig[key] ?? serviceTypeConfig.GERAL;
}

export function resolveServiceType(task: {
  stage?: string | null;
  title?: string | null;
  serviceType?: string | string[] | null;
}): string {
  const raw = task.serviceType;
  const fromField = Array.isArray(raw) ? raw[0] : raw;
  if (fromField && normalizeServiceTypeKey(fromField) === "REAGENDAR") {
    return "REAGENDAR";
  }
  if (task.stage) {
    return deriveWorkflowMarkerKey(task.stage, task.title);
  }
  return fromField || "";
}

export interface ServiceMarkerOptions {
  status?: MarkerStatusBadge;
  isHighlighted?: boolean;
  alertColor?: string | null;
  isSelected?: boolean;
  technicianColor?: string | null;
  size?: number;
}

export function buildServiceTypeMarkerSvg(
  serviceType: string | undefined | null,
  options: ServiceMarkerOptions = {}
): string {
  const key = normalizeServiceTypeKey(serviceType);
  const config = getServiceTypeColor(key);
  const width = options.size ?? 36;

  return buildTeardropMarkerSvg({
    pinColor: config.pin,
    typeKey: key,
    status: options.status ?? null,
    isSelected: options.isSelected,
    isHighlighted: options.isHighlighted,
    alertColor: options.alertColor,
    technicianColor: options.technicianColor,
    width,
  });
}

export function buildServiceTypeLegendMarkerSvg(
  serviceType: string | undefined | null,
  size = 52
): string {
  return buildServiceTypeMarkerSvg(serviceType, { size });
}

/** @deprecated use getTechnicianColor */
export const technicianColors = {
  palette: TECHNICIAN_PALETTE_VARS.map((v) => readDesignToken(v)),
  default: readDesignToken("--technician-default"),
};
