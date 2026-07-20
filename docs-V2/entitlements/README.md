# Entitlements / ops toggles (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/entitlements/README.md` |
| Authority | **Scratch** — `@afenda/env` ops toggles; no `@afenda/feature-flags` |
| Purpose | Plan/tier DNA absorb/reject + living ops-toggle posture |
| Updated | 2026-07-20 |

DNA borrow/reject: [entitlements-dna.md](entitlements-dna.md).

Org **usage position** (capacity bands, not SKUs) lives under [../usage/README.md](../usage/README.md) — not this pack.

## Living posture

| Need | Surface |
|------|---------|
| Ops kill switches | Named booleans in [`@afenda/env`](../../packages/foundation/env) — not a flags SDK |
| Playground / harness | `PLAYGROUND_ENABLED` (local-only; never Vercel prod) |
| Org switcher / auth shell | `PORTAL_ORG_SWITCHER_ENABLED` · `GUARDIAN_AUTH_SHELL` |
| Plan/tier gates | **None** — Afenda does not sell by module; do not grow this pack into usage position |
| Org usage position | [`@afenda/admin/usage`](../../packages/control-plane/admin) — see [../usage](../usage/README.md) |
| Progressive delivery | **None** — design separately when Ops needs % / targeting |

## Must not

- Create `@afenda/feature-flags` from `_reference/packages/feature-flags`
- Treat Vierp HRM/CRM/MRP keys as Afenda catalog
- Trust client-supplied tier
- Confuse entitlements (what a plan includes) with progressive-delivery flags

## Verify

```bash
Test-Path packages/feature-flags   # expect False
rg "@afenda/feature-flags" apps packages
# ops toggles: packages/foundation/env/src/web.ts
```

DAG / env: [../system/README.md](../system/README.md) · [../monorepo/README.md](../monorepo/README.md).
