import { describe, it, expect } from "vitest";
import { formatIncompleteReason, INCOMPLETE_REASONS } from "../taskReasons";

describe("taskReasons", () => {
  it("formats preset reason without extra text", () => {
    expect(formatIncompleteReason("cliente_ausente", "")).toBe("Cliente ausente");
  });

  it("formats outro with free text", () => {
    expect(formatIncompleteReason("outro", "Porta trancada")).toBe(
      "Outro (descrever abaixo): Porta trancada"
    );
  });

  it("appends optional details to preset", () => {
    expect(formatIncompleteReason("sem_acesso", "Escadas bloqueadas")).toBe(
      "Sem acesso ao local: Escadas bloqueadas"
    );
  });

  it("exposes all expected presets", () => {
    expect(INCOMPLETE_REASONS.map((r) => r.id)).toEqual([
      "cliente_ausente",
      "sem_acesso",
      "falta_material",
      "reagendar",
      "outro",
    ]);
  });
});
