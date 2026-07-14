# Module tree (Target shape · logical inventory)

**Authority:** [ARCH-005](../../../docs/architecture/ARCH-005-backend-folder-map.md) · [ARCH-006](../../../docs/architecture/ARCH-006-bounded-contexts.md) · [ARCH-009](../../../docs/architecture/ARCH-009-modules-ownership-map.md) · [ARCH-022](../../../docs/architecture/ARCH-022-system-overview.md) · [ARCH-028](../../../docs/architecture/ARCH-028-implementation-slices.md)

| Kind | Path | Status on this checkout |
|------|------|-------------------------|
| **Target physical home** | `apps/web/modules/{platform,identity,declarations,fft}` | Implemented only after explicit ARCH-028 implement / scaffold |
| **Logical Living shape** | `modules/{platform,identity,declarations,fft}` (context L2 names) | Shape vocabulary for ownership — **not** a claim that root `modules/` exists today |
| **Docs-first (Collapse)** | Root `modules/`, `app/`, `features/` | **Absent by design** — do not recover from git (incl. `git show` seed) without named user approval this turn; do not treat companions below as current disk SSOT |

Verify before editing product code: `Test-Path apps/web/modules` / `Test-Path modules`. If both absent, stay docs-only.

**Forbidden folder:** `modules/trade/` or `apps/web/modules/trade/` — Trade product context id is `fft`.

Paths below use **logical** `modules/<context>/…` names. On Target, prefix with `apps/web/`. Adapters under logical `app/actions` / `app/api` map to Target `apps/web/app/…` when present.

---

## Platform — `modules/platform/` (logical → Target `apps/web/modules/platform/`)

| Area | Paths |
|------|-------|
| API helpers | `api/*` (health, json-response, readiness) — no product draft compose |
| Env | `env/*` (Target may move to `@afenda/env` per ARCH-027) |
| Schemas | `schemas/api-error.ts`, `schemas/common.ts` (**shared** Zod primitives + `parseSchema`) |
| Email | `normalize-email.ts` |
| DB | `db.ts`, `db-config.ts` (Target `@afenda/db` may absorb) |
| Routing | `routing/*` |
| Shell | `shell/*` (`ShellModuleId` / `ShellAccess` types only; resolve in portal-chrome features) |
| Governance | `governance/*` |
| Shared | `utils.ts`, `format.ts`, `breakpoints.ts`, `pagination-range.ts`, `form-constraints.ts`, `evidence-acceptance.ts`, `clipboard.ts`, `app-url.ts`, `audit.ts`, `observability.ts`, `playground-embed.ts` |
| Copy | `copy/{portal-copy,portal-name}.ts` (product copy SSOT when tree exists) |

---

## Identity — `modules/identity/`

| Area | Paths |
|------|-------|
| Neon Auth | `auth/*` |
| Domain | `domain/{neon-auth-users,organization-users,invite,tokens,client-profile,client-invitation-bootstrap,platform-rbac,platform-rbac-catalog,platform-rbac-access}.ts` |
| Schemas | `schemas/auth.ts`, `schemas/users.ts`, `schemas/platform-rbac.ts` |
| Session | `account-session.ts`, `client-session.ts` |
| Email | `email/*` |
| Other | `preview-client.ts`, `portal-member*.ts`, `portal-organization.ts`, `admin.ts`, `production-fixtures.ts`, `client-invitation-join-auth.ts`, `delete-client-auth-user.ts`, `auth-metadata.ts`, `organization-admin-shell-members.ts` |

---

## Declarations — `modules/declarations/`

| Area | Paths |
|------|-------|
| Domain | `domain/**` (surveys, clients, drafts, evidence, submissions, share links, …) |
| Schemas | `schemas/common.ts` (re-exports Platform + `surveyAnswersSchema`), `{client,surveys,declarations,questions}.ts` |
| API (draft) | `api/client-declaration-draft-route*` — owns draft Route Handler compose |
| Server helpers | `server-actions/*` |
| Other | `client-onboarding*`, `client-dashboard-metrics.ts`, `client-access-message.ts`, `question-*.ts`, `countries.ts`, `cdp-ai-prompt.ts` |

---

## Trade (Feed Farm Trade) — `modules/fft/`

| Area | Paths |
|------|-------|
| Domain | `domain/**` |
| Schemas | `schemas/fft-schemas.ts` (imports Platform common — **not** Declarations) |
| Auth / flags | `auth/fft-session.ts`, `auth/fft-phase2b.ts`, `auth/fft-phase2d.ts` |
| i18n | `i18n/*` |

UI companions (logical): `features/fft/fft-*.tsx`, `app/actions/fft.ts`, `app/fft/*` → Target under `apps/web/` when scaffolded.

---

## Driving adapters (outside modules)

### Server Actions — logical `app/actions/` (Target `apps/web/app/actions/`)

| File | Primary context | Shared Zod import |
|------|-----------------|-------------------|
| `account.ts` | Identity | Platform common when needed |
| `admin.ts` | Identity / Platform | Platform `schemas/common` |
| `client.ts` | Identity + Declarations (compose at adapter) | Platform `schemas/common` |
| `declarations.ts` | Declarations | Platform `schemas/common` |
| `surveys.ts` | Declarations | Platform `schemas/common` |
| `fft.ts` | Trade (`fft`) | via `fft-schemas` → Platform |

There is **no** `app/actions/trade.ts`.

### Route Handlers — logical `app/api/` (api-now only)

| Path | Context |
|------|---------|
| `health/liveness` | Platform |
| `health/readiness` | Platform |
| `auth/[...path]` | Identity |
| `client/declaration-draft` | Declarations `api/client-declaration-draft-route` |

See `/afenda-elite-api-contract` → `api-now.md` for the prohibition on scaffolding contract-only list handlers for web UI.

---

## Gone (do not recreate)

Entire Collapse `lib/` tree. Residue map: [residue-inventory.md](residue-inventory.md) — historical relocate inventory; not a claim those `features/` paths exist on this docs-first checkout.
