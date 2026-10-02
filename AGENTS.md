<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent Guidelines — Blinds Technical Services

This document is the **single source of truth** for AI agents and developers working on this repository. Follow it strictly.

---

## Project overview

**Blinds Technical Services** is an offline-first field-operations PWA for blinds installation companies. It syncs with **Twenty CRM** (GraphQL) and serves multiple roles:

| Role | Route | Purpose |
|------|-------|---------|
| **Technician** | `/dashboard` | Day agenda, measurements, visit closure, offline sync |
| **Warehouse** | `/armazem` | Service-item preparation before installation |
| **Member** | `/admin` | Operational admin panel (map, calendar, history) — **no CEO/SRE** |
| **CEO** | `/ceo` + `/admin` | Executive metrics and operational panel |
| **Admin** (Twenty Admin) | `/admin` + `/ceo` + SRE | Full access including observability |

Auth: **NextAuth.js** (JWT) with Twenty credential validation. Route protection lives in `src/proxy.ts` (Next.js 16 middleware — **not** `middleware.ts`).

---

## Language policy

**User-facing text must be written in Portuguese (Portugal).**

This applies to:

- User-facing UI copy (labels, buttons, toasts, errors, empty states)
- API error messages returned to the client
- Test descriptions and assertion messages for user-visible behaviour

Code comments, JSDoc, internal logs, and agent documentation may remain in English when clearer for developers. Prefer **pt-PT** for any string the operator or technician will see.

---

## Architecture & quality rules

This project follows **Spec-Driven Development** and **Domain-Driven Design**.

### 1. Single source of truth for models

- Use **Zod** for all data schemas. Every business entity (Task, Opportunity, ServiceItem, etc.) MUST have a schema.
- TypeScript types MUST be inferred from Zod (`z.infer<typeof Schema>`).
- Validate incoming API/CRM data and outgoing form data with Zod.

### 2. Clean architecture — layer separation

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Presentation** | `src/app/`, `src/components/` | UI and local state only. **No** direct CRM/DB calls. |
| **Use cases** | `src/actions/` | Server Actions. UI calls these to mutate data. |
| **Infrastructure** | `src/lib/crm/` | **Only** place for CRM fetching and GraphQL queries. |

API route handlers (`src/app/api/`) may call `src/lib/crm/` and `src/lib/auth/session.ts` but should stay thin.

### 3. Failsafe mutations

- Never crash the UI with unhandled exceptions.
- All Server Actions MUST return: `{ success: boolean, data?: T, error?: string }`.
- Catch errors in Server Actions and return a graceful message to the UI.

### 4. Styling

- **Tailwind CSS only.** No inline styles.
- **Single source of truth:** all colors, state tones, and `ds-*` recipes live in [`src/styles/design-system.css`](src/styles/design-system.css) — do not add raw palette classes (`bg-red-*`, `text-slate-*`, hex in classNames) in components.
- Follow [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md): brutalist tokens, neon lime accents, semantic success/danger/warning/info surfaces.
- Reusable UI → `src/components/ui/` or `src/components/dashboard/`.
- Mobile PWA: minimum `text-xs`, touch targets ≥ `48px`, `inputMode` on numeric fields.

### 5. Type safety & QA

- No `any` types. Fix TS errors before shipping.
- Complex logic → unit tests (Vitest) in `__tests__/` next to the module.
- Critical flows → Playwright e2e (`npm run test:e2e:smoke`).
- Run `npm run validate` before considering work complete.

---

## RBAC — role helpers

Use helpers from `src/lib/auth/session.ts`. Do **not** duplicate role checks inline.

| Helper | Who passes |
|--------|------------|
| `canAccessAdminPanel` | `admin`, `member`, `ceo` |
| `isAdminRole` | Same as above (operational APIs) |
| `canAccessCeoPanel` | `admin`, `ceo` only |
| `isStrictAdminRole` | `admin` only (SRE, `/api/observability`, `/api/qa`, `/api/sync-telemetry`) |

Twenty → app role mapping: `src/lib/crm/contract.ts` (`TWENTY_ROLE_TO_APP_ROLE`).

**Important:** Twenty **Member** maps to app role `member`, **not** `admin`. Members must not see CEO or SRE UI (`AdminHeader.tsx` uses `canAccessCeoPanel` / `isStrictAdminRole`).

---

## Key directories

```
src/
├── actions/           # Server Actions (mutations)
├── app/
│   ├── admin/         # Map, calendar, history, observability (SRE)
│   ├── ceo/           # Executive dashboard
│   ├── dashboard/     # Technician PWA
│   ├── armazem/       # Warehouse
│   ├── avaliacao/     # Public rating portal (HMAC token)
│   ├── cancelamento/  # Public cancellation portal (HMAC token)
│   └── api/           # Thin API bridges + NextAuth
├── components/        # React components by domain
├── hooks/             # useSync, useSyncQueue, useMeasurements
├── lib/
│   ├── auth/          # Session + RBAC helpers
│   ├── crm/           # GraphQL client, contract, domain fetchers
│   ├── schemas/       # Zod schemas (auth, CEO metrics, etc.)
│   ├── onboarding/    # Guided tours (driver.js), demo visit, tour actions
│   ├── branding.ts    # Env-driven app name / company labels
│   └── hq.ts          # HQ coordinates (env-driven NEXT_PUBLIC_HQ_*)
└── proxy.ts           # Auth middleware + route RBAC
```

Supporting docs: [README.md](./README.md), [ARCHITECTURE_MASTER_BLUEPRINT.md](./ARCHITECTURE_MASTER_BLUEPRINT.md), [docs/PRODUCTION_ENV.md](./docs/PRODUCTION_ENV.md), [docs/adrs/](./docs/adrs/).

---

## Conventions for agents

### Do

- Read surrounding code before editing; match existing patterns.
- **When adding a new automation, webhook, portal, or external integration**, register an E2E check in `src/lib/observability/e2eRegistry.ts` with `covers` (`system:`, `event:`, `api:`) — `npm run validate` runs `coverage.test.ts` and fails if a system, outbox event, or API route is uncovered (see [docs/E2E_OBSERVABILITY_SUITE.md](./docs/E2E_OBSERVABILITY_SUITE.md)). New **outbox event types** get routing/HMAC checks via `checks/generated.ts`. For full business-flow coverage, add a phase or scenario in `src/lib/observability/luxury/luxuryRegistry.ts`.
- Keep diffs minimal and focused on the requested change.
- Use `credentials: "include"` on client `fetch` calls that need the session cookie.
- Use env-driven branding (`src/lib/branding.ts`, `src/lib/hq.ts`) — never hardcode production domains or IPs in committed code.
- Prefer `getAppSession()` in API routes over ad-hoc session parsing.
- **When changing layout, navigation, or primary UI flows** (especially `/dashboard`, `/admin`, `/armazem`, `/ceo`), keep the **onboarding guide** in sync — see [Onboarding guided tours](#onboarding-guided-tours) below.
- **When a change affects the field agenda or visit lifecycle** (new status, reschedule/cancel paths, mass schedule, on-site services, assignments), **extend in-app notifications in the same change** — see [Agenda & in-app notifications](#agenda--in-app-notifications) below. Do not wait for the user to ask.

### Agenda & in-app notifications

Technician (`/dashboard`) and admin (`/admin`) get **toasts + sininho** when the CRM agenda changes (poll via `useSync`). Admin uses task-level feed `/api/agenda/feed` (not the opportunities map list) so conclusões e estados não se perdem quando a oportunidade sai do pipeline. Treat this as part of the feature, not an optional follow-up.

**Update notifications in the same PR when you:**

- Add or rename **task statuses** or transitions that operators should notice (e.g. new terminal state, “em curso”, reschedule).
- Change **scheduling** (single visit, mass route, cancel/unschedule) or what appears on the admin map agenda.
- Add **on-site / extra services** or other flows that create or move opportunities/tasks on the agenda.
- Change **which fields** identify a visit in diffs (`taskId`, `opportunityId`, `dueAt`, technician name).

**Where things live:**

| Concern | Location |
|--------|----------|
| Diff kinds & copy (pt-PT) | `src/lib/agendaDiff.ts` (`AgendaDiffKind`, `diffAgendaSnapshots`, `diffPipelineSnapshots`, `formatAgendaDiffToast`) — kinds include `reatribuida`, `atrasada`, `servico_extra`, `armazem_pronto` |
| Admin CRM feed | `src/lib/crm/agendaFeed.ts`, `GET /api/agenda/feed` |
| Late visits (admin) | `src/lib/agendaLateNotify.ts` (`detectLateVisits`, ledger 48h) |
| Toast + sininho orchestration | `src/hooks/useAgendaNotifications.ts` |
| Dedupe (2 min) | `src/lib/agendaNotifyDedupe.ts` |
| Visit lifecycle & timeline | `src/lib/agendaVisitLifecycle.ts`, `src/lib/agendaNotificationPanel.ts`, `src/components/ui/AgendaVisitNotificationCard.tsx` |
| Bell UI | `src/components/ui/InAppNotificationBell.tsx` (Centro de avisos: filtros, agrupamento por dia) |
| Storage & scope | `src/lib/inAppNotifications.ts` (admin cap 50), `src/lib/agendaSnapshotStorage.ts` (`v2` snapshots + pipeline), `getNotificationScope()` |
| Zod | `src/lib/schemas/inAppNotification.ts`, `src/lib/schemas/agendaFeed.ts` |
| Suppress self-authored events | `src/lib/agendaLocalChanges.ts` — `markLocalAgendaChange(scope, key, kinds[])` after successful **local** mutations (admin actions, `useSyncQueue`, direct server actions the user triggered) |
| Styles | `src/lib/agendaNotificationStyle.ts` |

**Conventions:**

- New diff kinds need tests in `src/lib/__tests__/agendaDiff.test.ts` and toast/bell styling via `agendaKind`.
- Sininho da agenda: **um cartão por visita** (`pushOrMergeAgendaInAppNotification`, merge mesmo após lido, janela 7 dias); `visit` + `agendaTimeline` (fase, histórico com hora e detalhe — serviço extra, motivo incompleta/cancelada). `agendaProgress` é legado (migrado ao carregar). Toasts: **um por visita por sync**, com percurso curto se vários passos no mesmo poll.
- Use `toSafeIso()` for snapshot dates; never throw from snapshot building.
- All user-visible strings **pt-PT**.
- **Browser push / n8n push webhook** are not used for field ops — operators use the **sininho** only. Do not add `N8N_WEBHOOK_URL_PUSH` or push opt-in flows for agenda changes. (n8n may still handle other CRM/outbox events elsewhere in the stack.)

### Onboarding guided tours

Each role gets a **driver.js** tour (`?` button + first-login autostart). **Technician** and **admin** use **capítulos**: autostart só em `essentials` (≤15 passos); o **?** abre um picker com capítulos temáticos. Warehouse e CEO têm um único capítulo (`default`).

Regra Cursor dedicada: [.cursor/rules/onboarding-tours.mdc](./.cursor/rules/onboarding-tours.mdc) — actualizar o guia **na mesma alteração** quando mudar UI importante.

Two flows use **demo entities** that must never sync to the CRM:

| Role(s) | Route | Demo entity |
|---------|-------|-------------|
| **Technician** | `/dashboard` | Fake visit (`TaskDetailsDrawer`, measurements, add-service sheet) |
| **Member / admin / CEO** | `/admin` | Fake map pin + opportunity (`OpportunityDrawer`; same demo ID as map pin helpers) |

Warehouse and CEO panels have shorter tours; **technician** and **admin** tours are the longest — treat both as first-class when changing those screens.

**Update the guide in the same PR (or immediately after) when you:**

- Move, rename, hide, or split UI regions (headers, bottom nav, drawers, sheets, tabs).
- Add or remove **technician** views (map / list / calendar / history) or **admin** views (map / calendar / history, map status tabs, filters, route sidebar).
- Change map pins, info windows, or opportunity drawer layout on `/admin`.
- Change z-index, overlays, or scroll containers that affect what the tour can highlight.

**Where things live:**

| Concern | Location |
|--------|----------|
| Capítulos e passos (pt-PT) | `src/lib/onboarding/chapters/{technician,admin,warehouse,ceo}.ts`, re-export em `tours.ts` |
| Picker do ? | `src/components/onboarding/TourHelpButton.tsx` |
| Role → tour id (CEO em `/admin` → guia admin) | `getTourIdForSession` em `src/lib/onboarding/roleTour.ts` |
| Visibilidade lazy / `roles` / `viewport` | `src/lib/onboarding/tourStepVisibility.ts` |
| Orchestration (next/prev, waits) | `src/components/onboarding/OnboardingTour.tsx` |
| DOM anchors | `data-tour="…"` on stable, visible targets (prefer inner panels over full-screen wrappers) |
| Tour actions (shared) | `src/lib/onboarding/tourActions.ts` |
| **Technician** demo / view switches | `src/hooks/useOnboardingTechnicianTour.ts`, `TaskDetailsDrawer`, `AddVisitServiceSheet`, `src/app/dashboard/page.tsx` |
| **Admin** demo pin / opp / views | `src/hooks/useOnboardingAdminTour.ts`, `src/lib/onboarding/demoMapPin.ts`, `src/app/admin/page.tsx`, `MapComponent`, `OpportunityDrawer`, `AdminHeader`, calendar & history views |
| Visibility / z-index during tour | `src/app/globals.css` (`html[data-onboarding-tour="…"]`) |
| Wait for anchors | `src/lib/onboarding/waitForTourAnchors.ts` |

**Conventions:**

- Anchor names: role prefix + feature, e.g. `tech-nav-list`, `tech-drawer-tab-measurements`, `admin-map-filters`, `admin-opp-drawer-header`.
- Drawer/sheet steps: use `drawerStep` / `sheetStep` in chapter definitions — do **not** fall back to the invisible modal anchor for those steps.
- Optional step fields: `roles?: AppRole[]`, `viewport?: "mobile" | "desktop"`.
- If a step needs UI state (open drawer, tab, sheet, map tab, or main view), add or reuse a **`tourAction`** and handle it in the matching hook — do not rely on the user clicking ahead of the tour.
- **Technician:** leaving the demo visit block must **`closeDemoVisit`**; steps that show the main app behind the drawer must not keep the demo drawer open.
- **Admin:** use **`showAdminViewMap|Calendar|History`** before highlighting those views; open/close the demo opportunity with **`openAdminDemoOpportunity`** / **`closeAdminDemoOpportunity`**; map status steps may need **`setAdminMapTabScheduled`** / **`setAdminMapTabUnscheduled`**. If a target lives inside a collapsed panel (e.g. filtros), add a prepare action to open it — do not point the tour at hidden DOM.
- All **user-visible** tour strings stay **pt-PT**; keep demo IDs guarded in sync queue / actions (see existing `isOnboardingDemoEntity` patterns).
- After edits: run `npm run validate`, smoke-test with **?** on mobile width and desktop for **each affected role** (`/dashboard` for technician, `/admin` for member/admin/ceo).

### Do not

- Commit `.env.local`, API keys, passwords, or real production URLs.
- Call CRM GraphQL from components or Server Actions directly — go through `src/lib/crm/`.
- Add `MEMBER: 'admin'` or otherwise grant Member users CEO/SRE access.
- Create `middleware.ts` — this app uses `src/proxy.ts`.
- Add tests that only assert the obvious unless they cover real behavior.

### Deploy (when requested)

- Deploy from the server with `docker compose up -d --build` after updating `.env.local`.
- Server path: `/root/app-tecnicos`. Container: `technician-app` on port **3005**.
- `NEXT_PUBLIC_*` vars are baked at Docker build time — update env on the server and rebuild the Docker image.
- Ops helpers (deploy, backup, VPS tuning) stay **local or on the server only** — never commit them to Git.
- Only commit when the user explicitly asks.

---

## Commands

```bash
npm run dev          # Development server
npm run validate     # type-check + unit tests
npm run test:e2e:smoke
npm run build        # Production build
```

---

## Security reminder

- Repository is anonymized for GitHub; production secrets live only on the VPS `.env.local`.
- Public portals (`/avaliacao`, `/cancelamento`) use HMAC-signed expiring tokens — do not weaken validation.
- After RBAC changes, users may need to **log out and log in** to refresh JWT role claims.
