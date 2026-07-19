# FE ↔ BE boundaries (contract-first)

Hardens interfaces so the wrong thing is hard. Aligns with `/api-and-interface-design` and [`docs-V2/api`](../../../docs-V2/api/) + [api-contract](../afenda-elite-api-contract/SKILL.md).

**Scaffold pass:** name routes and stub `Props` to match this contract. Do not implement Zod/ports yet.  
**Wire pass:** enforce every rule below.

## Trust boundaries

| Edge | Trust | Validate |
|------|-------|----------|
| URL `params` / `searchParams` | **Untrusted** | Zod at page runner or action entry — then brand |
| Server Action input | **Untrusted** | Zod → `ActionResult` |
| Route Handler body/query | **Untrusted** | Zod → same error shape as api-contract / Platform `APIErrorBody` |
| Module/domain internals | Trusted after boundary | No re-validation of already-parsed types |
| Third-party HTTP responses | **Untrusted** | Parse before use |

Never validate “deep” inside domain for input that already passed the adapter Zod schema.

## One-version identity map

Route folder name = TypeScript brand = Zod field = Action/REST field. **One name.**

| Route segment | Brand | Construct after |
|---------------|-------|-----------------|
| `declarationId` | `DeclarationId` | uuid schema + lookup |
| `assignmentId` | `AssignmentId` | uuid schema + lookup |
| `eventId` | `TradeEventId` | uuid schema + lookup |
| `slug` | `SurveySlug` | slug schema |
| `token` on `/f` | `ShareToken` | token schema |
| `token` on `/invite` | `InviteToken` | token schema (different resource — do not mix) |
| `invitationId` | `InvitationId` | uuid schema |
| `userId` | `UserId` (wire pass) | uuid / identity lookup — `/dashboard/users/[userId]` |
| `locale` | `TradeLocale` | `vi` \| `en` enum |

```typescript
// Good — cannot pass AssignmentId where DeclarationId is required
type DeclarationId = string & { readonly __brand: 'DeclarationId' }
type AssignmentId = string & { readonly __brand: 'AssignmentId' }

// Bad — raw string everywhere
function load(id: string) { ... }
```

**Do not** use folder `[id]` and then map to different brands in code — that is how bugs ship.

## Adapter responsibilities

```text
app/**/page.tsx          → await params; call runner/feature (thin)
features/*               → present UI (RSC + small client islands)
app/actions/*.ts         → 'use server'; Zod; session; port; revalidatePath
app/api/**/route.ts      → HTTP only; Zod; same error body
modules/<context>/*      → ports + persistence (SSOT — relocate complete)
```

### Reads vs mutations

| Need | Adapter | Anti-pattern |
|------|---------|--------------|
| RSC read | Call `modules/*/domain` port | `fetch('/api/declarations')` from RSC |
| Client mutation | Server Action | Ad-hoc Route Handler for same-origin form POST |
| Draft keepalive XHR | Existing `/api/client/declaration-draft` | Duplicating as Action + Handler without reason |
| Health / Neon Auth | Route Handler | Embedding in page |

Trade code path: `modules/fft` (never `modules/trade`). Schema map: `/afenda-elite-api-contract` · modules layout: `/afenda-elite-backend-modules`.

### Input / Output split (wire)

- **Input** — caller fields only (`Create*` / `Update*` / PATCH partial)
- **Output** — includes server ids/timestamps (`Declaration`, `Assignment`, …)
- Zod is SSOT; export types via `z.infer` — no parallel DTO trees

## Error semantics (one shape)

### Route Handlers

```typescript
// APIErrorBody — see afenda-elite-api-contract / Platform schemas
{ error: { code: string; message: string; details?: unknown } }
```

Codes: `BAD_REQUEST` | `UNAUTHORIZED` | `FORBIDDEN` | `NOT_FOUND` | `CONFLICT` | `VALIDATION_ERROR` | `INTERNAL_ERROR`

### Server Actions

```typescript
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; details?: unknown }
```

- Expected failures → return `{ ok: false, code, message }` (same `code` vocabulary)
- Unexpected bugs → throw (caught by `error.tsx`)
- Never mix “throw for validation, return for not found” without a written exception
- Do not wrap `redirect()` / `notFound()` in try/catch without `unstable_rethrow`

## Context isolation

| Context | May depend on | Must not import |
|---------|---------------|-----------------|
| Identity | Neon Auth, platform | Declarations domain, Trade domain |
| Declarations | Identity (actor/org) | Trade |
| Trade | Identity (allowlist/RBAC) | Declarations |
| Platform | nothing product-specific | — |

Compose at the **adapter** (page/action) if a screen needs two contexts — do not merge domains.

## api-now vs contract-only

| api-now (keep / implement as HTTP) | contract-only (do not scaffold handlers for web UI) |
|------------------------------------|-----------------------------------------------------|
| `/api/health/*` | `/api/clients`, `/api/declarations`, … |
| `/api/auth/[...path]` | Share/public REST duplicates of page runners |
| `/api/client/declaration-draft` | `/api/account` for Neon-owned fields |

Web UI uses RSC + Actions. REST catalog in docs/api is for external consumers later — **one version**, extend additively.

## Naming

| Surface | Convention |
|---------|------------|
| App route segments | descriptive resource ids (`declarationId`) |
| Query params | camelCase (`invitationId`, `returnTo`) |
| Action/REST fields | camelCase |
| Error `code` / enums | UPPER_SNAKE |
| Booleans | `is` / `has` / `can` prefix |

## Scaffold checklist (boundaries)

- [ ] Every dynamic folder name appears in the identity map above
- [ ] Stub `Props` use the same field names (even as `string` before branding)
- [ ] No new `/api/*` list/read routes for dashboard/client in scaffold or wire-for-web
- [ ] Invite `[token]` vs share `[token]` documented as different brands (same folder name, different trees — OK; never share parsers)

## Wire checklist (boundaries)

- [ ] Zod at every Action / Route Handler / param parse
- [ ] Brands applied only after successful parse
- [ ] `ActionResult` + HTTP error body share `code` set
- [ ] No Declarations ↔ Trade imports
- [ ] Input types omit server fields; outputs include them
