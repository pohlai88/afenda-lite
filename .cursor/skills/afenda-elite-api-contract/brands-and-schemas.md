# Branded IDs and schema map

**Scratch / disk SSOT:** `apps/web/modules/*/schemas/**` · [docs-V2/api/README.md](../../../docs-V2/api/README.md) · [docs-V2/discipline/README.md](../../../docs-V2/discipline/README.md)  
**Frontend route params:** [../afenda-elite-frontend-scaffold/boundaries.md](../afenda-elite-frontend-scaffold/boundaries.md)  
**Living API-003 / API-004:** retired on this checkout — brand table below mirrors disk schemas

If this companion drifts from disk Zod schemas, **disk wins** — update this file in the same change.

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
| `TradeEventId` | `tradeEventIdSchema` | `[eventId]` | `/fft/…/events/[eventId]/…` (locale-free P1) |
| `TradeOrderId` | `tradeOrderIdSchema` | — | Feed Farm Trade only |
| `TradeLocale` | `tradeLocaleSchema` (`'vi' \| 'en'`) | — | i18n / messages; not a live `/fft/[locale]` segment on P1 |
| `SurveySlug` | `slugSchema` | `[slug]` | `/survey/[slug]` |
| `InvitationId` | `uuidSchema` | `invitationId` (searchParams) | `/join?invitationId=` |
| `UserId` | `userIdSchema` (`modules/identity/schemas/users.ts`) | `[userId]` | `/dashboard/users/[userId]` — Neon Auth user directory |
| `OrganizationId` | `organizationIdSchema` (`modules/identity/schemas/platform-rbac.ts`) | — | Neon Auth organization id (tenant) |
| `PlatformRoleId` | `platformRoleIdSchema` | — | Platform RBAC role |
| `PermissionCode` | `permissionCodeSchema` | — | Platform permission catalog code |

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

## `modules/*/schemas` module map

| Module path | Primary resources / flows | Notable exports |
|-------------|---------------------------|-----------------|
| `modules/platform/schemas/common.ts` | Shared primitives | `uuidSchema`, `emailSchema`, `passwordSchema`, `slugSchema`, **`parseSchema`** (**Landed**) |
| `modules/platform/schemas/api-error.ts` | Web re-export + Zod OpenAPI | Codes/body from `@afenda/errors` (+ `/http`); Zod schemas local (**Landed**) |
| `modules/platform/schemas/action-result.ts` | Web Action adapters | `ActionResult` aliases `@afenda/errors/result`; `actionFailInternal` / `actionFieldMessage` local (**Landed**; API-002) |
| `packages/errors` (`@afenda/errors`) | Transport-neutral error kernel | `AppError`, `ErrorCode`/`ApiErrorCode` (incl. `RATE_LIMITED`/`SERVICE_UNAVAILABLE`), normalize, serialize, `Result`, `/http` (`retryAfterSeconds`), `/adapters/postgres` (**Landed**) |
| `modules/identity/schemas/invite-org-member.ts` | Org-member invite | `inviteOrgMemberCommandSchema` (**Landed**, I2.1) |
| `modules/identity/schemas/auth.ts` | Sign-in boundary | `signInSchema` (Living inventory) |
| `modules/identity/schemas/users.ts` | Organization-admin users | `userIdSchema`, create/import/update schemas (Living inventory) |
| `modules/identity/schemas/platform-rbac.ts` | Platform RBAC | `OrganizationId`, `PlatformRoleId`, `PermissionCode` (Living inventory) |
| `modules/declarations/schemas/common.ts` | Re-exports platform + declarations-only | `surveyAnswersSchema` (Living inventory) |
| `modules/declarations/schemas/client.ts` | Onboarding, declare submit/draft, invites | Living inventory |
| `modules/declarations/schemas/surveys.ts` | Declarations (surveys) CRUD + public submit | Living inventory |
| `modules/declarations/schemas/declarations.ts` | Evidence registration | Living inventory |
| `modules/declarations/schemas/questions.ts` | Question drafts / CDP | Living inventory |
| `modules/fft/schemas/fft-schemas.ts` | Feed Farm Trade inputs | Living inventory |

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
| Users (org admin) | `createOrganizationUserSchema`, `updateOrganizationUserSchema`, `setOrganizationUserRoleSchema`, `banOrganizationUserSchema`, `setOrganizationUserPasswordSchema` | `userIdSchema` |
| Trade | `modules/fft/schemas/fft-schemas.ts` (+ action-local objects) | `tradeLocaleSchema`, event/order ids |

---

## `parseSchema` usage pattern

Always import `parseSchema` from platform common at adapter boundaries:

```typescript
import { parseSchema } from '@/modules/platform/schemas/common'
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

These are **named gaps** — do not invent ad-hoc schemas to fill them; add only when the corresponding feature is promoted:

| Gap | Condition to add |
|-----|-----------------|
| Shared `PaginatedResult` schema helper | When first list endpoint is exposed over HTTP |
| Account PATCH schema | Only if portal-owned fields exist beyond Neon AccountView |
| Trade REST surface schemas | Keep in `fft-schemas.ts`; split files only if module grows unwieldy |

OpenAPI export: [openapi.md](openapi.md) · `docs-V2/api/OPEN-001-openapi.yaml` — not a schema gap.

---

## Rules of thumb

| Do | Don't |
|----|-------|
| Export types from `z.infer<typeof schema>` | Hand-write a parallel interface that drifts |
| Add optional fields when extending | Change existing field types or remove fields |
| Brand IDs at the boundary | Use `any` / untyped `Record<string, unknown>` in adapters |
| Keep dates as ISO `string` on the wire | Pass `Date` across RSC → client without serialization |
| One schema per resource concern in `modules/*/schemas` | Duplicate schema in `app/actions/` or inline; recreate `lib/schemas/` |
