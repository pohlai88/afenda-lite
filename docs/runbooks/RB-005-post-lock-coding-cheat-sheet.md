# RB-005 Post-lock Coding Cheat Sheet

| Field | Value |
|-------|-------|
| ID | RB-005 |
| Category | Runbook |
| Version | 1.0.0 |
| Status | Living |
| Owner | Platform |
| Updated | 2026-07-13 |
| **Mode** | Runbook / command card |
| **Audience** | Engineers + agents |
| **Enables** | Consistent PRs after Decision lock §0 — without reopening Rejected / Deferred tenancy work |
| **Authority** | [ARCH-023 Decision lock](../architecture/turborepo/ARCH-023-multi-tenancy.md) |
| **Locked** | 2026-07-12 |

Print or pin this. One phase per turn. Fail closed on red checks.

---

## 1. Before any code

```powershell
# Name ONE phase — then run:
# (phase table below · closed scope: deprecation register — Closed product phases)
cd C:\JackProject\afenda-bolt\client-declaration-portal
npm run env:neon-production
npm run env:compose
npm run env:guard
```

| Phase ID | When |
|----------|------|
| `organization-admin-post-login` | `/dashboard/*` |
| `join` | `/join` |
| `account` | `/account` |
| `fft` | `/fft/*` — **no P3 flag promotion** |
| `pre-login` | `/` `/auth/*` only |

**Still closed:** `/client` · FFT P3 prod flags · D4/M5 denorm · D5 project-per-tenant · R1–R7

---

## 2. Consistency gates (every PR)

```powershell
npm run audit:tenancy-nulls
npm run check:tenancy-residue
npx tsc --noEmit
```

Optional before ship:

```powershell
npm run check:db-schema
npm run verify:vercel-db          # must show -pooler
npm run test:e2e:journey -- e2e/tenancy-isolation.spec.ts
```

| Must | Must not |
|------|----------|
| Hard `organization_id = $org` via `organizationScopeSql` | Soft `(IS NULL OR = $org)` |
| Org from session / sole membership / explicit `--organization-id` | `ORDER BY … LIMIT 1` first-org stamp |
| App `DATABASE_URL` = **`-pooler`** | Migrations through pooler |
| Zod + session guard on mutations | RLS / Data API as BFF tenancy fix |
| Thin `app/**/page.tsx` + `loading.tsx` | Half-stack (UI without action/domain) |

**Anti-claim:** never write “multi-DB isolation”, “project-per-tenant”, or “RLS protects BFF tenants.”

---

## 3. Weekly anti-drift (verify only)

Full ladder: [neon-tenancy-efficiency/reference.md](../../.cursor/skills/neon-tenancy-efficiency/reference.md)

```powershell
# Quick pack
npm run env:compose
npm run validate:env-sync
npm run verify:vercel-db
npm run audit:tenancy-nulls
npm run check:tenancy-residue
npm run audit:neon-auth-production
```

Do **not** raise CU or invent `FFT_ERP_*` to green checks (§0 **R7**).

---

## 4. Ops stamps (explicit org only)

```powershell
# Resolve Auth org id first (not NEON_ORG_ID):
# SELECT id, name, slug FROM neon_auth.organization ORDER BY "createdAt";

npm run audit:tenancy-nulls
node --env-file=.env scripts/backfill-fft-access.mjs --dry-run --organization-id=<auth-org-uuid>
# live write only when dry-run shows work:
node --env-file=.env scripts/backfill-fft-access.mjs --organization-id=<auth-org-uuid>
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

Set in `env.config` / `env.secret` → `npm run env:compose`. Slug must match live `neon_auth.organization` (`afenda-lite`).

---

## 5. Neon prod card (do not reinvent)

| Item | Value |
|------|-------|
| Cloud org | `org-fragrant-lake-90358173` (Launch) |
| Project | `young-hat-54755363` (**Afenda-Lite**) |
| Branch | `br-tiny-hill-ao82jp6f` (protected) |
| PITR | 7 days (Launch max) |
| Snapshots | Daily 17:00 UTC, retain 14d |
| Compute | 0.25–2 CU · suspend 0 |
| Region | `aws-ap-southeast-1` |

Detail: [multi-org-ops.md](./RB-001-multi-org-ops.md)

```powershell
# Avoid day-to-day neonctl link (rewrites .neon / pollutes .env)
npm run env:neon-production
npm run env:compose
```

---

## 6. Rejected / deferred flash card

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
| FFT P3 flags | Deferred | gate-register |

---

## 7. Slice DoD (fullstack-guardian)

```text
Frontend  route → features/* runner → loading.tsx · no business logic in app/page
Backend   action → Zod → requireSession → modules/*/domain → Neon
Security  proxy matcher · layout session · sanitizeReturnTo · parameterized SQL only
```

```powershell
# After slice
npx tsc --noEmit
npm run check:tenancy-residue
# + phase unit / interaction tests named in the phase task doc
```

---

## 8. Phase entry docs (load one)

| Track | Doc |
|-------|-----|
| Org admin | [ARCH-011](../architecture/ARCH-011-platform-tenancy-rbac.md) |
| Join | [ARCH-026](../architecture/turborepo/ARCH-026-auth-session.md) |
| Account | [ARCH-026](../architecture/turborepo/ARCH-026-auth-session.md) |
| Tenancy | [ARCH-023](../architecture/turborepo/ARCH-023-multi-tenancy.md) |
| FFT roadmap / ops | [FFT-MOD-010](../modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) · [FFT-MOD-008](../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) |
| Closed scope | [deprecation register — Closed product phases](../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md) |

---

## References

- Decision lock: [ARCH-023 Decision lock](../architecture/turborepo/ARCH-023-multi-tenancy.md)
- Ladder commands: [neon-tenancy-efficiency/reference.md](../../.cursor/skills/neon-tenancy-efficiency/reference.md)
- Deprecation register: [deprecation-and-migration/reference.md](../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md)
