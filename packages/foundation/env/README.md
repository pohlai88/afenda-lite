# `@afenda/env`

Rank-1 Platform typed environment contract for Afenda-Lite: T3 `createEnv` + Zod schemas for `@afenda/web` (`env`) and `@afenda/docs` (`docsEnv`), plus Neon product / performance / recovery posture helpers on dedicated pure entrypoints — **without** importing other `@afenda/*` packages.

Use this package whenever product or docs code needs config. Prefer `import { env } from "@afenda/env"` (web) or `import { docsEnv } from "@afenda/env/docs"` (docs site) — never raw `process.env` for app config. Local runtime file is **`.env.local` only** (gitignored); committed key template is root [`.env.example`](../../../.env.example). Maintainers run lint / typecheck / Vitest via the filter scripts below (Node `24.x`, pnpm `≥10.33.4` from the repo root `engines`).

## Consume

Workspace dependency — import by export path:

```ts
// Product / Platform packages / apps/web — runtime configuration
import { env, isProductionDeploymentNow } from "@afenda/env";

const databaseUrl = env.DATABASE_URL;
const appUrl = env.APP_URL;

// Official docs app only — does not load the web Neon schema
import { docsEnv } from "@afenda/env/docs";

const docsOrigin = docsEnv.DOCS_URL;

// Validation scripts, tests, operational tooling — no product env required
import { evaluateNeonProductEnv, isNeonPoolerDatabaseUrl } from "@afenda/env/contract";
import { evaluateConnectionPressure } from "@afenda/env/performance";
import { evaluateHistoryRetention } from "@afenda/env/recovery";
```

Product consumers use the root entrypoint. The official docs app uses only the
`/docs` entrypoint so it does not evaluate the product/Neon schema. Tooling that
needs only evaluators must use `/contract`, `/performance`, or `/recovery` —
importing the root would require the full product environment to be present.

**Local setup (how-to)**

```bash
cp .env.example .env.local   # fill DATABASE_URL, NEON_AUTH_*, APP_URL, …
pnpm validate:neon-env       # root — Neon Cloud ids vs .env.local
```

Do not restore compose / multi-file env SSOTs. Do not sync local-only keys (`PLAYGROUND_*`, `NEON_API_KEY`, Shadcn Studio keys) to Vercel production — see [AGENTS.md](../../../AGENTS.md) Environment.

## Maintain

```bash
pnpm --filter @afenda/env lint
pnpm --filter @afenda/env typecheck
pnpm --filter @afenda/env test
```

Requires root engines: **Node `24.x`**, **pnpm `≥10.33.4`**.

Registry home: `src/product-registry.ts` (product) · `src/docs-registry.ts` (docs). Add a variable to its registry and the committed `.env.example` key list without a secret value. Runtime projections derive from registry keys through `src/runtime-projection.ts`; do not recreate a second `process.env` map.

Intentional README or package changes require the local protection unlock. Run
the package gates first, then refresh and recheck the digest:

```bash
pnpm --filter @afenda/env protect:update
pnpm --filter @afenda/env protect:check
pnpm check:env-consumers
```

## Semantic ownership

| Decision | Canonical owner |
|----------|-----------------|
| Product key and Zod schema | `createProductEnvRegistry()` |
| Docs key and Zod schema | `createDocsEnvRegistry()` |
| Product deployment classification | `NEON_ENV_CLASSIFICATION` (compile-time exhaustive with the product registry) |
| Local-only key set | Derived from `NEON_ENV_CLASSIFICATION` |
| Runtime value projection | `projectRuntimeEnv()` over the selected registry |
| Cross-key production policy | Package-private refinements in `web.ts` / `docs.ts` |

Consumers receive typed `env` or `docsEnv` values and must not interpret deployment classifications, read aliases, or rebuild validation.

`assertLocalOnlyConfigAbsentInProduction` is the canonical local-only policy
assertion. Compatibility aliases are not part of the public contract; callers
use the canonical capability directly.

## Exports

Entrypoints separate **runtime configuration** from **pure evaluators**:

> Runtime entrypoints may initialize configuration.
> Evaluator entrypoints must remain pure.

| Path | Initializes env? | Role |
|------|------------------|------|
| `@afenda/env` | **Yes** — validates at import, fails closed | `env` + `is*Now()` runtime predicates; does not export or evaluate `docsEnv` |
| `@afenda/env/docs` | Yes — docs schema only | `docsEnv` only — site origin + optional GitHub App feedback keys; avoids loading web Neon schema |
| `@afenda/env/contract` | No | Neon product-contract evaluators, deployment classification, approved Neon identity |
| `@afenda/env/performance` | No | Read-only Neon performance posture evaluators |
| `@afenda/env/recovery` | No | Read-only Neon recovery posture evaluators |

Importing the root entrypoint initializes and validates the full product
schema. That side effect is intentional and confined there. Pure evaluators
live behind `/contract`, `/performance`, and `/recovery` so scripts, tests, and
operational tooling can use them without product variables being present —
enforced by [`__tests__/import-isolation.test.ts`](__tests__/import-isolation.test.ts),
which imports every entrypoint in a clean child process.

Never re-export an evaluator from the root barrel: it would make every consumer
of a pure helper pay for full product environment validation.

**Declared exception to "one root capability style".** [AGENTS.md](../../../AGENTS.md)
requires shared packages to expose one root entrypoint. This package is an
explicit, approved exception because the root cannot be both fail-closed at
import and safe for pure tooling to load. The exception is scoped to
`@afenda/env` and is **not** precedent for other packages — the `@afenda/errors`
cutover remains bound to its no-subpath contract.

All other files under `src/**` are implementation details. Do not deep-import
registries, runtime projections, or posture modules. This includes runtime
`pathToFileURL` imports into `src/**` from scripts: they bypass the exports map
and are invisible to static import checks.

**Canonical owners inside the package**

| Concept | Owner |
|---------|-------|
| Approved Neon org / project / branch | [`src/neon-identity.ts`](src/neon-identity.ts) — posture modules derive, never restate |
| "What environment is this?" | [`src/deployment-context.ts`](src/deployment-context.ts) — product and docs registries share one classifier |
| Layer · leaf role · entrypoint semantics | [`src/package-policy.json`](src/package-policy.json) — build-time governance, verified by `pnpm check:package-policy`; never exported |

**Enforcement.** These are checked facts, not prose:

| Claim | Gate |
|-------|------|
| Pure entrypoints stay importable with no environment | `__tests__/import-isolation.test.ts` (runtime) + `check:package-policy` (static) |
| Rank-1 leaf, no workspace runtime deps | `check:package-policy` |
| Entrypoints classified and present on disk | `check:package-policy` |
| No one resolves this package's internals by path | `check:package-internals` |
| Protected files changed deliberately | `protect:check` (CI-enforced; CI cannot refresh the digest) |

**Runtime deps:** `@t3-oss/env-nextjs` · `zod`. No workspace `@afenda/*` runtime deps (env leaf).

## Ownership

| Surface | Owner |
|---------|-------|
| Zod / T3 schemas · Neon contract asserts · posture evaluators | `@afenda/env` |
| Secret values in local / Vercel / CI | Operators — never commit secrets |
| When a new product key is required | Owning package + this schema + `.env.example` |

**Layer:** Rank-1 Platform **leaf** (no `@afenda/*` runtime deps). Must not import Surfaces, `apps/*`, or business packages.

## Out of scope

Do not add to this package: database clients, Neon Auth SDK calls, Next route handlers, UI, a second env SSOT (compose / `env.config`), a progressive-delivery flags SDK, plan/tier entitlement matrices (see entitlements DNA), or claims of multi-DB / project-per-tenant isolation (shared schema · organization-scoped rows only).

## Authority

| Topic | Link |
|-------|------|
| Package DAG / leaf rules | [LAYERS.md](../../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Neon tenancy ops ladder | [neon-tenancy-efficiency](../../../.cursor/skills/neon-tenancy-efficiency/SKILL.md) |
| Agent Environment section | [AGENTS.md](../../../AGENTS.md) |
