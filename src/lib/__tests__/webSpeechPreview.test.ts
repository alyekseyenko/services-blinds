import { describe, expect, it } from "vitest";
import { mergeSpeechPreviewSegments } from "@/lib/voice/webSpeechPreview";

describe("mergeSpeechPreviewSegments", () => {
  it("combina finais e intermédio", () => {
    expect(mergeSpeechPreviewSegments(["Olá"], "mundo")).toBe("Olá mundo");
  });
});
