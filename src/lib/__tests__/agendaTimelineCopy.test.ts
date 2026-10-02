import { describe, expect, it } from "vitest";
import {
  concluidaTimelineDetail,
  emCursoTimelineDetail,
  isArrivalStatusNote,
  resolveTimelineEntryDetail,
} from "../agendaTimelineCopy";

describe("agendaTimelineCopy", () => {
  it("reconhece nota de chegada automática", () => {
    expect(isArrivalStatusNote("Técnico chegou ao local.")).toBe(true);
    expect(isArrivalStatusNote("Hugo Lança chegou ao local")).toBe(true);
    expect(isArrivalStatusNote("Cliente ausente")).toBe(false);
  });

  it("em curso descreve chegada ao local", () => {
    expect(emCursoTimelineDetail("Hugo Lança")).toBe("Hugo Lança chegou ao local.");
    expect(emCursoTimelineDetail()).toBe("Técnico chegou ao local.");
  });

  it("concluída ignora nota de chegada e descreve saída", () => {
    expect(
      concluidaTimelineDetail("Hugo Lança", "Técnico chegou ao local.")
    ).toBe("Hugo Lança terminou o serviço e saiu do local.");
    expect(concluidaTimelineDetail(undefined, "Cliente ausente")).toBe("Cliente ausente");
  });

  it("corrige detalhe legado no cartão", () => {
    expect(
      resolveTimelineEntryDetail(
        { kind: "concluida", detail: "Técnico chegou ao local." },
        "Hugo Lança"
      )
    ).toBe("Hugo Lança terminou o serviço e saiu do local.");
    expect(
      resolveTimelineEntryDetail({ kind: "em_curso", detail: undefined }, "Ana")
    ).toBe("Ana chegou ao local.");
  });
});
