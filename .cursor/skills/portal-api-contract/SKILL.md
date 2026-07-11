---
name: portal-api-contract
description: >-
  Portal API contract enforcement layer for Client Declaration Portal. Encodes
  adapter choice (Server Action vs Route Handler), error shapes, branded IDs,
  Zod schema map, one-version rules, and the exact api-now vs contract-only
  split. Apply when writing app/actions, app/api route handlers, lib/schemas,
  or any adapter wiring; when the user mentions API contract, schema map,
  ActionResult, error codes, branded IDs, or REST resources.
---

# Portal API contract

**SSOT for this skill:** `doc/api/` (relative to repo root).

| Doc | Focus |
|-----|-------|
| [doc/api/01-boundaries.md](../../../doc/api/01-boundaries.md) | Trust boundary, adapter choice, session guards, validation rule |
| [doc/api/02-rest-resources.md](../../../doc/api/02-rest-resources.md) | api-now vs contract-only catalog, naming, pagination |
| [doc/api/03-error-contract.md](../../../doc/api/03-error-contract.md) | Wire shape, HTTP→code map, ActionResult |
| [doc/api/04-types.md](../../../doc/api/04-types.md) | Branded IDs, Input/Output split, discriminated unions |
| [doc/api/05-schema-map.md](../../../doc/api/05-schema-map.md) | `lib/schemas/` module map, resource→schema cross-ref |
| [doc/backend/05-contract-rules.md](../../../doc/backend/05-contract-rules.md) | One-version philosophy, contract-first order, red flags |

**Cross-skill links**

- Frontend route params and brand names → [../portal-frontend-scaffold/boundaries.md](../portal-frontend-scaffold/boundaries.md)
- Hyrum's Law / one-version principles → [../agent-skills/skills/api-and-interface-design/SKILL.md](../agent-skills/skills/api-and-interface-design/SKILL.md)

---

## 1. Adapter decision tree

```
Need                                                Adapter
─────────────────────────────────────────────────────────────
Same-origin UI mutation                          → Server Action
Same-origin UI read                              → RSC → domain (no HTTP round-trip)
Health / Neon Auth proxy / draft XHR             → Route Handler under /api
External REST / mobile consumer                  → Route Handler per doc/api contract
```

One domain function can serve both Action **and** Route Handler — keep it DRY.

---

## 2. Trust boundary layers

| Layer | May | Must not |
|-------|-----|----------|
| Adapter (`app/actions`, `app/api`) | Session guard, Zod parse, map errors, `revalidatePath` | Raw SQL, business rules |
| `lib/schemas` | Shape + refine | DB access |
| `lib/domain` | Parameterized queries, domain rules | Read `Request` / cookies |
| UI / RSC | Call domain (reads) or Actions (mutations) | Import `pg` / build SQL |

**Validation rule:** `parseSchema` / `safeParse` at the adapter boundary once. Do not re-validate inside domain helpers.

---

## 3. Error shapes (verbatim — do not paraphrase)

**Route Handler (HTTP):**

```typescript
interface APIErrorBody {
  error: {
    code: string      // UPPER_SNAKE, machine-readable
    message: string   // human-readable, safe to show
    details?: unknown // e.g. Zod flatten — never stack traces
  }
}
```

**Server Action:**

```typescript
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; details?: unknown }
```

**HTTP status → code map:**

| HTTP | When | `code` |
|------|------|--------|
| 400 | Malformed JSON / bad request framing | `BAD_REQUEST` |
| 401 | Not authenticated | `UNAUTHORIZED` |
| 403 | Authenticated but not allowed | `FORBIDDEN` |
| 404 | Resource missing | `NOT_FOUND` |
| 409 | Conflict (duplicate, version) | `CONFLICT` |
| 422 | Semantically invalid (Zod / domain) | `VALIDATION_ERROR` |
| 500 | Unexpected | `INTERNAL_ERROR` |

> Expected failures → return result / JSON body. Throw only for truly unexpected bugs (let `error.tsx` handle). Never expose SQL or internal exception messages in `message`.

---

## 4. Session guards

| Guard | Used by |
|-------|---------|
| `requireAdminSession` | Operator Actions |
| `requireClientSession` / client helpers | Client Actions |
| `requireAccountSession` | Account routes / actions |
| Trade access helpers | `app/actions/trade` |

Route Handlers that mutate must authenticate equivalently (cookie session). `public` exceptions: health endpoints and Neon Auth proxy only.

---

## 5. One-version rule

- No `/api/v1` + `/api/v2` in parallel.
- Server Action and Route Handler for the same use-case share: Zod schema, output type, error `code` set.
- Extend **additively** (optional fields only). Deprecate with a written plan (new ADR) before removal.
- Observable behavior is a commitment: status codes, pagination shape, error codes.

---

## 6. api-now vs contract-only

See [api-now.md](api-now.md) for the exact current Route Handler inventory and the prohibition on scaffolding contract-only list/read handlers for web UI.

Key rule: **Do not add same-origin "list declarations" GETs under `/api` for the dashboard — use RSC → domain.**

---

## 7. Branded IDs and schemas

See [brands-and-schemas.md](brands-and-schemas.md) for:
- Complete branded ID table (`DeclarationId`, `AssignmentId`, `ShareToken`, `InviteToken`, `TradeEventId`, etc.)
- `lib/schemas/` module map with notable exports
- Resource → schema cross-reference
- `parseSchema` usage pattern
- Known schema gaps

---

## 8. Naming rules (REST)

| Pattern | Convention |
|---------|------------|
| Paths | Plural nouns, no verbs (`/api/declarations`, not `/api/createDeclaration`) |
| IDs | Path params; UUID strings |
| Query params | `camelCase` (`?page=1&pageSize=20&sortBy=createdAt`) |
| Booleans | `is` / `has` / `can` prefix in JSON |
| Enums | `UPPER_SNAKE` in JSON wire format |

---

## 9. Pre-implementation checklist

Before writing any adapter, schema, or domain function:

- [ ] Checked adapter decision tree — correct adapter chosen
- [ ] Session guard identified and applied at adapter layer
- [ ] Zod schema in `lib/schemas/` referenced or created (not inline)
- [ ] `parseSchema` used at boundary; domain trusts typed value
- [ ] `ActionResult<T>` or `APIErrorBody` returned on failure (no throw for expected failures)
- [ ] Error `code` from the standard set (`VALIDATION_ERROR`, `NOT_FOUND`, etc.)
- [ ] Branded ID used at boundary (not raw `string`)
- [ ] Input/Output types split (Create/Patch omit server fields)
- [ ] api-now vs contract-only classified (no new HTTP list endpoints for web UI reads)
- [ ] One-version rule: no new parallel version, no field removal without ADR

---

## Out of scope for this skill

- Hot Sales feature flags, RBAC, or 2B–2D slice gating — see `hot-sales-phase-2a-ops.mdc` and `docs/hot-sales/`
- UI scaffold, route stubs, `loading.tsx` — see [../portal-frontend-scaffold/SKILL.md](../portal-frontend-scaffold/SKILL.md)
- `lib/` → `modules/` decomposition — separate refactor pass
- Playground routes or environment config — see `AGENTS.md`
- Neon Auth internals beyond "use `/api/auth/[...path]`; do not duplicate" — see `.agents/skills/neon/SKILL.md`
