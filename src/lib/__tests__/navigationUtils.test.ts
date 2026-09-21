import { describe, it, expect } from "vitest";
import { buildNavigationUrls } from "../navigationUtils";

describe("navigationUtils", () => {
  it("builds coordinate-based URLs when coords exist", () => {
    const urls = buildNavigationUrls("Rua Teste", [38.72, -9.14]);
    expect(urls.googleMaps).toContain("destination=38.72,-9.14");
    expect(urls.waze).toContain("ll=38.72,-9.14");
    expect(urls.wazeWeb).toContain("ll=38.72,-9.14");
  });

  it("falls back to address when coords missing", () => {
    const urls = buildNavigationUrls("Av. da Liberdade, Lisboa", null);
    expect(urls.googleMaps).toContain("destination=Av.%20da%20Liberdade%2C%20Lisboa");
    expect(urls.waze).toContain("q=Av.%20da%20Liberdade%2C%20Lisboa");
    expect(urls.wazeWeb).toContain("q=Av.%20da%20Liberdade%2C%20Lisboa");
  });

  it("handles empty address gracefully", () => {
    const urls = buildNavigationUrls("", undefined);
    expect(urls.googleMaps).toContain("destination=");
    expect(urls.waze).toContain("navigate=yes");
  });
});
