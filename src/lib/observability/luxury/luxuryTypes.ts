import { z } from "zod";

export const LuxuryWorkflowStatusSchema = z.enum([
  "PASS",
  "WARN",
  "FAIL",
  "SKIP",
]);

export type LuxuryWorkflowStatus = z.infer<typeof LuxuryWorkflowStatusSchema>;

export interface LuxuryWorkflowActor {
  userId: string;
  userName: string;
  email?: string;
}

export interface LuxuryServiceArtifact {
  key: string;
  workflow: "measurement" | "repair" | "maintenance" | "installation" | "unscheduled";
  opportunityId: string;
  nsi: number;
  stage: string;
  city: string;
  taskId?: string;
}

export interface LuxuryWorkflowArtifacts {
  runId: string;
  personId?: string;
  clientEmail?: string;
  clientName?: string;
  technicianId?: string;
  technicianName?: string;
  services: LuxuryServiceArtifact[];
  n8nEventsTriggered: string[];
  outboxProcessedDelta?: number;
}

export interface LuxuryWorkflowContext {
  actor: LuxuryWorkflowActor;
  log: (message: string) => void;
  artifacts: LuxuryWorkflowArtifacts;
}

export interface LuxuryWorkflowPhaseResult {
  id: string;
  name: string;
  category: "CRM" | "N8N" | "PORTALS" | "TECHNICIAN" | "OUTBOX";
  status: LuxuryWorkflowStatus;
  latencyMs: number;
  message: string;
  remediation?: string;
  details?: Record<string, unknown>;
}

export interface LuxuryWorkflowScenario {
  id: string;
  name: string;
  description: string;
  n8nEventsCovered: string[];
  run: (ctx: LuxuryWorkflowContext) => Promise<LuxuryWorkflowPhaseResult[]>;
}

export interface LuxuryWorkflowReport {
  id: string;
  timestamp: string;
  scenarioId: string;
  scenarioName: string;
  totalDurationMs: number;
  overallStatus: "HEALTHY" | "DEGRADED" | "CRITICAL";
  score: {
    passed: number;
    warned: number;
    failed: number;
    skipped: number;
    total: number;
    percentage: number;
  };
  n8nEventsCovered: string[];
  n8nEventsTriggered: string[];
  phases: LuxuryWorkflowPhaseResult[];
  artifacts: LuxuryWorkflowArtifacts;
  logs: string[];
}
