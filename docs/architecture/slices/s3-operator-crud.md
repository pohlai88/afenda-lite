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
- `lib/surveys.ts`, `lib/questions.ts`, `lib/operator-dashboard-page.ts`, `lib/operator-breadcrumbs.ts`
- `components/declaration-create-form.tsx`, `declaration-manage-form.tsx`, `question-fields-editor.tsx`, `operator-dashboard-page-view.tsx`
- `app/dashboard/layout.tsx`, `app/dashboard/page.tsx`, `app/dashboard/loading.tsx`, `app/dashboard/error.tsx`
- `app/dashboard/[id]/page.tsx`, `app/dashboard/[id]/loading.tsx`

## Critical control points

- `requireAdminSession` on all mutations
- `parseQuestionsFromForm` requires ≥1 question
- `replaceSurveyQuestions` maintains transactional intent

## Failure modes

- Empty question set rejected
- Delete cascades submissions (expected; document to operators)

## Required tests

- Create → list → edit questions → delete
- `e2e/smoke.spec.ts` — create, dashboard list, delete from list
- `e2e/secure-file.spec.ts` — add file question and verify prompt on detail page

## Acceptance proof

- [x] Dashboard lists new declaration (`e2e/smoke.spec.ts`)
- [x] Detail page reflects question edits (`e2e/secure-file.spec.ts`)
- [x] Delete removes declaration from list (`e2e/smoke.spec.ts`)

## Must not bypass

SQL or validation logic in React components.

## Drift risk

Adding question types without updating `parseQuestionsFromForm` and DB constraints.
