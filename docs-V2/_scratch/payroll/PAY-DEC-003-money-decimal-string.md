# Payroll architecture decision log — PAY-DEC-003

## Decision

- ID: PAY-DEC-003
- Date: 2026-07-24
- Status: accepted
- Owners: payroll package
- Reviewers: payroll-architect (Phase 0)

## Context

Monetary amounts appear in `PayrollEmployeeQueryPort` as `string` ([`ports.ts`](../../../../packages/erp/payroll/src/ports.ts)). Payroll domain rules forbid JavaScript `number` for money ([`domain.md`](../../../../.cursor/skills/afenda-elite-payroll/domain.md)). Repo has no shared `@afenda/money` package today.

## Options considered

1. **Lossless decimal strings at all boundaries** — serialize/store as string; parse with explicit scale in calculation engine.
2. **Branded Zod money type in payroll `schemas/common.ts`** — wrapper around string + currency + scale metadata.
3. **Integer minor units (bigint)** — align with some payment modules; higher migration cost.

## Decision and rationale

**Selected: Option 1 for Phase 1–7.** Use string decimal at port and event boundaries (matches scratch port contract and HR compensation handoff patterns). Introduce branded money schema in Phase 2 column design or Phase 7 calculation engine if repetition warrants — not blocking Phase 1.

## Consequences

- Positive: Consistent with current port DTO; no new dependency.
- Negative/tradeoffs: Calculation engine must enforce scale/rounding explicitly in Phase 7.
- Migration impact: Phase 2 numeric columns use exact decimal/numeric per `@afenda/db` conventions.
- Event/API compatibility impact: Payment/posting events use amount strings (Phase 8).
- Testing impact: Golden fixtures use string amounts with explicit rounding tests.
- Security/privacy impact: None beyond existing redaction rules.

## Verification

- [x] Documented in REPOSITORY_ALIGNMENT.md §2
- [ ] Phase 7 golden fixtures assert string arithmetic
- [ ] Phase 2 migration uses non-float SQL types
