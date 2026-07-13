---
name: afenda-elite-api-contract
description: >-
  Enforces Afenda-Lite API/REST/OPEN contract from docs/api — adapter choice, security
  pipeline, { data } success envelope, APIErrorBody/ActionResult, branded IDs, Zod map,
  api-now vs contract-only, and OpenAPI generate/check. Use when writing app/actions,
  app/api Route Handlers, modules/*/schemas, OpenAPI YAML, Fumadocs API docs; or when
  the user mentions API contract, REST-001, OPEN-001, ActionResult, branded IDs,
  declaration-draft, or afenda-elite-api-contract.
---

# Afenda Elite — API contract

**SSOT:** [`docs/api/`](../../../docs/api/) (skill mirrors docs — never invent parallel rules).  
**Entry:** [`docs/api/README.md`](../../../docs/api/README.md). Cite `term.afenda-elite`.  
**Forward writing:** Record unavailable work in OPEN-001 / API-004 Gaps; do not soften Living SSOT.

| Companion / doc | Use when |
|-----------------|----------|
| [completeness.md](completeness.md) | Plan ↔ recorded status |
| [api-now.md](api-now.md) | Exact RH inventory + UI prohibition |
| [brands-and-schemas.md](brands-and-schemas.md) | Brands + `modules/*/schemas` |
| [openapi.md](openapi.md) | Generate / expand OPEN-001 YAML |
| [API-001](../../../docs/api/API-001-api-boundaries.md) | Adapter + pipeline + `{ data }` |
| [API-002](../../../docs/api/API-002-error-contract.md) | Errors / ActionResult |
| [REST-001](../../../docs/api/REST-001-rest-resources.md) | Paths + HTTP semantics |
| [API-003](../../../docs/api/API-003-api-types.md) | Brands / I/O split |
| [API-004](../../../docs/api/API-004-schema-map.md) | Schema ownership |
| [OPEN-001](../../../docs/api/OPEN-001-openapi.md) | OpenAPI guide + forward recipes |

**Prefixes:** `API-` BFF vocabulary · `REST-` human paths · `OPEN-` OpenAPI (Living guide + generated YAML).

**Cross-skill:** [frontend-scaffold/boundaries](../afenda-elite-frontend-scaffold/boundaries.md) · [backend-modules](../afenda-elite-backend-modules/SKILL.md) · [api-and-interface-design](../agent-skills/skills/api-and-interface-design/SKILL.md) · farm via [`/using-afenda-elite-skills`](../using-afenda-elite-skills/SKILL.md).

---

## Execute — pick a lane

| User / task signal | Do this |
|--------------------|---------|
| New Action or Route Handler | §1–§5 + checklist §10; classify api-now vs contract-only (§6) |
| Change draft / health / auth HTTP | Update code + regenerate OpenAPI ([openapi.md](openapi.md)) |
| New Zod schema / brand | [brands-and-schemas.md](brands-and-schemas.md); one-version only |
| OpenAPI / Fumadocs / Spectral | [openapi.md](openapi.md) — never hand-edit YAML forever |
| List endpoints for dashboard | **Reject** — RSC → domain ([api-now.md](api-now.md)) |
| FFT HTTP | Contract-only until program reopen; locale-free paths |

**Verify after adapter or OpenAPI changes:**

```bash
node scripts/check-docs-naming.mjs
npm run check:openapi
```

---

## 1. Adapter decision tree

```
Need                                                Adapter
─────────────────────────────────────────────────────────────
Same-origin UI mutation                          → Server Action
Same-origin UI read                              → RSC → modules/*/domain (no HTTP)
Health / Neon Auth proxy / draft XHR             → Route Handler under /api
External REST / mobile consumer                  → Route Handler per REST-001
```

One domain function can serve Action **and** Route Handler.  
SSOT tree: [ARCH-013](../../../docs/architecture/frontend/ARCH-013-bff-and-data-flow.md).

---

## 2. Trust boundary + security pipeline

| Layer | May | Must not |
|-------|-----|----------|
| Adapter (`app/actions`, `app/api`) | Session guard, Zod parse, map errors, `revalidatePath` | Raw SQL, business rules |
| `modules/*/schemas` | Shape + refine | DB access |
| `modules/*/domain` | Parameterized queries, domain rules | Read `Request` / cookies |
| UI / RSC | Domain (reads) or Actions (mutations) | Import `pg` / build SQL |

**Every Action and mutating Route Handler:**

1. `parseSchema` / `safeParse`
2. `require*Session` **inside** the adapter
3. Authorization (role / org / ownership / FFT access)
4. Domain with trusted types
5. Map failures → `ActionResult` or `APIErrorBody`; revalidate on success when UI-backed

Optional: `after()` for non-blocking audit. Public exceptions: health + Neon Auth proxy only.  
Default **Node** runtime for DB handlers. No `route.ts` beside `page.tsx`.

---

## 3. Success + error wire shapes

**Route Handler success** (API-001) — helpers `healthJson` / `apiData`:

```typescript
{ data: T } // HTTP 200 / 201
```

**Route Handler failure** (API-002) — bare body, **not** under `data`:

```typescript
interface APIErrorBody {
  error: {
    code: string      // UPPER_SNAKE
    message: string   // safe to show
    details?: unknown // never stack traces
  }
}
```

**Server Action:**

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

Expected failures → structured result. Throw only for unexpected bugs. Never expose SQL / env in `message`.

---

## 4. Session guards

| Guard | Used by |
|-------|---------|
| `requireAdminSession` | Operator Actions |
| `requireClientSession` / helpers | Client Actions |
| `requireAccountSession` | Account |
| Trade access helpers | `app/actions/fft` |

Mutating RHs authenticate equivalently (cookie session).

---

## 5. One-version rule

- No `/api/v1` + `/api/v2`.
- Same use-case Action + RH share Zod, output type, error `code` set.
- Additive optional fields only; removal needs ADR.
- Status codes, pagination shape, error codes are commitments.

---

## 6. api-now vs contract-only

Inventory + FFT appendix: [api-now.md](api-now.md). SSOT paths: [REST-001](../../../docs/api/REST-001-rest-resources.md).

**api-now only:** `/api/health/*`, `/api/auth/[...path]`, `/api/client/declaration-draft` (POST = keepalive).  
**Do not** add same-origin list/read GETs under `/api` for dashboard — RSC → domain.

---

## 7. Brands + schemas

[brands-and-schemas.md](brands-and-schemas.md). Zod SSOT under `modules/*/schemas`. Import `parseSchema` from platform common at the boundary.

---

## 8. REST naming

| Pattern | Convention |
|---------|------------|
| Paths | Plural nouns (`/api/declarations`) |
| IDs | Path params; UUID |
| Query | `camelCase` |
| Booleans | `is` / `has` / `can` |
| Enums | `UPPER_SNAKE` on wire |

---

## 9. Accept / Reject (do not reopen casually)

**Accept:** RSC reads; Actions mutate UI; RH for health/auth/draft/external; `{ data }` success; bare errors; Zod SSOT; locale-free FFT contract.

**Reject:** Contract-only RH for web UI; dual `01-*` filenames; `/api/fft/:locale/...`; layout-only Action auth; throw for expected auth; Actions as cacheable GET; Edge default for DB; CDN cache on session draft; dumping all contract-only into OpenAPI playground.

---

## 10. Pre-implementation checklist

- [ ] Adapter tree (§1) — correct adapter
- [ ] Security pipeline (§2) inside adapter
- [ ] Zod in owning `modules/*/schemas` (not inline Action)
- [ ] `parseSchema` at boundary
- [ ] Success `{ data }` (RH) or `ActionResult` (Action); bare `APIErrorBody` on RH failure
- [ ] Standard error `code`
- [ ] Branded ID at boundary
- [ ] Create/Patch omit server fields
- [ ] api-now vs contract-only classified
- [ ] One-version — no parallel URL version / silent field removal
- [ ] If api-now HTTP shape changed → `npm run openapi:generate` && `npm run check:openapi`

---

## Out of scope

- FFT flags / 2B–2D gates → `/feed-farm-trade` + `docs/modules/feed-farm-trade/`
- UI scaffold / `loading.tsx` → [frontend-scaffold](../afenda-elite-frontend-scaffold/SKILL.md)
- Modules residue Pass 2 → [backend-modules](../afenda-elite-backend-modules/SKILL.md)
- Playground / env → `AGENTS.md`
- Neon Auth internals → `.agents/skills/neon/SKILL.md` (use `/api/auth/[...path]` only)
