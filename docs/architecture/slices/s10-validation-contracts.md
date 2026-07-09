# S10 — Validation contracts (Zod)

| Field | Value |
|-------|-------|
| **Status** | shipped |
| **Sequence** | 11 — before expanding features |
| **Depends on** | S3, S4 (domain shapes stable) |
| **Feeds into** | S13 tests |

## Purpose

Shared runtime and TypeScript contracts for all server action inputs.

## Inputs / outputs

- **Inputs:** FormData / JSON payloads at action boundary
- **Outputs:** Parsed DTOs; uniform `{ error }` shape on failure

## Owned files

- `lib/schemas/common.ts` — shared string limits, UUID, email, `parseSchema`
- `lib/schemas/questions.ts` — question config + draft shapes (editor + CDP package SSOT)
- `lib/schemas/auth.ts` — operator sign-in payloads
- `lib/schemas/surveys.ts` — declaration CRUD + public submit + param schemas
- `lib/schemas/client.ts` — invite, onboard, assign submit, draft save, admin client ops
- `lib/schemas/declarations.ts` — evidence registration
- `lib/survey-package.ts` — CDP package envelope (re-exports question schemas from S10)
- `lib/client-onboarding.server.ts` — `parseClientOnboardingFormData()` (FormData → schema)
- `lib/api/client-declaration-draft-route.logic.ts` — `parseDeclarationDraftJsonBody()` (JSON → schema)
- `lib/server-actions/form-data.ts` — trimmed FormData field readers (SSOT)
- `lib/server-actions/register-evidence-form.ts` — evidence upload FormData reader
- Wire into all `app/actions/*.ts` mutation entry points (see doctrine § action map)

## Execution entry points

| File | Functions |
|------|-----------|
| `admin.ts` | `adminSignInAction` |
| `surveys.ts` | `updateSurveyAction`, `deleteSurveyAction`, `submitSurveyResponseAction`, `exportSurveyPackageAction`, `importSurveyPackageAction`, `regenerateInviteTokenAction` |
| `declarations.ts` | `registerEvidenceAction` |
| `client.ts` | `saveClientOnboardingAction`, `submitClientDeclarationAction`, `saveClientDeclarationDraftAction`, `issueClientInviteAction`, `removeClientRegistrationAction`, `deleteClientAssignmentAction` |
| `lib/api/client-declaration-draft-route.ts` | `POST /api/client/declaration-draft` (JSON autosave; same schema as draft action) |

**Not Zod targets:** session helpers (`requireAdminSession`, `requireClientSession`), preview actions (`startClientPreviewAction`, `exitClientPreviewAction`), `createDraftSurveyAction` (no input), `acknowledgeClientPortalAction` (no input), `validateSurveyPackageAction` (analysis helper). Client/operator sign-in via Neon Auth UI is outside server actions.

**Removed:** `app/actions/invitations.ts`, `lib/schemas/invitations.ts` (anonymous share actions retired with component removal).

## Critical control points

- Reject unknown question types
- Max string lengths enforced
- Email format validated at boundary

## Failure modes

- Schema drift from DB CHECK constraints
- Partial adoption (some actions still hand-parse)

## Required tests

- Invalid payloads rejected without DB hit
- Schema round-trip matches domain types
- Onboarding wizard E2E exercises `clientOnboardingSchema` end-to-end

## Acceptance proof

- [x] 100% mutation action entry points call `safeParse` (via `parseSchema` or `parseClientOnboardingFormData`)
- [x] No Zod in React components (actions + server lib only)
- [x] `npm run build` passes

## Do not

Add Zod to every component — KISS at action boundary only.

## Implementation notes

Zod is a runtime dependency. Domain answer validation remains in `lib/questions.ts` (`validateAnswers`).
