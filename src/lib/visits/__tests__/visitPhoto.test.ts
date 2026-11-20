import { describe, expect, it } from "vitest";
import {
  VISIT_PHOTO_MAX_BYTES,
  buildVisitPhotoFilename,
  isJpegBytes,
  validateVisitPhotoByteSize,
  visitPhotoQualityStep,
} from "../visitPhoto";

describe("visitPhoto", () => {
  it("reconhece cabeçalho JPEG", () => {
    expect(isJpegBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(isJpegBytes(new Uint8Array([0x89, 0x50]))).toBe(false);
  });

  it("valida o tamanho máximo", () => {
    expect(validateVisitPhotoByteSize(120_000)).toBeNull();
    expect(validateVisitPhotoByteSize(VISIT_PHOTO_MAX_BYTES + 1)).toMatch(/pesada/i);
    expect(validateVisitPhotoByteSize(0)).toMatch(/vazio/i);
  });

  it("gera nome de ficheiro estável", () => {
    const name = buildVisitPhotoFilename({
      clientRequestId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      capturedAtMs: Date.UTC(2026, 10, 18, 12, 0, 0),
    });
    expect(name).toMatch(/^terreno-.*\.jpg$/);
    expect(name).toContain("aaaaaaaa");
  });

  it("reduz a qualidade em passos", () => {
    expect(visitPhotoQualityStep(0)).toBeGreaterThan(visitPhotoQualityStep(2));
  });
});