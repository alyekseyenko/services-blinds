import { describe, expect, it } from "vitest";
import { buildTechnicianVanSvg, technicianVanDataUrl } from "@/lib/map/technicianVanMarker";

describe("technicianVanMarker", () => {
  it("usa o mesmo desenho da carrinha no mapa e na legenda", () => {
    const svg = buildTechnicianVanSvg(36);
    expect(svg).toContain('viewBox="0 0 40 40"');
    expect(svg).toContain('fill="#84cc16"');
    expect(svg).toContain("M11 23h18l-2.5-7h-13z");
    expect(technicianVanDataUrl(36)).toContain("data:image/svg+xml");
  });
});
