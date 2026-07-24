# Monorepo layer reference (Afenda-Lite)

Authority: ARCH-024 operative (this file + SKILL.md) + ERP expansion governance promoted 2026-07-20 from [`packages_refactor_v2.3.md`](../../../docs-V2/_scratch/packages_refactor_v2.3.md). Living ARCH-024 body dormant. No `architecture-authority` package — enforce by review + typecheck until a forward import-boundary slice lands. Operative Scratch: [`docs-V2/pnpm`](../../../docs-V2/pnpm/README.md) · [`docs-V2/monorepo`](../../../docs-V2/monorepo/README.md) · [`WORKSPACE-EDGE-REGISTER.yaml`](../../../docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml).

**Version:** `layers-governance/2026-07-20`

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
│  Rank 1 — Platform (bands classify only — never grant deps)  │
│  R1-A foundation · R1-B runtime · R1-C data-plane            │
│  R1-D control · R1-F ERP · R1-X optional                     │
│  See band table + allowed same-layer edges below             │
└──────────────────────────────────────────────────────────────┘
```

## Rank-1 bands (classification only)

| Band | Kind | Packages |
|------|------|----------|
| R1-A | Foundation | `@afenda/config` · `@afenda/env` · `@afenda/errors` · `@afenda/testing` (dev/test leaf; `@afenda/config` only) |
| R1-B | Runtime | `@afenda/logger` · `@afenda/http` · `@afenda/security` · `@afenda/metrics` · `@afenda/openapi` · `@afenda/rate-limit` · `@afenda/cache` |
| R1-C | Data plane | `@afenda/db` · `@afenda/audit` · `@afenda/events` · `@afenda/search` · `@afenda/notifications` |
| R1-D | Control plane | `@afenda/auth` · `@afenda/admin` |
| R1-F | ERP | `@afenda/master-data` · `@afenda/sales` · `@afenda/purchasing` · `@afenda/inventory` · `@afenda/receiving` · `@afenda/fulfillment` · `@afenda/receivables` · `@afenda/payables` · `@afenda/payments` · `@afenda/accounting` |
| R1-X | Optional capability | `@afenda/ai-the-machine` |

```text
Bands classify packages; bands never grant dependency rights.
A package may import only what package.json declares AND
WORKSPACE-EDGE-REGISTER authorizes. Register authorizes;
package.json realizes; CI reconciles (Phase 2 validator).
```

**Peer ERP default:** R1-F packages do not import each other. `@afenda/sales` → `@afenda/master-data` is backbone master-data (required), not a peer transactional ERP module.

## Allowed imports by layer

| From \ To | Platform | Surfaces | Application |
|-----------|----------|----------|-------------|
| Platform  | same-ok* | ❌ | ❌ |
| Surfaces  | ✅† | same-ok‡ | ❌ |
| Application | ✅ | ✅ | ❌ (apps must not import each other) |

\* Platform same-layer: prefer minimal coupling. Living edges (must match WORKSPACE-EDGE-REGISTER): `@afenda/auth` → `@afenda/env` · `@afenda/http` · `@afenda/logger` · `@afenda/rate-limit` · `@afenda/errors`; `@afenda/rate-limit` → `@afenda/env` · `@afenda/errors`; `@afenda/cache` → `@afenda/env` · `@afenda/errors`; `@afenda/audit` → `@afenda/db` · `@afenda/errors`; `@afenda/search` → `@afenda/db` · `@afenda/errors`; `@afenda/notifications` → `@afenda/db` · `@afenda/errors`; `@afenda/events` → `@afenda/db` · `@afenda/errors`; `@afenda/master-data` → `@afenda/db` · `@afenda/errors` · `@afenda/audit` · `@afenda/events` · `@afenda/search`; `@afenda/sales` → `@afenda/db` · `@afenda/errors` · `@afenda/audit` · `@afenda/events` · `@afenda/master-data`; `@afenda/purchasing` → `@afenda/db` · `@afenda/errors` · `@afenda/audit` · `@afenda/events` · `@afenda/master-data`; `@afenda/payables` → `@afenda/db` · `@afenda/errors` · `@afenda/events`; `@afenda/ai-the-machine` → `@afenda/errors`; `@afenda/admin` → `@afenda/auth` · `@afenda/db` · `@afenda/env` · `@afenda/errors`; `apps/web` → `@afenda/errors` · `@afenda/logger` · `@afenda/rate-limit` · `@afenda/audit` · `@afenda/search` · `@afenda/notifications` · `@afenda/events` · `@afenda/http` · `@afenda/security` · `@afenda/metrics` · `@afenda/openapi` · `@afenda/ai-the-machine` · `@afenda/sales` (general activity; RBAC stays `@afenda/admin/audit`). `@afenda/errors`, `@afenda/logger`, `@afenda/http`, `@afenda/security`, `@afenda/metrics`, and `@afenda/openapi` are Rank-1 **leaves** (no `@afenda/*` deps). `@afenda/db` must **not** import `@afenda/auth` or `@afenda/env`. `@afenda/env` imports no workspace packages. `@afenda/config` is not a runtime importer.

`@afenda/payments` → `@afenda/db` · `@afenda/errors` · `@afenda/events`; allocation integration is event-only and never a peer ERP import.

`@afenda/accounting` → `@afenda/db` · `@afenda/errors` · `@afenda/events`; peer ERP integrations are event-only.

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
| `@afenda/master-data` | Surfaces, `apps/*`, Next.js, NATS, Map production stores, `{ success }` envelopes, dual-write `md_*` outside package, org-scoped `md_uom` | Sole mutation owner for Authority B `ref_*` reads + `md_party` · `md_item_group` · `md_item` · `md_warehouse`; schema in `@afenda/db` |
| `@afenda/sales` | Surfaces, `apps/*`, Next.js, dual-write `md_*`, local customer/product shadow tables, peer R1-F packages | Sales order/line consumer; masters via `@afenda/master-data` only |
| `@afenda/purchasing` | Surfaces, `apps/*`, Next.js, dual-write `md_*`, local supplier/product shadow tables, peer R1-F packages | Purchase order/line consumer; masters via `@afenda/master-data` only |
| `@afenda/payables` | Surfaces, `apps/*`, Next.js, dual-write `md_*`, `purchase_order*`, `goods_receipt*`, payment, ledger, or journal tables, local supplier/item shadow tables, peer R1-F packages | Supplier invoice/line/credit-note/allocation/balance/match owner; integration is identity + events only |
| `@afenda/payments` | Surfaces, `apps/*`, Next.js, receivables, payables, ledger, journal, or accounting tables, peer R1-F packages | Payment/allocation/reversal owner; composition root applies allocation events through owning packages |
| `@afenda/accounting` | Surfaces, `apps/*`, Next.js, peer ERP tables, mutable posted journal lines, peer R1-F packages | Journal/line/ledger-posting/accounting-period owner; integration is events only |
| Any R1-F ERP | Peer R1-F `package.json` edge without WORKSPACE-EDGE-REGISTER approval; `@afenda/admin` | Dual-control + authz boundary |
| `@afenda/http` | Next.js; Surfaces / `apps/*`; `@afenda/*` runtime deps; tutorial `{ success }` envelopes | Fetch compose · correlation · pagination · Retry-After / RateLimit / Server-Timing leaf |
| `@afenda/security` | Next.js; Surfaces / `apps/*`; `@afenda/*` runtime deps; RBAC / rate-limit / audit / CSRF stores | Headers · CSP · CORS builders leaf; Next config is the adapter |
| `@afenda/metrics` | Next.js; Surfaces / `apps/*`; `@afenda/*` runtime deps; OTEL / vendor APM; org-id labels; Prisma middleware | Prometheus registry · record helpers · scrape text leaf; web owns RH + token gate |
| `@afenda/openapi` | Next.js; Surfaces / `apps/*`; `@afenda/*` runtime deps; product Swagger UI; manual OAS builders | Zod→OAS glue · `{ data }` envelope · metadata stamp · YAML emit leaf; path registration stays in root script; docs UI stays `@afenda/docs` |
| `@afenda/ai-the-machine` | Next.js; Surfaces / `apps/*`; `@afenda/db`; direct `@anthropic-ai/sdk`; ERP module assistants | AI SDK engine · prompt-only assistants; web injects Gateway model + session context |
| `@afenda/ui-system` | `@afenda/db`, server-only auth paths | UI is client/surface |
| Any package | Relative `../../packages/...` | Cross-boundary package name required |
| Any consumer | `@afenda/<pkg>/src/...` | Public `exports` only |
| Any package | `@afenda/shared` · `@afenda/common` · `@afenda/utils` · `@afenda/types` · `@afenda/helpers` · `@afenda/erp-utils` · `@afenda/domain-kit` | Mega-package / catch-all / premature shared helpers banned — dependency escape hatches |

## Same-layer rules

| Layer | Same-layer OK? | Notes |
|-------|----------------|-------|
| Platform | Yes, narrowly | Document every edge in WORKSPACE-EDGE-REGISTER + `package.json` |
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
import { env } from "../../../packages/foundation/env/src/web";
// ✅
import { env } from "@afenda/env";
```

### Phantom dependency

Package resolves a transitive dep via hoist but does not declare it — fails on clean install. Fix: add to that package's `package.json` (`workspace:*` if internal) **and** add WORKSPACE-EDGE-REGISTER row in the same mission.

### Upward / app import from a package

```ts
// In packages/control-plane/auth/...
import { something } from "../../../apps/web/modules/identity/..."; // ❌
// Fix: move shared contract into a lower-rank package or keep behavior in apps/web
```

### Cycle

```
auth → db → auth   // ❌
```

Fix: extract shared types/contracts to the lowest legal package, or keep orchestration in `apps/web`.

### Peer ERP without dual-control

```ts
// ❌ @afenda/sales importing a future @afenda/inventory
import { reserveStock } from "@afenda/inventory";
```

Fix: events / ports / app-saga at composition root (`apps/web`), or Approved ARCH-006 cut + dual-control edge.

## Known exceptions

None approved. If an exception is required, record it in ARCH-024 (Docs lane; Control State reopen) and WORKSPACE-EDGE-REGISTER before coding it.
