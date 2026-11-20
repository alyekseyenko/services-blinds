import { describe, it, expect, vi } from "vitest";
import {
  getNextRetryAt,
  getTransientAttempts,
  newClientRequestId,
  randomJitter,
  withServerActionTimeout,
  JITTER_MIN_MS,
  JITTER_MAX_MS,
  SERVER_ACTION_TIMEOUT_MS,
} from "@/lib/sync/syncQueueRuntime";
import type { SyncQueueItem } from "@/lib/db";

describe("syncQueueRuntime helpers", () => {
  it("lê nextRetryAt e transientAttempts do payload", () => {
    const item = {
      payload: { nextRetryAt: 42, transientAttempts: 3 },
    } as SyncQueueItem;
    expect(getNextRetryAt(item)).toBe(42);
    expect(getTransientAttempts(item)).toBe(3);
  });

  it("gera clientRequestId", () => {
    expect(newClientRequestId().length).toBeGreaterThan(8);
  });

  it("randomJitter fica no intervalo configurado", () => {
    for (let i = 0; i < 20; i++) {
      const j = randomJitter();
      expect(j).toBeGreaterThanOrEqual(JITTER_MIN_MS);
      expect(j).toBeLessThanOrEqual(JITTER_MAX_MS);
    }
  });

  it("withServerActionTimeout rejeita após o limite", async () => {
    vi.useFakeTimers();
    const p = withServerActionTimeout(new Promise<string>(() => {}));
    const rejection = expect(p).rejects.toThrow("timeout");
    vi.advanceTimersByTime(SERVER_ACTION_TIMEOUT_MS + 1);
    await rejection;
    vi.useRealTimers();
  });
});