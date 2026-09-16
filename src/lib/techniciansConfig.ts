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
