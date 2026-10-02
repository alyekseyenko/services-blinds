import fs from 'fs';

import { writeJsonFileAtomic } from '@/lib/server/atomicJsonFile';
import { resolveAppDataFile, ensureAppDataDir } from '@/lib/server/scratchPath';

const MEMORY_FILE = resolveAppDataFile('agent_memory.json');
const OPS_LOGS_FILE = resolveAppDataFile('ops_performance.json');

const ensureDir = () => {
  ensureAppDataDir();
};

export interface OperationalEvent {
  type: 'COMPLETED' | 'CANCELLED' | string;
  technicianId?: string;
  taskType?: string;
  durationMin?: number;
  reason?: string;
  city?: string;
  [key: string]: any;
}

export interface LearningItem {
  id: number;
  category: string;
  insight: string;
  timestamp: string;
}

/**
 * Regista um evento operacional para aprendizagem (ex: conclusão de tarefa, cancelamento)
 */
export async function logOperationalEvent(event: OperationalEvent) {
  ensureDir();
  let logs: { events: any[] } = { events: [] };
  
  if (fs.existsSync(OPS_LOGS_FILE)) {
    try {
      logs = JSON.parse(fs.readFileSync(OPS_LOGS_FILE, 'utf8'));
    } catch {
      logs = { events: [] };
    }
  }

  const newEvent = {
    id: Date.now(),
    ...event,
    timestamp: new Date().toISOString()
  };

  logs.events.push(newEvent);
  writeJsonFileAtomic(OPS_LOGS_FILE, logs);
  
  return newEvent;
}

/**
 * Obtém métricas de performance para o agente decidir melhor
 */
export async function getPerformanceInsights() {
  ensureDir();
  if (!fs.existsSync(OPS_LOGS_FILE)) return { avgTimePerTask: 0, topCancellationReason: "", criticalZones: [] };

  try {
    const logs = JSON.parse(fs.readFileSync(OPS_LOGS_FILE, 'utf8'));
    const events: any[] = logs.events || [];

    const insights = {
      avgTimePerTask: 0,
      topCancellationReason: "",
      criticalZones: [] as string[]
    };

    if (events.length > 0) {
      const completed = events.filter(e => e.type === 'COMPLETED');
      const cancelled = events.filter(e => e.type === 'CANCELLED');
      
      if (completed.length > 0) {
        const totalTime = completed.reduce((acc, e) => acc + (e.durationMin || 0), 0);
        insights.avgTimePerTask = Math.round(totalTime / completed.length);
      }

      if (cancelled.length > 0) {
        const reasons = cancelled.map(e => e.reason).filter(Boolean);
        if (reasons.length > 0) {
          insights.topCancellationReason = reasons.sort((a, b) =>
            reasons.filter(v => v === a).length - reasons.filter(v => v === b).length
          ).pop() || "";
        }
      }
    }

    return insights;
  } catch {
    return { avgTimePerTask: 0, topCancellationReason: "", criticalZones: [] };
  }
}

/**
 * Guarda uma nova aprendizagem estratégica
 */
export async function saveLearning(category: string, insight: string): Promise<LearningItem> {
  ensureDir();
  let memory: { learnings: LearningItem[] } = { learnings: [] };
  if (fs.existsSync(MEMORY_FILE)) {
    try {
      memory = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    } catch {
      memory = { learnings: [] };
    }
  }
  const newLearning: LearningItem = { id: Date.now(), category, insight, timestamp: new Date().toISOString() };
  memory.learnings.push(newLearning);
  writeJsonFileAtomic(MEMORY_FILE, memory);
  return newLearning;
}

/**
 * Recupera aprendizagens passadas
 */
export async function getLearnings(query = ""): Promise<LearningItem[]> {
  ensureDir();
  if (!fs.existsSync(MEMORY_FILE)) return [];
  try {
    const memory: { learnings: LearningItem[] } = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    if (!query) return memory.learnings || [];
    return (memory.learnings || []).filter(l => 
      l.insight.toLowerCase().includes(query.toLowerCase()) || 
      l.category.toLowerCase().includes(query.toLowerCase())
    );
  } catch {
    return [];
  }
}
