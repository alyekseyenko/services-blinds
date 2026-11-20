# ADR 013: Bounded context Medições (Postgres próprio)

## Status
Aceite

## Contexto
As medições estavam guardadas no Twenty (`notasImportantes` + linhas `Produto`), sem transação, sem versões e com idempotência frágil no texto das notas. Orçamentos e armazém precisam evoluir separadamente do CRM.

## Decisão
- **Fonte de verdade:** Postgres dedicado (`measurements-db`), módulo `src/lib/measurements/`.
- **Twenty:** por linha `Produto`, apenas `name` + campo de link `linkAppTecnicos` para `/medicoes/[sheetId]?linha=…`.
- **Armazém e métricas CEO de itens:** leem/escrevem `measurement_line` (estado de preparação), não campos de detalhe no CRM.
- **Versões:** uma `version` por **visita técnica** (`task_id`); vários «Guardar medidas» na mesma visita **atualizam** essa ficha (o número vN não sobe). Nova visita no mesmo serviço (ex. retificação) ou **edição de admin** cria nova versão. Versões antigas não se fundem.
- **Idempotência offline:** `UNIQUE (client_request_id)` em `measurement_sheet`.
- **Projeção CRM/n8n:** outbox SQL (`measurements_outbox`) processada por timer na app.

## Consequências
- `MEASUREMENTS_DATABASE_URL` obrigatório em produção.
- Migração: `runMeasurementsBackfill` + leitura dupla temporária no CRM.
- Orçamentos (tabelas `quote`) ficam para ADR futuro.
