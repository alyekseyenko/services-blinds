import { randomUUID } from "crypto";
import { getLuxuryScenario } from "./luxuryRegistry";
import { cleanupLuxuryArtifacts } from "@/lib/crm/e2eFixtures";
import { outboxQueue } from "@/lib/outboxQueue";
import { buildLuxuryRunId, isLuxuryE2EEnabled } from "./luxuryHelpers";
import type {
  LuxuryWorkflowActor,
  LuxuryWorkflowArtifacts,
  LuxuryWorkflowPhaseResult,
  LuxuryWorkflowReport,
} from "./luxuryTypes";

function computeOverallStatus(
  phases: LuxuryWorkflowPhaseResult[]
): LuxuryWorkflowReport["overallStatus"] {
  if (phases.some((p) => p.status === "FAIL")) return "CRITICAL";
  if (phases.some((p) => p.status === "WARN")) return "DEGRADED";
  return "HEALTHY";
}

function computeScore(phases: LuxuryWorkflowPhaseResult[]): LuxuryWorkflowReport["score"] {
  const passed = phases.filter((p) => p.status === "PASS").length;
  const warned = phases.filter((p) => p.status === "WARN").length;
  const failed = phases.filter((p) => p.status === "FAIL").length;
  const skipped = phases.filter((p) => p.status === "SKIP").length;
  const total = phases.length;
  const scored = total - skipped;
  const percentage = scored === 0 ? 100 : Math.round((passed / scored) * 100);

  return { passed, warned, failed, skipped, total, percentage };
}

export async function runLuxuryWorkflow(
  scenarioId: string = "brazil-full-workflow",
  actor: LuxuryWorkflowActor,
  options?: { onProgress?: (message: string) => void }
): Promise<LuxuryWorkflowReport> {
  if (!isLuxuryE2EEnabled()) {
    throw new Error(
      "Luxury E2E is disabled. Set LUXURY_E2E_ENABLED=true in server .env.local to run live workflow tests."
    );
  }

  const scenario = getLuxuryScenario(scenarioId);
  if (!scenario) {
    throw new Error(`Unknown luxury workflow scenario: ${scenarioId}`);
  }

  const startTime = Date.now();
  const logs: string[] = [];
  const log = (message: string) => {
    const line = `[${new Date().toISOString().split("T")[1].slice(0, 8)}] ${message}`;
    logs.push(line);
    options?.onProgress?.(message);
  };

  const runId = buildLuxuryRunId();
  log(`Starting luxury workflow "${scenario.name}" (runId: ${runId})...`);

  const outboxBaselineIds = new Set(outboxQueue.listEvents().map((e) => e.id));

  const artifacts: LuxuryWorkflowArtifacts = {
    runId,
    services: [],
    n8nEventsTriggered: [],
    outboxBaselineIds,
  };

  const ctx = {
    actor,
    log,
    artifacts,
  };

  let phases: LuxuryWorkflowPhaseResult[] = [];
  try {
    phases = await scenario.run(ctx);
  } finally {
    log("Cleanup: removing Luxury E2E CRM artifacts...");
    try {
      await cleanupLuxuryArtifacts({
        personId: ctx.artifacts.personId,
        services: ctx.artifacts.services.map((s) => ({
          opportunityId: s.opportunityId,
          taskId: s.taskId,
        })),
      });
      log("Cleanup finished.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`Cleanup failed: ${message}`);
    }
  }
  const totalDurationMs = Date.now() - startTime;
  const score = computeScore(phases);
  const overallStatus = computeOverallStatus(phases);

  log(
    `Luxury workflow finished in ${totalDurationMs}ms — ${score.passed} pass, ${score.warned} warn, ${score.failed} fail.`
  );

  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    totalDurationMs,
    overallStatus,
    score,
    n8nEventsCovered: scenario.n8nEventsCovered,
    n8nEventsTriggered: ctx.artifacts.n8nEventsTriggered,
    phases,
    artifacts: ctx.artifacts,
    logs,
  };
}
