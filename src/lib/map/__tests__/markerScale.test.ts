import { describe, expect, it } from "vitest";
import {
  getHqLogoPixelSize,
  getRouteStopPixelSize,
  getServiceMarkerPixelSize,
  getTechnicianVanPixelSize,
  shouldShowDenseLabels,
} from "@/lib/map/markerScale";

describe("markerScale", () => {
  it("escala pinos de serviço por zoom", () => {
    expect(getServiceMarkerPixelSize(10).width).toBe(44);
    expect(getServiceMarkerPixelSize(12).width).toBe(52);
    expect(getServiceMarkerPixelSize(14).width).toBe(60);
    expect(getServiceMarkerPixelSize(14).height).toBeGreaterThan(
      getServiceMarkerPixelSize(14).width
    );
  });

  it("aumenta pinos selecionados ou destacados", () => {
    expect(getServiceMarkerPixelSize(14, "selected").width).toBe(70);
    expect(getServiceMarkerPixelSize(12, "highlighted").width).toBe(62);
  });

  it("define tamanhos auxiliares", () => {
    expect(getTechnicianVanPixelSize(10)).toBe(30);
    expect(getTechnicianVanPixelSize(14, true)).toBe(40);
    expect(getRouteStopPixelSize(14)).toBe(46);
    expect(getHqLogoPixelSize(14)).toBe(40);
  });

  it("só mostra labels densos em zoom alto", () => {
    expect(shouldShowDenseLabels(13)).toBe(false);
    expect(shouldShowDenseLabels(14)).toBe(true);
  });
});
