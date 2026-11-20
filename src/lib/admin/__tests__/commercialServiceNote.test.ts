import { describe, expect, it } from "vitest";
import { buildAdminServiceCreationNote } from "@/lib/admin/commercialServiceNote";

describe("buildAdminServiceCreationNote", () => {
  it("inclui as notas internas e quem criou o serviço", () => {
    const note = buildAdminServiceCreationNote({
      operatorName: "Óscar",
      internalNotes: "Cão no jardim. Tocar à campainha.",
    });
    expect(note.title).toBe("Notas internas");
    expect(note.body).toContain("Cão no jardim");
    expect(note.body).toContain("Óscar");
  });

  it("sem texto fica só o registo de criação", () => {
    const note = buildAdminServiceCreationNote({ operatorName: "Óscar" });
    expect(note.title).toBe("Criado no painel");
    expect(note.body).toContain("Óscar");
  });
});