# Recommended decision

Use **two independent ERP packages**:

```text
packages/erp/human-resources
packages/erp/payroll
```

Do **not** place Payroll inside Human Resources:

```text
packages/erp/human-resources/payroll   # Do not use
```

Your repository permits one category level followed by the package identity. Each ERP package must be a bounded context, published independently, own its mutation tables and expose its own manifest-controlled public API.

## Final package decision

| Capability              | Decision                        | Location                                         |
| ----------------------- | ------------------------------- | ------------------------------------------------ |
| Human Resources         | **Individual package**          | `packages/erp/human-resources`                   |
| Payroll                 | **Individual package**          | `packages/erp/payroll`                           |
| Recruitment             | **Nested capability**           | `human-resources/src/recruitment/`               |
| Onboarding/offboarding  | **Nested capability**           | `human-resources/src/lifecycle/`                 |
| Learning & Development  | **Nested capability**           | `human-resources/src/learning/`                  |
| Compensation & Benefits | **Split across HR and Payroll** | HR terms and benefits; Payroll calculation       |
| Talent/performance      | **Nested capability**           | `human-resources/src/talent/` and `performance/` |
| Attendance/leave        | **Nested capability**           | `human-resources/src/time/` and `leave/`         |

---

# 1. `packages/erp/human-resources`

## Package identity

```json
{
  "name": "@afenda/human-resources"
}
```

Recommended manifest classification:

```ts
{
  id: "human-resources",
  category: "erp",
  packageName: "@afenda/human-resources",
  band: "R1-F",
  lifecycle: "active",
  activationMode: "organization_toggle"
}
```

Do not call the package `@afenda/hr` unless the repository has deliberately standardized abbreviated package names. `@afenda/human-resources` is clearer and matches your business-capability naming approach.

## Package purpose

`@afenda/human-resources` should be the sole owner of:

> The relationship between the organization and its employees, candidates, positions, careers, learning, compensation terms and benefits entitlement.

It should not own:

* login accounts;
* authentication credentials;
* application permissions;
* payroll calculations;
* salary payment execution;
* accounting journals.

## Recommended physical structure

```text
packages/erp/human-resources/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts
│   ├── module.manifest.ts
│   ├── module-ids.ts
│   ├── permissions.ts
│   ├── authorization.ts
│   ├── command-options.ts
│   ├── ports.ts
│   ├── production-ports.ts
│   ├── store.ts
│   ├── resolve-store.ts
│   ├── drizzle-store.ts
│   ├── memory-store.ts
│   ├── schemas.ts
│   ├── parse-input.ts
│   ├── types.ts
│   ├── brands.ts
│   ├── error-codes.ts
│   │
│   ├── core/
│   │   ├── employee.ts
│   │   ├── employment.ts
│   │   ├── assignment.ts
│   │   └── employment-contract.ts
│   │
│   ├── organization/
│   │   ├── department.ts
│   │   ├── job.ts
│   │   ├── position.ts
│   │   └── reporting-line.ts
│   │
│   ├── recruitment/
│   │   ├── requisition.ts
│   │   ├── candidate.ts
│   │   ├── application.ts
│   │   ├── interview.ts
│   │   └── offer.ts
│   │
│   ├── lifecycle/
│   │   ├── onboarding.ts
│   │   ├── probation.ts
│   │   ├── confirmation.ts
│   │   ├── transfer.ts
│   │   ├── termination.ts
│   │   └── offboarding.ts
│   │
│   ├── time/
│   │   ├── shift.ts
│   │   ├── attendance-event.ts
│   │   ├── attendance-record.ts
│   │   ├── timesheet.ts
│   │   └── attendance-exception.ts
│   │
│   ├── leave/
│   │   ├── leave-policy.ts
│   │   ├── entitlement.ts
│   │   ├── leave-request.ts
│   │   └── leave-adjustment.ts
│   │
│   ├── performance/
│   │   ├── performance-cycle.ts
│   │   ├── goal.ts
│   │   ├── review.ts
│   │   └── improvement-plan.ts
│   │
│   ├── talent/
│   │   ├── competency.ts
│   │   ├── talent-profile.ts
│   │   ├── talent-pool.ts
│   │   ├── succession-plan.ts
│   │   └── career-plan.ts
│   │
│   ├── learning/
│   │   ├── course.ts
│   │   ├── learning-session.ts
│   │   ├── learning-assignment.ts
│   │   ├── completion.ts
│   │   └── certification.ts
│   │
│   └── compensation-benefits/
│       ├── compensation-grade.ts
│       ├── salary-band.ts
│       ├── employee-compensation.ts
│       ├── benefit-plan.ts
│       ├── benefit-enrollment.ts
│       └── compensation-review.ts
│
└── __tests__/
```

The package still follows your standard ERP scaffold. The feature folders are internal organization—not independently published packages. Your guide explicitly permits adapter and aggregate splits when the package grows, while keeping one governed package manifest and public surface.

---

# 2. Human Resources ownership

## Core HR aggregates

```text
Employee
Employment
Employment contract
Work assignment
Job
Position
Department
Reporting line
Employment movement
```

Suggested mutation tables:

```text
hr_employee
hr_employment
hr_employment_contract
hr_work_assignment
hr_department
hr_job
hr_position
hr_reporting_line
hr_employment_movement
```

## Recruitment ownership

```text
Job requisition
Candidate
Application
Interview
Evaluation
Offer
Hiring decision
```

Suggested tables:

```text
hr_job_requisition
hr_candidate
hr_candidate_application
hr_interview
hr_interview_evaluation
hr_employment_offer
```

Recruitment should remain inside Human Resources because its terminal outcome is an employment relationship.

Recommended lifecycle:

```text
Requisition
    ↓
Candidate
    ↓
Application
    ↓
Interview
    ↓
Offer
    ↓
Offer accepted
    ↓
Employee and employment created
    ↓
Onboarding opened
```

## Onboarding and offboarding ownership

```text
Onboarding case
Onboarding task
Document requirement
Probation
Employment confirmation
Transfer
Termination
Offboarding case
Asset-clearance request
Exit interview
Final clearance
```

Suggested tables:

```text
hr_onboarding_case
hr_onboarding_task
hr_probation_review
hr_employment_confirmation
hr_termination
hr_offboarding_case
hr_offboarding_task
hr_exit_interview
hr_clearance
```

## Employee relations ownership (HR-ER-01)

Confidential internal employment cases (grievance, conduct, disciplinary review). Not whistleblowing, legal case management, or occupational safety incidents. Evidence via document reference only — no binary storage in HR tables.

```text
Employee case
Case event (append-only)
Case action (recommend / approve)
Case appeal
```

Suggested tables:

```text
hr_employee_case
hr_employee_case_event
hr_employee_case_action
hr_employee_case_appeal
```

Termination outcomes hand off to lifecycle `finalizeTermination` — cases never auto-terminate employment.

HR owns the workforce lifecycle, but it must not directly change Auth, Admin, Payroll, Payments or Accounting tables.

For example:

```text
HR terminates employment
       ↓
hr.employment.terminated.v1
       ↓
apps/web saga
       ├─ Admin revokes organization access
       ├─ Payroll creates final-pay processing
       ├─ Asset owner starts equipment clearance
       └─ Payments later executes approved final payment
```

---

# 3. Learning & Development

## Decision: nested inside Human Resources

Use:

```text
packages/erp/human-resources/src/learning/
```

Do not create:

```text
packages/erp/learning-development
@afenda/learning-development
```

at the current stage.

L&D remains part of the employee lifecycle and talent-development context.

## L&D ownership

```text
Course
Learning program
Training session
Learning assignment
Attendance
Assessment result
Completion
Certification
Certification expiry
Training provider
Development plan
```

Suggested tables:

```text
hr_learning_course
hr_learning_program
hr_learning_session
hr_learning_assignment
hr_learning_attendance
hr_learning_assessment
hr_learning_completion
hr_employee_certification
hr_development_plan
```

## When L&D may become a separate package

Only extract `@afenda/learning` when it gains an independent product lifecycle such as:

* external learners who are not employees;
* customer or dealer training;
* course commerce;
* SCORM or xAPI content management;
* examination engines;
* independent learning subscriptions;
* external training-provider portals;
* its own application and release lifecycle.

Until then, a separate package would be premature fragmentation.

---

# 4. Compensation & Benefits

## Decision: do not create a standalone C&B package now

Avoid:

```text
packages/erp/c-and-b
packages/erp/compensation-benefits
@afenda/c-and-b
```

C&B crosses two bounded contexts. Split ownership by **business truth**, not by the department name.

## Human Resources owns agreed terms

Place inside:

```text
human-resources/src/compensation-benefits/
```

Human Resources owns:

```text
Compensation grade
Salary band
Employee compensation agreement
Base salary agreement
Allowance entitlement
Bonus eligibility
Benefit plan
Benefit eligibility
Benefit enrollment
Insurance enrollment
Compensation-review cycle
Salary-review decision
Promotion increment
```

Suggested tables:

```text
hr_compensation_grade
hr_salary_band
hr_employee_compensation
hr_allowance_entitlement
hr_bonus_eligibility
hr_benefit_plan
hr_benefit_eligibility
hr_benefit_enrollment
hr_compensation_review_cycle
hr_compensation_review
```

These records describe **what the company has agreed to provide**.

## Payroll owns calculated outcomes

Payroll owns:

```text
Pay-period earnings
Pay-period deductions
Overtime calculation
Allowance calculation
Bonus payment input
Benefit payroll deduction
Employee contribution
Employer contribution
Tax result
Gross pay
Net pay
Payslip
Payroll liability
```

These records describe **what must be calculated for a payroll period**.

## Correct boundary example

```text
Human Resources
Employee base salary = RM8,000
Transport allowance entitlement = RM500
Medical plan = Plan A
Employee contribution = 10%
        ↓
approved compensation snapshot/port
        ↓
Payroll
July basic earning = RM8,000
July transport earning = RM500
July employee contribution = calculated amount
July statutory deduction = calculated amount
July net pay = calculated amount
```

HR must not calculate gross-to-net payroll. Payroll must not silently change employment compensation agreements.

---

# 4.1 Leave administration (HR-LEAVE-01)

Leave owns **leave facts** only — policies, entitlements, append-only adjustments, requests, and approval history. Balance is **derived**: `opening_quantity + Σ(posted adjustment.delta)`; approve posts `consumption` adjustments; cancel-approved posts `cancellation_reversal`. No monetary valuation.

**Calendar dependency:** segment expansion uses injected `WorkCalendarPort` (HR-TIME-01 DDL not required).

Suggested tables:

```text
hr_leave_policy
hr_leave_policy_eligibility
hr_leave_entitlement
hr_leave_adjustment
hr_leave_request
hr_leave_request_segment
hr_leave_approval_decision
```

FK graph: policy → eligibility; policy + employee + employment → entitlement; entitlement → adjustment (optional `source_request_id`); entitlement + policy + employee + employment → request → segments + approval_decisions.

Talent administration (HR-TALENT-01) tables:

```text
hr_competency
hr_job_competency
hr_competency_assessment
hr_talent_profile
hr_talent_profile_assessment
hr_talent_pool
hr_talent_pool_member
hr_career_plan
hr_career_plan_action
hr_succession_plan
hr_succession_candidate
```

Evidence-based assessments supersede prior records; talent data stays in `@afenda/human-resources`.

---

# 4.2 Performance management (HR-PERF-01)

Performance owns **cycle, goal, review, and improvement-plan facts** only. No compensation mutation, payroll writes, auto-termination, or high-potential classification.

Suggested tables:

```text
hr_performance_cycle
hr_performance_cycle_participant
hr_performance_goal
hr_performance_goal_progress
hr_performance_review
hr_performance_review_participant
hr_performance_assessment
hr_performance_improvement_plan
hr_performance_improvement_checkpoint
```

FK graph: cycle → participants; cycle + employee + employment → goals → progress entries; cycle + employee + employment → reviews → participants + assessments; finalized review → improvement plan → checkpoints.

Lifecycle: cycle `draft|open|closed|cancelled`; goal `draft|submitted|approved|rejected|active|closed|cancelled`; review `draft|self_submitted|manager_submitted|returned|acknowledged|finalized|reopened`; PIP `draft|open|acknowledged|completed|unsuccessful|cancelled`. Finalized reviews are immutable; exceptional reopen requires `human-resources.performance.review.reopen`.

---

# 5. `packages/erp/payroll`

## Package identity

```json
{
  "name": "@afenda/payroll"
}
```

Recommended manifest:

```ts
{
  id: "payroll",
  category: "erp",
  packageName: "@afenda/payroll",
  band: "R1-F",
  lifecycle: "active",
  activationMode: "organization_toggle"
}
```

## Package purpose

`@afenda/payroll` should be the sole owner of:

> Payroll-period input, gross-to-net calculation, statutory results, payroll finalization, payslips and payroll reconciliation.

## Recommended physical structure

```text
packages/erp/payroll/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts
│   ├── module.manifest.ts
│   ├── module-ids.ts
│   ├── permissions.ts
│   ├── authorization.ts
│   ├── command-options.ts
│   ├── ports.ts
│   ├── production-ports.ts
│   ├── store.ts
│   ├── resolve-store.ts
│   ├── drizzle-store.ts
│   ├── memory-store.ts
│   ├── schemas.ts
│   ├── parse-input.ts
│   ├── types.ts
│   ├── brands.ts
│   ├── error-codes.ts
│   │
│   ├── setup/
│   │   ├── calendar.ts
│   │   ├── pay-group.ts
│   │   ├── earning-rule.ts
│   │   ├── deduction-rule.ts
│   │   └── statutory-rule.ts
│   │
│   ├── assignments/
│   │   ├── employee-payroll-assignment.ts
│   │   ├── recurring-earning.ts
│   │   └── recurring-deduction.ts
│   │
│   ├── inputs/
│   │   ├── variable-input.ts
│   │   ├── overtime-input.ts
│   │   ├── leave-adjustment.ts
│   │   └── one-time-adjustment.ts
│   │
│   ├── runs/
│   │   ├── payroll-period.ts
│   │   ├── payroll-run.ts
│   │   ├── calculation.ts
│   │   ├── exception.ts
│   │   ├── finalization.ts
│   │   └── reversal.ts
│   │
│   ├── statutory/
│   │   ├── employee-contribution.ts
│   │   ├── employer-contribution.ts
│   │   ├── tax-result.ts
│   │   └── statutory-submission.ts
│   │
│   ├── outputs/
│   │   ├── payroll-result.ts
│   │   ├── payslip.ts
│   │   ├── payment-instruction.ts
│   │   └── accounting-posting.ts
│   │
│   └── reconciliation/
│       ├── payroll-reconciliation.ts
│       ├── payment-reconciliation.ts
│       └── accounting-reconciliation.ts
│
└── __tests__/
```

---

# 6. Payroll mutation ownership

Suggested mutation tables:

```text
payroll_calendar
payroll_pay_group
payroll_period
payroll_employee_assignment
payroll_earning_rule
payroll_deduction_rule
payroll_statutory_rule
payroll_recurring_earning
payroll_recurring_deduction
payroll_variable_input
payroll_run
payroll_run_employee
payroll_result_line
payroll_statutory_result
payroll_exception
payroll_payslip
payroll_adjustment
payroll_reconciliation
```

Payroll should not own:

```text
hr_employee
hr_employment
hr_employee_compensation
payment
payment_allocation
journal
journal_line
```

Those remain owned by Human Resources, Payments and Accounting respectively.

---

# 7. Cross-package integration

## Human Resources → Payroll

Payroll needs approved workforce facts through an injected port:

```ts
export type PayrollEmployeeQueryPort = {
  getPayrollEmployee(input: {
    organizationId: string;
    employeeId: string;
    effectiveDate: string;
  }): Promise<{
    employeeId: string;
    employmentStatus: "active" | "notice" | "terminated";
    payGroupId: string;
    baseCompensation: string;
    currencyCode: string;
    recurringAllowances: Array<{
      code: string;
      amount: string;
    }>;
    recurringDeductions: Array<{
      code: string;
      amount: string;
    }>;
  } | null>;
};
```

The consumer-owned interface should normally live in Payroll because Payroll defines what data it requires.

The app composition root supplies the HR-backed adapter.

## Payroll → Payments

Payroll finalization produces an approved disbursement instruction:

```text
Payroll finalizes run
       ↓
payroll.payment-requested.v1
       ↓
Payments creates payment batch/instructions
       ↓
Bank execution
```

Payroll must not insert into Payments tables.

## Payroll → Accounting

```text
Payroll finalizes run
       ↓
payroll.posting-requested.v1
       ↓
Accounting applies posting profile
       ↓
Accounting creates and posts journal
```

Payroll must not insert journals directly.

This follows your established event, port and app-saga integration rules for peer ERP packages.

---

# 8. Recommended manifest dependencies

## Human Resources

```ts
moduleDependencies: ["master-data"],

optionalIntegratesWith: [
  "auth",
  "admin",
  "payroll",
  "payments",
  "accounting"
]
```

Meaning:

* Master Data supplies approved shared references.
* Auth and Admin may provision access after HR events.
* Payroll consumes workforce and compensation facts.
* Payments and Accounting remain downstream transaction owners.

These fields document logical integration. They do not automatically authorize peer imports.

## Payroll

```ts
moduleDependencies: ["human-resources"],

optionalIntegratesWith: [
  "payments",
  "accounting",
  "payables"
]
```

However, because ERP peer imports are disallowed by default, Payroll should consume HR facts through an injected port or approved registered edge—not direct source or schema imports.

---

# 9. Recommended events

## Human Resources events

```text
human-resources.employee.created.v1
human-resources.employment.started.v1
human-resources.employment.changed.v1
human-resources.employee.transferred.v1
human-resources.employee.terminated.v1

human-resources.requisition.approved.v1
human-resources.offer.accepted.v1

human-resources.onboarding.started.v1
human-resources.onboarding.completed.v1
human-resources.offboarding.started.v1
human-resources.offboarding.completed.v1

human-resources.compensation.changed.v1
human-resources.benefit-enrollment.changed.v1

human-resources.leave.approved.v1
human-resources.leave.requested.v1
human-resources.leave.rejected.v1
human-resources.leave.cancelled.v1
human-resources.leave.entitlement-adjusted.v1
human-resources.timesheet.approved.v1
human-resources.certification.expiring.v1
```

## Payroll events

```text
payroll.run.started.v1
payroll.run.calculated.v1
payroll.run.finalized.v1
payroll.run.reversed.v1
payroll.payment-requested.v1
payroll.posting-requested.v1
payroll.payslip.published.v1
```

---

# 10. Recommended permissions

## Human Resources

```text
human-resources.employee.create
human-resources.employee.read
human-resources.employee.update
human-resources.employment.manage
human-resources.organization.read
human-resources.organization.manage

human-resources.requisition.create
human-resources.candidate.manage
human-resources.interview.record
human-resources.offer.approve

human-resources.onboarding.manage
human-resources.offboarding.manage

human-resources.leave.request
human-resources.leave.approve
human-resources.leave-policy.read
human-resources.leave-policy.manage
human-resources.leave-entitlement.read
human-resources.leave-entitlement.grant
human-resources.leave-entitlement.adjust
human-resources.leave-request.own
human-resources.leave-request.approve-team
human-resources.leave-request.backdate
human-resources.leave-request.sensitive-read
human-resources.attendance.manage
human-resources.timesheet.approve

human-resources.performance.manage
human-resources.learning.manage
human-resources.certification.manage

human-resources.compensation.read
human-resources.compensation.manage
human-resources.benefits.manage
```

Compensation permissions require stricter data protection than ordinary employee-directory permissions.

## Payroll

```text
payroll.setup.manage
payroll.input.manage
payroll.run.create
payroll.run.calculate
payroll.run.review
payroll.run.finalize
payroll.run.reverse
payroll.payslip.read-own
payroll.payslip.read-all
payroll.reconciliation.manage
```

Do not treat `payroll.payslip.read-all` as equivalent to ordinary HR read access.

---

# Final architecture

```text
packages/erp/
├── human-resources/
│   └── src/
│       ├── core/
│       ├── organization/
│       ├── recruitment/
│       ├── lifecycle/
│       ├── time/
│       ├── leave/
│       ├── performance/
│       ├── talent/
│       ├── learning/
│       └── compensation-benefits/
│
└── payroll/
    └── src/
        ├── setup/
        ├── assignments/
        ├── inputs/
        ├── runs/
        ├── statutory/
        ├── outputs/
        └── reconciliation/
```

## Definitive recommendation

1. **`@afenda/human-resources` should be an independent R1-F package.**
2. **`@afenda/payroll` should be an independent R1-F package and a sibling of Human Resources.**
3. **Recruitment, onboarding and offboarding should remain internal Human Resources capabilities.**
4. **Learning & Development should remain inside Human Resources.**
5. **Compensation & Benefits should not become a package now:**

   * Human Resources owns compensation agreements, salary structures and benefits enrollment.
   * Payroll owns payroll-period calculations, deductions, contributions and net-pay results.
6. Extract Recruitment, Learning or Compensation into separate packages only after they independently satisfy your bounded-context, mutation-table, consumer and roadmap evidence gates.
