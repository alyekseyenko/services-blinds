import { describe, expect, it } from "vitest";
import { formatClientNifDisplay } from "../ptPtDisplay";

describe("formatClientNifDisplay", () => {
  it("formata 9 dígitos com espaços", () => {
    expect(formatClientNifDisplay("123456789")).toBe("123 456 789");
    expect(formatClientNifDisplay("123.456.789")).toBe("123 456 789");
  });

  it("devolve null se vazio", () => {
    expect(formatClientNifDisplay(null)).toBeNull();
    expect(formatClientNifDisplay("")).toBeNull();
  });
});