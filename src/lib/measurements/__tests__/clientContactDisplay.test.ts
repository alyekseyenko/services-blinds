import { describe, expect, it } from "vitest";
import {
  measurementClientContactFields,
  measurementClientContactInline,
  measurementClientDetailRows,
} from "@/lib/measurements/clientContactDisplay";

describe("measurementClientContactDisplay", () => {
  it("lista campos preenchidos e formata linha compacta", () => {
    const sheet = {
      clientNif: " 123 ",
      clientPhone: "+351 912345678",
      clientEmail: "a@b.pt",
    };
    expect(measurementClientContactFields(sheet).map((f) => f.label)).toEqual([
      "NIF",
      "Telefone",
      "E-mail",
    ]);
    expect(measurementClientContactInline(sheet)).toContain("NIF: 123");
    expect(measurementClientContactInline(sheet)).toContain("E-mail: a@b.pt");
  });

  it("exporta linhas separadas com cliente e morada", () => {
    const rows = measurementClientDetailRows({
      clientName: "Ana",
      address: "Rua A",
      clientNif: "999",
    });
    expect(rows[0]).toEqual({ label: "Cliente", value: "Ana" });
    expect(rows[1]).toEqual({ label: "Morada", value: "Rua A" });
    expect(rows[2]?.label).toBe("NIF");
  });
});