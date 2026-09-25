import { describe, expect, it, vi, beforeEach } from "vitest";
import { runE2ESuite } from "../runE2ESuite";
import { E2E_CHECK_REGISTRY } from "../e2eRegistry";

vi.mock("@/lib/crm/client", () => ({
  crmFetch: vi.fn().mockResolvedValue({ __typename: "Query" }),
}));

vi.mock("@/lib/crm/circuitBreaker", () => ({
  crmCircuitBreaker: {
    getState: vi.fn().mockReturnValue("CLOSED"),
  },
}));

vi.mock("@/lib/outboxQueue", () => ({
  outboxQueue: {
    getStats: vi.fn().mockReturnValue({
      total: 0,
      pending: 0,
      processed: 5,
      failed: 0,
    }),
  },
}));

describe("runE2ESuite", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: "healthy" }),
        text: async () => "Workflow was started",
      })
    );
    process.env.NEXTAUTH_SECRET = "test-secret-with-16-chars-min";
    process.env.N8N_AGENDAMENTO_WEBHOOK_URL =
      "https://n8n.example.com/webhook/agendamento-tecnico-novo";
  });

  it("runs all registered checks in safe mode and skips live tier", async () => {
    const report = await runE2ESuite("safe");

    expect(report.depth).toBe("safe");
    expect(report.checks.length).toBe(E2E_CHECK_REGISTRY.length);
    expect(report.checks.some((c) => c.status === "SKIP")).toBe(true);
    expect(report.score.total).toBe(E2E_CHECK_REGISTRY.length);
    expect(["HEALTHY", "DEGRADED", "CRITICAL"]).toContain(report.overallStatus);
    expect(report.logs.length).toBeGreaterThan(0);
  });

  it("includes live checks when depth is full", async () => {
    const report = await runE2ESuite("full");

    const liveChecks = report.checks.filter((c) => c.tier === "live");
    expect(liveChecks.length).toBeGreaterThan(0);
    expect(liveChecks.every((c) => c.status !== "SKIP")).toBe(true);
  });

  it("marks overall status CRITICAL when a check fails", async () => {
    const { crmCircuitBreaker } = await import("@/lib/crm/circuitBreaker");
    vi.mocked(crmCircuitBreaker.getState).mockReturnValueOnce("OPEN");

    const report = await runE2ESuite("safe");
    expect(report.overallStatus).toBe("CRITICAL");
    expect(report.score.failed).toBeGreaterThan(0);
  });
});
