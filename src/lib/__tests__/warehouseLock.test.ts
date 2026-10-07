import { describe, expect, it } from "vitest";
import {
  opportunityHasWarehouseLock,
  WAREHOUSE_LOCK_ERROR_MESSAGE,
} from "@/lib/measurements/warehouseLock";

describe("opportunityHasWarehouseLock", () => {
  it("bloqueia quando alguma linha está preparada", () => {
    expect(
      opportunityHasWarehouseLock([
        { is_prepared: false, warehouse_state: "EM_PREPARACAO" },
        { is_prepared: true, warehouse_state: "EM_PREPARACAO" },
      ])
    ).toBe(true);
  });

  it("bloqueia com estado PROBLEMAS", () => {
    expect(
      opportunityHasWarehouseLock([{ is_prepared: false, warehouse_state: "PROBLEMAS" }])
    ).toBe(true);
  });

  it("permite remedição quando só EM_PREPARACAO", () => {
    expect(
      opportunityHasWarehouseLock([{ is_prepared: false, warehouse_state: "EM_PREPARACAO" }])
    ).toBe(false);
  });

  it("expõe mensagem pt-PT para o técnico", () => {
    expect(WAREHOUSE_LOCK_ERROR_MESSAGE).toMatch(/armazém/i);
  });
});
