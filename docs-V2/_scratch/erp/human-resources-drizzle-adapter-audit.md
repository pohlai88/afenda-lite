# HR Drizzle adapter audit

| Field | Value |
| ----- | ----- |
| Surface | `docs-V2/_scratch/erp/human-resources-drizzle-adapter-audit.md` |
| Package | `@afenda/human-resources` |
| Adapter root | `packages/erp/human-resources/src/adapters/drizzle/` |

## Verdict

- **Present and composed:** core, organization, recruitment, lifecycle, leave, compensation-benefits, performance, learning, talent, time, workforce-planning, compliance, employee-relations, identity.
- **Composition:** `compose.ts` + `store.ts` factory; `satisfies HumanResourcesStore` without `as unknown as` casts.
- **Coverage guard:** `coverage.ts` includes `DrizzleTimeMethods` and `DrizzleIdentityMethods`; `MissingDrizzleHumanResourcesMethods` must stay `never`.

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
| time.ts | calendars, shifts, attendance, timesheets, overtime, policies |
| workforce-planning.ts | plans, plan lines, reservations, availability |
| compliance.ts | requirements, employee documents, eligibility, acknowledgements |
| employee-relations.ts | cases, events, actions, appeals |
| identity.ts | user↔employee mapping, manager scope resolution |

## Composition rule

`store.ts` is the only composition root (`composeStoreSlices`). Domain adapters must not import `store.ts` or another adapter implementation. Cross-domain reads use narrow Host types; cross-domain writes use in-transaction SQL helpers inside the owning adapter.
