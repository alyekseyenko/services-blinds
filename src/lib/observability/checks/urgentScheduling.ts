import { CRM_STAGES, CRM_TASK_STATUS } from "@/lib/crm/contract";
import {
  buildSchedulePlan,
  isClientConfirmationSchedulingEnabled,
} from "@/lib/crm/scheduleVisit";
import { defineE2ECheck } from "../checkHelpers";

export const urgentSchedulingCheck = defineE2ECheck({
  id: "urgent-scheduling-bypass",
  name: "Direct Admin Scheduling (no n8n confirmation)",
  category: "APP",
  description:
    "Default admin scheduling confirms AGENDADO immediately without client notification",
  tier: "safe",
  covers: ["system:n8n-scheduling"],
  remediation:
    "Review buildSchedulePlan in src/lib/crm/scheduleVisit.ts and SCHEDULING_CLIENT_CONFIRMATION_ENABLED.",
  async run() {
    const direct = buildSchedulePlan({
      urgent: false,
      currentStage: CRM_STAGES.ENTRADA,
    });
    const urgent = buildSchedulePlan({
      urgent: true,
      currentStage: CRM_STAGES.ENTRADA,
    });

    if (
      isClientConfirmationSchedulingEnabled() ||
      direct.taskStatus !== CRM_TASK_STATUS.AGENDADO ||
      direct.notifyClient ||
      direct.nextStage !== CRM_STAGES.TIRAR_MEDIDAS ||
      urgent.taskStatus !== CRM_TASK_STATUS.AGENDADO ||
      urgent.notifyClient
    ) {
      return {
        status: "FAIL",
        message: "Direct scheduling plan does not match expected contract.",
        details: { direct, urgent, legacyEnabled: isClientConfirmationSchedulingEnabled() },
      };
    }

    return {
      status: "PASS",
      message:
        "Admin scheduling confirms AGENDADO immediately without client notification (n8n scheduling webhook skipped).",
      details: { direct },
    };
  },
});
