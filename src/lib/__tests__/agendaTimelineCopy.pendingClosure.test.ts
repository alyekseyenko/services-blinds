import { describe, expect, it } from "vitest";
import { timelineDetailForDiffEvent } from "@/lib/agendaTimelineCopy";
import { PENDING_CLOSURE_BELL_NOTE_PT } from "@/lib/visitPendingClosure";

describe("timelineDetailForDiffEvent — dia anterior", () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  it("prefixa cancelamento de dia anterior", () => {
    const detail = timelineDetailForDiffEvent("cancelada", {
      statusNote: "Cliente ausente",
      dueAt: yesterday.toISOString(),
    });
    expect(detail).toContain(PENDING_CLOSURE_BELL_NOTE_PT);
    expect(detail).toContain("Cliente ausente");
  });

  it("não prefixa cancelamento de hoje", () => {
    const detail = timelineDetailForDiffEvent("cancelada", {
      statusNote: "Cliente ausente",
      dueAt: new Date().toISOString(),
    });
    expect(detail).toBe("Cliente ausente");
  });
});
