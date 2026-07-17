# RB-005 Post-lock Coding Cheat Sheet

| Field | Value |
|-------|-------|
| **ID** | RB-005 |
| **Category** | Runbook |
| **Version** | 1.2.0 |
| **Status** | Living |
| **Control State** | Closed |
| **Owner** | Platform |
| **Updated** | 2026-07-17 |

---

# 1. Purpose

Command card for engineers and agents after Decision lock §0 — one phase per turn, fail closed on red checks, without reopening Rejected / Deferred tenancy work.

**Authority:** [ARCH-023 Decision lock](../architecture/ARCH-023-multi-tenancy.md)  
**Locked:** 2026-07-12

---

# 2. Scope

## 2.1 In scope

- Pre-code env alignment and phase selection
- Consistency gates and weekly anti-drift verify packs
- Explicit-org ops stamps and Neon prod card
- Rejected / Deferred flash card and slice DoD

## 2.2 Out of scope

- Reopening Decision lock Rejected / Deferred rows without explicit user approval
- FFT P3 production flag promotion without FFT-MOD-008 reopen

---

# 3. Procedure

Print or pin this. One phase per turn. Fail closed on red checks.

## 3.1 Before any code

```powershell
# Name ONE phase — then run:
# (phase table below · closed scope: deprecation register — Closed product phases)
cd C:\JackProject\afenda-bolt\afenda-lite
# Ensure .env.local has production Neon Auth + pooler DATABASE_URL
pnpm validate:neon-env
```

| Phase ID | When |
|----------|------|
| `organization-admin-post-login` | `/dashboard/*` |
| `join` | `/join` |
| `account` | `/account` |
| `fft` | `/fft/*` — **no P3 flag promotion** |
| `pre-login` | `/` `/auth/*` only |

**Still closed:** `/client` · FFT P3 prod flags · D4/M5 denorm · D5 project-per-tenant · R1–R7

## 3.2 Consistency gates (every PR)

```powershell
pnpm audit:tenancy-nulls
pnpm check:tenancy-residue
pnpm exec tsc --noEmit
```

Optional before ship:

```powershell
pnpm check:db-schema
pnpm verify:vercel-db          # must show -pooler
pnpm test:e2e:journey -- e2e/tenancy-isolation.spec.ts
```

| Must | Must not |
|------|----------|
| Hard `organization_id = $org` via `organizationScopeSql` | Soft `(IS NULL OR = $org)` |
| Org from session / sole membership / explicit `--organization-id` | `ORDER BY … LIMIT 1` first-org stamp |
| App `DATABASE_URL` = **`-pooler`** | Migrations through pooler |
| Zod + session guard on mutations | RLS / Data API as BFF tenancy fix |
| Thin `app/**/page.tsx` + `loading.tsx` | Half-stack (UI without action/domain) |

**Anti-claim:** never write “multi-DB isolation”, “project-per-tenant”, or “RLS protects BFF tenants.”

## 3.3 Weekly anti-drift (verify only)

Full ladder: [neon-tenancy-efficiency/reference.md](../../.cursor/skills/neon-tenancy-efficiency/reference.md)
Auth domains + deploy health detail: [RB-001 §3.12](./RB-001-multi-org-ops.md)

```powershell
# Quick pack (Target env — ARCH-027 / S4.1+) — live scripts only
pnpm validate:neon-env
pnpm audit:neon-auth-production
pnpm check:production:post-deploy
pnpm audit:tenancy-nulls
pnpm check:tenancy-residue
```

Do **not** use collapsed inventory aliases as green paths (`pnpm audit:vercel` · `pnpm configure:neon-auth-production` → `exit 1`). Confirm Vercel **READY** in the dashboard when deploy evidence is needed.

Do **not** raise CU or invent `FFT_ERP_*` to green checks (§0 **R7**).

## 3.4 Ops stamps (explicit org only)

```powershell
# Resolve Auth org id first (not NEON_ORG_ID):
# SELECT id, name, slug FROM neon_auth.organization ORDER BY "createdAt";

pnpm audit:tenancy-nulls
node --env-file=.env.local scripts/backfill-fft-access.mjs --dry-run --organization-id=<auth-org-uuid>
# live write only when dry-run shows work:
node --env-file=.env.local scripts/backfill-fft-access.mjs --organization-id=<auth-org-uuid>
```

E2E allowlist org (D8): `PORTAL_ORGANIZATION_ID` or `E2E_ORGANIZATION_ID` → else sole membership → fail if multi-org.

Local fixture (Auth tenant `afenda-lite`, not Neon Cloud):

```text
PORTAL_ORG_SLUG=afenda-lite
PORTAL_ORG_NAME=afenda-lite
PORTAL_ORG_SWITCHER_ENABLED=false
PORTAL_ORGANIZATION_ID=4587e4c8-8119-4761-91ce-b874d3493aad
E2E_ORGANIZATION_ID=4587e4c8-8119-4761-91ce-b874d3493aad
SHARED_ADMIN_EMAIL=afenda@admin.com
```

Set in `.env.local`. Schema: `packages/env/src/web.ts`. Slug must match live `neon_auth.organization` (`afenda-lite`).

## 3.5 Neon prod card (do not reinvent)

| Item | Value |
|------|-------|
| Cloud org | `org-fragrant-lake-90358173` (Launch) |
| Project | `young-hat-54755363` (**Afenda-Lite**) |
| Branch | `br-tiny-hill-ao82jp6f` (protected) |
| PITR | 7 days (Launch max) |
| Snapshots | Daily 17:00 UTC, retain 14d |
| Compute | 0.25–2 CU · suspend 0 |
| Region | `aws-ap-southeast-1` |

Detail: [RB-001](./RB-001-multi-org-ops.md)

```powershell
# Avoid day-to-day neonctl link (rewrites .neon / pollutes local env)
pnpm validate:neon-env
```

## 3.6 Rejected / deferred flash card

| ID | Status | Action |
|----|--------|--------|
| R1 soft dual-mode | Rejected | Never |
| R2 first-org LIMIT 1 | Rejected | Never |
| R3 RLS-as-BFF default | Rejected | Need Data API ADR |
| R4 schema-per-tenant | Rejected | Infra program |
| R5/D5 project-per-tenant | Rejected / non-goal | Compliance program only |
| R6 FFT domain→platform merge | Rejected | FFT + ADR reopen |
| R7 CU / ERP placeholder hacks | Rejected | Evidence / 2D-3 pack |
| D4/M5 child `organization_id` | Deferred | User reopen + AC |
| Prod org switcher | Deferred | Multi-membership + rollback |
| FFT P3 flags | Deferred | [FFT-MOD-008](../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) |

## 3.7 Slice DoD (fullstack-guardian)

```text
Frontend  route → features/* runner → loading.tsx · no business logic in app/page
Backend   action → Zod → requireSession → modules/*/domain → Neon
Security  proxy matcher · layout session · sanitizeReturnTo · parameterized SQL only
```

```powershell
# After slice
pnpm exec tsc --noEmit
pnpm check:tenancy-residue
# + phase unit / interaction tests named in the phase task doc
```

## 3.8 Phase entry docs (load one)

| Track | Doc |
|-------|-----|
| Org admin | [ARCH-023](../architecture/ARCH-023-multi-tenancy.md) |
| Join | [ARCH-026](../architecture/ARCH-026-auth-session.md) |
| Account | [ARCH-026](../architecture/ARCH-026-auth-session.md) |
| Tenancy | [ARCH-023](../architecture/ARCH-023-multi-tenancy.md) |
| FFT roadmap / ops | [FFT-MOD-010](../modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) · [FFT-MOD-008](../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) |
| Closed scope | [deprecation register — Closed product phases](../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md) |

---

# 4. References

| ID / Evidence | Relationship |
| --- | --- |
| [ARCH-023 Decision lock](../architecture/ARCH-023-multi-tenancy.md) | Binding Rejected / Deferred rows |
| [RB-001](./RB-001-multi-org-ops.md) | Multi-org ops detail · N15 domains/deploy |
| [neon-tenancy-efficiency/reference.md](../../.cursor/skills/neon-tenancy-efficiency/reference.md) | Ladder commands |
| [deprecation-and-migration/reference.md](../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md) | Closed product phases |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.2.0 | 2026-07-17 | N15: weekly pack uses live Auth/deploy scripts; drop collapsed `audit:vercel` green claim; path → afenda-lite. |
| 1.1.0 | 2026-07-14 | DOC-003 six-section retrofit; package-manager commands remain `pnpm`. |
| 1.0.2 | 2026-07-14 | Bounded reopen: package-manager cutover — document `pnpm` / `pnpm exec` (repo SSOT `packageManager` + `pnpm-lock.yaml`). |

---

# 6. Notes

One phase per PR/agent turn. Fail closed. Do not reopen Decision lock rows from this card.
