import { describe, expect, it } from "vitest";
import { buildMeasurementSheetFromPayload } from "@/lib/measurementSheetBuilder";
import { parseAndGroupServiceItems } from "@/lib/measurementsUtils";

describe("measurementSheetBuilder", () => {
  it("agrupa linhas com etiquetas legíveis", () => {
    const sheet = buildMeasurementSheetFromPayload(
      {
        opportunityId: "opp-1",
        clientName: "Cliente Teste",
        nsi: "123",
        address: "Rua A",
      },
      {
        groups: [
          {
            type: "ESTORE_EXTERIOR",
            details: { material: "ALUMINIO_TERMICO", ral: "7016", activation: "MANUAL" },
            measurements: [{ qty: 2, width: 1200, height: 1400, notes: "Sala" }],
          },
        ],
      }
    );

    expect(sheet.groups[0].productLabel).toBe("Estore Exterior");
    expect(sheet.groups[0].materialLabel).toContain("Alumínio");
    expect(sheet.groups[0].rows[0].division).toBe("Sala");
  });
});

describe("parseAndGroupServiceItems", () => {
  it("reconstrói grupos a partir de registos Produto", () => {
    const groups = parseAndGroupServiceItems([
      {
        produto: "ESTORE_EXTERIOR",
        quantidade: 1,
        largura: 900,
        altura: 1100,
        cor: "RAL 7016 / Tec: X / Ref: Y",
        localizacao: "Local: Cozinha | Fixação: Teto | Comandos: Esq. | Mat: ALUMINIO_TERMICO | Acion: MANUAL",
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].measurements[0].notes).toBe("Cozinha");
    expect(groups[0].details.ral).toContain("7016");
  });

  it("prefere campos estruturados do Produto", () => {
    const groups = parseAndGroupServiceItems([
      {
        produto: "ESTORE_EXTERIOR",
        quantidade: 2,
        largura: 800,
        altura: 900,
        divisao: "Hall",
        fixacao: "Parede",
        comandos: "Dir.",
        material: "OUTRO",
        materialOutro: "Composto X",
        modelo: "ModelZ",
        ralCor: "9005",
        tecido: "Rede1",
        referencia: "REF-9",
        acionamento: "MOTOR",
        observacoesProduto: "Nota produto",
        grupoMedicaoId: "grp-abc",
        preco: 99.5,
        cor: "legado",
        localizacao: "legado",
      },
      {
        produto: "ESTORE_EXTERIOR",
        quantidade: 1,
        largura: 700,
        altura: 800,
        grupoMedicaoId: "grp-abc",
        divisao: "Hall 2",
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].details.material).toBe("OUTRO");
    expect(groups[0].details.otherMaterial).toBe("Composto X");
    expect(groups[0].details.model).toBe("");
    expect(groups[0].measurements).toHaveLength(2);
    expect(groups[0].measurements[0].price).toBe("99.5");
    expect(groups[0].measurements[0].notes).toBe("Hall");
  });
});
