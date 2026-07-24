# Payroll architecture decision log — PAY-DEC-002

## Decision

- ID: PAY-DEC-002
- Date: 2026-07-24
- Status: accepted
- Owners: payroll package
- Reviewers: human

## Context

[`module.manifest.ts`](../../../../packages/erp/payroll/src/module.manifest.ts) declares `lifecycle: "scaffolded"`. Scratch [`human-resource.md`](../../erp/human-resource.md) shows `lifecycle: "active"` as target. Premature `active` implies module enterprise readiness beyond current disk truth.

## Options considered

1. **Promote to `active` after Phase 1 exit gate** — command/query IDs, auth maps, tests, app stubs complete; domain commands still deferred.
2. **Promote only when first vertical slice ships (Phase 3+)** — stricter readiness bar.
3. **Leave `scaffolded` indefinitely** — avoids register drift but under-reports progress.

## Decision and rationale

**Selected: Option 1 (accepted).** Promote lifecycle to `active` when Phase 1 exit gate passes: populated IDs, auth alignment tests, export guard, app composition stubs, `pnpm --filter @afenda/payroll check` + `pnpm validate:modules` green. Domain command bodies remain future phases; `active` means **public contract complete**, not calculation-ready.

## Consequences

- Positive: Aligns manifest with module register expectations; clear gate for Phase 2.
- Negative/tradeoffs: `active` must not be interpreted as MOD enterprise readiness (separate MOD-009 evidence).
- Migration impact: None for lifecycle string change.
- Event/API compatibility impact: None.
- Testing impact: Manifest test updated to expect `active` after Phase 1 commit 5.
- Security/privacy impact: None.

## Verification

- [x] Phase 1 commits 1–5 complete
- [x] `pnpm validate:modules` green after lifecycle change
- [x] README lifecycle line updated
