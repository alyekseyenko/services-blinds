import { describe, expect, it } from "vitest";
import { formatNoteBodyForDisplay, formatNoteTitleForDisplay } from "@/lib/noteDisplay";

describe("noteDisplay", () => {
  it("traduz notas antigas de saída do local em inglês", () => {
    expect(formatNoteTitleForDisplay("Technician left site")).toBe("Saída do local do cliente");
    expect(
      formatNoteBodyForDisplay(
        "Hugo Lança left the client site. Visit closed as: Completed."
      )
    ).toBe("Hugo Lança saiu do local do cliente. Visita encerrada como: Concluída.");
  });

  it("remove marcador NOTE_SYNC do corpo", () => {
    expect(
      formatNoteBodyForDisplay("<!-- [NOTE_SYNC]abc -->\nTexto útil.")
    ).toBe("Texto útil.");
  });
});
