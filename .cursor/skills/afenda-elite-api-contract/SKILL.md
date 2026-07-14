---
name: afenda-elite-api-contract
description: >-
  Enforces Afenda API/REST/OPEN contracts from docs/api and ARCH-029 — adapter choice,
  security pipeline, { data } envelope, APIErrorBody/ActionResult, brands, Zod map,
  api-now vs contract-only, OpenAPI, GUIDE-015 phases, and docs sync checks. Use when
  writing app/actions, app/api Route Handlers, modules/*/schemas, OpenAPI YAML,
  Fumadocs API docs; or when the user mentions API contract, REST-001, OPEN-001,
  ActionResult, branded IDs, declaration-draft, GUIDE-015, or afenda-elite-api-contract.
---

# Afenda — API contract

```text
LOAD:
  docs/api/README.md                          # pack entry · reading sequence
  docs/architecture/ARCH-029-*.md      # Living parent architecture
  docs/api/guides/GUIDE-015-*.md              # locked create/revise order (Jack Wee)
  docs/api/API-001…004 · REST-001 · OPEN-001  # Phase 1 Living executable contracts
  companions: api-now.md · brands-and-schemas.md · openapi.md · completeness.md
SKIP:
  inventing rules not in docs/api or ARCH-029
  treating Draft API-005…009 / REST-002…007 / FFT-REST-* as Living SSOT
  letting guides/runbooks/skills override Living contracts
  dual /api/v1+/api/v2 · layout-only auth · web-UI list GETs under /api
VERIFY:
  header Control State Closed unless explicitly reopened (DOC-001)
  npm run check:doc-integrity   # docs/api semantic + register
  node scripts/check-docs-naming.mjs docs/api
  npm run check:openapi            # after api-now HTTP / envelope changes
CLOSE:
  docs edits require DOC-001 reopen of named IDs; skill mirrors docs — never the reverse
```

**SSOT:** [`docs/api/`](../../../docs/api/) + Living parent [ARCH-029](../../../docs/architecture/ARCH-029-interface-api-architecture.md).  
**This skill mirrors docs.** If skill and docs disagree, **docs win** — patch the skill in the same change.

**Editions:** Afenda-Lite (beta) and Afenda-Elite (battle-proven) share DOC-001 control and this contract shape.

---

## Authority and sync

| Layer | Wins on | Path |
| ----- | ------- | ---- |
| Parent architecture | Surfaces, pipeline, Accept/Reject, compatibility | [ARCH-029](../../../docs/architecture/ARCH-029-interface-api-architecture.md) |
| Program order | What to create/refine next | [GUIDE-015](../../../docs/api/guides/GUIDE-015-interface-pack-development-roadmap.md) (locked) |
| Executable contract | Adapter, errors, brands, Zod, REST paths, OpenAPI rules | Living `API-*` / `REST-*` / `OPEN-*` under `docs/api/` |
| How-to / ops | Implementation steps only | `docs/api/guides/` · `docs/api/runbooks/` (RB-006…008) |
| Catalogue | ID / version / Status | [DOC-002](../../../docs/_control/DOC-002-documentation-register.md) |
| Skill companions | Agent execution aid | this folder — subordinate |

**Conflict rule (from docs/api README):** ARCH-029 > Living contracts > GUIDE-015 (order only) > guides/runbooks/skills.

**Sync triggers — update this skill when any of these change:**

1. Living Phase 1 contract (`API-001…004`, `REST-001`, `OPEN-001`) or ARCH-029 Accept/Reject
2. api-now Route Handler inventory in REST-001
3. OpenAPI generate/check commands or YAML include set
4. GUIDE-015 phase map or Draft→Living promotion of API-005…009 / REST-002…007
5. Docs verify scripts (`check:doc-integrity`, `check:docs-naming`, `check:openapi`)

**After docs/api contract edits, run:**

```bash
npm run check:doc-integrity
node scripts/check-docs-naming.mjs docs/api
npm run check:openapi
```

---

## Companion / dossier map

| Resource | Use when |
| -------- | -------- |
| [docs/api/README.md](../../../docs/api/README.md) | Pack entry · reading sequence · phase index |
| [completeness.md](completeness.md) | Plan ↔ recorded contract status |
| [api-now.md](api-now.md) | Exact RH inventory + UI prohibition |
| [brands-and-schemas.md](brands-and-schemas.md) | Brands + `modules/*/schemas` |
| [openapi.md](openapi.md) | Generate / expand OPEN-001 YAML |
| [API-001](../../../docs/api/API-001-api-boundaries.md) | Adapter + pipeline + `{ data }` |
| [API-002](../../../docs/api/API-002-error-contract.md) | Errors / ActionResult |
| [API-003](../../../docs/api/API-003-api-types.md) | Brands / I/O split |
| [API-004](../../../docs/api/API-004-schema-map.md) | Schema ownership |
| [REST-001](../../../docs/api/REST-001-rest-resources.md) | Paths + HTTP semantics + api-now |
| [OPEN-001](../../../docs/api/OPEN-001-openapi.md) | OpenAPI governance |
| [GUIDE-011](../../../docs/api/guides/GUIDE-011-generating-and-validating-openapi.md) | OpenAPI how-to |
| [GUIDE-014](../../../docs/api/guides/GUIDE-014-api-contract-verification-standard.md) | Verification bar (Draft until promoted) |
| [FFT-REST-001](../../../docs/modules/feed-farm-trade/FFT-REST-001-feed-farm-trade-resource-index.md) | FFT REST index (Draft) |
| [RB-006…008](../../../docs/api/runbooks/) | Drift / incident / rollback |

**Prefixes:** `API-` BFF vocabulary · `REST-` human paths · `FFT-REST-` module REST · `OPEN-` OpenAPI · `GUIDE-` how-to · `RB-` ops.

**Cross-skill:** [frontend-scaffold/boundaries](../afenda-elite-frontend-scaffold/boundaries.md) · [backend-modules](../afenda-elite-backend-modules/SKILL.md) · [api-and-interface-design](../agent-skills/skills/api-and-interface-design/SKILL.md) · farm via [`/using-afenda-elite-skills`](../using-afenda-elite-skills/SKILL.md) · docs control via [afenda-elite-doc-control](../afenda-elite-doc-control/SKILL.md).

---

## GUIDE-015 phases (do not reorder)

| Phase | Docs | Agent rule |
| ----- | ---- | ---------- |
| 1 Living | API-001…004, REST-001, OPEN-001 | Enforce as SSOT |
| 2 Draft | API-005…009 | Cite only; do not invent Living behavior from placeholders |
| 3 Draft | REST-002…007 | Expand on demand per GUIDE-015; web UI still RSC/Actions |
| 4 Module | FFT-REST-001 (+ gated children) | Contract-only until FFT program reopen |
| 5 Ops/guides | GUIDE-007…015, RB-006…008 | How-to / ops — never redefine architecture |

Reading order for conflicts: ARCH-029 → GUIDE-015 → Phase 1 Living → domain REST you touch → Draft only if in scope → guides/runbooks.

---

## Execute — pick a lane

| User / task signal | Do this |
| ------------------ | ------- |
| New Action or Route Handler | §1–§5 + checklist §10; classify api-now vs contract-only (§6) |
| Change draft / health / auth HTTP | Update code + regenerate OpenAPI ([openapi.md](openapi.md)) |
| New Zod schema / brand | [brands-and-schemas.md](brands-and-schemas.md); one-version only |
| OpenAPI / Fumadocs / Spectral | [openapi.md](openapi.md) + GUIDE-011 — never hand-edit YAML forever |
| List endpoints for dashboard | **Reject** — RSC → domain ([api-now.md](api-now.md)) |
| FFT HTTP | Contract-only until program reopen; locale-free paths; FFT-REST-001 |
| Draft API-005…009 topic | Read Draft doc + ARCH-029; do not promote Status without GUIDE-015 + approval |
| docs/api prose / register drift | [afenda-elite-doc-control](../afenda-elite-doc-control/SKILL.md) + reopen named IDs |

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
BFF context: [ARCH-013](../../../docs/architecture/ARCH-013-bff-and-data-flow.md).

---

## 2. Trust boundary + security pipeline

| Layer | May | Must not |
| ----- | --- | -------- |
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

Optional: `after()` for non-blocking audit. Public exceptions: health + Neon Auth proxy only (API-001).  
Default **Node** runtime for DB handlers. No `route.ts` beside `page.tsx`.

---

## 3. Success + error wire shapes

**Route Handler success** (API-001) — helpers `healthJson` / `apiData`:

```typescript
{ data: T } // HTTP 200 / 201
```

**Lists (ARCH-029 preference):** put list payload **inside** `data`, preferably `{ items, pagination }` — never bare top-level resources. Freeze query rules in API-008 when Living. Do not ship top-level `pagination` beside `data` for new work.

**Route Handler failure** (API-002) — bare body, **not** under `data`:

```typescript
interface APIErrorBody {
  error: {
    code: string; // UPPER_SNAKE
    message: string; // safe to show
    details?: unknown; // never stack traces
  };
}
```

**Server Action:**

```typescript
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; details?: unknown };
```

| HTTP | `code` |
| ---- | ------ |
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
| ----- | ------- |
| `requireAdminSession` | Operator Actions |
| `requireClientSession` / helpers | Client Actions |
| `requireAccountSession` | Account |
| Trade access helpers | `app/actions/fft` |

Mutating RHs authenticate equivalently (cookie session).

---

## 5. One-version rule

- No `/api/v1` + `/api/v2`.
- Same use-case Action + RH share Zod, output type, error `code` set.
- Additive optional fields only; removal needs controlled decision (ARCH-029 / ADR when required).
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
| ------- | ---------- |
| Paths | Plural nouns (`/api/declarations`) |
| IDs | Path params; UUID |
| Query | `camelCase` |
| Booleans | `is` / `has` / `can` |
| Enums | `UPPER_SNAKE` on wire |
| FFT | Locale-free `/api/fft/...` (no `:locale`) |

---

## 9. Accept / Reject

Living Accept/Reject lives in **ARCH-029** — do not maintain a divergent chat copy. Skill flash card:

**Accept:** RSC reads; Actions mutate UI; RH for health/auth/draft/external; `{ data }` success; bare errors; Zod SSOT; locale-free FFT contract.

**Reject:** Contract-only RH for web UI; dual `01-*` filenames; `/api/fft/:locale/...`; layout-only Action auth; throw for expected auth; Actions as cacheable GET; Edge default for DB; CDN cache on session draft; dumping all contract-only into OpenAPI playground; promoting Draft Phase 2/3 docs without GUIDE-015 + approval.

---

## 10. Pre-implementation checklist

- [ ] Adapter tree (§1) — correct adapter
- [ ] Security pipeline (§2) inside adapter
- [ ] Zod in owning `modules/*/schemas` (not inline Action)
- [ ] `parseSchema` at boundary
- [ ] Success `{ data }` (RH) or `ActionResult` (Action); bare `APIErrorBody` on RH failure
- [ ] List payloads prefer `data: { items, pagination }` (ARCH-029)
- [ ] Standard error `code`
- [ ] Branded ID at boundary
- [ ] Create/Patch omit server fields
- [ ] api-now vs contract-only classified
- [ ] One-version — no parallel URL version / silent field removal
- [ ] Draft docs cited only as Draft — not as Living enforcement
- [ ] If api-now HTTP shape changed → `npm run openapi:generate` && `npm run check:openapi`
- [ ] If `docs/api` Living contract changed → sync this skill + `npm run check:doc-integrity`

---

## Out of scope

- FFT flags / 2B–2D gates → `/feed-farm-trade` + `docs/modules/feed-farm-trade/`
- UI scaffold / `loading.tsx` → [frontend-scaffold](../afenda-elite-frontend-scaffold/SKILL.md)
- Modules residue → [backend-modules](../afenda-elite-backend-modules/SKILL.md)
- Doc register / Control State → [afenda-elite-doc-control](../afenda-elite-doc-control/SKILL.md)
- Playground / env → `AGENTS.md`
- Neon Auth internals → `.agents/skills/neon/SKILL.md` (use `/api/auth/[...path]` only)
