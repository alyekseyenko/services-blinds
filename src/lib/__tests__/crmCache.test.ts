import { describe, it, expect, beforeEach } from "vitest";
import {
  adminHistoryPageCacheKey,
  cacheGet,
  cacheInvalidatePrefix,
  cacheSet,
} from "../crmCache";

describe("crmCache", () => {
  beforeEach(async () => {
    await cacheInvalidatePrefix("crm:");
  });

  it("stores and retrieves values from memory cache", async () => {
    await cacheSet("crm:test:key", { ok: true }, 60);
    const value = await cacheGet<{ ok: boolean }>("crm:test:key");
    expect(value).toEqual({ ok: true });
  });

  it("expires memory cache entries", async () => {
    await cacheSet("crm:test:expired", { ok: false }, 0);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(await cacheGet("crm:test:expired")).toBeNull();
  });

  it("invalidates keys by prefix", async () => {
    await cacheSet("crm:admin:opportunities", [1], 60);
    await cacheSet("crm:admin:history", [2], 60);
    await cacheInvalidatePrefix("crm:admin:");
    expect(await cacheGet("crm:admin:opportunities")).toBeNull();
    expect(await cacheGet("crm:admin:history")).toBeNull();
  });

  it("builds stable history page cache keys", () => {
    expect(adminHistoryPageCacheKey(2, 50)).toBe("crm:admin:history:page:2:50");
  });
});
