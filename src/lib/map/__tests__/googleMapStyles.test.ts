import { describe, expect, it } from "vitest";
import { OPERATIONS_MAP_STYLES } from "@/lib/map/googleMapStyles";

describe("OPERATIONS_MAP_STYLES", () => {
  it("esconde POI e trânsito para focar nos pedidos", () => {
    const poiOff = OPERATIONS_MAP_STYLES.some(
      (rule) =>
        rule.featureType === "poi" &&
        !rule.elementType &&
        rule.stylers?.some((s) => s.visibility === "off")
    );
    const transitOff = OPERATIONS_MAP_STYLES.some(
      (rule) =>
        rule.featureType === "transit" &&
        rule.stylers?.some((s) => s.visibility === "off")
    );
    expect(poiOff).toBe(true);
    expect(transitOff).toBe(true);
  });
});
