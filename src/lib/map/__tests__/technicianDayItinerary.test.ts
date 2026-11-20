import { describe, expect, it } from "vitest";
import {
  firstOpenStopIndex,
  itineraryStopKind,
  itineraryStopOnDrivingRoute,
  technicianDayItinerary,
  mergeTechnicianDayPool,
} from "@/lib/map/technicianDayItinerary";

describe("technicianDayItinerary", () => {
  it("inclui visitas concluídas de hoje pelo historyAt", () => {
    const stops = technicianDayItinerary(
      [
        {
          id: "done",
          technician: "Hugo Lança",
          coordinates: [39.4, -9.1],
          scheduledAt: null,
          historyAt: "2026-11-19T09:00:00.000Z",
          taskStatus: "CONCLUIDO",
        },
        {
          id: "next",
          technician: "Hugo Lança",
          coordinates: [39.41, -9.12],
          scheduledAt: "2026-11-19T11:00:00.000Z",
          taskStatus: "AGENDADO",
        },
        {
          id: "other-day",
          technician: "Hugo Lança",
          coordinates: [39.4, -9.1],
          historyAt: "2026-11-18T09:00:00.000Z",
          taskStatus: "CONCLUIDO",
        },
      ],
      { technicianName: "Hugo Lança", dayYmd: "2026-11-19" }
    );
    expect(stops.map((s) => s.id)).toEqual(["done", "next"]);
    expect(itineraryStopKind(stops[0])).toBe("done");
    expect(firstOpenStopIndex(stops)).toBe(1);
  });

  it("prefere o estado terminal ao juntar pipeline e histórico", () => {
    const merged = mergeTechnicianDayPool(
      [{ id: "a", twentyId: "tw", technician: "Hugo", taskStatus: "AGENDADO", coordinates: [1, 2] }],
      [{ id: "a", twentyId: "tw", technician: "Hugo", taskStatus: "CONCLUIDO", coordinates: [1, 2] }]
    );
    expect(merged[0].taskStatus).toBe("CONCLUIDO");
  });

  it("entra no trajeto se houve «Cheguei ao local» ou se está incompleta", () => {
    expect(
      itineraryStopOnDrivingRoute({
        id: "skip-cancel",
        taskStatus: "CANCELADO",
        visitArrivedAt: null,
      })
    ).toBe(false);
    expect(
      itineraryStopOnDrivingRoute({
        id: "cancel-on-site",
        taskStatus: "CANCELADO",
        visitArrivedAt: "2026-11-19T10:00:00.000Z",
      })
    ).toBe(true);
    expect(
      itineraryStopOnDrivingRoute({
        id: "incomplete",
        taskStatus: "INCOMPLETO",
        visitArrivedAt: null,
      })
    ).toBe(true);
    expect(
      itineraryStopOnDrivingRoute({
        id: "done-on-site",
        taskStatus: "CONCLUIDO",
        visitArrivedAt: "2026-11-19T09:00:00.000Z",
      })
    ).toBe(true);
    expect(
      itineraryStopOnDrivingRoute({ id: "next", taskStatus: "AGENDADO" })
    ).toBe(true);
  });
});