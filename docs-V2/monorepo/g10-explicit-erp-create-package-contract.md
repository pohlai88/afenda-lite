# G10 — Explicit ERP create package

| Field | Value |
|-------|-------|
| Surface | `docs-V2/monorepo/g10-explicit-erp-create-package-contract.md` |
| Role | Contract for governed ERP package creation |
| Authority | `turbo/generators/erp-generator/package-scaffold.ts` |
| Mode | Explicit write-capable Turborepo generator entrypoint; not promoted into the internal family contract modes |
| Status | In progress until committed with passing closure gates |

G10 introduces the first bounded write-capable generator operation. It creates a
new ERP package only from an explicit semantic package spec.

## Command surface

```bash
pnpm exec turbo gen erp-generator-create-package --args <module-id> <category>
```

Both arguments must be kebab-case.

## Generated surface

The scaffold creates:

- `package.json`;
- `tsconfig.json`;
- `README.md`;
- `src/index.ts`;
- `src/operation-registry.ts`;
- `src/permissions.ts`;
- `src/composition/module.manifest.ts`;
- `__tests__/<module-id>.scaffold.test.ts`.

## Collision policy

The generator refuses to overwrite an existing package directory. It does not
merge, patch, rename, or delete pre-existing files.

## Exclusions

- No package creation without explicit module id and category.
- No workspace-edge authorization update.
- No database schema creation.
- No app route, UI, endpoint, or permission catalog mutation.
- No feature generation.
- No treatment/apply/recovery mode.

## Exit criteria

G10 is sealed only when:

1. Create-package planning is deterministic.
2. Apply writes only the declared file set.
3. Generated tests are under `__tests__`.
4. Existing package collision fails before any write.
5. Invalid module/category names fail before any write.
6. Generator tests pass.
7. TypeScript, `generator:check`, module validation, docs trunk ban, and diff
   hygiene pass.
