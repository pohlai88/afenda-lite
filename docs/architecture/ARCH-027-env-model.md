# ARCH-027 Environment Variable Model

| Field | Value |
|-------|-------|
| ID | ARCH-027 |
| Category | Architecture |
| Version | 1.6.0 |
| Status | Living |
| Control State | Closed |
| Owner | Platform |
| Updated | 2026-07-15 |

> **Living.** Environment SSOT after ARCH-028 Checkpoint G (2026-07-15). S4.1 + Checkpoint D shipped (`@afenda/env` + `.env.local` only; compose retired).

> **STOP — compose retired:** Do **not** restore Collapse-era `env:compose` / `env:guard` / `env.config` / `env.secret` / `lib/env`. Local runtime file = `.env.local` only. App config = `import { env } from '@afenda/env'`. Prefer editing a known-good `.env.local` over blind `vercel env pull` (redacts / stale marketplace keys).

## Context

`apps/web` requires both server-only secrets and client-safe public variables. The environment model enforces the server/client split at the type-checker level, validates all variables at startup, and uses standard Next.js loading so Vercel's tooling works without custom scripts. This document includes the **`@t3-oss/env-nextjs` decision**.

## Env library decision

**Decision:** Use **`@t3-oss/env-nextjs`** in `packages/env/src/web.ts`. Zod schema declares every variable once. Exported `env` is the only way application code reads configuration. After S4.1 cutover: Next.js loads `.env.local` natively — no compose step, no guard script.

| Positive | Accepted cost |
|----------|---------------|
| Server/client split enforced by TypeScript | New var → update schema + `runtimeEnv` (same file) |
| Missing required var → startup Zod error | Validates at module load — no runtime hot-swap |
| `vercel env pull` → `.env.local` refresh path | Review redacted/empty + marketplace keys after pull |
| One inventory file for all app env vars | |

| Alternative | Why rejected |
|-------------|--------------|
| Raw `process.env` | No validation; convention-only server/client split |
| `dotenv-cli` | Load step without Zod/types |
| Custom compose (`env.config` + `env.secret` → `.env`) | **Retired at S4.1 / Checkpoint D** — do not recover |
| Collapse-era `lib/env/` typed accessors | Banned recover; Target home is `@afenda/env` |
| Manual Zod wrappers | Reinvents `@t3-oss/env-nextjs` without Next integration |

**Constraints that must not be broken:**

- Product code reads config only via `import { env } from '@afenda/env'` — no raw `process.env` for app config
- Server vars stay in the `server` block; client vars are `NEXT_PUBLIC_*` in the `client` block
- `.env.local` is the only local runtime env file; compose / `env:guard` are gone
- Do **not** restore compose/`lib/env` or run a parallel t3-env + compose hybrid
- `PLAYGROUND_*` stay local-only and are never synced to Vercel

## Responsibilities and boundaries

| Component | Responsibility |
|-----------|---------------|
| `packages/env/src/web.ts` | Single Zod schema declaring all variables, their types, and server/client placement |
| `.env.local` | The only env file loaded at runtime for Next + ops. Gitignored. Template: `.env.example`. |
| `vercel env pull` | Optional refresh into `.env.local` — audit values after pull. |
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

### Local dev initialisation

```
cp .env.example .env.local   ← or refresh carefully (prefer known-good values)
pnpm --filter @afenda/web dev
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

- **Local init:** copy `.env.example` → `.env.local`, fill required keys, `pnpm validate:neon-env`, then `pnpm --filter @afenda/web dev`.
- **Add a new var:** add to `packages/env/src/web.ts` schema + `runtimeEnv` map, update `.env.example` / Vercel, update this document's variable table.
- **Audit / sync Vercel:** `pnpm audit:vercel` (key names) when tooling is available — never restore compose.

## Cutover from compose (S4.1)

**Done** (2026-07-14) with [ARCH-028](ARCH-028-implementation-slices.md) S4.1 + Checkpoint D. Compose surfaces retired; evidence on that document. Do not reopen compose.

## Known limits / future changes

- `@t3-oss/env-nextjs` validates at module load time. Variables added after startup require a restart — no hot reload of env.
- If a second app (`apps/admin`) is added, it gets its own schema file (`packages/env/src/admin.ts`) sharing the same package.

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.6.0 | 2026-07-15 | Checkpoint G: Status Target→Living; compose-retired env model is current ops. |
| 1.5.1 | 2026-07-15 | Stable heading anchor `#cutover-from-compose-s41` for ARCH-028 link (cutover remains done). |
| 1.5.0 | 2026-07-14 | S4.1 shipped: STOP = compose retired; `.env.local` + `@afenda/env` Living ops. |
| 1.4.2 | 2026-07-14 | Remove residual “Living compose in force” phrasing; docs-first STOP until S4.1. |
| 1.4.1 | 2026-07-14 | Home flattened to docs/architecture/ (trunks removed; pack reading order in README). |
| 1.4.0 | 2026-07-14 | Root-cause clean: STOP + Living prose no longer require runnable Collapse compose/`lib/env`; docs-first gated; forward = Target `@afenda/env` only. |
| 1.3.0 | 2026-07-14 | Integrity remediation: STOP banner; mark `vercel env pull` / `.env.local` as post-S4.1 only. |
| 1.2.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 1.1.0 | 2026-07-13 | Living vs Target note; compose cutover checklist |
| 1.0.0 | 2026-07-13 | Initial Target env model |
|