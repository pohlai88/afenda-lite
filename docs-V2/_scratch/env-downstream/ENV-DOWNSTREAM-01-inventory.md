# ENV-DOWNSTREAM-01 Inventory

| Field | Value |
|-------|-------|
| Status | ENV-C1 inventory complete · ENV-C2 first migration slice complete |
| Date | 2026-07-29 |
| Authority | Pasted ENV-DOWNSTREAM-01 brief · AGENTS.md · `@afenda/env` protected package |
| Protected env gate | PASS: `pnpm --filter @afenda/env protect:check` |
| Env package gates | PASS: `lint`, `typecheck`, `test` (67 tests) |

## Commands Run

```text
pnpm --filter @afenda/env protect:check
pnpm --filter @afenda/env lint
pnpm --filter @afenda/env typecheck
pnpm --filter @afenda/env test
git diff -- packages/foundation/env/.protected.sha256
rg -n "process\.env" apps packages scripts tooling --glob "*.ts" --glob "*.tsx" --glob "*.js" --glob "*.mjs" --glob "*.cjs"
rg -n "createEnv|dotenv|dotenv/config|loadEnvConfig|envsafe|envalid" apps packages scripts tooling
rg -n "DATABASE_URL|NEON_|UPSTASH_|APP_URL|CRON_SECRET|RESEND_API_KEY|AI_GATEWAY_API_KEY|SKIP_ENV_VALIDATION" apps packages scripts tooling
rg -n "process\.env" apps packages --glob "*.ts" --glob "*.tsx" --glob "*.js" --glob "*.mjs" --glob "*.cjs" --glob "!**/__tests__/**" --glob "!**/*.test.*" --glob "!**/storybook-static/**" --glob "!**/node_modules/**"
rg -n "process\.env" packages/runtime packages/control-plane packages/data-plane packages/intelligence packages/surfaces --glob "src/**/*.{ts,tsx,js,mjs,cjs}"
rg -n 'Boolean\(process\.env|Number\(process\.env|parseInt\(process\.env|process\.env\..*===.*true|process\.env\..*===.*"1"|z\.string\(\)\.url|z\.url\(\)' apps packages --glob "*.ts" --glob "*.tsx" --glob "!**/__tests__/**" --glob "!**/*.test.*" --glob "!**/storybook-static/**"
rg -n 'from ["'']@afenda/[^"'']+/src/|from ["'']\.\./\.\./.*packages/' apps packages --glob "*.ts" --glob "*.tsx"
Get-ChildItem -Force -Recurse -File -Filter ".env*" | Where-Object { $_.FullName -notmatch "\\node_modules\\|\\.git\\" }
git ls-files ".env*" ".vercel/.env*" "apps/**/.env*"
git check-ignore -v .env.local
```

Notes:

- The first three broad `rg` commands included a non-existent `tooling` path and exited non-zero after producing matches. The matches were still usable; reruns should omit `tooling` unless the path exists.
- `apps/storybook/storybook-static/**` is generated output and was excluded from classification.
- `_reference/**` env files are archived reference material, not living runtime configuration.

## Inventory

| Location | Key / Pattern | Consumer | Current Pattern | Classification | Action |
|----------|---------------|----------|-----------------|----------------|--------|
| `packages/foundation/env/src/web.ts` | product env keys | `@afenda/env` | `createEnv` + `process.env` runtimeEnv | Authority | Keep protected |
| `packages/foundation/env/src/docs.ts` | docs env keys | `@afenda/env/docs` | `createEnv` + `process.env` runtimeEnv | Authority | Keep protected |
| `packages/foundation/env/__tests__/env.test.ts` | many env keys | env tests | test-owned `process.env` mutation | Tests | Keep |
| `apps/docs/next.config.mjs` | `loadEnvConfig` | docs framework bootstrap | repo-root env load before Next config | Framework bootstrap | Keep documented |
| `apps/web/next.config.ts` | `NODE_ENV`, `loadEnvConfig` | web framework bootstrap | direct framework mode read | Framework bootstrap | Keep documented |
| `apps/storybook/playwright.visual.config.ts` | `CI` | visual test config | direct CI read | Framework/test bootstrap | Keep |
| `packages/foundation/testing/src/require-database-for-ci.ts` | `CI`, `REQUIRE_DATABASE_TESTS`, `DATABASE_URL` | test helper | test-owned env fixture/gate | Tests | Keep |
| `packages/data-plane/db/src/env.ts` | `DATABASE_URL` | `@afenda/db` | raw `process.env`, with comment: `db → @afenda/env` forbidden | Approved package exception | Keep; ensure documented in governance allowlist |
| `packages/data-plane/db/drizzle.config.ts` | `DATABASE_URL` | Drizzle bootstrap | direct read | Framework/tooling bootstrap | Keep |
| `packages/data-plane/db/scripts/**` | `DATABASE_URL`, migrate allow flags | DB operator tooling | direct reads and `.env.local` loader | Operator tooling | Keep; add exception comments where absent |
| `packages/erp/inventory/src/reconcile-cli.ts` | `DATABASE_URL` | inventory ops CLI | `.env.local` loader + raw read | Operator tooling | Keep; add exception comment if governance check requires |
| `scripts/**` | Neon, GitHub, OpenAPI, CI, production health keys | repository tooling | direct reads / `.env.local` helpers | Operator tooling | Keep; governance allowlist |
| `packages/runtime/rate-limit/src/resolve-store.ts` | `VERCEL_ENV` | `@afenda/rate-limit` | raw process env passed to `isProductionDeployment` | Product runtime P1 | Refactor first |
| `packages/runtime/rate-limit/src/check.ts` | `NODE_ENV`, `VERCEL_ENV` | `@afenda/rate-limit` | raw process env production inference | Product runtime P1 | Refactor first |
| `packages/runtime/cache/src/resolve.ts` | `VERCEL_ENV` | `@afenda/cache` | raw process env production inference | Product runtime P1 | Refactor after rate-limit |
| `packages/control-plane/auth/src/api-handler.ts` | `NODE_ENV`, `VERCEL_ENV` | `@afenda/auth` | raw process env production inference | Product runtime P1 | Refactor after rate-limit/cache |
| `apps/web/lib/local-dev-login.ts` | `NODE_ENV` default parameter | web local dev helper | direct default read | Product app local-only | Review in apps/web slice |
| `packages/erp/*/__tests__/**` | `CI`, `REQUIRE_DATABASE_TESTS`, parity toggles | ERP tests | test-owned env gates | Tests | Keep |
| `apps/web/__tests__/**` | mocked env keys | app tests | vi mocks / source assertions | Tests | Keep |

## Duplicate Schema / Loader Findings

| Finding | Evidence | Classification | Action |
|---------|----------|----------------|--------|
| `createEnv` only appears in `@afenda/env` source and docs/tests | `rg -n "createEnv|..."` | Pass | No competing product env schema found |
| `loadEnvConfig` appears in `apps/web/next.config.ts` and `apps/docs/next.config.mjs` | `rg -n "loadEnvConfig"` | Framework bootstrap | Keep |
| No deep `@afenda/*/src` imports found | precise deep-import scan exit 1 with no matches | Pass | No action |

## Environment File Inventory

Tracked living env template:

```text
.env.example
```

Local ignored env files present:

```text
.env.local
.env.local.vercel-backup
.env.vercel.check
.env.vercel.preview
.env.vercel.production
.vercel/.env.preview.local
.vercel/.env.production.local
apps/web/.env.local
```

Archived reference env files exist under `_reference/Viet-ERP/**`; treat as reference archive, not living configuration.

`.env.local` ignore evidence:

```text
.gitignore:58:.env*	.env.local
```

## First Executable Slice Recommendation

ENV-C2 should start with `@afenda/rate-limit` because it is a small direct consumer and currently owns two product-runtime raw mode reads:

```text
packages/runtime/rate-limit/src/resolve-store.ts
packages/runtime/rate-limit/src/check.ts
```

Target shape for the slice:

```text
composition/runtime policy is injected or resolved once
rate-limit backend receives production policy
no request-time raw process.env read remains in @afenda/rate-limit
production keeps fail-closed Upstash behavior
local/preview memory fallback remains explicit
```

Do not edit protected `@afenda/env` in ENV-C2 unless the slice proves an actual missing authority contract. Current evidence suggests the package can first accept injected policy/options and keep existing public defaults only as a compatibility seam while call sites migrate.

## ENV-C2 First Slice Result

Result: implemented a narrow protected env contract helper and migrated the smallest runtime consumers.

Changed authority:

```text
packages/foundation/env/src/web.ts
packages/foundation/env/src/index.ts
packages/foundation/env/__tests__/env.test.ts
packages/foundation/env/.protected.sha256
```

Reason for protected env reopen:

```text
Actual missing product environment contract.
Runtime packages needed the current process production-deployment decision, but
only `isProductionDeployment(ctx)` existed, forcing each consumer to pass raw
`process.env` context. New helper: `isProductionDeploymentNow()`.
```

Migrated consumers:

```text
packages/runtime/rate-limit/src/resolve-store.ts
packages/runtime/rate-limit/src/check.ts
packages/runtime/cache/src/resolve.ts
packages/control-plane/auth/src/api-handler.ts
```

Verification:

```text
rg -n "process\.env" packages/runtime/rate-limit/src packages/runtime/cache/src packages/control-plane/auth/src --glob "*.ts"
=> no matches

pnpm --filter @afenda/env lint
=> PASS

pnpm --filter @afenda/env typecheck
=> PASS

pnpm --filter @afenda/env test
=> PASS, 68 tests

pnpm --filter @afenda/rate-limit lint
=> PASS

pnpm --filter @afenda/rate-limit typecheck
=> PASS

pnpm --filter @afenda/rate-limit test
=> PASS, 7 tests

pnpm --filter @afenda/cache lint
=> PASS

pnpm --filter @afenda/cache typecheck
=> PASS

pnpm --filter @afenda/cache test
=> PASS, 18 tests

pnpm --filter @afenda/auth lint
=> PASS

pnpm --filter @afenda/auth typecheck
=> PASS

pnpm --filter @afenda/auth test
=> PASS, 147 tests

pnpm --filter @afenda/env protect:update
pnpm --filter @afenda/env protect:check
=> PASS, protection hash current
```

Dependency repair note:

```text
The local pnpm store was corrupted/mutated during validation. `pnpm install
--frozen-lockfile` repaired esbuild but left missing virtual-store entries.
`pnpm install --force` failed on a missing Drizzle store object. A temporary
repo-local store was used with `pnpm install --frozen-lockfile --store-dir
.pnpm-store-temp`, then `.pnpm-store-temp` was removed after validation.
```

Next recommended slice:

```text
ENV-C3: inspect @afenda/admin and @afenda/db exception documentation, then
decide whether repository governance (`check:env-consumers`) should land before
more migrations.
```

## Coverage

```text
Applicable controls:       15
Controls with checks:      6
Checks executed:           6
Checks passed:             5
Checks failed:             1 (broad scans included missing tooling path; usable reruns narrowed scope)
Controls without checks:   5
Unevaluated controls:      4
Coverage Status: Incomplete
```

Incomplete coverage is expected at ENV-C1. Consumer migrations and the future `check:env-consumers` gate are not complete yet.
