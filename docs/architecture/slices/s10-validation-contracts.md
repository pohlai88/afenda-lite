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

- `lib/schemas/common.ts` — shared string limits, UUID, email
- `lib/schemas/auth.ts` — operator sign-in payloads
- `lib/schemas/surveys.ts` — declaration CRUD + public submit + package import
- `lib/schemas/client.ts` — invite, onboard, assign submit, admin client ops
- `lib/schemas/declarations.ts` — evidence registration
- `lib/client-onboarding.server.ts` — `parseClientOnboardingFormData()` (FormData → schema)
- Wire into all `app/actions/*.ts` mutation entry points (see doctrine § action map)

## Execution entry points

| File | Functions |
|------|-----------|
| `admin.ts` | `adminSignInAction` |
| `surveys.ts` | `updateSurveyAction`, `deleteSurveyAction`, `submitSurveyResponseAction`, `exportSurveyPackageAction`, `importSurveyPackageAction` |
| `declarations.ts` | `registerEvidenceAction` |
| `client.ts` | `saveClientOnboardingAction`, `submitClientDeclarationAction`, `issueClientInviteAction`, `removeClientRegistrationAction`, `deleteClientAssignmentAction` |

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
