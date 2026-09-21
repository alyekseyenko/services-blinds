import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { db } from '@/lib/db';

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => {
    if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
    return res.json();
  });

interface UseSyncOptions {
  refreshInterval?: number;
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
}

export function useSync<T = any>(endpoint: string | null, options: UseSyncOptions = {}) {
  const { 
    refreshInterval = 300000, // 5 min default
    revalidateOnFocus = true,
    revalidateOnReconnect = true 
  } = options;

  const [cachedData, setCachedData] = useState<T | null>(null);

  // Carregar dados offline do IndexedDB como fallback inicial se a rede falhar
  useEffect(() => {
    if (!endpoint || typeof window === 'undefined') return;
    db.tasks
      .where('twentyId')
      .equals(endpoint)
      .first()
      .then(entry => {
        if (entry && entry.data) {
          setCachedData(entry.data as T);
        }
      })
      .catch(e => console.warn('[useSync] IndexedDB read fallback warning:', e));
  }, [endpoint]);

  const { data, error, mutate, isValidating } = useSWR<T>(endpoint, fetcher, {
    refreshInterval,
    revalidateOnFocus,
    revalidateOnReconnect,
    dedupingInterval: 5000, 
    onSuccess: async (newData) => {
      if (endpoint && typeof window !== 'undefined') {
        try {
          // Atualizar ou inserir mantendo o mesmo ID numérico para não duplicar linhas
          const existing = await db.tasks.where('twentyId').equals(endpoint).first();
          await db.tasks.put({
            id: existing?.id,
            twentyId: endpoint,
            data: newData,
            lastSync: Date.now(),
            status: 'synced'
          });
          setCachedData(newData);
        } catch (e) {
          console.warn('[useSync] IndexedDB write warning:', e);
        }
      }
    }
  });

  const effectiveData = data ?? cachedData ?? undefined;

  return {
    data: effectiveData as T | undefined,
    isLoading: !error && !effectiveData,
    isSyncing: isValidating,
    error,
    mutate
  };
}
