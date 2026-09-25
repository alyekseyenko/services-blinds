import { crmCircuitBreaker } from "@/lib/crm/circuitBreaker";
import { defineE2ECheck } from "../checkHelpers";

export const circuitBreakerCheck = defineE2ECheck({
  id: "crm-circuit-breaker",
  name: "CRM Circuit Breaker",
  category: "RESILIENCE",
  description: "Circuit breaker must be CLOSED for CRM mutations",
  tier: "safe",
  remediation:
    "Use Reset Circuit Breaker on this page or fix the underlying CRM outage.",
  async run() {
    const state = crmCircuitBreaker.getState();
    if (state === "CLOSED") {
      return {
        status: "PASS",
        message: `Circuit breaker is ${state}.`,
        details: { state },
      };
    }
    if (state === "HALF_OPEN") {
      return {
        status: "WARN",
        message: `Circuit breaker is ${state} — recovering from recent failures.`,
        details: { state },
      };
    }
    return {
      status: "FAIL",
      message: `Circuit breaker is ${state} — CRM mutations are blocked.`,
      details: { state },
    };
  },
});
