# G9 — Read-only upgrade and reconciliation planner

| Field | Value |
|-------|-------|
| Surface | `docs-V2/monorepo/g9-read-only-reconciliation-planner-contract.md` |
| Role | Contract for deterministic generator upgrade plans |
| Authority | `turbo/generators/engine/reconciliation-planner.ts` |
| Mode | Read-only `plan-upgrade` |
| Status | In progress until committed with passing closure gates |

G9 converts generator diagnostics into deterministic plans that explain future
changes without executing them. It is a planning surface only.

## Command surface

```bash
pnpm exec turbo gen erp-generator-plan-upgrade
pnpm exec turbo gen erp-generator-plan-upgrade-json
pnpm exec turbo gen kernel-generator-plan-upgrade
pnpm exec turbo gen kernel-generator-plan-upgrade-json
```

Default `turbo gen <family-generator>` remains doctor mode.

## Plan contract

Each operation records:

- generator family;
- package;
- current state;
- expected state;
- selected treatment;
- read-only action;
- reason;
- risk;
- file paths that a later apply mode may touch;
- automation classification;
- status;
- `writes: false`.

## Exclusions

- No file writes.
- No apply mode.
- No package creation.
- No feature creation.
- No projection lock writes.
- No kernel package repair.
- No rollback requirement, because no mutation occurs.

## Exit criteria

G9 is sealed only when:

1. `plan-upgrade` is exposed as a read-only mode for ERP and kernel generators.
2. Text and JSON plans are byte-stable across repeat runs.
3. Planner output is derived from diagnostics, not filename-only inference.
4. Every operation declares `writes: false`.
5. Unsupported or blocked diagnostics remain non-automatic.
6. Generator tests remain under `turbo/generators/__tests__`.
7. `pnpm exec vitest run turbo/generators/__tests__` passes.
8. `pnpm exec tsc --noEmit --pretty false` passes.
9. `pnpm generator:check` passes.
10. `pnpm validate:modules` passes.
11. `git diff --check` passes.
