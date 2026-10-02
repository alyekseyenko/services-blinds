import { describe, expect, it } from "vitest";
import { toUserMessage } from "../userMessages";

describe("toUserMessage", () => {
  it("preserves friendly Portuguese messages", () => {
    expect(toUserMessage(new Error("Conflito de agenda: X"))).toContain("Conflito");
  });

  it("maps assignment errors", () => {
    expect(toUserMessage("Não está atribuído a esta visita")).toContain("atribuído");
  });

  it("maps network errors", () => {
    expect(toUserMessage(new Error("Failed to fetch"))).toContain("ligação");
  });

  it("maps circuit breaker", () => {
    expect(toUserMessage("Circuit breaker OPEN")).toContain("indisponível");
  });

  it("uses fallback for empty", () => {
    expect(toUserMessage(null, "Erro custom")).toBe("Erro custom");
  });

  it("maps GraphQL UUID errors", () => {
    expect(toUserMessage("GraphQL Error: Invalid UUID")).toContain("inválidos");
  });

  it("maps stale server action after deploy", () => {
    expect(
      toUserMessage(
        'Server Action "abc" was not found on the server. Read more: https://nextjs.org/docs/messages/failed-to-find-server-action'
      )
    ).toContain("versão nova");
  });
});
