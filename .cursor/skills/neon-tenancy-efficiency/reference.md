# Neon multi-tenant best practice — copy-paste command set

| Field | Value |
|-------|-------|
| **Mode** | Runbook (operator execution) |
| **Audience** | Operators + engineers |
| **Enables** | Complete shared-schema Neon multi-tenant efficiency + anti-drift pass without inventing steps |
| **Authority** | [multi-tenant-ecosystem.md](../../../doc/architecture/multi-tenant-ecosystem.md) §5–§7 |
| **Skill** | [SKILL.md](SKILL.md) |
| **Shell** | PowerShell (Windows). Same `npm run …` works in bash. |
| **Branch** | `br-tiny-hill-ao82jp6f` (local = production Neon) |

**Anti-claim:** shared schema + hard `organization_id` only — not project-per-tenant, not Neon RLS on the BFF path.

**Fail closed:** if any step exits non-zero, stop. Do not raise compute CU or ship until that step is green.

---

## Purpose

Run the full Afenda-Lite Neon multi-tenant best-practice ladder: env alignment → pooler → tenancy integrity → SQL health → compute posture → auth → isolation proof.

---

## Preconditions / access

- Repo root: `C:\JackProject\afenda-bolt\client-declaration-portal`
- `env.config` + `env.secret` present (gitignored)
- Neon Console access for compute / protected branch / scale-to-zero
- Optional: `neonctl` auth for read-only inspect
- Optional: Playwright deps for isolation e2e (`npx playwright install` once)

```powershell
cd C:\JackProject\afenda-bolt\client-declaration-portal
```

---

## Progress checklist

```
- [x] A  Full npm ladder (blocks A0–A5) — closed 2026-07-12
- [x] B  SQL health pack (Neon SQL Editor — direct connection) — closed 2026-07-12
- [x] C  Neon Console posture — closed 2026-07-12 (Launch; PITR 7d; daily snapshots; protected)
- [x] D  Domain anti-drift grep — closed 2026-07-12 (hard-root org filters hardened)
- [x] E  Optional backfill — E1 dry-run no-op (wouldGrant=0); live write skipped
```

**Ladder close:** A–E green for Afenda-Lite shared-schema tenancy efficiency. **Decision lock:** [multi-tenant-ecosystem.md §0](../../../doc/architecture/multi-tenant-ecosystem.md) — Rejected R1–R7 / Deferred D4·D5 / Allowed next. Coding must not reopen rejected or deferred rows without explicit user reopen.

---

## A — Full npm ladder (copy entire block)

Stop on first failure.

```powershell
# A0 — Preconditions
cd C:\JackProject\afenda-bolt\client-declaration-portal
npm run env:neon-production
npm run env:guard
npm run validate:neon-env

# A1 — Config / pooler / Vercel key-name drift
npm run env:compose
npm run check:env-manifest-drift
npm run validate:env-sync
npm run verify:vercel-db
npm run audit:vercel

# A2 — Tenancy integrity (shared-schema contract)
npm run audit:tenancy-nulls
npm run check:tenancy-residue
npm run check:db-schema

# A3 — Neon Auth production
npm run sync:neon-auth-manifest
npm run audit:neon-auth-production

# A4 — Isolation proof (M3)
npm run test:e2e:journey -- e2e/tenancy-isolation.spec.ts

# A5 — Done when all above exit 0
Write-Host "A-ladder PASS — continue to SQL pack B and Console pack C"
```

### Pass criteria (A)

| Step | Pass means |
|------|------------|
| `env:guard` | No `.env.local` override |
| `verify:vercel-db` | `DATABASE_URL` contains `-pooler` |
| `validate:env-sync` | Canonical keys green; `FFT_ERP_VENDOR` / `FFT_ERP_BASE_URL` may be unset (`syncOptional`) |
| `audit:tenancy-nulls` | Zero nulls on eight hard tenant roots |
| `check:tenancy-residue` | No soft `(NULL OR org)` residue |
| Isolation e2e | Missing-UUID cases green |

**Do not** invent placeholder `FFT_ERP_VENDOR` / `FFT_ERP_BASE_URL` to green A1 — those are tenant/ops-owned when enabling FFT ERP sync (2D-3).

### If `verify:vercel-db` fails (pooler)

1. In Neon Console → Connect → enable **Connection pooling** → copy pooled URL into `env.secret` as `DATABASE_URL`.
2. Re-run:

```powershell
npm run env:compose
npm run verify:vercel-db
# Ship only when intentional:
# npm run sync:vercel
# vercel deploy --prod --yes
```

---

## B — SQL health pack (Neon SQL Editor — **direct** connection)

Use the **non-pooler** connection string for this block. Paste as one script or statement groups.

```sql
-- B1 Enable query stats (once per database)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- B2 Connection / pool pressure
SHOW max_connections;

SELECT usename, state, count(*)
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY usename, state
ORDER BY count(*) DESC;

-- B3 Org indexes on hard tenant roots (migration 027 contract)
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'surveys',
    'client_invitations',
    'client_profiles',
    'client_assignments',
    'fft_event',
    'fft_sales_member',
    'fft_role',
    'fft_role_assignment'
  )
  AND indexdef ILIKE '%organization_id%'
ORDER BY tablename, indexname;

-- B4 NOT NULL on hard roots (expect zero rows)
SELECT 'surveys' AS t, count(*) AS nulls FROM surveys WHERE organization_id IS NULL
UNION ALL SELECT 'client_invitations', count(*) FROM client_invitations WHERE organization_id IS NULL
UNION ALL SELECT 'client_profiles', count(*) FROM client_profiles WHERE organization_id IS NULL
UNION ALL SELECT 'client_assignments', count(*) FROM client_assignments WHERE organization_id IS NULL
UNION ALL SELECT 'fft_event', count(*) FROM fft_event WHERE organization_id IS NULL
UNION ALL SELECT 'fft_sales_member', count(*) FROM fft_sales_member WHERE organization_id IS NULL
UNION ALL SELECT 'fft_role', count(*) FROM fft_role WHERE organization_id IS NULL
UNION ALL SELECT 'fft_role_assignment', count(*) FROM fft_role_assignment WHERE organization_id IS NULL;

-- B5 Auth org registry (for ops — never stamp LIMIT 1 blindly)
SELECT id, name, slug, "createdAt"
FROM neon_auth.organization
ORDER BY "createdAt" ASC NULLS LAST;

-- B6 Slow / frequent statements
SELECT
  calls,
  round(total_exec_time::numeric, 2) AS total_ms,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  left(query, 120) AS query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 25;
```

### Pass criteria (B)

| Check | Pass means |
|-------|------------|
| B3 | Each of the eight tables has an `organization_id` index |
| B4 | All `nulls` = 0 |
| B6 | No unexpected seq-scan / missing-org-filter patterns in top queries |

---

## C — Neon Console posture (manual; no git CU numbers)

On project production branch `br-tiny-hill-ao82jp6f`:

```
- [x] C1 Branch is root + default
- [x] C2 Branch is protected
- [x] C3 Autoscaling min CU — ACCEPT 0.25 for beta (measure before raising)
- [x] C4 Autoscaling max CU — 2 (spike headroom)
- [x] C5 Scale-to-zero DISABLED (suspend_timeout_seconds=0)
- [x] C6 Instant restore history — 7 days (604800; Launch max)
- [x] C7 Snapshot schedule — daily 17:00 UTC, retain 14d + manual baseline
- [x] C8 Region matches Vercel app region (aws-ap-southeast-1 ↔ sin1)
```

**C-pack verdict (2026-07-12):** ACCEPT WITH OPS FOLLOW-UPS completed for C6/C7. Compute unchanged 0.25–2. Sources: [history window](https://neon.com/docs/introduction/history-window) · [backup & restore](https://neon.com/docs/guides/backup-restore). Launch PITR max is **7 days** (not 14 — Scale only).

Optional read-only inspect:

```powershell
npx neonctl@latest projects list
npx neonctl@latest branches list --project-id <project-id>
npx neonctl@latest connection-string br-tiny-hill-ao82jp6f --project-id <project-id> --pooled
```

After a Console **Restart compute**, smoke:

```powershell
npm run check:production:post-deploy
```

---
## D — Domain anti-drift grep

```powershell
cd C:\JackProject\afenda-bolt\client-declaration-portal
rg -n "FROM (surveys|client_|fft_)" modules --glob "*.ts"
rg -n "organizationScopeSql|organization_id\s*=\s*\$" modules --glob "*.ts"
```

Every tenant-root read/write must use hard `organization_id = $org` (via `organizationScopeSql` or equivalent). Missing filter = critical stop.

**D closed 2026-07-12:** FFT RBAC `duplicateRole` / `ensureRoleAssignment` / `revokeRoleAssignment` / `setRoleActive` hard-scoped; closing-soon cron fans out per Auth org then scopes `fft_event`; `deleteClientProfileByUserId` org-scoped. Allowed unscoped: capability tokens (`slug`/`token`) and session `user_id` identity reads.

---

## E — Conditional ops (only when needed)

### E1 FFT access backfill (explicit org UUID from B5)

```powershell
npm run env:compose
node --env-file=.env scripts/backfill-fft-access.mjs --dry-run --organization-id=<org-uuid>
node --env-file=.env scripts/backfill-fft-access.mjs --organization-id=<org-uuid>
```

### E2 Migrations (use **direct** `DATABASE_URL`, not pooler)

```powershell
# Temporarily point DATABASE_URL at direct endpoint in a throwaway shell if needed, then:
npm run db:migrate
npm run audit:tenancy-nulls
```

### E3 Cross-org isolation fixtures (optional)

```powershell
$env:E2E_FOREIGN_SURVEY_ID = "<uuid>"
$env:E2E_FOREIGN_USER_ID = "<uuid>"
$env:E2E_FOREIGN_EVENT_ID = "<uuid>"
npm run test:e2e:journey -- e2e/tenancy-isolation.spec.ts
```

---

## Weekly anti-drift pack (A only)

```powershell
cd C:\JackProject\afenda-bolt\client-declaration-portal
npm run env:neon-production
npm run env:guard
npm run check:env-manifest-drift
npm run verify:vercel-db
npm run audit:vercel
npm run audit:tenancy-nulls
npm run check:tenancy-residue
npm run check:db-schema
npm run audit:neon-auth-production
npm run test:e2e:journey -- e2e/tenancy-isolation.spec.ts
```

Then re-run SQL **B2 + B6** in Neon SQL Editor.

---

## Escalation / stop conditions

| Symptom | Action |
|---------|--------|
| Pooler check fails | Fix `DATABASE_URL` → recompose → re-verify; do not raise CU |
| Null org on roots | Fix writers; `audit:tenancy-nulls`; never first-org stamp with multiple Auth orgs |
| Isolation e2e red | Stop deploy; grep unscoped domain SQL (block D) |
| Pool timeouts | Confirm `-pooler`; shorten transactions; only then raise max CU |
| Cold starts | Disable scale-to-zero on prod endpoint (block C5) |

Rollback / recovery for org ops: [docs/runbooks/multi-org-ops.md](../../../docs/runbooks/multi-org-ops.md).

---

## Do not

- Run migrations or `pg_dump` on `-pooler`
- Enable Neon RLS on the product BFF path without a new ADR
- Treat project-per-tenant as a performance optimization (D5)
- Enable `PORTAL_ORG_SWITCHER_ENABLED` on Vercel without multi-membership + rollback
- Mix this ladder with FFT flag promotion or portal atmosphere work

---

## References

- [multi-tenant-ecosystem.md](../../../doc/architecture/multi-tenant-ecosystem.md)
- [ADR-002](../../../doc/backend/adr/002-platform-tenancy-rbac.md)
- [multi-org-ops](../../../docs/runbooks/multi-org-ops.md)
- [post-lock coding cheat sheet](../../../docs/runbooks/post-lock-coding-cheatsheet.md)
- [Neon multitenancy](https://neon.com/docs/guides/multitenancy)
- [Neon production checklist](https://neon.com/docs/get-started/production-checklist)
- [Neon connection pooling](https://neon.com/docs/connect/connection-pooling)
