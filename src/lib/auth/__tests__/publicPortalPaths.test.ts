import { describe, expect, it } from "vitest";
import { allowsAnonymousServerAction } from "@/lib/auth/publicPortalPaths";

describe("allowsAnonymousServerAction", () => {
  it("permite avaliação e cancelamento sem sessão", () => {
    expect(allowsAnonymousServerAction("/avaliacao/opp-123")).toBe(true);
    expect(allowsAnonymousServerAction("/cancelamento/task-456")).toBe(true);
  });

  it("bloqueia outras rotas", () => {
    expect(allowsAnonymousServerAction("/dashboard")).toBe(false);
    expect(allowsAnonymousServerAction("/admin")).toBe(false);
    expect(allowsAnonymousServerAction("/api/tasks")).toBe(false);
  });
});
