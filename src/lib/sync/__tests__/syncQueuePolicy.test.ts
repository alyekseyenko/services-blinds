import { describe, expect, it } from "vitest";
import {
  isPermanentBusinessSyncError,
  isSessionExpiredSyncError,
  isTransientSyncError,
  syncRetryBackoffMs,
} from "@/lib/sync/syncQueuePolicy";
import { isStaleServerActionError } from "@/lib/staleClientError";

describe("syncQueuePolicy", () => {
  it("classifica erros transitórios do CRM", () => {
    expect(isTransientSyncError("Timeout: O CRM demorou mais de 12s a responder.")).toBe(true);
    expect(isTransientSyncError("O serviço TwentyCRM está temporariamente indisponível.")).toBe(true);
  });

  it("classifica erros de rede do browser como transitórios", () => {
    expect(isTransientSyncError("Failed to fetch")).toBe(true);
    expect(isTransientSyncError("Load failed")).toBe(true);
  });

  it("classifica erros permanentes de negócio", () => {
    expect(isPermanentBusinessSyncError("Não está atribuído a esta visita.")).toBe(true);
    expect(isPermanentBusinessSyncError("Dados de medidas inválidos.")).toBe(true);
  });

  it("classifica sessão expirada e cliente desatualizado", () => {
    expect(isSessionExpiredSyncError("Não autenticado.")).toBe(true);
    expect(isStaleServerActionError("Server Action \"x\" was not found on the server.")).toBe(true);
    expect(isTransientSyncError("Server Action \"x\" was not found on the server.")).toBe(false);
  });

  it("aplica backoff crescente entre tentativas", () => {
    expect(syncRetryBackoffMs(1)).toBeGreaterThanOrEqual(15_000);
    expect(syncRetryBackoffMs(3)).toBeGreaterThan(syncRetryBackoffMs(1));
  });
});
