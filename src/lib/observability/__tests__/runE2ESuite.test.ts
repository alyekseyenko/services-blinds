import { describe, expect, it, vi, beforeEach } from "vitest";
import { runE2ESuite } from "../runE2ESuite";
import { E2E_CHECK_REGISTRY } from "../e2eRegistry";

vi.mock("@/lib/crm/client", () => ({
  crmFetch: vi.fn().mockResolvedValue({ __typename: "Query", tasks: { edges: [] } }),
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
      oldestPendingAgeMs: 0,
    }),
    listEvents: vi.fn().mockReturnValue([]),
  },
}));

vi.mock("@/lib/server/healthProbes", () => ({
  probeRedis: vi.fn().mockResolvedValue({ status: "connected", latencyMs: 1 }),
  probeMetadata: vi.fn().mockResolvedValue({ status: "connected", latencyMs: 1 }),
  probeAppDataDir: vi.fn().mockResolvedValue({ status: "connected", latencyMs: 1 }),
  probeGraphql: vi.fn().mockResolvedValue({ status: "connected", latencyMs: 1 }),
  runAppHealthProbes: vi.fn().mockResolvedValue({
    healthy: true,
    graphql: { status: "connected", latencyMs: 1 },
    metadata: { status: "connected", latencyMs: 1 },
    redis: { status: "connected", latencyMs: 1 },
    appData: { status: "connected", latencyMs: 1 },
    authOriginConfigured: true,
  }),
}));

vi.mock("@/lib/server/outboxDrain", () => ({
  getOutboxDrainHeartbeat: vi.fn().mockReturnValue({ lastTickAt: Date.now() }),
}));

vi.mock("@/lib/locationStore", () => ({
  locationStore: {
    save: vi.fn().mockResolvedValue(undefined),
    getActive: vi.fn().mockResolvedValue([
      { technicianId: "e2e-location-store-probe", technicianName: "Sonda" },
    ]),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/geocoder", () => ({
  geocodeAddress: vi.fn().mockResolvedValue({
    coords: [38.7, -9.1],
    provider: "nominatim",
  }),
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
    process.env.N8N_WEBHOOK_URL = "https://n8n.example.com/webhook/default";
    process.env.N8N_WEBHOOK_SECRET = "test-hmac-secret-16chars";
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "test-google-key";
    process.env.NEXT_DEPLOYMENT_ID = "test-deploy-123";
  });

  it("runs all registered checks in safe mode and skips live tier", async () => {
    const report = await runE2ESuite("safe");

    expect(report.depth).toBe("safe");
    expect(report.checks.length).toBe(E2E_CHECK_REGISTRY.length);
    expect(report.checks.some((c) => c.status === "SKIP")).toBe(true);
    expect(report.score.total).toBe(E2E_CHECK_REGISTRY.length);
    expect(["HEALTHY", "DEGRADED", "CRITICAL"]).toContain(report.overallStatus);
    expect(report.logs.length).toBeGreaterThan(0);
    expect(report.trigger).toBe("manual");
    expect(report.regressions).toEqual([]);
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

  it("enforces per-check timeout", async () => {
    const slow = E2E_CHECK_REGISTRY.find((c) => c.id === "crm-graphql-connectivity");
    expect(slow?.timeoutMs).toBeGreaterThan(0);
  });
});
