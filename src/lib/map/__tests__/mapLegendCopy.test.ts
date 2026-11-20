import { describe, expect, it } from "vitest";
import { MAP_LEGEND_STATUS_ITEMS, mapLegendHowToRead } from "@/lib/map/mapLegendCopy";

describe("mapLegendCopy", () => {
  it("explica a bolinha do técnico como visita agendada", () => {
    const scheduled = MAP_LEGEND_STATUS_ITEMS.find((i) => i.label === "Agendada");
    expect(scheduled?.technicianDot).toBe(true);
    expect(scheduled?.detail.toLowerCase()).toContain("técnico");
    expect(mapLegendHowToRead("admin").some((line) => line.includes("bolinha colorida"))).toBe(
      true
    );
  });
});