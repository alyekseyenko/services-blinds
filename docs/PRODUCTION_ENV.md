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
