# `lib/` inventory by owner

**Authority:** [doc/backend/06-lib-ownership.md](../../../doc/backend/06-lib-ownership.md)  
Snapshot ~287 files. Prefer the doc for narrative; this file mirrors path tables for agents.

## Platform → `modules/platform/` (relocated)

- `modules/platform/api/*`
- `modules/platform/schemas/api-error.ts`
- `modules/platform/env/*`
- `modules/platform/db.ts`, `db-config.ts` (+ test)
- `modules/platform/observability.ts`
- `modules/platform/audit.ts`
- `modules/platform/app-url.ts`
- `modules/platform/utils.ts`, `format.ts`, `breakpoints.ts` (+ test)
- `modules/platform/form-constraints.ts`
- `modules/platform/clipboard.ts`
- `modules/platform/pagination-range.ts` (+ test)
- `modules/platform/governance/*`
- `modules/platform/actions.barrel.test.ts`, `supabase-retirement.test.ts`
- Shims only: `lib/utils.ts`, `lib/format.ts` → re-export platform

## Identity → `modules/identity/` (relocated)

- `modules/identity/auth/*` (Neon Auth, session, admin, oauth, manifests)
- `modules/identity/email/*`
- `modules/identity/domain/{neon-auth-users,invite,tokens}.ts`
- `modules/identity/schemas/auth.ts`
- `modules/identity/account-session.ts`, `client-session.ts`
- `modules/identity/auth-metadata.ts`
- `modules/identity/preview-client.ts` (+ test)
- `modules/identity/portal-member.ts`, `portal-member-types.ts` (+ test)
- `modules/identity/portal-organization.ts`
- `modules/identity/admin.ts`, `production-fixtures.ts`
- `modules/identity/client-invitation-join-auth.ts` (+ test)
- `modules/identity/delete-client-auth-user.ts`

## Declarations → `modules/declarations/` (relocated)

- `modules/declarations/domain/*` (clients, surveys, questions, drafts, evidence, submission, share links, …)
- `modules/declarations/schemas/{client,common,declarations,questions,surveys}.ts` (+ schemas.test)
- `modules/declarations/server-actions/*`
- `modules/declarations/question-models.ts`, `question-answer-validation.ts` (+ test)
- `modules/declarations/client-onboarding.ts` (+ server + tests)
- `modules/declarations/client-dashboard-metrics.ts`
- `modules/declarations/client-access-message.ts` (+ test)
- `modules/declarations/countries.ts`, `cdp-ai-prompt.ts`
- `modules/declarations/copy/{portal-copy,portal-name}.ts`

## Trade → `modules/trade/` (relocated)

- `modules/trade/domain/**`
- `modules/trade/schemas/trade.ts`
- `modules/trade/auth/trade-session.ts` (+ test), `trade-phase2b.ts`, `trade-phase2d.ts`
- `modules/trade/i18n/trade.ts`

## FE-retire — removed 2026-07-11

Deleted. Do not recreate under `lib/`.

**Surviving adapters (not FE-retire):**

- `modules/platform/routing/*`
- `modules/declarations/copy/{portal-copy,portal-name}.ts`
- `modules/platform/playground-embed.ts`
- Shims: `lib/utils.ts`, `lib/format.ts`
