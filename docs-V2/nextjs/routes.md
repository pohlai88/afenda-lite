# Routes (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/nextjs/routes.md` |
| Authority | **Scratch** — Next.js MCP `get_routes` (`:3000`) |
| Snapshot | 2026-07-19 |
| Updated | 2026-07-19 |

Shipped = MCP inventory only. Do not document paths that are not in `get_routes`.

---

## A. MCP inventory

### Pages

| Path | Group |
|------|-------|
| `/` | `(public)` |
| `/403` | `(public)` |
| `/join` | `(public)` |
| `/auth/[path]` | `(public)` |
| `/client` | `(client)` workspace |
| `/client/dashboard` | `(client)` workspace |
| `/client/declarations` | `(client)` workspace |
| `/client/declarations/[assignmentId]` | `(client)` workspace |
| `/client/login` | `(client)` gate |
| `/client/preview-unavailable` | `(client)` gate |
| `/admin` | `(operator)` |
| `/fft` | `(operator)` |

### Route Handlers

See [../api/rest.md](../api/rest.md). Paths: `/api/auth/[...path]`, `/api/health/liveness`, `/api/health/readiness`, `/api/session/sync-cookies`, `/api/session/ensure-active-organization`, `/api/client/declaration-draft`.

Pages Router: none.

---

## B. Family × gate × render

| Family | Gate | Render |
|--------|------|--------|
| `(public)` | public / auth island | per surface |
| `(client)` gate | public gate | request-time |
| `(client)` workspace | client session | request-time — never `force-static` |
| `(operator)` `/admin`, `/fft` | member / FFT access | request-time — never `force-static` |
| `/api/health/*` | none | `auto` + short revalidate |
| `/api/auth/*`, `/api/session/*`, draft | Neon / session | `private, no-store` where applicable |

`proxy.ts` gates navigations — not a substitute for in-Action auth.

---

## C. Not shipped

`/dashboard/*`, `/account/*`, `/playground/*` — **not** in MCP `get_routes`. Do not document as live.

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
```
