# S9 — Readiness and deploy gate

| Field | Value |
|-------|-------|
| **Status** | shipped (hardening: CI wiring — S13) |
| **Sequence** | 10 (continuous) |
| **Depends on** | S0, S1 env |
| **Feeds into** | Deploy smoke, ops monitoring |

## Purpose

Pre-flight health check for Vercel and operators.

## Inputs / outputs

- **Inputs:** Env vars, DB ping
- **Outputs:** JSON `{ status: "ready" | "degraded", checks: {...} }`

## Owned files

- `app/api/health/readiness/route.ts`
- `lib/db.ts`

## Critical control points

- Degraded if DB or auth env missing

## Failure modes

- False `ready` if checks incomplete
- DB timeout on cold start

## Required tests

- `GET /api/health/readiness` returns 200
- Broken `DATABASE_URL` yields `degraded`

## Acceptance proof

- [ ] Curl on staging returns expected status
- [ ] Vercel deploy smoke can call endpoint

## Rollback

Revert route changes; endpoint is non-destructive.

## Drift risk

Adding heavy logic or secrets to readiness response body.
