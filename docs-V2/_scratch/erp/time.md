# Complete HR Time Sub-Module Requirements

The **Time** sub-module should be a complete workforce-time capability covering:

> **work calendars → schedules → shifts → attendance → timesheets → overtime facts → approval → payroll handoff**

It should remain inside `@afenda/human-resources` unless scheduling becomes a large standalone workforce-management product later.

---

# 1. Module responsibility

The Time sub-module owns the authoritative operational facts for:

* when an employee is expected to work;
* when an employee actually worked;
* attendance exceptions;
* approved working time;
* approved overtime quantities;
* timesheet approval;
* payroll-ready time facts.

It does **not** own:

* payroll calculations;
* salary or hourly rate calculation;
* leave entitlement balances;
* biometric device infrastructure;
* employee master records;
* holiday master data outside organization work calendars;
* accounting postings.

---

# 2. Functional scope

## 2.1 Work calendar

Defines organization working days, weekends, holidays, and expected working hours.

Capabilities:

* create a work calendar;
* define weekly working patterns;
* define standard daily hours;
* define rest days;
* add organization holidays;
* override a specific calendar date;
* support half-days and shortened days;
* assign calendars to employees, locations, departments, or legal entities;
* resolve the effective calendar for an employee and date;
* version calendar changes without rewriting historical attendance.

Examples:

```text
Malaysia Office Calendar
Retail Outlet Calendar
Factory 6-Day Calendar
Vietnam Feed Division Calendar
```

---

## 2.2 Shift definitions

Defines reusable working-time patterns.

Capabilities:

* create shifts;
* amend future shift definitions;
* activate and deactivate shifts;
* support fixed and flexible shifts;
* support overnight shifts;
* define paid and unpaid breaks;
* define grace periods;
* define minimum and maximum shift duration;
* define expected work minutes;
* define earliest clock-in and latest clock-out windows;
* define overtime eligibility;
* define shift location and timezone;
* define rest-day or public-holiday shifts.

Examples:

```text
Office: 09:00–18:00
Morning Retail: 07:00–15:00
Evening Retail: 15:00–23:00
Night Factory: 22:00–06:00
Flexible Office: 8 hours between 07:00–20:00
```

---

## 2.3 Employee scheduling

Assigns expected working periods to employees.

Capabilities:

* assign a shift to an employee;
* assign repeating shift patterns;
* publish schedules;
* amend unpublished schedules;
* replace or cancel future assignments;
* assign employees temporarily to another location;
* support shift rotation;
* support split shifts;
* support open shifts where business operations require them;
* detect overlapping assignments;
* detect insufficient rest between shifts;
* preserve historical published schedules;
* compare scheduled versus actual time.

The system should distinguish:

```text
planned
published
changed
cancelled
completed
```

A published shift must not be silently rewritten after attendance exists.

---

## 2.4 Attendance capture

Records actual attendance events.

Supported events:

```text
clock_in
clock_out
break_start
break_end
manual_adjustment
```

Capabilities:

* employee clock-in and clock-out;
* supervisor-entered attendance;
* import from approved external systems;
* record source and source reference;
* prevent accidental duplicate events;
* support overnight attendance;
* associate attendance with a scheduled shift;
* allow attendance without a scheduled shift;
* record location, device, or terminal metadata where available;
* flag early arrival, late arrival, early departure, and missing clock-out;
* flag attendance outside permitted windows;
* detect overlapping attendance sessions;
* calculate raw attendance duration;
* preserve original imported facts.

Attendance events should be append-only after capture. Corrections should create controlled adjustments rather than silently overwriting the original event.

---

## 2.5 Attendance sessions

Raw events should be resolved into attendance sessions.

Example:

```text
Clock in     08:57
Break start  12:10
Break end    13:02
Clock out    18:11
```

Resolved result:

```text
Gross duration: 554 minutes
Unpaid break:    52 minutes
Worked duration: 502 minutes
```

Capabilities:

* pair clock-in and clock-out events;
* calculate break duration;
* identify incomplete sessions;
* split sessions across calendar dates where required;
* associate sessions with scheduled shifts;
* flag manual review requirements;
* retain calculation provenance.

---

## 2.6 Attendance exceptions

The module should identify and manage exceptions including:

```text
late arrival
early departure
absence
missing clock-in
missing clock-out
unplanned attendance
overlapping attendance
excessive break
insufficient rest
schedule mismatch
location mismatch
overtime candidate
```

Capabilities:

* generate exception records;
* assign exceptions for review;
* excuse an exception;
* reject an attendance event;
* correct an attendance event;
* add supervisor remarks;
* retain evidence references;
* preserve a complete correction history.

An exception is a review object, not automatically a payroll deduction.

---

## 2.7 Timesheets

Timesheets are approval aggregates that convert attendance and other authorized sources into payroll-ready time facts.

Capabilities:

* create a timesheet for an employee and period;
* generate entries from attendance;
* add manual entries when authorized;
* classify time;
* amend draft entries;
* calculate totals;
* submit;
* return for correction;
* approve;
* reject;
* reopen under controlled permission;
* lock after payroll handoff;
* supersede incorrect approved timesheets through adjustment.

Recommended lifecycle:

```text
draft
submitted
returned
approved
rejected
locked
superseded
```

---

## 2.8 Timesheet entries

Timesheet entries should be separate database rows.

Each entry should support:

```ts
type TimesheetEntry = {
  id: TimesheetEntryId;
  organizationId: OrganizationId;
  timesheetId: TimesheetId;
  employeeId: EmployeeId;

  workDate: string;
  timezone: string;

  sourceType:
    | "attendance"
    | "schedule"
    | "manual"
    | "leave"
    | "external";

  sourceReference: string | null;

  timeType:
    | "regular"
    | "overtime"
    | "rest_day"
    | "public_holiday"
    | "night"
    | "call_back"
    | "training"
    | "travel"
    | "standby"
    | "unpaid";

  startedAt: string | null;
  endedAt: string | null;

  recordedMinutes: number;
  approvedMinutes: number;

  costCenterId: string | null;
  projectId: string | null;
  locationId: string | null;
  departmentId: string | null;

  approvalReference: string | null;
  evidenceReference: string | null;

  version: number;
};
```

Not every organization needs every `timeType`, but the underlying model should support controlled extension.

---

# 3. Overtime requirements

Overtime must be represented clearly, but workflow ownership should be separated from payroll calculation.

## 3.1 Required overtime capability

The Time sub-module should support:

* identifying overtime candidates;
* recording requested overtime where required;
* recording pre-approved overtime;
* recording actual overtime;
* supervisor approval;
* approved overtime minutes;
* overtime classification;
* reason and evidence;
* payroll handoff.

Recommended classifications:

```text
weekday_overtime
rest_day_overtime
public_holiday_overtime
night_overtime
call_back
emergency_overtime
```

## 3.2 Overtime lifecycle

Where the organization requires pre-approval:

```text
requested
approved
rejected
worked
verified
cancelled
```

The module should distinguish:

```text
requested minutes
approved maximum minutes
actual worked minutes
payroll-approved minutes
```

These values must not be treated as interchangeable.

## 3.3 Payroll boundary

Time provides:

```ts
{
  employeeId,
  periodStart,
  periodEnd,
  regularMinutes,
  overtimeMinutesByType,
  unpaidMinutes,
  holidayMinutes,
  restDayMinutes,
  nightMinutes,
  attendanceExceptions,
  approvalReference
}
```

Payroll determines:

* pay rate;
* overtime multiplier;
* taxable treatment;
* allowances;
* deductions;
* statutory calculations;
* final monetary value.

---

# 4. Break management

The module must support:

* scheduled breaks;
* actual breaks;
* paid breaks;
* unpaid breaks;
* automatic break deduction where legally permitted;
* missing break records;
* excessive break detection;
* break-waiver evidence where applicable;
* multiple breaks per shift.

Break rules must be effective-dated because future policy changes must not alter historical calculations.

---

# 5. Flexible work requirements

The module should support common flexible-work models:

## Fixed schedule

```text
09:00–18:00
```

## Flexible hours

```text
Employee completes 8 hours between 07:00–20:00
```

## Core hours

```text
Employee must be present from 10:00–15:00
```

## Compressed week

```text
Four 10-hour days
```

## Split shift

```text
07:00–11:00 and 17:00–21:00
```

## Rotating shift

```text
Morning → Evening → Night
```

## Unscheduled work

Used for field staff, sales staff, emergency duty, or approved off-site work.

---

# 6. Absence and leave integration

Leave remains owned by the Leave sub-domain, but Time must consume approved leave facts.

Required integration:

```ts
interface ApprovedLeaveQueryPort {
  listApprovedLeaveForEmployeePeriod(input: {
    organizationId: OrganizationId;
    employeeId: EmployeeId;
    periodStart: string;
    periodEnd: string;
  }): Promise<Result<readonly ApprovedLeaveFact[]>>;
}
```

Time uses approved leave to:

* explain absence;
* populate timesheet entries;
* prevent incorrect absence exceptions;
* calculate expected versus worked time;
* provide payroll-ready paid or unpaid leave minutes.

Time must not independently approve leave or mutate leave balances.

---

# 7. Employment integration

Time must validate against active employment and assignment facts.

Required information:

* employment start and end date;
* employee status;
* primary assignment;
* department;
* location;
* legal entity;
* manager;
* work calendar;
* timezone;
* standard weekly hours;
* employment type;
* overtime eligibility.

Time must reject or flag attendance outside active employment unless a controlled correction process permits it.

---

# 8. Required aggregates

A complete implementation should include these aggregates.

## Core aggregates

```text
WorkCalendar
Shift
ShiftAssignment
AttendanceEvent
AttendanceSession
AttendanceException
Timesheet
TimesheetEntry
OvertimeRequest
```

Depending on implementation style, `AttendanceSession` may be derived and persisted as a projection rather than a command-owned aggregate.

---

# 9. Required database tables

Recommended authoritative DDL:

```text
hr_work_calendar
hr_work_calendar_week_pattern
hr_work_calendar_date_override   # Model A (HR-TIME-P0-01): responsibilities fulfilled by extended hr_work_calendar_holiday

hr_shift
hr_shift_break

hr_shift_assignment
hr_shift_assignment_segment

hr_attendance_event
hr_attendance_session
hr_attendance_exception
hr_attendance_adjustment

hr_timesheet
hr_timesheet_entry

hr_overtime_request
hr_overtime_approval
```

Optional tables only when required:

```text
hr_schedule_pattern
hr_schedule_publication
hr_time_policy
hr_time_policy_assignment
hr_attendance_import_batch
hr_attendance_import_error
```

---

# 10. Minimum table responsibilities

## `hr_work_calendar`

Stores:

* calendar identity;
* timezone;
* standard weekly minutes;
* status;
* effective dates.

## `hr_work_calendar_week_pattern`

Stores:

* day of week;
* working or non-working status;
* expected start/end;
* expected minutes.

## `hr_work_calendar_date_override`

**HR-TIME-P0-01 decision (Model A):** no separate `hr_work_calendar_date_override` table. Date-override responsibilities live on extended `hr_work_calendar_holiday` with columns `override_kind`, `is_working_day`, and `expected_minutes` (migration `0004_hr_work_calendar_holiday_override`). Commands: `addCalendarDateOverride` / `removeCalendarDateOverride` (plus existing holiday add/remove).

Stores (via `hr_work_calendar_holiday`):

* holiday;
* half-day;
* special working day / shortened day;
* temporary closure;
* replacement working day.

## `hr_shift`

Stores:

* shift code;
* start and end local time;
* overnight flag;
* expected minutes;
* grace rules;
* active status;
* effective dates.

## `hr_shift_assignment`

Stores:

* employee;
* shift;
* scheduled date;
* start and end timestamps;
* location;
* publication status;
* assignment source.

## `hr_attendance_event`

Stores the immutable event:

* event type;
* timestamp;
* timezone;
* source;
* external reference;
* device/location metadata;
* original payload checksum where imported.

## `hr_attendance_session`

Stores resolved attendance:

* first clock-in;
* final clock-out;
* break minutes;
* worked minutes;
* linked shift;
* resolution status.

## `hr_attendance_exception`

Stores:

* exception type;
* severity;
* detected facts;
* review status;
* resolution;
* reviewer;
* evidence.

## `hr_timesheet`

Stores:

* employee;
* period;
* lifecycle status;
* totals;
* submitted and approved metadata;
* version;
* payroll lock status.

## `hr_timesheet_entry`

Stores individual daily or interval-based approved time facts.

## `hr_overtime_request`

Stores:

* employee;
* requested work period;
* reason;
* requested minutes;
* approved maximum;
* actual minutes;
* status.

---

# 11. Command requirements

## Work calendar commands

```text
createWorkCalendar
updateWorkCalendar
activateWorkCalendar
deactivateWorkCalendar
setWeeklyWorkPattern
addCalendarDateOverride
removeCalendarDateOverride
assignWorkCalendar
endWorkCalendarAssignment
```

## Shift commands

```text
createShift
updateShift
activateShift
deactivateShift
addShiftBreak
removeShiftBreak
```

## Scheduling commands

```text
assignShift
assignShiftPattern
publishSchedule
changeShiftAssignment
cancelShiftAssignment
swapShiftAssignment
completeShiftAssignment
```

Shift swapping may be omitted initially unless already required by operations.

## Attendance commands

```text
recordClockIn
recordClockOut
recordBreakStart
recordBreakEnd
importAttendanceEvents
recordManualAttendance
correctAttendanceEvent
voidAttendanceEvent
resolveAttendanceSession
```

## Exception commands

```text
reviewAttendanceException
excuseAttendanceException
rejectAttendanceException
resolveAttendanceException
```

## Timesheet commands

```text
createTimesheet
generateTimesheetEntries
addTimesheetEntry
updateTimesheetEntry
removeTimesheetEntry
submitTimesheet
returnTimesheet
approveTimesheet
rejectTimesheet
reopenTimesheet
lockTimesheetForPayroll
supersedeTimesheet
```

## Overtime commands

```text
requestOvertime
approveOvertime
rejectOvertime
cancelOvertime
recordActualOvertime
verifyOvertime
```

---

# 12. Query requirements

```text
getWorkCalendarById
resolveEmployeeWorkCalendar
listCalendarDateOverrides

getShiftById
listShifts
listEmployeeSchedule
listLocationSchedule
getScheduledShiftForEmployeeDate

listAttendanceEvents
listAttendanceAdjustments
getAttendanceSession
listAttendanceSessions
listAttendanceExceptions
listUnresolvedAttendanceExceptions
getDailyAttendanceSummary

getTimesheetById
getTimesheetForEmployeePeriod
listTimesheets
listTimesheetEntries
getTimesheetTotals

getOvertimeRequestById
listEmployeeOvertime
listPendingOvertimeApprovals

getApprovedTimeHandoff
```

---

# 13. Business invariants

## Organization isolation

Every table and operation must be scoped by:

```text
organization_id
```

No cross-organization employee, calendar, shift, attendance, or approval references are permitted.

## Shift invariants

* shift start and end must resolve to a positive duration;
* overnight shifts must be explicitly represented;
* break duration cannot exceed shift duration;
* paid and unpaid break totals must be valid;
* inactive shifts cannot receive new assignments;
* conflicting shift assignments are rejected unless explicitly permitted;
* historical published shifts are immutable except through controlled adjustment.

## Attendance invariants

* event timestamp is required;
* event source is required;
* duplicate source references are idempotent;
* clock-out cannot resolve before clock-in;
* breaks cannot produce negative durations;
* attendance sessions cannot overlap unless policy permits multiple concurrent assignments;
* corrections preserve original event history;
* imported events retain source traceability.

## Timesheet invariants

* one active timesheet per employee and period;
* period start must precede period end;
* approved minutes cannot be negative;
* submitted timesheets cannot be freely edited;
* approved timesheets require controlled reopening;
* locked timesheets cannot be changed;
* every approved entry must have an auditable source or authorized manual reason;
* totals must equal the sum of entries;
* payroll handoff only uses approved and unlocked-for-transfer facts.

## Overtime invariants

* overtime request cannot exceed policy limits without override;
* approver cannot approve outside their authority;
* approved maximum and actual minutes must remain separate;
* payroll-approved overtime cannot exceed actual verified overtime unless an explicit policy allows minimum call-back payment;
* overtime approval must be organization-scoped and auditable.

---

# 14. Timezone requirements

Timezone handling is critical.

The module must:

* store event timestamps as absolute instants;
* retain the originating timezone;
* resolve work dates using the employee or location timezone;
* support daylight-saving changes where applicable;
* support employees travelling between timezones;
* prevent server timezone from affecting business calculations;
* preserve local scheduled start and end semantics;
* calculate overnight shifts correctly.

Recommended storage:

```text
occurred_at          timestamptz
source_timezone      text
local_work_date      date
```

Do not rely only on UTC timestamps without business timezone context.

---

# 15. Cross-midnight requirements

A shift may begin on one date and end on another.

Example:

```text
2026-07-23 22:00 → 2026-07-24 06:00
```

The module must define:

* the shift work date;
* which calendar day receives the hours;
* how public-holiday boundaries are treated;
* how overtime is split;
* how timesheet entries are allocated.

Recommended rule:

> The scheduled shift start date is the operational work date, while payroll classifications may split minutes across legal calendar boundaries when required.

---

# 16. Approval requirements

Approval should use a clear authority chain.

Possible sequence:

```text
employee submission
line manager review
department approval
HR exception review
payroll handoff
```

Not every organization needs every step. Approval policy should be configurable without hard-coding five mandatory levels.

Each approval must record:

```text
actor
action
timestamp
role or authority
comment
version approved
correlation ID
```

---

# 17. Permissions

Recommended permission catalogue:

```text
hr.time.calendar.read
hr.time.calendar.manage

hr.time.shift.read
hr.time.shift.manage

hr.time.schedule.read
hr.time.schedule.manage
hr.time.schedule.publish

hr.time.attendance.self.record
hr.time.attendance.read
hr.time.attendance.manage
hr.time.attendance.correct

hr.time.exception.read
hr.time.exception.resolve

hr.time.timesheet.self.read
hr.time.timesheet.self.edit
hr.time.timesheet.submit
hr.time.timesheet.read
hr.time.timesheet.approve
hr.time.timesheet.reopen
hr.time.timesheet.lock

hr.time.overtime.request
hr.time.overtime.read
hr.time.overtime.approve

hr.time.handoff.read
```

Self-service access must be distinguished from manager and HR access.

---

# 18. Audit and outbox requirements

Every material mutation must produce:

* audit event;
* correlation ID;
* actor;
* organization;
* aggregate ID;
* previous version;
* resulting version;
* command type;
* timestamp.

Important outbox events:

```text
hr.time.schedule.published
hr.time.attendance.recorded
hr.time.attendance.corrected
hr.time.exception.created
hr.time.timesheet.submitted
hr.time.timesheet.approved
hr.time.timesheet.reopened
hr.time.timesheet.locked
hr.time.overtime.approved
hr.time.payroll_handoff.ready
```

**Disk naming (HR-TIME-P0-04):** plan shorthand `hr.time.*` maps to outbox types `human-resources.time.*.v1` (for example `human-resources.time.schedule.published.v1`). Exception: timesheet approval keeps the legacy type `human-resources.timesheet.approved.v1`.

Sensitive attendance metadata should be redacted where appropriate.

---

# 19. External device and import boundary

The HR package should not directly implement biometric terminals.

Use a port:

```ts
interface AttendanceSourcePort {
  fetchEvents(input: {
    organizationId: OrganizationId;
    cursor?: string;
  }): Promise<Result<AttendanceSourceBatch>>;
}
```

Imports should support:

* batch identity;
* source identity;
* event idempotency;
* rejected row capture;
* partial failure;
* replay safety;
* import audit;
* external employee mapping;
* timezone validation.

Production attendance should not depend exclusively on device availability. Controlled manual capture must remain possible.

---

# 20. Payroll handoff

The public boundary should expose approved facts, not raw mutable attendance.

```ts
type ApprovedTimeHandoff = {
  organizationId: OrganizationId;
  employeeId: EmployeeId;
  employmentId: EmploymentId;

  periodStart: string;
  periodEnd: string;

  regularMinutes: number;
  overtime: readonly {
    type: OvertimeType;
    minutes: number;
  }[];

  publicHolidayMinutes: number;
  restDayMinutes: number;
  nightMinutes: number;
  unpaidMinutes: number;
  paidLeaveMinutes: number;
  unpaidLeaveMinutes: number;

  timesheetId: TimesheetId;
  timesheetVersion: number;
  approvedAt: string;
  approvalReference: string;
};
```

The handoff should be deterministic and versioned so payroll can identify whether approved facts changed after extraction.

---

# 21. Recommended package structure

```text
src/time/
├── index.ts
├── permissions.ts
├── brands.ts
├── types.ts
├── error-codes.ts
├── policies.ts
│
├── calendar/
│   ├── schemas.ts
│   ├── commands.ts
│   ├── queries.ts
│   ├── store.ts
│   └── invariants.ts
│
├── shift/
│   ├── schemas.ts
│   ├── commands.ts
│   ├── queries.ts
│   ├── store.ts
│   └── invariants.ts
│
├── scheduling/
│   ├── schemas.ts
│   ├── commands.ts
│   ├── queries.ts
│   ├── store.ts
│   └── conflicts.ts
│
├── attendance/
│   ├── schemas.ts
│   ├── commands.ts
│   ├── queries.ts
│   ├── store.ts
│   ├── session-resolution.ts
│   └── exception-detection.ts
│
├── timesheet/
│   ├── schemas.ts
│   ├── commands.ts
│   ├── queries.ts
│   ├── store.ts
│   └── totals.ts
│
├── overtime/
│   ├── schemas.ts
│   ├── commands.ts
│   ├── queries.ts
│   ├── store.ts
│   └── policies.ts
│
└── handoff/
    ├── approved-time-handoff.ts
    └── ports.ts
```

---

# 22. P0 implementation disposition

P0 should not attempt every advanced workforce-management feature immediately.

## P0 mandatory

```text
work calendars
calendar overrides
shift definitions
shift assignments
attendance events
attendance sessions
attendance corrections
attendance exceptions
timesheets
timesheet entries
submission and approval
approved overtime facts
payroll handoff
Drizzle persistence
memory-store parity
audit and outbox
```

## P1 appropriate

```text
shift swapping
open-shift bidding
advanced roster optimization
geofencing
biometric device connectors
complex union rules
standby and call-back workflows
multi-stage overtime requests
automatic schedule generation
forecast-based labour planning
```

The database design should not block P1, but P0 should not pretend those capabilities exist.

---

# 23. Acceptance test matrix

The complete Time module should pass at least these scenarios:

| Area        | Required scenario                                             |
| ----------- | ------------------------------------------------------------- |
| Calendar    | Normal day, holiday, half-day, replacement workday            |
| Shift       | Day shift, overnight shift, flexible shift, split shift       |
| Schedule    | Assignment, conflict rejection, publish, controlled amendment |
| Attendance  | Clock-in/out, breaks, missing event, duplicate source event   |
| Session     | Overnight resolution, multiple breaks, incomplete session     |
| Exceptions  | Late, early departure, absence, unscheduled attendance        |
| Correction  | Original event retained and corrected result produced         |
| Timesheet   | Generate, edit draft, submit, return, approve, reopen         |
| Overtime    | Requested, approved, actual, verified minutes remain distinct |
| Timezone    | Employee and location timezone differ                         |
| Integration | Approved leave suppresses false absence                       |
| Payroll     | Only approved facts are returned                              |
| Security    | Employee self-service cannot approve their own timesheet      |
| Isolation   | Cross-organization access rejected                            |
| Concurrency | Stale expected version rejected                               |
| Idempotency | Repeated external attendance event does not duplicate         |
| Persistence | Identical contract suite passes for memory and Drizzle stores |

---

# Final module boundary

The complete Time sub-module should be defined as:

> **The authoritative HR capability for expected work schedules, actual attendance, reviewed time exceptions, approved timesheets, and payroll-ready time quantities.**

Therefore, P0-05 should not merely add tables for the current partial commands. It should first align the command surface, store contract, DDL, Drizzle adapter, permissions, audit events, and payroll handoff against this full boundary. Any currently shipped command that falls outside this model should be corrected; any mandatory capability missing from it should be added.
