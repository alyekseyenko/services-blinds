# ADR 001: EM_CURSO não move o pipeline

## Status
Aceite

## Contexto
O técnico marca "Cheguei ao Local" ao iniciar a visita. O Twenty CRM expõe o estado `EM_CURSO` (com underscore). Movimentar automaticamente o estágio da oportunidade ao entrar em curso causava regressões no funil comercial.

## Decisão
- `EM_CURSO` é apenas estado operacional da tarefa.
- O estágio da oportunidade só avança em transições explícitas (agendamento, conclusão, cancelamento).
- Manutenção automática não cancela visitas em `EM_CURSO`.

## Consequências
- Medições e fecho de visita permanecem disponíveis com tarefa activa.
- Mapa e dashboard tratam `EM_CURSO` como visita em progresso, não como atraso por defeito.
