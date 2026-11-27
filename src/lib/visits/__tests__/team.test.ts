import { describe, expect, it } from "vitest";
import {
  encodeAssistantIds,
  formatAssistantNames,
  normalizeVisitTeam,
  parseAssistantIds,
  resolveAppTeamFields,
} from "@/lib/visits/team";

describe("visit team encoding", () => {
  it("round-trips assistant ids", () => {
    expect(encodeAssistantIds(["a", "b"])).toBe("|a|b|");
    expect(parseAssistantIds("|a|b|")).toEqual(["a", "b"]);
  });

  it("deduplicates and keeps master out of assistants", () => {
    const team = normalizeVisitTeam({
      masterId: "m1",
      masterName: "Master",
      assistantIds: ["m1", "a1", "a1"],
      assistantNames: ["Dup", "André"],
    });
    expect(team.assistantIds).toEqual(["a1"]);
    expect(team.assistantNames[0]).toBe("André");
  });

  it("resolveAppTeamFields returns solo size 1", () => {
    expect(
      resolveAppTeamFields({ assigneeId: "m1", technicianName: "Master" }).teamSize
    ).toBe(1);
  });

  it("formats assistant names", () => {
    expect(formatAssistantNames(["André", "Gabriel"])).toBe("André, Gabriel");
    expect(formatAssistantNames([])).toBeNull();
  });
});