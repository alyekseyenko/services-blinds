import { describe, expect, it } from "vitest";
import type { ProductGroup } from "@/types";
import {
  buildMeasurementsFocusedStatus,
  formatMeasurementsProgressSummary,
  getFormRemeasureState,
} from "@/lib/measurements/formStatusHelpers";

describe("formStatusHelpers", () => {
  it("formatMeasurementsProgressSummary em pt-PT", () => {
    expect(
      formatMeasurementsProgressSummary({
        productCount: 1,
        windowCount: 1,
        incompleteRows: 0,
      })
    ).toBe("1 produto · 1 janela");
    expect(
      formatMeasurementsProgressSummary({
        productCount: 2,
        windowCount: 3,
        incompleteRows: 2,
      })
    ).toBe("2 produtos · 3 janelas · 2 incompletas");
  });

  it("buildMeasurementsFocusedStatus prioriza última gravação local", () => {
    expect(
      buildMeasurementsFocusedStatus({
        progressSummary: "1 produto",
        lastLocalSave: "14:30",
        hasDraft: true,
      })
    ).toEqual({
      progressSummary: "1 produto",
      draftLabel: "Rascunho · 14:30",
      draftTone: "success",
    });
    expect(
      buildMeasurementsFocusedStatus({
        progressSummary: "1 produto",
        lastLocalSave: null,
        hasDraft: true,
      }).draftLabel
    ).toBe("Rascunho ativo");
  });

  it("getFormRemeasureState lê o primeiro grupo com resposta", () => {
    const baseGroup = (remeasureNeeded: string, remeasureNote: string): ProductGroup => ({
      id: 1,
      type: "ESTORE_INTERIOR",
      isOpen: true,
      details: {
        material: "",
        otherMaterial: "",
        ral: "",
        activation: "",
        model: "",
        fabric: "",
        reference: "",
        observations: "",
        remeasureNeeded,
        remeasureNote,
      },
      measurements: [],
    });
    const groups = [baseGroup("", ""), baseGroup("SIM", "x")];
    expect(getFormRemeasureState(groups, false)).toEqual({
      needed: "SIM",
      note: "x",
      locked: false,
    });
  });
});