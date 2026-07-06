# S4 — Submission engine

| Field | Value |
|-------|-------|
| **Status** | shipped (hardening: Zod — S10) |
| **Sequence** | 5 |
| **Depends on** | S3 |
| **Feeds into** | S5, S6, S7, S8, S9 |

## Purpose

Single submission pipeline for public, secure, and client-assigned surfaces.

## Inputs / outputs

- **Inputs:** `slug`, `answers` map, optional `assignmentId`
- **Outputs:** `survey_responses` row (JSONB `answers`), optional `confirmation_code`

## Owned files

- `components/declaration-form.tsx` (wrappers: `survey-form.tsx`, `client-declaration-form.tsx`)
- `app/actions/surveys.ts` (`submitAnswersForSurvey`)
- `app/actions/declarations.ts`
- `lib/questions.ts` (`validateAnswers`, `registerEvidence`)

## Critical control points

- `validateAnswers` before persist
- File evidence ownership: same `survey_id` + `question_id`
- Duplicate submit blocked on assignments

## Failure modes

- Orphan evidence ID
- Missing required fields
- Double submit on assignment

## Required tests

- yes_no / text / file happy paths
- Invalid evidence rejected
- Assignment already submitted returns error

## Acceptance proof

- [ ] Submission visible on operator detail via `submission-answers.tsx`
- [ ] All question types render correctly in review

## Must not bypass

Direct `INSERT INTO survey_responses` from UI or actions without validation.

## Drift risk

Separate submission paths per surface instead of unified `DeclarationForm`.
