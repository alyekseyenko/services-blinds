import { describe, expect, it } from "vitest";
import { formatSyncAgeLabel, isSyncDataStale } from "@/lib/formatSyncAge";

describe("formatSyncAgeLabel", () => {
  const now = Date.parse("2026-10-01T12:00:00.000Z");

  it("returns waiting label when never synced", () => {
    expect(formatSyncAgeLabel(null, now)).toBe("A aguardar sync");
  });

  it("returns Agora for sync within one minute", () => {
    expect(formatSyncAgeLabel(now - 30_000, now)).toBe("Agora");
  });

  it("returns minutes in pt-PT", () => {
    expect(formatSyncAgeLabel(now - 5 * 60_000, now)).toBe("Há 5 min");
  });

  it("returns hours in pt-PT", () => {
    expect(formatSyncAgeLabel(now - 3 * 60 * 60_000, now)).toBe("Há 3 h");
  });
});

describe("isSyncDataStale", () => {
  it("is not stale without a prior success timestamp", () => {
    expect(isSyncDataStale(null, 60_000)).toBe(false);
  });

  it("marks data stale after twice the refresh interval", () => {
    const now = Date.now();
    expect(isSyncDataStale(now - 121_000, 60_000, now)).toBe(true);
    expect(isSyncDataStale(now - 119_000, 60_000, now)).toBe(false);
  });
});
