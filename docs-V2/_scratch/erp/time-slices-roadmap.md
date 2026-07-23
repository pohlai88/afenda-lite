# HR Time — P0 closure slices roadmap

| Field | Value |
| ----- | ----- |
| Surface | `docs-V2/_scratch/erp/time-slices-roadmap.md` |
| Mode | Scratch ops — implementation sequencing (spec) |
| Audience | Engineers implementing `@afenda/human-resources` Time |
| Authority | [time.md](./time.md) §22 P0 · §11–§12 · §18 · §23 · final boundary (§1254) |
| Parent roadmap | [human-resources-roadmap.md](./human-resources-roadmap.md) — HR9 / HR10 |
| Baseline snapshot | 2026-07-23 — gap audit vs disk (7/7 time tests green; P0 spine present, boundary incomplete) |
| Lifecycle | **HR10 in progress** — do not claim Time MOD-ready until HR-TIME-P0-07 closes |

**Why this file:** [time.md](./time.md) is **what** (requirements). [human-resources-roadmap.md](./human-resources-roadmap.md) HR10 is the **phase**. This document is **how/when** to close the verified P0 gaps without tables-only drift.

---

## Goals

1. Close every **P0 mandatory** item in [time.md §22](./time.md) with disk evidence (commands, store, DDL, permissions, events, tests).
2. Follow [time.md final boundary](./time.md): align command surface, store contract, adapter, permissions, audit/outbox, and payroll handoff **before** optional-table expansion.
3. Ship in **one-mission-per-chat** slices with pasted verify commands.

## Non-goals

- P1 capabilities in [time.md §22](./time.md) (`shift swapping`, `open-shift bidding`, geofencing, biometric connectors, roster optimization).
- Payroll gross-to-net, rate calculation, or `@afenda/payroll` peer imports inside HR.
- Living `docs/` controlled bodies (Docs-lane dormant).
- Product UI features/routes beyond minimal `apps/web` Server Actions where a slice explicitly includes them.

## Constraints (hard stops)

| Stop | Rule |
| ---- | ---- |
| No shims | Real store + Drizzle + memory parity per slice — no throw-TODO commands |
| No tables-only | DDL changes must land with store + commands + tests in the same slice (or HR-TIME-P0-01 decision-only slice) |
| Tenancy | Every new/changed `hr_*` root → `hard-tenant-roots.ts` + `pnpm audit:tenancy-nulls` |
| Events | New domain events → `@afenda/events` schema + `module.manifest` `emits` + emission registry |
| Leave boundary | Time consumes approved leave via port — never approves leave or mutates balances |
| Permission prefix | Implement `human-resources.time.*` (disk convention); amend [time.md §17](./time.md) labels in a docs-only note if `hr.time.*` shorthand is retained for readability |

---

## Baseline — what HR10 already shipped (2026-07-23)

Verified on disk (do not re-implement):

| Layer | Evidence |
| ----- | -------- |
| Package API | `packages/erp/human-resources/src/time/**` exported from `src/index.ts` |
| Store contract | `packages/erp/human-resources/src/store/time.ts` (`HumanResourcesTimeStore`) |
| Adapters | `adapters/memory/time.ts`, `adapters/drizzle/time.ts` (composed in `adapters/drizzle/store.ts`) |
| DDL | `0001_hr_work_calendar.sql`, `0002_hr_time.sql`; Drizzle schema `human-resources.ts` |
| Commands (core) | Calendar, shift, scheduling, attendance, sessions, exceptions (review), timesheet lifecycle, overtime, handoff query |
| Permissions | `platform-permission-catalog.ts` — `human-resources.time.*` (+ legacy `human-resources.timesheet.approve`) |
| Tests | `human-resources.time.test.ts`, `human-resources.time.parity.test.ts` — **7/7 pass** |
| Web (minimal) | `apps/web/app/actions/hr-time.ts` — 7 actions |
| Single outbox event | `human-resources.timesheet.approved.v1` on approve path |

**Accepted divergences (unless HR-TIME-P0-01 reopens):**

- `archiveWorkCalendar` instead of activate/deactivate pair.
- `work_week_json` on `hr_work_calendar` instead of `hr_work_calendar_week_pattern`.
- `hr_work_calendar_holiday` instead of generic `hr_work_calendar_date_override` table.
- `publishShiftAssignment` (per assignment) instead of batch `publishSchedule`.
- `createOvertimeRequest` / `lockTimesheet` naming vs plan shorthand.

---

## Gap summary → slice map

| Audit gap cluster | P0? | Owning slice |
| ----------------- | --- | ------------ |
| Calendar half-day / replacement override model | Yes | HR-TIME-P0-01 |
| Missing commands/queries + exception-create surface | Yes | HR-TIME-P0-02 |
| `ApprovedLeaveQueryPort` + timesheet generation / absence logic | Yes | HR-TIME-P0-03 |
| §18 events + emission registry + correlation fixtures | Yes | HR-TIME-P0-04 |
| `AttendanceSourcePort` + `importAttendanceEvents` | Yes | HR-TIME-P0-05 |
| Exception auto-detection + operational queries | Yes | HR-TIME-P0-06 |
| §23 acceptance matrix tests | Yes | HR-TIME-P0-07 |
| Permission normalization + `apps/web` actions | Yes | HR-TIME-P0-08 |
| `assignShiftPattern`, batch `publishSchedule` | P1 / defer | — |
| `swapShiftAssignment` | P1 ([time.md §22](./time.md)) | — |

---

## Slice dependency graph

```text
HR-TIME-P0-01 (calendar override decision + DDL if needed)
  └─► HR-TIME-P0-02 (command/query alignment)
        ├─► HR-TIME-P0-03 (leave port — requires HR11 leave on disk ✅)
        ├─► HR-TIME-P0-05 (import port — can parallel after P0-02 store hooks)
        └─► HR-TIME-P0-06 (exception detection)
              └─► HR-TIME-P0-04 (events/registry — after mutation surface stable)
                    └─► HR-TIME-P0-07 (§23 test matrix)
                          └─► HR-TIME-P0-08 (web + permission cleanup)
```

**Parallel rule:** HR-TIME-P0-03 and HR-TIME-P0-05 may run in separate chats once HR-TIME-P0-02 merges; HR-TIME-P0-04 must follow stable command ids.

---

## Slices (one Agent chat each)

Pattern per slice: **decision/DDL (if any) → store → commands/queries → memory + Drizzle → manifest ids + auth map → tests → verify commands**.

---

### HR-TIME-P0-01 — Calendar override model

| | |
| --- | --- |
| **Depends on** | HR9 calendar DDL shipped (`0001`) |
| **Closes** | [time.md §2.1](./time.md) half-day / shortened day / replacement workday; §9 `date_override` gap |
| **In scope** | **Decision + implementation** for override shape: (A) extend `hr_work_calendar_holiday` with `override_kind` + `expected_minutes` / `is_working_day`, or (B) add `hr_work_calendar_date_override` per [time.md §9](./time.md). Update scratch note in [time.md](./time.md) §9–§10 if (A) is chosen. Migration + Drizzle + memory parity. |
| **Out of scope** | `week_pattern` normalized table (keep `work_week_json` per HR9 decision) |
| **Deliverables** | Migration `0003_*` (if needed) · schema · store methods · `addCalendarDateOverride` / `removeCalendarDateOverride` **or** extend holiday commands · tests: normal day, holiday, half-day, replacement workday |
| **Verify** | `pnpm --filter @afenda/human-resources test -- human-resources.time` · `pnpm audit:tenancy-nulls` |
| **Done when** | §23 Calendar row (4 scenarios) has automated coverage |

---

### HR-TIME-P0-02 — Command and query surface alignment

| | |
| --- | --- |
| **Depends on** | HR-TIME-P0-01 (if override DDL changed); else can start immediately |
| **Closes** | [time.md §11](./time.md) / §12 missing P0 surface |
| **In scope** | **Commands:** `endWorkCalendarAssignment`; public `createAttendanceException` (wrap store); thin wrappers `recordClockOut`, `recordBreakStart`, `recordBreakEnd`; `recordManualAttendance` (explicit `source: manual` policy). **Queries:** `getScheduledShiftForEmployeeDate`, `listLocationSchedule`, `listUnresolvedAttendanceExceptions`, `getDailyAttendanceSummary`, `getTimesheetForEmployeePeriod`, `getTimesheetTotals`, `listPendingOvertimeApprovals`. Register `module-ids`, manifest command/query lists, auth maps. |
| **Out of scope** | `assignShiftPattern`, batch `publishSchedule`, `importAttendanceEvents` (P0-05), `swapShiftAssignment` (P1) |
| **Deliverables** | `src/time/**` · `schemas/time.ts` · `store/time.ts` · memory + drizzle adapters · unit tests per new query/command |
| **Verify** | `pnpm --filter @afenda/human-resources test -- human-resources.time` · `pnpm --filter @afenda/human-resources typecheck` |
| **Done when** | Every §12 query has a named export; exception create is not store-only |

---

### HR-TIME-P0-03 — Leave integration (§6)

| | |
| --- | --- |
| **Depends on** | HR11 leave on disk ✅ · HR-TIME-P0-02 (`generateTimesheetEntries` stable) |
| **Closes** | [time.md §6](./time.md) `ApprovedLeaveQueryPort`; §23 Integration row |
| **In scope** | Port type in `packages/erp/human-resources/src/ports.ts` (or `time/handoff/ports.ts`). App adapter in `apps/web/lib/erp/` calling leave query APIs. Wire `generateTimesheetEntries` to emit `sourceType: leave` rows from approved facts. Suppress false `absence` exceptions when approved leave covers the date. |
| **Out of scope** | Leave approval; entitlement mutation |
| **Deliverables** | Port · adapter · store generation logic · test: approved leave suppresses false absence |
| **Verify** | `pnpm --filter @afenda/human-resources test -- human-resources.time` |
| **Done when** | Handoff `paidLeaveMinutes` / `unpaidLeaveMinutes` populated from generated entries without manual entry |

---

### HR-TIME-P0-04 — Audit, outbox, emission registry (§18)

| | |
| --- | --- |
| **Depends on** | HR-TIME-P0-02 (final command ids) |
| **Closes** | [time.md §18](./time.md) material mutations; registry parity |
| **In scope** | Event types (disk naming: `human-resources.time.*.v1` or align to plan `hr.time.*` — pick one prefix in this slice): `schedule.published`, `attendance.recorded`, `attendance.corrected`, `exception.created`, `timesheet.submitted`, `timesheet.reopened`, `timesheet.locked`, `overtime.approved`, `payroll_handoff.ready` (+ keep `timesheet.approved`). Expand `mutation-emission-registry.ts` for **all** time mutation commands. Extend `correlation-integrity.test.ts` fixtures. Drizzle `emitOutbox` on happy paths (mirror leave/employee patterns). |
| **Out of scope** | Redacting device metadata in event payloads (document policy; implement if HR security slice requires) |
| **Deliverables** | `@afenda/events` schemas · manifest `emits` · registry · adapter outbox calls · `emission-registry-parity.test.ts` green |
| **Verify** | `pnpm --filter @afenda/human-resources test -- emission-registry correlation-integrity human-resources.time` |
| **Done when** | Registry lists every time command; correlation fixtures cover each `domain_event` entry |

---

### HR-TIME-P0-05 — Attendance import boundary (§19)

| | |
| --- | --- |
| **Depends on** | HR-TIME-P0-02 (`importAttendanceEvents` command slot) |
| **Closes** | [time.md §19](./time.md) `AttendanceSourcePort`; §11 `importAttendanceEvents` |
| **In scope** | `AttendanceSourcePort` in HR package. `importAttendanceEvents` command: batch id, source identity, per-row idempotency (`source` + `source_reference`), partial failure result, audit. Optional DDL `hr_attendance_import_batch` / `hr_attendance_import_error` only if command contract requires persistence in this slice. |
| **Out of scope** | Biometric device drivers; geofencing |
| **Deliverables** | Port · command · store transaction · tests: idempotent replay, rejected rows, partial failure |
| **Verify** | `pnpm --filter @afenda/human-resources test -- human-resources.time` |
| **Done when** | §23 Idempotency row covered for external `source_reference` |

---

### HR-TIME-P0-06 — Exception detection and resolution depth

| | |
| --- | --- |
| **Depends on** | HR-TIME-P0-02 · HR-TIME-P0-03 (leave-aware absence) |
| **Closes** | [time.md §2.6](./time.md) detection; P0 “attendance exceptions” completeness |
| **In scope** | Detection hooks: late, early departure, missing clock-in/out, unscheduled attendance, schedule mismatch (compare session to `hr_shift_assignment`). Invoke on `resolveAttendanceSession` and/or schedule publish. Tests: §23 Exceptions + Session rows. |
| **Out of scope** | Union rule engines; geofencing |
| **Deliverables** | `exception-detection.ts` (or extend `session-resolution.ts`) · store creates exceptions · tests |
| **Verify** | `pnpm --filter @afenda/human-resources test -- human-resources.time` |
| **Done when** | Exceptions created by domain rules, not only test store calls |

---

### HR-TIME-P0-07 — §23 acceptance test matrix

| | |
| --- | --- |
| **Depends on** | HR-TIME-P0-01 through P0-06 merged |
| **Closes** | [time.md §23](./time.md) full matrix |
| **In scope** | Expand `human-resources.time.test.ts` + parity suite: schedule conflict rejection, break pairing, overnight session, correction retains original event, timesheet generate/return/reopen, overtime request→approve→actual→verify, timezone divergence, stale `expectedVersion`, cross-org (extend), Drizzle parity for new scenarios. |
| **Out of scope** | New product features beyond §23 |
| **Deliverables** | Test files only (plus minimal bug fixes if tests expose defects) |
| **Verify** | `pnpm --filter @afenda/human-resources test -- human-resources.time` · `pnpm exec turbo run typecheck --filter=@afenda/human-resources` |
| **Done when** | Every §23 table row maps to ≥1 automated test (memory); parity covers critical path |

---

### HR-TIME-P0-08 — Permissions and apps/web surface

| | |
| --- | --- |
| **Depends on** | HR-TIME-P0-07 |
| **Closes** | [time.md §17](./time.md); operator/self-service entry points |
| **In scope** | Catalog: add `human-resources.time.attendance.manage` if supervisor-entered attendance is distinct from `correct`. Migrate `approveTimesheetAction` to `human-resources.time.timesheet.approve` (deprecate legacy code path with catalog seed migration note). `apps/web/app/actions/hr-time.ts`: calendar CRUD, schedule publish, clock-out/breaks, exception resolve, overtime request, generate entries, handoff — each with `runOperatorPermissionAction` + `createHumanResourcesCommandOptions()`. |
| **Out of scope** | `features/hr-time/**` UI shells (separate ui-compose mission) |
| **Deliverables** | `platform-permission-catalog.ts` · `hr-time.ts` · `__tests__` action contract tests if pattern exists |
| **Verify** | `pnpm --filter @afenda/web typecheck` · `pnpm --filter @afenda/human-resources test` |
| **Done when** | Every P0 command has a documented permission; web exposes happy-path operator flows |

---

## HR10 completion checklist

Mark HR10 **DONE** in [human-resources-roadmap.md](./human-resources-roadmap.md) only when all rows are ✅:

| # | Criterion | Slice |
| - | --------- | ----- |
| 1 | Calendar override scenarios tested | P0-01 |
| 2 | §11–§12 P0 commands/queries on disk | P0-02 |
| 3 | Leave port wired; false absence suppressed | P0-03 |
| 4 | §18 events + full emission registry | P0-04 |
| 5 | Import port + idempotent external events | P0-05 |
| 6 | Auto exception detection | P0-06 |
| 7 | §23 matrix green (memory + drizzle parity) | P0-07 |
| 8 | Permissions + web actions aligned | P0-08 |
| 9 | `pnpm audit:tenancy-nulls` — all time roots | every DDL slice |
| 10 | No peer `@afenda/payroll` imports in HR package | always |

---

## Verify commands (standard floor)

Run at end of **every** slice and paste evidence in chat:

```bash
pnpm --filter @afenda/human-resources test -- human-resources.time
pnpm --filter @afenda/human-resources typecheck
pnpm audit:tenancy-nulls
pnpm governance:packages
```

When touching events/registry:

```bash
pnpm --filter @afenda/human-resources test -- emission-registry correlation-integrity
pnpm --filter @afenda/events test
```

When touching web actions:

```bash
pnpm --filter @afenda/web typecheck
```

---

## Open questions (resolve in HR-TIME-P0-01 chat)

| # | Question | Default if no answer |
| - | -------- | -------------------- |
| 1 | Extend `hr_work_calendar_holiday` vs new `hr_work_calendar_date_override` table? | Extend holiday + `override_kind` enum (smaller migration) |
| 2 | Event prefix: `human-resources.time.*` vs plan `hr.time.*`? | Keep `human-resources.*` disk convention; note in time.md §18 |
| 3 | Batch `publishSchedule` in P0? | **No** — per-assignment publish remains; batch = P1 |
| 4 | `human-resources.timesheet.approve` vs `human-resources.time.timesheet.approve`? | Consolidate on `human-resources.time.timesheet.approve` in P0-08 |

---

## Route-outs (not this roadmap)

| Request | Owner |
| ------- | ----- |
| Payroll calculation consuming handoff | `@afenda/payroll` + HR14 in parent roadmap |
| MOD Enterprise Readiness claim | `afenda-elite-module-readiness` after HR10 DONE |
| UI features / `@afenda/ui-system` shells | `afenda-elite-frontend-scaffold` + `afenda-elite-ui-compose` |
| Living DOC-001 bodies | Docs-lane reopen |

---

## Related files

| Path | Role |
| ---- | ---- |
| [time.md](./time.md) | Requirements SSOT (Scratch) |
| [human-resources-roadmap.md](./human-resources-roadmap.md) | HR0–HR16 phase map |
| `packages/erp/human-resources/src/time/` | Implementation home |
| `packages/erp/human-resources/src/store/time.ts` | Store contract |
| `apps/web/app/actions/hr-time.ts` | Web mutation entry (P0-08) |
