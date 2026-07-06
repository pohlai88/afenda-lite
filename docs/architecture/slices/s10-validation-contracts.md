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

## Owned files (to create)

- `lib/schemas/common.ts` — shared string limits, UUID, email
- `lib/schemas/auth.ts` — sign-in payloads
- `lib/schemas/surveys.ts` — declaration CRUD + public submit
- `lib/schemas/invitations.ts` — share link + email record
- `lib/schemas/client.ts` — invite, onboard, assign submit
- `lib/schemas/declarations.ts` — evidence registration
- Wire into all `app/actions/*.ts` entry points (see doctrine § action map — **14 functions**)

## Execution entry points

| File | Functions |
|------|-----------|
| `admin.ts` | `adminSignInAction` |
| `surveys.ts` | `createSurveyAction`, `updateSurveyAction`, `deleteSurveyAction`, `submitSurveyResponseAction` |
| `declarations.ts` | `registerEvidenceAction` |
| `invitations.ts` | `getAnonymousInviteLinkAction`, `regenerateAnonymousInviteLinkAction`, `recordEmailInvitationAction` |
| `client.ts` | `clientSignInAction`, `acceptClientInviteAction`, `saveClientOnboardingAction`, `submitClientDeclarationAction`, `issueClientInviteAction` |

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

## Acceptance proof

- [x] 100% action entry points call `safeParse` (via `parseSchema`)
- [x] No Zod in React components (actions only)
- [x] `npm run build` passes

## Do not

Add Zod to every component — KISS at action boundary only.

## Implementation notes

**Assumption:** Zod is not yet in `package.json`; add as dev+runtime dependency when implementing this slice.
