# S9 — Readiness and deploy gate

| Field | Value |
|-------|-------|
| **Status** | shipped (hardening: CI wiring — S13) |
| **Sequence** | 10 (continuous) |
| **Depends on** | S0, S1 env |
| **Feeds into** | Deploy smoke, `verify:production` |

## Purpose

Pre-flight dependency check for deploy verification and operators. **Not** for Vercel uptime monitors — use `GET /api/health/liveness` for those.

## Inputs / outputs

- **Inputs:** Env vars (`DATABASE_URL`, `NEON_AUTH_*`), DB ping, pooler topology (production), Neon Auth JWKS probe
- **Outputs:** JSON envelope `{ data: { status: "ready" | "degraded", topology, storage, connection, auth, timestamp } }`
- **HTTP:** Always `200` with `Cache-Control: no-store` — deploy gate reads `data.status`, not status code

## Owned files

- `app/api/health/liveness/route.ts` — lightweight uptime probe (no DB/env validation)
- `app/api/health/readiness/route.ts` — deploy gate route handler
- `lib/api/health-liveness-route.ts` — serialized liveness handler
- `lib/api/health-readiness-route.ts` — serialized readiness handler
- `lib/api/health-response.ts` — shared `{ data }` envelope + cache headers
- `lib/api/readiness.ts` — env probe, JWKS auth probe, readiness evaluation
- `lib/db.ts` — connection ping + pooler metadata

## Critical control points

- Degraded if DB or auth env missing
- Production requires pooler `DATABASE_URL`

## Failure modes

- False `ready` if checks incomplete
- DB timeout on cold start

## Required tests

- `lib/api/health-response.test.ts` — envelope + cache headers
- `lib/api/readiness.test.ts` — env probe, JWKS probe, readiness evaluation
- `GET /api/health/liveness` returns 200 with `data.status: "alive"`
- `GET /api/health/readiness` returns 200 with `data.status` in `ready | degraded`
- Broken `DATABASE_URL` yields `degraded`

## Acceptance proof

- [ ] Curl on staging returns expected readiness status — deferred; production verified S17
- [x] `npm run verify:production` exits 0 against production — 2026-07-08
- [ ] Vercel uptime monitor targets `/api/health/liveness` (dashboard config)

## Rollback

Revert route changes; endpoints are non-destructive.

## Drift risk

Adding heavy logic or secrets to readiness response body; pointing uptime monitors at readiness (adds DB load and false positives).
