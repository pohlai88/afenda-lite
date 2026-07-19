# Monorepo boundaries (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/monorepo/README.md` |
| Authority | **Scratch** — coding-standards (file/org) · monorepo-discipline + disk `packages/*` · `apps/web` |
| Purpose | Lean import / layer / workspace rules |
| Updated | 2026-07-20 |

Re-probe after package add/rename or DAG change.

---

## Layers (disk)

Imports flow **down** only. Packages never import `apps/*`. No cycles.

| Rank | Layer | Packages |
|------|-------|----------|
| 3 | Application | `apps/web` · `apps/docs` (`@afenda/docs`) |
| 2 | Surfaces | `@afenda/ui-system` · `@afenda/emails` |
| 1 | Platform | `@afenda/db` · `@afenda/auth` · `@afenda/admin` · `@afenda/env` · `@afenda/errors` · `@afenda/logger` · `@afenda/rate-limit` · `@afenda/cache` · `@afenda/audit` · `@afenda/search` · `@afenda/notifications` · `@afenda/http` · `@afenda/security` · `@afenda/metrics` · `@afenda/ai-the-machine` · `@afenda/config` |

`@afenda/config` = devDep / tsconfig / Biome extend only — not a runtime import. `@afenda/errors` = transport-neutral AppError / codes / Result / http / postgres-adapter leaf (no Next.js · no DB drivers). `@afenda/logger` = Pino Node logger + edge emit leaf (`pino` only; no APM). `@afenda/http` = Fetch compose · correlation (`x-correlation-id`) · pagination · Retry-After / `X-RateLimit-*` / `Server-Timing` header leaf (no Next.js · no `@afenda/*` runtime deps). `@afenda/security` = security headers · CSP · CORS builders leaf (no Next.js · no `@afenda/*` runtime deps; living `next.config` adapts `securityHeadersForNext()` with Permissions-Policy; strict CSP / HSTS stay opt-in; RH CORS via `createPlatformRouteHandler({ cors })`). `@afenda/metrics` = Prometheus registry · HTTP/DB/cache instruments · scrape text leaf (`prom-client` only; no Next.js · no `@afenda/*` runtime deps · no OTEL/APM). `@afenda/ai-the-machine` = AI SDK conversational engine (prompt-only assistants; web injects Gateway model + session context; no Next.js / `@afenda/db`). DNA: [../ai/ai-the-machine-dna.md](../ai/ai-the-machine-dna.md). **No `@afenda/api-middleware`** — Vierp DNA absorb/reject matrix: [../api/middleware-dna.md](../api/middleware-dna.md). Metrics DNA: [../observability/metrics-dna.md](../observability/metrics-dna.md). `@afenda/rate-limit` → `@afenda/env` · `@afenda/errors` (+ Upstash SDK); Upstash on Vercel multi-instance, process memory only for non-production without keys; hit results include quota for `X-RateLimit-*`. `@afenda/cache` → `@afenda/env` · `@afenda/errors` (+ Upstash Redis L2); L1+L2 when keys set, L1-only for non-production without keys, fail closed in Vercel production without Upstash; shares Upstash with rate-limit under `@afenda/cache:` prefix (never `FLUSHDB`). `@afenda/audit` → `@afenda/db` · `@afenda/errors` (sole `platform_audit_log` write/list/export/purge SSOT — general domain activity; distinct from RBAC; first living caller = `apps/web` `deleteOrganizationAction`). `@afenda/search` → `@afenda/db` · `@afenda/errors` (sole `platform_search_document` Postgres FTS upsert/search/delete SSOT — product search; docs Orama stays in `@afenda/docs`; no paid search SaaS). `@afenda/notifications` → `@afenda/db` · `@afenda/errors` (sole `platform_notification` IN_APP write/list/mark-read/unread SSOT — no WebSocket / Redis primary / multi-channel claims; first living caller = `apps/web` `assignOrgRoleAction`). Notifications DNA: [../notifications/README.md](../notifications/README.md). `@afenda/auth` → `@afenda/env` · `@afenda/http` · `@afenda/logger` · `@afenda/rate-limit` · `@afenda/errors` (incl. session-scoped `persistActiveOrganization` for RH/Action; BFF POST rate limit + RateLimit/Server-Timing headers). `@afenda/admin` → `@afenda/auth` · `@afenda/db` · `@afenda/env` · `@afenda/errors` (org-console services; sole `platform_rbac_audit` write/list SSOT — no dual writer under `apps/web`; `provisionOrganization` = create → setActive → invite; health probes + readiness `latencyMs` SSOT — web domain re-exports). RBAC audit callers use `@afenda/admin/audit`; general activity audit callers use `@afenda/audit`; health callers use `@afenda/admin/health` (no Neon Auth client load). App domain: `apps/web/modules/*` · `features/*`.

`@afenda/docs` = official documentation site — may depend on workspace `@afenda/config` only; **must not** import `@afenda/db` · `@afenda/auth` · `@afenda/env` product secrets. OpenAPI consumer rules: [../docs/README.md](../docs/README.md).

---

## Rules (must)

| # | Do | Don't |
|---|----|-------|
| 1 | `import { … } from "@afenda/db"` | `../../packages/db/src/...` |
| 2 | Package name or declared `exports` | `@afenda/*/src/...` |
| 3 | Internal deps `"workspace:*"` | Semver range on `@afenda/*` |
| 4 | Shared externals `"catalog:"` when listed | Re-pin per package (exception: `@afenda/docs` pins `tailwindcss` + `@tailwindcss/postcss` `^4.3.3` for fumadocs-openapi — see [../pnpm/README.md](../pnpm/README.md) · [../docs/README.md](../docs/README.md)) |
| 5 | Import only declared package.json deps | Phantom / hoist-only |
| 6 | Higher → same or lower rank | Packages → `apps/*`; cycles; `@afenda/shared` |

| Package | Must not |
|---------|----------|
| `@afenda/db` | Import auth/env/ui/emails |
| `@afenda/auth` | Own DB schema |
| `@afenda/admin` | Import Surfaces / `apps/*`; invent a second Neon Auth client |
| `@afenda/env` | Runtime business logic |
| `@afenda/errors` | Next.js; `pg` / Drizzle / Prisma; UI/locale copy as contract |
| `@afenda/logger` | Next.js; APM SDKs; Surfaces / `apps/*` |
| `@afenda/http` | Next.js; Surfaces / `apps/*`; `@afenda/*` runtime deps; `{ success }` envelopes |
| `@afenda/security` | Next.js; Surfaces / `apps/*`; `@afenda/*` runtime deps; RBAC / rate-limit / audit / CSRF stores |
| `@afenda/metrics` | Next.js; Surfaces / `apps/*`; `@afenda/*` runtime deps; OTEL / vendor APM; org-id labels |
| `@afenda/ai-the-machine` | Next.js; Surfaces / `apps/*`; `@afenda/db`; direct Anthropic SDK; ERP module assistants |
| `@afenda/rate-limit` | Next.js; Surfaces / `apps/*`; foreign Redis outside Upstash |
| `@afenda/cache` | Next.js; Surfaces / `apps/*`; foreign Redis outside Upstash; `FLUSHDB` |
| `@afenda/audit` | Next.js; Surfaces / `apps/*`; `@afenda/admin` / `@afenda/auth`; dual-write into `platform_rbac_audit` |
| `@afenda/search` | Next.js; Surfaces / `apps/*`; paid search SaaS (Algolia / Orama Cloud / Mixedbread); Meili/Typesense/FlexSearch SDKs; dual-write into `platform_search_document`; docs Orama ownership |
| `@afenda/notifications` | Next.js; Surfaces / `apps/*`; WebSocket servers; Redis primary store; EMAIL/SMS/PUSH without transport; dual-write into `platform_notification` |
| `@afenda/ui-system` | Server-only / DB / secrets |
| `@afenda/emails` | Import from client components in `apps/web` |

---

## Add an import

```text
[ ] Declared in this package.json
[ ] Package name / exports subpath (not deep src/)
[ ] Same or lower rank; no apps/* upward
[ ] No cycle; update target exports if new public surface
```

---

## Verify

```text
1. pnpm --filter @afenda/web test -- feature-db-boundary ui-boundary auth-sdk-boundary
2. pnpm typecheck
3. rg "from [\"']\\.\\./.*/packages/" apps packages --glob "*.{ts,tsx}"
4. rg "from [\"']@afenda/[^\"']+/src/" apps packages --glob "*.{ts,tsx}"
```

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Relative / deep `src` imports | Breaks package public door |
| Package → `apps/*` | Inverts the DAG |
| `@afenda/shared` mega-package | Collapses boundaries |

Companion: [../pnpm/README.md](../pnpm/README.md) (incl. **Peer Observations (disposed)** — fumadocs-mdx/vite · Neon Auth optionals) · [../discipline/README.md](../discipline/README.md) · [../nextjs/folders.md](../nextjs/folders.md).
