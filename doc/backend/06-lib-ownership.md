# `lib/` ownership map

**Status:** Context relocate complete (2026-07-11) — Platform, Identity, Declarations, Trade under `modules/`. Remaining `lib/` is FE-retire + shims.  
**Count:** re-scan `lib/` before pruning FE-retire.

`lib/` is a **transitional bin**, not the target Next.js layout. Fat catch-all `lib/` is a common accident; the target is **bounded-context modules**.

**Agent skill:** [`.cursor/skills/portal-lib-ownership/`](../../.cursor/skills/portal-lib-ownership/SKILL.md)  
**Contexts:** [02-bounded-contexts.md](02-bounded-contexts.md)  
**Ports:** [03-ports-and-adapters.md](03-ports-and-adapters.md)  
**API contract:** [../api/](../api/) · skill `/portal-api-contract`  
**FE scaffold:** `/portal-frontend-scaffold` (do not grow `lib/pages` for greenfield UI)

---

## Target layout

```text
modules/
  platform/       # health, env, db, observability, api-error, governance
  identity/       # auth, session, invites, account, email
  declarations/   # surveys, clients, assignments, drafts, evidence
  trade/          # hot sales domain + trade schemas/session/i18n
```

Adapters stay thin and **outside** modules:

- `app/actions/*` — Server Actions  
- `app/api/*` — Route Handlers (api-now only)  
- `app/**/page.tsx` — compose features; call module ports when wired  

Delete empty `lib/` drawers as they empty. **Do not big-bang relocate** — move one context when wiring that surface.

---

## Hard rules

1. **Trade ↛ Declarations** (and reverse). Compose at the adapter only.  
2. New file → pick **exactly one** context. No “utils” orphans at `lib/` root.  
3. Ports never import `Request`, `next/headers`, or UI.  
4. Zod lives with the owning context (`schemas/`); validate at adapter edge.  
5. Do not grow `lib/pages`, `lib/entry`, `lib/playground`, or Guardian/`copy` atmosphere for greenfield FE — UI → `features/*`.  
6. Relocate **after** FE scaffold / when touching that context — not mixed into Hot Sales flag work.

---

## 1. Platform → `modules/platform/` (**relocated 2026-07-11**)

Live code now under `modules/platform/`. Transitional shims: `lib/utils.ts`, `lib/format.ts` re-export only.

| Path (new) | Role |
|------|------|
| `modules/platform/api/*` | Route adapter helpers (health, draft runner, json-response, routes) |
| `modules/platform/schemas/api-error.ts` | Shared `APIErrorBody` / codes |
| `modules/platform/env/*` | Typed env manifest + accessors |
| `modules/platform/db.ts`, `db-config.ts` (+ test) | Pool / connection config |
| `modules/platform/observability.ts` | Logged action wrapper |
| `modules/platform/audit.ts` | Audit events |
| `modules/platform/app-url.ts` | Canonical app URL |
| `modules/platform/utils.ts`, `format.ts`, `breakpoints.ts` (+ test) | Shared primitives |
| `modules/platform/form-constraints.ts` | Shared field limits |
| `modules/platform/clipboard.ts` | Clipboard helper |
| `modules/platform/pagination-range.ts` (+ test) | Pagination math |
| `modules/platform/governance/*` | Reliance graph, route coverage, studio kit |

---

## 2. Identity → `modules/identity/` (**relocated 2026-07-11**)

Live code under `modules/identity/`. Guardian/auth-page FE leftovers under `lib/auth/` were deleted with FE-retire.

| Path (new) | Role |
|------|------|
| `modules/identity/auth/*` | Neon Auth, session, admin, oauth, manifests |
| `modules/identity/account-session.ts` | Account session gate |
| `modules/identity/client-session.ts` | Client session helper |
| `modules/identity/domain/neon-auth-users.ts` | Auth user lookup |
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

---

## 3. Declarations → `modules/declarations/` (**relocated 2026-07-11**)

Live code under `modules/declarations/`. Trade stays in `lib/domain/trade/**` and `lib/schemas/trade.ts`.

| Path (new) | Role |
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

---

## 4. Trade → `modules/trade/` (**relocated 2026-07-11**)

Live code under `modules/trade/`. `lib/domain`, `lib/schemas`, and `lib/i18n` drawers removed (empty after move). `lib/auth/` keeps FE-retire only.

| Path (new) | Role |
|------|------|
| `modules/trade/domain/**` | Events, orders, RBAC, deposit, pickup, import, ERP, notify |
| `modules/trade/schemas/trade.ts` | Trade Zod |
| `modules/trade/auth/trade-session.ts` (+ test) | Trade access gates |
| `modules/trade/auth/trade-phase2b.ts`, `trade-phase2d.ts` | Phase flag helpers |
| `modules/trade/i18n/trade.ts` | Trade i18n |

---

## 5. FE-retire baseline and reopened adapters

The 2026-07-11 wipe removed the old generic FE tree. Reopened phases now keep
bounded adapters instead of restoring the deleted component architecture:

| Path | Role |
|------|------|
| `lib/pages/playground/**` | Thin server page runners for the local-only harness |
| `lib/playground/**` | Playground registry, review contracts, fixtures, and pure policies |
| `features/playground/**` | Playground UI; product UI does not depend on it |
| `modules/platform/routing/*` | Portal route hrefs, public-link landing, surface registry |
| `modules/declarations/copy/portal-copy.ts`, `portal-name.ts` | Shared product copy used by actions/domain |
| `modules/platform/playground-embed.ts` | Embed header helpers for session/preview |
| `lib/utils.ts`, `lib/format.ts` | Transitional shims → platform |

Do not recreate the deleted root `components/` tree. Playground UI stays in
`features/playground` or its named `components-V2` AdminCN views.

---

## 6. Root oddballs

| Path | Disposition |
|------|-------------|
| `lib/actions.barrel.test.ts` | Keep near `app/actions` tests / platform |
| `lib/supabase-retirement.test.ts` | Platform guard — keep |

---

## Relocate order (recommended)

1. **Platform** — smallest; already contracted (`api-error`, health helpers).  
2. **Identity** — auth/session before client wire.  
3. **Declarations** — when client/operator UI wires.  
4. **Trade** — last; gated; never mix with Declarations move.  
5. Delete empty `lib/` trees; update imports + governance snapshots.

Each move: one context, one PR, update this doc’s “Code today” pointers in [02-bounded-contexts.md](02-bounded-contexts.md).

---

## Related

- [02-bounded-contexts.md](02-bounded-contexts.md)  
- [03-ports-and-adapters.md](03-ports-and-adapters.md)  
- [04-nextjs-adapter-map.md](04-nextjs-adapter-map.md)  
- [adr/001-modular-monolith-hexagonal.md](adr/001-modular-monolith-hexagonal.md)  
