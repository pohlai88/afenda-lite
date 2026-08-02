# G3 ERP Projection Lock And Reconciliation Contract

| Field | Value |
|-------|-------|
| Surface | `docs-V2/monorepo/g3-erp-projection-lock-contract.md` |
| Authority | Scratch pre-implementation contract |
| Owner | Platform Architecture |
| Updated | 2026-08-03 |
| Scope | G3 only: ERP projection locks and reconciliation |
| Prerequisite | G1 implementation green; G2.1 read-only layout diagnosis present |

This file freezes the G3 entry boundary. It is not a second generator authority.
Once implemented, the typed ERP generator contract and tests own executable
rules.

## G3.1 Entry Slice

G3 begins with read-only projection lock diagnosis only. The ERP generator must:

- define normative versus informational projection classes;
- compute normalized projection-input digests from named semantic owners;
- report the deterministic expected lock path for every ERP package;
- diagnose missing or stale locks as `auto-reconcile` warnings;
- avoid writing lock files until a later explicit reconciliation slice.

## Projection Classes

| Projection | Class | Canonical inputs |
|------------|-------|------------------|
| `module-manifest` | Normative | module definition, operation registry, workspace edge register, canonical manifest |
| `public-api-inventory` | Informational | package public API inventory |
| `layout-convergence` | Informational | ERP layout authority report |

Normative projections are future reconciliation gates. Informational projections
may document or assist migration, but cannot own business semantics.

## Lock Path

The deterministic package lock path is:

```text
packages/erp/<module-id>/src/composition/generator.lock.json
```

G3.1 must not create this file. Missing locks are expected until the first
write-mode reconciliation slice.

## Closure Requirements

G3.1 closes when:

- ERP doctor JSON and text include projection-lock evidence;
- missing lock diagnostics are deterministic and non-blocking;
- input digests are stable under path ordering and line-ending normalization;
- all generator tests remain under `turbo/generators/__tests__`;
- `pnpm generator:check`, `pnpm validate:modules`, root `tsc`, Biome, and
  generator tests pass;
- no package source movement, G4 create/add-feature, or G5 migration recovery is
  started.
