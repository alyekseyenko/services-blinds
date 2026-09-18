# Blinds Technical Services — Field Operations Platform

A production-grade **Progressive Web App** for blinds installation companies: scheduling, field work, warehouse prep, executive analytics, and customer self-service — synchronized with **Twenty CRM** and built **offline-first** for technicians on the road.

> Branding is env-driven (`NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_SHORT_NAME`). Defaults in `.env.example` are generic placeholders — override on the production server.

---

## Table of contents

1. [Why we built this](#why-we-built-this)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Tech stack](#tech-stack)
5. [Getting started](#getting-started)
6. [Project structure](#project-structure)
7. [Documentation](#documentation)

---

## Why we built this

### Problem

A blinds company serving **more than 15,000 customers** was stuck in organizational chaos.

- Customers called every day: *Where is my order? When will materials arrive? When can a technician visit?*
- **Hundreds of hours per month** were lost on phone calls, chats, and manual status checks.
- Route planning, travel spend, fuel, tolls, and stock were tracked in spreadsheets — or not at all.
- Departments worked on **paper and siloed tools**. When someone needed an answer, no one had the full picture.
- Data died between **sales, scheduling, warehouse, field teams, and leadership**.

### Solution

**Blinds Technical Services** connects the full lifecycle in one platform:

| Role | Capability |
|------|------------|
| **CEO** | Revenue, pipeline forecast, technician rankings, fleet km, NPS, follow-ups |
| **Admin** | Full operational panel + SRE observability |
| **Member** | Operational admin (map, calendar, scheduling) — no CEO or SRE console |
| **Technicians (PWA)** | Day agenda, GPS, millimetre measurements, visit closure — **offline-first** |
| **Warehouse** | Per-item preparation status before installation |
| **Customers** | HMAC-signed links to rate a service or cancel an appointment |

All roles sync with **Twenty CRM**. Pipeline workflow is **stage-first** (`ENTRADA`, `MANUTENCAO`, `REPARACAO`, `MARCAR_INSTALACAO`, etc.) — the app derives visit type from **opportunity stage + title**, not a separate service-type field. Offline mutations queue in IndexedDB and replay when connectivity returns.

### Impact

- Single source of truth from **lead → measurement → install → payment**
- Fewer inbound calls — status lives in CRM and surfaces on the right screen
- Measurable logistics: optimized routes, cost estimates, zone insights
- Field teams stop re-typing; warehouse prepares before vans leave
- Leadership sees live metrics instead of month-end guesses

---

## Features

### Technician mobile PWA

- Offline task list with IndexedDB sync queue and retry jitter
- On-site states: scheduled → in progress → complete / incomplete / cancelled
- Product-group measurement forms
- One-tap navigation (Google Maps / Waze)
- Sync telemetry for operations monitoring

### Admin control center

- Map: unscheduled vs scheduled visits, overdue indicators, live technician pins
- Filters: measurements, installations, and **assistance** (maintenance / repair)
- Calendar per technician
- AI route strategy with fuel/toll estimates
- Mass scheduling, opportunity drawer, automatic geocoding
- Service history API with **50 items per page**

### CEO executive dashboard

- Won revenue, pipeline, weighted forecast, win rate
- Monthly evolution & funnel by stage
- Technician success rate and estimated km
- Customer ratings and follow-up urgency
- **Year-filtered CRM queries** (server-side date filters)

### Warehouse

- Service items linked to opportunities
- Preparation workflow before installation

### SRE observability *(admin role only)*

- CRM latency & circuit breaker
- Transactional outbox (pending / failed / reprocess)
- Offline sync telemetry per technician
- QA 360 diagnostic runner

### Public customer portals

- Service rating — signed expiring token (`/avaliacao/{id}?t=…`)
- Appointment cancellation — token + state guard (`/cancelamento/{id}?t=…`)

### Engineering quality

- Zod schemas, clean architecture (UI → actions → CRM layer)
- Single CRM contract in `src/lib/crm/contract.ts` (stages, transitions, RBAC helpers)
- Circuit breaker, transactional outbox, **86+** unit tests, Playwright e2e
- GitHub Actions CI: type-check, test, build, smoke e2e
- RBAC: **admin**, **member**, **ceo**, **technician**, **warehouse**

---

## Architecture

```mermaid
graph TB
    subgraph Clients
        TECH[Technician PWA]
        ADMIN[Admin Console]
        CEO[CEO Dashboard]
        WH[Warehouse]
    end

    subgraph "Next.js App"
        PROXY[Auth proxy + RBAC<br/>src/proxy.ts]
        ACTIONS[Server Actions]
        OFFLINE[IndexedDB + sync queue]
        OUTBOX[Transactional outbox]
        OBS[SRE observability API]
    end

    subgraph External
        CRM[(Internal CRM — GraphQL)]
        N8N[n8n automations]
        MAPS[Maps / geocoding]
    end

    TECH --> PROXY
    ADMIN --> PROXY
    CEO --> PROXY
    WH --> PROXY
    PROXY --> OFFLINE --> ACTIONS
    ACTIONS --> CRM
    ACTIONS --> OUTBOX --> N8N
    ACTIONS --> MAPS
    OBS --> CRM
```

**Offline sync**

```mermaid
sequenceDiagram
    participant Tech as Technician
    participant UI as React UI
    participant IDB as IndexedDB
    participant API as Server Action
    participant CRM as CRM GraphQL

    Tech->>UI: Submit measurement / close visit
    UI->>IDB: Save locally
    alt Online
        UI->>API: Sync mutation
        API->>CRM: Persist
    else Offline
        UI->>IDB: Enqueue pending action
    end
```

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16, React 19 |
| Language | TypeScript, Zod |
| Styling | Tailwind CSS v4 |
| Local data | Dexie.js (IndexedDB) |
| CRM | Twenty (GraphQL + contract layer) |
| Auth | NextAuth.js, JWT, RBAC |
| Automation | n8n webhooks |
| Tests | Vitest (86+), Playwright |
| Deploy | Docker Compose, Nginx |

---

## Getting started

### Prerequisites

- Node.js 20+
- Twenty CRM instance + API key

### Install

```bash
git clone https://github.com/alyekseyenko/services-blinds.git
cd services-blinds
npm install
```

### Environment

```bash
cp .env.example .env.local
```

Required variables:

```env
TWENTY_API_URL=http://your-crm-host:3000
TWENTY_API_KEY=your_api_key
NEXTAUTH_SECRET=at_least_32_random_characters
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Blinds Technical Services
NEXT_PUBLIC_APP_SHORT_NAME=BTS
```

### Commands

```bash
npm run dev         # development server
npm run validate    # type-check + unit tests
npm run test:e2e:smoke
npm run build       # production build
```

---

## Project structure

```
src/
├── actions/              # Server Actions (use cases)
├── app/
│   ├── admin/            # Map, calendar, history, observability
│   ├── ceo/              # Executive dashboard
│   ├── dashboard/        # Technician PWA
│   ├── armazem/          # Warehouse
│   ├── avaliacao/        # Public rating portal
│   └── cancelamento/     # Public cancellation portal
├── components/
├── hooks/                # useSync, useSyncQueue
├── lib/crm/              # GraphQL integration + contract layer (stages, transitions)
└── proxy.ts              # Next.js 16 auth + route RBAC (not middleware.ts)
docs/adrs/                # Architecture decision records
```

---

## Documentation

- [Architecture blueprint](ARCHITECTURE_MASTER_BLUEPRINT.md)
- [Design system](DESIGN_SYSTEM.md)
- [Deployment guide](DEPLOY_HETZNER.md)
- [ADRs](docs/adrs/)

---

## Security & privacy (GitHub)

- **Never commit** `.env.local` — it holds API keys, secrets, and real domains.
- The repo uses **placeholders** for secrets, domains, and branding (`your_api_key`, `yourcompany.com`, `Blinds Technical Services`) — no production URLs, client names, or API keys in Git.
- Production branding and URLs are set **only on the server** — see [docs/PRODUCTION_ENV.md](docs/PRODUCTION_ENV.md).
- Keep the repository **Private** if you want extra protection.
- Deploy scripts read `VPS_HOST`, `VPS_PASSWORD`, and `DEPLOY_HEALTH_URL` from your **local environment**, not from Git.

---

## License

Private — all rights reserved.
