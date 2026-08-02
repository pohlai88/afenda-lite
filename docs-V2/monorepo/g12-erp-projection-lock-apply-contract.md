# G12 — ERP projection lock apply

| Field | Value |
|-------|-------|
| Surface | `docs-V2/monorepo/g12-erp-projection-lock-apply-contract.md` |
| Role | Contract for the first controlled ERP treatment apply operation |
| Authority | `turbo/generators/erp-generator/projection-lock-apply.ts` |
| Mode | Explicit write-capable Turborepo generator entrypoint |
| Status | In progress until committed with passing closure gates |

G12 applies only the low-risk ERP projection-lock treatment emitted by the G9
read-only planner. It does not perform layout rewrites, feature import repairs,
or superseded-file deletion.

## Command surface

```bash
pnpm exec turbo gen erp-generator-reconcile-projection-locks
```

This command writes missing `src/composition/generator.lock.json` files from the
current read-only ERP upgrade plan.

## Collision policy

- Missing lock file: write the deterministic lock document.
- Existing matching lock file: skip.
- Existing non-matching lock file: fail before writing any lock.

## Exclusions

- No feature-first layout migration.
- No import rewriting.
- No retired script deletion.
- No package creation.
- No feature creation.
- No kernel package repair.
- No overwrite of non-matching existing lock files.

## Exit criteria

G12 is sealed only when:

1. Projection-lock apply selects only G9 `reconcile-projection` operations.
2. Every write target is declared by the read-only plan.
3. Non-matching existing locks fail before writes.
4. Repeat apply skips matching locks.
5. Tests cover write, skip, conflict, and operation filtering.
6. Generator tests pass.
7. TypeScript, `generator:check`, module validation, docs trunk ban, and diff
   hygiene pass.
