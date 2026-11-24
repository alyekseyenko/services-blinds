import { describe, it, expect } from "vitest";
import {
  hasValidMeasurements,
  parseMeasurementsFromReport,
  formatMeasurementsReport,
} from "../measurementsUtils";

describe("measurementsUtils", () => {
  const sample = {
    groups: [
      {
        type: "ESTORE_EXTERIOR",
        measurements: [{ qty: 1, width: 1200, height: 1500 }],
      },
    ],
  };

  it("parses JSON from HTML comment format", () => {
    const report = formatMeasurementsReport(sample);
    const parsed = parseMeasurementsFromReport(report);
    expect(parsed?.groups).toHaveLength(1);
    expect(parsed?.groups[0].measurements[0].width).toBe(1200);
  });

  it("detects valid measurements in report", () => {
    const report = formatMeasurementsReport(sample);
    expect(hasValidMeasurements(report, null)).toBe(true);
  });

  it("detects valid measurements in draft", () => {
    const draft = JSON.stringify({ groups: sample.groups });
    expect(hasValidMeasurements("", draft)).toBe(true);
  });

  it("returns false when no measurements exist", () => {
    expect(hasValidMeasurements("notas normais", null)).toBe(false);
  });

  it("aceita modo vão (openingWidth/openingHeight)", () => {
    const draft = JSON.stringify({
      groups: [
        {
          type: "ESTORE_EXTERIOR",
          measurements: [{ qty: 1, openingWidth: "1200", openingHeight: "1500" }],
        },
      ],
    });
    expect(hasValidMeasurements("", draft)).toBe(true);
  });

  it("aceita clarabóia (skylight exterior)", () => {
    const draft = JSON.stringify({
      groups: [
        {
          type: "CLARABOIA",
          measurements: [
            {
              qty: 1,
              width: "800",
              height: "900",
              skylightExteriorWidth: "850",
              skylightExteriorHeight: "950",
            },
          ],
        },
      ],
    });
    expect(hasValidMeasurements("", draft)).toBe(true);
  });
});
