const STORAGE_KEY = "fieldops_opportunity_notes_cache_v1";
const MAX_ENTRIES = 24;

export type CachedCrmNote = {
  id: string;
  title?: string | null;
  body: string;
  createdAt: string;
  pendingSync?: boolean;
};

type CacheStore = {
  order: string[];
  entries: Record<string, CachedCrmNote[]>;
};

function readStore(): CacheStore {
  if (typeof window === "undefined") {
    return { order: [], entries: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { order: [], entries: {} };
    const parsed = JSON.parse(raw) as CacheStore;
    if (!parsed.entries || !Array.isArray(parsed.order)) {
      return { order: [], entries: {} };
    }
    return parsed;
  } catch {
    return { order: [], entries: {} };
  }
}

function writeStore(store: CacheStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

function touchLru(store: CacheStore, opportunityId: string): void {
  store.order = store.order.filter((id) => id !== opportunityId);
  store.order.unshift(opportunityId);
  while (store.order.length > MAX_ENTRIES) {
    const evict = store.order.pop();
    if (evict) delete store.entries[evict];
  }
}

export function getCachedOpportunityNotes(opportunityId: string): CachedCrmNote[] {
  if (!opportunityId) return [];
  const store = readStore();
  return store.entries[opportunityId] ?? [];
}

export function setCachedOpportunityNotes(
  opportunityId: string,
  notes: CachedCrmNote[]
): void {
  if (!opportunityId) return;
  const store = readStore();
  store.entries[opportunityId] = notes.map((n) => ({ ...n, pendingSync: false }));
  touchLru(store, opportunityId);
  writeStore(store);
}

export function mergeCachedOpportunityNotes(
  opportunityId: string,
  incoming: CachedCrmNote[]
): CachedCrmNote[] {
  if (!opportunityId) return incoming;
  const store = readStore();
  const existing = store.entries[opportunityId] ?? [];
  const pending = existing.filter((n) => n.pendingSync);
  const serverIds = new Set(incoming.map((n) => n.id));
  const stillPending = pending.filter(
    (n) => !serverIds.has(n.id) && !incoming.some((s) => s.body === n.body)
  );
  const merged = [...stillPending, ...incoming];
  store.entries[opportunityId] = merged;
  touchLru(store, opportunityId);
  writeStore(store);
  return merged;
}

export function appendPendingOpportunityNote(
  opportunityId: string,
  note: CachedCrmNote
): CachedCrmNote[] {
  if (!opportunityId) return [];
  const store = readStore();
  const current = store.entries[opportunityId] ?? [];
  const next = [{ ...note, pendingSync: true }, ...current];
  store.entries[opportunityId] = next;
  touchLru(store, opportunityId);
  writeStore(store);
  return next;
}