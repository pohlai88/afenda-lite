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

- **Inputs:** Env vars, DB ping, pooler topology (production)
- **Outputs:** JSON `{ status: "ready" | "degraded", checks: {...} }`

## Owned files

- `app/api/health/liveness/route.ts` — lightweight uptime probe (no DB/env validation)
- `app/api/health/readiness/route.ts` — deploy gate
- `lib/db.ts`

## Critical control points

- Degraded if DB or auth env missing
- Production requires pooler `DATABASE_URL`

## Failure modes

- False `ready` if checks incomplete
- DB timeout on cold start

## Required tests

- `GET /api/health/liveness` returns 200 with `status: "alive"`
- `GET /api/health/readiness` returns 200
- Broken `DATABASE_URL` yields `degraded`

## Acceptance proof

- [ ] Curl on staging returns expected readiness status
- [ ] `npm run verify:production` exits 0 against production
- [ ] Vercel uptime monitor targets `/api/health/liveness` (dashboard config)

## Rollback

Revert route changes; endpoints are non-destructive.

## Drift risk

Adding heavy logic or secrets to readiness response body; pointing uptime monitors at readiness (adds DB load and false positives).
