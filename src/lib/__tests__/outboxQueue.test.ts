import fs from 'fs';
import path from 'path';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  outboxQueue,
  computeNextAttemptAt,
  isOutboxEventDue,
  OUTBOX_BACKOFF_MS,
} from '../outboxQueue';
import { buildN8nWebhookHeaders } from '../n8nPost';
import { resolveAppDataFile } from '../server/scratchPath';

describe('Transactional Outbox Pattern & Idempotency', () => {
  beforeEach(() => {
    delete process.env.N8N_WEBHOOK_SECRET;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.N8N_WEBHOOK_SECRET;
  });

  it('should enqueue without waiting for webhook delivery', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }) as Promise<Response>
    );

    const start = Date.now();
    const result = await outboxQueue.enqueue(
      'service_completed',
      'http://localhost:5678/webhook-test/test',
      { event: 'service_completed', taskId: 'task-123', status: 'CONCLUIDO' },
      'idemp_unique_test_123'
    );
    const elapsed = Date.now() - start;

    expect(result.success).toBe(true);
    expect(result.queued).toBe(true);
    expect(result.eventId).toBeDefined();
    expect(elapsed).toBeLessThan(500);

    const stats = outboxQueue.getStats();
    expect(stats.pending).toBeGreaterThanOrEqual(1);
  });

  it('delivers a single attempt per processEvent call', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      statusText: 'OK',
    } as Response);

    const delivered = await outboxQueue.deliverEvent({
      id: 'outbox_test_retry',
      eventType: 'appointment_scheduled',
      destinationUrl: 'https://n8n.example.com/webhook/agendamento',
      payload: { event: 'appointment_scheduled', taskId: 'task-1' },
      idempotencyKey: 'idemp_retry_test',
      status: 'PENDING',
      retryCount: 0,
      maxRetries: 5,
      createdAt: new Date().toISOString(),
    });

    expect(delivered).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('schedules nextAttemptAt with exponential backoff after failure', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network down'));

    const eventId = 'outbox_backoff_test';
    const createdAt = new Date().toISOString();
    const outboxFile = resolveAppDataFile('outbox_events.json');
    fs.mkdirSync(path.dirname(outboxFile), { recursive: true });
    fs.writeFileSync(
      outboxFile,
      JSON.stringify(
        [
          {
            id: eventId,
            eventType: 'technician_login',
            destinationUrl: 'https://n8n.example.com/webhook/general',
            payload: { event: 'technician_login' },
            idempotencyKey: 'idemp_backoff',
            status: 'PENDING',
            retryCount: 0,
            maxRetries: 5,
            createdAt,
            nextAttemptAt: createdAt,
          },
        ],
        null,
        2
      )
    );

    await outboxQueue.processEvent(eventId);

    const events = JSON.parse(fs.readFileSync(outboxFile, 'utf8')) as Array<{
      retryCount: number;
      nextAttemptAt?: string;
      status: string;
    }>;
    const stored = events.find((e) => e.status === 'PENDING');
    expect(stored?.retryCount).toBe(1);
    expect(stored?.nextAttemptAt).toBeDefined();
    const expectedMin = Date.now() + OUTBOX_BACKOFF_MS[0] - 2000;
    expect(new Date(stored!.nextAttemptAt!).getTime()).toBeGreaterThanOrEqual(expectedMin);
  });

  it('marks event FAILED after maxRetries', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('always fails'));

    const eventId = 'outbox_max_retries';
    const outboxFile = resolveAppDataFile('outbox_events.json');
    fs.writeFileSync(
      outboxFile,
      JSON.stringify(
        [
          {
            id: eventId,
            eventType: 'technician_login',
            destinationUrl: 'https://n8n.example.com/webhook/general',
            payload: {},
            idempotencyKey: 'idemp_max',
            status: 'PENDING',
            retryCount: 4,
            maxRetries: 5,
            createdAt: new Date().toISOString(),
            nextAttemptAt: new Date().toISOString(),
          },
        ],
        null,
        2
      )
    );

    await outboxQueue.processEvent(eventId);

    const events = JSON.parse(fs.readFileSync(outboxFile, 'utf8')) as Array<{ status: string }>;
    expect(events.some((e) => e.status === 'FAILED')).toBe(true);
  });

  it('adds webhook auth headers when N8N_WEBHOOK_SECRET is set', () => {
    process.env.N8N_WEBHOOK_SECRET = 'test-secret-min-16-chars';
    const body = '{"event":"test"}';
    const headers = buildN8nWebhookHeaders(body, 'idemp-1');
    expect(headers['X-Webhook-Secret']).toBe('test-secret-min-16-chars');
    expect(headers['X-Webhook-Signature']).toMatch(/^[a-f0-9]{64}$/);
    expect(headers['X-Webhook-Timestamp']).toBeDefined();
    expect(headers['Idempotency-Key']).toBe('idemp-1');
  });

  it('prunes stale pending events that still target localhost', () => {
    const staleCreatedAt = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const events = [
      {
        id: 'outbox_stale_local',
        eventType: 'technician_login',
        destinationUrl: 'http://localhost:5678/webhook-test/example-notifications',
        payload: {},
        idempotencyKey: 'idemp_stale',
        status: 'PENDING' as const,
        retryCount: 1,
        maxRetries: 5,
        createdAt: staleCreatedAt,
      },
      {
        id: 'outbox_recent_local',
        eventType: 'technician_login',
        destinationUrl: 'http://localhost:5678/webhook-test/example-notifications',
        payload: {},
        idempotencyKey: 'idemp_recent',
        status: 'PENDING' as const,
        retryCount: 0,
        maxRetries: 5,
        createdAt: new Date().toISOString(),
      },
    ];

    const outboxFile = resolveAppDataFile('outbox_events.json');
    fs.mkdirSync(path.dirname(outboxFile), { recursive: true });
    fs.writeFileSync(outboxFile, JSON.stringify(events, null, 2));

    const result = outboxQueue.pruneStalePending();
    expect(result.pruned).toBe(1);

    const stats = outboxQueue.getStats();
    expect(stats.pending).toBe(1);
  });

  it('isOutboxEventDue respects nextAttemptAt', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(
      isOutboxEventDue({
        id: '1',
        eventType: 'technician_login',
        destinationUrl: 'https://n8n.example.com',
        payload: {},
        idempotencyKey: 'k',
        status: 'PENDING',
        retryCount: 1,
        maxRetries: 5,
        createdAt: new Date().toISOString(),
        nextAttemptAt: future,
      })
    ).toBe(false);

    const past = new Date(Date.now() - 1000).toISOString();
    expect(
      isOutboxEventDue({
        id: '2',
        eventType: 'technician_login',
        destinationUrl: 'https://n8n.example.com',
        payload: {},
        idempotencyKey: 'k2',
        status: 'PENDING',
        retryCount: 1,
        maxRetries: 5,
        createdAt: new Date().toISOString(),
        nextAttemptAt: past,
      })
    ).toBe(true);
  });

  it('computeNextAttemptAt uses backoff table', () => {
    const t1 = computeNextAttemptAt(1);
    const t2 = computeNextAttemptAt(2);
    expect(new Date(t2).getTime() - new Date(t1).getTime()).toBeGreaterThanOrEqual(
      OUTBOX_BACKOFF_MS[1] - OUTBOX_BACKOFF_MS[0] - 5000
    );
  });

  it('defines extended backoff steps for long-running retries', () => {
    expect(OUTBOX_BACKOFF_MS.length).toBeGreaterThanOrEqual(8);
    expect(OUTBOX_BACKOFF_MS[OUTBOX_BACKOFF_MS.length - 1]).toBeGreaterThanOrEqual(86_400_000);
  });
});
