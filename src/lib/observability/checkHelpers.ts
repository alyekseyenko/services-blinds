import type {
  E2ECheckCategory,
  E2ECheckContext,
  E2ECheckDefinition,
  E2ECheckResult,
  E2ECheckStatus,
  E2ECheckTier,
} from "./e2eTypes";

interface BuildCheckInput {
  id: string;
  name: string;
  category: E2ECheckCategory;
  description: string;
  tier: E2ECheckTier;
  remediation?: string;
  run: (ctx: E2ECheckContext) => Promise<{
    status: E2ECheckStatus;
    message: string;
    details?: Record<string, unknown>;
    remediation?: string;
  }>;
}

export function defineE2ECheck(input: BuildCheckInput): E2ECheckDefinition {
  return {
    id: input.id,
    name: input.name,
    category: input.category,
    description: input.description,
    tier: input.tier,
    async run(ctx: E2ECheckContext): Promise<E2ECheckResult> {
      const start = Date.now();
      ctx.log(`[${input.id}] ${input.description}`);
      try {
        const outcome = await input.run(ctx);
        const latencyMs = Date.now() - start;
        ctx.log(
          `[${input.id}] ${outcome.status} (${latencyMs}ms) — ${outcome.message}`
        );
        return {
          id: input.id,
          name: input.name,
          category: input.category,
          tier: input.tier,
          status: outcome.status,
          latencyMs,
          message: outcome.message,
          remediation: outcome.remediation ?? input.remediation,
          details: outcome.details,
        };
      } catch (error: unknown) {
        const latencyMs = Date.now() - start;
        const message =
          error instanceof Error ? error.message : "Unknown check failure";
        ctx.log(`[${input.id}] FAIL (${latencyMs}ms) — ${message}`);
        return {
          id: input.id,
          name: input.name,
          category: input.category,
          tier: input.tier,
          status: "FAIL",
          latencyMs,
          message,
          remediation: input.remediation,
        };
      }
    },
  };
}

export function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

export function resolveSchedulingWebhookUrl(): string {
  return (
    process.env.N8N_AGENDAMENTO_WEBHOOK_URL ||
    process.env.N8N_WEBHOOK_URL ||
    ""
  );
}

export function resolveN8nFormConfirmUrl(): string | null {
  if (process.env.N8N_FORM_CONFIRM_URL) {
    return process.env.N8N_FORM_CONFIRM_URL;
  }
  const scheduling = resolveSchedulingWebhookUrl();
  if (!scheduling) return null;
  try {
    return `${new URL(scheduling).origin}/form/confirmar-visita-tecnica`;
  } catch {
    return null;
  }
}
