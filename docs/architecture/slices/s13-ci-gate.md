# S13 — CI quality gate

| Field | Value |
|-------|-------|
| **Status** | shipped |
| **Sequence** | 14 |
| **Depends on** | S10 (tests), S0 (migrate smoke) |
| **Feeds into** | Vercel deploy promotion |

## Purpose

Automated proof on every pull request.

## Inputs / outputs

- **Inputs:** GitHub Actions on push/PR
- **Outputs:** `.github/workflows/ci.yml` job results

## Owned files (to create)

- `.github/workflows/ci.yml`
- `scripts/check-portal-terminology.mjs`
- `package.json` script: `"check:copy"`

## CI steps

1. `npm ci`
2. `npm run build`
3. `npm run check:copy`
4. `npm run db:migrate` (when `DATABASE_URL` secret configured)
5. Future: `npm test` after E2E slice

## Critical control points

- PR cannot merge on build failure (branch protection required in GitHub settings)

## Failure modes

- Migrate step skipped → production schema drift undetected
- No branch protection → CI is advisory only

## Required tests

- CI runs green on `main`
- Intentional build break fails CI

## Acceptance proof

- [x] Workflow file committed
- [ ] Required checks configured on `main` (GitHub repo setting)
- [x] Copy grep script passes on current components

## Rollback

Disable workflow or remove required check; does not affect runtime.

## Open question

**Assumption:** Test DB uses a dedicated Neon branch or GitHub secret `DATABASE_URL_TEST`.
