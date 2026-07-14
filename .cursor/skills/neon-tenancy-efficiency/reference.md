# Neon multi-tenant best practice — copy-paste command set

| Field | Value |
|-------|-------|
| **Mode** | Runbook (operator execution) |
| **Audience** | Operators + engineers |
| **Enables** | Complete shared-schema Neon multi-tenant efficiency + anti-drift pass without inventing steps |
| **Authority** | [ARCH-023](../../../docs/architecture/ARCH-023-multi-tenancy.md) Operational considerations |
| **Skill** | [SKILL.md](SKILL.md) |
| **Shell** | PowerShell (Windows). Same `npm run …` works in bash. |
| **Branch** | `br-tiny-hill-ao82jp6f` (local = production Neon) |

**Anti-claim:** shared schema + hard `organization_id` only — not project-per-tenant, not Neon RLS on the BFF path.

**Fail closed:** if any step exits non-zero, stop. Do not raise compute CU or ship until that step is green.

**Env (ARCH-027 two-state):** On this **docs-first** checkout, Collapse `env:compose` / `env:guard` / product e2e ladders are **gated or absent** — do not recover them. Do **not** create `.env.local` or run `vercel env pull` before S4.1. After Target S4.1: `@afenda/env` + `.env.local` only. Blocks A/E/weekly that mention compose are **historical evidence (closed 2026-07-12)** plus Target-gated replay — not Living compose mandates.

---

## Purpose

Run the full Afenda-Lite Neon multi-tenant best-practice ladder when tooling exists: env alignment → pooler → tenancy integrity → SQL health → compute posture → auth → isolation proof. On docs-first, prefer Console + Neon MCP + available non-gated scripts; mark gated steps `BLOCKED`.

---

## Preconditions / access

- Repo root: `C:\JackProject\afenda-bolt\client-declaration-portal`
- Neon Console access for compute / protected branch / scale-to-zero
- Optional: `neonctl` auth for read-only inspect
- Docs-first: human `env.config` / `env.secret` (if present) are **inventory notes only** — not a live compose pipeline
- Target post-S4.1: `.env.local` via approved init; product tree under `apps/web`

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

**Ladder close:** A–E green for Afenda-Lite shared-schema tenancy efficiency. **Decision lock:** [ARCH-023 Decision lock](../../../docs/architecture/ARCH-023-multi-tenancy.md) — Rejected R1–R7 / Deferred D4·D5 / Allowed next. Coding must not reopen rejected or deferred rows without explicit user reopen.

**Identity cutover (2026-07-12):** Auth org slug/name **`afenda-lite`** (id `4587e4c8-8119-4761-91ce-b874d3493aad`); operator **`afenda@admin.com`**; `@iam-check.com` e2e junk **purged**. Local fixtures: `PORTAL_ORG_*` + `PORTAL_ORGANIZATION_ID` / `E2E_ORGANIZATION_ID` — see [post-lock cheat sheet](../../../docs/runbooks/RB-005-post-lock-coding-cheat-sheet.md) §4.

---

## A — Full npm ladder (historical closed 2026-07-12 · Target-gated replay)

**Docs-first:** do **not** run compose/`env:guard` as Living instructions. Prefer `validate:neon-env` (if present), `audit:vercel` (key names), Neon Console pooler check, and MCP auth audits. Report gated steps as `BLOCKED`.

**Target post-S4.1 replay** (when product tooling exists — no `env:compose`):

```powershell
cd C:\JackProject\afenda-bolt\client-declaration-portal
# A0 — Preconditions (@afenda/env + .env.local already valid)
pnpm validate:neon-env   # or successor Target script

# A1 — Config / pooler / Vercel key-name drift (no compose)
pnpm audit:vercel
pnpm verify:vercel-db    # when present — DATABASE_URL must contain -pooler

# A2 — Tenancy integrity
pnpm audit:tenancy-nulls
pnpm check:tenancy-residue
pnpm check:db-schema

# A3 — Neon Auth production
pnpm sync:neon-auth-manifest
pnpm audit:neon-auth-production

# A4 — Isolation proof (M3) — requires Target app
pnpm test:e2e:journey -- e2e/tenancy-isolation.spec.ts
```

### Pass criteria (A)

| Step | Pass means |
|------|------------|
| Docs-first pre-S4.1 | No `.env.local` created; no compose recovered |
| Target post-S4.1 | `@afenda/env` boot OK; `.env.local` only local runtime file |
| `verify:vercel-db` | `DATABASE_URL` contains `-pooler` |
| `audit:tenancy-nulls` | Zero nulls on eight hard tenant roots (when script exists) |
| `check:tenancy-residue` | No soft `(NULL OR org)` residue |
| Isolation e2e | Green only when Target app suite exists |

**Do not** invent placeholder `FFT_ERP_VENDOR` / `FFT_ERP_BASE_URL` to green A1 — those are tenant/ops-owned when enabling FFT ERP sync (2D-3).

### If pooler check fails

1. Neon Console → Connect → enable **Connection pooling** → set production `DATABASE_URL` to pooled URL via approved Vercel sync (not docs-first compose).
2. Re-verify pooler; ship only when intentional.

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

Optional read-only inspect (**do not** `neonctl link` routinely — it rewrites `.neon` / can pollute `.env`):

```powershell
npx neonctl@latest projects list
npx neonctl@latest branches list --project-id young-hat-54755363
npx neonctl@latest connection-string br-tiny-hill-ao82jp6f --project-id young-hat-54755363 --pooled
```

After a Console **Restart compute**, smoke:

```powershell
npm run check:production:post-deploy
```

---
## D — Domain anti-drift grep

```powershell
cd C:\JackProject\afenda-bolt\client-declaration-portal
# Target path when present — root modules/ is absent on docs-first (do not recover)
rg -n "FROM (surveys|client_|fft_)" apps/web/modules modules --glob "*.ts" 2>$null
rg -n "organizationScopeSql|organization_id\s*=\s*\$" apps/web/modules modules --glob "*.ts" 2>$null
```

Every tenant-root read/write must use hard `organization_id = $org` (via `organizationScopeSql` or equivalent). Missing filter = critical stop. On docs-first with no product tree, treat this block as N/A / historical.

**D closed 2026-07-12:** FFT RBAC `duplicateRole` / `ensureRoleAssignment` / `revokeRoleAssignment` / `setRoleActive` hard-scoped; closing-soon cron fans out per Auth org then scopes `fft_event`; `deleteClientProfileByUserId` org-scoped. Allowed unscoped: capability tokens (`slug`/`token`) and session `user_id` identity reads.

---

## E — Conditional ops (only when needed)

### E1 FFT access backfill (explicit org UUID)

Auth tenant (product) — **not** Neon Cloud `NEON_ORG_ID`:

```text
4587e4c8-8119-4761-91ce-b874d3493aad   # slug afenda-lite
```

```powershell
# Target / when backfill script exists — require explicit org; no docs-first compose
# Use approved env file for the checkout state (post-S4.1: .env.local via @afenda/env)
node scripts/backfill-fft-access.mjs --dry-run --organization-id=4587e4c8-8119-4761-91ce-b874d3493aad
# live write only when dry-run shows wouldGrant > 0:
node scripts/backfill-fft-access.mjs --organization-id=4587e4c8-8119-4761-91ce-b874d3493aad
```

Or set `$env:PORTAL_ORGANIZATION_ID` explicitly in the shell — never rely on Collapse compose.

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

## Weekly anti-drift pack

**Docs-first:** Console pooler + Neon MCP auth audit + SQL **B2 + B6**; skip gated product scripts (report `BLOCKED`).

**Target (when scripts exist — no compose):**

```powershell
cd C:\JackProject\afenda-bolt\client-declaration-portal
pnpm audit:vercel
pnpm verify:vercel-db
pnpm audit:tenancy-nulls
pnpm check:tenancy-residue
pnpm check:db-schema
pnpm audit:neon-auth-production
pnpm test:e2e:journey -- e2e/tenancy-isolation.spec.ts
```

Then re-run SQL **B2 + B6** in Neon SQL Editor.

---

## Escalation / stop conditions

| Symptom | Action |
|---------|--------|
| Pooler check fails | Fix production `DATABASE_URL` pooler via approved Vercel path → re-verify; do not raise CU; do not invent compose |
| Null org on roots | Fix writers; `audit:tenancy-nulls`; never first-org stamp with multiple Auth orgs |
| Isolation e2e red | Stop deploy; grep unscoped domain SQL (block D) |
| Pool timeouts | Confirm `-pooler`; shorten transactions; only then raise max CU |
| Cold starts | Disable scale-to-zero on prod endpoint (block C5) |

Rollback / recovery for org ops: [docs/runbooks/RB-001-multi-org-ops.md](../../../docs/runbooks/RB-001-multi-org-ops.md).

---

## Do not

- Run migrations or `pg_dump` on `-pooler`
- Enable Neon RLS on the product BFF path without a new ADR
- Treat project-per-tenant as a performance optimization (D5)
- Enable `PORTAL_ORG_SWITCHER_ENABLED` on Vercel without multi-membership + rollback
- Mix this ladder with FFT flag promotion or portal atmosphere work
- Reintroduce `iam-check` Auth slug / `admin@iam-check.com` / `@iam-check.com` fixture emails
- Use `neonctl link` as a routine env fix, or prescribe `env:compose` / create `.env.local` on docs-first pre-S4.1 (ARCH-027)

---

## References

- [ARCH-023](../../../docs/architecture/ARCH-023-multi-tenancy.md)
- [ARCH-023](../../../docs/architecture/ARCH-023-multi-tenancy.md)
- [multi-org-ops](../../../docs/runbooks/RB-001-multi-org-ops.md)
- [post-lock coding cheat sheet](../../../docs/runbooks/RB-005-post-lock-coding-cheat-sheet.md)
- [Neon multitenancy](https://neon.com/docs/guides/multitenancy)
- [Neon production checklist](https://neon.com/docs/get-started/production-checklist)
- [Neon connection pooling](https://neon.com/docs/connect/connection-pooling)
