import { describe, expect, it } from "vitest";
import {
  resolveWorkspaceMemberId,
  technicianIdMatchesSession,
} from "@/lib/auth/session";

describe("resolveWorkspaceMemberId", () => {
  it("prefere id de membro de workspace sobre userId Twenty", () => {
    expect(
      resolveWorkspaceMemberId({
        id: "member-uuid",
        userId: "user-uuid",
      })
    ).toBe("member-uuid");
  });
});

describe("technicianIdMatchesSession", () => {
  const session = { id: "member-uuid", userId: "user-uuid" };

  it("aceita o id de membro", () => {
    expect(technicianIdMatchesSession("member-uuid", session)).toBe(true);
  });

  it("aceita o userId Twenty legado no cliente", () => {
    expect(technicianIdMatchesSession("user-uuid", session)).toBe(true);
  });

  it("rejeita outro técnico", () => {
    expect(technicianIdMatchesSession("other-uuid", session)).toBe(false);
  });
});
