# Types

Keep types simple, effective, DRY: **Zod is the source of truth**; TypeScript types are `z.infer`. Use branded IDs and Input/Output splits so call sites cannot mix identities or partial updates incorrectly.

## Branded IDs

```typescript
type DeclarationId = string & { readonly __brand: 'DeclarationId' }
type ClientId = string & { readonly __brand: 'ClientId' }
type AssignmentId = string & { readonly __brand: 'AssignmentId' }
type ShareToken = string & { readonly __brand: 'ShareToken' }
type TradeEventId = string & { readonly __brand: 'TradeEventId' }
type TradeOrderId = string & { readonly __brand: 'TradeOrderId' }

// Construct only after uuidSchema / domain lookup succeeds
function asDeclarationId(id: string): DeclarationId {
  return id as DeclarationId
}
```

Do not pass raw `string` across domain boundaries when a brand exists.

## Input / Output separation

```typescript
// Input — caller-provided (Create / Patch)
type CreateDeclarationInput = z.infer<typeof /* create schema */>
type UpdateDeclarationInput = z.infer<typeof updateSurveySchema>

// Output — includes server fields
type Declaration = {
  id: DeclarationId
  title: string
  createdAt: string // ISO wire format
  updatedAt: string
  // ...
}
```

- **POST/Create** bodies omit server-generated ids/timestamps  
- **PATCH** bodies are partial (`Partial` / Zod `.partial()`)  
- **GET** responses always return the full output type for that resource  

## Discriminated unions (status)

Prefer explicit variants over optional fields that lie:

```typescript
type SubmissionStatus =
  | { type: 'DRAFT' }
  | { type: 'SUBMITTED'; submittedAt: string }
  | { type: 'LOCKED'; lockedAt: string; reason: string }
```

Wire enums as `UPPER_SNAKE` strings when flattened to JSON; narrow in TS with `type` or a `status` discriminant.

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

- [05-schema-map.md](05-schema-map.md)  
- [03-error-contract.md](03-error-contract.md)  
