import fs from 'fs';
import { logger } from './logger';
import { readJsonFile, writeJsonFileAtomic } from '@/lib/server/atomicJsonFile';
import { resolveAppDataFile } from '@/lib/server/scratchPath';

export interface TechnicianLocation {
  technicianId: string;
  technicianName: string;
  lat: number;
  lng: number;
  lastUpdate: string;   // ISO timestamp
  accuracy?: number;     // precisão GPS em metros
}

const CACHE_FILE = resolveAppDataFile('locations_cache.json');
const LOCATION_REDIS_PREFIX = 'tech:location:';

// In-memory local cache for 0ms ultra-fast reads
const memoryStore = new Map<string, TechnicianLocation>();
let isLoadedFromFile = false;

function loadInitialState() {
  if (isLoadedFromFile) return;
  isLoadedFromFile = true;
  
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (Array.isArray(data)) {
        const now = Date.now();
        const MAX_AGE_MS = 60 * 60 * 1000; // 60 minutos
        data.forEach((loc: TechnicianLocation) => {
          if (loc.technicianId && loc.lastUpdate) {
            const age = now - new Date(loc.lastUpdate).getTime();
            if (age < MAX_AGE_MS) {
              memoryStore.set(loc.technicianId, loc);
            }
          }
        });
      }
    }
  } catch {
    // Graceful fallback
  }
}

function persistToFile() {
  try {
    const data = Array.from(memoryStore.values());
    writeJsonFileAtomic(CACHE_FILE, data);
  } catch {
    // Non-blocking fallback
  }
}

async function syncLocationToRedis(location: TechnicianLocation): Promise<void> {
  if (!process.env.REDIS_URL) return;
  try {
    const { default: RedisCtor } = await import('ioredis');
    const client = new RedisCtor(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 2000,
    });
    await client.connect();
    await client.setex(
      `${LOCATION_REDIS_PREFIX}${location.technicianId}`,
      3600,
      JSON.stringify(location)
    );
    client.disconnect();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('[LocationStore:Redis] Redis sync skipped, using local fallback', { error: message });
  }
}

/**
 * Driver Híbrido de Localização (Memory + File + Optional Redis)
 * Garante 0ms de leitura e resiliência total a reinícios.
 */
export const locationStore = {
  /**
   * Grava localização de um técnico
   */
  async save(location: TechnicianLocation): Promise<void> {
    loadInitialState();
    memoryStore.set(location.technicianId, location);
    persistToFile();
    void syncLocationToRedis(location);
  },

  /**
   * Obtém todas as localizações ativas nos últimos X ms
   */
  async getActive(staleThresholdMs = 60 * 60 * 1000): Promise<TechnicianLocation[]> {
    loadInitialState();
    const now = Date.now();
    const active: TechnicianLocation[] = [];

    memoryStore.forEach((loc, id) => {
      const age = now - new Date(loc.lastUpdate).getTime();
      if (age < staleThresholdMs) {
        active.push(loc);
      } else {
        memoryStore.delete(id);
      }
    });

    if (memoryStore.size !== active.length) {
      persistToFile();
    }

    return active;
  },

  /**
   * Remove a localização de um técnico específico
   */
  async remove(technicianId: string): Promise<void> {
    loadInitialState();
    memoryStore.delete(technicianId);
    persistToFile();
  },

  /**
   * Limpa todas as localizações
   */
  async clear(): Promise<void> {
    memoryStore.clear();
    persistToFile();
  }
};
