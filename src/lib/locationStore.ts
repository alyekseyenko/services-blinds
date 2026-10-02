import fs from 'fs';
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

/**
 * Driver Híbrido de Localização (Memory + File)
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
