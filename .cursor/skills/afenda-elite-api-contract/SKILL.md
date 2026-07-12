---
name: afenda-elite-api-contract
description: >-
  Afenda Elite API contract enforcement — adapter choice (Server Action vs Route Handler),
  error shapes, branded IDs, Zod schema map, one-version rules, and the exact api-now vs
  contract-only split. Apply when writing app/actions, app/api route handlers,
  modules/*/schemas, or any adapter wiring; when the user mentions API contract, schema map,
  ActionResult, error codes, branded IDs, REST resources, or afenda-elite-api-contract.
---

# Afenda Elite — API contract

**SSOT for this skill:** `docs/api/` (relative to repo root). Cite `term.afenda-elite`.

| Doc | Focus |
|-----|-------|
| [completeness.md](completeness.md) | Plan ↔ codebase matrix |
| [docs/api/API-001-api-boundaries.md](../../../docs/api/API-001-api-boundaries.md) | Trust boundary, adapter choice, security pipeline |
| [docs/api/REST-001-rest-resources.md](../../../docs/api/REST-001-rest-resources.md) | api-now vs contract-only catalog, naming, pagination |
| [docs/api/API-002-error-contract.md](../../../docs/api/API-002-error-contract.md) | Wire shape, HTTP→code map, ActionResult, three surfaces |
| [docs/api/API-003-api-types.md](../../../docs/api/API-003-api-types.md) | Branded IDs, Input/Output split, discriminated unions |
| [docs/api/API-004-schema-map.md](../../../docs/api/API-004-schema-map.md) | `modules/*/schemas` map, resource→schema cross-ref |
| [docs/api/OPEN-001-openapi.md](../../../docs/api/OPEN-001-openapi.md) | OpenAPI guide (YAML generated separately) |
| [docs/api/README.md](../../../docs/api/README.md) | Pack entry + Accept/Upgrade/Reject snapshot |
| [docs/backend/ARCH-010-backend-conventions.md](../../../docs/backend/ARCH-010-backend-conventions.md) | Backend conventions + one-version pointers |

**Prefixes:** `API-` cross-cutting BFF · `REST-` human path catalogs · `OPEN-` OpenAPI (reserved stub).

**Cross-skill links**

- Frontend route params and brand names → [../afenda-elite-frontend-scaffold/boundaries.md](../afenda-elite-frontend-scaffold/boundaries.md)
- Modules / ports / residue → [../afenda-elite-backend-modules/SKILL.md](../afenda-elite-backend-modules/SKILL.md)
- Hyrum's Law / one-version principles → [../agent-skills/skills/api-and-interface-design/SKILL.md](../agent-skills/skills/api-and-interface-design/SKILL.md)

---

## 1. Adapter decision tree

```
Need                                                Adapter
─────────────────────────────────────────────────────────────
Same-origin UI mutation                          → Server Action
Same-origin UI read                              → RSC → modules/*/domain (no HTTP)
Health / Neon Auth proxy / draft XHR             → Route Handler under /api
External REST / mobile consumer                  → Route Handler per docs/api contract
```

One domain function can serve both Action **and** Route Handler — keep it DRY.

Full tree SSOT: [docs/frontend/ARCH-013-bff-and-data-flow.md](../../../docs/frontend/ARCH-013-bff-and-data-flow.md).

---

## 2. Trust boundary layers

| Layer | May | Must not |
|-------|-----|----------|
| Adapter (`app/actions`, `app/api`) | Session guard, Zod parse, map errors, `revalidatePath` | Raw SQL, business rules |
| `modules/*/schemas` | Shape + refine | DB access |
| `modules/*/domain` | Parameterized queries, domain rules | Read `Request` / cookies |
| UI / RSC | Call module domain (reads) or Actions (mutations) | Import `pg` / build SQL |

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
| Trade access helpers | `app/actions/fft` |

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

Key rule: **Do not add same-origin "list declarations" GETs under `/api` for the dashboard — use RSC → module domain.**

---

## 7. Branded IDs and schemas

See [brands-and-schemas.md](brands-and-schemas.md) for:
- Complete branded ID table (`DeclarationId`, `AssignmentId`, `ShareToken`, `InviteToken`, `TradeEventId`, etc.)
- `modules/*/schemas` map with notable exports
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
- [ ] Zod schema in owning `modules/*/schemas` referenced or created (not inline)
- [ ] `parseSchema` used at boundary; domain trusts typed value
- [ ] `ActionResult<T>` or `APIErrorBody` returned on failure (no throw for expected failures)
- [ ] Error `code` from the standard set (`VALIDATION_ERROR`, `NOT_FOUND`, etc.)
- [ ] Branded ID used at boundary (not raw `string`)
- [ ] Input/Output types split (Create/Patch omit server fields)
- [ ] api-now vs contract-only classified (no new HTTP list endpoints for web UI reads)
- [ ] One-version rule: no new parallel version, no field removal without ADR

---

## Out of scope for this skill

- Feed Farm Trade feature flags, RBAC, or 2B–2D slice gating — see `/feed-farm-trade` and `docs/fft/`
- UI scaffold, route stubs, `loading.tsx` — see [../afenda-elite-frontend-scaffold/SKILL.md](../afenda-elite-frontend-scaffold/SKILL.md)
- Modules layout / residue Pass 2 — see [../afenda-elite-backend-modules/SKILL.md](../afenda-elite-backend-modules/SKILL.md) (`lib/` → `modules/` relocate is **complete**)
- Playground routes or environment config — see `AGENTS.md`
- Neon Auth internals beyond "use `/api/auth/[...path]`; do not duplicate" — see `.agents/skills/neon/SKILL.md`
