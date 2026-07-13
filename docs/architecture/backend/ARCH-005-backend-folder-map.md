# ARCH-005 Backend Folder Map

| Field | Value |
|-------|-------|
| ID | ARCH-005 |
| Category | Architecture |
| Version | 1.0.0 |
| Status | Living |
| Owner | Backend |
| Updated | 2026-07-13 |

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
| `modules/platform/shell/*` | Shared shell types (`ShellModuleId`); resolve in `features/portal-chrome/resolve-shell-access` |
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

## `lib/` — gone (full absorb complete)

| Disposition | Paths |
|-------------|-------|
| **Runners / harness** | `features/auth/entry/**`, `features/organization-admin/organization-admin-*`, `features/auth/public-link-page*`, `features/playground/**` |
| **Gone** | Entire `lib/` tree — do not recreate |

Pass 2 + absorb: FE trust → `features/auth/`; brand/theme → `features/portal-chrome/`; product copy SSOT → `modules/platform/copy/`; shell members → `modules/identity/`; entry / org-admin / playground runners → `features/`. See [06-modules-ownership.md](ARCH-009-modules-ownership-map.md) and skill [`residue-inventory.md`](../../../.cursor/skills/afenda-elite-backend-modules/residue-inventory.md).

## Related

- [03-bounded-contexts.md](ARCH-006-bounded-contexts.md)  
- [../architecture/frontend/ARCH-029-frontend-folder-map.md](../../architecture/frontend/ARCH-029-frontend-folder-map.md)  
