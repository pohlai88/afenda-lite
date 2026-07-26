# Slice 9.2 — Performance cycles evidence

| Field | Value |
|---|---|
| Mission | Slice 9.2 — Performance cycles |
| Cluster | HR-AUD-06 Cluster C subset: performance |
| Type | Completion and verification evidence |
| Package | `@afenda/human-resources` |
| App surface | `apps/web/app/actions/hr-performance.ts` |
| Evidence date | 2026-07-26 |
| Status | Complete for cycle workflow and live memory/Drizzle parity |

## Completion summary

Slice 9.2 is complete for the requested cycle workflow: draft, publish, open, close, review periods, eligible population, and rating scale. No production DDL or new package boundary was added.

The original live parity blocker was not cycle command logic. It was stale shared Drizzle test/bootstrap state:

- employment seeding failed before cycle commands because nullable Drizzle SQL parameters were untyped in `createEmployment`;
- the live parity database had an older performance cycle status check that rejected `published`;
- the live parity database was missing Slice 9.2+ performance configuration and downstream performance columns used by the existing parity scenarios.

Repairs were limited to existing adapters and test bootstrap/evidence:

- `packages/erp/human-resources/src/adapters/drizzle/core.ts` now casts nullable employment `ends_on` and serializes the employment outbox payload as JSON before binding.
- `packages/erp/human-resources/src/adapters/drizzle/performance.ts` now casts nullable cycle eligibility tenure.
- `packages/erp/human-resources/__tests__/helpers/ensure-performance-schema.ts` now idempotently aligns stale live parity databases with the existing current performance schema surface used by the tests.
- `packages/erp/human-resources/__tests__/helpers/neon-cleanup.ts` deletes new dependent performance cycle configuration rows and employment status history before parent cleanup.
- `packages/erp/human-resources/__tests__/human-resources.performance.parity.test.ts` now checks Drizzle PIP domain events in `platform_domain_event` while preserving memory adapter checks against the injected outbox port.

## Coverage matrix

| Checkpoint | Evidence |
|---|---|
| Draft | `human-resources.performance.test.ts` covers cycle create in `draft`, draft-only update, and duplicate rating-scale code rejection. |
| Publish | Package unit and parity tests cover draft -> published after required review periods, eligibility, and rating scale are present. |
| Open | Package unit and parity tests cover published -> open only after an active participant exists. |
| Close | Package unit tests cover open -> closed and reject close from published. |
| Review periods | Package unit tests cover bounds inside cycle dates and non-overlap by kind; parity bootstrap now creates/aligned `hr_performance_cycle_review_period`. |
| Eligible population | Package unit and parity tests cover configured eligibility, active employment status, tenure handling, and participant enrollment/add. |
| Rating scale | Package unit tests cover uniqueness, draft-only update, and invalid rating rejection. |
| Parity | Live memory/Drizzle parity passed for cycle lifecycle, goal submit/approve, goal progress/close, review finalize/PIP checkpoint, history aggregation, and PIP lifecycle. |

## Command evidence

```text
pnpm --filter @afenda/human-resources test -- human-resources.performance
# Exit 0
# Test Files 1 passed (1)
# Tests 36 passed (36)
```

```text
$env:REQUIRE_DATABASE_TESTS='1'; pnpm --filter @afenda/human-resources test:parity -- human-resources.performance.parity
# Exit 0
# Test Files 1 passed (1)
# Tests 12 passed (12)
# Memory: 6 passed
# Drizzle: 6 passed
```

```text
pnpm --filter @afenda/web test -- hr-performance-actions
# Exit 0
# Test Files 1 passed (1)
# Tests 2 passed (2)
```

```text
pnpm validate:modules
# Exit 0
# validate:modules OK
# generated registers: 7 files (matched)
# negative fixtures: all 22 expected failures proven
```

```text
pnpm --filter @afenda/web typecheck
# Exit 0
```

## Note on parity command

In this checkout, `@afenda/human-resources` has a unit-only `test` script and a dedicated `test:parity` script. The requested parity intent was executed through `test:parity`; invoking `pnpm --filter @afenda/human-resources test -- human-resources.performance.parity` routes to the unit-only config and does not discover parity files.
