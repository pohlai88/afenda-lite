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

- `app/client/page.tsx`, `app/client/declare/[id]/page.tsx`
- `components/client-declaration-form.tsx`
- `app/actions/client.ts`

## Critical control points

- `getClientAssignmentForUser` scopes by `client_email`
- Reuses S4 validation pipeline

## Failure modes

- Wrong email on assignment
- Resubmit attempt after completion

## Required tests

- Assign on invite flow
- Client-only access to own assignments
- Receipt displayed after submit

## Acceptance proof

- [ ] `CDP-*` code on client dashboard
- [ ] Same submission visible on operator detail list

## Must not bypass

Assignment lookup without email scope predicate.

## Drift risk

Listing all assignments globally for any authenticated user.
