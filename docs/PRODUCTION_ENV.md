# Production environment (not in Git)

Keep real domains, branding, and secrets **only** on the VPS in `.env.local`.
The Git repository uses generic placeholders so nothing sensitive is published.

## Container names (Docker)

Production uses: `technician-app`, `technician-redis`, `technician-nginx`.

Deploy scripts automatically stop/remove legacy containers before starting the new stack.
Expect ~30 seconds downtime during the first migration deploy.

## Required on the server

Copy from `.env.example` and set your real values:

```env
# CRM
TWENTY_API_URL=...
TWENTY_API_KEY=...
TWENTY_AUTH_ORIGIN=https://crm.your-real-domain.com

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://technicians.your-real-domain.com
NEXT_PUBLIC_APP_URL=https://technicians.your-real-domain.com

# Branding (shown in UI, PWA, emails)
NEXT_PUBLIC_APP_NAME=Your App Name
NEXT_PUBLIC_APP_SHORT_NAME=Your Short Name
NEXT_PUBLIC_COMPANY_WEBSITE=https://your-company.com
NEXT_PUBLIC_COMPANY_LABEL=Your Company Name
NEXT_PUBLIC_LOGIN_EMAIL_PLACEHOLDER=user@yourcompany.com
NEXT_PUBLIC_HQ_LABEL=Your HQ Name
NEXT_PUBLIC_HQ_ADDRESS=Your full HQ address
NEXT_PUBLIC_HQ_LAT=39.41595
NEXT_PUBLIC_HQ_LNG=-9.13266

# Why HQ moved after anonymization?
# The public Git repo uses generic Lisbon defaults in src/lib/hq.ts.
# Production MUST set the variables above in .env.local and rebuild Docker
# (NEXT_PUBLIC_* are baked in at build time).
# After changing NEXT_PUBLIC_* vars, rebuild on the server:
# cd /root/app-tecnicos && docker compose up -d --build
```

## n8n webhooks (production)

The app container **cannot** reach n8n via `localhost:5678`. Set public HTTPS webhook URLs in `.env.local`:

```env
# Required for full automation coverage
N8N_WEBHOOK_URL=https://n8n.your-real-domain.com/webhook/your-general-workflow
N8N_AGENDAMENTO_WEBHOOK_URL=https://n8n.your-real-domain.com/webhook/your-scheduling-workflow

# Recommended
N8N_WEBHOOK_URL_REPORTS=https://n8n.your-real-domain.com/webhook/your-reports-workflow
N8N_WEBHOOK_URL_PUSH=https://n8n.your-real-domain.com/webhook/your-push-workflow

# Optional — client visit confirmation form
N8N_FORM_CONFIRM_URL=https://n8n.your-real-domain.com/form/confirm-technical-visit
```

| Variable | If missing in production |
|----------|--------------------------|
| `N8N_AGENDAMENTO_WEBHOOK_URL` | Scheduling notifications fail (falls back to general URL, then localhost) |
| `N8N_WEBHOOK_URL` | Login, task status, measurement reports stuck in outbox |
| `N8N_WEBHOOK_URL_REPORTS` | Photo / Drive reports not sent |
| `N8N_WEBHOOK_URL_PUSH` | Push opt-in not registered in n8n |

After updating n8n env vars:

```bash
cd /root/app-tecnicos
docker compose up -d --build
```

Then open `/admin/observabilidade` → reprocess failed outbox events, or run **Complete E2E Suite** (depth `full`).

Full catalog: [N8N_SETUP.md](../N8N_SETUP.md).

## Deploy on the server

After editing `.env.local` on the VPS:

```bash
cd /root/app-tecnicos
docker compose up -d --build
curl -sS http://127.0.0.1:3005/api/health
```

After changing branding env vars (`NEXT_PUBLIC_*`), rebuild the Docker image on the server.

Local one-shot deploy (from repo root, password only on your machine):

```bash
python .cursor-deploy-ssh.py '<ssh-password>'
```

Production uses **host nginx** → app must listen on **127.0.0.1:3005** only (`docker-compose.yml`). The optional `technician-nginx` container is behind profile `with-docker-nginx` and is not started by default.

## VPS hardening (host)

### Bind app port (in Git `docker-compose.yml`)

```yaml
ports:
  - "127.0.0.1:3005:3000"
```

Host nginx should proxy to `http://127.0.0.1:3005` (not `0.0.0.0:3005`).

### UFW

```bash
bash scripts/vps-ufw-hardening.sh
```

Keep SSH (22), HTTP (80), HTTPS (443). Twenty CRM should bind **localhost only**:

```bash
bash scripts/vps-twenty-bind-localhost.sh
```

Host nginx must keep `proxy_pass http://127.0.0.1:3000` for the CRM vhost. After bind, `ss` should show `127.0.0.1:3000`, not `0.0.0.0:3000`.

### Nginx logs (7 days)

```bash
cp scripts/nginx-logrotate-7days.snippet /etc/logrotate.d/nginx
# One-time cleanup if logs grew huge (example):
du -sh /var/log/nginx
find /var/log/nginx -type f -name '*.gz' -mtime +7 -delete
truncate -s 0 /var/log/nginx/access.log /var/log/nginx/error.log 2>/dev/null || true
logrotate -f /etc/logrotate.d/nginx
du -sh /var/log/nginx
```

### Secret rotation checklist (coordinate with the team)

Do in this order; **everyone must log out and log in** after auth/CRM key changes.

1. **App auth (automated on VPS):** `bash scripts/vps-rotate-app-secrets.sh` — copies the old `NEXTAUTH_SECRET` into `PUBLIC_LINK_SECRET` if missing, then rotates `NEXTAUTH_SECRET`. **Notify the team to log in again.**
2. **Twenty API key (manual in CRM UI):** Settings → APIs → create key → `bash scripts/vps-update-twenty-api-key.sh 'eyJ…'` (updates app + n8n). Revoke the old key in Twenty when smoke tests pass.
3. **Portal-only rotation:** change `PUBLIC_LINK_SECRET` alone → outstanding `/avaliacao` and `/cancelamento` links expire.
4. Google Maps / VAPID / n8n secrets as needed → rebuild when `NEXT_PUBLIC_*` changes.
5. Re-run `/admin/observabilidade` E2E (depth `full`) and `curl -sS http://127.0.0.1:3005/api/health`.

### Redis on `twenty_default`

App must use `REDIS_URL=redis://technician-cache:6379` (service `technician-cache`, container `technician-redis`). Never use hostname `redis` in this app — that name points at Twenty’s Redis on the shared network.

After deploy, verify:

```bash
docker exec technician-app printenv REDIS_URL
docker exec technician-app getent hosts technician-cache
curl -sS http://127.0.0.1:3005/api/health
```
