import { describe, expect, it } from "vitest";
import { combineStreamTranscript } from "@/lib/voice/streamTranscript";

describe("combineStreamTranscript", () => {
  it("junta finais e intermédio", () => {
    expect(combineStreamTranscript(["Olá", "mundo"], "como")).toBe("Olá mundo como");
  });

  it("ignora segmentos vazios", () => {
    expect(combineStreamTranscript(["  ", "texto"], "")).toBe("texto");
  });
});
