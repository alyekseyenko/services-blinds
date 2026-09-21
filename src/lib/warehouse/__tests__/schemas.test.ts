import { describe, it, expect } from "vitest";
import { WarehouseItemStatusSchema } from "../schemas";

describe("WarehouseItemStatusSchema", () => {
  it("accepts valid warehouse statuses", () => {
    expect(WarehouseItemStatusSchema.parse("PREPARADO")).toBe("PREPARADO");
    expect(WarehouseItemStatusSchema.parse("EM_PREPARACAO")).toBe("EM_PREPARACAO");
  });

  it("rejects invalid statuses", () => {
    expect(WarehouseItemStatusSchema.safeParse("INVALID").success).toBe(false);
  });
});
