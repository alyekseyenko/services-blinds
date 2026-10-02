import { describe, expect, it } from "vitest";
import {
  resolveAxisLock,
  swipeMeetsVelocityOrDistance,
} from "@/lib/gestures/touchGuards";

describe("resolveAxisLock", () => {
  it("locks horizontal when dx dominates after threshold", () => {
    expect(resolveAxisLock(20, 2, "none")).toBe("horizontal");
  });

  it("stays none for tiny movement", () => {
    expect(resolveAxisLock(4, 3, "none")).toBe("none");
  });
});

describe("swipeMeetsVelocityOrDistance", () => {
  it("accepts long travel", () => {
    expect(swipeMeetsVelocityOrDistance(72, 400, 56)).toBe(true);
  });

  it("accepts fast flick", () => {
    expect(swipeMeetsVelocityOrDistance(30, 50, 56, 0.35)).toBe(true);
  });

  it("rejects slow short drag", () => {
    expect(swipeMeetsVelocityOrDistance(20, 500, 56)).toBe(false);
  });
});
