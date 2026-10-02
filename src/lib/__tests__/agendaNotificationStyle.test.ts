import { describe, expect, it } from "vitest";
import {
  agendaKindToToastType,
  inferAgendaKindFromNotificationTitle,
  resolveAgendaNotificationToastType,
} from "../agendaNotificationStyle";

describe("agendaNotificationStyle", () => {
  it("mapeia tipos de agenda para toasts", () => {
    expect(agendaKindToToastType("concluida")).toBe("success");
    expect(agendaKindToToastType("cancelada")).toBe("error");
    expect(agendaKindToToastType("incompleta")).toBe("warning");
    expect(agendaKindToToastType("em_curso")).toBe("info");
    expect(agendaKindToToastType("nova")).toBe("info");
  });

  it("infere tipo a partir do título antigo", () => {
    expect(inferAgendaKindFromNotificationTitle("Visita cancelada")).toBe("cancelada");
    expect(resolveAgendaNotificationToastType(undefined, "Visita concluída")).toBe("success");
  });
});
