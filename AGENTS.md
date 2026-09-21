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

**All text in this project must be written in English.**

This applies to:

- User-facing UI copy (labels, buttons, toasts, errors, empty states)
- API error messages returned to the client
- Code comments and JSDoc added or edited by agents
- Test descriptions and assertion messages
- Documentation and commit messages produced by agents

Do **not** introduce Portuguese or other languages in new or modified strings unless the user explicitly requests localization. Existing Portuguese strings may remain until migrated; prefer English when touching those areas.

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
- Follow [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md): neon lime `#a3e635` primary, slate dark base, iDraft glassmorphism.
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
│   ├── branding.ts    # Env-driven app name / company labels
│   └── hq.ts          # HQ coordinates (env-driven NEXT_PUBLIC_HQ_*)
└── proxy.ts           # Auth middleware + route RBAC
```

Supporting docs: [README.md](./README.md), [ARCHITECTURE_MASTER_BLUEPRINT.md](./ARCHITECTURE_MASTER_BLUEPRINT.md), [docs/PRODUCTION_ENV.md](./docs/PRODUCTION_ENV.md), [docs/adrs/](./docs/adrs/).

---

## Conventions for agents

### Do

- Read surrounding code before editing; match existing patterns.
- Keep diffs minimal and focused on the requested change.
- Use `credentials: "include"` on client `fetch` calls that need the session cookie.
- Use env-driven branding (`src/lib/branding.ts`, `src/lib/hq.ts`) — never hardcode production domains or IPs in committed code.
- Prefer `getAppSession()` in API routes over ad-hoc session parsing.

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
