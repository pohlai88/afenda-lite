# S17 — Production acceptance closure

| Field | Value |
|-------|-------|
| **Status** | in_progress |
| **Sequence** | 17 — before S12 tenancy or SaaS expansion |
| **Depends on** | S0–S16 (runtime shipped) |
| **Feeds into** | Production release sign-off, S12 tenancy decision |

## Purpose

Close all remaining **acceptance proof** gaps across shipped slices before expanding into tenancy, SaaS scope, or additional product features.

Runtime foundation is largely complete; operational and business acceptance evidence is uneven. This slice verifies shipped foundations are browser-tested, CI-protected, and production-ready — **without introducing new product features**.

## Scope

| In scope | Out of scope |
|----------|--------------|
| Check off open acceptance proof items in S1, S2, S4, S7, S8, S9, S13 | S12 tenancy / `organization_id` / RLS |
| Doctrine §7 production checklist gaps | New routes, schema, or mutations |
| GitHub branch protection proof | Portal Atmosphere (PA-P*) — parallel track |
| `verify:production` and health monitor proof | Blob upload, review workflow, outbox email |

## Priority closure list

### P0 — Must close before production confidence

| Source | Gap | Evidence |
|--------|-----|----------|
| S13 | Required checks on `main` | GitHub branch protection screenshot or `gh api` output |
| S9 | `npm run verify:production` exits 0 | CI log or local run against production |
| S9 | Readiness curl on staging/production | `GET /api/health/readiness` → `data.status: "ready"` |
| S9 | Vercel uptime monitor on liveness | Dashboard targets `/api/health/liveness` |
| S4 | Operator detail shows submission | Manual or E2E + `submission-answers.tsx` |
| S4 | All question types in review | yes_no, text, file metadata |
| S7 | `CDP-*` on client dashboard | `e2e/client-journey.spec.ts` or manual |
| S7 | Same submission on operator detail | Cross-surface verify |
| S8 | Operator sees matching answers | After client/public submit |
| S8 | File evidence = metadata only | No download link |

### P1 — Auth and copy governance

| Source | Gap | Evidence |
|--------|-----|----------|
| S1 | Operator login → dashboard path | E2E smoke or manual |
| S1 | Client login / `/` dispatch | E2E journey or manual |
| S1 | Non-operator → `access-denied` | `e2e/smoke.spec.ts` |
| S1 | Client scoped to client routes | Negative test on `/dashboard` |
| S2 | Build + copy grep | `npm run build`, `npm run check:copy` |
| S2 | Terminology in UI surfaces | Spot check + grep gate |

### P2 — Doctrine §7 production checklist

| Item | Evidence |
|------|----------|
| Vercel env keys present | [production-go-live runbook](../../runbooks/production-go-live.md) |
| Neon Auth trusted domains | MCP audit or `neon neon-auth domain list` |
| E2E smoke green on `main` | GitHub Actions |
| E2E journey green on `main` push | GitHub Actions `journey` job |

## Release authority

**E2E journey suite (S15) is the primary release authority** for end-to-end product proof:

| Command | When |
|---------|------|
| `npm run test:e2e:smoke` | Every PR + pre-release |
| `npm run test:e2e:journey` | Main push + pre-release gate |

Manual acceptance closes gaps that automation does not yet cover (branch protection, Vercel monitor config, production `verify:production`).

**Evidence log:** § [Evidence log (2026-07-08)](#evidence-log-2026-07-08) below · **Live status:** [TRACKING.md](../../TRACKING.md)

## Acceptance proof to close

Copy outcomes back to source slice specs when checked.

### S1 — Auth and session boundary

- [ ] Operator: `/org/login` → `/auth/sign-in?from=org` → `/dashboard` (or `returnTo` when provided)
- [ ] Client: `/client/login` or `/` → `/client` or `/client/onboarding`
- [x] Unauthorized operator: `/org/login?reason=access-denied` — `e2e/smoke.spec.ts` 2026-07-08
- [ ] Client session scoped to client routes only

### S2 — UI shell and copy doctrine

- [x] Build passes — 2026-07-08
- [x] Dashboard and client surfaces use declaration/client/submission language — `check:copy` 2026-07-08
- [x] No inline marketing or help copy in components — `check:copy` gate 2026-07-08

### S4 — Submission engine

- [ ] Submission visible on operator detail via `submission-answers.tsx`
- [ ] All question types render correctly in review

### S7 — Client assignments and receipts

- [ ] `CDP-*` code shown on client dashboard
- [ ] Same submission visible on operator detail list

### S8 — Operator review surface

- [ ] Operator sees matching answers after client/public submit
- [ ] File evidence shows metadata, not download link

### S9 — Readiness and deploy gate

- [ ] Curl on staging returns expected readiness status — deferred; production verified
- [x] `npm run verify:production` exits 0 against production — 2026-07-08
- [ ] Vercel uptime monitor targets `/api/health/liveness` (dashboard config)

### S13 — CI quality gate

- [ ] Required checks configured on `main` (GitHub repo setting)

### Doctrine §7 — Production acceptance checklist

- [ ] Env: `DATABASE_URL`, `NEON_AUTH_*`, `SHARED_ADMIN_*`, `APP_URL` on Vercel
- [ ] Neon Auth trusted domains include production URL
- [x] `GET /api/health/readiness` returns `ready` on production — curl 2026-07-08

## Required commands

```bash
npm run env:compose
npm run build
npm run check:copy
npm run check:db-schema
npm run test:unit
npm run test:interaction
npm run test:e2e:smoke
npm run test:e2e:journey
npm run verify:production
```

**Readiness probes:**

```bash
curl -sS "$APP_URL/api/health/liveness" | jq .
curl -sS "$APP_URL/api/health/readiness" | jq .
```

## Critical control points

- Do not introduce new routes or product features.
- Do not change schema unless fixing an acceptance failure.
- **Do not begin S12 tenancy until this slice is accepted.**
- Treat E2E journey evidence as release authority where specs exist.
- Unchecked items must be **explicitly deferred** with owner, date, and reason in the deferral table below.

## Deferral registry

If an item cannot close in S17, record it here — do not leave silent open boxes.

| Item | Owner | Target date | Reason |
|------|-------|-------------|--------|
| S13 branch protection | Repo admin | TBD | `gh api` 403 — verify in GitHub UI |
| S9 Vercel liveness monitor | Ops | TBD | Dashboard-only config |
| S9 staging curl | Engineering | Optional | Production readiness verified instead |
| S1 operator → dashboard | Engineering | TBD | Local `@journey` login did not complete; verify creds + CI main job |
| S4/S7/S8 E2E proof | Engineering | TBD | Blocked on journey green or manual walkthrough |
| `@journey` local | Engineering | TBD | 10/15 failed locally; CI `main` is release authority |
| CI `main` green | Engineering | TBD | `check:ui-sync` fails — `.env` not present in CI (run 28917462951) |

## Owned files

Documentation and proof only — no new runtime modules unless fixing a failed acceptance check:

- `docs/architecture/slices/s17-production-acceptance-closure.md` (this file)
- `docs/TRACKING.md` — live program status (edit on closure)
- Source slice specs: update checkboxes when proof closes
- `docs/architecture/iam-check-doctrine.md` §7 when doctrine checklist completes

## Failure modes

- Marking slices “shipped” while acceptance proof stays open → false production confidence
- Starting S12 before closure → cross-cutting refactor during unstable proof layer
- CI green without branch protection → advisory-only quality gate
- Pointing uptime monitor at `/readiness` → DB load and false positives (use `/liveness`)

## Required tests

| Layer | Command | Pass criteria |
|-------|---------|---------------|
| L0 | `npm run test:unit` | Green — **386 pass (2026-07-09)** |
| L2 | `npm run test:interaction` | Green — **58 pass (2026-07-09)** |
| L4 smoke | `npm run test:e2e:smoke` | Green in CI — **PASS local 13/13 (2026-07-08)** |
| L4 journey | `npm run test:e2e:journey` | Green on `main` — **FAIL local 2026-07-08** |
| Production | `npm run verify:production` | Exit 0 — **PASS 2026-07-08** |
| Copy | `npm run check:copy` | Exit 0 |
| Architecture | `npm run checks` | **Pass 12 gates (2026-07-09)** |

## Evidence log (2026-07-08) {#evidence-log-2026-07-08}

**Environment:** `npm run env:compose`; production checks against `https://iam-check.vercel.app`

| Command | Result | Notes |
|---------|--------|-------|
| `npm run env:compose` | PASS | 26 keys composed |
| `npm run check:copy` | PASS | 235 component files (2026-07-09) |
| `npm run check:db-schema` | PASS | 12/12 migrations, pooler=true |
| `npm run verify:draft-migration` | PASS | `012_assignment_draft.sql` applied |
| `npm run build` | PASS | — |
| `npm run test:unit` | PASS | 386 (2026-07-09) |
| `npm run test:interaction` | PASS | 58 (2026-07-09; harness stabilized) |
| `npm run test:e2e:smoke` | PASS | 13/13 |
| `npm run test:e2e:journey` | **FAIL** | 10 failed locally — operator sign-in; CI is release authority |
| `npm run verify:production` | PASS | Production readiness OK |

**Production health:** `GET /api/health/liveness` → `alive`; `GET /api/health/readiness` → `ready`.

**Fixes during S17:** governance `.ts` import extensions; `client-preview-banner` registry; interaction test harness (`testing/vitest.config.ts`, `next/image` mock); CI `check:ui-sync` no longer requires `.env` file.

**Deferrals:** See [TRACKING.md § Open gaps](../../TRACKING.md#open-gaps-p0) for current P0 items (branch protection, Vercel monitor, post-deploy, journey CI).

## Exit criteria

- [ ] All P0 items in **Priority closure list** checked or deferred with owner/date/reason
- [ ] All acceptance proof sections above checked or deferred
- [ ] CI required checks block merge to `main`
- [ ] `verify:production` passes against production
- [ ] Operator can verify submission, receipt (`CDP-*`), evidence metadata, and audit trail end-to-end
- [ ] S12 tenancy remains **planned** until product confirms multi-operator SaaS need

## Rollback

N/A — verification slice. Re-open any falsely checked box if regression found.

## Drift risk

- New features added before closure completes
- Acceptance proof checkboxes updated without evidence
- S12 started while S1/S4/S7/S8/S9/S13 proof still open

## Related

- [iam-check-doctrine.md §7](../iam-check-doctrine.md#7-production-acceptance-checklist)
- [production-go-live.md](../../runbooks/production-go-live.md)
- [s15-e2e-journeys.md](./s15-e2e-journeys.md)
- [s12-tenancy.md](./s12-tenancy.md) — **frozen until S17 accepted**
