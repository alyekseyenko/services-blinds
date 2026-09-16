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
# Patch script: python scripts/vps_patch_production_env.py (pass vars via local env)

# Optional deploy scripts (local machine only — do not commit)
# VPS_HOST=your.server.ip
# VPS_PASSWORD=...
# DEPLOY_HEALTH_URL=https://technicians.your-real-domain.com/api/health
# CONTAINER_APP=technician-app
# CONTAINER_NGINX=technician-nginx
```

## Deploy scripts

Run with environment variables (never hardcode in the repo):

```bash
export VPS_HOST=your.server.ip
export VPS_PASSWORD=...
export DEPLOY_HEALTH_URL=https://technicians.your-real-domain.com/api/health
python scripts/vps_deploy_and_build.py
```

After changing branding env vars, rebuild the Docker image on the server.
