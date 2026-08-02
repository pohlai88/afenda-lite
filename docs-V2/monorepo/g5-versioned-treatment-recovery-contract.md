# G5 — Versioned ERP Upgrade / Treatment / Recovery Contract

## Boundary

G5 owns the versioned treatment plan for ERP generator diagnostics.

It does not discover ERP packages, classify layout, project manifests, compute
locks, or parse explicit create/add-feature specs. Those remain owned by G1–G4.
G5 consumes canonical diagnostics and returns deterministic treatment/recovery
steps.

## Semantic owner

`turbo/generators/erp-generator/treatment-authority.ts`

## Schema

`afenda.erp-treatment-authority/v1`

## Inputs

- Canonical generator diagnostics.
- Treatment authority version.
- Requested upgrade target version.

## Outputs

- Versioned treatment plan.
- Per-diagnostic treatment step.
- Recovery classification:
  - automatic upgrade
  - automatic reconcile
  - remove superseded surface
  - semantic decision required
  - collision recovery
  - unsupported diagnostic

## Rules

1. Treatment is derived from diagnostic code and treatment class.
2. Diagnostics remain the first-line detection authority.
3. G5 must not create a second manifest, layout, lock, or explicit-spec registry.
4. Read-only planning is the only G5 behavior in this slice.
5. Mutating upgrade/reconcile/apply modes require a later explicit slice.
6. Blocked diagnostics cannot be converted into automatic actions.
7. Unknown diagnostic codes are treated as unsupported recovery.
8. Output ordering is byte-stable by package, code, path, and action kind.

## Current treatment map

| Code | Treatment | G5 action | Automatic |
| --- | --- | --- | --- |
| `AFG-ERP-001` | `semantic-decision-required` | request semantic decision | no |
| `AFG-ERP-002` | `collision` | resolve manifest collision | no |
| `AFG-ERP-101` | `collision` | resolve package root collision | no |
| `AFG-ERP-102` | `auto-upgrade` | upgrade to feature-first layout | yes |
| `AFG-ERP-103` | `remove-superseded` | remove local layout script | yes |
| `AFG-ERP-104` | `auto-upgrade` | repair feature-local imports | yes |
| `AFG-ERP-201` | `auto-reconcile` | reconcile projection lock | yes |

## Closure evidence

- G5 treatment plan is deterministic.
- Blocked/collision diagnostics stay non-automatic.
- Unsupported diagnostics do not receive fake recovery.
- Tests live under `turbo/generators/__tests__`.
- Generator tests, Biome, TypeScript, `generator:check`, module validation, ERP
  doctor, and diff hygiene pass.

