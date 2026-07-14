---
name: neon-tenancy-efficiency
description: >-
  Runs Afenda-Lite shared-schema multi-tenant Neon Postgres efficiency
  checks and anti-drift gates (pooler, tenancy nulls, residue, pg_stat,
  auth, isolation e2e) and applies ARCH-023 platform IAM rules on the BFF
  path (hard organization_id, permission-first checks, session org binding).
  Use when optimizing Neon production, preventing tenancy drift, auditing
  DATABASE_URL pooler, reviewing org-scoped authz, or following
  multi-tenant ARCH-023 Operational considerations.
---

# Neon tenancy efficiency

**Host product:** Afenda-Lite · **Model:** shared schema + hard `organization_id` (not project-per-tenant)  
**SSOT:** [ARCH-023](../../../docs/architecture/ARCH-023-multi-tenancy.md) (multi-tenancy + platform RBAC + Decision lock) · **Ops:** [multi-org-ops](../../../docs/runbooks/RB-001-multi-org-ops.md)

## Platform IAM absorption (ARCH-023)

This farm owns **shared-schema tenancy + platform IAM application rules** from [ARCH-023](../../../docs/architecture/ARCH-023-multi-tenancy.md). Broader SoD catalogs, MFA/step-up policy overlays, and a dedicated `afenda-elite-rbac` skill stay **catalog candidate** until extensions prove a routing gap.

### Three-tier IAM (enforce)

```text
Tier 1  Neon Auth      identity + active organization (tenant)
Tier 2  Platform RBAC  fixed permission codes + org-scoped assignments + audit
Tier 3  Modules         hasPermission(code) only — never Neon/org role display names
```

| Rule | Agent must |
|------|------------|
| Hard tenant predicate | Every tenant-root read/write uses `organization_id = $org` / Target `withOrg(orgId)` — never soft `(NULL OR org)`, never first-org stamp |
| Explicit org | Resolve `orgId` from session and pass it — never ambient globals or URL-alone trust |
| Permission-first | Prefer platform permission codes over Neon Auth `owner\|admin\|member` or `user.role` for product authorization |
| Session + active org | Session binds user + active organization; org switch must re-authorize permissions (ARCH-023) |
| Module entry vs domain | Platform owns `fft.access`; FFT domain catalogs stay in FFT — do not merge into `platform_*` (R6) |
| Jobs / webhooks / export | Carry the same organization context and isolation rules as interactive BFF (fail closed if missing) |
| Search / cache keys | When search indexes or caches exist, key or filter by `organization_id` — no global keys from document number alone |
| RLS | Do **not** introduce Neon RLS on the BFF path (R3) |

### Seed permission codes (v1 — platform catalog)

```text
org.users.manage | org.roles.manage
declarations.manage | declarations.read
clients.invite | account.self
fft.access
```

Adding a code is a release; assigning it to a role is an org-admin action. Do not invent ERP SoD matrices here.

### Owns vs hand-off

| Concern | Owner |
|---------|-------|
| Org predicates, pooler, null audits, isolation e2e, three-tier IAM rules above | **This skill** |
| ActionResult / Zod / Action pipeline shape | `afenda-elite-api-contract` |
| `'use server'` public-endpoint mechanics / client secret ban | `afenda-elite-nextjs-best-practice` |
| Module port boundaries / ARCH-006 contexts | `afenda-elite-backend-modules` |
| Broader SoD / policy overlay / step-up product catalog | Keep `afenda-elite-rbac` **candidate** until controlled authority expands |

## Coding freeze (read before any tenancy PR)

**Locked 2026-07-12** in ARCH-023 **Decision lock**:

- **Rejected (R1–R7):** soft dual-mode, first-org stamp, RLS-as-default BFF, schema-per-tenant, project-per-tenant as efficiency fix, FFT domain catalog merge, CU/ERP placeholder hacks.
- **Deferred:** D4/M5 child denorm; D5 project fleet; prod org switcher; FFT P3 flags.
- **Allowed:** preserve hard org filters on new work; weekly anti-drift verify; named product slices that do not reopen R*/D*.

Do **not** start coding that “closes D5” or “adds RLS for tenancy” without user reopen of that ID.

**Human cheat sheet:** [docs/runbooks/RB-005-post-lock-coding-cheat-sheet.md](../../../docs/runbooks/RB-005-post-lock-coding-cheat-sheet.md)

## Context pack (load only these)

```
TASK: Neon shared-schema efficiency + anti-drift
SSOT: docs/architecture/ARCH-023-multi-tenancy.md (tenancy + RBAC + Decision lock)
OPS:  docs/runbooks/RB-001-multi-org-ops.md
CHEAT: docs/runbooks/RB-005-post-lock-coding-cheat-sheet.md
CODE: Target `@afenda/db` / `apps/web/modules/platform` when present — do not claim root `modules/` exists on docs-first checkout
BRANCH: br-tiny-hill-ao82jp6f (production Neon)
NEON CLOUD: org-fragrant-lake-90358173 · project young-hat-54755363 (Afenda-Lite)
AUTH TENANT: slug afenda-lite · id 4587e4c8-8119-4761-91ce-b874d3493aad
OPERATOR: SHARED_ADMIN_EMAIL=afenda@admin.com (secret via approved env surface — see ARCH-027)
ANTI-CLAIM: not multi-DB / not project-per-tenant / not RLS on BFF path
RETIRED: iam-check Auth slug · admin@iam-check.com · @iam-check.com e2e junk (purged)
ENV: ARCH-027 two-state — no compose / no `.env.local` before S4.1; `@afenda/env` + `.env.local` after S4.1
```

Do **not** flood with FFT phase docs or portal-atmosphere rules unless the user reopened that scope.

## Env posture (ARCH-027 — read before any env command)

| State | Instruction |
|-------|-------------|
| **Docs-first / pre-S4.1** | Compose/`env:guard`/`dev`/`audit:tenancy-*` ladders are **gated or absent** ([ARCH-028](../../../docs/architecture/ARCH-028-implementation-slices.md)). Do **not** recover Collapse compose scripts or `lib/env/`. Do **not** create `.env.local` or run `vercel env pull`. Prefer Neon MCP / Console / `validate:neon-env` when available. Historical A–E ladder results (2026-07-12) are evidence history — not a live compose mandate. |
| **Target post-S4.1** | `@afenda/env` + `.env.local` only; no `env:compose`. Pooler/`DATABASE_URL` checks use Target tooling. |

## Rules of engagement

1. Fail closed: stop the ladder on the first red check; do not “tune CU” over a broken pooler or null org.
2. App/Vercel runtime = **`-pooler`** `DATABASE_URL`. Migrations / `pg_dump` = **direct** endpoint.
3. Never stamp first org (`ORDER BY … LIMIT 1`) when multiple Auth orgs exist — require explicit `--organization-id` / org id from approved env surface.
4. Do not propose Neon RLS, Data API tenant tables, or project-per-tenant (D5) as a performance fix.
5. Neon Console autoscaling / scale-to-zero / protected branch are operator-owned — verify live; do not invent git-tracked CU numbers.
6. Auth identity SSOT is **afenda-lite** / `afenda@admin.com` — do not reintroduce `iam-check` slug or `admin@iam-check.com`.
7. Avoid day-to-day `neonctl link` (rewrites `.neon` / can pollute env files). Do **not** prescribe `env:compose` on this docs-first checkout.

## Workflow

**Command detail:** [reference.md](reference.md) — blocks **A → E** are **historical / Target-gated**. On docs-first, run only commands that exist and are non-gated; otherwise use Console + MCP and report `BLOCKED` / `NOT EVIDENCED` for skippable steps.

Track progress (template — last full pass **A–E closed 2026-07-12** under pre-Collapse tooling; see [reference.md](reference.md)):

```
Progress:
- [ ] 0 Preconditions (docs-first: skip compose; validate Neon identity/branch)
- [ ] 1 Config / pooler drift (docs-first: Vercel key-name audit / Console; no compose)
- [ ] 2 Tenancy integrity (gated until Target product tree — report gate status)
- [ ] 3 Query / index health (SQL via Neon SQL Editor / MCP)
- [ ] 4 Neon compute posture (Console)
- [ ] 5 Auth + isolation (gated e2e until Target app; MCP auth audit when available)
- [ ] 6 Report (pass/fail/BLOCKED per step)
```

### Step 0 — Preconditions

Docs-first: confirm branch/project IDs via Neon MCP/`validate:neon-env` if present. Do **not** run `env:compose` / `env:guard` as Living instructions.

### Step 1 — Config / pooler drift

Docs-first: `npm run audit:vercel` / Console Connect (pooler) when available — key **names** only. Fix production `DATABASE_URL` pooler via approved Vercel sync path when shipping; never invent local compose.

### Step 2 — Tenancy integrity

When Target product tooling exists: `audit:tenancy-nulls` · `check:tenancy-residue` · `check:db-schema`. On docs-first: report scripts **gated/unavailable** — do not recover Collapse script bodies.

### Step 3 — Query / index health

Run SQL from [reference.md](reference.md) on a **direct** connection (Neon SQL Editor / MCP): `pg_stat_statements`, connections, org indexes.

### Step 4 — Neon compute posture

Console target (ARCH-023 ops): protected default branch; autoscaling min sized for LFC; max for spikes; **scale-to-zero off** for user-facing prod. Confirm with `neonctl` / Console — do not change CU without user approval.

### Step 5 — Auth + isolation

Prefer `sync:neon-auth-manifest` / `audit:neon-auth-production` / Neon MCP when available. Isolation e2e requires Target app — do not claim pass on docs-first without the suite.

### Step 6 — Report

Return a short table: step → pass/fail/BLOCKED → exact command or Console/MCP summary. Propose one next action only if failed.

## Weekly anti-drift pack

Full one-liner set: [reference.md](reference.md#weekly-anti-drift-pack).

## Do not

- Raise CU before pooler + short transactions + org-leading indexes are green
- Enable `PORTAL_ORG_SWITCHER_ENABLED` on Vercel without multi-membership + rollback
- Mix this lane with FFT flag promotion or portal atmosphere work
- Reintroduce `iam-check` Auth slug / `admin@iam-check.com` / `@iam-check.com` fixture emails
- Run `neonctl link` as a routine env fix, or prescribe `env:compose` / `.env.local` on this docs-first checkout (ARCH-027)

## Related

- Full commands + SQL → [reference.md](reference.md)
- Catalog: [using-afenda-elite-skills/catalog.md](../using-afenda-elite-skills/catalog.md)
- Method companions: `context-engineering` · `source-driven-development` (Neon official docs) · `shipping-and-launch` (post-deploy only when asked)
