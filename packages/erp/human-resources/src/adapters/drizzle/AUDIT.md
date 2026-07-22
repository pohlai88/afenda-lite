# HR Drizzle adapter audit

## Verdict

- **Present and composed:** core, organization, recruitment, lifecycle, leave, compensation-benefits, performance, learning, talent, workforce-planning, compliance, employee-relations.
- **Blocked (no store methods / DDL):** time — shift, attendance, timesheet persistence remains forward-recorded; do not add an empty `time.ts` adapter.
- **Composition:** `compose.ts` + `store.ts` factory; `satisfies HumanResourcesStore` without `as unknown as` casts.

## Ownership

| Adapter | Owns |
|---|---|
| core.ts | employee, employment, employment contract, work assignment |
| organization.ts | department, job, position, reporting line, organization tree |
| recruitment.ts | requisition, candidate, application, interview, offer |
| lifecycle.ts | onboarding, probation, confirmation, transfer, termination, offboarding |
| leave.ts | policy, entitlement, adjustment, request, approval handoff |
| compensation-benefits.ts | grade, salary band, employee compensation, review, benefits |
| performance.ts | cycles, goals, reviews, improvement plans |
| learning.ts | course, session, assignment, completion, certification |
| talent.ts | competency, profile, pool, career, succession |
| workforce-planning.ts | plans, plan lines, reservations, availability |
| compliance.ts | requirements, employee documents, eligibility, acknowledgements |
| employee-relations.ts | cases, events, actions, appeals |
| time.ts | **not implemented** — blocked until `HumanResourcesStore` time methods and DDL exist |

## Composition rule

`store.ts` is the only composition root (`composeStoreSlices`). Domain adapters must not import `store.ts` or another adapter implementation. Cross-domain reads use narrow Host types; cross-domain writes use in-transaction SQL helpers inside the owning adapter.
