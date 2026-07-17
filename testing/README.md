# Testing factory (SSOT)

Authority for Vitest / Playwright runners, helpers, and gate commands. Product packages do **not** own the factory — especially [`@afenda/config`](../packages/config) (Biome + TypeScript bases only; no Vitest scripts or test helpers).

| Layer | Runner | Place tests | Gate |
|-------|--------|-------------|------|
| L0 | Vitest `node` | `<pkg\|app>/__tests__/**/*.test.ts` | `pnpm test:unit` or `pnpm --filter @afenda/<pkg> test` |
| L2 | Vitest `jsdom` | `packages/ui-system/__tests__/**/*.interaction.test.tsx` | `pnpm test:interaction` |
| L4 | Playwright `@smoke` / `@journey` | `e2e/**` | `pnpm test:e2e:smoke` · `pnpm test:e2e:journey` |

**Convention:** every Vitest file lives in the workspace member’s root `__tests__/` folder. Do **not** co-locate `*.test.ts` under `src/` or feature trees.

Reject Cypress and Jest as new runners. Prefer the **lowest** layer that captures the claim.

## Imports

| Need | Import |
|------|--------|
| SUT from package tests | `from "../src/..."` (or app-relative from `apps/web/__tests__`) |
| L2 helpers | `from "../../../testing/react"` (from `packages/ui-system/__tests__`) |
| L4 specs | `import { test, expect } from "@/testing/e2e/playwright-base"` |
| L4 login flows | `from "@/testing/e2e/flows"` |
| L4 assertions | `from "@/testing/e2e/assertions"` |
| L4 worker tenancy | `workerTenant` fixture from playwright-base · helpers in `tenancy.ts` |

Path `@/testing/*` resolves from [`e2e/tsconfig.json`](../e2e/tsconfig.json).

## L4 authenticated factory (N13)

| Module | Role |
|--------|------|
| `testing/e2e/playwright-base.ts` | `test` / `expect` + worker-scoped `workerTenant` |
| `testing/e2e/tenancy.ts` | Unique orgs/users per worker · two-org denial · cleanup |
| `testing/e2e/flows.ts` | `signIn` / `loginAsOperator` / `loginAsClient` |
| `testing/e2e/assertions.ts` | Anonymous redirect · wrong-role `/403` · role homes |
| `testing/e2e/credentials.ts` | Explicit `E2E_*` overrides for one-off runs |
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
# Reuse a running app (skip spawning webServer):
#   $env:PLAYWRIGHT_REUSE_SERVER=1; pnpm test:e2e:smoke
```

## Ownership

| Path | Owns |
|------|------|
| `testing/vitest.config.ts` | Multi-project Vitest workspace (`__tests__` includes only) |
| `testing/react.tsx` | L2 `setupUser` / Testing Library helpers |
| `testing/e2e/*` | Playwright env · base · flows · tenancy factory · assertions |
| `e2e/**` | Playwright specs only (`@smoke` / `@journey`) |
| `<member>/__tests__/` | That member’s Vitest suite |
| `packages/config` | Shared Biome / tsconfig — **not** Vitest |

## Catalog note

Root catalog pins `vitest`, `@testing-library/*`, `jsdom`, etc. New shared versions go in [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) `catalog:` — packages keep `"catalog:"` / `workspace:*`.
