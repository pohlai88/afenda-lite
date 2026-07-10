# Schema map (Zod ↔ resources)

Existing modules under [`lib/schemas/`](../../lib/schemas/). Extend additively; do not fork duplicate schemas.

| Module | Primary resources / flows | Notable exports |
|--------|---------------------------|-----------------|
| `common.ts` | Shared primitives | `uuidSchema`, `emailSchema`, `passwordSchema`, `slugSchema`, `surveyAnswersSchema`, `parseSchema` |
| `auth.ts` | Sign-in boundary | `signInSchema` |
| `client.ts` | Onboarding, declare submit/draft, invites, deletes | `clientOnboardingSchema`, `submitClientDeclarationSchema`, `saveClientDeclarationDraftSchema`, `issueClientInviteSchema`, `removeClientRegistrationSchema`, `deleteClientAssignmentSchema` |
| `surveys.ts` | Declarations (surveys) CRUD + public submit | `surveyMetadataFormSchema`, `updateSurveySchema`, `deleteSurveySchema`, `submitSurveyResponseSchema`, param schemas |
| `declarations.ts` | Evidence registration | `registerEvidenceSchema` |
| `questions.ts` | Question drafts / CDP | `questionDraftSchema`, `cdpQuestionSchema`, `questionConfigSchema` |
| `trade.ts` | Hot Sales inputs | `tradeLocaleSchema`, `tradeEventIdSchema`, `tradeOrderIdSchema`, locale/event/order input objects |

## Resource → schema (contract)

| Resource | Create / write schema | Read params |
|----------|----------------------|-------------|
| Health | — | — |
| Auth (Neon) | Neon-owned | — |
| Declaration draft (api-now) | `saveClientDeclarationDraftSchema` | assignment id via body/query |
| Clients / invitations | `issueClientInviteSchema`, delete schemas | `uuidSchema` |
| Declarations | `surveyMetadataFormSchema`, `updateSurveySchema`, `deleteSurveySchema` | `surveyIdParamSchema` |
| Assignments / submissions | `submitClientDeclarationSchema`, draft schema | `uuidSchema` |
| Public survey | `submitSurveyResponseSchema` | `openSurveySlugParamSchema` |
| Secure link | submit schemas + token | `surveyInviteTokenParamSchema` / token schemas in domain |
| Trade | `lib/schemas/trade.ts` (+ action-local objects) | `tradeLocaleSchema`, event/order ids |

## Gaps (named only — do not invent large trees here)

| Gap | Notes |
|-----|-------|
| Shared `APIErrorBody` Zod schema | Add when Route Handlers standardize JSON errors |
| Shared `PaginatedResult` schema helper | Add when first contract-only list is exposed over HTTP |
| Account PATCH schema | Only if portal-owned fields exist beyond Neon AccountView |
| Trade REST surface schemas | Keep in `trade.ts`; split files only if module grows unwieldy |

## Adapter usage

```typescript
import { parseSchema } from '@/lib/schemas/common'
import { updateSurveySchema } from '@/lib/schemas/surveys'

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
