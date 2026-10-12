import { describe, expect, it } from "vitest";
import { resolveVisitArrivedAtMs } from "@/lib/visits/offlineStatusSync";

describe("resolveVisitArrivedAtMs", () => {
  it("preserva chegada quando conclui offline após em curso", () => {
    const arrived = 1_700_000_000_000;
    const closed = arrived + 3_600_000;
    const prev = {
      status: "EM_CURSO",
      occurredAt: arrived,
      visitArrivedAt: arrived,
    };
    expect(resolveVisitArrivedAtMs(prev, "CONCLUIDO", closed)).toBe(arrived);
  });

  it("define chegada ao passar para em curso", () => {
    const now = Date.now();
    expect(resolveVisitArrivedAtMs(undefined, "EM_CURSO", now)).toBe(now);
  });
});
