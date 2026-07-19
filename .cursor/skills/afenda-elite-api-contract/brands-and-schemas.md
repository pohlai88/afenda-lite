# Branded IDs and schema map

**Scratch / disk SSOT:** `apps/web/modules/*/schemas/**` · [docs-V2/api/README.md](../../../docs-V2/api/README.md) · [docs-V2/discipline/README.md](../../../docs-V2/discipline/README.md)  
**Frontend route params:** [../afenda-elite-frontend-scaffold/boundaries.md](../afenda-elite-frontend-scaffold/boundaries.md)  
**Living API-003 / API-004:** retired on this checkout — brand table below mirrors disk schemas

If this companion drifts from disk Zod schemas, **disk wins** — update this file in the same change.

**Removed modules:** Declarations + FFT schema trees are **gone** — brands below for wiped domains are footnotes only.

---

## Branded ID table

Do not pass raw `string` across domain boundaries when a brand exists.

| Brand | Zod source | Route param | Notes |
|-------|-----------|-------------|-------|
| `InvitationId` | `uuidSchema` | `invitationId` (searchParams) | `/join?invitationId=` |
| `UserId` | `userIdSchema` (`modules/identity/schemas/users.ts`) | `[userId]` | Org-admin users when route exists |
| `OrganizationId` | `organizationIdSchema` (`modules/identity/schemas/platform-rbac.ts`) | — | Neon Auth organization id (tenant) |
| `PlatformRoleId` | `platformRoleIdSchema` | — | Platform RBAC role |
| `PermissionCode` | `permissionCodeSchema` | — | Platform permission catalog code |

### Removed brands (footnotes — do not wire as living)

| Brand | Former route | Status |
|-------|--------------|--------|
| `DeclarationId` | `/dashboard/[declarationId]` | Removed with Declarations module |
| `AssignmentId` | `/client/declare/[assignmentId]` | Removed |
| `ShareToken` / `SurveySlug` | `/f/[token]`, `/survey/[slug]` | Removed |
| `TradeEventId` / `TradeOrderId` / `TradeLocale` | `/fft/**` | Removed with FFT module |

**Construction pattern:**

```typescript
// Only construct after uuidSchema / domain lookup succeeds
type UserId = string & { readonly __brand: 'UserId' }
function asUserId(id: string): UserId {
  return id as UserId
}
```

**Forbidden:** overloaded `[id]` params; mixing brands as raw `string` across ports when wiring; recreating wiped Declarations/FFT brands as living product routes.

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
| `modules/platform/schemas/action-result.ts` | Web Action adapters | `ActionResult` aliases `@afenda/errors/result`; `actionFailInternal` / `actionFieldMessage` local (**Landed**) |
| `packages/errors` (`@afenda/errors`) | Transport-neutral error kernel | `AppError`, `ErrorCode`/`ApiErrorCode`, normalize, serialize, `Result`, `/http`, `/adapters/postgres` (**Landed**) |
| `modules/identity/schemas/invite-org-member.ts` | Org-member invite | `inviteOrgMemberCommandSchema` (**Landed**, I2.1) |
| `modules/identity/schemas/auth.ts` | Sign-in boundary | `signInSchema` |
| `modules/identity/schemas/users.ts` | Organization-admin users | `userIdSchema`, create/import/update schemas |
| `modules/identity/schemas/platform-rbac.ts` | Platform RBAC | `OrganizationId`, `PlatformRoleId`, `PermissionCode` |
| `modules/declarations/schemas/**` | — | **Removed** (nuclear wipe) |
| `modules/fft/schemas/**` | — | **Removed** (nuclear wipe) |

---

## Resource → schema cross-reference

| Resource | Create / write schema | Read params |
|----------|----------------------|-------------|
| Health | — | — |
| Auth (Neon) | Neon-owned | — |
| Users (org admin) | `createOrganizationUserSchema`, `updateOrganizationUserSchema`, … | `userIdSchema` |
| Platform RBAC assign/revoke | Identity + platform schemas | — |
| Declaration draft / Trade | — | **Removed** — not api-now |

---

## `parseSchema` usage pattern

Always import `parseSchema` from platform common at adapter boundaries:

```typescript
import { parseSchema } from '@/modules/platform/schemas/common'
import { inviteOrgMemberCommandSchema } from '@/modules/identity/schemas/invite-org-member'

const parsed = parseSchema(inviteOrgMemberCommandSchema, input)
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

OpenAPI export: [openapi.md](openapi.md) · `docs-V2/api/OPEN-001-openapi.yaml` — health + metrics; Zod helpers in `@afenda/openapi`; not a schema gap.

---

## Rules of thumb

| Do | Don't |
|----|-------|
| Export types from `z.infer<typeof schema>` | Hand-write a parallel interface that drifts |
| Add optional fields when extending | Change existing field types or remove fields |
| Brand IDs at the boundary | Use `any` / untyped `Record<string, unknown>` in adapters |
| Keep dates as ISO `string` on the wire | Pass `Date` across RSC → client without serialization |
| One schema per resource concern in living `modules/*/schemas` | Duplicate schema in `app/actions/` or inline; recreate wiped Declarations/FFT schemas |
