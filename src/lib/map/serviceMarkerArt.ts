/**
 * Pushpin: cor = tipo de serviço; disco branco com sigla (IN, MD, …) legível à distância.
 */
import { getServiceTypeColor, normalizeServiceTypeKey } from "@/lib/techniciansConfig";

export const MAP_PIN_VIEW_WIDTH = 42;
export const MAP_PIN_VIEW_HEIGHT = 56;
export const MAP_PIN_TIP_X = 21;
export const MAP_PIN_TIP_Y = 55;

export const MAP_PIN_HEAD_CX = 21;
export const MAP_PIN_HEAD_CY = 14.5;
export const MAP_PIN_HEAD_R = 15;
export const MAP_PIN_DISC_R = 13.2;

export const MAP_PIN_ASPECT = MAP_PIN_VIEW_HEIGHT / MAP_PIN_VIEW_WIDTH;

export function getPushpinBodyPath(): string {
  const cx = MAP_PIN_HEAD_CX;
  const cy = MAP_PIN_HEAD_CY;
  const r = MAP_PIN_HEAD_R;
  return `M ${MAP_PIN_TIP_X} ${MAP_PIN_TIP_Y}
    L ${cx - r * 0.72} ${cy + r * 0.55}
    C ${cx - r} ${cy + r * 0.15} ${cx - r} ${cy - r * 0.55} ${cx} ${cy - r}
    C ${cx + r} ${cy - r * 0.55} ${cx + r} ${cy + r * 0.15} ${cx + r * 0.72} ${cy + r * 0.55}
    L ${MAP_PIN_TIP_X} ${MAP_PIN_TIP_Y} Z`;
}

export function getTeardropPinPath(): string {
  return getPushpinBodyPath();
}

export type MarkerStatusBadge = "late" | "done" | "unscheduled" | null;

function escapeSvgText(value: string): string {
  return value.replace(/[<>&"]/g, "");
}

/** Sigla grande no disco branco (cor = tipo de serviço). */
export function getServiceTypeMonogramSvg(typeKey: string, letterColor: string): string {
  const key = normalizeServiceTypeKey(typeKey);
  const badge = escapeSvgText(getServiceTypeColor(key).badge);
  const fontSize = badge.length >= 3 ? 9.5 : 13;
  const y = MAP_PIN_HEAD_CY + 0.8;
  return `<text x="${MAP_PIN_HEAD_CX}" y="${y}" text-anchor="middle" dominant-baseline="central" fill="${letterColor}" font-family="Inter, system-ui, sans-serif" font-size="${fontSize}" font-weight="900" letter-spacing="-0.6">${badge}</text>`;
}

/** @deprecated Use monogram; kept for callers expecting this name. */
export function getServiceTypeIconSvg(typeKey: string, iconColor?: string): string {
  return getServiceTypeMonogramSvg(typeKey, iconColor ?? "#0f172a");
}

function getStatusBadgeSvg(status: MarkerStatusBadge): string {
  if (!status) return "";
  const x = 34;
  const y = 4;
  if (status === "late") {
    return `<circle cx="${x}" cy="${y}" r="6" fill="#dc2626" stroke="#ffffff" stroke-width="2"/>
      <text x="${x}" y="${y + 0.5}" text-anchor="middle" dominant-baseline="central" fill="#ffffff" font-family="Inter, system-ui, sans-serif" font-size="10" font-weight="900">!</text>`;
  }
  if (status === "done") {
    return `<circle cx="${x}" cy="${y}" r="6" fill="#059669" stroke="#ffffff" stroke-width="2"/>
      <path d="M${x - 2.5} ${y}l2 2 4-4.5" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (status === "unscheduled") {
    return `<circle cx="${x}" cy="${y}" r="6" fill="#64748b" stroke="#ffffff" stroke-width="2"/>
      <path d="M${x} ${y - 2}v2.2l1.6 1" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>`;
  }
  return "";
}

export interface TeardropMarkerArtOptions {
  pinColor: string;
  typeKey: string;
  status?: MarkerStatusBadge;
  isSelected?: boolean;
  isHighlighted?: boolean;
  alertColor?: string | null;
  technicianColor?: string | null;
  width?: number;
}

export function buildTeardropMarkerSvg(options: TeardropMarkerArtOptions): string {
  const {
    pinColor,
    typeKey,
    status = null,
    isSelected = false,
    isHighlighted = false,
    alertColor = null,
    technicianColor = null,
    width = 42,
  } = options;

  const height = Math.round(width * MAP_PIN_ASPECT);
  const body = getPushpinBodyPath();
  const monogram = getServiceTypeMonogramSvg(typeKey, pinColor);
  const badge = getStatusBadgeSvg(status);

  const ringColor = alertColor
    ? alertColor
    : isSelected
      ? "#84cc16"
      : isHighlighted
        ? "#f8fafc"
        : "#ffffff";

  const ringWidth = alertColor ? 3.5 : isSelected ? 4 : isHighlighted ? 3 : 2.5;

  const halo = isSelected
    ? `<path d="${body}" fill="none" stroke="#84cc16" stroke-width="7" opacity="0.4"/>`
    : "";

  const techDot = technicianColor
    ? `<circle cx="7" cy="7" r="4.5" fill="${technicianColor}" stroke="#ffffff" stroke-width="2"/>`
    : "";

  const shadow = `<ellipse cx="${MAP_PIN_TIP_X}" cy="${MAP_PIN_TIP_Y + 0.5}" rx="7.5" ry="2" fill="rgba(15,23,42,0.22)"/>`;

  const whiteDisc = `<circle cx="${MAP_PIN_HEAD_CX}" cy="${MAP_PIN_HEAD_CY}" r="${MAP_PIN_DISC_R}" fill="#ffffff" stroke="${pinColor}" stroke-width="2.4"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${MAP_PIN_VIEW_WIDTH} ${MAP_PIN_VIEW_HEIGHT}">
    ${shadow}
    ${halo}
    <path d="${body}" fill="${pinColor}" stroke="${ringColor}" stroke-width="${ringWidth}" stroke-linejoin="round"/>
    ${whiteDisc}
    ${monogram}
    ${badge}
    ${techDot}
  </svg>`;
}

export function buildRouteStopTeardropSvg(options: {
  pinColor: string;
  label: string;
  isLate: boolean;
  width: number;
}): string {
  const { pinColor, label, isLate, width } = options;
  const height = Math.round(width * MAP_PIN_ASPECT);
  const body = getPushpinBodyPath();
  const ring = isLate ? "#dc2626" : "#ffffff";
  const ringW = isLate ? 3.5 : 2.5;
  const badge = isLate ? getStatusBadgeSvg("late") : "";

  const safeLabel = escapeSvgText(label);
  const fontSize = safeLabel.length > 1 ? 13 : 16;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${MAP_PIN_VIEW_WIDTH} ${MAP_PIN_VIEW_HEIGHT}">
    <ellipse cx="${MAP_PIN_TIP_X}" cy="${MAP_PIN_TIP_Y + 0.5}" rx="7.5" ry="2" fill="rgba(15,23,42,0.22)"/>
    <path d="${body}" fill="${pinColor}" stroke="${ring}" stroke-width="${ringW}" stroke-linejoin="round"/>
    <circle cx="${MAP_PIN_HEAD_CX}" cy="${MAP_PIN_HEAD_CY}" r="${MAP_PIN_DISC_R}" fill="#ffffff" stroke="${pinColor}" stroke-width="2.4"/>
    <text x="${MAP_PIN_HEAD_CX}" y="${MAP_PIN_HEAD_CY + 0.8}" text-anchor="middle" dominant-baseline="central" fill="${pinColor}" font-family="Inter, system-ui, sans-serif" font-size="${fontSize}" font-weight="900" letter-spacing="-0.5">${safeLabel}</text>
    ${badge}
  </svg>`;
}

export function getServiceTypeLegendHint(typeKey: string): string {
  const key = normalizeServiceTypeKey(typeKey);
  const badge = getServiceTypeColor(key).badge;
  switch (key) {
    case "INSTALACAO":
      return `${badge} — instalação de estores`;
    case "TIRAR_MEDIDAS":
      return `${badge} — tirar medidas`;
    case "REPARACAO":
      return `${badge} — reparação / assistência`;
    case "MANUTENCAO":
      return `${badge} — manutenção`;
    case "REMEDICAO":
      return `${badge} — nova medição`;
    case "REAGENDAR":
      return `${badge} — reagendar visita`;
    default:
      return `${badge} — serviço geral`;
  }
}
