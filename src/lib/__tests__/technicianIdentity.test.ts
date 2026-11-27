import { describe, expect, it } from "vitest";
import {
  canonicalTechnicianName,
  mergeCountsByCanonicalTechnicianName,
} from "@/lib/technicianIdentity";

describe("canonicalTechnicianName", () => {
  it("passa David Maneiro para David Monteiro", () => {
    expect(canonicalTechnicianName("David Maneiro")).toBe("David Monteiro");
    expect(canonicalTechnicianName("David Manteiro")).toBe("David Monteiro");
    expect(canonicalTechnicianName("david maneiro")).toBe("David Monteiro");
    expect(canonicalTechnicianName("David Monteiro")).toBe("David Monteiro");
    expect(canonicalTechnicianName("Hugo Lança")).toBe("Hugo Lança");
  });
});

describe("mergeCountsByCanonicalTechnicianName", () => {
  it("junta fichas antigas do Maneiro com as do Monteiro", () => {
    expect(
      mergeCountsByCanonicalTechnicianName([
        { name: "David Maneiro", count: 4 },
        { name: "David Monteiro", count: 2 },
        { name: "Hugo Lança", count: 3 },
      ])
    ).toEqual([
      { name: "David Monteiro", count: 6 },
      { name: "Hugo Lança", count: 3 },
    ]);
  });
});
