# API-004 Schema Map

| Field | Value |
|-------|-------|
| ID | API-004 |
| Category | API |
| Version | 1.1.4 |
| Status | Living |
| Control State | Closed |
| Owner | Backend |
| Updated | 2026-07-15 |

# 1. Purpose

Schemas live under the owning module (`modules/*/schemas/`). Enables maintainers to find the Zod SSOT for each resource without forking duplicates.

**Audience:** backend maintainers. **Action enabled:** import `parseSchema` + owning schema at the adapter boundary.

Relocate from `lib/schemas/` is **complete** — do not recreate that drawer.

# 2. Scope

## Module map

| Module path | Primary resources / flows | Notable exports |
|-------------|---------------------------|-----------------|
| `modules/platform/schemas/common.ts` | Shared Zod primitives | `uuidSchema`, `emailSchema`, `passwordSchema`, `slugSchema`, `parseSchema` — **Target on disk** (`apps/web/…`, I2.1) |
| `modules/platform/schemas/api-error.ts` | Shared HTTP error body | `APIErrorBody` / codes — **Target on disk** (I2.1) |
| `modules/platform/schemas/action-result.ts` | Shared Action contract | `ActionResult<T>`, `actionOk`, `actionFail` — **Target on disk** (I2.1) |
| `modules/identity/schemas/invite-org-member.ts` | Org-member invite command | `inviteOrgMemberCommandSchema`, `parseInviteOrgMemberCommand` — **Target on disk** (I2.1) |
| `modules/identity/schemas/auth.ts` | Sign-in boundary | `signInSchema` — Living inventory (not yet on Target) |
| `modules/identity/schemas/users.ts` | Org-admin users | `userIdSchema`, create/update/role/ban/bulk/password schemas — Living inventory |
| `modules/identity/schemas/platform-rbac.ts` | Platform RBAC | `OrganizationId`, `PlatformRoleId`, `PermissionCode`, assign schemas — Living inventory |
| `modules/declarations/schemas/common.ts` | Re-exports platform + declarations-only | `surveyAnswersSchema` (+ re-exports) — Living inventory |
| `modules/declarations/schemas/client.ts` | Onboarding, declare submit/draft, invites, deletes | `clientOnboardingSchema`, `submitClientDeclarationSchema`, `saveClientDeclarationDraftSchema`, `issueClientInviteSchema`, … — Living inventory |
| `modules/declarations/schemas/surveys.ts` | Declarations CRUD + public submit | `surveyMetadataFormSchema`, `updateSurveySchema`, `deleteSurveySchema`, `submitSurveyResponseSchema`, param schemas — Living inventory |
| `modules/declarations/schemas/declarations.ts` | Evidence registration | `registerEvidenceSchema` — Living inventory |
| `modules/declarations/schemas/questions.ts` | Question drafts / CDP | `questionDraftSchema`, `cdpQuestionSchema`, `questionConfigSchema` — Living inventory |
| `modules/fft/schemas/fft-schemas.ts` | Feed Farm Trade inputs | `tradeLocaleSchema`, `tradeEventIdSchema`, `tradeOrderIdSchema`, locale/event/order inputs — Living inventory |

# 3. Contract

## Resource → schema (contract)

| Resource | Create / write schema | Read params |
|----------|----------------------|-------------|
| Health | — | — |
| Auth (Neon) | Neon-owned | — |
| Declaration draft (api-now) | `saveClientDeclarationDraftSchema` | draft query schema / assignment id |
| Clients / invitations | `issueClientInviteSchema`, delete schemas | `uuidSchema` |
| Org-member invite (Neon Auth) | `inviteOrgMemberCommandSchema` (**Target on disk**, I2.1) | — |
| Organization users | create/import/update/role/ban/password schemas | `userIdSchema` |
| Declarations | `surveyMetadataFormSchema`, `updateSurveySchema`, `deleteSurveySchema` | `surveyIdParamSchema` |
| Assignments / submissions | `submitClientDeclarationSchema`, draft schema | `uuidSchema` |
| Public survey | `submitSurveyResponseSchema` | `openSurveySlugParamSchema` |
| Secure link | submit + token schemas | `surveyInviteTokenParamSchema` |
| Trade | `fft-schemas.ts` (+ action-local objects) | event/order ids; `tradeLocaleSchema` for i18n only |

## Gaps (named only)

| Gap | Notes |
|-----|-------|
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

# 4. References

- [REST-001 Rest Resources](REST-001-rest-resources.md)
- [API-003 API Types](API-003-api-types.md)
- [API-001 API Boundaries](API-001-api-boundaries.md)
- [OPEN-001 OpenAPI](OPEN-001-openapi.md) — generate from Zod; api-now YAML Living

# 5. Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.1.4 | 2026-07-15 | Bounded reopen (I2.1 audit repair): Target-on-disk markers for platform + invite schemas; Living inventory labeled for absent rows. |
| 1.1.3 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 1.1.2 | 2026-07-13 | Adopted the DOC-003 six-section controlled-document structure |
| 1.1.1 | 2026-07-13 | OPEN-001 removed from Gaps (Living); Related pointer |
| 1.1.0 | 2026-07-13 | Renumbered from API-005; action-result + platform-rbac; OPEN gap named |
| 1.0.0 | 2026-07-13 | Initial schema map |

# 6. Notes

Named gaps do not authorize parallel schemas outside the owning module.

Logical paths are `modules/*/schemas/*`. Physical Target home is `apps/web/modules/*/schemas/*`. Rows marked **Target on disk** are present under that home as of GUIDE-018 I2.1; other rows remain Living inventory until their Vertical/stage lands — do not invent files to “fill” the map early.
