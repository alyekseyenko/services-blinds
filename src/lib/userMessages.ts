import { isPermanentBusinessSyncError, isTransientSyncError } from "@/lib/sync/syncQueuePolicy";
import { isStaleServerActionError, STALE_CLIENT_USER_MESSAGE } from "@/lib/staleClientError";

const PT_BUSINESS_PATTERNS: { test: (m: string) => boolean; message: string }[] = [
  {
    test: (m) => m.includes("não está atribuído"),
    message: "Não está atribuído a esta visita.",
  },
  {
    test: (m) => m.includes("não tem permissão"),
    message: "Não tem permissão para esta ação.",
  },
  {
    test: (m) => m.includes("visita não encontrada"),
    message: "Visita não encontrada no CRM.",
  },
  {
    test: (m) => m.includes("estado de tarefa inválido"),
    message: "Estado da visita inválido. Atualize a agenda e tente novamente.",
  },
  {
    test: (m) => m.includes("dados de medidas inválidos"),
    message: "Dados de medições inválidos. Verifique os campos obrigatórios.",
  },
  {
    test: (m) => m.includes("pipeline") && m.includes("conflito"),
    message: "O CRM recusou a alteração de fase. Verifique o estado no painel.",
  },
];

function extractMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return "";
}

/**
 * Maps technical/CRM errors to user-facing pt-PT copy.
 * Preserves messages that are already friendly Portuguese.
 */
export function toUserMessage(error: unknown, fallback = "Não foi possível concluir a operação."): string {
  const raw = extractMessage(error).trim();
  if (!raw) return fallback;

  const lower = raw.toLowerCase();

  if (isStaleServerActionError(raw)) {
    return STALE_CLIENT_USER_MESSAGE;
  }

  if (
    raw.includes("Não foi possível") ||
    raw.includes("Conflito de agenda") ||
    raw.includes("Aviso:") ||
    (raw.includes("indisponível") &&
      (raw.includes("CRM") || raw.includes("circuito") || raw.includes("temporariamente")))
  ) {
    return raw;
  }

  for (const rule of PT_BUSINESS_PATTERNS) {
    if (rule.test(lower)) return rule.message;
  }

  if (isPermanentBusinessSyncError(raw)) {
    return fallback;
  }

  if (isTransientSyncError(raw)) {
    if (lower.includes("circuit")) {
      return "O CRM está temporariamente indisponível. Tente novamente em alguns minutos.";
    }
    if (lower.includes("429") || lower.includes("too many")) {
      return "Muitos pedidos seguidos. Aguarde um momento e tente novamente.";
    }
    if (lower.includes("timeout") || lower.includes("aborted")) {
      return "O pedido expirou. Verifique a rede e tente novamente.";
    }
    return "Falha de ligação. Verifique a internet e tente novamente.";
  }

  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("load failed")) {
    return "Falha de ligação. Verifique a internet e tente novamente.";
  }

  if (/http error:\s*5\d\d/i.test(raw)) {
    return "O servidor está indisponível. Tente novamente mais tarde.";
  }

  if (/http error:\s*4\d\d/i.test(raw) && !lower.includes("graphql")) {
    return "Pedido rejeitado pelo servidor. Tente novamente.";
  }

  if (lower.includes("invalid uuid") || lower.includes("graphql error")) {
    return "Dados inválidos para o CRM. Contacte o escritório se o problema persistir.";
  }

  if (lower.includes("failed to fetch from twenty")) {
    return "Não foi possível contactar o CRM. Tente novamente.";
  }

  if (/^[a-z_]+$/i.test(raw) && raw.length < 40 && raw.includes("_")) {
    return fallback;
  }

  if (/^[a-z\s]+$/i.test(raw) && !raw.includes("ã") && !raw.includes("ç") && raw.length < 80) {
    return fallback;
  }

  return fallback;
}
