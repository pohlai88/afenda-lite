# Contract rules (one version)

Authority aligned with [../api/01-boundaries.md](../api/01-boundaries.md), [../api/03-error-contract.md](../api/03-error-contract.md), [../api/04-types.md](../api/04-types.md).  
Skill: api-and-interface-design (contract-first, one-version, validate at edge).

## 1. One-version rule (Hyrum-aware)

- **One** public contract for portal resources — no `/api/v2`, no GraphQL/tRPC twin.  
- Server Action and Route Handler for the same use-case share: Zod schema, output type, error `code`s.  
- Observable behavior is a commitment (status codes, pagination shape, error codes).  
- Prefer **additive** optional fields; do not change types or remove fields without a deprecation note (new ADR).  

## 2. Contract-first

1. Define / update the port interface ([03-ports-and-adapters.md](03-ports-and-adapters.md)).  
2. Map Zod schemas ([../api/05-schema-map.md](../api/05-schema-map.md)).  
3. Implement domain export.  
4. Wire adapter(s).  

## 3. Validate only at boundaries

| Edge | Mechanism |
|------|-----------|
| Action input | `parseSchema` / `safeParse` on `lib/schemas` |
| Route Handler body/query | same |
| Env | `lib/env` |
| Third-party responses | parse before use |

Domain trusts typed values. No duplicate Zod deep inside domain for the same DTO.

## 4. One error semantics

HTTP:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable safe message",
    "details": {}
  }
}
```

Actions:

```typescript
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; details?: unknown }
```

| HTTP | `code` |
|------|--------|
| 400 | `BAD_REQUEST` |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` |
| 422 | `VALIDATION_ERROR` |
| 500 | `INTERNAL_ERROR` |

Expected failures → return result / JSON body. Do not mix throw-for-validation with return-for-not-found.

## 5. Input / Output + brands

- `CreateXInput` / `UpdateXInput` (partial) vs `X` output with server fields.  
- Branded IDs (`DeclarationId`, `ClientId`, …).  
- Types from `z.infer<typeof schema>` only — no parallel hand-written DTO trees.  
- Wire dates as ISO strings across RSC → client.  

## 6. REST naming (when HTTP exists)

| Rule | Example |
|------|---------|
| Plural nouns, no verbs in path | `GET /api/declarations` |
| Query `camelCase` | `?page=1&pageSize=20&sortBy=createdAt` |
| Lists paginated | `{ data, pagination }` |
| PATCH partial | only provided fields |
| Enums | `UPPER_SNAKE` |

Timing: **api-now** vs **contract-only** — [../api/02-rest-resources.md](../api/02-rest-resources.md). Same catalog; different implementation schedule.

## Red flags

- Different JSON shapes for the same resource via Action vs HTTP  
- Verbs in URLs (`/api/createDeclaration`)  
- List endpoints without pagination in the **contract**  
- Validation scattered through domain  
- Breaking field type changes without ADR  

## Related

- [03-ports-and-adapters.md](03-ports-and-adapters.md)  
- [adr/001-modular-monolith-hexagonal.md](adr/001-modular-monolith-hexagonal.md)  
- [../api/03-error-contract.md](../api/03-error-contract.md)  
