# Fase 3 — Verificação do servidor (só leitura)

Execute no VPS **após** rotação de credenciais e acesso por chave SSH.

## Contentores

- `docker ps` — `technician-app`, `technician-redis`, Twenty em execução
- `docker stats --no-stream` — CPU/memória
- `docker inspect technician-app --format '{{.State.RestartCount}}'`

## Rede e TLS

- nginx: certificado HTTPS válido, `proxy_read_timeout` ≥ 120s
- `client_max_body_size` adequado a relatórios
- Cabeçalhos `X-Real-IP` / `X-Forwarded-For` definidos pelo proxy (não confiar no cliente)

## Firewall

- UFW: apenas 22, 80, 443 públicos
- Redis (`6379`) e Twenty **não** expostos na internet

## Disco e logs

- `df -h`
- `docker system df`
- Volume `technician-app-data` com espaço livre

## Backups

- Postgres Twenty e volume da app: existência, frequência, último teste de restauro

## Twenty API

- Variáveis `API_RATE_LIMITING_*` no Twenty (40 utilizadores partilham `TWENTY_API_KEY`)

## `.env.local` da app

- Segredos ≥ 16 caracteres
- `PUBLIC_LINK_SECRET` ≠ `NEXTAUTH_SECRET`
- URLs n8n em HTTPS
- `LUXURY_E2E_ENABLED=false`
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` e `NEXT_DEPLOYMENT_ID` definidos

## Smoke

- `curl -sS http://127.0.0.1:3005/api/health` → `{"status":"healthy"}`
