# ARCH-027 Environment Variable Model

| Field | Value |
|-------|-------|
| ID | ARCH-027 |
| Category | Architecture |
| Version | 1.3.0 |
| Status | Target |
| Control State | Closed |
| Owner | Platform |
| Updated | 2026-07-14 |

> **Forward-writing / Target.** Describes the intended Turborepo system. Authoritative for new work. Missing `apps/` or `packages/` on disk is expected until implementation.

> **STOP — Living ops until S4.1:** Follow `AGENTS.md` compose / `env:guard`. Do **not** create `.env.local`. Do **not** run `vercel env pull`. The `.env.local` + `vercel env pull` steps below are **post-S4.1 Target only**.

## Context

`apps/web` requires both server-only secrets and client-safe public variables. The environment model enforces the server/client split at the type-checker level, validates all variables at startup, and uses standard Next.js loading so Vercel's tooling works without custom scripts. This document includes the **`@t3-oss/env-nextjs` decision**.

## Env library decision

**Decision:** Use **`@t3-oss/env-nextjs`** in `packages/env/src/web.ts`. Zod schema declares every variable once. Exported `env` is the only way application code reads configuration. After S4.1 cutover: Next.js loads `.env.local` natively — no compose step, no guard script.

| Positive | Accepted cost |
|----------|---------------|
| Server/client split enforced by TypeScript | New var → update schema + `runtimeEnv` (same file) |
| Missing required var → startup Zod error | Validates at module load — no runtime hot-swap |
| `vercel env pull` → `.env.local` works **after S4.1** | Forbidden while Living compose is in force |
| One inventory file for all app env vars | |

| Alternative | Why rejected |
|-------------|--------------|
| Raw `process.env` | No validation; convention-only server/client split |
| `dotenv-cli` | Load step without Zod/types |
| Custom compose (`env.config` + `env.secret` → `.env`) | Living model until S4.1; retired at cutover (not a parallel Target path) |
| Manual Zod wrappers | Reinvents `@t3-oss/env-nextjs` without Next integration |

**Constraints that must not be broken:**

- Product code reads config only via `import { env } from '@afenda/env'` — no raw `process.env` for app config
- Server vars stay in the `server` block; client vars are `NEXT_PUBLIC_*` in the `client` block
- After S4.1: `.env.local` is the only local runtime env file; compose / `env:guard` are gone
- Before S4.1: Living `AGENTS.md` compose remains sole local env authority
- `PLAYGROUND_*` stay local-only and are never synced to Vercel

**Living vs Target:** Until slice S4.1 ships, the monolith still uses `env.config` / `env.secret` / `npm run env:compose` → `.env` and forbids `.env.local` (see `AGENTS.md`). That Living model is **retired by S4.1** — do not run both compose and t3-env in parallel.

## Responsibilities and boundaries

| Component | Responsibility |
|-----------|---------------|
| `packages/env/src/web.ts` | Single Zod schema declaring all variables, their types, and server/client placement |
| `.env.local` | **Post-S4.1 only.** The only env file loaded at runtime after cutover. Gitignored. Written by `vercel env pull` after compose retirement. |
| `vercel env pull` | **Post-S4.1 only.** Standard way to initialise local dev after compose is retired. Blocked while Living `AGENTS.md` compose is in force. |
| Vercel dashboard / CLI | Canonical store for production env values |

`packages/env` does **not** own: secrets storage (that is Vercel), secrets rotation, or application logic that uses env values.

## Components

### Schema structure

```typescript
// packages/env/src/web.ts
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    DATABASE_URL:        z.string().url(),
    NEON_AUTH_SECRET:    z.string().min(1),
    // ... other server-only vars
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    // ... NEXT_PUBLIC_* vars only
  },
  runtimeEnv: {
    DATABASE_URL:        process.env.DATABASE_URL,
    NEON_AUTH_SECRET:    process.env.NEON_AUTH_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
})
```

### Usage in app code

```typescript
// apps/web/modules/*/domain/*.ts  (server-only)
import { env } from '@afenda/env'

const url = env.DATABASE_URL    // ✓ — server block, safe to use here

// apps/web/features/*/client-component.tsx  (client component)
import { env } from '@afenda/env'

const url = env.NEXT_PUBLIC_APP_URL    // ✓ — client block
const db  = env.DATABASE_URL           // ✗ — TypeScript error: server var in client
```

### Variable categories

| Category | Env key prefix | Synced to Vercel | Example |
|----------|---------------|-----------------|---------|
| Database | `DATABASE_URL`, `NEON_*` | Yes | Neon pooler URL, auth secret |
| App | `APP_URL`, `NEXT_PUBLIC_*` | Yes | Production URL, feature flags |
| Feature flags | `FFT_*` | Yes | `FFT_RBAC_ENABLED` |
| Local-only | `PLAYGROUND_*` | **No** | Dev playground toggles |
| Ops | `NEON_API_KEY`, `NEON_ORG_ID` | **No** | CLI tools only |

## Data / request flow

### Local dev initialisation (post-S4.1 Target only)

> Pre-S4.1: `npm run env:compose` + `npm run env:guard` per `AGENTS.md`. Never `vercel env pull`.

```
vercel env pull          ← AFTER S4.1 only; writes .env.local from Vercel
pnpm --filter apps/web dev
  └── Next.js loads .env.local
  └── packages/env/src/web.ts validates all vars at startup
  └── Missing required var → Zod error → process exits with readable message
```

### Production

```
Vercel build
  └── reads env vars from Vercel dashboard
  └── packages/env/src/web.ts validates at startup (instrumentation.ts)
  └── Missing required var → build succeeds but runtime startup fails (caught by health check)
```

## Key decisions

| Decision | Where recorded |
|----------|---------------|
| `@t3-oss/env-nextjs` over raw `process.env` | This doc § Env library decision |
| `.env.local` as the only env file | This doc § Env library decision (after S4.1) |
| Local-only vars never pushed to Vercel | This doc § Env library decision |

## Failure modes

| Failure | Impact | Detection |
|---------|--------|-----------|
| Required var missing from `.env.local` | Dev server refuses to start with Zod error | Immediate — readable error message |
| Required var missing from Vercel | Production startup fails | Health check returns 500 |
| Client component reads server var | TypeScript compile error | `turbo run typecheck` |
| Secret committed to git | Security incident | Pre-commit hook + gitignore |

## Operational considerations

- **Local init (Living, pre-S4.1):** `npm run env:compose` then `npm run dev` — see `AGENTS.md`.
- **Local init (Target, post-S4.1 only):** `vercel env pull` then `pnpm --filter apps/web dev`.
- **Add a new var:** add to `packages/env/src/web.ts` schema + `runtimeEnv` map, add to Vercel dashboard, update this document's variable table.
- **Audit Vercel:** `npm run audit:vercel` compares local schema key names against Vercel (values are never read).
- **Sync to Vercel:** `npm run sync:vercel` pushes canonical production keys.

## Cutover from compose (S4.1)

Implement in one change set with [ARCH-028](ARCH-028-implementation-slices.md) S4.1:

1. Map every key from `env.config.example` + `env.secret.example` into `packages/env/src/web.ts` (`server` vs `client`).
2. Confirm `PLAYGROUND_*` stay local-only (`.env.local`, never Vercel sync).
3. Delete compose surfaces in the same PR: `env.config`, `env.secret`, examples, and `scripts/env-*.mjs` / `env:compose` / `env:guard` npm scripts.
4. Initialise `.env.local` via `vercel env pull` (or copy from a reviewed backup). Remove reliance on generated `.env`.
5. Update `AGENTS.md` Living env section to match this Target in the same PR.
6. Verify: `rg "env:compose|env:guard" package.json` = 0; product code uses `import { env } from '@afenda/env'` only.

## Known limits / future changes

- `@t3-oss/env-nextjs` validates at module load time. Variables added after startup require a restart — no hot reload of env.
- If a second app (`apps/admin`) is added, it gets its own schema file (`packages/env/src/admin.ts`) sharing the same package.

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.3.0 | 2026-07-14 | Integrity remediation: STOP banner; mark `vercel env pull` / `.env.local` as post-S4.1 only. |
| 1.2.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 1.1.0 | 2026-07-13 | Living vs Target note; compose cutover checklist |
| 1.0.0 | 2026-07-13 | Initial Target env model |
|