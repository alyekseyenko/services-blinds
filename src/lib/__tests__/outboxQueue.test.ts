import { describe, it, expect, vi } from 'vitest';
import { outboxQueue } from '../outboxQueue';

describe('Transactional Outbox Pattern & Idempotency', () => {
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
});
