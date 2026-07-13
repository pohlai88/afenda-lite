# ADR-014 @t3-oss/env-nextjs for Environment Config

| Field | Value |
|-------|-------|
| ID | ADR-014 |
| Category | ADR |
| Version | 1.1.0 |
| Status | Accepted |
| Owner | Platform |
| Updated | 2026-07-13 |

> **Forward-writing.** Accepted target decision for the Turborepo rebuild. Ignore legacy flat-monolith residue.


## Decision Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-07-13 |
| **Deciders** | Platform |
| **Scope** | Environment variable validation and server/client separation in `apps/web` |

## Context

Next.js App Router has a hard split between server-only variables and client-safe `NEXT_PUBLIC_*` variables. That split is critical for security: a database URL or auth secret must never reach the browser bundle. We need the split enforced by the type-checker, not by developer discipline. We also need all variables validated at startup so a missing required variable fails immediately with a clear error — not silently at runtime as a cryptic `undefined`.

## Decision

Use **`@t3-oss/env-nextjs`** in `packages/env/src/web.ts`.

The Zod schema declares every variable once — its name, type, required/optional, and whether it is server-only or client-safe. The exported `env` object is the only way application code reads configuration. Next.js loads `.env.local` natively — no compose step, no guard script.

## Consequences

### Positive

- Server/client split is enforced by TypeScript: reading `env.DATABASE_URL` in a client component is a compile error
- Missing required variable causes a startup-time Zod error with a readable message — not a silent `undefined` at call time
- `vercel env pull` writes `.env.local` and it just works — no custom tooling needed
- One file (`packages/env/src/web.ts`) is the complete inventory of all environment variables the app uses

### Negative / accepted costs

- Every new environment variable requires updating both the Zod schema and the `runtimeEnv` map — two places, but both in the same file
- `@t3-oss/env-nextjs` validates at module load time — env vars cannot be changed at runtime without a restart

## Alternatives rejected

| Alternative | Why rejected |
|-------------|--------------|
| Raw `process.env.*` reads | No validation; no type safety; server/client boundary is convention, not enforcement; no single inventory of vars |
| `dotenv-cli` | Adds a loading step but no Zod validation or type generation; still requires `process.env` reads |
| Custom compose scripts (config + secret → `.env`) | Non-standard; breaks `vercel env pull`; requires bespoke maintenance for every new key; makes the var inventory implicit |
| `zod` + manual `process.env` wrappers | Equivalent to `@t3-oss/env-nextjs` but without the Next.js client/server integration — reinventing the same thing |

## Constraints that must not be broken

- Product code reads config only via `import { env } from '@afenda/env'` — no raw `process.env` for app config
- Server vars stay in the `server` block; client vars are `NEXT_PUBLIC_*` in the `client` block
- After S4.1 cutover: `.env.local` is the only local runtime env file; compose / `env:guard` are gone
- `PLAYGROUND_*` stay local-only and are never synced to Vercel

## References

- [ARCH-027 Environment Variable Model](../../architecture/turborepo/ARCH-027-env-model.md)

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.1.0 | 2026-07-13 | Constraints that must not be broken; compose retirement tie-in |
| 1.0.0 | 2026-07-13 | Accepted |
