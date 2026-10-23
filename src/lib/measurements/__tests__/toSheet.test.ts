import { describe, expect, it } from "vitest";
import { buildMeasurementSheetFromDb } from "@/lib/measurements/toSheet";
import { getMeasurementGroupDetailEntries } from "@/lib/measurements/sheetDisplay";
import type {
  MeasurementGroupRow,
  MeasurementLineRow,
  MeasurementSheetRow,
} from "@/lib/measurements/types";

const sheetRow: MeasurementSheetRow = {
  id: "sheet-1",
  opportunity_id: "opp-1",
  task_id: "task-1",
  version: 2,
  status: "submitted",
  client_request_id: null,
  technician_name: "Técnico",
  technician_user_id: null,
  client_name: "Cliente",
  nsi: "123",
  address: "Rua A",
  service_label: null,
  visit_at: null,
  created_at: new Date("2026-10-22T10:00:00Z"),
};

const groupRow: MeasurementGroupRow = {
  id: "g1",
  sheet_id: "sheet-1",
  sort_index: 0,
  product_type: "ESTORE_INTERIOR",
  material: null,
  other_material: null,
  model: "ROLO",
  ral: null,
  fabric: "Screen",
  reference: "REF-9",
  activation: "MOTOR_RTS",
  observations: "Cliente quer cinza",
  group_extra: {
    rtsCommandCount: "2",
    rtsCommandChannels: "V5,V3",
    rtsMotorBrand: "SOMFY",
    remeasureNeeded: "NAO",
  },
};

function line(id: string, sort: number, overrides: Partial<MeasurementLineRow>): MeasurementLineRow {
  return {
    id,
    group_id: "g1",
    sort_index: sort,
    qty: "1",
    width_mm: "1000",
    height_mm: "1200",
    division: null,
    fixation: null,
    controls: null,
    notes: null,
    price: null,
    is_prepared: false,
    warehouse_state: "EM_PREPARACAO",
    twenty_produto_id: null,
    line_extra: {},
    ...overrides,
  };
}

describe("buildMeasurementSheetFromDb", () => {
  it("leva para a ficha todos os detalhes do produto e de cada estore", () => {
    const lines = [
      line("l1", 0, {
        division: "Sala",
        line_extra: { storeCommand: "1", storeChannel: "4", divisionCode: "OUTROS", divisionCustom: "Sala" },
      }),
      line("l2", 1, { qty: "0", width_mm: "0", height_mm: "0" }),
      line("l3", 2, {
        price: "120",
        line_extra: { storeCommand: "2", storeChannel: "3" },
      }),
    ];
    const sheet = buildMeasurementSheetFromDb(sheetRow, [groupRow], new Map([["g1", lines]]));
    const group = sheet.groups[0];

    expect(sheet.remeasureLabel).toBe("Não");
    expect(getMeasurementGroupDetailEntries(group)).toEqual(
      expect.arrayContaining([
        { label: "Acionamento", value: expect.any(String) },
        { label: "Tecido", value: "Screen" },
        { label: "Referência", value: "REF-9" },
        { label: "Comandos RTS", value: "2 comandos" },
        { label: "Comando 1", value: "5 canais" },
        { label: "Comando 2", value: "3 canais" },
        { label: "Marca motor / comando", value: "Somfy" },
        { label: "Observações", value: "Cliente quer cinza" },
      ])
    );

    const byLine = Object.fromEntries(group.rows.map((r) => [r.lineId, r]));
    expect(byLine.l1.channelLabel).toBe("Comando 1 · Canal 4");
    expect(byLine.l1.division).toBe("Sala");
    expect(byLine.l3.channelLabel).toBe("Comando 2 · Canal 3");
    expect(byLine.l3.price).toBe("120");
    expect(byLine.l2).toBeUndefined();
  });
});
