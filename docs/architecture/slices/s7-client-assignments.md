# S7 — Client assignments and receipts

| Field | Value |
|-------|-------|
| **Status** | shipped |
| **Sequence** | 8 |
| **Depends on** | S4, S6 |
| **Feeds into** | S8, S9 |

## Purpose

Operator assigns declaration to client email; client submits with confirmation receipt.

## Inputs / outputs

- **Inputs:** `client_assignments`, assignment id, answers
- **Outputs:** `confirmation_code` (`CDP-*`), assignment status `submitted`

## Owned files

- `app/client/(workspace)/page.tsx`, `app/client/(workspace)/declare/[id]/page.tsx`
- `lib/client-dashboard-page.tsx`, `lib/client-declare-page.tsx`, `lib/client-declare-page.logic.ts`, `lib/client-workspace-layout.tsx`
- `app/client/error.tsx` — segment error boundary (covers `(workspace)` and `(gate)`)
- `app/client/(workspace)/layout.tsx`, `app/client/(workspace)/loading.tsx`
- `components/client-declare-workspace.tsx`, `components/client-declaration-form.tsx`
- `app/actions/client.ts`

## Critical control points

- `getClientAssignmentForUser` scopes by `client_email`
- Portal acknowledgement required before declare form and `submitClientDeclarationAction`
- Reuses S4 validation pipeline

## Failure modes

- Wrong email on assignment
- Resubmit attempt after completion

## Required tests

- Assign on invite flow
- Client-only access to own assignments
- Receipt displayed after submit
- Declare gate branches (`e2e/client-declare-gates.spec.ts`) — not-found, acknowledgement redirect, submitted receipt
- Page handler orchestration (`lib/client-dashboard-page.test.ts`, `lib/client-declare-page.test.ts`)

## Acceptance proof

- [x] `CDP-*` code on client dashboard — `e2e/client-journey.spec.ts`
- [x] Same submission visible on operator detail list — `e2e/client-journey.spec.ts` (submissions tab)

## Must not bypass

Assignment lookup without email scope predicate.

## Drift risk

Listing all assignments globally for any authenticated user.
