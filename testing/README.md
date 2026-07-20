# Testing factory (SSOT)

Authority for Vitest / Playwright runners, helpers, and gate commands. Product packages do **not** own the factory — especially [`@afenda/config`](../packages/foundation/config) (Biome + TypeScript bases only; no Vitest scripts or test helpers).

| Layer | Runner | Place tests | Gate |
|-------|--------|-------------|------|
| L0 | Vitest `node` | `<pkg\|app>/__tests__/**/*.test.ts` | `pnpm test:unit` or `pnpm --filter @afenda/<pkg> test` |
| L2 | Vitest `jsdom` | `packages/surfaces/ui-system/__tests__/**/*.interaction.test.tsx` | `pnpm test:interaction` |
| L4 | Playwright `@smoke` / `@journey` | `e2e/**` | `pnpm test:e2e:smoke` · `pnpm test:e2e:journey` |

**Convention:** every Vitest file lives in the workspace member’s root `__tests__/` folder. Do **not** co-locate `*.test.ts` under `src/` or feature trees.

Reject Cypress and Jest as new runners. Prefer the **lowest** layer that captures the claim.

## I4 adverse / recovery matrix

Machine inventory: [`testing/e2e/adverse-matrix.ts`](e2e/adverse-matrix.ts). Cases at the **right layer** (unit and/or browser):

| ID | Case | Layers | Evidence |
|----|------|--------|----------|
| A1 | Anonymous → `/auth/login` | smoke | `e2e/smoke/anonymous-gate.spec.ts` |
| A2 | Wrong-role → `/403` | smoke | `e2e/smoke/wrong-role-gate.spec.ts` |
| A3 | Two-org denial | smoke | `e2e/smoke/two-org-denial.spec.ts` |
| A4 | Action permission denial → `FORBIDDEN` | unit | `n14-security-failure-verification.test.ts` |
| A5 | Invite → join accept | journey | `e2e/journey/invite-join.spec.ts` |

## I5.4 UX · a11y · i18n · perf criteria

Machine inventory: [`testing/ux-a11y-i18n-perf-matrix.ts`](ux-a11y-i18n-perf-matrix.ts). Disk honesty: `apps/web/__tests__/ux-a11y-i18n-perf-matrix.inventory.test.ts`.

| Pillar | Declared bar | Owner | Evidence posture |
|--------|--------------|-------|------------------|
| UX states | Segment loading/error · empty tables · pending/`aria-busy` · `/403` | Platform | PASS where ON DISK + inventory |
| a11y floor | `@afenda/ui-system` barrel + org-admin form aria + axe/skip-link matrix | Platform | PASS — `testing/a11y-assistive-matrix.ts` · `e2e/smoke/a11y-assistive-matrix.spec.ts` |
| i18n | English-only (`lang="en"`), locale-free routes | Platform | PASS for controlled scope; multi-locale = NOT APPLICABLE (ARCH-012) |
| FE perf | CWV lab budgets (Google “good”) with workload·env·percentile·owner | Platform | PASS — `testing/fe-cwv-budgets.ts` · `e2e/smoke/fe-cwv-budgets.spec.ts`; capacity → I6 N/A; Neon DB N4 = PERF02 (Scratch evidence `docs-V2/tenancy/**` while Living ARCH-023 dormant) |

**Out of bar for I5.4:** inventing alternate CWV numbers (use adopted Google “good” only) · `next-intl` / `messages/` install · AdminCN polish · multi-tenant load/capacity harness (I6) · GUIDE-017 READY.

## Standing CI E2E gate

| Fact | Detail |
|------|--------|
| Workflow | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) job `e2e-smoke` |
| When | `push` to `main` after `quality` (not PR forks) |
| Command | `pnpm test:e2e:smoke` with `E2E_REQUIRE_FACTORY=1` |
| Fail-closed | Missing `E2E_FACTORY_PASSWORD` (or hash-template `PREVIEW_CLIENT_PASSWORD`) → job **fails** with named owner **Platform** — never skip-as-PASS |
| Secrets | `DATABASE_URL` · `NEON_AUTH_*` · `APP_URL` · factory password (+ `PREVIEW_CLIENT_EMAIL` as hash-template email) |
| Owner | Platform |

Local authenticated runs still **skip** with a named reason when factory env is incomplete. CI standing gate must not.

## I5.5 merge / deploy gate honesty

| Fact | Detail |
|------|--------|
| Deploy order | [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) runs via `workflow_run` after workflow **CI** succeeds on `main` (not parallel `push`) |
| Human override | `workflow_dispatch` on Deploy is named Platform override — not a silent skip |
| Quality DB suites | `quality` injects `DATABASE_URL` + `REQUIRE_DATABASE_TESTS=1`; [`testing/require-database-for-ci.ts`](require-database-for-ci.ts) throws when CI lacks DB (skip is not PASS) |
| Secrets audit | Ops name-list: `pnpm audit:github-actions-secrets`. In-CI: job `secrets-presence` probes non-empty injection (`node scripts/ci-secrets-presence.mjs`) — not `gh secret list` |
| Branch protection | `pnpm protect:main` verifies Living contract (required check `quality`); apply with `pnpm protect:main -- --apply` |
| Owner | Platform |

## Imports

| Need | Import |
|------|--------|
| SUT from package tests | `from "../src/..."` (or app-relative from `apps/web/__tests__`) |
| DB suite CI fail-closed | `import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci"` (Vitest alias) |
| L2 interaction | `@testing-library/react` + `@testing-library/user-event` directly in `*.interaction.test.tsx` |
| L4 specs | `import { test, expect } from "@/testing/e2e/playwright-base"` |
| L4 login flows | `from "@/testing/e2e/flows"` |
| L4 assertions | `from "@/testing/e2e/assertions"` |
| L4 worker tenancy | `workerTenant` fixture from playwright-base · helpers in `tenancy.ts` |

Path `@/testing/*` resolves from [`e2e/tsconfig.json`](../e2e/tsconfig.json).

## L4 authenticated factory (N13)

| Module | Role |
|--------|------|
| `testing/e2e/playwright-base.ts` | `test` / `expect` + worker-scoped `workerTenant` · `E2E_REQUIRE_FACTORY` fail-closed |
| `testing/e2e/tenancy.ts` | Unique orgs/users per worker · two-org denial · cleanup |
| `testing/e2e/flows.ts` | `signIn` / `loginAsOperator` / `loginAsClient` |
| `testing/e2e/assertions.ts` | Anonymous redirect · wrong-role `/403` · role homes |
| `testing/e2e/credentials.ts` | Explicit `E2E_*` overrides for one-off runs |
| `testing/e2e/adverse-matrix.ts` | I4 adverse/recovery case inventory (A1–A5) |
| `testing/ux-a11y-i18n-perf-matrix.ts` | I5.4 UX · a11y · i18n · perf criteria + owners |
| `testing/a11y-assistive-matrix.ts` | I5.4 A11Y03 axe + skip-link journey inventory |
| `testing/fe-cwv-budgets.ts` | I5.4 PERF01 adopted Google CWV lab budgets |
| `testing/e2e/neon-sql.ts` | Neon HTTP SQL for factory SQL |

**Env (local `.env.local` — never commit secrets):**

| Key | Purpose |
|-----|---------|
| `E2E_FACTORY_PASSWORD` | Explicit plaintext matching the hash-template account |
| `E2E_FACTORY_HASH_TEMPLATE_EMAIL` | Account whose credential hash is copied (default: `PREVIEW_CLIENT_EMAIL`) |
| `DATABASE_URL` | Neon pooler URL for provision/cleanup |
| `E2E_OPERATOR_*` / `E2E_CLIENT_*` | Optional one-off overrides (not factory SSOT) |

Authenticated Playwright specs use `workerTenant` first and explicit `E2E_*`
pairs only for one-off runs. `SHARED_ADMIN_*` and `PREVIEW_CLIENT_*` are local
autofill/seed accounts, never E2E login subjects. `PREVIEW_CLIENT_EMAIL` may
identify the credential hash template when `E2E_FACTORY_HASH_TEMPLATE_EMAIL`
is unset; the template account itself is not used to sign in.

When factory env is incomplete, authenticated `@smoke` / `@journey` cases **skip** with a named reason — they never fabricate an auth PASS. Anonymous `factory-boot` smoke stays always-green.

Factory identities use `*@afenda-lite.test` emails and `e2e-w{worker}-{runId}-*` org slugs; cleanup is mandatory after each worker.

## Commands (pnpm only)

```bash
pnpm test:unit              # all Vitest node projects (__tests__)
pnpm test:interaction       # jsdom interaction project only
pnpm --filter @afenda/auth test
pnpm exec turbo run lint typecheck test   # CI parity

pnpm test:e2e:smoke         # Playwright @smoke
pnpm test:e2e:journey       # Playwright @journey
pnpm test:e2e:adverse       # A1–A3 smoke subset
# Reuse a running app (skip spawning webServer):
#   $env:PLAYWRIGHT_REUSE_SERVER=1; pnpm test:e2e:smoke
```

## Ownership

| Path | Owns |
|------|------|
| `testing/vitest.config.ts` | Multi-project Vitest workspace (`__tests__` includes only) |
| `testing/e2e/*` | Playwright env · base · flows · tenancy factory · assertions |
| `e2e/**` | Playwright specs only (`@smoke` / `@journey`) |
| `<member>/__tests__/` | That member’s Vitest suite |
| `packages/foundation/config` | Shared Biome / tsconfig — **not** Vitest |

## Catalog note

Root catalog pins `vitest`, `@testing-library/*`, `jsdom`, etc. New shared versions go in [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) `catalog:` — packages keep `"catalog:"` / `workspace:*`.
