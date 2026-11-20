import { describe, expect, it } from "vitest";
import {
  isOutboxDeadLetterAfterFailure,
  OUTBOX_MAX_ATTEMPTS,
  outboxBackoffIntervalMinutes,
} from "../outboxBackoff";

describe("outboxBackoff", () => {
  it("primeiras falhas usam 1, 5, 15 min e depois 1 h", () => {
    expect(outboxBackoffIntervalMinutes(1)).toBe(1);
    expect(outboxBackoffIntervalMinutes(2)).toBe(5);
    expect(outboxBackoffIntervalMinutes(3)).toBe(15);
    expect(outboxBackoffIntervalMinutes(4)).toBe(60);
    expect(outboxBackoffIntervalMinutes(7)).toBe(60);
  });

  it("na 8.ª falha é dead letter (sem próximo intervalo)", () => {
    expect(outboxBackoffIntervalMinutes(OUTBOX_MAX_ATTEMPTS)).toBe(null);
    expect(isOutboxDeadLetterAfterFailure(OUTBOX_MAX_ATTEMPTS)).toBe(true);
    expect(isOutboxDeadLetterAfterFailure(7)).toBe(false);
  });
});
