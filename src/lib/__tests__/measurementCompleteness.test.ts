import { describe, expect, it } from "vitest";
import {
  countIncompleteMeasurementRows,
  groupHasSpecCompletenessWarnings,
  groupMissingActivation,
  isMeasurementRowComplete,
  summarizeMeasurementGroupCompleteness,
  summarizeMeasurementsFormProgress,
} from "@/lib/measurementCompleteness";
import type { ProductGroup } from "@/types";

const baseDetails = {
  material: "",
  otherMaterial: "",
  ral: "",
  activation: "",
  model: "",
  fabric: "",
  reference: "",
  observations: "",
};

describe("measurementCompleteness", () => {
  it("linha completa exige qty, largura e altura positivas", () => {
    expect(
      isMeasurementRowComplete({ qty: 1, width: "1200", height: "1500", fixation: "", controls: "", notes: "", price: "" })
    ).toBe(true);
    expect(
      isMeasurementRowComplete({ qty: "", width: "1200", height: "1500", fixation: "", controls: "", notes: "", price: "" })
    ).toBe(false);
  });

  it("conta linhas incompletas", () => {
    expect(
      countIncompleteMeasurementRows([
        { qty: 1, width: "1", height: "1", fixation: "", controls: "", notes: "", price: "" },
        { qty: "", width: "", height: "", fixation: "", controls: "", notes: "", price: "" },
      ])
    ).toBe(1);
  });

  it("acionamento obrigatório exceto mosquiteiro", () => {
    expect(groupMissingActivation("MOSQUITEIRO", { ...baseDetails, activation: "" })).toBe(false);
    expect(groupMissingActivation("TOLDO", { ...baseDetails, activation: "" })).toBe(true);
    expect(groupMissingActivation("TOLDO", { ...baseDetails, activation: "MANUAL" })).toBe(false);
  });

  it("resume avisos para o cabeçalho", () => {
    const group: ProductGroup = {
      id: 1,
      type: "ESTORE_EXTERIOR",
      details: { ...baseDetails, material: "PVC" },
      measurements: [
        { qty: 1, width: "100", height: "", fixation: "", controls: "", notes: "", price: "" },
        { qty: "", width: "", height: "", fixation: "", controls: "", notes: "", price: "" },
      ],
    };
    const hints = summarizeMeasurementGroupCompleteness(group);
    expect(hints).toContain("Falta acionamento");
    expect(hints.some((h) => h.includes("linha"))).toBe(true);
  });

  it("avisos de specs não incluem linhas incompletas", () => {
    const group: ProductGroup = {
      id: 1,
      type: "TOLDO",
      details: { ...baseDetails, activation: "MANUAL", model: "X" },
      measurements: [
        { qty: "", width: "", height: "", fixation: "", controls: "", notes: "", price: "" },
      ],
    };
    expect(groupHasSpecCompletenessWarnings(group)).toBe(false);
    expect(summarizeMeasurementGroupCompleteness(group).some((h) => h.includes("linha"))).toBe(
      true
    );
  });

  it("resume progresso do formulário", () => {
    const groups: ProductGroup[] = [
      {
        id: 1,
        type: "TOLDO",
        details: baseDetails,
        measurements: [
          { qty: 1, width: "1", height: "1", fixation: "", controls: "", notes: "", price: "" },
          { qty: "", width: "", height: "", fixation: "", controls: "", notes: "", price: "" },
        ],
      },
      {
        id: 2,
        type: "MOSQUITEIRO",
        details: baseDetails,
        measurements: [],
      },
    ];
    expect(summarizeMeasurementsFormProgress(groups)).toEqual({
      productCount: 2,
      windowCount: 2,
      incompleteRows: 1,
    });
  });
});
