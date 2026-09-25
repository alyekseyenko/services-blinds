import {
  completeLuxuryJob,
  createLuxuryJob,
  failLuxuryJob,
  type LuxuryWorkflowJob,
  updateLuxuryJobProgress,
} from "./luxuryJobStore";
import { runLuxuryWorkflow } from "./runLuxuryWorkflow";
import type { LuxuryWorkflowActor } from "./luxuryTypes";

export function startLuxuryWorkflowJob(
  scenarioId: string,
  actor: LuxuryWorkflowActor
): LuxuryWorkflowJob {
  const job = createLuxuryJob(scenarioId);

  void runLuxuryWorkflow(scenarioId, actor, {
    onProgress: (message) => updateLuxuryJobProgress(job.id, message),
  })
    .then((report) => completeLuxuryJob(job.id, report))
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Luxury workflow failed";
      failLuxuryJob(job.id, message);
    });

  return job;
}
