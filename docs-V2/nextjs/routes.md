# Routes (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/nextjs/routes.md` |
| Authority | **Scratch** — Next.js MCP `get_routes` + disk honesty post domain wipe |
| Snapshot | 2026-07-20 |
| Updated | 2026-07-20 |

Shipped = disk / MCP inventory only. Do not document wiped Declarations/FFT product paths as living.

---

## A. Living inventory

### Pages

| Path | Group |
|------|-------|
| `/` | `(public)` |
| `/403` | `(public)` |
| `/join` | `(public)` |
| `/auth/[path]` | `(public)` |
| `/client` | `(client)` workspace (`CLIENT_HOME`) |
| `/client/dashboard` | `(client)` workspace (when present) |
| `/client/login` | `(client)` gate |
| `/client/preview-unavailable` | `(client)` gate |
| `/admin` | `(operator)` |

### Removed (nuclear wipe — not living)

`/client/declarations`, `/client/declarations/[assignmentId]`, `/fft/**`, declaration-draft product UI.

### Route Handlers

See [../api/rest.md](../api/rest.md). Paths: `/api/auth/[...path]`, `/api/health/liveness`, `/api/health/readiness`, `/api/session/sync-cookies`, `/api/session/ensure-active-organization`.

**Removed RH:** `/api/client/declaration-draft`.

Pages Router: none.

---

## B. Family × gate × render

| Family | Gate | Render |
|--------|------|--------|
| `(public)` | public / auth island | per surface |
| `(client)` gate | public gate | request-time |
| `(client)` workspace | client session | request-time — never `force-static` |
| `(operator)` `/admin` | member / operator role | request-time — never `force-static` |
| `/api/health/*` | none | `auto` + short revalidate |
| `/api/auth/*`, `/api/session/*` | Neon / session | `private, no-store` where applicable |

`proxy.ts` gates navigations — not a substitute for in-Action auth.

---

## C. Not shipped

`/dashboard/*`, `/account/*`, `/playground/*`, `/fft/*` — **not** living product. Do not document as live.

---

## Special files

| File | Expectation |
|------|-------------|
| `layout.tsx` | Segment chrome / session where gated |
| `page.tsx` | Thin RSC |
| `loading.tsx` / `error.tsx` | Suspend / fail — `error.tsx` is `'use client'` |
| `not-found.tsx` | Optional |

## Verify

```text
nextjs_index → get_routes  # keep this snapshot aligned
Test-Path apps/web/app/(operator)/admin
# expect absent: apps/web/app/**/fft · **/declarations · **/declaration-draft
```
