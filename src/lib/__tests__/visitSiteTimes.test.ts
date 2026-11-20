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

  it("não abre segunda sessão enquanto a primeira está em curso", () => {
    const body = writeVisitSiteTimesMarker("", { arrivedAt: "2026-01-01T08:00:00.000Z" });
    const next = recordVisitArrival(body, "2026-06-01T10:00:00.000Z");
    expect(parseVisitSiteTimes(next).arrivedAt).toBe("2026-01-01T08:00:00.000Z");
  });

  it("soma várias sessões (incompleto noutro dia e retoma)", () => {
    const d1a = "2026-06-01T10:00:00.000Z";
    const d1b = "2026-06-01T11:00:00.000Z";
    const d2a = "2026-06-03T10:00:00.000Z";
    const d2b = "2026-06-03T11:30:00.000Z";
    let body = recordVisitArrival("", d1a);
    body = recordVisitDeparture(body, d1b);
    body = recordVisitArrival(body, d2a);
    body = recordVisitDeparture(body, d2b);
    const times = parseVisitSiteTimes(body);
    expect(times.segments).toHaveLength(2);
    expect(computeOnSiteDurationMs(times)).toBe(150 * 60_000);
  });

  it("formata duração em pt-PT", () => {
    expect(formatOnSiteDurationPt(45 * 60_000)).toBe("45 min");
    expect(formatOnSiteDurationPt(90 * 60_000)).toBe("1 h 30 min");
  });
});
