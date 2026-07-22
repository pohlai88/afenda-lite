# HR Drizzle adapter audit

## Verdict

- **Present and independently attached:** lifecycle, leave, compensation-benefits, performance, learning, workforce-planning, compliance, employee-relations.
- **Implemented but structurally hidden inside the former core.ts:** core employee/employment/assignment, organization, recruitment. This refactor extracts the latter two into their own adapters and leaves core.ts with the employee/employment kernel plus work assignment.
- **Missing Drizzle persistence implementations:** time and talent. Do not add empty adapters; implement them only when their HumanResourcesStore contracts and database tables are authoritative.
- **Missing barrel export fixed:** DrizzleWorkforcePlanningMethods.

## Ownership after refactor

| Adapter | Owns |
|---|---|
| core.ts | employee, employment, employment contract, work assignment |
| organization.ts | department, job, position, reporting line, organization tree |
| recruitment.ts | requisition, candidate, application, interview, offer |
| lifecycle.ts | onboarding, probation, confirmation, transfer, termination, offboarding |
| leave.ts | policy, entitlement, adjustment, request, approval handoff |
| compensation.ts | grade, salary band, employee compensation, review, benefits |
| performance.ts | cycles, goals, reviews, improvement plans |
| learning.ts | course, session, assignment, completion, certification |
| workforce-planning.ts | plans, plan lines, reservations, availability |
| compliance.ts | requirements, employee documents, eligibility, acknowledgements |
| employee-relations.ts | cases, events, actions, appeals |
| time.ts | **not implemented**: shift, attendance, exception, timesheet, work-calendar persistence |
| talent.ts | **not implemented**: profile, pool, competency, career, succession persistence |

## Composition rule

store.ts is the only composition root. Domain adapters must not import store.ts or another adapter implementation. Cross-domain reads are expressed only through narrow Host types based on HumanResourcesStore methods.
