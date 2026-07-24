# Payroll architecture decision log — PAY-DEC-004

## Decision

- ID: PAY-DEC-004
- Date: 2026-07-24
- Status: accepted
- Owners: product + payroll domain
- Reviewers: domain specialist (required before statutory Phase 7 claims)

## Context

Walking skeleton includes statutory aggregates (`statutory/`, `payroll_statutory_rule`, `payroll_statutory_result`) but no jurisdiction is named in repo authority. Claiming statutory production readiness without specialist review violates enterprise production bar.

## Options considered

1. **Generic rule engine only until jurisdiction approved** — test fixtures with synthetic rules; no country-specific law.
2. **Ship Malaysia/SG/etc. speculatively** — rejected without named product decision.
3. **Defer statutory farm entirely** — delays walking skeleton.

## Decision and rationale

**Selected: Option 1.** Phase 3–8 implement generic effective-dated rules and deterministic calculation with synthetic golden fixtures. Jurisdiction-specific statutory logic requires a separate accepted decision and specialist sign-off before any production-readiness claim.

## Consequences

- Positive: Unblocks lifecycle and calculation architecture work.
- Negative/tradeoffs: No real-world tax/contribution accuracy until jurisdiction slice.
- Migration impact: `payroll_statutory_rule` schema supports versioning; content TBD per jurisdiction.
- Event/API compatibility impact: Statutory submission events remain generic payloads.
- Testing impact: Golden tests labeled synthetic; no real employee/tax data.
- Security/privacy impact: Reinforces synthetic-only test policy.

## Verification

- [x] Listed as explicit non-goal in REPOSITORY_ALIGNMENT.md §7
- [ ] Phase 7 tests named `synthetic-*` fixtures
- [ ] Separate PAY-DEC-00N opened when jurisdiction is named
