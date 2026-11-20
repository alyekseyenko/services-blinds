import { describe, expect, it } from "vitest";
import {
  buildAdminEditNoteBody,
  normalizeBulkOpportunityIds,
} from "@/lib/measurements/adminSheetUseCases";

describe("adminSheetUseCases", () => {
  it("normalizeBulkOpportunityIds deduplica e limita a 150", () => {
    const ids = [" a ", "a", "b", ...Array.from({ length: 200 }, (_, i) => `id-${i}`)];
    const normalized = normalizeBulkOpportunityIds(ids);
    expect(normalized[0]).toBe("a");
    expect(normalized).toContain("b");
    expect(normalized.length).toBeLessThanOrEqual(150);
  });

  it("buildAdminEditNoteBody formata intro e trunca alterações", () => {
    const changes = Array.from({ length: 35 }, (_, i) => `alteração ${i + 1}`);
    const body = buildAdminEditNoteBody(
      "Óscar",
      3,
      changes,
      "Óscar criou a versão v{version}."
    );
    expect(body).toContain("versão v3");
    expect(body).toContain("… e mais 5 alterações.");
  });
});