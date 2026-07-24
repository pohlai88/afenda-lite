# Payroll architecture decision log — PAY-DEC-001

## Decision

- ID: PAY-DEC-001
- Date: 2026-07-24
- Status: accepted
- Owners: payroll package + apps/web composition
- Reviewers: human (required before Phase 4 assignment slice)

## Context

`PayrollEmployeeQueryPort` is defined in `@afenda/payroll` ([`ports.ts`](../../../../packages/erp/payroll/src/ports.ts)). Assignment and calculation slices need HR workforce facts at an effective date without importing `@afenda/human-resources` inside the payroll package. HR roadmap slice HR14 tracks stable read DTOs for payroll adapters ([`human-resources-roadmap.md`](../../erp/human-resources-roadmap.md)).

## Options considered

1. **Phase 1 app adapter stub** — `apps/web/lib/erp/payroll-employee-query-port.ts` calls HR package queries at composition root; payroll package stays HR-free.
2. **Wait for HR14** — defer all payroll slices needing employee facts until HR ships query commands.
3. **Duplicate HR read logic in payroll** — rejected (boundary violation).

## Decision and rationale

**Selected: Option 1 (accepted).** Phase 1 adds the app composition stub and factory wiring in `payroll-command-options.ts`. Implementation may return `null` or synthetic fixtures in tests until HR14 read queries stabilize. Preserves package ownership and matches [`boundaries.md`](../../../../.cursor/skills/afenda-elite-payroll/boundaries.md).

## Consequences

- Positive: Phase 1 contract complete; Phase 4 unblocked once HR DTO stable.
- Negative/tradeoffs: Adapter may need revision when HR14 lands.
- Migration impact: None (Phase 1).
- Event/API compatibility impact: Port DTO frozen to scratch shape in [`human-resource.md`](../../erp/human-resource.md) L704–724.
- Testing impact: Memory tests use injected port doubles; app adapter gets contract test in Phase 4.
- Security/privacy impact: Adapter must not log full compensation payloads.

## Verification

- [x] `payroll-employee-query-port.ts` exists under `apps/web/lib/erp/`
- [x] No `@afenda/human-resources` in `packages/erp/payroll/package.json`
- [ ] Phase 4 integration test with synthetic employee facts
