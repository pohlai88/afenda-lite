# Backend folder map

Runtime SSOT after `lib/` → `modules/` relocate (complete 2026-07-11). Prose context **Trade** = product Feed Farm Trade; code path **`modules/fft/`**.

## Target layout

```text
modules/
  platform/       # health helpers, env, db, observability, api-error, governance, routing, shell
  identity/       # auth, session, invites, account, email
  declarations/   # surveys, clients, assignments, drafts, evidence, copy
  fft/            # feed farm trade domain + schemas + session + i18n
```

Adapters stay thin and **outside** modules:

- `app/actions/*` — Server Actions  
- `app/api/*` — Route Handlers (api-now only)  
- `app/**/page.tsx` — compose features; call module ports  

## `modules/` L2

| Path | Role |
|------|------|
| `modules/platform/api/*` | Route adapter helpers (health, draft runner, json-response) |
| `modules/platform/env/*` | Typed env manifest + accessors |
| `modules/platform/schemas/api-error.ts` | Shared `APIErrorBody` / codes |
| `modules/platform/schemas/common.ts` | Shared Zod primitives (`parseSchema`, uuid, email, …) |
| `modules/platform/db.ts`, `db-config.ts` | Pool / connection config |
| `modules/platform/routing/*` | Portal hrefs, public-link landing, surface registry |
| `modules/platform/shell/*` | Shared AdminCN entitlements (`resolveShellAccess`) |
| `modules/platform/governance/*` | Reliance graph, route coverage |
| `modules/identity/auth/*` | Neon Auth, session, admin, oauth, manifests |
| `modules/identity/schemas/auth.ts` | Sign-in schema |
| `modules/identity/domain/*` | Invite tokens, auth user lookup |
| `modules/declarations/domain/*` | Surveys, clients, drafts, evidence, submissions |
| `modules/declarations/schemas/*` | Declarations Zod (`common`, `client`, `surveys`, …) |
| `modules/fft/domain/**` | Events, orders, allocation, deposits, pickup, imports, ERP |
| `modules/fft/schemas/fft-schemas.ts` | Trade Zod |
| `modules/fft/auth/fft-session.ts` | Trade access gates |
| `modules/fft/auth/fft-phase2b.ts`, `fft-phase2d.ts` | Phase flag helpers |
| `modules/fft/i18n/*` | Trade i18n |

**Forbidden:** create `modules/trade/` — use `modules/fft/`.

## Remaining `lib/` (runners only — Pass 2 complete)

| Disposition | Paths |
|-------------|-------|
| **Keep (runners)** | `lib/entry/**`, `lib/pages/**` (org-admin, public-link, playground) — do not grow for greenfield |
| **Keep (harness)** | `lib/playground/**` |
| **Gone** | `lib/domain/`, `lib/schemas/`, `lib/env/`, `lib/routing/`, `lib/auth/`, `lib/copy/`, `lib/utils.ts`, `lib/format.ts` |

Pass 2 relocates: FE trust → `features/auth/`; brand/theme → `features/portal-chrome/`; product copy SSOT → `modules/declarations/copy/`; shell members → `modules/identity/`. See [06-modules-ownership.md](06-modules-ownership.md) and skill [`residue-inventory.md`](../../.cursor/skills/portal-backend-modules/residue-inventory.md).

## Related

- [03-bounded-contexts.md](03-bounded-contexts.md)  
- [../frontend/02-folder-map.md](../frontend/02-folder-map.md)  
