import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { outboxQueue } from '../outboxQueue';
import {
  buildNotificationIdempotencyKey,
  serverTriggerServiceReport,
} from '../notificationAction';

describe('notification idempotency keys', () => {
  it('builds stable technician_login keys from email and loginAt', () => {
    const key = buildNotificationIdempotencyKey('technician_login', {
      technician: { email: 'Tech@Example.com' },
      loginAt: '2026-10-01T10:00:00.000Z',
    });
    expect(key).toBe('idemp_notif_technician_login_tech@example.com_2026-10-01T10:00:00.000Z');
  });

  beforeEach(() => {
    vi.spyOn(outboxQueue, 'enqueue').mockResolvedValue({
      success: true,
      eventId: 'mock',
      queued: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows two service reports for the same opportunity with different task status', async () => {
    const enqueueMock = vi.mocked(outboxQueue.enqueue);

    await serverTriggerServiceReport({
      taskId: 'task-a',
      opportunityId: 'opp-1',
      status: 'INCOMPLETO',
    });
    await serverTriggerServiceReport({
      taskId: 'task-a',
      opportunityId: 'opp-1',
      status: 'CONCLUIDO',
    });

    expect(enqueueMock).toHaveBeenCalledTimes(2);
    const keys = enqueueMock.mock.calls.map((call) => call[3]);
    expect(keys[0]).toBe('idemp_svc_report_task-a_INCOMPLETO');
    expect(keys[1]).toBe('idemp_svc_report_task-a_CONCLUIDO');
    expect(keys[0]).not.toBe(keys[1]);
  });
});
