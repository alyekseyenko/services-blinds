# Piloto de produção (1 semana)

## Antes de começar

- Fases de segurança e fiabilidade em produção (`npm run validate` verde no deploy).
- Monitor externo em `https://<domínio>/api/health` (UptimeRobot ou Better Stack): alerta email/Telegram após 2 falhas; alerta de expiração SSL.
- Técnicos do piloto informados **por escrito** de que a app recolhe GPS durante o trabalho.

## Critérios diários (fim do dia)

Em `/admin/observabilidade` (admin):

1. **Fila de sync:** zero itens `failed` na telemetria dos técnicos do piloto.
2. **Outbox:** zero eventos `FAILED` no check do outbox.
3. **Medições:** tudo o que o técnico mediu aparece no admin e no armazém.
4. **Horas de visita:** chegada/saída coerentes (±5 min), incluindo pelo menos uma visita sem rede.
5. **Portais:** uma avaliação e um cancelamento de teste submetidos **sem login**.
6. **Monitor:** nenhum alerta sem explicação.
7. **Feedback:** 5 min com cada técnico — anotar bloqueios de UX.

## Decisão

- **5 dias úteis seguidos verdes** → abrir a toda a equipa.
- **Qualquer falha** → corrigir, repetir piloto 2–3 dias.
