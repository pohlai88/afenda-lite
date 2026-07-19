# Portal backend modules — completeness (program history)

Plan authority: this skill + companions + disk `apps/web/modules/**` + [deprecation register — Closed product phases](../agent-skills/skills/deprecation-and-migration/reference.md). Living `docs/architecture/` dormant.

**Checkout posture:** Rows marked **Done (historical)** were closed on the pre-Collapse product tree (2026-07-12). Root `modules/` / `app/` / `features/` remain absent by design — do not recover. Target shell under `apps/web/modules/{platform,identity,declarations,fft}` is **present (ARCH-028 S7.3)** with thin `orgId` domain ports; `apps/web/features/{auth,declarations,fft,org-admin}` shells are **present (S7.4)**; full Living inventory / Actions / RH remain open (S8.x+). DB/Neon ops rows remain Living ops facts where still true in production Neon.

| Slice | Plan | Evidence kind | Status |
|-------|------|---------------|--------|
| Module tree `platform/identity/declarations/fft` | Exact L2 folders | Historical disk; Target `apps/web/modules` | **Partial (Target shell)** — S7.3 ports + S7.4 feature consumers on disk; full L2 inventory open |
| No `modules/trade/` / `features/trade/` product | Forbidden | Absent | **Done** |
| No `lib/` architecture drawer | Absorb runners | `lib/` gone; do not recreate | **Done** |
| Shared Zod + `parseSchema` on Platform | Trade/Identity import Platform | Historical Actions | **Done (historical)** |
| Trade ↛ Declarations imports | Ban | Rule remains | **Done (rule)** |
| Identity ↛ Declarations (any) | Zero imports | Rule remains | **Done (rule)** |
| Platform ↛ Declarations / FFT domain | No product compose in Platform | Rule remains | **Done (rule)** |
| api-now Route Handlers (4 trees) | Only health/auth/draft | Living allowlist | **Done (contract)** — not docs-first disk inventory |
| Actions map (`account/admin/client/declarations/surveys/fft`) | adapter-map | Logical map | **Done (historical / Target shape)** |
| Org users / ClientProfile / Platform copy / runners / RBAC UI | Product slices | Pre-Collapse wiring | **Done (historical)** |
| Declarations / FFT `organization_id` scope | Tenancy | Prod Neon `027`/`028` | **Done (ops)** |
| FFT module entry / multi-org M1–M4 | ARCH-023 | Prod + docs | **Done (ops / Living)** |
| `/client` workspace restore | Closed + reopen checklist | Registered close | **Closed (registered)** |
| FFT P3 flag promotion | gate-register | Prod flags off | **Closed (registered)** |
| SaaS billing / 2FA product | Deferred chrome | Registered | **Intentional (registered)** |

## Stabilization (latest)

- Hard multi-tenant cutover + M1–M4: hard `organizationScopeSql`; required `organizationId`; `027`/`028`; no `promoteLegacy`; Users via `neon_auth.member`; fail-closed org resolve; org-required backfill; CI `check:tenancy-residue` + `audit:tenancy-nulls`
- Relocated draft Route Handler compose → `modules/declarations/api/client-declaration-draft-route*` (Platform no longer imports Declarations)
- Relocated shell entitlement resolve → `features/portal-chrome/resolve-shell-access.ts`; FFT gate → `modules/fft/auth/fft-module-access.ts` (Platform no longer imports FFT)
- Reliance registry: dropped stale `domain:auth` on admin-declaration-detail / admin-access-share → **26/26** surfaces aligned
- Closed-scope items remain registered (no reopen)

## Verify

Docs-first: `pnpm checks` (docs gates). Product unit/tsc/reliance scripts require Target tree — report `BLOCKED` if absent; do not recover Collapse scripts.

```bash
pnpm checks
# Target only, when apps/web/modules exists:
# pnpm exec tsc --noEmit
# pnpm test:unit -- apps/web/modules/...
```
