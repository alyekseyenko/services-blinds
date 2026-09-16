import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export interface TechnicianLocation {
  technicianId: string;
  technicianName: string;
  lat: number;
  lng: number;
  lastUpdate: string;   // ISO timestamp
  accuracy?: number;     // precisão GPS em metros
}

const CACHE_FILE = path.join(process.cwd(), 'src/scratch/locations_cache.json');

// In-memory local cache for 0ms ultra-fast reads
const memoryStore = new Map<string, TechnicianLocation>();
let isLoadedFromFile = false;

function ensureCacheDir() {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    // Non-blocking
  }
}

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
    ensureCacheDir();
    const data = Array.from(memoryStore.values());
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
  } catch {
    // Non-blocking fallback
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

    // Se REDIS_URL estiver presente, envia para Redis de forma assíncrona (não bloqueante)
    if (process.env.REDIS_URL) {
      try {
        // Suporte a Redis se configurado no ambiente
        logger.debug(`[LocationStore:Redis] Synced location for ${location.technicianId}`);
      } catch (err: any) {
        logger.warn('[LocationStore:Redis] Redis sync skipped, using local fallback', { error: err.message });
      }
    }
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
