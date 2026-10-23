import { describe, expect, it } from "vitest";
import { getRtsCommandSpecs } from "@/lib/measurements/rtsCommands";
import {
  analyzeRtsChannelUsage,
  formatRtsCapacityWarningMessage,
  formatRtsChannelSelectLabel,
  formatRtsCommandSelectLabel,
  getNextAvailableRtsAssignment,
  getRtsRowChannelWarning,
} from "@/lib/measurements/rtsChannelUsage";
import type { MeasurementRow } from "@/types";

function row(
  overrides: Partial<MeasurementRow> & Pick<MeasurementRow, "storeCommand" | "storeChannel">
): MeasurementRow {
  return {
    qty: 1,
    width: "",
    height: "",
    fixation: "",
    controls: "",
    notes: "",
    price: "",
    ...overrides,
  };
}

describe("rtsChannelUsage", () => {
  const details = { rtsCommandCount: "2", rtsCommandChannels: "V2,V2" };
  const specs = getRtsCommandSpecs(details);

  it("conta canais disponíveis e ocupação por comando", () => {
    const rows = [
      row({ storeCommand: "1", storeChannel: "1" }),
      row({ storeCommand: "1", storeChannel: "2" }),
      row({ storeCommand: "2", storeChannel: "1" }),
    ];
    const usage = analyzeRtsChannelUsage(specs, rows);
    expect(usage.totalAvailableChannels).toBe(4);
    expect(usage.occupiedChannelsPerCommand.get(1)).toBe(2);
    expect(usage.occupiedChannelsPerCommand.get(2)).toBe(1);
    expect(usage.assignedSlotCount).toBe(3);
  });

  it("etiqueta comando completo e canal em uso", () => {
    const rows = [
      row({ storeCommand: "1", storeChannel: "1" }),
      row({ storeCommand: "1", storeChannel: "2" }),
    ];
    const usage = analyzeRtsChannelUsage(specs, rows);
    expect(formatRtsCommandSelectLabel(specs[0], usage)).toBe("Comando 1 (2/2 — completo)");
    expect(formatRtsChannelSelectLabel(1, 1, 1, usage)).toBe("Canal 1 (em uso — Janela 1)");
    expect(formatRtsChannelSelectLabel(1, 2, 1, usage)).toBe("Canal 2 (livre)");
  });

  it("avisa canal repetido na linha", () => {
    const rows = [
      row({ storeCommand: "1", storeChannel: "1" }),
      row({ storeCommand: "1", storeChannel: "1" }),
    ];
    const usage = analyzeRtsChannelUsage(specs, rows);
    expect(getRtsRowChannelWarning(1, rows[1], specs, usage)).toBe(
      "Este canal já está atribuído na Janela 1."
    );
  });

  it("avisa quando todos os canais estão ocupados e a linha está vazia", () => {
    const rows = [
      row({ storeCommand: "1", storeChannel: "1" }),
      row({ storeCommand: "1", storeChannel: "2" }),
      row({ storeCommand: "2", storeChannel: "1" }),
      row({ storeCommand: "2", storeChannel: "2" }),
      row({ storeCommand: "", storeChannel: "" }),
    ];
    const usage = analyzeRtsChannelUsage(specs, rows);
    expect(getRtsRowChannelWarning(4, rows[4], specs, usage)).toContain(
      "Todos os canais já estão ocupados"
    );
  });

  it("avisa capacidade quando há mais estores do que canais", () => {
    const rows = Array.from({ length: 5 }, () =>
      row({ storeCommand: "", storeChannel: "" })
    );
    const usage = analyzeRtsChannelUsage(specs, rows);
    const msg = formatRtsCapacityWarningMessage(specs, usage);
    expect(msg).toContain("5 estores");
    expect(msg).toContain("4 canais");
    expect(msg).toContain("2 comandos");
  });

  it("sugere o próximo canal RTS livre", () => {
    const rows = [row({ storeCommand: "1", storeChannel: "1" })];
    const next = getNextAvailableRtsAssignment(specs, rows);
    expect(next).toEqual({ storeCommand: "1", storeChannel: "2" });
  });
});
