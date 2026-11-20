import { describe, expect, it } from "vitest";
import { mapPinAlertColor } from "@/lib/map/pinAlert";

describe("mapPinAlertColor", () => {
  const now = new Date("2026-11-19T12:00:00");

  it("atrasada usa vermelho de visita", () => {
    expect(mapPinAlertColor({ isLate: true, delayAlert: "red", now })).toBe("#dc2626");
  });

  it("visita futura não leva contorno de parado", () => {
    expect(
      mapPinAlertColor({
        isLate: false,
        delayAlert: "red",
        scheduledAt: "2026-11-20T09:00:00",
        now,
      })
    ).toBeNull();
  });

  it("sem hora de visita, parado +30 usa vermelho de pipeline", () => {
    expect(mapPinAlertColor({ isLate: false, delayAlert: "red", now })).toBe("#ef4444");
  });
});