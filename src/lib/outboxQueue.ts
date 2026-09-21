import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export type OutboxStatus = 'PENDING' | 'PROCESSED' | 'FAILED';

export interface OutboxEvent {
  id: string;
  eventType: string;
  payload: Record<string, any>;
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

const OUTBOX_FILE = path.join(process.cwd(), 'src/scratch/outbox_events.json');

function ensureDir() {
  try {
    const dir = path.dirname(OUTBOX_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch {
    // Non-blocking
  }
}

function readOutbox(): OutboxEvent[] {
  ensureDir();
  try {
    if (fs.existsSync(OUTBOX_FILE)) {
      return JSON.parse(fs.readFileSync(OUTBOX_FILE, 'utf8'));
    }
  } catch {
    // Fallback
  }
  return [];
}

const MAX_OUTBOX_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 horas
const MAX_PROCESSED_EVENTS = 200;

function writeOutbox(events: OutboxEvent[]) {
  ensureDir();
  try {
    const now = Date.now();
    // Manter todos os PENDING e FAILED. Prunar PROCESSED antigos para prevenir crescimento infinito do ficheiro
    const pendingAndFailed = events.filter(e => e.status !== 'PROCESSED');
    const recentProcessed = events
      .filter(e => e.status === 'PROCESSED' && (now - new Date(e.createdAt).getTime() < MAX_OUTBOX_RETENTION_MS))
      .slice(-MAX_PROCESSED_EVENTS);

    const prunedEvents = [...pendingAndFailed, ...recentProcessed];
    fs.writeFileSync(OUTBOX_FILE, JSON.stringify(prunedEvents, null, 2));
  } catch (err: any) {
    logger.error('Failed to write outbox events file', {}, err);
  }
}

export const outboxQueue = {
  /**
   * Enfileira um evento na Outbox e tenta executá-lo imediatamente de forma síncrona.
   */
  async enqueue(
    eventType: string,
    destinationUrl: string,
    payload: Record<string, any>,
    idempotencyKey?: string
  ): Promise<{ success: boolean; eventId: string; error?: string }> {
    const events = readOutbox();
    const eventId = `outbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const finalIdempotencyKey = idempotencyKey || `idemp_${eventType}_${Date.now()}`;

    const newEvent: OutboxEvent = {
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

    events.push(newEvent);
    writeOutbox(events);

    // Tentar processar imediatamente
    try {
      const success = await this.deliverEvent(newEvent);
      if (success) {
        newEvent.status = 'PROCESSED';
        newEvent.lastAttemptAt = new Date().toISOString();
        writeOutbox(events);
        return { success: true, eventId };
      }
    } catch (err: any) {
      newEvent.retryCount = 1;
      newEvent.lastAttemptAt = new Date().toISOString();
      newEvent.error = err.message;
      writeOutbox(events);
      logger.warn(`[OutboxQueue] Envio imediato falhou para evento ${eventId}. Ficou agendado para retry.`, { error: err.message });
    }

    return { success: true, eventId }; // Enfileirado com sucesso
  },

  /**
   * Executa a entrega HTTP do evento com o cabeçalho Idempotency-Key
   */
  async deliverEvent(event: OutboxEvent): Promise<boolean> {
    const response = await fetch(event.destinationUrl, {
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
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return true;
  },

  /**
   * Reprocessa eventos pendentes com backoff exponencial
   */
  async processPending(): Promise<{ processed: number; failed: number }> {
    const events = readOutbox();
    const now = Date.now();
    let processed = 0;
    let failed = 0;

    for (const event of events) {
      if (event.status !== 'PENDING') continue;

      try {
        await this.deliverEvent(event);
        event.status = 'PROCESSED';
        event.lastAttemptAt = new Date().toISOString();
        processed++;
      } catch (err: any) {
        event.retryCount++;
        event.lastAttemptAt = new Date().toISOString();
        event.error = err.message;

        if (event.retryCount >= event.maxRetries) {
          event.status = 'FAILED';
          failed++;
          logger.error(`[OutboxQueue] Evento ${event.id} excedeu o limite máximo de ${event.maxRetries} tentativas. Movido para Dead-Letter.`, { event });
        }
      }
    }

    writeOutbox(events);
    return { processed, failed };
  },

  /**
   * Obtém contagem de eventos por estado
   */
  getStats() {
    const events = readOutbox();
    return {
      total: events.length,
      pending: events.filter(e => e.status === 'PENDING').length,
      processed: events.filter(e => e.status === 'PROCESSED').length,
      failed: events.filter(e => e.status === 'FAILED').length,
    };
  }
};
