# RB-001 Multi-org Ops

| Field | Value |
|-------|-------|
| ID | RB-001 |
| Category | Runbook |
| Version | 1.0.1 |
| Status | Living |
| Control State | Closed |
| Owner | Platform |
| Updated | 2026-07-14 |
**Authority:** [ARCH-023 Multi-Tenancy Model](../architecture/ARCH-023-multi-tenancy.md) (architecture SSOT — Neon shared-schema posture + production efficiency)  
**Audience:** operators applying tenancy backfills after M1–M3.

## Rules

1. **Never** stamp “first org” from `neon_auth.organization ORDER BY … LIMIT 1` when more than one Auth org exists.
2. Pass an explicit Neon Auth organization id for any script that fills null `organization_id` rows.
3. Prefer row-scoped `organization_id` already on tenant tables; fallback only when the CLI/env org is provided.

## Resolve organization id

```sql
SELECT id, name, slug, "createdAt"
FROM neon_auth.organization
ORDER BY "createdAt" ASC NULLS LAST;
```

Use the id for the tenant you intend to backfill — not Neon Cloud `NEON_ORG_ID`.

## FFT access backfill

```bash
npm run env:compose
node --env-file=.env scripts/backfill-fft-access.mjs --dry-run --organization-id=<org-uuid>
node --env-file=.env scripts/backfill-fft-access.mjs --organization-id=<org-uuid>
```

Or: `PORTAL_ORGANIZATION_ID=<org-uuid> npm run backfill:fft-access`.

If every candidate row already has `organization_id`, the flag is optional.

## Null audit

```bash
npm run audit:tenancy-nulls
```

Must report zero nulls on the eight hard tenant roots after Gate 0 / migration `027`.

## Auth tenant org (product)

Do not confuse Neon Cloud `NEON_ORG_ID` with Neon Auth organization id.

| Field | Value (prod as of 2026-07-12) |
|-------|-------------------------------|
| Auth org id | `4587e4c8-8119-4761-91ce-b874d3493aad` |
| Slug / name | `afenda-lite` |
| Count | 1 Auth org on production branch |
| Operator login | `SHARED_ADMIN_EMAIL=afenda@admin.com` (password in `env.secret`) |
| Local env | `PORTAL_ORG_SLUG` / `PORTAL_ORG_NAME` / `PORTAL_ORGANIZATION_ID` / `E2E_ORGANIZATION_ID` — see [post-lock cheat sheet](./RB-005-post-lock-coding-cheat-sheet.md) §4 |

## FFT access backfill evidence (E1 — 2026-07-12)

```text
Dry-run: wouldGrant=0 (no-op — rows already stamped)
Live write: skipped (nothing to grant)
Command: node --env-file=.env scripts/backfill-fft-access.mjs --dry-run --organization-id=4587e4c8-8119-4761-91ce-b874d3493aad
```

## Neon production recovery posture (C-pack)

**Org / project:** `org-fragrant-lake-90358173` (Launch) · `young-hat-54755363` (**Afenda-Lite**) · branch `br-tiny-hill-ao82jp6f` (`production`, protected).

| Control | Target | Notes |
|---------|--------|-------|
| PITR / history window | **7 days** (`history_retention_seconds=604800`) | Launch plan **maximum** — 14-day PITR requires Scale. Docs: [history window](https://neon.com/docs/introduction/history-window) |
| Snapshot schedule | Daily **17:00 UTC**, retain **14 days** | Root branch only. Docs: [backup & restore](https://neon.com/docs/guides/backup-restore) |
| Manual snapshots | Before migrations / bulk imports / destructive ops | Name: `pre-<change>-YYYY-MM-DD` |
| Compute | min **0.25** / max **2** / suspend **0** | Do not raise min CU without latency evidence |
| Region | `aws-ap-southeast-1` | Matches Vercel `sin1` |

**PITR vs snapshots:** history covers “something broke sometime yesterday”; named snapshots cover “known-good before Release X.” Use both.

### Restore drill record (2026-07-12)

```text
Source restore point: snap-icy-dawn-aoymlta8 (baseline-afenda-lite-cpack-2026-07-12)
Restored branch:      br-fancy-violet-aovhd2a5 (restore-drill-cpack-2026-07-12)
Recovery start:       2026-07-12T08:45:06Z
Recovery completed:   restore_status=restored; SQL ok (surveys=75, fft_event=35, auth_orgs=1, surveys_null_org=0)
Application smoke:    SQL connectivity + tenant-root counts on drill branch (finalize_restore=false — prod untouched)
Data validation:      PASS
Cleanup completed:    drill branch deleted; production remains protected=true default=true
Operator:             agent + operator approval (C-pack recommendation)
```

## Migrations

```bash
npm run db:migrate
```

M2: `028_scoped_template_key_unique.sql` — scoped `(organization_id, template_key)` uniqueness.

## Org switcher (M1)

Local / staged multi-org chrome:

```bash
# env.config
PORTAL_ORG_SWITCHER_ENABLED=true
npm run env:compose
```

Do not enable on Vercel production until operators have a second membership and a rollback plan.

## Isolation smoke (M3)

```bash
# Always: missing UUID → not-found
npm run test:e2e:journey -- e2e/tenancy-isolation.spec.ts

# Optional foreign fixtures (cross-org):
# E2E_FOREIGN_SURVEY_ID / E2E_FOREIGN_USER_ID / E2E_FOREIGN_EVENT_ID
```

## E2E FFT allowlist org resolve (D8 closed)

`testing/e2e/fft-allowlist.ts` resolves org in this order:

1. `PORTAL_ORGANIZATION_ID` or `E2E_ORGANIZATION_ID` (explicit fixture)
2. Sole `neon_auth.member` row for the operator user
3. Fail closed if the user has multiple memberships without an explicit org

## Efficiency ladder

Runnable A→E command set: [`.cursor/skills/neon-tenancy-efficiency/reference.md`](../../.cursor/skills/neon-tenancy-efficiency/reference.md). **Closed 2026-07-12** (A–E). Accepted constraints (not backlog): **D4** deferred M5, **D5** shared-schema non-goal.
