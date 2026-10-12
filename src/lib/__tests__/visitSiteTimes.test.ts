import { describe, expect, it } from "vitest";
import {
  computeOnSiteDurationMs,
  formatOnSiteDurationPt,
  parseVisitSiteTimes,
  recordVisitArrival,
  recordVisitDeparture,
  writeVisitSiteTimesMarker,
} from "@/lib/visitSiteTimes";

describe("visitSiteTimes", () => {
  it("grava chegada e saída no corpo da tarefa", () => {
    const arrived = "2026-06-01T10:00:00.000Z";
    const closed = "2026-06-01T11:30:00.000Z";
    let body = recordVisitArrival("", arrived);
    body = recordVisitDeparture(body, closed);
    const times = parseVisitSiteTimes(body);
    expect(times.arrivedAt).toBe(arrived);
    expect(times.closedAt).toBe(closed);
    expect(computeOnSiteDurationMs(times)).toBe(90 * 60_000);
  });

  it("não sobrescreve chegada existente", () => {
    const body = writeVisitSiteTimesMarker("", { arrivedAt: "2026-01-01T08:00:00.000Z" });
    const next = recordVisitArrival(body, "2026-06-01T10:00:00.000Z");
    expect(parseVisitSiteTimes(next).arrivedAt).toBe("2026-01-01T08:00:00.000Z");
  });

  it("formata duração em pt-PT", () => {
    expect(formatOnSiteDurationPt(45 * 60_000)).toBe("45 min");
    expect(formatOnSiteDurationPt(90 * 60_000)).toBe("1 h 30 min");
  });
});
