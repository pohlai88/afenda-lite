---
name: neon-tenancy-efficiency
description: >-
  Runs Afenda-Lite shared-schema multi-tenant Neon Postgres efficiency
  checks and anti-drift gates (pooler, tenancy nulls, residue, pg_stat,
  auth, isolation e2e). Use when optimizing Neon production, preventing
  tenancy drift, auditing DATABASE_URL pooler, or following
  multi-tenant-ecosystem.md §6 production posture.
---

# Neon tenancy efficiency

**Host product:** Afenda-Lite · **Model:** shared schema + hard `organization_id` (not project-per-tenant)  
**SSOT:** [doc/architecture/multi-tenant-ecosystem.md](../../../doc/architecture/multi-tenant-ecosystem.md) · **ADR:** [002](../../../doc/backend/adr/002-platform-tenancy-rbac.md) · **Ops:** [multi-org-ops](../../../docs/runbooks/multi-org-ops.md)

## Coding freeze (read before any tenancy PR)

**Locked 2026-07-12** in ecosystem **§0**:

- **Rejected (R1–R7):** soft dual-mode, first-org stamp, RLS-as-default BFF, schema-per-tenant, project-per-tenant as efficiency fix, FFT domain catalog merge, CU/ERP placeholder hacks.
- **Deferred:** D4/M5 child denorm; D5 project fleet; prod org switcher; FFT P3 flags.
- **Allowed:** preserve hard org filters on new work; weekly anti-drift verify; named product slices that do not reopen R*/D*.

Do **not** start coding that “closes D5” or “adds RLS for tenancy” without user reopen of that ID.

**Human cheat sheet:** [docs/runbooks/post-lock-coding-cheatsheet.md](../../../docs/runbooks/post-lock-coding-cheatsheet.md)

## Context pack (load only these)

```
TASK: Neon shared-schema efficiency + anti-drift
SSOT: doc/architecture/multi-tenant-ecosystem.md (§5–§7)
ADR:  doc/backend/adr/002-platform-tenancy-rbac.md
OPS:  docs/runbooks/multi-org-ops.md
CODE: modules/platform/db.ts · db-config.ts · organization-scope.ts
BRANCH: br-tiny-hill-ao82jp6f (local = production Neon)
ANTI-CLAIM: not multi-DB / not project-per-tenant / not RLS on BFF path
```

Do **not** flood with FFT phase docs or portal-atmosphere rules unless the user reopened that scope.

## Rules of engagement

1. Fail closed: stop the ladder on the first red check; do not “tune CU” over a broken pooler or null org.
2. App/Vercel runtime = **`-pooler`** `DATABASE_URL`. Migrations / `pg_dump` = **direct** endpoint.
3. Never stamp first org (`ORDER BY … LIMIT 1`) when multiple Auth orgs exist — require `--organization-id`.
4. Do not propose Neon RLS, Data API tenant tables, or project-per-tenant (D5) as a performance fix.
5. Neon Console autoscaling / scale-to-zero / protected branch are operator-owned — verify live; do not invent git-tracked CU numbers.

## Workflow

**Copy-paste command set (SSOT for execution):** [reference.md](reference.md) — blocks **A → E**.

Track progress (template for a new run — last full pass **A–E closed 2026-07-12**; see [reference.md](reference.md)):

```
Progress:
- [ ] 0 Preconditions
- [ ] 1 Config / pooler drift
- [ ] 2 Tenancy integrity
- [ ] 3 Query / index health (SQL)
- [ ] 4 Neon compute posture (Console)
- [ ] 5 Auth + isolation e2e
- [ ] 6 Report (pass/fail per step)
```

### Step 0 — Preconditions

```powershell
npm run env:neon-production
npm run env:guard
npm run validate:neon-env
```

### Step 1 — Config / pooler drift

```powershell
npm run env:compose
npm run check:env-manifest-drift
npm run validate:env-sync
npm run verify:vercel-db
npm run audit:vercel
```

`verify:vercel-db` must show pooler. If not: fix `DATABASE_URL` in `env.secret` → `env:compose` → `sync:vercel` only when shipping.

### Step 2 — Tenancy integrity

```powershell
npm run audit:tenancy-nulls
npm run check:tenancy-residue
npm run check:db-schema
```

Nulls on eight hard roots = stop. Residue / soft dual-mode = stop. Targeted backfill only with explicit org — see [reference.md](reference.md).

### Step 3 — Query / index health

Run SQL from [reference.md](reference.md) on a **direct** connection: `pg_stat_statements`, connections, org indexes. Grep domain for unscoped tenant roots before raising compute.

### Step 4 — Neon compute posture

Console target (doc §6.2): protected default branch; autoscaling min sized for LFC; max for spikes; **scale-to-zero off** for user-facing prod. Confirm with `neonctl` / Console — do not change CU without user approval.

### Step 5 — Auth + isolation

```powershell
npm run sync:neon-auth-manifest
npm run audit:neon-auth-production
npm run test:e2e:journey -- e2e/tenancy-isolation.spec.ts
```

### Step 6 — Report

Return a short table: step → pass/fail → exact command output summary. Propose one next action only if failed.

## Weekly anti-drift pack

Full one-liner set: [reference.md](reference.md#weekly-anti-drift-pack).

## Do not

- Raise CU before pooler + short transactions + org-leading indexes are green
- Enable `PORTAL_ORG_SWITCHER_ENABLED` on Vercel without multi-membership + rollback
- Mix this lane with FFT flag promotion or portal atmosphere work

## Related

- Full commands + SQL → [reference.md](reference.md)
- Borrowed: `context-engineering` (selective load) · `source-driven-development` (Neon official docs) · `shipping-and-launch` (post-deploy only when asked)
