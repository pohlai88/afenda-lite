# Testing factory (SSOT)

Authority for Vitest / Playwright runners, helpers, and gate commands. Product packages do **not** own the factory — especially [`@afenda/config`](../packages/config) (Biome + TypeScript bases only; no Vitest scripts or test helpers).

| Layer | Runner | Place tests | Gate |
|-------|--------|-------------|------|
| L0 | Vitest `node` | `<pkg\|app>/__tests__/**/*.test.ts` | `pnpm test:unit` or `pnpm --filter @afenda/<pkg> test` |
| L2 | Vitest `jsdom` | `apps/web\|packages/ui/__tests__/**/*.interaction.test.tsx` | `pnpm test:interaction` |
| L4 | Playwright `@smoke` / `@journey` | `e2e/**` | `pnpm test:e2e:smoke` · `pnpm test:e2e:journey` |

**Convention:** every Vitest file lives in the workspace member’s root `__tests__/` folder. Do **not** co-locate `*.test.ts` under `src/` or feature trees.

Reject Cypress and Jest as new runners. Prefer the **lowest** layer that captures the claim.

## Imports

| Need | Import |
|------|--------|
| SUT from package tests | `from "../src/..."` (or app-relative from `apps/web/__tests__`) |
| L2 helpers | `from "../../../testing/react"` (from `packages/ui/__tests__`) |
| L4 specs | `import { test, expect } from "@/testing/e2e/playwright-base"` |

Path `@/testing/*` resolves from [`e2e/tsconfig.json`](../e2e/tsconfig.json).

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
| `testing/e2e/*` | Playwright env + base exports |
| `e2e/**` | Playwright specs only |
| `<member>/__tests__/` | That member’s Vitest suite |
| `packages/config` | Shared Biome / tsconfig — **not** Vitest |

## Catalog note

Root catalog pins `vitest`, `@testing-library/*`, `jsdom`, etc. New shared versions go in [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) `catalog:` — packages keep `"catalog:"` / `workspace:*`.
