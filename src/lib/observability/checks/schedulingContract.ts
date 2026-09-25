import {
  CRM_TASK_CLIENT_AVAILABILITY,
  CRM_TASK_STATUS,
  isTaskPendingConfirmation,
  normalizeTaskStatus,
} from "@/lib/crm/contract";
import { defineE2ECheck } from "../checkHelpers";

export const schedulingContractCheck = defineE2ECheck({
  id: "scheduling-contract-por-agendar",
  name: "Scheduling CRM Contract",
  category: "APP",
  description: "POR_AGENDAR and client availability enums are consistent",
  tier: "safe",
  remediation: "Review src/lib/crm/contract.ts task status mappings.",
  async run() {
    const porAgendar = normalizeTaskStatus("POR_AGENDAR");
    const pending = isTaskPendingConfirmation("POR_AGENDAR");
    const awaiting =
      CRM_TASK_CLIENT_AVAILABILITY.AWAITING_RESPONSE === "CLIENTE_NAO_RESPONDEU";

    if (
      porAgendar !== CRM_TASK_STATUS.POR_AGENDAR ||
      !pending ||
      !awaiting
    ) {
      return {
        status: "FAIL",
        message: "Scheduling contract constants are inconsistent.",
        details: { porAgendar, pending, awaiting },
      };
    }

    return {
      status: "PASS",
      message:
        "POR_AGENDAR pipeline and CLIENTE_NAO_RESPONDEU availability are aligned.",
      details: {
        taskStatus: CRM_TASK_STATUS.POR_AGENDAR,
        availability: CRM_TASK_CLIENT_AVAILABILITY.AWAITING_RESPONSE,
      },
    };
  },
});
