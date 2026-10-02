/** Rótulos pt-PT para valores técnicos mostrados na UI */

export const NOT_AVAILABLE_LABEL = "N/D";

const SYNC_QUEUE_ACTION_LABELS: Record<string, string> = {
  UPDATE_STATUS: "Atualizar estado da visita",
  SAVE_MEASUREMENTS: "Guardar medições",
  ADD_NOTE: "Adicionar nota",
  CREATE_VISIT_SERVICE: "Criar serviço no local",
};

export function labelSyncQueueAction(action: string): string {
  return SYNC_QUEUE_ACTION_LABELS[action] ?? action.replace(/_/g, " ").toLowerCase();
}

export function labelCircuitBreakerState(state: string): string {
  switch (state) {
    case "OPEN":
      return "ABERTO";
    case "CLOSED":
      return "FECHADO";
    case "HALF_OPEN":
      return "MEIO-ABERTO";
    default:
      return state;
  }
}

export function labelHealthStatus(status: string): string {
  switch (status) {
    case "HEALTHY":
      return "SAUDÁVEL";
    case "DEGRADED":
      return "DEGRADADO";
    case "UNHEALTHY":
      return "INDISPONÍVEL";
    default:
      return status;
  }
}

export function labelCheckStatus(status: string): string {
  switch (status) {
    case "PASS":
      return "APROVADO";
    case "WARN":
      return "AVISO";
    case "SKIP":
      return "OMITIDO";
    case "FAIL":
      return "FALHA";
    default:
      return status;
  }
}

export function labelLogFilterLevel(level: "ALL" | "ERROR" | "WARN" | "INFO"): string {
  if (level === "ALL") return "TODOS";
  return level;
}

export function labelCrmSubsystemStatus(status: string): string {
  switch (status) {
    case "HEALTHY":
      return "operacional";
    default:
      return status.toLowerCase();
  }
}
