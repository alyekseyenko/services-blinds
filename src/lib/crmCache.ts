import type Redis from "ioredis";

const memory = new Map<string, { expiresAt: number; value: string }>();

let redisClient: Redis | null | undefined;
let redisUnavailableUntil = 0;
const REDIS_COOLDOWN_MS = 30_000;

const DEFAULT_TTL_SEC = 60;
const MEMBERS_TTL_SEC = 120;

async function getRedisClient(): Promise<Redis | null> {
  if (!process.env.REDIS_URL) return null;
  if (Date.now() < redisUnavailableUntil) return null;
  if (redisClient !== undefined && redisClient !== null) return redisClient;

  try {
    const { default: RedisCtor } = await import("ioredis");
    redisClient = new RedisCtor(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 2000,
    });
    redisClient.on("error", () => {
      redisClient = null;
      redisUnavailableUntil = Date.now() + REDIS_COOLDOWN_MS;
    });
    await redisClient.connect();
    redisUnavailableUntil = 0;
    return redisClient;
  } catch {
    redisClient = null;
    redisUnavailableUntil = Date.now() + REDIS_COOLDOWN_MS;
    return null;
  }
}

export const CRM_CACHE_KEYS = {
  adminOpportunities: "crm:admin:opportunities",
  adminHistory: "crm:admin:history",
  adminHistoryPagePrefix: "crm:admin:history:page",
  workspaceMembers: "crm:workspace:members",
} as const;

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get(key);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      // Fall through to memory cache.
    }
  }

  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memory.delete(key);
    return null;
  }
  return JSON.parse(entry.value) as T;
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSec: number = DEFAULT_TTL_SEC
): Promise<void> {
  const serialized = JSON.stringify(value);
  memory.set(key, {
    expiresAt: Date.now() + ttlSec * 1000,
    value: serialized,
  });

  const redis = await getRedisClient();
  if (redis) {
    try {
      await redis.setex(key, ttlSec, serialized);
    } catch {
      // Memory cache remains available.
    }
  }
}

export async function cacheInvalidatePrefix(prefix: string): Promise<void> {
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) {
      memory.delete(key);
    }
  }

  const redis = await getRedisClient();
  if (!redis) return;

  try {
    const keys: string[] = [];
    let cursor = "0";
    do {
      const [nextCursor, batch] = await redis.scan(
        cursor,
        "MATCH",
        `${prefix}*`,
        "COUNT",
        100
      );
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== "0");

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Memory invalidation already applied.
  }
}

/** Clears cached admin reads after CRM mutations. */
export async function invalidateAdminCrmCache(): Promise<void> {
  await cacheInvalidatePrefix("crm:admin:");
}

export function adminHistoryPageCacheKey(page: number, pageSize: number): string {
  return `${CRM_CACHE_KEYS.adminHistoryPagePrefix}:${page}:${pageSize}`;
}

export { DEFAULT_TTL_SEC, MEMBERS_TTL_SEC };
