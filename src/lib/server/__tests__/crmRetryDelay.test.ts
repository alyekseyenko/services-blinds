import { describe, expect, it } from 'vitest';
import { crmRetryDelayMs, parseRetryAfterMs } from '../crmRetryDelay';

describe('crmRetryDelayMs', () => {
  it('adds jitter on top of linear backoff', () => {
    const delays = Array.from({ length: 20 }, () => crmRetryDelayMs(400, 2));
    expect(delays.some((d) => d >= 800 && d <= 1050)).toBe(true);
  });
});

describe('parseRetryAfterMs', () => {
  it('parses delay seconds', () => {
    expect(parseRetryAfterMs('3')).toBe(3000);
  });
});
