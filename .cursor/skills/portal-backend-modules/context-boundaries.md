# Context boundaries

**Authority:** [doc/backend/03-bounded-contexts.md](../../../doc/backend/03-bounded-contexts.md) · [doc/backend/04-ports-and-adapters.md](../../../doc/backend/04-ports-and-adapters.md)

## Platform model

One **Afenda-Lite** SaaS · two product modules (Declarations + Feed Farm Trade) on shared Platform + Identity. Infra (env, Neon, auth, AdminCN, proxy, CI, deploy) updates once for both modules.

## Import bans

| Context | May depend on | Must not import |
|---------|---------------|-----------------|
| Identity | Neon Auth, Platform; **narrow:** `modules/declarations/copy` (product strings) + `getClientProfile` for session gates only | Declarations domain business rules (invites/CRUD), Trade |
| Declarations | Identity (actor / org ids), Platform | Trade (`modules/fft`) |
| Trade (`modules/fft`) | Identity (allowlist / RBAC), Platform | Declarations (**any** path — schemas included) |
| Platform | nothing product-specific | — |

### Shared primitives (Platform only)

| Concern | Path |
|---------|------|
| uuid / email / password / slug / `parseSchema` | `modules/platform/schemas/common.ts` |
| Email normalize | `modules/platform/normalize-email.ts` |
| API error body | `modules/platform/schemas/api-error.ts` |

Declarations `schemas/common.ts` **re-exports** Platform common and owns Declarations-only `surveyAnswersSchema`. Trade and Identity must import shared Zod from **Platform**, not from Declarations.

**Approved narrow Identity→Declarations edges (tracked debt):**

| Edge | Why it exists | Do not expand to |
|------|---------------|------------------|
| `portalCopy` / `PORTAL_NAME` | Product strings until Platform copy port | Declarations domain CRUD |
| `getClientProfile` | Session / member gates | Invite CRUD, survey writes |
| `bootstrapClientAfterAuth` → `ensureClientProfileRow` / invitation accept | Auth session must finish client invite bootstrap | New Identity→Declarations domain imports |

Until a ClientProfile + invite-bootstrap port lands on Identity/Platform — **do not add** further Identity→Declarations domain imports.

Compose at the **adapter** (page / Server Action / Route Handler) if a screen needs two contexts — do not merge domain trees.

## Port rules

- Ports are named exports under `modules/*/domain` (documented interfaces in `doc/backend/04`).
- Ports **never** import `Request`, `next/headers`, or UI.
- Zod at adapter edge; domain trusts typed input.
- One port function may back both a Server Action and a Route Handler — same Zod, same error codes (`/portal-api-contract`).

## Naming

| Prose | Code path |
|-------|-----------|
| Trade / Feed Farm Trade | `modules/fft/**`, `features/fft/fft-*.tsx`, `app/actions/fft.ts` |
| Declarations | `modules/declarations/**` |
| Identity | `modules/identity/**` |
| Platform | `modules/platform/**` |

**Forbidden:** `modules/trade/`, `features/trade/` product UI, growing domain under `lib/`.

## Checklist

- [ ] New file assigned to exactly one context
- [ ] No Declarations ↔ Trade domain **or** schema imports
- [ ] Shared Zod from Platform, not Declarations
- [ ] Adapter-only composition when two contexts needed
- [ ] Port has no Next.js / React imports
- [ ] Product schema lives in owning context’s `schemas/`
- [ ] No new Identity→Declarations domain imports beyond the narrow list above
