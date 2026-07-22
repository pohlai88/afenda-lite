# Human Resources — Zod schemas

Domain-sliced Zod input schemas for `@afenda/human-resources`. Root barrels at `src/schemas.ts` and `src/schemas-compliance.ts` re-export this tree for backward-compatible imports.

**Status:** Slices A–D complete. Domain commands use narrow `../schemas/<domain>` imports; package `src/index.ts` keeps `./schemas` for public re-exports.

## Layout

```text
src/
├── schemas.ts                         # compatibility barrel → schemas/index
├── schemas-compliance.ts              # compatibility barrel → schemas/compliance
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
    ├── compliance.ts                  # separate compliance entrypoint
    ├── talent/
    │   ├── competency.ts
    │   ├── profile.ts
    │   ├── pool.ts
    │   ├── career-plan.ts
    │   ├── succession.ts
    │   └── index.ts
    └── index.ts
```

## Import patterns

```ts
// Package consumers (unchanged)
import { createEmployeeInputSchema } from "./schemas";
import { registerEmployeeDocumentInputSchema } from "./schemas-compliance";

// Domain-owned code (preferred)
import { createCourseInputSchema } from "./schemas/learning";
import { createCareerPlanInputSchema } from "./schemas/talent/career-plan";
```

## Contract note

`schemas/compliance.ts` defines a narrower `humanResourcesMutationContextSchema` (org + actor only). The main tree requires `correlationId` and uses `.strict()`. That dual shape is intentional — do not unify without an explicit compliance contract change.

See [INTEGRATION.md](./INTEGRATION.md) for slice history and [VALIDATION.md](./VALIDATION.md) for export parity evidence.
