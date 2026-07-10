# Error contract

One shape everywhere (Route Handlers required; Server Actions should use the same `code` vocabulary).

## Wire shape

```typescript
interface APIErrorBody {
  error: {
    code: string // machine-readable, UPPER_SNAKE
    message: string // human-readable, safe to show
    details?: unknown // e.g. Zod flatten — never stack traces
  }
}
```

Example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid task data",
    "details": { "fieldErrors": { "email": ["Enter a valid email address."] } }
  }
}
```

## Status map

| HTTP | When | Typical `code` |
|------|------|----------------|
| 400 | Malformed JSON / bad request framing | `BAD_REQUEST` |
| 401 | Not authenticated | `UNAUTHORIZED` |
| 403 | Authenticated but not allowed | `FORBIDDEN` |
| 404 | Resource missing | `NOT_FOUND` |
| 409 | Conflict (duplicate, version) | `CONFLICT` |
| 422 | Semantically invalid (Zod / domain) | `VALIDATION_ERROR` |
| 500 | Unexpected | `INTERNAL_ERROR` |

Never expose internal exception messages or SQL in `message`.

## Server Actions

Prefer a discriminated result (serializable):

```typescript
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; details?: unknown }
```

Map `code` to the same set as HTTP. Do not mix “throw for validation, return for not found” without a documented rule — pick **return `ActionResult`** for expected failures; throw only for truly unexpected bugs (and let `error.tsx` handle).

## Related

- [01-boundaries.md](01-boundaries.md)  
- [04-types.md](04-types.md)  
