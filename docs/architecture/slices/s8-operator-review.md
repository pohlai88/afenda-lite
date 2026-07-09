# S8 — Operator review surface

| Field | Value |
|-------|-------|
| **Status** | shipped (hardening: review workflow — planned) |
| **Sequence** | 9 |
| **Depends on** | S4 |
| **Feeds into** | Future audit/review status slice |

## Purpose

View submissions and per-question answer breakdown for operators.

## Inputs / outputs

- **Inputs:** `listResponsesForSurvey`, questions, evidence metadata
- **Outputs:** Submission cards with typed answers

## Owned files

- `app/dashboard/[id]/page.tsx`
- `lib/operator-declaration-detail.tsx`, `lib/operator-declaration-detail.logic.ts`
- `components/operator-declaration-detail-view.tsx`, `components/org-declaration-submissions-table.tsx`
- `components/submission-answers.tsx`

## Critical control points

- `requireAdminSession` on page and data load

## Failure modes

- Large submission volume (no pagination yet)

## Required tests

- Render all question types including file filename display
- `lib/operator-declaration-detail.logic.test.ts`, `lib/operator-declaration-detail.test.tsx`

## Acceptance proof

- [x] Operator sees matching answers after client/public submit — `e2e/client-journey.spec.ts`, `e2e/secure-file.spec.ts`
- [x] File evidence shows metadata, not download link — `e2e/secure-file.spec.ts`, `e2e/client-journey.spec.ts`

## Drift risk

Exposing submission list on public routes.
