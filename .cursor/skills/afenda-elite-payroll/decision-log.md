# Payroll architecture decision log

Use this template when a payroll behavior, jurisdiction, repository constraint, security requirement, or integration need requires a recorded decision. Do **not** create a `decisions/` directory — record accepted decisions in Scratch (`docs-V2/_scratch/...`) or via controlled doc lanes when reopened.

## Decision

- ID:
- Date:
- Status: proposed | accepted | superseded
- Owners:
- Reviewers:

## Context

What payroll behavior, jurisdiction, repository constraint, security requirement, or integration need requires a decision?

## Options considered

1. Option A
2. Option B
3. Option C

## Decision and rationale

State the selected option and why it best preserves correctness, reproducibility, package ownership, security, and operability.

## Consequences

- Positive:
- Negative/tradeoffs:
- Migration impact:
- Event/API compatibility impact:
- Testing impact:
- Security/privacy impact:

## Verification

List tests, reviews, metrics, or operational checks proving the decision works.

---

## PAY-DEC-006 — Phase 6 calculation engine foundations

- ID: PAY-DEC-006
- Date: 2026-07-24
- Status: accepted
- Owners: payroll package

### Context

Phase 6 requires deterministic payroll calculation with immutable snapshots, reproducible outputs, and explicit deduction staging without claiming real jurisdiction statutory law.

### Decision and rationale

1. **Money:** payroll-local BigInt fixed-point at scale 12 (`numeric(24,12)`), explicit rounding modes — no JS `number` and no new npm money dependency.
2. **First calculator:** synthetic registry id `synth.v1` only for Phase 6 proofs — not production statutory readiness.
3. **Deduction staging:** required `taxTiming: "pre_tax" | "post_tax"` on deduction rules (schema + DB) so pipeline stages 4 vs 7 are explicit.

### Consequences

- Positive: byte-equivalent reproducibility, fail-closed unknown calculators, clear pre/post tax pipeline.
- Tradeoffs: apps/web must wire `PayrollEmployeeQueryPort`; real jurisdiction calculators deferred.
- Testing: golden/repro/money/pipeline/validation suites under `packages/erp/payroll/__tests__/`.
