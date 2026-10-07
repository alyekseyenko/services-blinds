import { isNeedsSchedulingStage, isTaskCompleted } from "@/lib/crm/contract";
import type { Opportunity } from "@/types/admin";

export function canAdminScheduleOpportunity(opp: Opportunity): boolean {
  return (
    isNeedsSchedulingStage(opp.stage) &&
    (!opp.hasScheduledTask || isTaskCompleted(opp.taskStatus))
  );
}
