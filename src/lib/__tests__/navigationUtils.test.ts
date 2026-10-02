import { describe, it, expect } from "vitest";
import {
  buildGoogleMapsNativeUrl,
  buildNavigationUrls,
} from "../navigationUtils";

describe("navigationUtils", () => {
  it("builds coordinate-based URLs when coords exist", () => {
    const urls = buildNavigationUrls("Rua Teste", [38.72, -9.14]);
    expect(urls.googleMaps).toContain("destination=38.72,-9.14");
    expect(urls.googleMaps).toContain("travelmode=driving");
    expect(urls.waze).toContain("ll=38.72,-9.14");
    expect(urls.wazeWeb).toContain("ll=38.72,-9.14");
  });

  it("falls back to address when coords missing", () => {
    const urls = buildNavigationUrls("Av. da Liberdade, Lisboa", null);
    expect(urls.googleMaps).toContain("destination=Av.%20da%20Liberdade%2C%20Lisboa");
    expect(urls.googleMaps).toContain("travelmode=driving");
    expect(urls.waze).toContain("q=Av.%20da%20Liberdade%2C%20Lisboa");
    expect(urls.wazeWeb).toContain("q=Av.%20da%20Liberdade%2C%20Lisboa");
  });

  it("handles empty address gracefully", () => {
    const urls = buildNavigationUrls("", undefined);
    expect(urls.googleMaps).toContain("destination=");
    expect(urls.waze).toContain("navigate=yes");
  });

  it("builds iOS Google Maps native URL with coordinates", () => {
    const url = buildGoogleMapsNativeUrl("Rua Teste", [38.72, -9.14], "ios");
    expect(url).toBe("comgooglemaps://?daddr=38.72,-9.14&directionsmode=driving");
  });

  it("builds Android Google navigation URL with coordinates", () => {
    const url = buildGoogleMapsNativeUrl("Rua Teste", [38.72, -9.14], "android");
    expect(url).toBe("google.navigation:q=38.72,-9.14");
  });

  it("ignores invalid 0,0 coordinates for native URLs", () => {
    const url = buildGoogleMapsNativeUrl("Morada X", [0, 0], "android");
    expect(url).toBe("geo:0,0?q=Morada%20X");
  });
});
