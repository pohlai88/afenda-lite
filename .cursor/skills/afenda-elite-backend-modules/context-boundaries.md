# Context boundaries

**Authority (operative IDs):** ARCH-006 contexts · ARCH-007 ports/adapters · ARCH-028 anti-contamination. Living bodies dormant — this companion is SSOT.

Paths like `modules/<context>` are **logical / Target shape** (`apps/web/modules/…` when implemented). Root Collapse `modules/` / `app/` / `features/` remain **absent by design**. Declarations + FFT product trees are **removed** (nuclear wipe).

## Platform model

One **Afenda-Lite** SaaS · living modules = **Platform + Identity** (org-admin). Infra (env, Neon, auth, AdminCN, proxy, CI, deploy) updates once for living modules. Declarations and Feed Farm Trade product modules are **gone** — not frozen for later reopen.

## Import bans

| Context | May depend on | Must not import |
|---------|---------------|-----------------|
| Identity | Neon Auth, Platform | Wiped Declarations / FFT trees |
| Platform | Shared infra only | Product domain trees for removed modules; shell **compose** lives in `features/portal-chrome/resolve-shell-access` when present |
| Declarations *(removed)* | — | Do not recreate |
| Trade / FFT *(removed)* | — | Do not recreate |

### Shared primitives (Platform only)

| Concern | Path |
|---------|------|
| uuid / email / password / slug / `parseSchema` | `modules/platform/schemas/common.ts` |
| Email normalize | `modules/platform/normalize-email.ts` |
| API error body | `modules/platform/schemas/api-error.ts` |
| Product copy / `PORTAL_NAME` | `modules/platform/copy/*` |

Compose at the **adapter** (page / Server Action / Route Handler) if a screen needs two living contexts — do not merge domain trees.

## Port rules

- Ports are named exports under `modules/*/domain` (ARCH-007 ports/adapters — interfaces live with domain code).
- Ports **never** import `Request`, `next/headers`, or UI.
- Zod at adapter edge; domain trusts typed input.
- One port function may back both a Server Action and a Route Handler — same Zod, same error codes (`/afenda-elite-api-contract`).

## Naming

| Prose | Logical path | Target path (when scaffolded) |
|-------|--------------|-------------------------------|
| Identity | `modules/identity/**` | under `apps/web/` |
| Platform | `modules/platform/**` | under `apps/web/` |
| Declarations *(removed)* | — | do not recreate |
| Trade / FFT *(removed)* | — | do not recreate |

**Forbidden:** `modules/trade/`, `modules/declarations/`, `modules/fft/`, matching product `features/*`, growing domain under `lib/`, recovering Collapse or wiped-domain roots.

## Checklist

- [ ] New file assigned to exactly one living context (platform or identity)
- [ ] Paths written under Target `apps/web/…` when product tree exists
- [ ] Docs-first: no claim that absent Collapse roots are implemented today
- [ ] No recreate of Declarations ↔ FFT domain trees
- [ ] Shared Zod from Platform
- [ ] Adapter-only composition when two living contexts needed
- [ ] Port has no Next.js / React imports
- [ ] Product schema lives in owning context’s `schemas/`
