# S3 — Operator declaration CRUD

| Field | Value |
|-------|-------|
| **Status** | shipped |
| **Sequence** | 4 |
| **Depends on** | S0, S1 |
| **Feeds into** | S4, S5, S6, S7 |

## Purpose

Create, edit, and delete declarations with dynamic question sets.

## Inputs / outputs

- **Inputs:** Form: title, intro, question rows (type, prompt, required)
- **Outputs:** `surveys` + `survey_questions` rows; redirect to detail

## Owned files

- `app/actions/surveys.ts`
- `lib/surveys.ts`, `lib/questions.ts`
- `components/declaration-create-form.tsx`, `declaration-manage-form.tsx`, `question-fields-editor.tsx`
- `app/dashboard/page.tsx`, `app/dashboard/[id]/page.tsx`

## Critical control points

- `requireAdminSession` on all mutations
- `parseQuestionsFromForm` requires ≥1 question
- `replaceSurveyQuestions` maintains transactional intent

## Failure modes

- Empty question set rejected
- Delete cascades submissions (expected; document to operators)

## Required tests

- Create → list → edit questions → delete

## Acceptance proof

- [ ] Dashboard lists new declaration
- [ ] Detail page reflects question edits
- [ ] Delete removes declaration from list

## Must not bypass

SQL or validation logic in React components.

## Drift risk

Adding question types without updating `parseQuestionsFromForm` and DB constraints.
