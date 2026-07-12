# API-002 Error Contract

| Field | Value |
|-------|-------|
| ID | API-002 |
| Category | API |
| Version | 1.2.0 |
| Status | Living |
| Owner | Backend |
| Updated | 2026-07-13 |

One error vocabulary across adapters. Enables engineers to return predictable failures without mixing REST JSON, Action results, and RSC navigation helpers.

**Audience:** backend and frontend maintainers. **Action enabled:** pick the correct error surface for the adapter.

## Three surfaces (do not mix)

| Surface | Failure style | Use when |
|---------|---------------|----------|
| **Route Handler** | HTTP status + `APIErrorBody` JSON | `/api/**` responses |
| **Server Action** | `ActionResult` with same `code` set | Expected failures from `'use server'` |
| **RSC / pages** | `notFound()` / `forbidden()` / `unauthorized()` | Missing resource or auth for a **page** render — not REST JSON |

Never expose `process.env`, connection strings, stack traces, or SQL in `message`.

Do not catch-and-swallow `redirect`, `notFound`, `forbidden`, or `unauthorized` inside Server Actions — call them outside `try/catch` or rethrow (`unstable_rethrow`).

## Wire shape (Route Handlers)

Failures are a **bare** body — never `{ data: { error: … } }`. Success uses `{ data: T }` per [API-001](API-001-api-boundaries.md).

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

## Server Actions

Prefer a discriminated result (serializable):

```typescript
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; details?: unknown }
```

Map `code` to the same set as HTTP. Return `ActionResult` for **expected** failures (including `UNAUTHORIZED` / `FORBIDDEN` / `VALIDATION_ERROR`). Throw only for truly unexpected bugs (let `error.tsx` handle).

## Related

- [API-001 API Boundaries](API-001-api-boundaries.md)
- [API-003 API Types](API-003-api-types.md)
- [REST-001 Rest Resources](REST-001-rest-resources.md)

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.2.0 | 2026-07-13 | Clarify errors are bare (not under `{ data }`); point success to API-001 |
| 1.1.0 | 2026-07-13 | Renumbered from API-003; three surfaces; navigation-API catch ban |
| 1.0.0 | 2026-07-13 | Initial error contract |
