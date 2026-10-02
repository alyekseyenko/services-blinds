import { isStaleServerActionError } from "@/lib/staleClientError";

export const FIELDOPS_STALE_CLIENT_EVENT = "fieldops-stale-client";

/** Sessão expirada ou pedido de server action sem autenticação. */
export function isSessionExpiredSyncError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("não autenticado") ||
    m.includes("nao autenticado") ||
    m.includes("faça login") ||
    m.includes("faca login")
  );
}

/** Erros que não devem consumir tentativas permanentes da fila offline. */
export function isTransientSyncError(message: string): boolean {
  if (isStaleServerActionError(message)) return false;
  if (isSessionExpiredSyncError(message)) return false;
  const m = message.toLowerCase();
  return (
    m.includes("timeout") ||
    m.includes("temporariamente indisponível") ||
    m.includes("circuit breaker") ||
    m.includes("circuito open") ||
    m.includes("em recuperação") ||
    m.includes("falha de ligação") ||
    m.includes("http error: 5") ||
    m.includes("http error: 429") ||
    m.includes("too many requests") ||
    m.includes("network") ||
    m.includes("networkerror") ||
    m.includes("fetch failed") ||
    m.includes("failed to fetch") ||
    m.includes("load failed") ||
    m.includes("server action") ||
    m.includes("unexpected response") ||
    m.includes("aborted")
  );
}

/** Erros de negócio — não voltar a enfileirar como "guardado offline". */
export function isPermanentBusinessSyncError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("não está atribuído") ||
    m.includes("não tem permissão") ||
    m.includes("visita não encontrada") ||
    m.includes("estado de tarefa inválido") ||
    m.includes("dados de medidas inválidos") ||
    m.includes("oportunidade") && m.includes("não")
  );
}

export function syncRetryBackoffMs(retryCount: number): number {
  const base = 15_000;
  const capped = Math.min(base * 2 ** Math.max(0, retryCount - 1), 10 * 60_000);
  const jitter = Math.floor(Math.random() * 2000);
  return capped + jitter;
}

export const SYNC_MAX_BUSINESS_RETRIES = 5;
