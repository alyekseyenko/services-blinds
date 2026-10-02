import "server-only";

import { logger } from './logger';
import { resolveN8nWebhookUrl } from './n8nWebhooks';
import { buildN8nWebhookHeaders, N8N_FETCH_TIMEOUT_MS } from './n8nPost';
import {
  assertOutboxEventType,
  parseOutboxPayload,
} from '@/lib/integrations/outboxEvents';
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
  inFlightUntil?: string;
  error?: string;
  createdAt: string;
}

const OUTBOX_MUTEX_KEY = 'outbox_events';

const MAX_OUTBOX_RETENTION_MS = 24 * 60 * 60 * 1000;
const MAX_FAILED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PROCESSED_EVENTS = 200;
const STALE_PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const IN_FLIGHT_RESERVE_MS = 2 * 60 * 1000;

/** Backoff between drain attempts after a failed delivery (ms). */
export const OUTBOX_BACKOFF_MS = [
  30_000,
  120_000,
  600_000,
  1_800_000,
  7_200_000,
  14_400_000,
  28_800_000,
  43_200_000,
  57_600_000,
  86_400_000,
];

const FAILED_PAYLOAD_TRIM_MS = 24 * 60 * 60 * 1000;

function outboxFilePath(): string {
  return resolveAppDataFile('outbox_events.json');
}

function readOutbox(): OutboxEvent[] {
  return readJsonFile<OutboxEvent[]>(outboxFilePath(), []);
}

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

export function computeNextAttemptAt(retryCountAfterFailure: number): string {
  const index = Math.min(
    Math.max(retryCountAfterFailure - 1, 0),
    OUTBOX_BACKOFF_MS.length - 1
  );
  const delayMs = OUTBOX_BACKOFF_MS[index];
  return new Date(Date.now() + delayMs).toISOString();
}

export function isOutboxEventDue(event: OutboxEvent, nowMs = Date.now()): boolean {
  if (event.status !== 'PENDING') return false;
  if (event.inFlightUntil && new Date(event.inFlightUntil).getTime() > nowMs) {
    return false;
  }
  if (!event.nextAttemptAt) return true;
  return new Date(event.nextAttemptAt).getTime() <= nowMs;
}

function writeOutbox(events: OutboxEvent[]) {
  try {
    const now = Date.now();
    const pendingAndFailed = events.filter((e) => {
      if (e.status === 'FAILED') {
        const age = Date.now() - new Date(e.createdAt).getTime();
        if (age >= FAILED_PAYLOAD_TRIM_MS && e.payload && typeof e.payload === 'object') {
          const next = { ...e.payload } as Record<string, unknown>;
          delete next.photos;
          e.payload = next;
        }
        return age < MAX_FAILED_RETENTION_MS;
      }
      return e.status !== 'PROCESSED';
    });
    const recentProcessed = events
      .filter(e => e.status === 'PROCESSED' && (now - new Date(e.createdAt).getTime() < MAX_OUTBOX_RETENTION_MS))
      .slice(-MAX_PROCESSED_EVENTS);

    const prunedEvents = [...pendingAndFailed, ...recentProcessed];
    writeJsonFileAtomic(outboxFilePath(), prunedEvents);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Failed to write outbox events file', {}, error);
    throw error;
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

async function markDeliverySuccess(eventId: string): Promise<boolean> {
  return withProcessMutex(OUTBOX_MUTEX_KEY, async () => {
    const events = readOutbox();
    const stored = events.find((e) => e.id === eventId);
    if (!stored || stored.status !== 'PENDING') return false;
    stored.status = 'PROCESSED';
    stored.lastAttemptAt = new Date().toISOString();
    stored.payload = {};
    delete stored.inFlightUntil;
    delete stored.nextAttemptAt;
    stored.error = undefined;
    writeOutbox(events);
    return true;
  });
}

async function markDeliveryFailure(eventId: string, message: string): Promise<'failed' | 'retry'> {
  return withProcessMutex(OUTBOX_MUTEX_KEY, async () => {
    const events = readOutbox();
    const stored = events.find((e) => e.id === eventId);
    if (!stored || stored.status !== 'PENDING') return 'retry';

    stored.retryCount += 1;
    stored.lastAttemptAt = new Date().toISOString();
    stored.error = message;
    delete stored.inFlightUntil;

    if (stored.retryCount >= stored.maxRetries) {
      stored.status = 'FAILED';
      writeOutbox(events);
      logger.error(
        `[OutboxQueue] Evento ${stored.id} excedeu o limite máximo de ${stored.maxRetries} tentativas. Movido para Dead-Letter.`,
        { event: stored }
      );
      return 'failed';
    }

    stored.nextAttemptAt = computeNextAttemptAt(stored.retryCount);
    writeOutbox(events);
    return 'retry';
  });
}

export const outboxQueue = {
  /**
   * Enfileira um evento na Outbox e devolve de imediato; a entrega é assíncrona.
   */
  async enqueue(
    eventType: string,
    destinationUrl: string,
    payload: Record<string, unknown>,
    idempotencyKey?: string
  ): Promise<{ success: boolean; eventId: string; error?: string; queued?: boolean }> {
    const typedEvent = assertOutboxEventType(eventType);
    const validatedPayload = parseOutboxPayload(typedEvent, payload);

    const newEvent = await withProcessMutex(OUTBOX_MUTEX_KEY, async () => {
      const events = readOutbox();
      const eventId = `outbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const finalIdempotencyKey = idempotencyKey || `idemp_${eventType}_${eventId}`;

      const existing = events.find(
        (e) =>
          e.idempotencyKey === finalIdempotencyKey &&
          (e.status === "PENDING" || e.status === "PROCESSED")
      );
      if (existing) {
        return existing;
      }

      const nowIso = new Date().toISOString();
      const event: OutboxEvent = {
        id: eventId,
        eventType: typedEvent,
        destinationUrl,
        payload: validatedPayload,
        idempotencyKey: finalIdempotencyKey,
        status: 'PENDING',
        retryCount: 0,
        maxRetries: 12,
        createdAt: nowIso,
        nextAttemptAt: nowIso,
      };

      events.push(event);
      writeOutbox(events);
      return event;
    });

    if (newEvent.status === 'PENDING' && isOutboxEventDue(newEvent)) {
      void this.processEvent(newEvent.id).catch((err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.warn(`[OutboxQueue] Entrega assíncrona falhou para ${newEvent.id}.`, {
          error: error.message,
        });
      });
    }

    return { success: true, eventId: newEvent.id, queued: true };
  },

  async deliverEventOnce(event: OutboxEvent): Promise<boolean> {
    const destinationUrl = resolveN8nWebhookUrl(event.eventType);
    const body = JSON.stringify({
      ...event.payload,
      _outboxId: event.id,
      _idempotencyKey: event.idempotencyKey,
      timestamp: event.createdAt,
    });
    const headers = buildN8nWebhookHeaders(body, event.idempotencyKey);

    const response = await fetch(destinationUrl, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(N8N_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return true;
  },

  async deliverEvent(event: OutboxEvent): Promise<boolean> {
    return this.deliverEventOnce(event);
  },

  async processEvent(eventId: string): Promise<'processed' | 'retry' | 'skipped'> {
    const reserved = await withProcessMutex(OUTBOX_MUTEX_KEY, async () => {
      const events = readOutbox();
      const stored = events.find((e) => e.id === eventId);
      if (!stored || !isOutboxEventDue(stored)) return null;
      stored.inFlightUntil = new Date(Date.now() + IN_FLIGHT_RESERVE_MS).toISOString();
      writeOutbox(events);
      return { ...stored };
    });

    if (!reserved) return 'skipped';

    try {
      await this.deliverEventOnce(reserved);
      const updated = await markDeliverySuccess(eventId);
      return updated ? 'processed' : 'skipped';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const outcome = await markDeliveryFailure(eventId, message);
      return outcome === 'failed' ? 'skipped' : 'retry';
    }
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

  async requeueFailedEvents(): Promise<{ requeued: number }> {
    return withProcessMutex(OUTBOX_MUTEX_KEY, async () => {
      const events = readOutbox();
      let requeued = 0;
      const nowIso = new Date().toISOString();
      for (const event of events) {
        if (event.status !== 'FAILED') continue;
        event.status = 'PENDING';
        event.retryCount = 0;
        event.nextAttemptAt = nowIso;
        event.error = undefined;
        delete event.inFlightUntil;
        requeued++;
      }
      if (requeued > 0) writeOutbox(events);
      return { requeued };
    });
  },

  async processPending(): Promise<{ processed: number; failed: number; pruned: number }> {
    const prunedResult = await withProcessMutex(OUTBOX_MUTEX_KEY, async () => {
      const events = readOutbox();
      const { events: kept, pruned } = pruneStalePendingEvents(events);
      if (pruned > 0) writeOutbox(kept);
      return { pruned, kept };
    });

    const dueIds = prunedResult.kept.filter((e) => isOutboxEventDue(e)).map((e) => e.id);

    let processed = 0;
    let failed = 0;

    for (const eventId of dueIds) {
      const outcome = await this.processEvent(eventId);
      if (outcome === 'processed') processed++;
      if (outcome === 'skipped') {
        const events = readOutbox();
        const row = events.find((e) => e.id === eventId);
        if (row?.status === 'FAILED') failed++;
      }
    }

    return { processed, failed, pruned: prunedResult.pruned };
  },

  listEvents(): OutboxEvent[] {
    return readOutbox();
  },

  async processEventIds(
    eventIds: string[]
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;
    for (const eventId of eventIds) {
      const outcome = await this.processEvent(eventId);
      if (outcome === "processed") processed++;
      if (outcome === "skipped") {
        const events = readOutbox();
        const row = events.find((e) => e.id === eventId);
        if (row?.status === "FAILED") failed++;
      }
    }
    return { processed, failed };
  },

  getStats() {
    const { pruned } = this.pruneStalePending();
    const events = readOutbox();
    const stalePending = events.filter((e) => isStalePendingEvent(e)).length;
    const pendingEvents = events.filter((e) => e.status === 'PENDING');
    let oldestPendingAgeMs = 0;
    if (pendingEvents.length > 0) {
      const oldestMs = pendingEvents.reduce(
        (min, e) => Math.min(min, new Date(e.createdAt).getTime()),
        Date.now()
      );
      oldestPendingAgeMs = Date.now() - oldestMs;
    }

    return {
      total: events.length,
      pending: pendingEvents.length,
      processed: events.filter(e => e.status === 'PROCESSED').length,
      failed: events.filter(e => e.status === 'FAILED').length,
      stalePending,
      prunedStale: pruned,
      oldestPendingAgeMs,
    };
  }
};
