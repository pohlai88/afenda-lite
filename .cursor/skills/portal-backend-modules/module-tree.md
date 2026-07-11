# Module tree (exact)

**Authority:** [doc/backend/02-folder-map.md](../../../doc/backend/02-folder-map.md) · [doc/backend/06-modules-ownership.md](../../../doc/backend/06-modules-ownership.md)

Disk SSOT (verify before editing this file):

```text
modules/
  platform/
  identity/
  declarations/
  fft/
```

**Forbidden folder:** `modules/trade/` — Trade product lives under `modules/fft/`.

---

## Platform — `modules/platform/`

| Area | Paths |
|------|-------|
| API helpers | `api/*` (health, draft route logic, json-response) |
| Env | `env/*` |
| Schemas | `schemas/api-error.ts`, `schemas/common.ts` (**shared** Zod primitives + `parseSchema`) |
| Email | `normalize-email.ts` |
| DB | `db.ts`, `db-config.ts` |
| Routing | `routing/*` |
| Shell | `shell/*` (`resolveShellAccess`) |
| Governance | `governance/*` |
| Shared | `utils.ts`, `format.ts`, `breakpoints.ts`, `pagination-range.ts`, `form-constraints.ts`, `evidence-acceptance.ts`, `clipboard.ts`, `app-url.ts`, `audit.ts`, `observability.ts`, `playground-embed.ts` |
| Copy | `copy/{portal-copy,portal-name}.ts` (product copy SSOT) |

---

## Identity — `modules/identity/`

| Area | Paths |
|------|-------|
| Neon Auth | `auth/*` |
| Schemas | `schemas/auth.ts`, `schemas/users.ts` (`UserId`, create/import/update/role/ban/bulk/password/`userIds`) |
| Domain | `domain/{neon-auth-users,organization-users,invite,tokens,client-profile,client-invitation-bootstrap}.ts` |
| Session | `account-session.ts`, `client-session.ts` |
| Email | `email/*` |
| Other | `preview-client.ts`, `portal-member*.ts`, `portal-organization.ts`, `admin.ts`, `production-fixtures.ts`, `client-invitation-join-auth.ts`, `delete-client-auth-user.ts`, `auth-metadata.ts`, `organization-admin-shell-members.ts` |

---

## Declarations — `modules/declarations/`

| Area | Paths |
|------|-------|
| Domain | `domain/**` (surveys, clients, drafts, evidence, submissions, share links, …) |
| Schemas | `schemas/common.ts` (re-exports Platform + `surveyAnswersSchema`), `{client,surveys,declarations,questions}.ts` |
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

UI companions (not this module tree, but path truth): `features/fft/fft-*.tsx`, `app/actions/fft.ts`, `app/fft/*`.

---

## Driving adapters (outside modules)

### Server Actions — `app/actions/`

| File | Primary context | Shared Zod import |
|------|-----------------|-------------------|
| `account.ts` | Identity | Platform common when needed |
| `admin.ts` | Identity / Platform | `@/modules/platform/schemas/common` |
| `client.ts` | Identity + Declarations (compose) | `@/modules/platform/schemas/common` |
| `declarations.ts` | Declarations | `@/modules/platform/schemas/common` |
| `surveys.ts` | Declarations | `@/modules/platform/schemas/common` |
| `fft.ts` | Trade (`modules/fft`) | via `fft-schemas` → Platform |

There is **no** `app/actions/trade.ts`.

### Route Handlers — `app/api/` (api-now only)

| Path | Context |
|------|---------|
| `health/liveness` | Platform |
| `health/readiness` | Platform |
| `auth/[...path]` | Identity |
| `client/declaration-draft` | Declarations (+ Platform route helper) |

See `/portal-api-contract` → `api-now.md` for the prohibition on scaffolding contract-only list handlers for web UI.

---

## Gone (do not recreate)

Entire `lib/` tree — including `lib/domain/`, `lib/schemas/`, `lib/env/`, `lib/routing/`, `lib/auth/`, `lib/copy/`, `lib/entry/`, `lib/pages/`, `lib/playground/`, `lib/utils.ts`, `lib/format.ts`.

Residue / runners: [residue-inventory.md](residue-inventory.md) — `lib/` gone; all runners under `features/`.
