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
});
