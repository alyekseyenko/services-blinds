import { describe, expect, it } from "vitest";
import { buildTechnicianArrivedNotePt, buildTechnicianLeftSiteNotePt, formatTaskStatusPt } from "../taskStatusLabels";

describe("taskStatusLabels", () => {
  it("formata estados em pt-PT", () => {
    expect(formatTaskStatusPt("Completed")).toBe("Concluída");
    expect(formatTaskStatusPt("CANCELADO")).toBe("Cancelada");
    expect(formatTaskStatusPt("CONCLUIDO")).toBe("Concluída");
  });

  it("nota de chegada ao local", () => {
    const note = buildTechnicianArrivedNotePt("Hugo Lança");
    expect(note.title).toBe("Chegada ao local do cliente");
    expect(note.body).toBe("Hugo Lança chegou ao local do cliente.");
  });

  it("nota de saída do local em português", () => {
    const note = buildTechnicianLeftSiteNotePt("Hugo Lança", "CANCELADO");
    expect(note.title).toBe("Saída do local do cliente");
    expect(note.body).toContain("Hugo Lança");
    expect(note.body).toContain("Cancelada");
    expect(note.body).not.toContain("left the client");
    expect(note.body).not.toContain("Forma de pagamento");
  });

  it("inclui a forma de pagamento na nota de saída da reparação", () => {
    const note = buildTechnicianLeftSiteNotePt("Hugo Lança", "CONCLUIDO", "TPA no local");
    expect(note.body).toBe(
      "Hugo Lança saiu do local do cliente. Visita encerrada como: Concluída. Forma de pagamento: TPA no local."
    );
  });
});
