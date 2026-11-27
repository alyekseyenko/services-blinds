import { describe, expect, it } from "vitest";
import { resolveVisitMarkerStatus } from "@/lib/map/visitMarkerStatus";

describe("resolveVisitMarkerStatus", () => {
  it("cancelada e incompleta ganham ao atraso", () => {
    expect(
      resolveVisitMarkerStatus({
        taskStatus: "CANCELADO",
        isLate: true,
        hasScheduledTask: true,
      })
    ).toBe("cancelled");
    expect(resolveVisitMarkerStatus({ taskStatus: "INCOMPLETO", isLate: true })).toBe(
      "incomplete"
    );
  });

  it("concluída mostra visto", () => {
    expect(resolveVisitMarkerStatus({ status: "CONCLUIDO" })).toBe("done");
  });

  it("por agendar em entrada", () => {
    expect(
      resolveVisitMarkerStatus({ stage: "ENTRADA", hasScheduledTask: false })
    ).toBe("unscheduled");
  });
});
