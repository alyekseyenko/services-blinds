# ADR 003: Tokens HMAC nos portais públicos

## Status
Aceite

## Contexto
`/avaliacao` e `/cancelamento` eram acessíveis com UUIDs na URL (IDOR). Links de notificação misturavam `taskId` e `opportunityId`.

## Decisão
- Links assinados com HMAC-SHA256 (`PUBLIC_LINK_SECRET` ou fallback `NEXTAUTH_SECRET`).
- Payload: `purpose`, `opportunityId` ou `taskId`, `exp` (TTL configurável, default 30 dias).
- Mutations apenas via `src/actions/public-portal-actions.ts` com Zod e rate limit por IP+recurso.
- Cancelamento só com tarefa `AGENDADO`/`EM_CURSO`; avaliação bloqueada se já existir rating.

## Alternativas rejeitadas
- UUID nu na URL — vulnerável a enumeração/adivinhação.
- Tokens guardados no CRM — mais latência e limpeza operacional.

## Consequências
- Links antigos sem `?t=` deixam de funcionar (comportamento intencional).
- Notificações devem enviar `taskId` e `opportunityId` separados ao gerar URLs.
