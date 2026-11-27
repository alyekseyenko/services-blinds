import { describe, expect, it } from "vitest";
import { ROUTE_STOP_PIN_COLOR, routeStopMarkerArt } from "@/lib/map/routeStopPin";

describe("routeStopMarkerArt", () => {
  it("marca a próxima paragem em fúcsia com número", () => {
    const art = routeStopMarkerArt("pending", 0, 0);
    expect(art.isNext).toBe(true);
    expect(art.symbolText).toBe("1");
    expect(art.pinColor).toBe(ROUTE_STOP_PIN_COLOR.next);
    expect(art.pinColor).not.toBe(ROUTE_STOP_PIN_COLOR.pending);
  });

  it("atrasada usa o mesmo ! do incompleto, em vermelho", () => {
    const late = routeStopMarkerArt("late", 1, -1);
    const incomplete = routeStopMarkerArt("incomplete", 1, -1);
    expect(late.symbolText).toBe(incomplete.symbolText);
    expect(late.symbolText).toBe("!");
    expect(late.pinColor).toBe(ROUTE_STOP_PIN_COLOR.late);
    expect(late.pinColor).not.toBe(incomplete.pinColor);
    expect(late.isLate).toBe(false);
  });

  it("concluída usa visto verde", () => {
    const art = routeStopMarkerArt("done", 2, 0);
    expect(art.symbolText).toBe("✓");
    expect(art.statusTitle).toBe("Concluído");
  });
});
