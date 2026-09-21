# Production environment (not in Git)

Keep real domains, branding, and secrets **only** on the VPS in `.env.local`.
The Git repository uses generic placeholders so nothing sensitive is published.

## Container names (Docker)

Production uses: `technician-app`, `technician-redis`, `technician-nginx`.

Deploy scripts automatically stop/remove legacy containers (`habitarmos-*`) before starting the new stack.
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

## Deploy on the server

After editing `.env.local` on the VPS:

```bash
cd /root/app-tecnicos
docker compose up -d --build
curl -sS http://127.0.0.1:3005/api/health
```

After changing branding env vars (`NEXT_PUBLIC_*`), rebuild the Docker image on the server.
