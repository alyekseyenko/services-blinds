# Complete E2E Observability Suite

The **Complete E2E Suite** is an extensible registry of real integration checks exposed on `/admin/observabilidade`. It helps debug production failures across CRM, n8n, outbox, public portals, and app health.

## When to add a check

Add a new E2E check whenever you ship:

- A new **n8n workflow** or webhook event type
- A new **public portal** (HMAC token flow)
- A new **CRM mutation path** or status contract
- A new **outbox event** or external integration
- Any automation that can fail silently in production

## How to add a check (3 steps)

### 1. Create a check file

Add `src/lib/observability/checks/<featureName>.ts`:

```ts
import { defineE2ECheck } from "../checkHelpers";

export const myFeatureCheck = defineE2ECheck({
  id: "my-feature-slug",           // unique, kebab-case
  name: "Human-readable name",
  category: "N8N",                 // CRM | N8N | OUTBOX | PORTALS | SECURITY | APP | RESILIENCE
  description: "What this probe validates",
  tier: "safe",                    // "safe" = no side effects | "live" = hits external systems
  remediation: "How to fix when this fails",
  async run() {
    // return { status: "PASS" | "WARN" | "FAIL" | "SKIP", message, details? }
    return { status: "PASS", message: "OK" };
  },
});
```

**Tier guidelines:**

| Tier | Use when |
|------|----------|
| `safe` | Read-only probes, env validation, contract tests, token round-trips |
| `live` | POST to n8n webhooks, fetch form URLs, external HTTP calls |

Live checks run only when depth is `full` (button **Full (live n8n)** on the observability page).

### 2. Register in the central registry

Import and append to `E2E_CHECK_REGISTRY` in `src/lib/observability/e2eRegistry.ts`:

```ts
import { myFeatureCheck } from "./checks/myFeature";

export const E2E_CHECK_REGISTRY: E2ECheckDefinition[] = [
  // ...existing checks
  myFeatureCheck,
];
```

### 3. Add unit tests (recommended)

Add `src/lib/observability/__tests__/myFeature.test.ts` or extend `runE2ESuite.test.ts`.

Run `npm run validate` before merging.

## Running the suite

| Method | Command / action |
|--------|------------------|
| **UI** | `/admin/observabilidade` → **Run Complete E2E Suite** |
| **API** | `POST /api/qa` with `{ "mode": "E2E_FULL_SUITE", "depth": "safe" \| "full" }` |
| **Admin only** | Requires `role === "admin"` (strict admin) |

## Current checks

| ID | Category | Tier | What it tests |
|----|----------|------|---------------|
| `crm-graphql-connectivity` | CRM | safe | Twenty GraphQL read probe |
| `crm-circuit-breaker` | RESILIENCE | safe | Circuit breaker state |
| `outbox-queue-health` | OUTBOX | safe | Failed/pending outbox events |
| `scheduling-contract-por-agendar` | APP | safe | POR_AGENDAR contract alignment |
| `app-health-endpoint` | APP | safe | `/api/health` response |
| `public-cancel-token` | PORTALS | safe | Cancellation HMAC tokens |
| `public-evaluation-token` | PORTALS | safe | Evaluation HMAC tokens |
| `env-scheduling-webhook` | N8N | safe | `N8N_AGENDAMENTO_WEBHOOK_URL` |
| `n8n-webhook-routing` | N8N | safe | Event → webhook URL mapping |
| `n8n-scheduling-webhook-live` | N8N | live | POST probe to n8n webhook |
| `n8n-form-endpoint-live` | N8N | live | Client form URL reachability |

## Relationship to QA 360

- **QA 360** (`BENCHMARK_360`): holistic architecture benchmark (6 vectors, includes AI cache, geo).
- **Complete E2E Suite** (`E2E_FULL_SUITE`): integration-focused, extensible registry for automations.

Both are available on the observability page. Prefer E2E registry for new automation features.

---

## Luxury Workflow E2E (full business simulation)

The **Luxury Workflow** runs a real end-to-end business simulation in Twenty CRM and triggers all n8n outbox events. Use it to validate the complete integration after major releases.

### Enable on server

```env
LUXURY_E2E_ENABLED=true
# Optional — defaults to first Twenty "Técnicos" member
LUXURY_E2E_TECHNICIAN_ID=
LUXURY_E2E_TECHNICIAN_NAME=
```

### Run

| Method | Command / action |
|--------|------------------|
| **UI** | `/admin/observabilidade` → **Luxury Workflow E2E** |
| **API** | `POST /api/qa` with `{ "mode": "LUXURY_WORKFLOW_E2E", "scenarioId": "brazil-full-workflow" }` |

### Current scenario: `brazil-full-workflow`

1. Create one random client
2. Create 5 opportunities in Brazil (São Paulo, Rio, Salvador, Brasília, Curitiba)
3. Workflow variants: measurement, repair, maintenance, installation, + unscheduled gap
4. Schedule 4 visits → `appointment_scheduled`
5. Client confirms visits (CRM `AGENDADO`)
6. Client cancels repair → `appointment_cancelled_by_client`
7. Technician measurements + fake products → `MEASUREMENTS_REPORT_GENERATION`
8. Complete measurement + maintenance → `service_completed`, `SERVICE_REPORT_SUBMITTED`
9. Incomplete installation → `technician_report`, `SERVICE_REPORT_SUBMITTED`
10. Client evaluation + cannot-cancel guard
11. Outbox flush + n8n coverage summary

All CRM records are prefixed `[E2E Luxury]` for easy cleanup.

### Add a new scenario

1. Create `src/lib/observability/luxury/scenarios/yourScenario.ts`
2. Export a `LuxuryWorkflowScenario` with phased `run()` function
3. Register in `src/lib/observability/luxury/luxuryRegistry.ts`
