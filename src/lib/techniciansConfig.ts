import { deriveWorkflowMarkerKey } from "@/lib/crm/contract";
import {
  buildTeardropMarkerSvg,
  type MarkerStatusBadge,
} from "@/lib/map/serviceMarkerArt";

/**
 * Configuração centralizada de técnicos e suas cores
 */
export const technicianColors = {
  palette: [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#f97316",
  ],
  default: "#94a3b8",
};

export function getTechnicianColor(technicianId: string | null | undefined): string {
  if (!technicianId) return technicianColors.default;
  const index =
    Math.abs(
      technicianId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    ) % technicianColors.palette.length;
  return technicianColors.palette[index];
}

export interface ServiceTypeColorInfo {
  bg: string;
  text: string;
  pin: string;
  label: string;
  badge: string;
}

export const serviceTypeConfig: Record<string, ServiceTypeColorInfo> = {
  INSTALACAO: {
    bg: "#ecfdf5",
    text: "#065f46",
    pin: "#059669",
    label: "Instalação",
    badge: "IN",
  },
  MANUTENCAO: {
    bg: "#f8fafc",
    text: "#1e293b",
    pin: "#475569",
    label: "Manutenção",
    badge: "MN",
  },
  REPARACAO: {
    bg: "#fff7ed",
    text: "#9a3412",
    pin: "#ea580c",
    label: "Reparação",
    badge: "RP",
  },
  TIRAR_MEDIDAS: {
    bg: "#f0f9ff",
    text: "#0c4a6e",
    pin: "#0284c7",
    label: "Tirar Medidas",
    badge: "MD",
  },
  REMEDICAO: {
    bg: "#f5f3ff",
    text: "#5b21b6",
    pin: "#7c3aed",
    label: "Remedição",
    badge: "RM",
  },
  REAGENDAR: {
    bg: "#fdf2f8",
    text: "#9d174d",
    pin: "#db2777",
    label: "Reagendar",
    badge: "RG",
  },
  GERAL: {
    bg: "#f1f5f9",
    text: "#334155",
    pin: "#64748b",
    label: "Geral",
    badge: "SV",
  },
};

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
  if (serviceTypeConfig[t]) return t;
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
  /** Rendered width in pixels (height from aspect ratio). */
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
