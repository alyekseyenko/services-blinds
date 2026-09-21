# ADR 002: Fila offline com IndexedDB

## Status
Aceite

## Contexto
Técnicos trabalham em campo com conectividade instável. Mutations ao CRM não podem bloquear a UI nem perder dados.

## Decisão
- Fila persistente em IndexedDB (`useSyncQueue`) com retry, jitter e telemetria.
- Server Actions devolvem `{ success, error }` — a UI mostra estado pendente/falhado.
- Sync telemetry reportada a `/api/sync-telemetry` para observabilidade admin.

## Consequências
- Operações podem ser aplicadas ao CRM com atraso; o técnico vê confiança no estado local.
- Conflitos são resolvidos por regras de domínio no worker de sync, não por rollback silencioso.
