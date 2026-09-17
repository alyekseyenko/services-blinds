/**
 * Configuração centralizada de técnicos e suas cores
 */
export const technicianColors = {
  // Cores vibrantes para o mapa
  palette: [
    "#3b82f6", // Blue
    "#ef4444", // Red
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#f97316", // Orange
  ],
  default: "#94a3b8" // Slate
};

/**
 * Atribui uma cor consistente a um técnico com base no seu ID ou Nome
 */
export function getTechnicianColor(technicianId: string | null | undefined): string {
  if (!technicianId) return technicianColors.default;
  
  // Simples hash para pegar uma cor da paleta
  const index = Math.abs(technicianId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % technicianColors.palette.length;
  return technicianColors.palette[index];
}

export interface ServiceTypeColorInfo {
  bg: string;
  text: string;
  pin: string;
  label: string;
}

/**
 * Cores por Tipo de Serviço para alinhar com o Twenty CRM
 */
export const serviceTypeConfig: Record<string, ServiceTypeColorInfo> = {
  INSTALACAO: {
    bg: '#ecfdf5', // emerald-50
    text: '#065f46', // emerald-800
    pin: '#10b981', // emerald-500
    label: 'Instalação'
  },
  MANUTENCAO: {
    bg: '#f8fafc', // slate-50
    text: '#1e293b', // slate-800
    pin: '#64748b', // slate-500
    label: 'Manutenção'
  },
  REPARACAO: {
    bg: '#fff7ed', // orange-50
    text: '#9a3412', // orange-800
    pin: '#f97316', // orange-500
    label: 'Reparação'
  },
  TIRAR_MEDIDAS: {
    bg: '#f0fdf4', // green-50
    text: '#166534', // green-800
    pin: '#22c55e', // green-500
    label: 'Tirar Medidas'
  },
  REMEDICAO: {
    bg: '#eff6ff', // blue-50
    text: '#1e40af', // blue-800
    pin: '#3b82f6', // blue-500
    label: 'Remedição'
  },
  REAGENDAR: {
    bg: '#faf5ff', // purple-50
    text: '#6b21a8', // purple-800
    pin: '#a855f7', // purple-500
    label: 'Reagendar'
  }
};

/**
 * Retorna as cores completas para um tipo de serviço
 */
export function getServiceTypeColor(type: string | undefined | null): ServiceTypeColorInfo {
  const normalizedType = type?.toUpperCase().replace(/\s/g, '_') || '';
  return serviceTypeConfig[normalizedType] || {
    bg: '#f1f5f9', // slate-100
    text: '#475569', // slate-600
    pin: '#3b82f6', // default blue
    label: type || 'Geral'
  };
}

/** Resolve service type from task fields (CRM uses both naming conventions). */
export function resolveServiceType(task: {
  tipoDeServico?: string | string[] | null;
  serviceType?: string | string[] | null;
}): string {
  const raw = task.tipoDeServico ?? task.serviceType;
  if (Array.isArray(raw)) return raw[0] || '';
  return raw || '';
}

function getServiceTypeSymbolSvg(normalizedType: string, color: string): string {
  switch (normalizedType) {
    case 'INSTALACAO':
      // Blinds / window slats
      return `<rect x="10" y="11" width="16" height="3" rx="0.5" fill="${color}"/>
        <rect x="10" y="16" width="16" height="3" rx="0.5" fill="${color}"/>
        <rect x="10" y="21" width="16" height="3" rx="0.5" fill="${color}"/>`;
    case 'TIRAR_MEDIDAS':
      // Ruler
      return `<rect x="9" y="13" width="18" height="10" rx="1.5" fill="none" stroke="${color}" stroke-width="1.8"/>
        <line x1="13" y1="13" x2="13" y2="19" stroke="${color}" stroke-width="1.2"/>
        <line x1="17" y1="13" x2="17" y2="17" stroke="${color}" stroke-width="1.2"/>
        <line x1="21" y1="13" x2="21" y2="19" stroke="${color}" stroke-width="1.2"/>`;
    case 'REPARACAO':
      // Wrench
      return `<path d="M12 24l4-4 2 2-4 4 2 2 4-4 2 2-6 6-4-4z" fill="${color}"/>
        <circle cx="23" cy="13" r="3.5" fill="none" stroke="${color}" stroke-width="2"/>`;
    case 'MANUTENCAO':
      // Gear
      return `<circle cx="18" cy="18" r="4" fill="none" stroke="${color}" stroke-width="2"/>
        <circle cx="18" cy="18" r="1.5" fill="${color}"/>
        <line x1="18" y1="11" x2="18" y2="13.5" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
        <line x1="18" y1="22.5" x2="18" y2="25" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
        <line x1="11" y1="18" x2="13.5" y2="18" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
        <line x1="22.5" y1="18" x2="25" y2="18" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
    case 'REMEDICAO':
      // Redo arrow
      return `<path d="M24 14a7 7 0 0 0-11-5" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
        <polyline points="11,14 13,12 13,16" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 22a7 7 0 0 0 11 5" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
        <polyline points="25,22 23,24 23,20" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    case 'REAGENDAR':
      // Calendar
      return `<rect x="10" y="12" width="16" height="14" rx="2" fill="none" stroke="${color}" stroke-width="1.8"/>
        <line x1="10" y1="16" x2="26" y2="16" stroke="${color}" stroke-width="1.5"/>
        <line x1="14" y1="10" x2="14" y2="14" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
        <line x1="22" y1="10" x2="22" y2="14" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
    default:
      // Generic service dot
      return `<circle cx="18" cy="18" r="5" fill="${color}"/>`;
  }
}

export interface ServiceMarkerOptions {
  isLate?: boolean;
  isHighlighted?: boolean;
  alertColor?: string | null;
  fillOverride?: string | null;
}

/** Builds an SVG map marker with a service-type symbol (high contrast pin). */
export function buildServiceTypeMarkerSvg(
  serviceType: string | undefined | null,
  options: ServiceMarkerOptions = {}
): string {
  const normalizedType = (serviceType || '').toUpperCase().replace(/\s/g, '_');
  const config = getServiceTypeColor(normalizedType);
  const pinColor = options.isLate ? '#f59e0b' : (options.fillOverride || config.pin);
  const strokeColor = options.alertColor || (options.isHighlighted ? pinColor : '#ffffff');
  const strokeWidth = options.alertColor ? 3.5 : (options.isHighlighted ? 3 : 2.5);
  const bgFill = options.isHighlighted ? '#ffffff' : '#090d16';
  const symbolColor = options.isHighlighted ? pinColor : '#ffffff';
  const innerFill = options.isHighlighted ? `${pinColor}44` : pinColor;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="16" fill="${bgFill}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
    <circle cx="18" cy="18" r="11" fill="${innerFill}" fill-opacity="${options.isHighlighted ? '0.35' : '0.9'}"/>
    ${getServiceTypeSymbolSvg(normalizedType, symbolColor)}
  </svg>`;
}
