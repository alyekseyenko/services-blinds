import "server-only";

import { resolveAppDataFile } from "@/lib/server/scratchPath";
import { readJsonFile, writeJsonFileAtomic } from "@/lib/server/atomicJsonFile";
import { runE2ESuite, type RunE2ESuiteOptions } from "@/lib/observability/runE2ESuite";
import type {
  E2ESuiteDepth,
  E2ESuiteHistoryEntry,
  E2ESuiteReport,
  ObservabilityStatusPayload,
} from "@/lib/observability/e2eTypes";

const HISTORY_FILE = resolveAppDataFile("observability_history.json");
const MAX_HISTORY = 100;
const MAX_COMPACT_HISTORY = 20;

interface HistoryFileShape {
  entries: E2ESuiteHistoryEntry[];
}

function toHistoryEntry(report: E2ESuiteReport): E2ESuiteHistoryEntry {
  return {
    id: report.id,
    timestamp: report.timestamp,
    depth: report.depth,
    trigger: report.trigger,
    deploymentId: report.deploymentId,
    overallStatus: report.overallStatus,
    score: report.score,
    regressions: report.regressions,
    checks: report.checks,
    logs: report.logs,
  };
}

function loadHistory(): HistoryFileShape {
  return readJsonFile<HistoryFileShape>(HISTORY_FILE, { entries: [] });
}

export function appendObservabilityReport(report: E2ESuiteReport): void {
  const history = loadHistory();
  const entry = toHistoryEntry(report);
  const entries = [entry, ...history.entries].slice(0, MAX_HISTORY);

  const trimmed = entries.map((e, index) => {
    if (index === 0) return e;
    const { logs: _logs, ...rest } = e;
    return rest as E2ESuiteHistoryEntry;
  });

  writeJsonFileAtomic(HISTORY_FILE, { entries: trimmed });
}

export function getObservabilityStatus(): ObservabilityStatusPayload {
  const history = loadHistory();
  const lastRun = history.entries[0] ?? null;
  const compact = history.entries.slice(0, MAX_COMPACT_HISTORY).map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    trigger: e.trigger,
    overallStatus: e.overallStatus,
    score: e.score,
    regressions: e.regressions,
  }));
  return { lastRun, history: compact };
}

export function getPreviousChecksForRegression(): E2ESuiteHistoryEntry["checks"] | undefined {
  const history = loadHistory();
  return history.entries[0]?.checks;
}

export async function runAndPersistObservabilitySuite(
  depth: E2ESuiteDepth,
  options: RunE2ESuiteOptions
): Promise<E2ESuiteReport> {
  const previousChecks = getPreviousChecksForRegression();
  const report = await runE2ESuite(depth, {
    ...options,
    previousChecks,
  });
  appendObservabilityReport(report);
  return report;
}
