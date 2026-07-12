# Schema map (Zod ↔ resources)

Schemas live under the **owning module** (`modules/*/schemas/`). Extend additively; do not fork duplicate schemas. Relocate from `lib/schemas/` is **complete** — do not recreate that drawer.

| Module path | Primary resources / flows | Notable exports |
|-------------|---------------------------|-----------------|
| `modules/platform/schemas/common.ts` | Shared Zod primitives (all contexts) | `uuidSchema`, `emailSchema`, `passwordSchema`, `slugSchema`, `parseSchema` |
| `modules/platform/schemas/api-error.ts` | Shared HTTP error body | `APIErrorBody` / error codes |
| `modules/declarations/schemas/common.ts` | Re-exports platform common + declarations-only | `surveyAnswersSchema` (+ re-exports) |
| `modules/identity/schemas/auth.ts` | Sign-in boundary | `signInSchema` |
| `modules/identity/schemas/users.ts` | Org-admin users | `userIdSchema`, create/update/role/ban/bulk/password/`userIds` schemas |
| `modules/declarations/schemas/client.ts` | Onboarding, declare submit/draft, invites, deletes | `clientOnboardingSchema`, `submitClientDeclarationSchema`, `saveClientDeclarationDraftSchema`, `issueClientInviteSchema`, `removeClientRegistrationSchema`, `deleteClientAssignmentSchema` |
| `modules/declarations/schemas/surveys.ts` | Declarations (surveys) CRUD + public submit | `surveyMetadataFormSchema`, `updateSurveySchema`, `deleteSurveySchema`, `submitSurveyResponseSchema`, param schemas |
| `modules/declarations/schemas/declarations.ts` | Evidence registration | `registerEvidenceSchema` |
| `modules/declarations/schemas/questions.ts` | Question drafts / CDP | `questionDraftSchema`, `cdpQuestionSchema`, `questionConfigSchema` |
| `modules/fft/schemas/fft-schemas.ts` | Feed Farm Trade inputs | `tradeLocaleSchema`, `tradeEventIdSchema`, `tradeOrderIdSchema`, locale/event/order input objects |

## Resource → schema (contract)

| Resource | Create / write schema | Read params |
|----------|----------------------|-------------|
| Health | — | — |
| Auth (Neon) | Neon-owned | — |
| Declaration draft (api-now) | `saveClientDeclarationDraftSchema` | assignment id via body/query |
| Clients / invitations | `issueClientInviteSchema`, delete schemas | `uuidSchema` |
| Organization users | `createOrganizationUserSchema`, `importOrganizationUsersSchema`, `updateOrganizationUserSchema`, `setOrganizationUserRoleSchema`, `banOrganizationUserSchema`, `banOrganizationUsersSchema`, `organizationUserIdsSchema`, `setOrganizationUserPasswordSchema` | `userIdSchema` |
| Declarations | `surveyMetadataFormSchema`, `updateSurveySchema`, `deleteSurveySchema` | `surveyIdParamSchema` |
| Assignments / submissions | `submitClientDeclarationSchema`, draft schema | `uuidSchema` |
| Public survey | `submitSurveyResponseSchema` | `openSurveySlugParamSchema` |
| Secure link | submit schemas + token | `surveyInviteTokenParamSchema` / token schemas in domain |
| Trade | `modules/fft/schemas/fft-schemas.ts` (+ action-local objects) | `tradeLocaleSchema`, event/order ids |

## Gaps (named only — do not invent large trees here)

| Gap | Notes |
|-----|-------|
| Shared `APIErrorBody` Zod schema | **Landed** in `modules/platform/schemas/api-error.ts` |
| Shared `PaginatedResult` schema helper | Add when first contract-only list is exposed over HTTP |
| Account PATCH schema | Only if portal-owned fields exist beyond Neon AccountView |
| Trade REST surface schemas | Keep in `fft-schemas.ts`; split files only if module grows unwieldy |

## Adapter usage

```typescript
import { parseSchema } from "@/modules/platform/schemas/common"
import { updateSurveySchema } from "@/modules/declarations/schemas/surveys"

const parsed = parseSchema(updateSurveySchema, input)
if (!parsed.success) {
  return { ok: false, code: 'VALIDATION_ERROR', message: parsed.error }
}
// parsed.data is trusted
```

## Related

- [02-rest-resources.md](02-rest-resources.md)  
- [04-types.md](04-types.md)  
- [01-boundaries.md](01-boundaries.md)  
