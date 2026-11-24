import { describe, it, expect } from "vitest";
import type { SyncQueueItem } from "@/lib/db";

function matchesPendingMeasurementsSave(
  item: SyncQueueItem,
  taskId: string,
  opportunityId: string
): boolean {
  return (
    item.action === "SAVE_MEASUREMENTS" &&
    item.status === "pending" &&
    item.taskId === taskId &&
    String(item.payload?.opportunityId ?? "") === opportunityId
  );
}

describe("enqueueMeasurementsSaveOp dedupe", () => {
  const base = (overrides: Partial<SyncQueueItem>): SyncQueueItem => ({
    taskId: "task-1",
    action: "SAVE_MEASUREMENTS",
    payload: { taskId: "task-1", opportunityId: "opp-a", data: {} },
    timestamp: 1,
    status: "pending",
    retries: 0,
    ...overrides,
  });

  it("deduplica por taskId e opportunityId", () => {
    const sameOpp = base({ payload: { opportunityId: "opp-a" } });
    const otherOpp = base({ payload: { opportunityId: "opp-b" } });
    expect(matchesPendingMeasurementsSave(sameOpp, "task-1", "opp-a")).toBe(true);
    expect(matchesPendingMeasurementsSave(otherOpp, "task-1", "opp-a")).toBe(false);
    expect(matchesPendingMeasurementsSave(otherOpp, "task-1", "opp-b")).toBe(true);
  });
});