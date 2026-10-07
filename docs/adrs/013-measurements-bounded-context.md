# ADR 013: Bounded context Medições (Postgres próprio)

## Status
Aceite

## Contexto
As medições estavam guardadas no Twenty (`notasImportantes` + linhas `Produto`), sem transação, sem versões e com idempotência frágil no texto das notas. Orçamentos e armazém precisam evoluir separadamente do CRM.

## Decisão
- **Fonte de verdade:** Postgres dedicado (`measurements-db`), módulo `src/lib/measurements/`.
- **Twenty:** por linha `Produto`, apenas `name` + campo de link `linkAppTecnicos` para `/medicoes/[sheetId]?linha=…`.
- **Armazém e métricas CEO de itens:** leem/escrevem `measurement_line` (estado de preparação), não campos de detalhe no CRM.
- **Versões:** cada gravação cria `version` imutável; remediação não apaga histórico.
- **Idempotência offline:** `UNIQUE (client_request_id)` em `measurement_sheet`.
- **Projeção CRM/n8n:** outbox SQL (`measurements_outbox`) processada por timer na app.

## Consequências
- `MEASUREMENTS_DATABASE_URL` obrigatório em produção.
- Migração: `runMeasurementsBackfill` + leitura dupla temporária no CRM.
- Orçamentos (tabelas `quote`) ficam para ADR futuro.
