import { describe, expect, it } from "vitest";
import { buildTechnicianLeftSiteNotePt, formatTaskStatusPt } from "../taskStatusLabels";

describe("taskStatusLabels", () => {
  it("formata estados em pt-PT", () => {
    expect(formatTaskStatusPt("Completed")).toBe("Concluída");
    expect(formatTaskStatusPt("CANCELADO")).toBe("Cancelada");
    expect(formatTaskStatusPt("CONCLUIDO")).toBe("Concluída");
  });

  it("nota de saída do local em português", () => {
    const note = buildTechnicianLeftSiteNotePt("Hugo Lança", "CANCELADO");
    expect(note.title).toBe("Saída do local do cliente");
    expect(note.body).toContain("Hugo Lança");
    expect(note.body).toContain("Cancelada");
    expect(note.body).not.toContain("left the client");
  });
});
