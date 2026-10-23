import { describe, expect, it } from "vitest";
import {
  formatRtsCommandsSummary,
  getRtsCommandSpecs,
  rtsChannelOptions,
  sanitizeRowRtsAssignment,
  updateRtsCommandSpec,
} from "@/lib/measurements/rtsCommands";
import { getGroupSpecDetailEntries } from "@/lib/measurements/groupSpecDisplay";
import { buildMeasurementSheetFromPayload } from "@/lib/measurements/sheetBuilder";
import { measurementLineColumnPlan } from "@/lib/measurements/sheetDisplay";
import { formatRemeasureAnswer } from "@/lib/measurements/labels";

describe("comandos RTS", () => {
  it("cada comando limita os canais disponíveis no estore", () => {
    const specs = getRtsCommandSpecs({ rtsCommandCount: "2", rtsCommandChannels: "V5,V3" });
    expect(specs).toHaveLength(2);
    expect(rtsChannelOptions(specs[0])).toEqual([1, 2, 3, 4, 5]);
    expect(rtsChannelOptions(specs[1])).toEqual([1, 2, 3]);
  });

  it("vários canais sem número ainda não oferece canais", () => {
    const specs = getRtsCommandSpecs({ rtsCommandCount: "1", rtsCommandChannels: "V" });
    expect(specs[0].mode).toBe("VARIOS_CANAIS");
    expect(rtsChannelOptions(specs[0])).toEqual([]);
  });

  it("mantém escolhas de comandos acima da quantidade ao editar um comando", () => {
    const csv = updateRtsCommandSpec(
      { rtsCommandCount: "1", rtsCommandChannels: "1,V4" },
      1,
      { mode: "VARIOS_CANAIS", channelCount: 6 }
    );
    expect(csv).toBe("V6,V4");
    expect(getRtsCommandSpecs({ rtsCommandCount: "2", rtsCommandChannels: csv })[1].channelCount).toBe(4);
  });

  it("migra fichas antigas de um só comando", () => {
    const details = { rtsCommandMode: "VARIOS_CANAIS", rtsChannelCount: "5" };
    expect(getRtsCommandSpecs(details)).toEqual([
      { index: 1, mode: "VARIOS_CANAIS", channelCount: 5 },
    ]);
    expect(updateRtsCommandSpec(details, 2, { mode: "UM_CANAL" })).toBe("V5,1");
  });

  it("limpa comando/canal de estores que deixaram de existir", () => {
    const specs = getRtsCommandSpecs({ rtsCommandCount: "2", rtsCommandChannels: "1,V3" });
    expect(sanitizeRowRtsAssignment({ storeCommand: "3", storeChannel: "2" }, specs)).toEqual({
      storeCommand: "",
      storeChannel: "",
    });
    expect(sanitizeRowRtsAssignment({ storeCommand: "2", storeChannel: "5" }, specs).storeChannel).toBe("");
    expect(sanitizeRowRtsAssignment({ storeCommand: "1", storeChannel: "" }, specs).storeChannel).toBe("1");
  });

  it("resume os comandos para ficha e CRM", () => {
    const details = {
      activation: "MOTOR_RTS",
      rtsCommandCount: "2",
      rtsCommandChannels: "V5,1",
    };
    expect(formatRtsCommandsSummary(details)).toBe("2 comandos (C1: 5 canais · C2: 1 canal)");
    const entries = getGroupSpecDetailEntries("ESTORE_EXTERIOR", details);
    expect(entries).toEqual(
      expect.arrayContaining([
        { label: "Comandos RTS", value: "2 comandos" },
        { label: "Comando 1", value: "5 canais" },
        { label: "Comando 2", value: "1 canal" },
      ])
    );
  });

  it("exporta comando e canal de cada estore", () => {
    const sheet = buildMeasurementSheetFromPayload(
      { opportunityId: "o", clientName: "C", address: "A" },
      {
        groups: [
          {
            type: "ESTORE_INTERIOR",
            details: {
              activation: "MOTOR_RTS",
              rtsCommandCount: "2",
              rtsCommandChannels: "V5,V3",
              remeasureNeeded: "NAO",
            },
            measurements: [
              { qty: 1, width: 1000, height: 1200, storeCommand: "2", storeChannel: "3" },
            ],
          },
        ],
      }
    );
    const group = sheet.groups[0];
    expect(sheet.remeasureLabel).toBe("Não");
    expect(group.rows[0].channelLabel).toBe("Comando 2 · Canal 3");
    expect(measurementLineColumnPlan(group).columns.map((c) => c.header)).toContain("Comando / canal");
  });
});

describe("formatRemeasureAnswer", () => {
  it("aceita Sim, Não e respostas antigas «Outros»", () => {
    expect(formatRemeasureAnswer("SIM")).toBe("Sim");
    expect(formatRemeasureAnswer("NAO")).toBe("Não");
    expect(formatRemeasureAnswer("OUTROS", "Caixa nova")).toBe("Outros: Caixa nova");
  });
});
