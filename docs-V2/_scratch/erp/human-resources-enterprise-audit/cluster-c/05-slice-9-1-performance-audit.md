# Slice 9.1 — Performance audit evidence

| Field | Value |
|---|---|
| Mission | Slice 9.1 — Performance audit |
| Cluster | HR-AUD-06 Cluster C subset: performance |
| Type | Verification evidence only |
| Package | `@afenda/human-resources` |
| App surface | `apps/web/app/actions/hr-performance.ts` |
| Audit date | 2026-07-26 |
| Status | Package and app Action focused gates pass; live Drizzle parity blocked before performance logic |

## Coverage matrix

| Checkpoint | Package evidence | App Action evidence | Verification | Finding | Severity | Required action |
|---|---|---|---|---|---|---|
| Cycle | `src/performance/performance-cycle.ts`; `human-resources.performance.test.ts` covers idempotent create/open event, invalid dates, close audit, cross-org read rejection, draft -> publish -> open -> close, required eligibility/review periods, review-period bounds, eligibility enrollment, inactive participant guards, stale open version. | Actions cover create, update, publish, open, close, cancel, get/list, review periods, eligibility, participant enroll/add/remove/list. | `pnpm --filter @afenda/human-resources test -- human-resources.performance` passed: 2 files, 42 passed, 6 skipped. `pnpm --filter @afenda/web test -- hr-performance-actions` passed: 1 file, 2 passed. | Cycle capability is implemented and focused verified in memory/unit and app composition. Drizzle parity is blocked by shared seed employment failure. | Pass with parity blocker | Fix shared Drizzle employment seed blocker, then rerun parity. |
| Goal | `src/performance/goal.ts`; tests cover approved weights sum to 100, period guards, employee lifecycle with progress and completion, manager-assigned goals, percent100 submit guard, alignment guards, manager action authorization. | Actions cover create, update, submit, approve, reject, activate, align, progress record/list, get/list, close, cancel. | Focused package and app Action gates passed. Memory parity cases for submit/approve and activate/progress/close passed inside ungated performance run. | Goal capability is implemented and focused verified except live Drizzle parity. | Pass with parity blocker | Rerun database parity after employment seed repair. |
| Review | `src/performance/review.ts`; tests cover start, self/manager assessment, delegated reviewer chain, acknowledge, finalize idempotency, reopen permission, mutation lock after finalized, unauthorized reviewer rejection. | Actions cover start, self assessment, manager assessment, return for correction, acknowledge, finalize, reopen, get/list, pending-manager list, employee history. | Focused package and app Action gates passed. | Review lifecycle is implemented and focused verified except live Drizzle parity. | Pass with parity blocker | Rerun database parity after employment seed repair. |
| Rating | `src/shared/performance-rating.ts`; tests cover duplicate rating-scale rejection, draft-only rating-scale update, invalid assessment rating rejection, and finalize/calibration rating consistency. | Rating values flow through cycle create/update, self/manager assessment, calibrate, and finalize Actions via package schemas. | Focused package gate passed. | Rating controls are implemented and focused verified. | Pass | None for memory/unit path. |
| Calibration | `calibratePerformanceReview` in `src/performance/review.ts`; tests cover overall rating override, calibration note retention/redaction, and finalize requiring the calibrated rating. | `calibratePerformanceReviewAction` delegates to the package command with org/actor stamping and permission envelope. | Focused package and app Action gates passed. Parity file includes calibration in review workflow, but Drizzle case is blocked at employment seeding. | Calibration is implemented and focused verified except live Drizzle parity. | Pass with parity blocker | Rerun database parity after employment seed repair. |
| Improvement plan | `src/performance/improvement-plan.ts`; tests cover creation from finalized review, open, acknowledge, checkpoint recording, amendment, milestone lifecycle, evidence, completion, unsuccessful close, pending-checkpoint completion guard. | Actions cover create, open, acknowledge, checkpoint record/list, amend, complete, close unsuccessful, cancel, get, active list. | Focused package and app Action gates passed. Memory parity PIP cases passed inside ungated performance run. | Improvement-plan workflow is implemented and focused verified except live Drizzle parity. | Pass with parity blocker | Rerun database parity after employment seed repair. |
| Confidentiality | `src/performance/performance-field-projection.ts`; tests cover redaction of ratings, sensitive comments, and calibration note without `performance.confidential.read`; include-confidential permission gate for review and history. | `getPerformanceReviewByIdAction` and `getEmployeePerformanceHistoryAction` expose `includeConfidential` only through package command authorization. | Focused package gate passed. | Confidentiality projection and permission gate are implemented and focused verified. | Pass | None for memory/unit path. |
| Effective history | `getEmployeePerformanceHistory` in `src/performance/review.ts`; tests aggregate reviews, cycle goals, and PIPs with confidentiality controls. | `getEmployeePerformanceHistoryAction` delegates to package command with session org/actor stamping. | Focused package and app Action gates passed. Memory parity history case passed inside ungated performance run. | Effective performance history is implemented and focused verified except live Drizzle parity. | Pass with parity blocker | Rerun database parity after employment seed repair. |
| Parity | `human-resources.performance.parity.test.ts` defines six memory/Drizzle parity scenarios: cycle lifecycle, goal submit/approve, goal progress/close, review finalize/PIP checkpoint, history aggregation, PIP lifecycle. | App Action tests verify delegation and `ActionResult` mapping for the web surface. | `$env:REQUIRE_DATABASE_TESTS='1'; pnpm --filter @afenda/human-resources test -- human-resources.performance.parity` failed: 6 passed, 6 failed. All failures are `Performance parity [drizzle]` and fail at `seedEmployeeEmployment` with `INTERNAL_ERROR` before performance commands run. | Memory parity passes; live Drizzle parity is not verified because shared employment seeding fails before the performance aggregate is exercised. | Major | Repair the shared Drizzle employment seed path or fixture state, then rerun the database parity command. |

## Command evidence

```text
pnpm --filter @afenda/human-resources test -- human-resources.performance
# Exit 0
# Test Files 2 passed (2)
# Tests 42 passed | 6 skipped (48)
```

```text
$env:REQUIRE_DATABASE_TESTS='1'; pnpm --filter @afenda/human-resources test -- human-resources.performance.parity
# Exit 1
# Test Files 1 failed (1)
# Tests 6 failed | 6 passed (12)
# All 6 failed tests are Performance parity [drizzle]
# Failure root: Failed to seed employment: INTERNAL_ERROR at human-resources.performance.parity.test.ts:107
```

```text
pnpm --filter @afenda/web test -- hr-performance-actions
# Exit 0
# Test Files 1 passed (1)
# Tests 2 passed (2)
```

```text
pnpm --filter @afenda/web typecheck
# Exit 2
# Blocked outside Slice 9.1 performance: typed Action wrappers in hr-compliance.ts,
# hr-employee-relations.ts, and hr-workforce-planning.ts return Result<{ ...: unknown }>
# where concrete HR DTO result types are declared.
```

```text
pnpm validate:modules
# Exit 0
# validate:modules OK
# manifests: master-data, sales, purchasing, inventory, receiving, fulfillment,
# receivables, payables, payments, accounting, human-resources, payroll,
# corporate-administration
# generated registers: 7 files (matched)
# negative fixtures: all 22 expected failures proven
```

## Check coverage ledger

```text
Applicable controls:       9
Controls with checks:      9
Checks executed:           5
Checks passed:             3
Checks failed:             2
Controls without checks:   0
Unevaluated controls:      1
Coverage Status: Incomplete
```

Unevaluated control: live Drizzle parity for the performance aggregate remains unevaluated because every Drizzle parity scenario fails during shared employment fixture seeding before cycle, goal, review, history, or PIP commands execute.

## Blockers

| ID | Area | Evidence | Classification | Owner |
|---|---|---|---|---|
| HR-PERF-PARITY-001 | Live Drizzle parity | `human-resources.performance.parity.test.ts` fails all six Drizzle cases at `seedEmployeeEmployment` with `INTERNAL_ERROR`. | Major blocker | HR shared workforce/core fixture or Drizzle employment adapter |
| HR-WEB-TYPECHECK-001 | Broader web typecheck | `pnpm --filter @afenda/web typecheck` fails in compliance, employee-relations, and workforce-planning Actions with `unknown` package result payloads assigned to concrete DTO results. | Outside Slice 9.1 blocker | Owning app Action slices |

## Conclusion

Slice 9.1 performance capability coverage is implemented and focused verified for package memory/unit behavior and app Action composition. The remaining performance audit blocker is database parity: the Drizzle path cannot be claimed until the shared employment seed failure is repaired and the six performance parity scenarios pass under `REQUIRE_DATABASE_TESTS=1`.
