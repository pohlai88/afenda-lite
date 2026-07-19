---
name: afenda-elite-api-contract
description: >-
  Enforces Afenda API contracts from docs-V2/api Scratch + disk handlers — adapter choice,
  security pipeline, { data } envelope, APIErrorBody/ActionResult, brands, Zod map,
  api-now allowlist, OpenAPI under docs-V2, and sync checks. Use when writing app/actions,
  app/api Route Handlers, modules/*/schemas, OpenAPI YAML; or when the user mentions API
  contract, ActionResult, branded IDs, health api-now, or afenda-elite-api-contract.
---

# Afenda — API contract

```text
LOAD:
  docs-V2/api/README.md · rest.md             # Scratch pack entry + RH allowlist
  apps/web/app/api/**                         # disk honesty
  modules/platform/schemas/**                 # ActionResult · APIErrorBody · parseSchema
  companions: api-now.md · brands-and-schemas.md · openapi.md · completeness.md
SKIP:
  inventing contract-only REST catalogues without a consumer
  restoring Living docs/api without Docs-lane approval
  dual /api/v1+/api/v2 · layout-only auth · web-UI list GETs under /api
VERIFY:
  pnpm check:openapi                           # after api-now HTTP / envelope changes
  pnpm --filter @afenda/web test -- __tests__/openapi-api-now-disk.test.ts
CLOSE:
  skill mirrors Scratch docs-V2 + disk — never invent Living DOC-001 rows here
```

**SSOT (this checkout):** [`docs-V2/api/`](../../../docs-V2/api/) + disk `apps/web/app/api/**` + `modules/*/schemas/**`.  
**Living pack** (`docs/api/*`, ARCH-029 Controlled docs): **retired on disk** — cite only as historical; do not block work on missing paths.  
**This skill mirrors Scratch + disk.** If skill and disk disagree, **disk wins** — patch the skill in the same change.

**Editions:** Afenda-Lite (beta) and Afenda-Elite (battle-proven) share the same wire shapes on this checkout.

---

## Authority and sync

| Layer | Wins on | Path |
| ----- | ------- | ---- |
| Scratch pack | Adapter choice, RH allowlist, wire shapes | [docs-V2/api/](../../../docs-V2/api/) |
| Disk handlers | What exists as HTTP | `apps/web/app/api/**/route.ts` |
| Schemas / envelopes | Zod, ActionResult, APIErrorBody | `apps/web/modules/platform/schemas/**` · module schemas |
| OpenAPI machine file | Generated OAS for api-now | `docs-V2/api/OPEN-001-openapi.yaml` |
| Skill companions | Agent execution aid | this folder — subordinate |
| Living DOC-001 pack | Retired on this checkout | Do not restore without Docs-lane |

**Conflict rule:** disk handlers + docs-V2 Scratch > skill companions. Do not invent HTTP from retired Living catalogues.

**Sync triggers — update this skill when any of these change:**

1. api-now Route Handler inventory in docs-V2 `rest.md` or on disk
2. OpenAPI generate/check commands or YAML include set
3. ActionResult / APIErrorBody / health RH compose changes
4. Scratch docs-V2/api authority notes

**After api-now HTTP / Scratch API pack edits, run:**

```bash
pnpm openapi:generate
pnpm check:openapi
```

---

## Companion / dossier map

| Resource | Use when |
| -------- | -------- |
| [docs-V2/api/README.md](../../../docs-V2/api/README.md) | Scratch pack entry |
| [docs-V2/api/rest.md](../../../docs-V2/api/rest.md) | RH allowlist + wire shapes |
| [completeness.md](completeness.md) | Plan ↔ recorded contract status |
| [api-now.md](api-now.md) | Exact RH inventory + UI prohibition |
| [brands-and-schemas.md](brands-and-schemas.md) | Brands + `modules/*/schemas` |
| [openapi.md](openapi.md) | Generate / check OpenAPI YAML |

**Cross-skill:** [frontend-scaffold/boundaries](../afenda-elite-frontend-scaffold/boundaries.md) · [backend-modules](../afenda-elite-backend-modules/SKILL.md) · [api-and-interface-design](../agent-skills/skills/api-and-interface-design/SKILL.md) · farm via [`/using-afenda-elite-skills`](../using-afenda-elite-skills/SKILL.md).

---

## Execute — pick a lane

| User / task signal | Do this |
| ------------------ | ------- |
| New Action or Route Handler | §1–§5 + Action security checklist + §10; classify api-now (§6) |
| Change health / auth HTTP | Update code + regenerate OpenAPI ([openapi.md](openapi.md)) |
| New Zod schema / brand | [brands-and-schemas.md](brands-and-schemas.md); one-version only |
| OpenAPI / Spectral | [openapi.md](openapi.md) — never hand-edit YAML forever |
| List endpoints for dashboard | **Reject** — RSC → domain ([api-now.md](api-now.md)) |
| Declarations draft / FFT HTTP | **Reject** — product modules removed (nuclear wipe) |
| docs-V2/api Scratch drift | Patch Scratch + this skill together |

---

## 1. Adapter decision tree

```
Need                                                Adapter
─────────────────────────────────────────────────────────────
Same-origin UI mutation                          → Server Action
Same-origin UI read                              → RSC → modules/*/domain (no HTTP)
Health / Neon Auth / session / draft XHR         → Route Handler under /api
External REST / mobile consumer                  → Route Handler only when consumer exists
```

One domain function can serve Action **and** Route Handler.

---

## 2. Trust boundary + security pipeline

| Layer | May | Must not |
| ----- | --- | -------- |
| Adapter (`app/actions`, `app/api`) | Session guard, Zod parse, map errors, `revalidatePath` | Raw SQL, business rules |
| `modules/*/schemas` | Shape + refine | DB access |
| `modules/*/domain` | Parameterized queries, domain rules | Read `Request` / cookies |
| UI / RSC | Domain (reads) or Actions (mutations) | Import `pg` / build SQL |

Optional: `after()` for non-blocking audit after the response (does not replace pipeline stage 8). Public exceptions: health + Neon Auth proxy only.  
Default **Node** runtime for DB handlers. No `route.ts` beside `page.tsx`.

### Mutating boundary — security pipeline (mandatory)

Treat every Server Action as a **public endpoint**. Layout/`proxy.ts` visibility does **not** replace this pipeline. Every mutating Server Action and Route Handler shall run **in order**:

| # | Stage | Notes |
|---|-------|-------|
| 1 | Parse and validate input | Zod / `parseSchema` at adapter |
| 2 | Establish the authenticated actor | Session re-verify **inside** the adapter |
| 3 | Establish organization, tenant, or module scope | Active `organization_id` / module scope; reject omit/forge ([neon-tenancy-efficiency](../neon-tenancy-efficiency/SKILL.md)) |
| 4 | Authorize the requested capability | Platform permission codes — not Neon role display names |
| 5 | Validate resource ownership or state constraints | IDOR / state-machine / ownership before mutation |
| 6 | Invoke the domain with trusted types | No `Request` / cookies in ports |
| 7 | Map expected failures to the controlled error vocabulary | `ActionResult` / `APIErrorBody` |
| 8 | Record audit evidence where required | Actor, org, correlation where policy requires |
| 9 | Revalidate affected UI or cache where applicable | `revalidatePath` / tags; org-scoped cache keys |
| 10 | Emit a safe response | No secrets, stacks, SQL, or internal exception details |

**Target before merge:** all ten stages applied (or explicitly N/A with rationale for non-mutating/public allowlist paths). Public exceptions: health + Neon Auth proxy.

**Supplementary:** same use-case Action + RH share Zod, brands, and error `code` set (§5 one-version).

**Tenant data:** domain queries take explicit `orgId`; hard predicates — [neon-tenancy-efficiency](../neon-tenancy-efficiency/SKILL.md).

---

## 3. Success + error wire shapes

**Route Handler success** — helpers `healthJson` / `apiData` / `jsonData`:

```typescript
{ data: T } // HTTP 200 / 201
```

**Lists (preference):** put list payload **inside** `data`, preferably `{ items, pagination }` — never bare top-level resources. Do not ship top-level `pagination` beside `data` for new work.

**Route Handler failure** — bare body, **not** under `data`:

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
Mutating RHs authenticate equivalently (cookie session).

---

## 5. One-version rule

- No `/api/v1` + `/api/v2`.
- Same use-case Action + RH share Zod, output type, error `code` set.
- Additive optional fields only; removal needs explicit approval.
- Status codes, pagination shape, error codes are commitments.

---

## 6. api-now vs not-yet-HTTP

Inventory: [api-now.md](api-now.md) · [docs-V2/api/rest.md](../../../docs-V2/api/rest.md).

**api-now only:** `/api/health/*`, `/api/metrics`, `/api/ai/chat`, `/api/auth/[...path]`, `/api/session/*` (OpenAPI YAML = health + metrics; stream/auth/session excluded).  
**Do not** add same-origin list/read GETs under `/api` for dashboard — RSC → domain. Do **not** recreate wiped declaration-draft / FFT HTTP.

---

## 7. Brands + schemas

[brands-and-schemas.md](brands-and-schemas.md). Zod SSOT under `modules/*/schemas`. Import `parseSchema` from platform common at the boundary.

---

## 8. REST naming

| Pattern | Convention |
| ------- | ---------- |
| Paths | Plural nouns when product HTTP exists |
| IDs | Path params; UUID |
| Query | `camelCase` |
| Booleans | `is` / `has` / `can` |
| Enums | `UPPER_SNAKE` on wire |

---

## 9. Accept / Reject

**Accept:** RSC reads; Actions mutate UI; RH for health/auth/session/external-with-consumer; `{ data }` success; bare errors; Zod SSOT.

**Reject:** RH for ordinary web UI list reads; inventing offline REST catalogues; recreating wiped Declarations/FFT HTTP; layout-only Action auth; throw for expected auth; Actions as cacheable GET; Edge default for DB; restoring Living `docs/api` without Docs-lane approval.

---

## 10. Pre-implementation checklist

- [ ] Adapter tree (§1) — correct adapter
- [ ] Security pipeline (§2) inside adapter
- [ ] Zod in owning `modules/*/schemas` (not inline Action)
- [ ] `parseSchema` at boundary
- [ ] Success `{ data }` (RH) or `ActionResult` (Action); bare `APIErrorBody` on RH failure
- [ ] List payloads prefer `data: { items, pagination }`
- [ ] Standard error `code`
- [ ] Branded ID at boundary
- [ ] Create/Patch omit server fields
- [ ] api-now classified ([api-now.md](api-now.md))
- [ ] One-version — no parallel URL version / silent field removal
- [ ] Unexpected RH failures → `INTERNAL_ERROR` + correlation (no raw throws to clients)
- [ ] If api-now HTTP shape changed → `pnpm openapi:generate` && `pnpm check:openapi`
- [ ] If docs-V2/api Scratch changed → sync this skill

---

## Out of scope

- Wiped Declarations/FFT product restore → deprecation register (compulsory retired / removed)
- UI scaffold / `loading.tsx` → [frontend-scaffold](../afenda-elite-frontend-scaffold/SKILL.md)
- Modules residue → [backend-modules](../afenda-elite-backend-modules/SKILL.md)
- Restoring Living DOC-001 `docs/` tree → explicit Docs-lane mission
- Playground / env → `AGENTS.md`
- Neon Auth internals → `.agents/skills/neon/SKILL.md` (use `/api/auth/[...path]` only)
