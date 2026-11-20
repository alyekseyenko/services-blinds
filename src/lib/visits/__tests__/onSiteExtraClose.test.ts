import { describe, expect, it } from "vitest";
import { CRM_STAGES, CRM_TASK_STATUS } from "@/lib/crm/contract";
import {
  onSiteExtraDisplaysAsCompleted,
  shouldKeepOnSiteExtraOnParentClose,
} from "@/lib/visits/onSiteExtraClose";

describe("onSiteExtraClose", () => {
  it("não mexe no serviço principal quando a visita é cancelada", () => {
    expect(shouldKeepOnSiteExtraOnParentClose(CRM_TASK_STATUS.CANCELADO, false)).toBe(false);
    expect(shouldKeepOnSiteExtraOnParentClose(CRM_TASK_STATUS.CONCLUIDO, true)).toBe(false);
  });

  it("o extra no local fica de fora do fecho cancelado ou incompleto", () => {
    expect(shouldKeepOnSiteExtraOnParentClose(CRM_TASK_STATUS.CANCELADO, true)).toBe(true);
    expect(shouldKeepOnSiteExtraOnParentClose(CRM_TASK_STATUS.INCOMPLETO, true)).toBe(true);
  });

  it("reparação já em pagamento não aparece como cancelada", () => {
    expect(
      onSiteExtraDisplaysAsCompleted({
        createdOnSite: true,
        deferred: false,
        stage: CRM_STAGES.PAGAMENTO_TOTAL,
        inheritedStatus: CRM_TASK_STATUS.CANCELADO,
      })
    ).toBe(true);
  });

  it("extra para agendar depois não é tratado como concluído", () => {
    expect(
      onSiteExtraDisplaysAsCompleted({
        createdOnSite: true,
        deferred: true,
        stage: CRM_STAGES.REPARACAO,
        inheritedStatus: CRM_TASK_STATUS.CANCELADO,
      })
    ).toBe(false);
  });
});