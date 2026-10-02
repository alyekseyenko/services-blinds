# ADR 004: Características de arquitetura e limites do ecossistema

## Status
Aceite

## Contexto
O produto integra **Twenty CRM**, **app-tecnicos (Next.js)** e **n8n**. A equipa é pequena; o deploy é um monólito Docker com volume `APP_DATA_DIR` para outbox e estado em ficheiro.

## Características priorizadas (ordem)
1. **Disponibilidade em terreno** — offline-first (IndexedDB), UI utilizável sem rede.
2. **Resiliência do CRM** — circuit breaker, timeouts, mutações com `{ success, error? }`.
3. **Modificabilidade** — contract layer (`contract.ts`), ADRs, estágios centralizados.
4. **Testabilidade** — Vitest no domínio, registry E2E, `npm run validate`.
5. **Observabilidade** — painel SRE, outbox stats, checks n8n/CRM.

## Estilo arquitetural escolhido
- **Monólito modular** (camadas UI → actions → `lib/crm` / integrações).
- **Ecossistema service-based** (3 deploys: Twenty, app, n8n) — não microserviços na app.
- **Integração event-driven na borda** — outbox → webhooks n8n (não dual-write síncrono).
- **n8n como “plugin host”** de automações — sem Microkernel na PWA.

## Donos de capacidade
| Sistema | Dono de |
|---------|---------|
| Twenty CRM | Dados, funil comercial, proposta/pagamento/encomenda |
| app-tecnicos | Agendamento operacional, terreno, armazém, CEO read models, portais HMAC |
| n8n | Email, WhatsApp, PDF, Drive, campanhas |

## Limitações aceites
- **Uma instância** da app: outbox em ficheiro, circuit breaker e location store em memória do processo — escalar horizontalmente exige Redis/DB para outbox e estado partilhado.
- **Consistência eventual** com o CRM: a outbox não é transacional com o GraphQL do Twenty; idempotência e retries mitigam duplicados.
- Volume Docker `technician-app-data` montado em `/app/data` — obrigatório para não perder eventos pendentes no rebuild.

## Consequências
- Novos eventos n8n: schema em `src/lib/integrations/outboxEvents.ts` + registo em observabilidade.
- Mudanças de estágio da oportunidade pela app: `src/lib/crm/pipelineTransitions.ts`.
- Fitness functions: ESLint em `components/` e testes de contrato outbox.
