import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR from 'swr';
import { db } from '@/lib/db';
import { isBrowserOnline } from '@/lib/networkOnline';
import { isSyncDataStale } from '@/lib/formatSyncAge';

function readNetworkOnline(): boolean {
  return isBrowserOnline();
}

class FetchHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Failed to fetch (${status})`);
    this.name = "FetchHttpError";
    this.status = status;
  }
}

function shouldRetryFetchError(err: unknown): boolean {
  if (!readNetworkOnline()) return false;
  if (err instanceof Error && err.message === "offline") return false;
  if (err instanceof FetchHttpError) {
    if (err.status === 401 || err.status === 403) return false;
    if (err.status >= 400 && err.status < 500) return false;
    if (err.status === 500) return false;
    return err.status === 408 || err.status === 429 || err.status === 502 || err.status === 503 || err.status === 504;
  }
  return true;
}

const FETCH_TIMEOUT_MS = 20_000;

const fetcher = (url: string) => {
  if (!readNetworkOnline()) {
    return Promise.reject(new Error('offline'));
  }
  return fetch(url, { credentials: "include", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }).then((res) => {
    if (!res.ok) throw new FetchHttpError(res.status);
    return res.json();
  });
};

interface UseSyncOptions {
  refreshInterval?: number;
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  refreshWhenHidden?: boolean;
}

function useNetworkOnline() {
  const [isOnline, setIsOnline] = useState(readNetworkOnline);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(readNetworkOnline());
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return isOnline;
}

function stableJsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

const MAX_IDB_CACHE_ENTRIES = 40;

async function pruneIdbCache(): Promise<void> {
  try {
    const count = await db.tasks.count();
    if (count <= MAX_IDB_CACHE_ENTRIES) return;
    const stale = await db.tasks.orderBy("lastSync").limit(count - MAX_IDB_CACHE_ENTRIES).toArray();
    await db.tasks.bulkDelete(stale.map((row) => row.id!).filter(Boolean));
  } catch {
    /* ignore */
  }
}

const ERROR_RETRY_BASE_MS = 15_000;
const ERROR_RETRY_MAX_MS = 10 * 60_000;

function errorRetryDelayMs(retryCount: number): number {
  const exp = Math.min(ERROR_RETRY_BASE_MS * 2 ** Math.max(0, retryCount), ERROR_RETRY_MAX_MS);
  const jitter = Math.floor(Math.random() * 2000);
  return exp + jitter;
}

export function useSync<T = unknown>(endpoint: string | null, options: UseSyncOptions = {}) {
  const { 
    refreshInterval = 300000,
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
    refreshWhenHidden = false,
  } = options;

  const isOnline = useNetworkOnline();
  const previousEndpointRef = useRef<string | null>(endpoint);
  const [lastSuccessAt, setLastSuccessAt] = useState<number | null>(null);

  const [cachedData, setCachedData] = useState<T | null>(null);
  const [cacheReady, setCacheReady] = useState(() => !endpoint);

  useEffect(() => {
    if (!endpoint || typeof window === "undefined") {
      setCacheReady(true);
      return;
    }

    if (previousEndpointRef.current && previousEndpointRef.current !== endpoint) {
      setCachedData(null);
      setLastSuccessAt(null);
    }
    previousEndpointRef.current = endpoint;

    setCacheReady(false);
    db.tasks
      .where("twentyId")
      .equals(endpoint)
      .first()
      .then((entry) => {
        if (entry?.data) {
          setCachedData(entry.data as T);
          if (entry.lastSync) setLastSuccessAt(entry.lastSync);
        }
      })
      .catch((e) => console.warn("[useSync] IndexedDB read fallback warning:", e))
      .finally(() => setCacheReady(true));
  }, [endpoint]);

  const onErrorRetry = useCallback(
    (
      error: unknown,
      _key: string,
      _config: unknown,
      revalidate: (opts: { retryCount: number }) => void,
      { retryCount }: { retryCount: number }
    ) => {
      if (!readNetworkOnline()) return;
      if (error instanceof Error && error.message === 'offline') return;
      if (!shouldRetryFetchError(error)) return;
      const delay = errorRetryDelayMs(retryCount);
      setTimeout(() => revalidate({ retryCount }), delay);
    },
    []
  );

  const { data, error, mutate, isValidating } = useSWR<T>(endpoint, fetcher, {
    isPaused: () => !readNetworkOnline(),
    refreshInterval: isOnline ? refreshInterval : 0,
    revalidateOnFocus: isOnline && revalidateOnFocus,
    revalidateOnReconnect,
    refreshWhenHidden,
    dedupingInterval: 10000,
    shouldRetryOnError: shouldRetryFetchError,
    onErrorRetry,
    onSuccess: async (newData) => {
      setLastSuccessAt(Date.now());
      if (endpoint && typeof window !== 'undefined') {
        try {
          setCachedData((prev) => (stableJsonEqual(prev, newData) ? prev : (newData as T)));
          const existing = await db.tasks.where('twentyId').equals(endpoint).first();
          const touchOnly = existing?.data && stableJsonEqual(existing.data, newData);

          await db.tasks.put({
            id: existing?.id,
            twentyId: endpoint,
            data: newData,
            lastSync: Date.now(),
            status: 'synced'
          });
          void pruneIdbCache();
          if (touchOnly) {
            /* lastSync refreshed even when payload unchanged */
          }
        } catch (e) {
          console.warn('[useSync] IndexedDB write warning:', e);
        }
      }
    }
  });

  const mutateRef = useRef(mutate);
  mutateRef.current = mutate;

  const effectiveData = data ?? cachedData ?? undefined;
  const hasData = effectiveData !== undefined && effectiveData !== null;
  const isStale = isSyncDataStale(lastSuccessAt, refreshInterval);
  const fetchError = error ?? undefined;

  return {
    data: effectiveData as T | undefined,
    isLoading: !cacheReady || (!hasData && !error && isValidating && isOnline),
    isSyncing: isOnline && isValidating && (hasData || !error),
    error: hasData ? undefined : error,
    fetchError,
    lastSuccessAt,
    isStale,
    mutate,
  };
}
