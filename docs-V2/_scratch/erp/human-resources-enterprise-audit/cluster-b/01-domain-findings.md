# HR-AUD-02 — Cluster B domain findings

| Field | Value |
|---|---|
| Mission | **HR-AUD-02** |
| Finding prefix | `HR-OPS-P{0\|1\|2\|3}-###` |
| Lenses | Normalize · Serialize · Stabilize · Standardize · Optimize · Enrich · Repair readiness |
| Scope | [`00-cluster-scope.md`](00-cluster-scope.md) |

Cross-cut findings from HR-AUD-00 are **referenced**, not duplicated: HR-XCUT-P0-002 (effective-truth scope), HR-XCUT-P0-003 (emission registry), HR-XCUT-P1-006 (payroll money boundary — leave/time handoffs only here).

---

## 1. Normalize

Leave and time command/query IDs follow `human-resources.{aggregate}.{verb}` consistently. Domain folders match store slices and schema shards. Leave requires `WorkCalendarPort` on all commands/queries via `requireWorkCalendar` — cross-domain naming is explicit.

No cluster-specific normalize defects beyond HR-XCUT-P2-004 (deprecated tenant context alias) — not exercised in leave/time paths audited.

---

## 2. Serialize

#### HR-OPS-P2-001

| Field | Value |
|---|---|
| **Paths/symbols** | `src/time/iana-timezone.ts#isValidIanaTimeZone` · `schemas/time.ts` attendance import · `human-resources.time.exceptions.parity.test.ts` |
| **Conflicting authorities** | Tests expect calendar timezone on generated leave timesheet entries; generation stores `UTC` |
| **Observed disk** | `isValidIanaTimeZone` validates identifier only; `localWorkDate` supplied by importer/client; timesheet leave entry timezone not derived from resolved work calendar in failing parity case |
| **Expected contract** | Civil date and display timezone should align with resolved employment calendar for leave-aware timesheet lines |
| **Consequence** | Payroll/handoff consumers may mis-attribute leave minutes across timezone boundaries |
| **Recommendation** | Derive entry timezone from resolved calendar or document explicit UTC-only handoff contract |
| **Decision** | None |
| **Repair mission** | HR-OPS-TIME-TIMEZONE-HANDOFF |
| **Verification** | `human-resources.time.exceptions.parity.test.ts` passes; handoff shape documents timezone source |

#### HR-OPS-P2-002

| Field | Value |
|---|---|
| **Paths/symbols** | `src/mutation-emission-registry.ts` header comment · `HUMAN_RESOURCES_TIME_COMMAND_IDS` |
| **Conflicting authorities** | Registry comment references 47 time commands; array holds 59 |
| **Observed disk** | `HUMAN_RESOURCES_TIME_COMMAND_IDS` lines 870–930 = 59 entries; `emission-registry-parity.test.ts` enforces 59/59 |
| **Expected contract** | Comment matches array length |
| **Consequence** | Maintenance drift; audit under-count |
| **Recommendation** | Refresh comment in hygiene slice |
| **Decision** | None |
| **Repair mission** | HR-XCUT-HYGIENE |
| **Verification** | Comment count = array length |

---

## 3. Stabilize

#### HR-OPS-P0-001

| Field | Value |
|---|---|
| **Paths/symbols** | `src/mutation-emission-registry.ts` · `src/leave/**` · `adapters/memory/leave.ts` · `adapters/drizzle/leave.ts` |
| **Conflicting authorities** | HR-XCUT-P0-003 requires mutating commands in emission registry; leave adapters emit outbox events on happy paths |
| **Observed disk** | **Zero** leave command entries in registry; 18 leave mutations; memory/drizzle emit `LEAVE_*` events on submit/approve/reject/cancel/adjust; no `emission-registry-parity` test for leave |
| **Expected contract** | Every mutating leave command declares audit-only vs domain_event (+ event types) |
| **Consequence** | Correlation-integrity coverage gap; undocumented emission behavior; platform fact projections may miss leave mutations |
| **Recommendation** | Register all 18 leave mutations; add leave parity test mirroring time |
| **Decision** | None |
| **Repair mission** | HR-OPS-LEAVE-EMISSION-REGISTRY |
| **Verification** | Registry count includes leave commands; `correlation-integrity.test.ts` or leave emission parity test green |

#### HR-OPS-P1-001 — CLOSED

| Field | Value |
|---|---|
| **Paths/symbols** | `src/time/overtime.ts#approveOvertimeRequest` · `src/time/timesheet.ts` · `src/time/attendance/break-waivers.ts` · `store.resolveTimeApprovalAuthority` |
| **Conflicting authorities** | Timesheet approve and break-waiver approve call `resolveTimeApprovalAuthority`; overtime approve did not |
| **Observed disk (pre-repair)** | `approveOvertimeRequest` delegated directly to `store.approveOvertimeRequest` after manifest permission only; memory/drizzle agreed on skip |
| **Repair (2026-07-24)** | `approveOvertimeRequest` resolves `requestedAuthority` via `resolveTimeApprovalAuthority` before mutation; persists `authority` from the resolved assignment, not the raw caller field |
| **Expected contract** | Overtime approval requires manifest permission **and** an effective `TimeApprovalAuthorityAssignment` before mutation or event emission |
| **Severity note** | **P1 authorization-scope bypass** — not unauthenticated; permission holders outside the assigned approval-authority model could approve overtime |
| **Verification** | `__tests__/overtime-approval-authority.test.ts` (memory green); Drizzle runtime parity pending when `REQUIRE_DATABASE_TESTS=1` |
| **Repair mission** | HR-OPS-OVERTIME-APPROVAL-AUTHORITY — **COMPLETE** (implementation + Memory verification; Drizzle runtime pending) |

#### HR-OPS-P1-002

| Field | Value |
|---|---|
| **Paths/symbols** | `src/leave/leave-request.ts#getApprovedLeaveHandoff` · `src/module.manifest.ts` · `permissions.ts` (`time.handoff.read`) |
| **Conflicting authorities** | Time handoff query uses `human-resources.time.handoff.read`; leave handoff query maps to `leave-request.approve-team` |
| **Observed disk** | Query permission on approved leave handoff requires manager approval permission, not a dedicated payroll/read handoff permission |
| **Expected contract** | Payroll/integration consumers use least-privilege handoff read permission symmetric with time |
| **Consequence** | Payroll jobs need manager approval permission or elevated role to read approved leave facts |
| **Recommendation** | Add `leave.handoff.read` (or reuse cross-domain handoff permission) in manifest + permission catalog |
| **Decision** | None |
| **Repair mission** | HR-OPS-LEAVE-HANDOFF-PERMISSION |
| **Verification** | Handoff query succeeds with handoff.read only; fails without |

#### HR-OPS-P2-003

| Field | Value |
|---|---|
| **Paths/symbols** | `src/time/attendance/session-resolution.ts` · `adapters/drizzle/time.ts` · `adapters/memory/time.ts` |
| **Conflicting authorities** | Session resolver expects pre-sorted events; equal `occurredAt` tie order undefined |
| **Observed disk** | Adapters sort ascending by timestamp before `resolveSessionFromEvents`; no secondary stable key |
| **Expected contract** | Deterministic session output for identical event sets |
| **Consequence** | Ambiguous pairing when clock events share timestamp (batch import, connector replay) |
| **Recommendation** | Stable sort by `(occurredAt, id)` or source sequence |
| **Decision** | None |
| **Repair mission** | HR-OPS-TIME-SESSION-DETERMINISM |
| **Verification** | Test with equal timestamps produces stable session minutes/status |

#### HR-OPS-P3-001

| Field | Value |
|---|---|
| **Paths/symbols** | `__tests__/leave-concurrency.test.ts` afterAll hook |
| **Conflicting authorities** | Parity suite expects Neon cleanup within hook timeout |
| **Observed disk** | `afterAll` hook timed out at 90000ms during audit run; other leave tests passed |
| **Expected contract** | Parity cleanup completes within configured hook timeout |
| **Consequence** | CI flake risk; incomplete Neon org cleanup after concurrency suite |
| **Recommendation** | Investigate cleanup duration or raise hook timeout with explicit justification |
| **Decision** | None |
| **Repair mission** | HR-OPS-TEST-LEAVE-CONCURRENCY-CLEANUP |
| **Verification** | `leave-concurrency.test.ts` exits cleanly with DATABASE_URL |

**Leave transactional stability (Pass with notes):**

- Drizzle `leave-transactions.ts`: `ReadCommitted` isolation, `FOR UPDATE` on request/entitlement, advisory lock on entitlement, balance CTE before consumption adjustment.
- Memory adapter mirrors atomic approve semantics; parity test covers approve + handoff.
- Idempotency: create keys on request/entitlement/adjustment; replay poll after unique violation.

**Time transactional stability (Pass):**

- `time-transactions.ts` wraps Neon HTTP transactions; time emission registry 59/59 with parity test.
- Timesheet generation repeatability: second `generateTimesheetEntries` does not duplicate leave entries (`human-resources.time.test.ts`).

---

## 4. Standardize

#### HR-OPS-P1-003

| Field | Value |
|---|---|
| **Paths/symbols** | `apps/web/app/actions/` · `src/leave/**` · `apps/web/app/actions/hr-time.ts` |
| **Conflicting authorities** | HR-ENT-12 expects product surfaces; time has 35 Server Actions; leave has package API only |
| **Observed disk** | No `hr-leave.ts` or leave routes under `apps/web/app/actions/**`; leave commands callable only via package/direct integration |
| **Expected contract** | ESS/MSS leave flows composed through Server Actions like time |
| **Consequence** | Leave package is production-backed but not product-exposed; blocks HR admin/manager leave UX |
| **Recommendation** | HR-AUD-03 product slice or dedicated leave action farm (out of this audit's repair scope) |
| **Decision** | None |
| **Repair mission** | HR-ENT-07-PRODUCT-LEAVE-ACTIONS (future product mission) |
| **Verification** | `hr-leave.ts` actions exist with permission runner + ActionResult tests |

Leave authorization is ** richer than package average**: manager chain on approve, self-approval guard, backdate permission, sensitive-read projection, cancel-approved dual permission path. Time uses manifest permissions + `resolveTimeApprovalAuthority` on selected flows.

---

## 5. Optimize

No cluster-specific duplicate utilities beyond shared effective-range/lineage (consumed correctly). Time domain file count (28) reflects breadth, not duplicate facades — HR-ENT-15 Pass for time/leave paths.

---

## 6. Enrich

#### HR-OPS-P1-004

| Field | Value |
|---|---|
| **Paths/symbols** | `src/effective-truth-adoption.ts` · leave/time tables |
| **Conflicting authorities** | HR-XCUT-P0-002 — matrix covers 33/106 tables; leave transactional tables excluded |
| **Observed disk** | Only `hr_leave_policy` in matrix among leave tables; time has calendar/policy/shift + assignment tables; entitlements/requests/adjustments/timesheets/attendance absent |
| **Expected contract** | Either deliberate exclusion register or extended matrix rows per aggregate |
| **Consequence** | No machine-enforced temporal semantics audit for high-volume transactional leave/time rows |
| **Recommendation** | Document operational-definition vs effective-lineage for each leave/time table; extend matrix only where mutable history required |
| **Decision** | Consumes OPEN-DECISION from HR-XCUT-P0-002 |
| **Repair mission** | HR-ENT-03-EFFECTIVE-TRUTH extension (cluster B tables) |
| **Verification** | Matrix rows or exclusion register lists every leave/time mutation table |

#### HR-OPS-P2-004

| Field | Value |
|---|---|
| **Paths/symbols** | `hr_leave_request` schema · `leave-request.ts` approve flow |
| **Conflicting authorities** | Command layer prevents insufficient balance; no overlap prevention for concurrent approved requests |
| **Observed disk** | DB has status/date/quantity checks and idempotency uniques; no exclusion constraint on overlapping approved windows per employee |
| **Expected contract** | Enterprise leave typically prevents double-booking approved absence windows |
| **Consequence** | Two approved requests may overlap if command guards bypassed or race outside entitlement lock scope |
| **Recommendation** | Add overlap detection in approve command and/or DB exclusion constraint |
| **Decision** | None |
| **Repair mission** | HR-OPS-LEAVE-OVERLAP-GUARD |
| **Verification** | Test rejects second approved request overlapping dates |

#### HR-OPS-P2-006

| Field | Value |
|---|---|
| **Paths/symbols** | `src/time/overtime.ts#overtimeApprovalAuthorityAsOf` · `resolveTimeApprovalAuthority` · `requestedStartsAt` |
| **Conflicting authorities** | Employment/calendar civil-date rules vs UTC ISO slice on stored instants |
| **Observed disk** | Overtime approval `asOf` derives from `requestedStartsAt.toISOString().slice(0, 10)` (UTC civil date); may differ from organization-local work date at timezone boundaries |
| **Expected contract** | Authority assignments evaluated on the canonical legal or organization-local work date for the overtime window |
| **Consequence** | Wrong effective assignment selected near midnight/timezone boundaries |
| **Recommendation** | Resolve civil date via employment work-calendar timezone helper or document explicit UTC-date contract across time approval |
| **Decision** | None |
| **Repair mission** | HR-OPS-TIME-AUTHORITY-EFFECTIVE-DATE |
| **Verification** | Boundary test with local date ≠ UTC date; resolver picks expected assignment |

#### HR-OPS-P1-006

| Field | Value |
|---|---|
| **Paths/symbols** | `src/shared/time-guards.ts#assertOvertimeStatusTransition` · `adapters/memory/time.ts#approveOvertimeRequest` |
| **Conflicting authorities** | Idempotent command semantics vs duplicate audit/outbox facts |
| **Observed disk** | `approved → approved` passes transition guard (`current === next` no-op); store still bumps version, inserts approval row, emits outbox event |
| **Expected contract** | Either true idempotent no-op (no durable side effects) or explicit rejection on repeat approve |
| **Consequence** | Duplicate approval audit rows and `human-resources.time.overtime.approved.v1` events on retry |
| **Recommendation** | Reject repeat approve or short-circuit before audit/outbox when state unchanged |
| **Decision** | None |
| **Repair mission** | HR-OPS-OVERTIME-REAPPROVAL-NOOP |
| **Verification** | `overtime-approval-authority.test.ts` "approved-to-approved retry" + Drizzle parity |

---

## 7. Repair readiness

See [`04-repair-readiness.md`](04-repair-readiness.md).

---

## Finding index

| ID | Severity | Title |
|---|---|---|
| HR-OPS-P0-001 | P0 | Leave mutations absent from emission registry |
| HR-OPS-P1-001 | P1 | Overtime approve skips time approval authority resolution — **CLOSED** |
| HR-OPS-P1-002 | P1 | Approved leave handoff uses approve-team permission |
| HR-OPS-P1-003 | P1 | No leave Server Actions in apps/web |
| HR-OPS-P1-004 | P1 | Effective-truth matrix excludes transactional leave/time tables |
| HR-OPS-P1-005 | P1 | Employee work calendar resolution tests failing (assignment context chain) |
| HR-OPS-P1-006 | P1 | Overtime approved→approved retry emits duplicate approval facts |
| HR-OPS-P2-001 | P2 | Timesheet leave entry timezone UTC vs calendar expectation |
| HR-OPS-P2-002 | P2 | Stale time command count comment in emission registry |
| HR-OPS-P2-003 | P2 | Session resolution tie order undefined at equal timestamps |
| HR-OPS-P2-004 | P2 | No DB overlap constraint for approved leave windows |
| HR-OPS-P2-005 | P2 | Production attendance source fail-closed by design (HR-ENT-14) |
| HR-OPS-P2-006 | P2 | Overtime authority `asOf` uses UTC date from stored instant |
| HR-OPS-P3-001 | P3 | Leave concurrency test cleanup hook timeout |

---

## HR-OPS-P1-005 (calendar resolution test failures)

| Field | Value |
|---|---|
| **Paths/symbols** | `time/employee-work-calendar-resolution.ts` · `calendar-scope-assignment.test.ts` · `calendar-scope.parity.test.ts` · `human-resources.time.test.ts` calendar override block |
| **Conflicting authorities** | Tests expect scoped calendar precedence; resolution returns failure |
| **Observed disk** | Audit run: 16 failing tests across calendar-scope and calendar override paths; failures at `resolveEmployeeWorkCalendar` / assignment context step (`context.ok` false) or `human_resources.no_deterministic_assignment` vs expected `conflict` |
| **Expected contract** | Memory fixtures with scope assignments resolve deterministically per precedence rules |
| **Consequence** | Calendar scope resolution evidence red; blocks confidence in leave segment expansion and timesheet generation calendar path |
| **Recommendation** | Trace fixture wiring for `AssignmentContextQueryPort` in tests; align error code for employment tie scenario with test contract |
| **Decision** | None |
| **Repair mission** | HR-OPS-TIME-CALENDAR-RESOLUTION-FIXTURES |
| **Verification** | `calendar-scope*.test.ts` + calendar override unit tests green |

---

## HR-OPS-P2-005 (HR-ENT-14 attendance ingestion)

| Field | Value |
|---|---|
| **Paths/symbols** | `src/production-attendance-source.ts` · `apps/web/lib/erp/human-resources-attendance-source-port.ts` |
| **Conflicting authorities** | HR-ENT-14 requires production connector; disk ships fail-closed stub |
| **Observed disk** | `fetchEvents` returns `CONFLICT` / dependency unavailable; inline import events bypass port |
| **Expected contract** | Explicit connector scope or documented manual/import-only posture |
| **Consequence** | No live attendance pull integration; import path is production path |
| **Recommendation** | Product mission for connector or maintain HR-ENT-14 Partial with import-only evidence |
| **Decision** | Aligns with enterprise.md Major — not a defect if scope is import-only |
| **Repair mission** | HR-ENT-14-ATTENDANCE-CONNECTOR (future) |
| **Verification** | Connector implements `AttendanceSourcePort` with tenancy + idempotency tests |
