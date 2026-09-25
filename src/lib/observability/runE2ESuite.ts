import { randomUUID } from "crypto";
import { E2E_CHECK_REGISTRY } from "./e2eRegistry";
import type { E2ECheckResult, E2ESuiteDepth, E2ESuiteReport } from "./e2eTypes";

function computeOverallStatus(
  checks: E2ECheckResult[]
): E2ESuiteReport["overallStatus"] {
  const failed = checks.filter((c) => c.status === "FAIL").length;
  const warned = checks.filter((c) => c.status === "WARN").length;

  if (failed > 0) return "CRITICAL";
  if (warned > 0) return "DEGRADED";
  return "HEALTHY";
}

function computeScore(checks: E2ECheckResult[]): E2ESuiteReport["score"] {
  const passed = checks.filter((c) => c.status === "PASS").length;
  const warned = checks.filter((c) => c.status === "WARN").length;
  const failed = checks.filter((c) => c.status === "FAIL").length;
  const skipped = checks.filter((c) => c.status === "SKIP").length;
  const total = checks.length;
  const scored = total - skipped;
  const percentage =
    scored === 0 ? 100 : Math.round((passed / scored) * 100);

  return { passed, warned, failed, skipped, total, percentage };
}

export async function runE2ESuite(
  depth: E2ESuiteDepth = "safe"
): Promise<E2ESuiteReport> {
  const startTime = Date.now();
  const logs: string[] = [];
  const log = (message: string) => {
    logs.push(`[${new Date().toISOString().split("T")[1].slice(0, 8)}] ${message}`);
  };

  log(
    `Starting Complete E2E Suite (depth: ${depth}, checks: ${E2E_CHECK_REGISTRY.length})...`
  );

  const checks: E2ECheckResult[] = [];

  for (const check of E2E_CHECK_REGISTRY) {
    if (check.tier === "live" && depth !== "full") {
      log(`[${check.id}] SKIP — live probe (run with depth=full to include)`);
      checks.push({
        id: check.id,
        name: check.name,
        category: check.category,
        tier: check.tier,
        status: "SKIP",
        latencyMs: 0,
        message: "Skipped in safe mode. Use full depth for live n8n probes.",
      });
      continue;
    }

    const result = await check.run({
      depth,
      log,
    });
    checks.push(result);
  }

  const totalDurationMs = Date.now() - startTime;
  const score = computeScore(checks);
  const overallStatus = computeOverallStatus(checks);

  log(
    `Suite finished in ${totalDurationMs}ms — ${score.passed} pass, ${score.warned} warn, ${score.failed} fail, ${score.skipped} skip (${score.percentage}%).`
  );

  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    depth,
    totalDurationMs,
    overallStatus,
    score,
    checks,
    logs,
  };
}
