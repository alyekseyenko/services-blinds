import { describe, expect, it } from "vitest";
import {
  OUTBOX_EVENT_TYPES,
  assertOutboxEventType,
  parseOutboxPayload,
} from "../outboxEvents";
import { resolveN8nWebhookUrl } from "@/lib/n8nWebhooks";

describe("outbox event contracts", () => {
  it("covers every registered event type with webhook routing", () => {
    for (const eventType of OUTBOX_EVENT_TYPES) {
      expect(() => resolveN8nWebhookUrl(eventType)).not.toThrow();
      const url = resolveN8nWebhookUrl(eventType);
      expect(url.length).toBeGreaterThan(0);
    }
  });

  it("rejects unknown event types at enqueue boundary", () => {
    expect(() => assertOutboxEventType("not_a_real_event")).toThrow();
  });

  it("validates appointment_scheduled payload", () => {
    const parsed = parseOutboxPayload("appointment_scheduled", {
      event: "appointment_scheduled",
      taskId: "task-1",
    });
    expect(parsed.event).toBe("appointment_scheduled");
    expect(parsed.schemaVersion).toBe(1);
  });
});
