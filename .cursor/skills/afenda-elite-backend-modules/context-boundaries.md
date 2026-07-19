# Context boundaries

**Authority (operative IDs):** ARCH-006 contexts · ARCH-007 ports/adapters · ARCH-028 anti-contamination. Living bodies dormant — this companion is SSOT.

Paths like `modules/<context>` are **logical / Target shape** (`apps/web/modules/…` when implemented). On this **docs-first** checkout, root `modules/` / `app/` / `features/` are **absent by design** — import bans still apply to future Target code; do not treat this file as current disk SSOT.

## Platform model

One **Afenda-Lite** SaaS · two product modules (Declarations + Feed Farm Trade) on shared Platform + Identity. Infra (env, Neon, auth, AdminCN, proxy, CI, deploy) updates once for both modules.

## Import bans

| Context | May depend on | Must not import |
|---------|---------------|-----------------|
| Identity | Neon Auth, Platform | Declarations (any), Trade |
| Declarations | Identity (actor / org ids), Platform | Trade (`modules/fft`) |
| Trade (`modules/fft`) | Identity (allowlist / RBAC), Platform | Declarations (**any** path — schemas included) |
| Platform | Shared infra only | Product domain trees (`declarations` / `fft`); Identity session helpers used by routing are a known narrow edge — shell **compose** lives in `features/portal-chrome/resolve-shell-access` |

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

- Ports are named exports under `modules/*/domain` (ARCH-007 ports/adapters — interfaces live with domain code).
- Ports **never** import `Request`, `next/headers`, or UI.
- Zod at adapter edge; domain trusts typed input.
- One port function may back both a Server Action and a Route Handler — same Zod, same error codes (`/afenda-elite-api-contract`).

## Naming

| Prose | Logical path | Target path (when scaffolded) |
|-------|--------------|-------------------------------|
| Trade / Feed Farm Trade | `modules/fft/**`, `features/fft/…`, `app/actions/fft.ts` | under `apps/web/` |
| Declarations | `modules/declarations/**` | under `apps/web/` |
| Identity | `modules/identity/**` | under `apps/web/` |
| Platform | `modules/platform/**` | under `apps/web/` |

**Forbidden:** `modules/trade/`, `features/trade/` product UI, growing domain under `lib/`, recovering Collapse roots.

## Checklist

- [ ] New file assigned to exactly one ARCH-006 context
- [ ] Paths written under Target `apps/web/…` when product tree exists
- [ ] Docs-first: no claim that absent `modules/` / `app/` are implemented today
- [ ] No Declarations ↔ Trade domain **or** schema imports
- [ ] Shared Zod from Platform, not Declarations
- [ ] Adapter-only composition when two contexts needed
- [ ] Port has no Next.js / React imports
- [ ] Product schema lives in owning context’s `schemas/`
- [ ] No new Identity→Declarations imports (Platform copy port closed)
