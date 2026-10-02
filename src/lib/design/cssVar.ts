const FALLBACK: Record<string, string> = {
  "--service-instalacao-pin": "#059669",
  "--service-manutencao-pin": "#475569",
  "--service-reparacao-pin": "#ea580c",
  "--service-medidas-pin": "#0284c7",
  "--service-remedicao-pin": "#7c3aed",
  "--service-reagendar-pin": "#db2777",
  "--primary": "#84cc16",
  "--neon": "#a3e635",
  "--technician-default": "#94a3b8",
};

/** Lê um token CSS do documento (client-only). */
export function readDesignToken(name: `--${string}`, fallback?: string): string {
  if (typeof document === "undefined") {
    return fallback ?? FALLBACK[name] ?? "";
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (value) return value;
  return fallback ?? FALLBACK[name] ?? "";
}

const SERVICE_PIN_VARS: Record<string, `--${string}`> = {
  INSTALACAO: "--service-instalacao-pin",
  MANUTENCAO: "--service-manutencao-pin",
  REPARACAO: "--service-reparacao-pin",
  TIRAR_MEDIDAS: "--service-medidas-pin",
  REMEDICAO: "--service-remedicao-pin",
  REAGENDAR: "--service-reagendar-pin",
};

export function readServicePinColor(serviceKey: string): string {
  const varName = SERVICE_PIN_VARS[serviceKey] ?? "--technician-default";
  return readDesignToken(varName, FALLBACK[varName]);
}
