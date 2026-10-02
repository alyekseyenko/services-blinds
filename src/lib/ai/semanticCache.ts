export interface SemanticCacheEntry<T = any> {
  key: string;
  query: string;
  normalizedQuery: string;
  response: T;
  timestamp: number;
  ttlMs: number;
  hits: number;
}

/**
 * Cache Semântico em memória com normalização linguística e expiração (TTL).
 * Reduz custos e tempo de resposta da IA para <2ms em perguntas repetidas.
 */
class SemanticCache {
  private cache = new Map<string, SemanticCacheEntry>();
  private defaultTtlMs = 15 * 60 * 1000; // 15 minutos

  private normalize(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^\w\s]/gi, '') // remove pontuação
      .replace(/\s+/g, ' ');
  }

  public get<T>(query: string): T | null {
    const key = this.normalize(query);
    const entry = this.cache.get(key);

    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.response as T;
  }

  public set<T>(query: string, response: T, ttlMs?: number): void {
    const key = this.normalize(query);
    this.cache.set(key, {
      key,
      query,
      normalizedQuery: key,
      response,
      timestamp: Date.now(),
      ttlMs: ttlMs || this.defaultTtlMs,
      hits: 0,
    });
  }

  public clear(): void {
    this.cache.clear();
  }

  public getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.values()).map(e => ({
        query: e.query,
        hits: e.hits,
        ageSeconds: Math.round((Date.now() - e.timestamp) / 1000),
      })),
    };
  }
}

export const semanticAiCache = new SemanticCache();
