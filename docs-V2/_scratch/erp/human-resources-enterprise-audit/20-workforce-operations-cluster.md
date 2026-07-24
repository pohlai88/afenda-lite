# HR-AUD-02 — Workforce Operations Cluster (executive scorecard)

| Field | Value |
|---|---|
| Mission | **HR-AUD-02** |
| Cluster | **B — time + leave** |
| Type | Audit only |
| Audit date | 2026-07-24 |
| Package | `@afenda/human-resources` |
| Evidence pack | [`cluster-b/`](cluster-b/) |
| Finding prefix | `HR-OPS-P{0\|1\|2\|3}-###` |
| Scope authority | Locked HR-AUD-00 Cluster B; Prompt 2B superseded |

---

## Executive verdict

Cluster B is the **strongest HR domain surface** on disk: 77 mutations and 46 queries across leave and time, full Memory/Drizzle store parity at compile time, rich leave transactional SQL (locks, balance CTEs, idempotency replay), and complete **time** emission registry coverage (59/59).

Enterprise blockers within this cluster:

1. **Leave emission registry is empty** while adapters emit domain events — correlation and platform integration gap (P0).
2. **Calendar scope resolution tests are red** — assignment-context chain failures undermine calendar, leave segment, and timesheet evidence (P1).
3. **Authorization asymmetry** — overtime approve skips approval-authority resolution; leave handoff query uses manager permission not handoff read (P1).
4. **No leave product composition** in apps/web despite package-complete API (P1).

Time remains ahead of leave on registry discipline, product wiring (`hr-time.ts`), and parity test sharding. Leave leads on transactional depth and authorization richness but lags on emission documentation and app exposure.

---

## Domain scorecard

Scale: **Pass** | **Partial** | **Gap** | **N/A**. Overall = weakest blocking axis.

### Leave capabilities

| Capability | Contract | Store+Adapters | DB invariants | Authz/Audit | Tests | Overall |
|---|---|---|---|---|---|---|
| Policies | Pass | Pass | Partial | Pass | Pass | **Partial** |
| Policy lineage | Pass | Pass | Partial | Pass | Pass | **Partial** |
| Entitlements | Pass | Pass | Partial | Pass | Pass | **Partial** |
| Balances | Pass | Pass | Partial | Pass | Pass | **Partial** |
| Requests | Pass | Pass | Partial | Pass | Pass | **Partial** |
| Approval | Pass | Pass | Partial | Pass | Pass | **Partial** |
| Cancellation | Pass | Pass | Partial | Pass | Pass | **Partial** |
| Leave-aware time behavior | Pass | Pass | N/A | Pass | Partial | **Partial** |
| Approved leave handoff | Pass | Pass | N/A | Partial | Pass | **Partial** |

### Time capabilities

| Capability | Contract | Store+Adapters | DB invariants | Authz/Audit | Tests | Overall |
|---|---|---|---|---|---|---|
| Work calendars | Pass | Pass | Pass | Pass | Partial | **Partial** |
| Calendar scope resolution | Pass | Pass | Partial | Pass | Gap | **Gap** |
| Employee calendar resolution | Pass | Pass | Partial | Pass | Gap | **Gap** |
| Shifts | Pass | Pass | Pass | Pass | Pass | **Pass** |
| Scheduling | Pass | Pass | Pass | Pass | Pass | **Pass** |
| Attendance events | Pass | Pass | Pass | Pass | Pass | **Pass** |
| Import idempotency | Pass | Pass | Pass | Pass | Pass | **Pass** |
| Session resolution | Pass | Pass | Partial | Pass | Pass | **Partial** |
| Exceptions | Pass | Pass | Partial | Pass | Partial | **Partial** |
| Break waivers | Pass | Pass | Partial | Pass | Pass | **Partial** |
| Timesheets | Pass | Pass | Pass | Pass | Pass | **Pass** |
| Generation | Pass | Pass | N/A | Pass | Pass | **Pass** |
| Legal-minute allocation | Pass | Pass | N/A | Pass | Partial | **Partial** |
| Overtime | Pass | Pass | Partial | Partial | Pass | **Partial** |
| Approved time handoff | Pass | Pass | N/A | Pass | Pass | **Pass** |

Full findings: [`cluster-b/01-domain-findings.md`](cluster-b/01-domain-findings.md). Aggregate matrix: [`cluster-b/02-aggregate-matrix.tsv`](cluster-b/02-aggregate-matrix.tsv).

---

## HR-ENT-* coverage (Cluster B)

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| HR-ENT-05 | Package-wide effective truth | **Partial** | Only `hr_leave_policy` + time calendar/policy/shift/assignment tables in matrix; transactional leave/time tables excluded (HR-OPS-P1-004, HR-XCUT-P0-002) |
| HR-ENT-08 | Shared workflow/tasks/approvals | **Partial** | Domain-local leave/time approval flows; no platform workflow owner |
| HR-ENT-12 | HR product surfaces | **Partial** | Time Server Actions present; leave actions absent (HR-OPS-P1-003) |
| HR-ENT-14 | Production attendance ingestion | **Partial** | Fail-closed connector; inline import supported (HR-OPS-P2-005) |
| HR-ENT-16 | Domain depth | **Partial** | Time broadest; calendar resolution evidence red; leave emission gap |
| HR-ENT-18 | Package quality gates | **Blocked (pre-existing)** | Cluster B tests mixed; package `typecheck` fails on employee-relations/recruitment (outside scope) |

Other HR-ENT rows: **unchanged** — consume HR-AUD-00 baseline.

---

## Canonical-definition conflicts

| Concept | Conflict | Severity | Finding |
|---|---|---|---|
| Emission registry completeness | Time 59/59; leave 0/18 | P0 | HR-OPS-P0-001 |
| Handoff read permissions | Time `handoff.read` vs leave `approve-team` | P1 | HR-OPS-P1-002 |
| Approval authority | Timesheet/waiver vs overtime | P1 | HR-OPS-P1-001 |
| Timesheet leave timezone | UTC stored vs calendar timezone expected | P2 | HR-OPS-P2-001 |
| Payroll money at handoff | HR decimal strings (HR-XCUT-P1-006) | P1 cross-cut | Referenced only — owned by HR-AUD-03/payroll |

Source matrix: [`02-canonical-definitions.tsv`](../02-canonical-definitions.tsv).

---

## Memory / Drizzle parity findings

| Area | Verdict | Notes |
|---|---|---|
| Leave store slice | **Pass** | Approve + handoff parity; concurrency/failure-injection suites |
| Leave emission registry | **Gap** | Adapters agree; registry documentation absent |
| Time store slice | **Pass** | Dedicated parity shards (calendar, policy, scheduling, attendance, timesheet, exceptions) |
| Time emission registry | **Pass** | 59/59 + `emission-registry-parity.test.ts` |
| Overtime approve authority | **Gap** | Memory/Drizzle agree but both skip authority resolver |
| Calendar resolution | **Gap** | Multiple memory/parity tests failing — see HR-OPS-P1-005 |

---

## Missing database invariants (command-enforced only)

| Rule | Tables | Enforced in |
|---|---|---|
| Leave balance sufficiency on approve | `hr_leave_adjustment`, `hr_leave_request` | SQL CTE + command guard |
| Negative balance policy flag | `hr_leave_policy` | Command only |
| Overlapping approved leave windows | `hr_leave_request` | **Not enforced** (HR-OPS-P2-004) |
| Timesheet approval step / authority holder | `hr_timesheet` | Command + `resolveTimeApprovalAuthority` |
| Overtime approval authority assignment | `hr_overtime_request` | **Not checked at command** (HR-OPS-P1-001) |
| Attendance event pairing | `hr_attendance_event`, `hr_attendance_session` | Application logic only |
| Session resolution determinism | `hr_attendance_session` | No tie-break at equal timestamps |

---

## Missing tests

| Gap | Finding |
|---|---|
| Leave emission registry parity test | HR-OPS-P0-001 |
| Calendar scope resolution green suite | HR-OPS-P1-005 |
| Overtime authority negative cases | HR-OPS-P1-001 |
| Leave handoff permission matrix | HR-OPS-P1-002 |
| Leave overlap rejection | HR-OPS-P2-004 |
| Equal-timestamp session stability | HR-OPS-P2-003 |
| Leave Server Action contract tests | HR-OPS-P1-003 |
| Neon leave-concurrency cleanup stability | HR-OPS-P3-001 |

---

## Verification evidence (2026-07-24)

### Typecheck

```bash
pnpm --filter @afenda/human-resources typecheck
# Exit 2 — pre-existing failures in employee-relations.ts, recruitment.ts (outside Cluster B)
```

### Cluster B tests

```bash
pnpm --filter @afenda/human-resources test -- human-resources.time human-resources.leave calendar-scope leave-policy-lineage leave-concurrency time-policy-concurrency legal-minute attendance-import production-work-calendar
# Exit 1
# Test Files: 7 failed | 11 passed | 1 skipped (19)
# Tests: 16 failed | 120 passed | 35 skipped (171)
```

**Failed suites (Cluster B relevant):** `calendar-scope-assignment.test.ts` (2), `human-resources.time.test.ts` calendar overrides (5), `calendar-scope.parity.test.ts` (6), `human-resources.time.calendar.parity.test.ts` (1), `human-resources.time.exceptions.parity.test.ts` timezone (1), `legal-minute-allocation.parity.test.ts` (1), `leave-concurrency.test.ts` afterAll timeout (1 suite).

**Passed highlights:** `human-resources.leave.test.ts`, `human-resources.leave.parity.test.ts`, `leave-policy-lineage.test.ts`, `time-policy-concurrency.test.ts`, most attendance/timesheet parity shards, `production-work-calendar.test.ts`.

---

## Ordered repair candidates

See [`cluster-b/04-repair-readiness.md`](cluster-b/04-repair-readiness.md).

Top three:

1. **HR-OPS-LEAVE-EMISSION-REGISTRY**
2. **HR-OPS-TIME-CALENDAR-RESOLUTION-FIXTURES**
3. **HR-OPS-TIME-OVERTIME-AUTHORITY**

---

## Residual dependencies

| Cluster | Dependency |
|---|---|
| **HR-AUD-01** | Assignment context, employment resolution, org dimension keys for calendar scope |
| **HR-AUD-03** | Compensation/learning/performance ownership; payroll handoff money scale (HR-XCUT-P1-006) |
| **HR-AUD-00** | Emission registry package gate, effective-truth scope, cross-cut authorization |

---

## Finding index (summary)

| ID | Sev | Title |
|---|---|---|
| HR-OPS-P0-001 | P0 | Leave mutations absent from emission registry |
| HR-OPS-P1-001 | P1 | Overtime approve skips approval authority |
| HR-OPS-P1-002 | P1 | Leave handoff permission asymmetry |
| HR-OPS-P1-003 | P1 | No leave Server Actions |
| HR-OPS-P1-004 | P1 | Effective-truth excludes transactional tables |
| HR-OPS-P1-005 | P1 | Calendar resolution tests failing |
| HR-OPS-P2-001 | P2 | Timesheet leave timezone UTC |
| HR-OPS-P2-002 | P2 | Stale time command count comment |
| HR-OPS-P2-003 | P2 | Session tie order undefined |
| HR-OPS-P2-004 | P2 | No leave overlap DB guard |
| HR-OPS-P2-005 | P2 | Attendance connector fail-closed (by design) |
| HR-OPS-P3-001 | P3 | Leave concurrency cleanup timeout |

Detail: [`cluster-b/01-domain-findings.md`](cluster-b/01-domain-findings.md).

---

## Mission exit

- [x] Cluster B scoped to time + leave per locked AUD-00 contract
- [x] Prompt 2B supersession documented (no OPEN-DECISION)
- [x] Seven-lens findings with `HR-OPS-*` IDs
- [x] Aggregate matrix, conflicts, repair readiness
- [x] Verification evidence pasted
- [x] No product file changes
