import { defineE2ECheck } from "../checkHelpers";

export const appHealthCheck = defineE2ECheck({
  id: "app-health-endpoint",
  name: "App Health Endpoint",
  category: "APP",
  description: "/api/health responds with a valid status payload",
  tier: "safe",
  remediation: "Inspect server logs and ensure the Next.js app is running.",
  async run() {
    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      "http://127.0.0.1:3000";
    const healthUrl = new URL("/api/health", base).toString();

    const response = await fetch(healthUrl, {
      signal: AbortSignal.timeout(8000),
    });
    const body = await response.json().catch(() => null);

    if (!response.ok || !body || typeof body.status !== "string") {
      return {
        status: "FAIL",
        message: `Health endpoint failed (HTTP ${response.status}).`,
        details: { healthUrl, body },
      };
    }

    const healthy = body.status === "healthy";
    return {
      status: healthy ? "PASS" : "WARN",
      message: `Health endpoint reports "${body.status}".`,
      details: { healthUrl, status: body.status },
    };
  },
});
