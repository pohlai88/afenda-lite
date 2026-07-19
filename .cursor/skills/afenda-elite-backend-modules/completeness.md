# Portal backend modules — completeness (program history)

Plan authority: this skill + companions + disk `apps/web/modules/**` + [deprecation register — Closed product phases](../agent-skills/skills/deprecation-and-migration/reference.md). Living `docs/architecture/` dormant.

**Checkout posture:** Rows marked **Done (historical)** were closed on the pre-Collapse product tree (2026-07-12). Root `modules/` / `app/` / `features/` remain absent by design — do not recover. Target living modules under `apps/web/modules/{platform,identity}`; features `{auth,org-admin}`. Declarations + FFT product modules **removed** (nuclear wipe).

| Slice | Plan | Evidence kind | Status |
|-------|------|---------------|--------|
| Module tree `platform/identity` | Exact L2 folders | Target `apps/web/modules` | **Living** — platform + identity only |
| Declarations / FFT product modules | Removed | Disk absent; deprecation register | **Removed (wiped)** |
| No `modules/trade/` / `features/trade/` product | Forbidden | Absent | **Done** |
| No `lib/` architecture drawer | Absorb runners | `lib/` gone; do not recreate | **Done** |
| Shared Zod + `parseSchema` on Platform | Identity import Platform | Historical Actions | **Done (historical)** |
| Identity ↛ wiped Declarations trees | Zero imports | Rule remains | **Done (rule)** |
| Platform ↛ wiped product domain compose | No product compose in Platform | Rule remains | **Done (rule)** |
| api-now Route Handlers | health / auth / session | Living allowlist | **Done (contract)** — no declaration-draft |
| Actions map (identity RBAC / invite / auth) | adapter-map | Disk + logical map | **Living** |
| Org users / Platform copy / runners / RBAC UI | Product slices | Pre-Collapse + Target | **Done (historical) / living identity** |
| Hard tenant roots | Tenancy | `platform_role_assignment` · `platform_rbac_audit` | **Living ops** |
| `/client` Declarations workspace | Removed | Nuclear wipe | **Removed (wiped)** |
| FFT 2B–2D / P3 flag promotion | Removed | Nuclear wipe | **Removed (wiped)** — not frozen |
| SaaS billing / 2FA product | Deferred chrome | Registered | **Intentional (registered)** |

## Stabilization (latest)

- Hard multi-tenant cutover + M1–M4: hard `organizationScopeSql`; required `organizationId`; Users via `neon_auth.member`; fail-closed org resolve; CI `check:tenancy-residue` + `audit:tenancy-nulls`
- Declarations draft RH + FFT module access **removed** with product domains
- Shell entitlement resolve stays in portal-chrome features when present
- Closed-scope / wiped-domain items remain registered (no reopen without named approval)

## Verify

Docs-first: `pnpm checks` (docs gates). Product unit/tsc scripts require Target tree — report `BLOCKED` if absent; do not recover Collapse scripts.

```bash
pnpm checks
# Target only, when apps/web/modules exists:
# pnpm exec tsc --noEmit
# pnpm test:unit -- apps/web/modules/...
```
