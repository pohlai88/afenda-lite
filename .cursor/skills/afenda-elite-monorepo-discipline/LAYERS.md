# Monorepo layer reference (Afenda-Lite)

Authority: ARCH-024 operative (this file + SKILL.md). Living ARCH-024 body dormant. No `architecture-authority` package — enforce by review + typecheck until a forward import-boundary slice lands. Scratch: [`docs-V2/pnpm`](../../../docs-V2/pnpm/README.md) · [`docs-V2/monorepo`](../../../docs-V2/monorepo/README.md).

## Full layer diagram

```
┌──────────────────────────────────────────────────────────────┐
│  Rank 3 — Application                                        │
│  apps/web                                                    │
│  Can import: Surfaces + Platform                             │
├──────────────────────────────────────────────────────────────┤
│  Rank 2 — Surfaces                                           │
│  @afenda/ui-system  @afenda/emails                           │
│  Can import: Platform (client-safe only for ui-system)       │
├──────────────────────────────────────────────────────────────┤
│  Rank 1 — Platform                                           │
│  @afenda/db  @afenda/auth  @afenda/admin  @afenda/env        │
│  @afenda/errors  @afenda/logger  @afenda/rate-limit          │
│  @afenda/cache  @afenda/audit  @afenda/search                │
│  @afenda/notifications  @afenda/events  @afenda/http         │
│  @afenda/security  @afenda/metrics  @afenda/openapi          │
│  @afenda/ai-the-machine  @afenda/config                      │
│  See allowed same-layer edges below                          │
└──────────────────────────────────────────────────────────────┘
```

## Allowed imports by layer

| From \ To | Platform | Surfaces | Application |
|-----------|----------|----------|-------------|
| Platform  | same-ok* | ❌ | ❌ |
| Surfaces  | ✅† | same-ok‡ | ❌ |
| Application | ✅ | ✅ | ❌ (apps must not import each other) |

\* Platform same-layer: prefer minimal coupling. Living edges: `@afenda/auth` → `@afenda/env` · `@afenda/http` · `@afenda/logger` · `@afenda/rate-limit` · `@afenda/errors`; `@afenda/rate-limit` → `@afenda/env` · `@afenda/errors`; `@afenda/cache` → `@afenda/env` · `@afenda/errors`; `@afenda/audit` → `@afenda/db` · `@afenda/errors`; `@afenda/search` → `@afenda/db` · `@afenda/errors`; `@afenda/notifications` → `@afenda/db` · `@afenda/errors`; `@afenda/events` → `@afenda/db` · `@afenda/errors`; `@afenda/ai-the-machine` → `@afenda/errors`; `@afenda/admin` → `@afenda/auth` · `@afenda/db` · `@afenda/env` · `@afenda/errors`; `apps/web` → `@afenda/errors` · `@afenda/logger` · `@afenda/rate-limit` · `@afenda/audit` · `@afenda/search` · `@afenda/notifications` · `@afenda/events` · `@afenda/http` · `@afenda/security` · `@afenda/metrics` · `@afenda/openapi` · `@afenda/ai-the-machine` (general activity; RBAC stays `@afenda/admin/audit`). `@afenda/errors`, `@afenda/logger`, `@afenda/http`, `@afenda/security`, `@afenda/metrics`, and `@afenda/openapi` are Rank-1 **leaves** (no `@afenda/*` deps). `@afenda/db` must **not** import `@afenda/auth` or `@afenda/env`. `@afenda/env` imports no workspace packages. `@afenda/config` is not a runtime importer.

† `@afenda/ui-system` must remain free of server-only code and DB calls (ARCH-024).

‡ `@afenda/emails` must not be imported from client components in `apps/web`.

## Forbidden import table

| From | Forbidden to | Reason |
|------|--------------|--------|
| Any `packages/*` | `apps/web` or any `apps/*` | Packages must not import apps |
| `@afenda/db` | `@afenda/auth`, `@afenda/env` | ARCH-024 contract |
| `@afenda/admin` | Surfaces, `apps/*`, second Neon Auth client | Org-console Platform; Neon SDK ownership stays in `@afenda/auth`; RBAC audit → `@afenda/admin/audit`; health → `@afenda/admin/health` (incl. readiness `latencyMs`); provision = create → `persistActiveOrganization` → invite |
| `@afenda/env` | any `@afenda/*` business package | Env owns config only |
| `@afenda/cache` | Surfaces, `apps/*`, foreign Redis outside Upstash, `FLUSHDB` | L1+L2 Platform cache; shares Upstash with rate-limit under `@afenda/cache:` prefix |
| `@afenda/audit` | Surfaces, `apps/*`, `@afenda/admin`, `@afenda/auth`, Prisma middleware | General `platform_audit_log` SSOT; RBAC stays `@afenda/admin/audit` → `platform_rbac_audit` |
| `@afenda/search` | Surfaces, `apps/*`, paid search SaaS, Meili/Typesense/FlexSearch SDKs, docs Orama ownership | Sole `platform_search_document` Postgres FTS SSOT; docs stay Orama in `@afenda/docs` |
| `@afenda/notifications` | Surfaces, `apps/*`, WebSocket servers, Redis primary store, EMAIL/SMS/PUSH without transport | Sole `platform_notification` IN_APP inbox SSOT |
| `@afenda/events` | Surfaces, `apps/*`, NATS / Redis bus, `@afenda/notifications` import | Sole `platform_domain_event` outbox SSOT; handlers injected from web |
| `@afenda/http` | Next.js; Surfaces / `apps/*`; `@afenda/*` runtime deps; tutorial `{ success }` envelopes | Fetch compose · correlation · pagination · Retry-After / RateLimit / Server-Timing leaf |
| `@afenda/security` | Next.js; Surfaces / `apps/*`; `@afenda/*` runtime deps; RBAC / rate-limit / audit / CSRF stores | Headers · CSP · CORS builders leaf; Next config is the adapter |
| `@afenda/metrics` | Next.js; Surfaces / `apps/*`; `@afenda/*` runtime deps; OTEL / vendor APM; org-id labels; Prisma middleware | Prometheus registry · record helpers · scrape text leaf; web owns RH + token gate |
| `@afenda/openapi` | Next.js; Surfaces / `apps/*`; `@afenda/*` runtime deps; product Swagger UI; manual OAS builders | Zod→OAS glue · `{ data }` envelope · metadata stamp · YAML emit leaf; path registration stays in root script; docs UI stays `@afenda/docs` |
| `@afenda/ai-the-machine` | Next.js; Surfaces / `apps/*`; `@afenda/db`; direct `@anthropic-ai/sdk`; ERP module assistants | AI SDK engine · prompt-only assistants; web injects Gateway model + session context |
| `@afenda/ui-system` | `@afenda/db`, server-only auth paths | UI is client/surface |
| Any package | Relative `../../packages/...` | Cross-boundary package name required |
| Any consumer | `@afenda/<pkg>/src/...` | Public `exports` only |
| Any package | `@afenda/shared` | Mega-package banned (ARCH-024) |

## Same-layer rules

| Layer | Same-layer OK? | Notes |
|-------|----------------|-------|
| Platform | Yes, narrowly | Document every edge in ARCH-024 + `package.json` |
| Surfaces | Prefer no | ui ↔ emails coupling needs explicit justification |
| Application | No | Only one app today; future apps/* stay isolated |

## Common violations and fixes

### Deep import

```ts
// ❌
import { withOrg } from "@afenda/db/src/client";
// ✅
import { withOrg } from "@afenda/db";
```

### Relative cross-package import

```ts
// ❌
import { env } from "../../../packages/env/src/web";
// ✅
import { env } from "@afenda/env";
```

### Phantom dependency

Package resolves a transitive dep via hoist but does not declare it — fails on clean install. Fix: add to that package's `package.json` (`workspace:*` if internal).

### Upward / app import from a package

```ts
// In packages/auth/...
import { something } from "../../../apps/web/modules/identity/..."; // ❌
// Fix: move shared contract into a lower-rank package or keep behavior in apps/web
```

### Cycle

```
auth → db → auth   // ❌
```

Fix: extract shared types/contracts to the lowest legal package, or keep orchestration in `apps/web`.

## Known exceptions

None approved. If an exception is required, record it in ARCH-024 (Docs lane; Control State reopen) before coding it.
