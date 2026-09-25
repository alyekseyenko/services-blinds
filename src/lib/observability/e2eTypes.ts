import { z } from "zod";

export const E2ECheckCategorySchema = z.enum([
  "CRM",
  "N8N",
  "OUTBOX",
  "PORTALS",
  "SECURITY",
  "APP",
  "RESILIENCE",
]);

export type E2ECheckCategory = z.infer<typeof E2ECheckCategorySchema>;

export const E2ECheckStatusSchema = z.enum(["PASS", "WARN", "FAIL", "SKIP"]);

export type E2ECheckStatus = z.infer<typeof E2ECheckStatusSchema>;

export const E2ECheckTierSchema = z.enum(["safe", "live"]);

export type E2ECheckTier = z.infer<typeof E2ECheckTierSchema>;

export const E2ESuiteDepthSchema = z.enum(["safe", "full"]);

export type E2ESuiteDepth = z.infer<typeof E2ESuiteDepthSchema>;

export interface E2ECheckContext {
  depth: E2ESuiteDepth;
  log: (message: string) => void;
}

export interface E2ECheckResult {
  id: string;
  name: string;
  category: E2ECheckCategory;
  tier: E2ECheckTier;
  status: E2ECheckStatus;
  latencyMs: number;
  message: string;
  remediation?: string;
  details?: Record<string, unknown>;
}

export interface E2ECheckDefinition {
  id: string;
  name: string;
  category: E2ECheckCategory;
  description: string;
  tier: E2ECheckTier;
  run: (ctx: E2ECheckContext) => Promise<E2ECheckResult>;
}

export interface E2ESuiteReport {
  id: string;
  timestamp: string;
  depth: E2ESuiteDepth;
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
  checks: E2ECheckResult[];
  logs: string[];
}
