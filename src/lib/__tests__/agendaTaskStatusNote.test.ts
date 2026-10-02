import { describe, expect, it } from "vitest";
import { extractTaskStatusNote } from "../agendaTaskStatusNote";

describe("extractTaskStatusNote", () => {
  it("usa a primeira linha sem markers de serviços", () => {
    const note = extractTaskStatusNote(
      "Cliente ausente\n\n<!-- [VISIT_SERVICES][] -->"
    );
    expect(note).toBe("Cliente ausente");
  });

  it("formata cancelamento pelo cliente", () => {
    const note = extractTaskStatusNote("CANCELAMENTO PELO CLIENTE: Mudou de planos");
    expect(note).toBe("Cancelada pelo cliente — Mudou de planos");
  });
});
