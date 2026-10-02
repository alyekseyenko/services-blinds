# Complete E2E Observability Suite

A **Complete E2E Suite** é um registo extensível de verificações de integração em `/admin/observabilidade`. Corre automaticamente **60 s após cada deploy** e **de cada 15 minutos** (modo seguro), guarda histórico em disco e avisa o admin estrito no sininho quando há falhas ou regressões.

## Cobertura automática (CI)

O teste `src/lib/observability/__tests__/coverage.test.ts` (incluído em `npm run validate`) falha se:

- um sistema em `integrationManifest.ts` não tiver `system:<id>` em alguma verificação;
- um valor de `OUTBOX_EVENT_TYPES` não tiver `event:<tipo>` (verificações geradas em `checks/generated.ts`);
- uma rota `src/app/api/**/route.ts` não tiver `api:<rota>` nem constar de `observabilityExemptions.ts`;
- existirem IDs de verificação duplicados.

**Eventos outbox novos** ganham verificação de rota/HMAC automaticamente via `generated.ts` — não é preciso editar o registo manualmente para o encaminhamento n8n.

## When to add a check

Add a manual E2E check when you ship:

- A new **public portal** (HMAC token flow)
- A new **CRM mutation path** or status contract not covered by existing probes
- A new **external system** listed in `integrationManifest.ts`
- Any automation that can fail silently in production

## How to add a check

### 1. Create a check file

Add `src/lib/observability/checks/<featureName>.ts`:

```ts
import { defineE2ECheck } from "../checkHelpers";

export const myFeatureCheck = defineE2ECheck({
  id: "my-feature-slug",
  name: "Human-readable name",
  category: "N8N",
  description: "What this probe validates",
  tier: "safe",
  covers: ["system:my-system-id", "api:/api/my-route"],
  remediation: "How to fix when this fails",
  async run() {
    return { status: "PASS", message: "OK" };
  },
});
```

| Tier | Use when |
|------|----------|
| `safe` | Read-only probes, env validation, contract tests |
| `live` | POST to n8n, Nominatim, external HTTP |

Default timeout: **15 s** (`timeoutMs` optional).

### 2. Register in `e2eRegistry.ts`

Import and append to `E2E_CHECK_REGISTRY`.

### 3. Update manifest / exemptions if needed

- New **system** → add to `integrationManifest.ts` and set `covers`.
- New **API route** that should not be probed → add to `observabilityExemptions.ts` with reason.

Run `npm run validate`.

## Running the suite

| Method | Action |
|--------|--------|
| **Automático** | Boot +15 min scheduler (`observabilityScheduler.ts`) |
| **UI** | `/admin/observabilidade` → **Correr agora (seguro)** / **Completo (n8n real)** |
| **API** | `POST /api/observability` `{ "action": "RUN_E2E_SUITE", "depth": "safe" \| "full" }` |
| **API (legado)** | `POST /api/qa` `{ "mode": "E2E_FULL_SUITE", "depth": "safe" \| "full" }` |
| **Status** | `GET /api/observability/status` (admin estrito) |

A lista completa de verificações aparece na UI e é validada pelo teste de cobertura — não mantenha tabelas manuais neste ficheiro.

## Luxury Workflow E2E

Fluxo completo no CRM com **limpeza automática** no `finally` e fase outbox limitada aos eventos da execução.

```env
LUXURY_E2E_ENABLED=true
```

| UI | Secção **Avançado — Luxury E2E** |
| API | `POST /api/qa` `{ "mode": "LUXURY_WORKFLOW_E2E" }` |
| Limpeza de restos | `POST /api/observability` `{ "action": "CLEANUP_LUXURY_E2E" }` |

CRM fixtures: `src/lib/crm/e2eFixtures.ts`.
