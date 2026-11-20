import { describe, expect, it } from "vitest";
import { measurementVersionButtonLabel } from "../versionStamp";

describe("measurementVersionButtonLabel", () => {
  it("junta a versão à data e hora em que foi registada", () => {
    const label = measurementVersionButtonLabel(2, "2026-11-12T15:04:00.000Z");
    expect(label.startsWith("v2 · ")).toBe(true);
    expect(label).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(label).toMatch(/\d{2}:\d{2}/);
  });

  it("fica só com o número quando não há data", () => {
    expect(measurementVersionButtonLabel(1, null)).toBe("v1");
  });

  it("mostra quem editou a versão", () => {
    expect(measurementVersionButtonLabel(13, null, "Óscar")).toBe("v13 · Editado por Óscar");
  });
});
