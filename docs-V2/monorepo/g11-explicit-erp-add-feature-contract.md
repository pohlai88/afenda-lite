# G11 — Explicit ERP add feature

| Field | Value |
|-------|-------|
| Surface | `docs-V2/monorepo/g11-explicit-erp-add-feature-contract.md` |
| Role | Contract for governed ERP feature scaffolding |
| Authority | `turbo/generators/erp-generator/feature-scaffold.ts` |
| Mode | Explicit write-capable Turborepo generator entrypoint; not promoted into the internal family contract modes |
| Status | In progress until committed with passing closure gates |

G11 creates a feature scaffold inside an existing ERP package from explicit
module and feature identifiers.

## Command surface

```bash
pnpm exec turbo gen erp-generator-add-feature --args <module-id> <feature-id>
```

Both arguments must be kebab-case.

## Generated surface

The scaffold creates:

- `src/features/<feature-id>/index.ts`;
- `src/features/<feature-id>/README.md`;
- `__tests__/<module-id>.<feature-id>.feature.test.ts`.

## Collision policy

The generator refuses to run if the target package is missing or the target
feature directory already exists. It does not merge, patch, rename, or delete
pre-existing feature files.

## Exclusions

- No operation registry mutation.
- No permission mutation.
- No database schema creation.
- No app route, UI, endpoint, or package export mutation.
- No treatment/apply/recovery mode.

## Exit criteria

G11 is sealed only when:

1. Add-feature planning is deterministic.
2. Apply writes only the declared file set.
3. Generated tests are under `__tests__`.
4. Missing package and existing feature collisions fail before writes.
5. Invalid module/feature names fail before writes.
6. Generator tests pass.
7. TypeScript, `generator:check`, module validation, docs trunk ban, and diff
   hygiene pass.
