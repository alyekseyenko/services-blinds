# ADR 005: Gateway para escrita de stage no CRM

## Status
Aceite

## Contexto
A app altera estágios de oportunidade em fluxos operacionais (agendamento, visitas, armazém, serviços extra no terreno). Escritas dispersas dificultam revisão e testes.

## Decisão
- Toda mutação GraphQL que **só** altera `stage` usa `writeOpportunityStageToCrm` em `opportunities.ts`, chamada **apenas** de `pipelineTransitions.ts`.
- Actions e outros módulos usam `applyOpportunityStageTransition` ou helpers de visit-service em `pipelineTransitions.ts`.
- Criação/edição de oportunidades de serviço extra no local passa por `createVisitServiceOpportunity` / `updateVisitServiceOpportunityFields` (mesmo payload CRM que antes).
- Teste `pipelineImports.test.ts` impede novos atalhos.

## Consequências
- Funil comercial (proposta, pagamento, etc.) continua no Twenty + n8n; esta ADR não expande o que a app move.

## Fase B (concluída)
- Antes de cada escrita, `applyOpportunityStageTransition` lê o estágio atual no CRM (`fetchOpportunityStageFromCrm`).
- `assertAllowedTransition(from, to, reason)` valida transições por motivo operacional.
- Resultado: `{ status: "applied" | "unchanged" | "conflict", currentStage }`.
- Agendamento admin: UI desatualizada → `OpportunityStageConflictError` com mensagem pt-PT (estágio aplicado antes de criar a tarefa).
- Fecho de visita / cancelamento: tarefa persiste; conflito de estágio só regista aviso e não sobrescreve o CRM.
- Limitação aceite: sem compare-and-set no Twenty (janela curta entre leitura e escrita).
