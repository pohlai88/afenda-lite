# Module tree (Target shape · logical inventory)

**Authority (operative IDs):** ARCH-005 folder map · ARCH-006 bounded contexts · ARCH-009 ownership · ARCH-022 system overview · ARCH-028 anti-contamination. Living bodies dormant — this companion + disk `apps/web/modules/**` are SSOT.

| Kind | Path | Status on this checkout |
|------|------|-------------------------|
| **Target physical home** | `apps/web/modules/{platform,identity}` | **Present** — living contexts only |
| **Logical Living shape** | `modules/{platform,identity}` | Shape vocabulary for ownership — **not** a claim that root `modules/` exists today |
| **Docs-first (Collapse)** | Root `modules/`, `app/`, `features/` | **Absent by design** — do not recover from git without named user approval this turn |
| **Removed (nuclear wipe)** | `modules/declarations`, `modules/fft` | **Gone** — do not recreate; footnotes only |

Verify before editing product code: `Test-Path apps/web/modules` / `Test-Path modules`. Prefer Target `apps/web/modules` when present; root Collapse trees stay banned.

**Forbidden folders:** `modules/trade/`, `modules/declarations/`, `modules/fft/` (and Target equivalents under `apps/web/`).

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
| Shared | `utils.ts`, `format.ts`, `breakpoints.ts`, `pagination-range.ts`, `form-constraints.ts`, `clipboard.ts`, `app-url.ts`, `audit.ts`, `observability.ts` |
| Copy | `copy/{portal-copy,portal-name}.ts` (product copy SSOT when tree exists) |

---

## Identity — `modules/identity/`

| Area | Paths |
|------|-------|
| Neon Auth | `auth/*` |
| Domain | `domain/{neon-auth-users,organization-users,invite,tokens,platform-rbac,platform-rbac-catalog,platform-rbac-access}.ts` |
| Schemas | `schemas/auth.ts`, `schemas/users.ts`, `schemas/platform-rbac.ts` |
| Session | `account-session.ts`, `client-session.ts` |
| Email | `email/*` |
| Other | `preview-client.ts`, `portal-member*.ts`, `portal-organization.ts`, `admin.ts`, `auth-metadata.ts`, `organization-admin-shell-members.ts` |

---

## Declarations — `modules/declarations/` *(removed)*

**Status:** Nuclear wipe — product module **gone**. Do not invent Living inventory rows. Historical paths (draft RH, surveys, share links) are footnotes only.

---

## Trade (Feed Farm Trade) — `modules/fft/` *(removed)*

**Status:** Nuclear wipe — product module **gone** (not frozen 2B–2D). Do not invent Living inventory rows. Skill `feed-farm-trade` deleted.

---

## Driving adapters (outside modules)

### Server Actions — logical `app/actions/` (Target `apps/web/app/actions/`)

| File | Primary context | Shared Zod import |
|------|-----------------|-------------------|
| `account.ts` | Identity | Platform common when needed |
| `admin.ts` | Identity / Platform | Platform `schemas/common` |
| Identity RBAC / invite Actions | Identity | Platform `schemas/common` |

**Removed Actions (do not recreate):** `declarations.ts`, `surveys.ts`, `fft.ts`, declaration-draft / submit-client-declaration adapters.

### Route Handlers — logical `app/api/` (api-now only)

| Path | Context |
|------|---------|
| `health/liveness` | Platform |
| `health/readiness` | Platform |
| `auth/[...path]` | Identity |
| `session/*` | Identity / `@afenda/auth` |

**Removed RH:** `client/declaration-draft` — not api-now.

See `/afenda-elite-api-contract` → `api-now.md`.

---

## Gone (do not recreate)

Entire Collapse `lib/` tree. Wiped Declarations + FFT product modules. Residue map: [residue-inventory.md](residue-inventory.md) — historical relocate inventory; not a claim those `features/` paths exist on this docs-first checkout.
