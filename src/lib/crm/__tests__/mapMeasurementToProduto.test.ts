import { describe, expect, it } from "vitest";
import { buildProdutoItemsFromMeasurements } from "@/lib/crm/mapMeasurementToProduto";
import { mapServiceItemToProdutoCreateInput } from "@/lib/crm/produtoItemInput";
import { CRM_FIELDS } from "@/lib/crm/contract";

describe("buildProdutoItemsFromMeasurements", () => {
  it("mapeia campos estruturados e mantém cor/localizacao legado", () => {
    const items = buildProdutoItemsFromMeasurements("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", {
      groups: [
        {
          type: "ESTORE_EXTERIOR",
          details: {
            material: "ALUMINIO_TERMICO",
            ral: "7016",
            activation: "MANUAL",
            fabric: "TecA",
            reference: "RefB",
            observations: "Obs geral",
          },
          measurements: [
            {
              qty: 1,
              width: 1000,
              height: 1200,
              notes: "Sala",
              fixation: "Teto",
              controls: "Esquerda",
              price: 150,
            },
          ],
        },
      ],
    });

    expect(items).toHaveLength(1);
    expect(items[0].division).toBe("Sala");
    expect(items[0].material).toBe("ALUMINIO_TERMICO");
    expect(items[0].fixation).toBe("Teto");
    expect(items[0].controls).toBe("Esquerda");
    expect(items[0].ralColor).toBe("7016");
    expect(items[0].price).toBe(150);
    expect(items[0].measurementGroupId).toContain("ESTORE_EXTERIOR");
    expect(items[0].color).toContain("RAL 7016");
    expect(items[0].location).toContain("Fixação: Teto");
    expect(items[0].location).toContain("Mat: ALUMINIO_TERMICO");
  });

  it("não grava material no CRM para estore interior (usa modelo)", () => {
    const items = buildProdutoItemsFromMeasurements("opp-id-12345678", {
      groups: [
        {
          type: "ESTORE_INTERIOR",
          details: {
            material: "ALUMINIO_TERMICO",
            model: "ROLO",
            fabric: "Tecido A",
            activation: "MANUAL",
          },
          measurements: [{ qty: 1, width: 500, height: 600, notes: "Quarto" }],
        },
      ],
    });

    expect(items[0].material).toBeUndefined();
    expect(items[0].model).toBe("Rolo");
    expect(items[0].location).toContain("Mod: Rolo");
    expect(items[0].location).not.toContain("Mat:");
  });

  it("inclui subtipo de rolo no modelo interior no CRM", () => {
    const items = buildProdutoItemsFromMeasurements("opp-id-12345678", {
      groups: [
        {
          type: "ESTORE_INTERIOR",
          details: {
            model: "ROLO",
            roloVariant: "TEKNOFLEX_XL",
            fabric: "Tecido B",
          },
          measurements: [{ qty: 1, width: 500, height: 600 }],
        },
      ],
    });

    expect(items[0].model).toBe("Rolo — Tecnoflex XL");
    expect(items[0].location).toContain("Mod: Rolo — Tecnoflex XL");
  });

  it("inclui tipo de rolo Outros com texto extra no CRM", () => {
    const items = buildProdutoItemsFromMeasurements("opp-id-12345678", {
      groups: [
        {
          type: "ESTORE_INTERIOR",
          details: {
            model: "ROLO",
            roloVariant: "OUTRO",
            otherRoloVariant: "Linha custom",
          },
          measurements: [{ qty: 1, width: 500, height: 600 }],
        },
      ],
    });

    expect(items[0].model).toBe("Rolo — Linha custom");
    expect(items[0].location).toContain("Tipo rolo: Linha custom");
  });

  it("grava OUTRO com materialOutro", () => {
    const items = buildProdutoItemsFromMeasurements("opp-id-12345678", {
      groups: [
        {
          type: "ESTORE_EXTERIOR",
          details: { material: "OUTRO", otherMaterial: "Fibra especial" },
          measurements: [{ qty: 1, width: 500, height: 600, notes: "Varanda" }],
        },
      ],
    });

    expect(items[0].material).toBe("OUTRO");
    expect(items[0].materialOther).toBe("Fibra especial");
    expect(items[0].location).toContain("Mat: Fibra especial");
  });
});

describe("mapServiceItemToProdutoCreateInput", () => {
  it("usa chaves CRM_FIELDS.serviceItem", () => {
    const data = mapServiceItemToProdutoCreateInput({
      opportunityId: "opp-1",
      product: "ESTORE_EXTERIOR",
      width: 1,
      height: 2,
      qty: 3,
      isPrepared: false,
      division: "Quarto",
      material: "PVC",
      measurementGroupId: "g-1",
    });

    const F = CRM_FIELDS.serviceItem;
    expect(data[F.division]).toBe("Quarto");
    expect(data[F.material]).toBe("PVC");
    expect(data[F.measurementGroupId]).toBe("g-1");
    expect(String(data.name)).toContain("Quarto");
  });
});
