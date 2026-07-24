# Testing factory

**Runner/config SSOT** for Vitest / Playwright matrices, gate commands, and e2e helpers. Shared test **utility implementation** SSOT is [`@afenda/testing`](../packages/foundation/testing/README.md) (`packages/foundation/testing`) — import `@afenda/testing/*` from product tests; do not import repo-root `testing/` paths for shared utilities.

Product packages do **not** own the factory — especially [`@afenda/config`](../packages/foundation/config) (Biome + TypeScript bases only; no Vitest scripts or test helpers).

| Layer | Runner | Place tests | Gate |
|-------|--------|-------------|------|
| L0 | Vitest `node` | `<pkg\|app>/__tests__/**/*.test.ts` | `pnpm test:unit` or `pnpm --filter @afenda/<pkg> test` |
| L2 | Vitest `jsdom` | `packages/surfaces/ui-system/__tests__/**/*.interaction.test.tsx` | `pnpm test:interaction` |
| L4 | Playwright `@smoke` / `@journey` | `e2e/**` | `pnpm test:e2e:smoke` · `pnpm test:e2e:journey` |

**Convention:** every Vitest file lives in the workspace member’s root `__tests__/` folder. Do **not** co-locate `*.test.ts` under `src/` or feature trees.

Reject Cypress and Jest as new runners. Prefer the **lowest** layer that captures the claim.

## HR inner loop vs outer loop

`@afenda/human-resources` is the fastest-growing verify surface. Use scoped commands during edits; reserve full monorepo turbo for CI / pre-push.

| Loop | When | Commands |
|------|------|----------|
| **Inner** | After every HR/time edit | `pnpm check:hr` (= `lint:hr` + `typecheck:hr` + `test:hr:unit`) — parallel memory only, no Neon |
| **Monorepo inner** | Cross-package edits without Neon | `pnpm test:unit:fast` (all Vitest projects except `human-resources-parity`) |
| **Outer** | Before merge / CI parity | `REQUIRE_DATABASE_TESTS=1 pnpm test:hr:parity` with `DATABASE_URL` (env or local `.env.local`; serial Neon) |
| **Monorepo full** | Release / local full matrix | `pnpm test:unit` (includes HR parity when env gates fire) · `pnpm test` · `pnpm lint` · `pnpm typecheck` |

Root scripts (see root `package.json`):

| Script | Runs |
|--------|------|
| `pnpm test:hr:unit` | Vitest `human-resources-unit` — memory/unit tests **in parallel** (excludes `*.parity.test.ts` and Neon concurrency suites) |
| `pnpm test:hr:parity` | Vitest `human-resources-parity` — Drizzle/memory parity + Neon concurrency (**serial**, **verbose** reporter, 30s test / 90s hook timeout; setup resolves `DATABASE_URL`) |
| `pnpm test:hr` | Both HR vitest projects |
| `pnpm lint:hr` / `pnpm typecheck:hr` | Single-package Biome + `tsc` |
| `pnpm exec biome check --write <path>` | Touch-only lint/format |
| `pnpm exec vitest run --config testing/vitest.config.ts --project human-resources-unit -- <one.test.ts>` | Single spec |

**DATABASE_URL resolution (I5.5 / Slice 1.4):** parity suites call [`resolveDatabaseUrlForTests`](../packages/foundation/testing/src/require-database-for-ci.ts) via `packages/erp/human-resources/__tests__/helpers/database-gate.ts` (`runDrizzleParity`) and Vitest setup `testing/setup-hr-parity-database.ts`. Local: env injection or `.env.local`. CI: injected Actions secret only. Drizzle describes run only when URL is present **and** `CI` / `REQUIRE_DATABASE_TESTS=1` is set — so the unit inner loop never hits Neon from `.env.local` alone. Under that flag with missing URL, resolution **throws** (skip ≠ PASS).

```bash
# Inner (no Neon)
pnpm test:hr:unit

# Outer (fail-closed Neon parity) — bash
REQUIRE_DATABASE_TESTS=1 pnpm test:hr:parity

# Outer — PowerShell
$env:REQUIRE_DATABASE_TESTS = "1"; pnpm test:hr:parity
```

**Baseline timings (Windows dev, 2026-07-24):** `pnpm --filter @afenda/human-resources typecheck` ≈ **5.2s**; `pnpm check:hr` ≈ **39s** (lint + typecheck + 400 unit tests in parallel). Re-measure after adapter splits with `Measure-Command { pnpm check:hr }`.

Time parity is sharded under `packages/erp/human-resources/__tests__/human-resources.time.*.parity.test.ts` (calendar, policy, attendance, timesheet, scheduling, exceptions) so a domain edit can target one file.

Adapter megafile roadmap: [`docs-V2/_scratch/erp/hr-time-adapter-split-roadmap.md`](../docs-V2/_scratch/erp/hr-time-adapter-split-roadmap.md).

### HR Neon cleanup contract (Slice 1.5)

Every Neon-writing HR suite (`*.parity.test.ts`, leave concurrency, failure injection, tenant FK parity) must:

1. `createNeonOrgTracker()` from [`packages/erp/human-resources/__tests__/helpers/neon-cleanup.ts`](../packages/erp/human-resources/__tests__/helpers/neon-cleanup.ts)
2. Register **every** synthetic `organizationId` via `trackOrg()` (including harness-minted ids — pass `trackOrg` into `createTestHarness` for leave suites)
3. `afterAll` → `await tracker.cleanup()` (Drizzle-only suites: guard with `if (adapter === "drizzle")`)

**Forbidden:** ad-hoc partial table deletes for synthetic `org-*` fixtures — use `cleanupHumanResourcesNeonOrgs` via the tracker only.

**Timeouts (`human-resources-parity` project):** `testTimeout: 30_000` (cold import + multi-round-trip workflows); `hookTimeout: 90_000` (org wipe is many sequential deletes across 106+ HR tables). `fileParallelism: false` avoids timeout-aborted writers racing `afterAll` on the shared Neon branch. Do not add per-file timeout overrides; back-to-back `pnpm test:hr:parity` must not accumulate hook timeouts.

**Progress / duration (Windows dev, `REQUIRE_DATABASE_TESTS=1`, 2026-07-24):**

| Phase | Typical duration | Terminal output |
|-------|------------------|-----------------|
| Import (27 files) | ~40s | `RUN v4.x` then per-file lines begin |
| Neon tests + cleanup | ~4–5 min | `verbose` reporter: one line per test (`✓ \|human-resources-parity\| …`) |
| Full `pnpm test:hr:parity` | **~280s** | `Test Files 27 passed` summary |
| Concurrency only (`leave-concurrency` + `time-policy-concurrency`) | **~37s** | 10 tests |

If you see only `RUN v4.x` for **>3 min** with **zero** `✓` lines and Node CPU at 0%, stop — likely DB/network stall. Hook cleanup that exceeds 90s fails with `Hook timed out in 90000ms` (not a silent hang).

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
| Quality DB suites | `quality` injects `DATABASE_URL` + `REQUIRE_DATABASE_TESTS=1`; [`@afenda/testing/require-database-for-ci`](../packages/foundation/testing/src/require-database-for-ci.ts) throws when CI lacks DB (skip is not PASS) |
| Secrets audit | Ops name-list: `pnpm audit:github-actions-secrets`. In-CI: job `secrets-presence` probes non-empty injection (`node scripts/ci-secrets-presence.mjs`) — not `gh secret list` |
| Branch protection | `pnpm protect:main` verifies Living contract (required check `quality`); apply with `pnpm protect:main -- --apply` |
| Owner | Platform |

## Imports

| Need | Import |
|------|--------|
| SUT from package tests | `from "../src/..."` (or app-relative from `apps/web/__tests__`) |
| DB suite CI fail-closed | `import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci"` (workspace package export) |
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
pnpm test:unit:fast         # inner monorepo loop — excludes human-resources-parity (no Neon)
pnpm test:unit              # full Vitest matrix (includes HR parity when DATABASE_URL + CI/REQUIRE flag)
pnpm test:interaction       # jsdom interaction project only
pnpm --filter @afenda/auth test
pnpm exec turbo run lint typecheck test   # CI turbo (HR package test = unit only)
pnpm test:hr:parity         # CI outer loop — serial Neon parity (also runs in quality job)

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
