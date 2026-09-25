import fs from 'fs';
import path from 'path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { outboxQueue } from '../outboxQueue';
import { resolveAppDataFile } from '../server/scratchPath';

describe('Transactional Outbox Pattern & Idempotency', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should enqueue an event with deterministic idempotency key', async () => {
    // Mock do fetch
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      statusText: 'OK',
      json: async () => ({ success: true }),
    } as any);

    const result = await outboxQueue.enqueue(
      'TASK_COMPLETED_TEST',
      'http://localhost:5678/webhook-test/test',
      { taskId: 'task-123', status: 'CONCLUIDO' },
      'idemp_unique_test_123'
    );

    expect(result.success).toBe(true);
    expect(result.eventId).toBeDefined();

    const stats = outboxQueue.getStats();
    expect(stats.total).toBeGreaterThan(0);
  });

  it('retries transient webhook delivery failures before giving up', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce({
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
    expect(fetchMock).toHaveBeenCalledTimes(3);
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
});
