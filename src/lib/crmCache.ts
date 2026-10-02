import type Redis from "ioredis";

const MEMORY_MAX_ENTRIES = 500;
const memory = new Map<string, { expiresAt: number; value: string }>();

let redisClient: Redis | null | undefined;
let redisConnectPromise: Promise<Redis | null> | null = null;
let redisUnavailableUntil = 0;
const REDIS_COOLDOWN_MS = 30_000;

export const DEFAULT_TTL_SEC = 60;
export const ADMIN_TTL_SEC = 90;
export const ADMIN_AGENDA_FEED_TTL_SEC = 20;
const MEMBERS_TTL_SEC = 120;

const prefixGenerationMemory = new Map<string, number>();
const CACHE_GEN_REDIS_KEY = "crm:cache:gen";

function logicalKeyPrefix(key: string): string {
  if (key.startsWith("crm:ceo:")) return "crm:ceo:";
  if (key.startsWith("crm:admin:")) return "crm:admin:";
  if (key.startsWith("crm:workspace:")) return "crm:workspace:";
  return "crm:";
}

const inFlight = new Map<string, Promise<unknown>>();

function sweepMemoryCache(): void {
  const now = Date.now();
  for (const [key, entry] of memory) {
    if (entry.expiresAt <= now) memory.delete(key);
  }
  if (memory.size <= MEMORY_MAX_ENTRIES) return;
  const overflow = memory.size - MEMORY_MAX_ENTRIES;
  const keys = [...memory.keys()].slice(0, overflow);
  keys.forEach((k) => memory.delete(k));
}

export async function getSharedRedisClient(): Promise<Redis | null> {
  return getRedisClient();
}

async function getRedisClient(): Promise<Redis | null> {
  if (!process.env.REDIS_URL) return null;
  if (Date.now() < redisUnavailableUntil) return null;
  if (redisClient) return redisClient;

  if (!redisConnectPromise) {
    redisConnectPromise = (async () => {
      try {
        const { default: RedisCtor } = await import("ioredis");
        const client = new RedisCtor(process.env.REDIS_URL!, {
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          lazyConnect: true,
          connectTimeout: 2000,
        });
        client.on("error", () => {
          const stale = redisClient;
          redisClient = null;
          redisConnectPromise = null;
          redisUnavailableUntil = Date.now() + REDIS_COOLDOWN_MS;
          void stale?.disconnect();
        });
        await client.connect();
        redisUnavailableUntil = 0;
        redisClient = client;
        return client;
      } catch {
        redisClient = null;
        redisUnavailableUntil = Date.now() + REDIS_COOLDOWN_MS;
        return null;
      } finally {
        redisConnectPromise = null;
      }
    })();
  }

  return redisConnectPromise;
}

async function resolveCacheGeneration(redis: Redis | null, prefix: string): Promise<string> {
  const mem = prefixGenerationMemory.get(prefix) ?? 0;
  if (!redis) return String(mem);
  try {
    const raw = await redis.get(`${CACHE_GEN_REDIS_KEY}:${prefix}`);
    return raw ?? String(mem);
  } catch {
    return String(mem);
  }
}

async function versionedKey(logicalKey: string, pinnedGen?: string): Promise<string> {
  const prefix = logicalKeyPrefix(logicalKey);
  if (pinnedGen !== undefined) {
    return `${logicalKey}:g${pinnedGen}`;
  }
  const redis = await getRedisClient();
  const gen = await resolveCacheGeneration(redis, prefix);
  return `${logicalKey}:g${gen}`;
}

export const CRM_CACHE_KEYS = {
  adminAgendaFeed: "crm:admin:agenda-feed",
  adminOpportunities: "crm:admin:opportunities",
  adminHistory: "crm:admin:history",
  adminHistoryPagePrefix: "crm:admin:history:page",
  workspaceMembers: "crm:workspace:members",
  ceoMetricsYearPrefix: "crm:ceo:metrics:year",
} as const;

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  const storageKey = await versionedKey(key);

  if (redis) {
    try {
      const raw = await redis.get(storageKey);
      if (raw) return JSON.parse(raw) as T;
      return null;
    } catch {
      return null;
    }
  }

  const entry = memory.get(storageKey);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memory.delete(storageKey);
    return null;
  }
  return JSON.parse(entry.value) as T;
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSec: number = DEFAULT_TTL_SEC,
  pinnedGen?: string
): Promise<void> {
  const redis = await getRedisClient();
  const storageKey = await versionedKey(key, pinnedGen);
  const serialized = JSON.stringify(value);

  if (!redis) {
    sweepMemoryCache();
    memory.set(storageKey, {
      expiresAt: Date.now() + ttlSec * 1000,
      value: serialized,
    });
    return;
  }

  try {
    await redis.setex(storageKey, ttlSec, serialized);
  } catch {
    /* skip memory when Redis is the primary store */
  }
}

/** Deduplicate concurrent reads/computes for the same logical cache key. */
export async function cacheGetOrCompute<T>(
  key: string,
  ttlSec: number,
  compute: () => Promise<T>
): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const prefix = logicalKeyPrefix(key);
  const promise = (async () => {
    const cached = await cacheGet<T>(key);
    if (cached !== null) return cached;

    const redis = await getRedisClient();
    const genBefore = await resolveCacheGeneration(redis, prefix);
    const value = await compute();
    const genAfter = await resolveCacheGeneration(redis, prefix);
    if (genBefore === genAfter) {
      await cacheSet(key, value, ttlSec, genBefore);
    }
    return value;
  })();

  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

export async function cacheInvalidatePrefix(prefix: string): Promise<void> {
  prefixGenerationMemory.set(prefix, (prefixGenerationMemory.get(prefix) ?? 0) + 1);
  for (const storageKey of [...memory.keys()]) {
    if (storageKey.includes(prefix)) memory.delete(storageKey);
  }

  const redis = await getRedisClient();
  if (!redis) return;

  try {
    await redis.incr(`${CACHE_GEN_REDIS_KEY}:${prefix}`);
  } catch {
    /* memory keys already cleared for prefix */
  }
}

/** Clears cached admin reads after CRM mutations. */
export async function invalidateAdminCrmCache(): Promise<void> {
  await cacheInvalidatePrefix("crm:admin:");
}

export function adminHistoryPageCacheKey(page: number, pageSize: number): string {
  return `${CRM_CACHE_KEYS.adminHistoryPagePrefix}:${page}:${pageSize}`;
}

export function ceoMetricsYearCacheKey(year: number | "all"): string {
  return `${CRM_CACHE_KEYS.ceoMetricsYearPrefix}:${year}`;
}

export { MEMBERS_TTL_SEC };
