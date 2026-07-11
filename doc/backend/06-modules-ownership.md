# Modules ownership map

**Status:** Context relocate **complete** (2026-07-11). Platform, Identity, Declarations, Trade live under `modules/`. Remaining `lib/` is FE runners + residue + shims.  
**Agent skill:** [`.cursor/skills/portal-backend-modules/`](../../.cursor/skills/portal-backend-modules/SKILL.md)  
**Contexts:** [03-bounded-contexts.md](03-bounded-contexts.md)  
**Folder map:** [02-folder-map.md](02-folder-map.md)  
**API contract:** [../api/](../api/) · skill `/portal-api-contract`  
**FE scaffold:** `/portal-frontend-scaffold` (do not grow `lib/pages` for greenfield UI)

---

## Hard rules

1. **Module domains:** Trade ↛ Declarations (and reverse). Compose at the adapter only. Same SaaS platform — do not invent separate FFT infra.  
2. New **product** file → pick **exactly one** module context. No “utils” orphans at `lib/` root. Platform/infra files live under `modules/platform/` and serve both modules.  
3. Ports never import `Request`, `next/headers`, or UI.  
4. Zod lives with the owning context (`schemas/`); validate at adapter edge.  
5. Do not grow or recreate `lib/` — UI and runners live under `features/*`. Platform/infra under `modules/platform/`.  
6. Never create `modules/trade/` — use `modules/fft/`.  

---

## 1. Platform → `modules/platform/` (**relocated**)

| Path | Role |
|------|------|
| `modules/platform/api/*` | Route adapter helpers (health, draft runner, json-response, routes) |
| `modules/platform/schemas/api-error.ts` | Shared `APIErrorBody` / codes |
| `modules/platform/schemas/common.ts` | Shared Zod primitives (`parseSchema`, uuid, email, slug, password) |
| `modules/platform/env/*` | Typed env manifest + accessors |
| `modules/platform/db.ts`, `db-config.ts` (+ test) | Pool / connection config |
| `modules/platform/observability.ts` | Logged action wrapper |
| `modules/platform/audit.ts` | Audit events |
| `modules/platform/app-url.ts` | Canonical app URL |
| `modules/platform/utils.ts`, `format.ts`, `breakpoints.ts` (+ test) | Shared primitives |
| `modules/platform/form-constraints.ts` | Shared field limits |
| `modules/platform/evidence-acceptance.ts` | Shared evidence file acceptance labels |
| `modules/platform/copy/{portal-copy,portal-name}.ts` | Product copy SSOT (`portalCopy`, `PORTAL_NAME`) |
| `modules/platform/clipboard.ts` | Clipboard helper |
| `modules/platform/pagination-range.ts` (+ test) | Pagination math |
| `modules/platform/governance/*` | Reliance graph, route coverage, studio kit |
| `modules/platform/routing/*` | Portal route hrefs, public-link landing, surface registry |
| `modules/platform/shell/*` | Shared AdminCN entitlements |
| `modules/platform/playground-embed.ts` | Embed header helpers |
| `modules/platform/actions.barrel.test.ts`, `supabase-retirement.test.ts` | Platform guards |

Transitional shims: `lib/utils.ts`, `lib/format.ts` re-export only.

---

## 2. Identity → `modules/identity/` (**relocated**)

| Path | Role |
|------|------|
| `modules/identity/auth/*` | Neon Auth, session, admin, oauth, manifests |
| `modules/identity/account-session.ts` | Account session gate |
| `modules/identity/client-session.ts` | Client session helper |
| `modules/identity/domain/neon-auth-users.ts` | Auth user lookup by email |
| `modules/identity/domain/organization-users.ts` | Org-admin user directory (list/get) |
| `modules/identity/schemas/users.ts` | `UserId`, set-role / ban Zod |
| `modules/identity/domain/invite.ts`, `tokens.ts` | Invite token / QR |
| `modules/identity/delete-client-auth-user.ts` | Delete Neon user |
| `modules/identity/email/*` | Client onboarding invite email |
| `modules/identity/auth-metadata.ts` | Auth metadata |
| `modules/identity/preview-client.ts` (+ test) | Preview client |
| `modules/identity/portal-member.ts`, `portal-member-types.ts` (+ test) | Member model |
| `modules/identity/portal-organization.ts` | Org helper |
| `modules/identity/schemas/auth.ts` | Sign-in schema |
| `modules/identity/admin.ts` | Admin helpers |
| `modules/identity/production-fixtures.ts` | Seed / fixture emails |
| `modules/identity/client-invitation-join-auth.ts` (+ test) | Join auth helper |
| `modules/identity/auth/bootstrap-client-invite*` | Bootstrap invite |

Remaining `lib/auth/*` files are **FE trust-UI helpers only** (not Neon Auth stack).

---

## 3. Declarations → `modules/declarations/` (**relocated**)

| Path | Role |
|------|------|
| `modules/declarations/domain/clients.ts` (+ tests) | Clients / invites / assignments |
| `modules/declarations/domain/client-declaration-draft.ts` (+ test) | Draft persist / load |
| `modules/declarations/domain/surveys.ts` | Survey CRUD |
| `modules/declarations/domain/questions.ts` | Questions / evidence rows |
| `modules/declarations/domain/survey-submission.ts` (+ test) | Submit paths |
| `modules/declarations/domain/declaration-*.ts` | Steps, deadlines, share links |
| `modules/declarations/domain/evidence-policy.ts` (+ test) | Evidence rules |
| `modules/declarations/domain/survey-*.ts` | Package, display, draft title, form key |
| `modules/declarations/schemas/{client,surveys,declarations,questions,common}.ts` | Zod |
| `modules/declarations/question-models.ts`, `question-answer-validation.ts` (+ test) | Question types |
| `modules/declarations/client-onboarding.ts` (+ server + tests) | Onboarding model |
| `modules/declarations/client-dashboard-metrics.ts` | Deadline metrics |
| `modules/declarations/client-access-message.ts` (+ test) | Access message builder |
| `modules/declarations/countries.ts` | Country lists |
| `modules/declarations/cdp-ai-prompt.ts` | CDP prompt text |
| `modules/declarations/server-actions/*` | FormData / evidence form helpers |

Product copy lives under **Platform** (`modules/platform/copy/*`), not Declarations.

---

## 4. Trade → `modules/fft/` (**relocated**)

| Path | Role |
|------|------|
| `modules/fft/domain/**` | Events, orders, RBAC, deposit, pickup, import, ERP, notify |
| `modules/fft/schemas/fft-schemas.ts` | Trade Zod |
| `modules/fft/auth/fft-session.ts` (+ test) | Trade access gates |
| `modules/fft/auth/fft-phase2b.ts`, `fft-phase2d.ts` | Phase flag helpers |
| `modules/fft/i18n/*` | Trade i18n |

`lib/` is **gone** (do not recreate). Domain/schemas live under `modules/`.

---

## 5. FE runners (`features/`)

| Path | Role |
|------|------|
| `features/playground/**` | Local harness UI + registry + page runners (absorbed from `lib/playground` + `lib/pages/playground`) |
| `features/organization-admin/organization-admin-*` | Operator page runners (absorbed from `lib/pages`) |
| `features/auth/public-link-page*` | Public-link runner (absorbed) |
| `features/auth/entry/**` | Login / invite / secure-link entry (absorbed from `lib/entry`) |

### Pass 2 + absorb relocates (2026-07-12) — done

| Former | Now |
|--------|-----|
| `lib/utils.ts`, `lib/format.ts` | Deleted → `@/modules/platform/utils` / `format` |
| `lib/auth/auth-page-trust*`, `auth-form-intro-visibility*` | `features/auth/*` |
| `lib/copy/auth-shell-copy.ts` | `features/auth/auth-shell-copy.ts` |
| `lib/copy/portal-brand*`, `portal-theme.ts` | `features/portal-chrome/*` |
| `lib/copy/portal-copy.ts`, `portal-name.ts` | Deleted — SSOT `modules/platform/copy/*` |
| `modules/declarations/copy/*` | Moved → `modules/platform/copy/*` |
| `lib/organization-admin-shell-members.ts` | `modules/identity/organization-admin-shell-members.ts` |
| `lib/entry/**` | `features/auth/entry/**` |
| `lib/pages/organization-admin-*` | `features/organization-admin/` |
| `lib/pages/public-link-page*` | `features/auth/public-link-page*` |
| `lib/pages/playground/**`, `lib/playground/**` | `features/playground/` |
| `lib/` (empty) | Removed |

---

## Relocate history (done)

1. Platform → 2. Identity → 3. Declarations → 4. Trade (`modules/fft`) — **complete 2026-07-11**.  
2. Empty `lib/domain|schemas|env|routing` deleted.  
3. **Pass 2 residue** — auth/copy/shims/shell-members — **complete 2026-07-12**.  
4. **Full runner absorb** (entry, org-admin pages, playground) — **complete 2026-07-12** ([residue-inventory](../../.cursor/skills/portal-backend-modules/residue-inventory.md)).

---

## Related

- [02-folder-map.md](02-folder-map.md)  
- [03-bounded-contexts.md](03-bounded-contexts.md)  
- [04-ports-and-adapters.md](04-ports-and-adapters.md)  
- [05-nextjs-adapter-map.md](05-nextjs-adapter-map.md)  
- [adr/001-modular-monolith-hexagonal.md](adr/001-modular-monolith-hexagonal.md)  
