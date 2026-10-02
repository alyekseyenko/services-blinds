import { describe, expect, it } from "vitest";
import { OUTBOX_EVENT_TYPES } from "@/lib/integrations/outboxEvents";
import { generatedOutboxEventChecks } from "../checks/generated";

describe("generatedOutboxEventChecks", () => {
  it("creates one check per outbox event type", () => {
    expect(generatedOutboxEventChecks.length).toBe(OUTBOX_EVENT_TYPES.length);
    const ids = generatedOutboxEventChecks.map((c) => c.id);
    for (const event of OUTBOX_EVENT_TYPES) {
      expect(ids).toContain(`outbox-event-routing-${event}`);
    }
  });
});
