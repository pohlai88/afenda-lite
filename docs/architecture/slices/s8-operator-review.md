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
- `components/submission-answers.tsx`

## Critical control points

- `requireAdminSession` on page and data load

## Failure modes

- Large submission volume (no pagination yet)

## Required tests

- Render all question types including file filename display

## Acceptance proof

- [ ] Operator sees matching answers after client/public submit
- [ ] File evidence shows metadata, not download link

## Drift risk

Exposing submission list on public routes.
