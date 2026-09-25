import { CRM_STAGES, CRM_TASK_STATUS } from "@/lib/crm/contract";
import { buildSchedulePlan } from "@/lib/crm/scheduleVisit";
import { defineE2ECheck } from "../checkHelpers";

export const urgentSchedulingCheck = defineE2ECheck({
  id: "urgent-scheduling-bypass",
  name: "Urgent Scheduling Bypass",
  category: "APP",
  description:
    "Urgent admin scheduling uses AGENDADO and skips client notification contract",
  tier: "safe",
  remediation: "Review buildSchedulePlan in src/lib/crm/scheduleVisit.ts.",
  async run() {
    const normal = buildSchedulePlan({
      urgent: false,
      currentStage: CRM_STAGES.ENTRADA,
    });
    const urgent = buildSchedulePlan({
      urgent: true,
      currentStage: CRM_STAGES.ENTRADA,
    });

    if (
      normal.taskStatus !== CRM_TASK_STATUS.POR_AGENDAR ||
      !normal.notifyClient ||
      urgent.taskStatus !== CRM_TASK_STATUS.AGENDADO ||
      urgent.notifyClient ||
      urgent.nextStage !== CRM_STAGES.TIRAR_MEDIDAS
    ) {
      return {
        status: "FAIL",
        message: "Urgent scheduling plan does not match expected bypass contract.",
        details: { normal, urgent },
      };
    }

    return {
      status: "PASS",
      message:
        "Urgent scheduling confirms AGENDADO immediately without client notification.",
      details: { urgent },
    };
  },
});
