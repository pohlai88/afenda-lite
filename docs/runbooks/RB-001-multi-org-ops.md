# RB-001 Multi-org Ops

| Field | Value |
|-------|-------|
| **ID** | RB-001 |
| **Category** | Runbook |
| **Version** | 1.1.0 |
| **Status** | Living |
| **Control State** | Closed |
| **Owner** | Platform |
| **Updated** | 2026-07-14 |

---

# 1. Purpose

Operator runbook for multi-org tenancy backfills, null audits, recovery posture, and isolation checks after M1–M3.

**Authority:** [ARCH-023 Multi-Tenancy Model](../architecture/ARCH-023-multi-tenancy.md) (architecture SSOT — Neon shared-schema posture + production efficiency).  
**Audience:** operators applying tenancy backfills after M1–M3.

---

# 2. Scope

## 2.1 In scope

- Explicit Neon Auth organization id resolution
- FFT access backfill and tenant-root null audit
- Neon production recovery posture (PITR / snapshots)
- Migrations and isolation smoke related to multi-org

## 2.2 Out of scope

- Product feature design (owned by ARCH-023 / FFT module spines)
- Reopening Rejected / Deferred Decision lock rows without explicit approval

---

# 3. Procedure

## 3.1 Rules

1. **Never** stamp “first org” from `neon_auth.organization ORDER BY … LIMIT 1` when more than one Auth org exists.
2. Pass an explicit Neon Auth organization id for any script that fills null `organization_id` rows.
3. Prefer row-scoped `organization_id` already on tenant tables; fallback only when the CLI/env org is provided.

## 3.2 Resolve organization id

```sql
SELECT id, name, slug, "createdAt"
FROM neon_auth.organization
ORDER BY "createdAt" ASC NULLS LAST;
```

Use the id for the tenant you intend to backfill — not Neon Cloud `NEON_ORG_ID`.

## 3.3 FFT access backfill

```bash
pnpm env:compose
node --env-file=.env scripts/backfill-fft-access.mjs --dry-run --organization-id=<org-uuid>
node --env-file=.env scripts/backfill-fft-access.mjs --organization-id=<org-uuid>
```

Or: `PORTAL_ORGANIZATION_ID=<org-uuid> pnpm backfill:fft-access`.

If every candidate row already has `organization_id`, the flag is optional.

## 3.4 Null audit

```bash
pnpm audit:tenancy-nulls
```

Must report zero nulls on the eight hard tenant roots after Gate 0 / migration `027`.

## 3.5 Auth tenant org (product)

Do not confuse Neon Cloud `NEON_ORG_ID` with Neon Auth organization id.

| Field | Value (prod as of 2026-07-12) |
|-------|-------------------------------|
| Auth org id | `4587e4c8-8119-4761-91ce-b874d3493aad` |
| Slug / name | `afenda-lite` |
| Count | 1 Auth org on production branch |
| Operator login | `SHARED_ADMIN_EMAIL=afenda@admin.com` (password in `env.secret`) |
| Local env | `PORTAL_ORG_SLUG` / `PORTAL_ORG_NAME` / `PORTAL_ORGANIZATION_ID` / `E2E_ORGANIZATION_ID` — see [post-lock cheat sheet](./RB-005-post-lock-coding-cheat-sheet.md) §3.4 |

## 3.6 FFT access backfill evidence (E1 — 2026-07-12)

```text
Dry-run: wouldGrant=0 (no-op — rows already stamped)
Live write: skipped (nothing to grant)
Command: node --env-file=.env scripts/backfill-fft-access.mjs --dry-run --organization-id=4587e4c8-8119-4761-91ce-b874d3493aad
```

## 3.7 Neon production recovery posture (C-pack)

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

## 3.8 Migrations

```bash
pnpm db:migrate
```

M2: `028_scoped_template_key_unique.sql` — scoped `(organization_id, template_key)` uniqueness.

## 3.9 Org switcher (M1)

Local / staged multi-org chrome:

```bash
# env.config
PORTAL_ORG_SWITCHER_ENABLED=true
pnpm env:compose
```

Do not enable on Vercel production until operators have a second membership and a rollback plan.

## 3.10 Isolation smoke (M3)

```bash
# Always: missing UUID → not-found
pnpm test:e2e:journey -- e2e/tenancy-isolation.spec.ts

# Optional foreign fixtures (cross-org):
# E2E_FOREIGN_SURVEY_ID / E2E_FOREIGN_USER_ID / E2E_FOREIGN_EVENT_ID
```

## 3.11 E2E FFT allowlist org resolve (D8 closed)

`testing/e2e/fft-allowlist.ts` resolves org in this order:

1. `PORTAL_ORGANIZATION_ID` or `E2E_ORGANIZATION_ID` (explicit fixture)
2. Sole `neon_auth.member` row for the operator user
3. Fail closed if the user has multiple memberships without an explicit org

---

# 4. References

| ID / Evidence | Relationship |
| --- | --- |
| [ARCH-023](../architecture/ARCH-023-multi-tenancy.md) | Tenancy Decision lock / Living SSOT |
| [RB-005](./RB-005-post-lock-coding-cheat-sheet.md) | Post-lock command card |
| [neon-tenancy-efficiency/reference.md](../../.cursor/skills/neon-tenancy-efficiency/reference.md) | Efficiency ladder A→E |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.1.0 | 2026-07-14 | DOC-003 six-section retrofit; package-manager commands remain `pnpm`. |
| 1.0.2 | 2026-07-14 | Bounded reopen: package-manager cutover — document `pnpm` / `pnpm exec` (repo SSOT `packageManager` + `pnpm-lock.yaml`). |

---

# 6. Notes

Runnable A→E command set: [`.cursor/skills/neon-tenancy-efficiency/reference.md`](../../.cursor/skills/neon-tenancy-efficiency/reference.md). **Closed 2026-07-12** (A–E). Accepted constraints (not backlog): **D4** deferred M5, **D5** shared-schema non-goal.
