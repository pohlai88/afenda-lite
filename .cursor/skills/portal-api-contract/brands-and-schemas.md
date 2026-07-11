# Branded IDs and schema map

**Sources:** [doc/api/04-types.md](../../../doc/api/04-types.md) · [doc/api/05-schema-map.md](../../../doc/api/05-schema-map.md)  
**Frontend route params:** [../portal-frontend-scaffold/boundaries.md](../portal-frontend-scaffold/boundaries.md)

---

## Branded ID table

Do not pass raw `string` across domain boundaries when a brand exists.

| Brand | Zod source | Route param | Notes |
|-------|-----------|-------------|-------|
| `DeclarationId` | `uuidSchema` via domain lookup | `[declarationId]` | `/dashboard/[declarationId]` |
| `ClientId` | `uuidSchema` via domain lookup | — | Internal to operator domain |
| `AssignmentId` | `uuidSchema` via domain lookup | `[assignmentId]` | `/client/declare/[assignmentId]` |
| `ShareToken` | token schema in domain | `[token]` | `/f/[token]` |
| `InviteToken` | `surveyInviteTokenParamSchema` | `[token]` | `/invite/[token]` |
| `TradeEventId` | `tradeEventIdSchema` | `[eventId]` | `/trade/[locale]/events/[eventId]/…` |
| `TradeOrderId` | `tradeOrderIdSchema` | — | Hot Sales only |
| `TradeLocale` | `tradeLocaleSchema` (`'vi' \| 'en'`) | `[locale]` | `/trade/[locale]/…` |
| `SurveySlug` | `slugSchema` | `[slug]` | `/survey/[slug]` |
| `InvitationId` | `uuidSchema` | `invitationId` (searchParams) | `/join?invitationId=` |

**Construction pattern:**

```typescript
// Only construct after uuidSchema / domain lookup succeeds
type DeclarationId = string & { readonly __brand: 'DeclarationId' }
function asDeclarationId(id: string): DeclarationId {
  return id as DeclarationId
}
```

**Forbidden:** `/dashboard/[id]`, `/client/declare/[id]`, mixing brands as raw `string` across ports when wiring. Param names must match brand names must match Zod field names — no drift (`declarationId`, not `id` vs `surveyId`).

---

## Input / Output separation

| Pattern | Rule |
|---------|------|
| `CreateXInput` | Caller-provided; omit server-generated ids/timestamps |
| `UpdateXInput` | Partial (`Zod .partial()` or `Partial<>`); caller-provided only |
| `X` (output) | Full resource including server fields (`id`, `createdAt`, `updatedAt`) |
| Dates on wire | ISO string — never pass `Date` across RSC → client boundary |

---

## `lib/schemas/` module map

| Module | Primary resources / flows | Notable exports |
|--------|---------------------------|-----------------|
| `common.ts` | Shared primitives | `uuidSchema`, `emailSchema`, `passwordSchema`, `slugSchema`, `surveyAnswersSchema`, **`parseSchema`** |
| `auth.ts` | Sign-in boundary | `signInSchema` |
| `client.ts` | Onboarding, declare submit/draft, invites, deletes | `clientOnboardingSchema`, `submitClientDeclarationSchema`, `saveClientDeclarationDraftSchema`, `issueClientInviteSchema`, `removeClientRegistrationSchema`, `deleteClientAssignmentSchema` |
| `surveys.ts` | Declarations (surveys) CRUD + public submit | `surveyMetadataFormSchema`, `updateSurveySchema`, `deleteSurveySchema`, `submitSurveyResponseSchema`, param schemas |
| `declarations.ts` | Evidence registration | `registerEvidenceSchema` |
| `questions.ts` | Question drafts / CDP | `questionDraftSchema`, `cdpQuestionSchema`, `questionConfigSchema` |
| `trade.ts` | Hot Sales inputs | `tradeLocaleSchema`, `tradeEventIdSchema`, `tradeOrderIdSchema`, locale/event/order input objects |

---

## Resource → schema cross-reference

| Resource | Create / write schema | Read params |
|----------|----------------------|-------------|
| Health | — | — |
| Auth (Neon) | Neon-owned | — |
| Declaration draft (api-now) | `saveClientDeclarationDraftSchema` | `getClientDeclarationDraftQuerySchema` |
| Clients / invitations | `issueClientInviteSchema`, delete schemas | `uuidSchema` |
| Declarations | `surveyMetadataFormSchema`, `updateSurveySchema`, `deleteSurveySchema` | `surveyIdParamSchema` |
| Assignments / submissions | `submitClientDeclarationSchema`, draft schema | `uuidSchema` |
| Public survey | `submitSurveyResponseSchema` | `openSurveySlugParamSchema` |
| Secure link | submit schemas + token | `surveyInviteTokenParamSchema` / token schemas in domain |
| Trade | `lib/schemas/trade.ts` (+ action-local objects) | `tradeLocaleSchema`, event/order ids |

---

## `parseSchema` usage pattern

Always import `parseSchema` from `common.ts` at adapter boundaries:

```typescript
import { parseSchema } from '@/modules/declarations/schemas/common'
import { updateSurveySchema } from '@/modules/declarations/schemas/surveys'

const parsed = parseSchema(updateSurveySchema, input)
if (!parsed.success) {
  return { ok: false, code: 'VALIDATION_ERROR', message: parsed.error }
}
// parsed.data is typed and trusted — pass to domain
```

Do not re-validate the same shape inside domain helpers.

---

## Known schema gaps

These are **named gaps** from `doc/api/05-schema-map.md` — do not invent ad-hoc schemas to fill them; add only when the corresponding feature is promoted:

| Gap | Condition to add |
|-----|-----------------|
| Shared `APIErrorBody` Zod schema | **Landed** — `lib/schemas/api-error.ts` |
| Shared `PaginatedResult` schema helper | When first contract-only list endpoint is exposed over HTTP |
| Account PATCH schema | Only if portal-owned fields exist beyond Neon AccountView |
| Trade REST surface schemas | Keep in `trade.ts`; split files only if module grows unwieldy |

---

## Rules of thumb

| Do | Don't |
|----|-------|
| Export types from `z.infer<typeof schema>` | Hand-write a parallel interface that drifts |
| Add optional fields when extending | Change existing field types or remove fields |
| Brand IDs at the boundary | Use `any` / untyped `Record<string, unknown>` in adapters |
| Keep dates as ISO `string` on the wire | Pass `Date` across RSC → client without serialization |
| One schema per resource concern in `lib/schemas/` | Duplicate schema in `app/actions/` or inline |
