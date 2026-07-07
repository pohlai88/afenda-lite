# Production go-live runbook

**Audience:** operators and release engineers  
**Production URL:** https://iam-check.vercel.app  
**Repository:** https://github.com/pohlai88/iam-check

---

## Preflight

Before promoting a release or validating production:

- [ ] Vercel project `iam-check` is linked to the correct GitHub repository and branch
- [ ] Neon branch `production` (`br-young-term-aobkvd38`) is the database target for production `DATABASE_URL` only
- [ ] Neon branch `preview` (`br-red-dream-aoe3apvj`) is wired for Vercel Preview and CI — [preview-branch-setup.md](./preview-branch-setup.md)
- [ ] Migrations are applied on production (`npm run db:migrate` with production `DATABASE_URL`)
- [ ] If the database predates migration tracking, run `npm run db:backfill` once before migrate
- [ ] Required Vercel environment variables are set (names only — never commit values):
  - `DATABASE_URL`
  - `NEON_AUTH_BASE_URL`
  - `NEON_AUTH_COOKIE_SECRET`
  - `SHARED_ADMIN_EMAIL`
  - `SHARED_ADMIN_PASSWORD`
  - `SHARED_ADMIN_NAME`
  - `APP_URL` (production URL, e.g. `https://iam-check.vercel.app`)
  - `PREVIEW_CLIENT_EMAIL` (sandbox client for operator portal preview)
  - `PREVIEW_CLIENT_PASSWORD`
  - `PREVIEW_CLIENT_NAME` (optional display name)
  - `PLAYGROUND_ENABLED` (optional; set `true` to expose `/playground` UI review route)
  - `PLAYGROUND_SURVEY_ID`, `PLAYGROUND_ASSIGNMENT_ID`, `PLAYGROUND_SURVEY_SLUG` (from `seed:preview-client` output)
- [ ] Preview client seeded on production DB: `npm run seed:preview-client`
- [ ] Neon Auth **trusted domains** include:
  - `http://localhost:3000`
  - `https://iam-check.vercel.app`
  - Any custom production domain
- [ ] GitHub Actions secrets mirror CI needs (`DATABASE_URL_PREVIEW`, `NEON_AUTH_*_PREVIEW`, `SHARED_ADMIN_*`) — see [preview-branch-setup.md](../runbooks/preview-branch-setup.md)
- [ ] Vercel uptime monitor targets `GET /api/health/liveness` (not readiness)

---

## Plan

1. Confirm schema is current on the production Neon branch
2. Verify Vercel production env vars (names present, no secret values printed)
3. Run production readiness check (`npm run verify:production`)
4. Smoke operator login and one declaration create/share flow manually if needed
5. Confirm CI is green on the release commit (includes migrate + `seed:admin` + E2E)

---

## Commands

```bash
# List production env var names (Vercel CLI; requires login)
vercel env ls production

# Apply migrations against production (intentional — uses production DATABASE_URL)
npm run db:migrate

# Production readiness gate (no secrets printed)
npm run verify:production

# Override target URL if needed
PRODUCTION_URL=https://iam-check.vercel.app npm run verify:production

# Manual liveness curl (uptime / process up)
curl -sS https://iam-check.vercel.app/api/health/liveness | jq .

# Manual readiness curl (deploy gate — DB + auth + pooler)
curl -sS https://iam-check.vercel.app/api/health/readiness | jq .

# Local quality gates before deploy
npm run check:copy
npm run build
npm test
```

---

## Verification

| Check | Expected |
|-------|----------|
| `GET /api/health/liveness` | HTTP 200, `body.data.status === "alive"` (Vercel uptime monitor) |
| `GET /api/health/readiness` | HTTP 200, `body.data.status === "ready"` (use `npm run verify:production`; CI smoke accepts `degraded` when env is partial) |
| `npm run verify:production` | Exit 0, prints `Production readiness OK` |
| Operator login | `/org/login` → `/dashboard` with shared admin credentials |
| Create declaration | Dashboard create form redirects to `/dashboard/[id]` |
| Share links | Public `/survey/{slug}` and secure `/f/{token}` visible on detail page |
| CI | GitHub Actions green on PR / main |

Automated E2E (CI and local with `.env` creds):

- `e2e/smoke.spec.ts` — liveness, readiness, operator create, public submit
- `e2e/secure-file.spec.ts` — secure link + file metadata (`@journey`)
- `e2e/client-journey.spec.ts` — invite → onboard → assign → submit → `CDP-*` (`@journey`)

---

## Summary (fill after run)

```
Date:
Release / commit:
Migration status:
verify:production:
Operator smoke:
CI:
Notes:
```

---

## Next steps

- Enable or confirm branch protection on `main` (require CI green)
- Monitor `audit_events` after go-live for unexpected mutation patterns
- Re-run `npm run verify:production` after env or Neon Auth domain changes
- Confirm Vercel uptime uses `/api/health/liveness`, not readiness
- Document any custom domain in Neon Auth trusted domains before cutover

See also: [iam-check-doctrine.md §7](../architecture/iam-check-doctrine.md#7-production-acceptance-checklist), [S15 E2E journeys](../architecture/slices/s15-e2e-journeys.md).
