# Context boundaries

**Authority:** [doc/backend/03-bounded-contexts.md](../../../doc/backend/03-bounded-contexts.md) · [doc/backend/04-ports-and-adapters.md](../../../doc/backend/04-ports-and-adapters.md)

## Platform model

One **Afenda-Lite** SaaS · two product modules (Declarations + Feed Farm Trade) on shared Platform + Identity. Infra (env, Neon, auth, AdminCN, proxy, CI, deploy) updates once for both modules.

## Import bans

| Context | May depend on | Must not import |
|---------|---------------|-----------------|
| Identity | Neon Auth, Platform | Declarations (any), Trade |
| Declarations | Identity (actor / org ids), Platform | Trade (`modules/fft`) |
| Trade (`modules/fft`) | Identity (allowlist / RBAC), Platform | Declarations (**any** path — schemas included) |
| Platform | nothing product-domain-specific | Declarations / Identity / Trade domain trees |

### Shared primitives (Platform only)

| Concern | Path |
|---------|------|
| uuid / email / password / slug / `parseSchema` | `modules/platform/schemas/common.ts` |
| Email normalize | `modules/platform/normalize-email.ts` |
| API error body | `modules/platform/schemas/api-error.ts` |
| Product copy / `PORTAL_NAME` | `modules/platform/copy/*` |
| Evidence acceptance labels | `modules/platform/evidence-acceptance.ts` |

Declarations `schemas/common.ts` **re-exports** Platform common and owns Declarations-only `surveyAnswersSchema`. Trade and Identity must import shared Zod from **Platform**, not from Declarations.

**Closed (2026-07-12):** ClientProfile port (`modules/identity/domain/client-profile` + `client-invitation-bootstrap`); Platform copy port (`modules/platform/copy`). Identity has **zero** Declarations imports.

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
- [ ] No new Identity→Declarations imports (Platform copy port closed)
