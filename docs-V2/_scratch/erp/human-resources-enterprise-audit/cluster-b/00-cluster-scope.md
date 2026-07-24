# HR-AUD-02 — Cluster B scope

| Field | Value |
|---|---|
| Mission | **HR-AUD-02** |
| Cluster | **B — Workforce Operations** |
| Type | Audit only |
| Package | `@afenda/human-resources` |
| Audit date | 2026-07-24 |
| Finding prefix | `HR-OPS-P{0\|1\|2\|3}-###` |
| Prerequisite | HR-AUD-00 pack [`00–04`](../00-authority-map.md) |
| Executive scorecard | [`20-workforce-operations-cluster.md`](../20-workforce-operations-cluster.md) |

## Scope authority

This mission follows the **locked HR-AUD-00 cluster contract** ([`04-domain-cluster-audit-contract.md`](../04-domain-cluster-audit-contract.md) Cluster B).

| Mission | Owns |
|---|---|
| **HR-AUD-02** (this) | `src/time/**`, `src/leave/**` |
| **HR-AUD-03** | `compensation-benefits`, `learning`, `performance`, `talent`, `compliance`, `employee-relations`, `workforce-planning` |

**Prompt 2B supersession:** The five-domain Prompt 2B list (`compensation-benefits`, `leave`, `time`, `learning`, `performance`) is **superseded** for domain ownership. Compensation, learning, and performance are **HR-AUD-03** only. This audit records residual consumer notes where time/leave depend on other clusters (assignment context, employment calendar assignment).

## Domains in scope

| Domain | Folder | Store slice | Schema shard |
|---|---|---|---|
| Leave | `src/leave/**` | `store/leave.ts` | `schemas/leave.ts` |
| Time | `src/time/**` | `store/time.ts` | `schemas/time.ts` |

## Command / query inventory (disk 2026-07-24)

| Surface | Leave | Time | Cluster B total |
|---|---:|---:|---:|
| Mutations | 18 | 59 (`HUMAN_RESOURCES_TIME_COMMAND_IDS`) | **77** |
| Queries | 12 (incl. `approved-leave-handoff.get`) | 34 (incl. `approved-time-handoff.get`) | **46** |
| Permission codes | 10 | 24 | **34** |

Leave mutations: policy (5), entitlement (5), request (8).  
Time mutations: calendar (11), policy/authority (6), shift (10), attendance (11), timesheet (13), overtime (6), import/session/exception flows included in attendance/timesheet groups.

## Adapter and production surfaces

| Path | Role |
|---|---|
| `adapters/memory/leave.ts`, `adapters/memory/time.ts` | Memory store slices |
| `adapters/drizzle/leave.ts`, `adapters/drizzle/time.ts` | Drizzle store slices |
| `adapters/drizzle/leave-sql-builders.ts` | Atomic leave SQL (approve/cancel/amend/entitlement) |
| `adapters/drizzle/leave-transactions.ts` | Neon HTTP transactions, row locks, idempotency replay |
| `adapters/drizzle/time-transactions.ts` | Time transaction wrapper + SQL row mappers |
| `adapters/drizzle/assignment-context-query.ts` | Drizzle assignment context for calendar resolution |
| `adapters/drizzle/work-calendar-lookup.ts` | Work calendar lookup port |
| `production-approved-leave-query.ts` | Approved leave facts for timesheet generation |
| `production-work-calendar.ts` | Work calendar port for leave segment expansion |
| `production-assignment-context-query.ts` | Assignment context factory |
| `production-attendance-source.ts` | Fail-closed external attendance connector |

## Shared cluster files

| Path | Role |
|---|---|
| `shared/leave-command.ts`, `leave-guards.ts`, `leave-status.ts`, `leave-balance.ts` | Leave command runner, guards, balance arithmetic |
| `shared/time-command.ts`, `time-guards.ts`, `time-employment.ts` | Time command runner, employment resolution |
| `leave/leave-policy-lineage.ts` | Published policy lineage `asOf` resolver |
| `time/calendar-scope-resolution.ts` | Scoped calendar precedence |
| `time/employee-work-calendar-resolution.ts` | Employee calendar resolution chain |
| `time/iana-timezone.ts` | IANA identifier validation only |
| `time/handoff/approved-time-handoff.ts` | Approved timesheet handoff query |
| `time/handoff/ports.ts` | Leave query, attendance source, assignment context ports |

## Database tables (leave + time)

**Leave (7):** `hr_leave_policy`, `hr_leave_policy_eligibility`, `hr_leave_entitlement`, `hr_leave_request`, `hr_leave_adjustment`, `hr_leave_request_segment`, `hr_leave_approval_decision`

**Time (24):** `hr_work_calendar`, `hr_work_calendar_holiday`, `hr_employment_calendar_assignment`, `hr_work_calendar_scope_assignment`, `hr_time_policy`, `hr_time_policy_assignment`, `hr_time_approval_authority_assignment`, `hr_shift`, `hr_shift_break`, `hr_shift_assignment`, `hr_shift_assignment_segment`, `hr_attendance_event`, `hr_attendance_session`, `hr_attendance_break_waiver_decision`, `hr_attendance_exception`, `hr_attendance_adjustment`, `hr_attendance_import_batch`, `hr_attendance_import_error`, `hr_timesheet`, `hr_timesheet_approval_decision`, `hr_timesheet_entry`, `hr_overtime_request`, `hr_overtime_approval`

## Effective-truth adoption matrix (cluster tables)

| Table | In matrix | Pattern |
|---|---|---|
| `hr_leave_policy` | Yes | effective-lineage |
| `hr_work_calendar` | Yes | effective-lineage |
| `hr_time_policy` | Yes | effective-lineage |
| `hr_shift` | Yes | effective-lineage |
| `hr_employment_calendar_assignment` | Yes | bounded-assignment |
| `hr_work_calendar_scope_assignment` | Yes | bounded-assignment |
| `hr_time_policy_assignment` | Yes | bounded-assignment |
| `hr_time_approval_authority_assignment` | Yes | bounded-assignment |
| `hr_shift_assignment` | Yes | bounded-assignment |
| All other leave/time transactional tables | No | Operational — outside HR-ENT-05 scoped matrix |

## Tests in scope

| File pattern | Domain |
|---|---|
| `human-resources.leave*.test.ts` | Leave unit + parity |
| `leave-policy-lineage.test.ts`, `leave-concurrency.test.ts`, `leave-failure-injection.test.ts` | Leave |
| `human-resources.time*.test.ts` | Time unit + parity shards |
| `calendar-scope*.test.ts`, `time-policy-concurrency.test.ts` | Time calendar/policy |
| `legal-minute-allocation*.test.ts`, `attendance-import-dry-run.test.ts` | Time attendance/timesheet |
| `production-work-calendar.test.ts` | Production port |

## Apps/web composition

| Path | In scope |
|---|---|
| `apps/web/app/actions/hr-time.ts` | Yes — time Server Actions |
| `apps/web/app/actions/hr-self-service.ts` | Partial — own attendance only |
| `apps/web/lib/erp/human-resources-command-options.ts` | Yes — port wiring |
| `apps/web/lib/erp/human-resources-*-port.ts` | Yes — work calendar, approved leave, attendance source |
| `apps/web/features/human-resources/attendance-control.tsx` | Yes |
| Leave Server Actions | **Absent** — no `hr-leave.ts` |

## Out of scope

- Deep audit of compensation-benefits, learning, performance (HR-AUD-03)
- Cross-cutting re-litigation (reference `HR-XCUT-*` from [`01-cross-cutting-baseline.md`](../01-cross-cutting-baseline.md))
- Product, schema, migration, or app edits
- Module Enterprise Readiness claims (HR-ENT-17)

## Scratch companions consumed

- [`docs-V2/_scratch/erp/time.md`](../../time.md)
- [`docs-V2/_scratch/erp/time-slices-roadmap.md`](../../time-slices-roadmap.md)
- [`docs-V2/_scratch/erp/time-remaining.md`](../../time-remaining.md)
