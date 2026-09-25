import { randomUUID } from "crypto";
import type { LuxuryWorkflowReport } from "./luxuryTypes";

export type LuxuryJobStatus = "running" | "completed" | "failed";

export interface LuxuryWorkflowJob {
  id: string;
  scenarioId: string;
  status: LuxuryJobStatus;
  startedAt: string;
  finishedAt?: string;
  progress?: string;
  report?: LuxuryWorkflowReport;
  error?: string;
}

const jobs = new Map<string, LuxuryWorkflowJob>();
const MAX_JOB_AGE_MS = 2 * 60 * 60 * 1000;
const MAX_RUNNING_JOB_MS = 30 * 60 * 1000;

function pruneOldJobs(): void {
  const cutoff = Date.now() - MAX_JOB_AGE_MS;
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (job.status === "running") {
      const started = new Date(job.startedAt).getTime();
      if (now - started > MAX_RUNNING_JOB_MS) {
        failLuxuryJob(id, "Workflow excedeu o tempo máximo de execução.");
      }
      continue;
    }
    const finished = job.finishedAt ? new Date(job.finishedAt).getTime() : now;
    if (finished < cutoff) {
      jobs.delete(id);
    }
  }
}

export function createLuxuryJob(scenarioId: string): LuxuryWorkflowJob {
  pruneOldJobs();
  const job: LuxuryWorkflowJob = {
    id: randomUUID(),
    scenarioId,
    status: "running",
    startedAt: new Date().toISOString(),
    progress: "Queued…",
  };
  jobs.set(job.id, job);
  return job;
}

export function getLuxuryJob(jobId: string): LuxuryWorkflowJob | undefined {
  return jobs.get(jobId);
}

export function updateLuxuryJobProgress(jobId: string, progress: string): void {
  const job = jobs.get(jobId);
  if (!job || job.status !== "running") return;
  job.progress = progress;
}

export function completeLuxuryJob(jobId: string, report: LuxuryWorkflowReport): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = "completed";
  job.finishedAt = new Date().toISOString();
  job.report = report;
  job.progress = "Completed.";
}

export function failLuxuryJob(jobId: string, error: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = "failed";
  job.finishedAt = new Date().toISOString();
  job.error = error;
  job.progress = "Failed.";
}
