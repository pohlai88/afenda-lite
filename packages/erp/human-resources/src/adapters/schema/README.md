# Human Resources schema refactor

This is a drop-in, behavior-preserving split of the supplied `schemas.ts` and
`schemas-compliance.ts` files.

## Target structure

```text
src/
├── schemas.ts                         # compatibility barrel
├── schemas-compliance.ts              # compatibility barrel
└── schemas/
    ├── common.ts                      # context, idempotency, OCC, ISO date primitives
    ├── core.ts                        # employee, employment, employment contract
    ├── organization.ts                # department, job, position, assignment, reporting lines
    ├── recruitment.ts                 # requisition through offer
    ├── lifecycle.ts                   # onboarding, probation, confirmation, transfer, termination, offboarding
    ├── learning.ts                    # course, session, assignment, completion, certification
    ├── compensation.ts                # grades, bands, compensation, reviews, benefits
    ├── workforce-planning.ts          # headcount plans, lines, reservations, handoffs
    ├── leave.ts                       # policies, entitlements, requests, approvals, handoffs
    ├── performance.ts                 # cycles, goals, reviews, improvement plans
    ├── compliance.ts                  # existing separate compliance entrypoint
    ├── talent/
    │   ├── competency.ts
    │   ├── profile.ts
    │   ├── pool.ts
    │   ├── career-plan.ts
    │   ├── succession.ts
    │   └── index.ts
    └── index.ts
```

## Integration

1. Copy `src/schemas/` into the package.
2. Replace the existing `src/schemas.ts` and `src/schemas-compliance.ts` with the supplied barrels.
3. Keep existing imports unchanged. Examples:

```ts
import { createEmployeeInputSchema } from "./schemas";
import { registerEmployeeDocumentInputSchema } from "./schemas-compliance";
```

Internal domain code may now use narrow imports:

```ts
import { createCourseInputSchema } from "./schemas/learning";
import { createCareerPlanInputSchema } from "./schemas/talent/career-plan";
```

## Important contract note

The supplied compliance file defines a second `humanResourcesMutationContextSchema`
that has only `organizationId` and `actorUserId`, while the primary schema context also
requires `correlationId` and is strict. This refactor intentionally preserves that current
behavior rather than silently changing validation. A separate follow-up should decide
whether compliance commands must adopt the authoritative correlation-aware context.
