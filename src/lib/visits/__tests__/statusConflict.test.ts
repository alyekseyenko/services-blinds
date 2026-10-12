import { describe, expect, it } from "vitest";
import {
  OFFICE_CANCELLED_VISIT_MESSAGE,
  offlineStatusConflict,
} from "@/lib/visits/statusConflict";

describe("offlineStatusConflict", () => {
  it("bloqueia conclusão quando o CRM já cancelou", () => {
    expect(offlineStatusConflict("CANCELADO", "CONCLUIDO")).toBe(
      OFFICE_CANCELLED_VISIT_MESSAGE
    );
  });

  it("permite cancelamento quando o CRM já está cancelado", () => {
    expect(offlineStatusConflict("CANCELADO", "CANCELADO")).toBeNull();
  });

  it("permite atualização quando o CRM não está cancelado", () => {
    expect(offlineStatusConflict("EM_CURSO", "CONCLUIDO")).toBeNull();
  });
});
