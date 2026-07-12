# API-003 API Types

| Field | Value |
|-------|-------|
| ID | API-003 |
| Category | API |
| Version | 1.1.0 |
| Status | Living |
| Owner | Backend |
| Updated | 2026-07-13 |

Zod is the source of truth; TypeScript types are `z.infer`. Enables maintainers to keep Input/Output and branded IDs consistent across Actions and REST.

**Audience:** backend maintainers. **Action enabled:** brand IDs at boundaries; extend additively.

## Branded IDs

| Brand | Zod source | Route / param | Notes |
|-------|------------|---------------|-------|
| `DeclarationId` | `uuidSchema` via domain lookup | `[declarationId]` | Dashboard declaration |
| `ClientId` | `uuidSchema` via domain lookup | — | Operator domain |
| `AssignmentId` | `uuidSchema` via domain lookup | `[assignmentId]` | Client declare |
| `ShareToken` | token schema in domain | `[token]` | `/f/[token]` |
| `InviteToken` | `surveyInviteTokenParamSchema` | `[token]` | `/invite/[token]` |
| `SurveySlug` | `slugSchema` | `[slug]` | `/survey/[slug]` |
| `InvitationId` | `uuidSchema` | `invitationId` searchParam | `/join?invitationId=` |
| `UserId` | `userIdSchema` | `[userId]` | Org-admin users |
| `OrganizationId` | `organizationIdSchema` | — | Tenant |
| `PlatformRoleId` | `platformRoleIdSchema` | — | Platform RBAC |
| `PermissionCode` | `permissionCodeSchema` | — | Permission catalog |
| `TradeEventId` | `tradeEventIdSchema` | `[eventId]` | Locale-free `/fft/...` |
| `TradeOrderId` | `tradeOrderIdSchema` | — | Feed Farm Trade |
| `TradeLocale` | `tradeLocaleSchema` (`vi` \| `en`) | — | i18n only — not a URL segment on P1 |

```typescript
type DeclarationId = string & { readonly __brand: 'DeclarationId' }

// Construct only after uuidSchema / domain lookup succeeds
function asDeclarationId(id: string): DeclarationId {
  return id as DeclarationId
}
```

Do not pass raw `string` across domain boundaries when a brand exists. Dynamic App Router `params` are `Promise<{ … }>` — await, then brand.

**Forbidden:** `/dashboard/[id]`, mixing brands as raw `string`, param drift (`id` vs `declarationId` vs `surveyId`).

## Input / Output separation

```typescript
type CreateDeclarationInput = z.infer<typeof /* create schema */>
type UpdateDeclarationInput = z.infer<typeof updateSurveySchema>

type Declaration = {
  id: DeclarationId
  title: string
  createdAt: string // ISO wire format
  updatedAt: string
}
```

- **POST/Create** bodies omit server-generated ids/timestamps
- **PATCH** bodies are partial (`Partial` / Zod `.partial()`)
- **GET** responses return the full output type for that resource

## Discriminated unions (status)

```typescript
type SubmissionStatus =
  | { type: 'DRAFT' }
  | { type: 'SUBMITTED'; submittedAt: string }
  | { type: 'LOCKED'; lockedAt: string; reason: string }
```

Wire enums as `UPPER_SNAKE` when flattened to JSON.

## Pagination types

```typescript
type PaginatedResult<T> = {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}
```

## Action results

```typescript
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; details?: unknown }
```

## Rules of thumb

| Do | Don't |
|----|-------|
| Export types from `z.infer<typeof schema>` | Hand-write a parallel interface that drifts |
| Add optional fields when extending | Change existing field types / remove fields |
| Brand IDs at the boundary | Use `any` / untyped `Record<string, unknown>` in adapters |
| Keep Date as ISO `string` on the wire | Pass `Date` across RSC → client without serialization |

## Related

- [API-004 Schema Map](API-004-schema-map.md)
- [API-002 Error Contract](API-002-error-contract.md)
- [REST-001 Rest Resources](REST-001-rest-resources.md)

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.1.0 | 2026-07-13 | Renumbered from API-004; full brand table; async params note |
| 1.0.0 | 2026-07-13 | Initial types |
