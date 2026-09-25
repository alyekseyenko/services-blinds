import "server-only";

import { logger } from './logger';
import { resolveN8nWebhookUrl } from './n8nWebhooks';
import { readJsonFile, writeJsonFileAtomic } from '@/lib/server/atomicJsonFile';
import { withProcessMutex } from '@/lib/server/fileMutex';
import { resolveAppDataFile } from '@/lib/server/scratchPath';

export type OutboxStatus = 'PENDING' | 'PROCESSED' | 'FAILED';

export interface OutboxEvent {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  destinationUrl: string;
  idempotencyKey: string;
  status: OutboxStatus;
  retryCount: number;
  maxRetries: number;
  lastAttemptAt?: string;
  nextAttemptAt?: string;
  error?: string;
  createdAt: string;
}

const OUTBOX_MUTEX_KEY = 'outbox_events';

function outboxFilePath(): string {
  return resolveAppDataFile('outbox_events.json');
}

function readOutbox(): OutboxEvent[] {
  return readJsonFile<OutboxEvent[]>(outboxFilePath(), []);
}

const MAX_OUTBOX_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 horas
const MAX_PROCESSED_EVENTS = 200;
const DELIVERY_RETRY_DELAYS_MS = [0, 1000, 2000, 4000];
const STALE_PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas
const N8N_FETCH_TIMEOUT_MS = 30_000;

function isLocalhostDestination(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return url.includes('localhost') || url.includes('127.0.0.1');
  }
}

function isStalePendingEvent(event: OutboxEvent): boolean {
  if (event.status !== 'PENDING') return false;
  const ageMs = Date.now() - new Date(event.createdAt).getTime();
  if (ageMs < STALE_PENDING_MAX_AGE_MS) return false;
  return isLocalhostDestination(event.destinationUrl);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeOutbox(events: OutboxEvent[]) {
  try {
    const now = Date.now();
    const pendingAndFailed = events.filter(e => e.status !== 'PROCESSED');
    const recentProcessed = events
      .filter(e => e.status === 'PROCESSED' && (now - new Date(e.createdAt).getTime() < MAX_OUTBOX_RETENTION_MS))
      .slice(-MAX_PROCESSED_EVENTS);

    const prunedEvents = [...pendingAndFailed, ...recentProcessed];
    writeJsonFileAtomic(outboxFilePath(), prunedEvents);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Failed to write outbox events file', {}, error);
  }
}

function pruneStalePendingEvents(events: OutboxEvent[]): {
  events: OutboxEvent[];
  pruned: number;
} {
  let pruned = 0;
  const kept = events.filter((event) => {
    if (!isStalePendingEvent(event)) return true;
    pruned++;
    return false;
  });
  return { events: kept, pruned };
}

export const outboxQueue = {
  /**
   * Enfileira um evento na Outbox e tenta executá-lo imediatamente de forma síncrona.
   */
  async enqueue(
    eventType: string,
    destinationUrl: string,
    payload: Record<string, unknown>,
    idempotencyKey?: string
  ): Promise<{ success: boolean; eventId: string; error?: string; queued?: boolean }> {
    const newEvent = await withProcessMutex(OUTBOX_MUTEX_KEY, async () => {
      const events = readOutbox();
      const eventId = `outbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const finalIdempotencyKey = idempotencyKey || `idemp_${eventType}_${eventId}`;

      const event: OutboxEvent = {
        id: eventId,
        eventType,
        destinationUrl,
        payload,
        idempotencyKey: finalIdempotencyKey,
        status: 'PENDING',
        retryCount: 0,
        maxRetries: 5,
        createdAt: new Date().toISOString(),
      };

      events.push(event);
      writeOutbox(events);
      return event;
    });

    try {
      const delivered = await this.deliverEvent(newEvent);
      if (delivered) {
        await withProcessMutex(OUTBOX_MUTEX_KEY, async () => {
          const events = readOutbox();
          const stored = events.find((e) => e.id === newEvent.id);
          if (stored) {
            stored.status = 'PROCESSED';
            stored.lastAttemptAt = new Date().toISOString();
            writeOutbox(events);
          }
        });
        return { success: true, eventId: newEvent.id };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await withProcessMutex(OUTBOX_MUTEX_KEY, async () => {
        const events = readOutbox();
        const stored = events.find((e) => e.id === newEvent.id);
        if (stored) {
          stored.retryCount = 1;
          stored.lastAttemptAt = new Date().toISOString();
          stored.error = message;
          writeOutbox(events);
        }
      });
      logger.warn(
        `[OutboxQueue] Envio imediato falhou para evento ${newEvent.id}. Ficou agendado para retry.`,
        { error: message }
      );
      return { success: false, eventId: newEvent.id, error: message, queued: true };
    }

    return { success: false, eventId: newEvent.id, queued: true };
  },

  async deliverEventOnce(event: OutboxEvent): Promise<boolean> {
    const destinationUrl = resolveN8nWebhookUrl(event.eventType);
    const response = await fetch(destinationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': event.idempotencyKey,
      },
      body: JSON.stringify({
        ...event.payload,
        _outboxId: event.id,
        _idempotencyKey: event.idempotencyKey,
        timestamp: event.createdAt,
      }),
      signal: AbortSignal.timeout(N8N_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return true;
  },

  async deliverEvent(event: OutboxEvent): Promise<boolean> {
    let lastError: Error | undefined;

    for (const delayMs of DELIVERY_RETRY_DELAYS_MS) {
      if (delayMs > 0) {
        await sleep(delayMs);
      }

      try {
        return await this.deliverEventOnce(event);
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw lastError ?? new Error('Delivery failed');
  },

  pruneStalePending(): { pruned: number; remaining: number } {
    const events = readOutbox();
    const { events: kept, pruned } = pruneStalePendingEvents(events);
    if (pruned > 0) {
      writeOutbox(kept);
      logger.info(`[OutboxQueue] Pruned ${pruned} stale pending event(s) targeting localhost.`);
    }
    return { pruned, remaining: kept.length };
  },

  async processPending(): Promise<{ processed: number; failed: number; pruned: number }> {
    return withProcessMutex(OUTBOX_MUTEX_KEY, async () => {
      const prunedResult = this.pruneStalePending();
      const events = readOutbox();
      let processed = 0;
      let failed = 0;

      for (const event of events) {
        if (event.status !== 'PENDING') continue;

        try {
          await this.deliverEvent(event);
          event.status = 'PROCESSED';
          event.lastAttemptAt = new Date().toISOString();
          processed++;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          event.retryCount++;
          event.lastAttemptAt = new Date().toISOString();
          event.error = message;

          if (event.retryCount >= event.maxRetries) {
            event.status = 'FAILED';
            failed++;
            logger.error(`[OutboxQueue] Evento ${event.id} excedeu o limite máximo de ${event.maxRetries} tentativas. Movido para Dead-Letter.`, { event });
          }
        }
      }

      writeOutbox(events);
      return { processed, failed, pruned: prunedResult.pruned };
    });
  },

  getStats() {
    const { pruned } = this.pruneStalePending();
    const events = readOutbox();
    const stalePending = events.filter((e) => isStalePendingEvent(e)).length;
    return {
      total: events.length,
      pending: events.filter(e => e.status === 'PENDING').length,
      processed: events.filter(e => e.status === 'PROCESSED').length,
      failed: events.filter(e => e.status === 'FAILED').length,
      stalePending,
      prunedStale: pruned,
    };
  }
};
