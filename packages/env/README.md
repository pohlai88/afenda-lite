# `@afenda/env`

Rank-1 Platform typed environment contract for Afenda-Lite: T3 `createEnv` + Zod schemas for `@afenda/web` (`env`) and `@afenda/docs` (`docsEnv`), plus Neon product / performance / recovery posture helpers — **without** importing other `@afenda/*` packages.

Use this package whenever product or docs code needs config. Prefer `import { env } from "@afenda/env"` (web) or `import { docsEnv } from "@afenda/env/docs"` (docs site) — never raw `process.env` for app config. Local runtime file is **`.env.local` only** (gitignored); committed key template is root [`.env.example`](../../.env.example). Maintainers run lint / typecheck / Vitest via the filter scripts below (Node `24.x`, pnpm `≥10.33.4` from the repo root `engines`).

## Consume

Workspace dependency — import by export path:

```ts
// Product / Platform packages / apps/web
import { env, isNeonPoolerDatabaseUrl, evaluateNeonProductEnv } from "@afenda/env";

const databaseUrl = env.DATABASE_URL;
const appUrl = env.APP_URL;

// Official docs app only — does not load the web Neon schema
import { docsEnv } from "@afenda/env/docs";

const docsOrigin = docsEnv.DOCS_URL;
```

**Living consumers:** `apps/web` · `@afenda/auth` · `@afenda/admin` · `@afenda/rate-limit` (`env`); `apps/docs` (`docsEnv` from `@afenda/env/docs`).

**Local setup (how-to)**

```bash
cp .env.example .env.local   # fill DATABASE_URL, NEON_AUTH_*, APP_URL, …
pnpm validate:neon-env       # root — Neon Cloud ids vs .env.local
```

Do not restore compose / multi-file env SSOTs. Do not sync local-only keys (`PLAYGROUND_*`, `NEON_API_KEY`, Shadcn Studio keys) to Vercel production — see [AGENTS.md](../../AGENTS.md) Environment.

## Maintain

```bash
pnpm --filter @afenda/env lint
pnpm --filter @afenda/env typecheck
pnpm --filter @afenda/env test
```

Requires root engines: **Node `24.x`**, **pnpm `≥10.33.4`**.

Schema home: `packages/env/src/web.ts` (product) · `packages/env/src/docs.ts` (docs). Add new product vars in `web.ts` (and `.env.example` keys without secrets).

## Exports

| Path | Role |
|------|------|
| `@afenda/env` | `env` (web T3 schema) + Neon contract / performance / recovery helpers + `docsEnv` re-export |
| `@afenda/env/docs` | `docsEnv` only — site origin + optional GitHub App feedback keys; avoids loading web Neon secrets |

**Runtime deps:** `@t3-oss/env-nextjs` · `zod`. No workspace `@afenda/*` runtime deps (env leaf).

## Ownership

| Surface | Owner |
|---------|-------|
| Zod / T3 schemas · Neon contract asserts · posture evaluators | `@afenda/env` |
| Secret values in local / Vercel / CI | Operators — never commit secrets |
| When a new product key is required | Owning package + this schema + `.env.example` |

**Layer:** Rank-1 Platform **leaf** (no `@afenda/*` runtime deps). Must not import Surfaces, `apps/*`, or business packages. See [docs-V2/monorepo](../../docs-V2/monorepo/README.md).

## Out of scope

Do not add to this package: database clients, Neon Auth SDK calls, Next route handlers, UI, a second env SSOT (compose / `env.config`), or claims of multi-DB / project-per-tenant isolation (shared schema · organization-scoped rows only).

## Authority

| Topic | Link |
|-------|------|
| Env import · `.env.local` · hard stops | [docs-V2/system](../../docs-V2/system/README.md) |
| Docs typed env (`docsEnv`) | [docs-V2/docs](../../docs-V2/docs/README.md) |
| Discipline pointer (`@afenda/env`) | [docs-V2/discipline](../../docs-V2/discipline/README.md) |
| Tenancy · pooler · shared schema | [docs-V2/tenancy](../../docs-V2/tenancy/README.md) |
| Package DAG / leaf rules | [docs-V2/monorepo](../../docs-V2/monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Neon tenancy ops ladder | [neon-tenancy-efficiency](../../.cursor/skills/neon-tenancy-efficiency/SKILL.md) |
| Agent Environment section | [AGENTS.md](../../AGENTS.md) |
