# Twenty CRM — production tuning (read-only diagnostics + safe infra)

This document covers **Twenty UI slowness** and **real-time updates** without modifying Twenty source code.

## What we measured (production VPS)

| Item | Value |
|------|--------|
| Twenty GraphQL (internal) | ~4 ms |
| Twenty metadata (internal) | ~5 ms |
| CRM public HTTPS | ~113 ms |
| Postgres size | ~58 MB |
| People records | ~11,286 |
| Timeline activities | ~15,202 |
| Twenty server RAM | ~800 MB |
| Twenty worker RAM | ~739 MB |
| Swap (before tuning) | **none** |

**Conclusion:** API latency is low. Slow **browser refresh** is mostly frontend + large lists + metadata bootstrap, not server network.

## Real-time updates (new client while page is open)

Twenty uses **SSE (Server-Sent Events)**, not classic polling.

| Scenario | Expected delay |
|----------|----------------|
| SSE working | **1–5 seconds** |
| SSE blocked (proxy buffering) | **Only on manual refresh** (5–20+ s) |

### Manual test (two browsers)

1. Browser A: open `https://crm.yourcompany.com` → **People**
2. Browser B: create a new person
3. Browser A: **do not press F5** — wait 10 seconds

- Appears automatically → SSE OK  
- Only after F5 → check nginx SSE settings / Cloudflare cache

## Safe infra improvements (no Twenty code changes)

Script: `python scripts/vps_optimize_twenty_infra.py`

1. **4 GB swap** — prevents RAM spikes from crashing Postgres/Twenty
2. **Nginx SSE tuning** for your CRM host (e.g. `crm.yourcompany.com`):
   - `proxy_buffering off`
   - `proxy_cache off`
   - `proxy_read_timeout 3600s`
3. **PostgreSQL `ANALYZE`** — refreshes query planner stats (non-blocking)
4. **Backup** of nginx site config before edit (`*.bak-YYYYMMDD-HHMMSS`)

## What the technician app already does (indirect relief)

- Redis cache for admin reads (60 s TTL, invalidate on mutations)
- Lighter GraphQL queries + fetch limits
- Reduced maintenance/observability polling

This **reduces load** on Twenty but does not replace infra tuning for the CRM UI.

## Further options (when you outgrow current VPS)

- Upgrade RAM (8 GB+)
- PgBouncer in front of Twenty Postgres
- Archive old timeline activities in Twenty UI
- Cloudflare: no cache on `/graphql`, `/metadata`, SSE paths

## Diagnostic scripts

```bash
export VPS_HOST=your.server.ip
export VPS_PASSWORD=...
python scripts/vps_twenty_probe.py      # RAM, DB size, API latency
python scripts/vps_twenty_sse_check.py  # nginx + SSE headers
python scripts/vps_optimize_twenty_infra.py  # apply safe tuning
```
