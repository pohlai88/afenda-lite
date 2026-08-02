# G13 — Kernel adoption apply

| Field | Value |
|-------|-------|
| Surface | `docs-V2/monorepo/g13-kernel-adoption-apply-contract.md` |
| Role | Contract for controlled kernel adoption treatment apply |
| Authority | `turbo/generators/kernel-generator/adoption-apply.ts` |
| Mode | Explicit write-capable Turborepo generator entrypoint |
| Status | In progress until committed with passing closure gates |

G13 applies only bounded kernel adoption treatments from the G9 read-only plan:

- missing `CONTRACT.md`;
- missing root `src/index.ts`;
- missing root `"."` package export.

## Command surface

```bash
pnpm exec turbo gen kernel-generator-apply-adoption
```

## Collision policy

- Missing generated file: write deterministic content.
- Existing matching generated file: skip.
- Existing non-matching generated file: fail.
- Existing package export: skip.
- Missing package JSON or invalid JSON: fail.

## Exclusions

- No semantic implementation of kernel package internals.
- No package dependency changes.
- No package rename or move.
- No ERP mutation.
- No deletion.
- No overwrite of non-matching existing generated files.

## Exit criteria

G13 is sealed only when:

1. Apply selects only kernel adoption operations from the G9 plan.
2. Contract, entrypoint, and root-export operations are independently tested.
3. Repeat apply skips matching files or existing root exports.
4. Non-matching generated files fail safely.
5. Generator tests pass.
6. TypeScript, `generator:check`, module validation, docs trunk ban, and diff
   hygiene pass.
