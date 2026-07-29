# ENV-DOWNSTREAM-01 Inventory

| Field | Value |
|-------|-------|
| Status | ENV-C1-C8 complete · env authority sealed · repo gates green |
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

## ENV-C3 Governance Slice Result

Result: repository env-consumer governance is integrated into package governance.

Added gate:

```text
pnpm check:env-consumers
pnpm test:env-consumers
```

Governance coverage:

```text
scripts/check-env-consumers.mjs
scripts/check-env-consumers.test.mjs
scripts/governance-packages.mjs
scripts/run-checks.mjs
```

Current validation:

```text
pnpm check:env-consumers
=> PASS, 2856 files scanned

pnpm test:env-consumers
=> PASS, 7 tests

pnpm --filter @afenda/env protect:check
=> PASS, protection hash current

pnpm --filter @afenda/ui-blocks lint
=> PASS

pnpm --filter @afenda/ui-blocks typecheck
=> PASS

pnpm validate:modules
=> PASS

pnpm governance:packages
=> PASS; validate:modules + check:env-consumers
```

Additional monorepo governance repair:

```text
packages/surfaces/ui-blocks
```

`@afenda/ui-blocks` was already tracked on disk but absent from the governed
package catalog, so `pnpm governance:packages` stopped before the env consumer
gate. The package is now registered in the catalog docs, validator expected
package list, and workspace edge register with its single approved dependency:

```text
@afenda/ui-blocks -> @afenda/ui-system
```

Next recommended slice:

```text
ENV-C4: continue direct-consumer review with @afenda/admin, then @afenda/db
exception documentation and migration guard evidence.
```

## ENV-C4 Admin and DB Slice Result

`@afenda/admin`:

```text
Runtime env access uses @afenda/env.
Raw env access appears only in tests through env mocks/fixtures.

pnpm --filter @afenda/admin lint
=> PASS

pnpm --filter @afenda/admin typecheck
=> PASS

pnpm --filter @afenda/admin test
=> PASS, 39 tests
```

`@afenda/db`:

```text
packages/data-plane/db/src/env.ts keeps the approved ARCH-024 exception:
db must not import @afenda/env, so it owns the narrow DATABASE_URL bootstrap
helper for product and migration classes.
```

Migration and production branch evidence:

```text
pnpm --filter @afenda/db lint
=> PASS

pnpm --filter @afenda/db typecheck
=> PASS

pnpm --filter @afenda/db test
=> PASS, 192 tests

pnpm validate:neon-env
=> PASS, 15 passed / 0 failed
=> PL-S9 production branch baseline-migrate posture PASS:
   production branch identity confirmed; baseline migration is prohibited on
   br-tiny-hill-ao82jp6f
```

No illegal `@afenda/db -> @afenda/env` dependency was introduced. The broader
mission requirement to use the env posture object remains satisfied by the
repository-level `validate:neon-env` gate, not by importing the env package into
the DB package.

Next recommended slice:

```text
ENV-C5: inspect @afenda/metrics route behavior and notifications/emails
delivery adapters for secret-safe failures and no production console fallback.
```

## ENV-C5 Metrics, Notifications, Emails, AI, and App Route Slice Result

Result: direct env-consuming routes use the typed product env contract, and
template/persistence packages do not read environment configuration.

Validated packages:

```text
@afenda/metrics
=> no env reads; Prometheus library only
=> pnpm --filter @afenda/metrics lint PASS
=> pnpm --filter @afenda/metrics typecheck PASS
=> pnpm --filter @afenda/metrics test PASS, 17 tests

@afenda/notifications
=> no env reads; in-app notification persistence only
=> pnpm --filter @afenda/notifications lint PASS
=> pnpm --filter @afenda/notifications typecheck PASS
=> pnpm --filter @afenda/notifications test PASS, 10 tests

@afenda/emails
=> no env reads; React Email templates only
=> pnpm --filter @afenda/emails lint PASS
=> pnpm --filter @afenda/emails typecheck PASS
=> pnpm --filter @afenda/emails test PASS, 2 tests

@afenda/ai-the-machine
=> no env reads; web composition root injects provider/model
=> pnpm --filter @afenda/ai-the-machine lint PASS
=> pnpm --filter @afenda/ai-the-machine typecheck PASS
=> pnpm --filter @afenda/ai-the-machine test PASS, 12 tests
```

Validated app route behavior:

```text
apps/web/app/api/metrics/route.ts
=> uses env.METRICS_SCRAPE_TOKEN
=> token absent returns 404
=> wrong/missing bearer returns 401
=> token compare uses SHA-256 digests + timingSafeEqual

apps/web/modules/platform/ai/create-web-machine.ts
=> uses env.AI_GATEWAY_API_KEY and env.AI_THE_MACHINE_MODEL
=> local without key fails closed before streaming
=> Vercel runtime can use default Gateway/OIDC path

apps/web/app/api/cron/hr-reliability/route.ts
=> uses env.CRON_SECRET and typed HR_RELIABILITY_* numbers
=> worker receives typed limits; no string parsing in route
```

Focused web validation:

```text
pnpm --filter @afenda/web exec vitest run --config ../../testing/vitest.unit.config.ts --project web api-metrics-route api-ai-chat-route hr-reliability-cron-route local-dev-login
=> PASS, 4 files / 16 tests
```

Refactor:

```text
apps/web/lib/local-dev-login.ts
```

The local dev login helper no longer defaults from raw `process.env.NODE_ENV`.
`@afenda/env` now exports `isDevelopmentRuntimeNow()`, keeping local-only
runtime detection inside the protected environment contract. The helper still
accepts an explicit boolean for tests.

Protection and governance:

```text
pnpm --filter @afenda/env lint
=> PASS

pnpm --filter @afenda/env typecheck
=> PASS

pnpm --filter @afenda/env test
=> PASS, 70 tests

pnpm --filter @afenda/env protect:update
pnpm --filter @afenda/env protect:check
=> PASS, protection hash current

pnpm check:env-consumers
=> PASS, 2856 files scanned

pnpm governance:packages
=> PASS
```

Remaining app raw env reads:

```text
apps/web/next.config.ts
```

Classification: framework bootstrap exception. The config runs before normal
runtime composition and reads `NODE_ENV` only for local source-map behavior.

Next recommended slice:

```text
ENV-C6: stale env file and .env.example parity audit. Classify local ignored
Vercel/env helper files, then remove or document only living exceptions.
```

## ENV-C6 Stale Env File Audit Result

Tracked living env files:

```text
git ls-files ".env*" "**/.env*" ".vercel/.env*"
=> .env.example
```

Local ignored env files observed:

```text
.env.local
.env.local.vercel-backup
.env.vercel.check
.env.vercel.preview
.env.vercel.production
apps/web/.env.local
```

Archived reference env files exist only under:

```text
_reference/Viet-ERP/**
```

Classification:

```text
.env.example                 committed template; living
.env.local                   approved local runtime; ignored
apps/web/.env.local          ignored local app file; not committed
.env.vercel.*                ignored operator/Vercel helper files; not committed
.env.local.vercel-backup     ignored local backup; not committed
_reference/Viet-ERP/**       archived reference material; not living runtime
```

Ignore evidence:

```text
git check-ignore -v .env.local apps/web/.env.local .vercel/.env.production.local .env.vercel.production
=> .env* covers .env.local and apps/web/.env.local
=> .env.vercel.* covers .env.vercel.production
=> .vercel covers .vercel/.env.production.local
```

No committed stale runtime env files were found, so no env file deletion was
performed. Ignored local files were not printed or removed because they can
contain credentials and are outside committed source truth.

Template parity evidence:

```text
pnpm --filter @afenda/env test
=> PASS, includes .env.example representation test
```

Next recommended slice:

```text
ENV-C7: run final duplicate-alias and createEnv scans, then decide whether
.env.example needs a stronger machine parity check beyond the current env test.
```

## ENV-C7 Repository Governance Tightening Result

Result: `check:env-consumers` now covers the remaining repository-level
environment controls instead of relying only on manual scans.

New machine checks:

```text
COMMITTED_ENV_FILE
=> only .env.example may be tracked; .env.local and other .env* files fail

DOCS_PRODUCT_ENV_IMPORT
=> apps/docs runtime must not import @afenda/env root; use @afenda/env/docs
```

Removed stale exception:

```text
apps/web/lib/local-dev-login.ts
```

That helper has been migrated to `isDevelopmentRuntimeNow()`, so the governance
allowlist no longer permits raw env reads there.

Alias and competing schema evidence:

```text
rg -n "POSTGRES_URL|POSTGRES_PRISMA_URL|NEON_DATABASE_URL|NEXTAUTH_URL|AUTH_URL|PUBLIC_APP_URL|REDIS_URL|UPSTASH_URL" apps packages scripts .env.example --glob "!**/node_modules/**"
=> matches only check-env-consumers implementation and tests

rg -n "createEnv" apps packages scripts --glob "!**/node_modules/**"
=> createEnv runtime use only in packages/foundation/env/src/{web,docs}.ts
```

Validation:

```text
pnpm test:env-consumers
=> PASS, 10 tests

pnpm check:env-consumers
=> PASS, 2856 files scanned

pnpm governance:packages
=> PASS

pnpm check:docs-app
=> PASS; generated docs stayed clean, lint-links 0 errors / 42 pages

pnpm --filter @afenda/env protect:check
=> PASS, protection hash current
```

Completed by:

```text
ENV-C8: final repository gates and completion audit.
```

## ENV-C8 Final Gate Result

Result: ENV-DOWNSTREAM-01 is sealed for this checkout. Runtime consumers use
`@afenda/env` or approved bootstrap/test exceptions, docs runtime is isolated to
`@afenda/env/docs`, and `@afenda/env` protection is current after intentional
changes.

Final validation:

```text
pnpm lint
=> PASS, 37/37 tasks

pnpm typecheck
=> PASS, 37/37 tasks

pnpm test
=> PASS, 35/35 tasks

pnpm check:env-consumers
=> PASS, 2861 files scanned

pnpm test:env-consumers
=> PASS, 10 tests

pnpm governance:packages
=> PASS, validate:modules + check:env-consumers

pnpm check:docs-app
=> PASS, lint-links 0 errors / 42 pages

pnpm validate:neon-env
=> PASS, 15 passed / 0 failed

pnpm --filter @afenda/env protect:update
=> PASS, updated packages/foundation/env/.protected.sha256

pnpm --filter @afenda/env protect:check
=> PASS, protection hash current
```

Additional repository hygiene surfaced during final `pnpm test`: packages with
Vitest scripts were relying on phantom dependency resolution. `vitest:
"catalog:"` is now explicit where package test scripts invoke Vitest, and the
corporate-administration package-boundary expectation was updated to keep that
manifest contract honest.

Coverage status: complete for ENV-DOWNSTREAM-01.
