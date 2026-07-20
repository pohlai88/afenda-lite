# Monorepo boundaries

| Field | Value |
|-------|-------|
| Surface | `docs-V2/monorepo/README.md` |
| Authority | **Operative** (docs-V2 Scratch pack) — coding-standards · monorepo-discipline + disk `packages/*/*` · `apps/web` |
| Purpose | Lean import / layer / workspace rules + ERP expansion governance baseline |
| Updated | 2026-07-20 |
| Version | `monorepo-governance/2026-07-20` |
| Promoted from | [`docs-V2/_scratch/packages_refactor_v2.3.md`](../_scratch/packages_refactor_v2.3.md) (accepted reference) |
| Companion | [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) · [packages/README.md](../../packages/README.md) · [WORKSPACE-EDGE-REGISTER.yaml](../modules/WORKSPACE-EDGE-REGISTER.yaml) |

Re-probe after package add/rename or DAG change. Controlled Living `docs/` remains dormant until Docs-lane reopen — this pack + LAYERS.md are the named promotion targets.

### Phase status (2026-07-20)

| Phase | Meaning | Status |
|-------|---------|--------|
| **1** | Classification + banded catalog | **Done** — [packages/README.md](../../packages/README.md) |
| **2** | Dual-control validators (`pnpm validate:modules`) | **Done** — Living in CI; [PHASE-2-REPORT.md](../modules/PHASE-2-REPORT.md) |
| **3** | One-level category folders under `packages/` (imports stay `@afenda/<name>`) | **Done** — living shape `packages/<category>/<name>`. Evidence gate waived in writing 2026-07-20; authorization: [phase3_phase4.md](../_scratch/phase3_phase4.md). Categories are not packages (no `@afenda/foundation` etc.). |
| **4.1** | `@afenda/purchasing` P0 transactional package | **Done** — nest under `packages/erp/purchasing`; dual-control edges + manifest + permission catalog. Next slice: 4.2 Inventory (after 4.1 close). |
| **4** | New ERP packages from MODULE-ROADMAP | Authorized after Phase 3 independent approval — execute package-by-package ([phase3_phase4.md](../_scratch/phase3_phase4.md)); not opened by Phase 1–2 close alone |

Still out of scope for this pack (separate missions): `@afenda/module-catalog` runtime · `@afenda/authorization` extraction · `@afenda/jobs` · new transaction-core packages.

---

## Layers (disk)

Imports flow **down** only. Packages never import `apps/*`. No cycles.

| Rank | Layer | Packages |
|------|-------|----------|
| 3 | Application | `apps/web` · `apps/docs` (`@afenda/docs`) |
| 2 | Surfaces | `@afenda/ui-system` · `@afenda/emails` |
| 1 | Platform | `@afenda/db` · `@afenda/auth` · `@afenda/admin` · `@afenda/env` · `@afenda/errors` · `@afenda/logger` · `@afenda/rate-limit` · `@afenda/cache` · `@afenda/audit` · `@afenda/search` · `@afenda/notifications` · `@afenda/events` · `@afenda/master-data` · `@afenda/sales` · `@afenda/purchasing` · `@afenda/http` · `@afenda/security` · `@afenda/metrics` · `@afenda/openapi` · `@afenda/ai-the-machine` · `@afenda/config` |

### Rank-1 bands (classification only)

Bands never grant import rights. Every edge is package-specific via dual-control (below). Catalog: [packages/README.md](../../packages/README.md).

| Band | Kind | On-disk path |
|------|------|--------------|
| R1-A | Foundation | `packages/foundation/{config,env,errors}` |
| R1-B | Runtime | `packages/runtime/{logger,http,security,metrics,openapi,rate-limit,cache}` |
| R1-C | Data plane | `packages/data-plane/{db,audit,events,search,notifications}` |
| R1-D | Control plane | `packages/control-plane/{auth,admin}` |
| R1-F | ERP | `packages/erp/{master-data,sales,purchasing}` |
| R1-X | Optional capability | `packages/intelligence/ai-the-machine` |
| R2 | Surfaces | `packages/surfaces/{ui-system,emails}` |

Physical layout is one-level nested (`packages/<category>/<name>`). Categories organize the repository only — they are not dependency or ownership units. Published imports remain `@afenda/<name>`.

---

## ERP expansion governance (promoted)

```text
ERP expansion governance baseline = Phase 1 classification + Phase 2
validators (`pnpm validate:modules` — Living).

Runtime module control plane readiness additionally requires
@afenda/module-catalog — not this pack alone.
```

**Operating law**

1. Find the package owner; call its public API.
2. Do not import a peer ERP package without an edge in **both** `package.json` and [WORKSPACE-EDGE-REGISTER.yaml](../modules/WORKSPACE-EDGE-REGISTER.yaml).
3. Do not write another module’s mutation tables (DDL in `@afenda/db`; mutation authority in owning package).
4. Every public ERP mutation and organization-scoped query must enforce a declared permission via an injected authorization port (or explicit `systemOnly` / approved public policy). Route checks alone are insufficient. Manifest maps + package ports + `pnpm validate:modules` (Phase 2).
5. CI proves the boundary via `pnpm validate:modules` (Phase 2).

### Workspace edges — dual control

| Surface | Responsibility |
|---------|----------------|
| `package.json` | Executable dependency truth (realizes the edge) |
| `WORKSPACE-EDGE-REGISTER.yaml` | Architecture authorization + rationale |
| Validator (Phase 2) | Exact agreement between both |

```text
Register authorizes; package.json realizes; CI reconciles.
An edge in package.json without an approved register row fails CI.
An approved register row without package.json fails CI unless status is planned.
```

**Default:** peer ERP packages (`R1-F`) do **not** import each other. Living dual-control edges for `@afenda/sales` / `@afenda/purchasing` → `@afenda/master-data` (and platform leaves) are listed in the register.

### Persistence and queries

| Responsibility | Owner |
|----------------|--------|
| Drizzle DDL / migrations | `@afenda/db` |
| Business mutation authority | Owning package |
| Canonical domain queries | Owning package |
| Cross-domain reads | Owner public API or Approved query port |
| Direct app write to domain tables | Forbidden |

### Composition root

Cross-package adapters and sagas live in an approved **application composition root** (today: `apps/web`). Future worker/CLI hosts may join without changing domain ownership.

### No mega-helpers

Do not promote business helpers to `@afenda/shared`, `@afenda/common`, `@afenda/erp-utils`, or `@afenda/domain-kit` because two functions look similar.

`@afenda/config` = devDep / tsconfig / Biome extend only — not a runtime import. `@afenda/errors` = transport-neutral AppError / codes / Result / http / postgres-adapter leaf (no Next.js · no DB drivers). `@afenda/logger` = Pino Node logger + edge emit leaf (`pino` only; no APM). `@afenda/http` = Fetch compose · correlation (`x-correlation-id`) · pagination · Retry-After / `X-RateLimit-*` / `Server-Timing` header leaf (no Next.js · no `@afenda/*` runtime deps). `@afenda/security` = security headers · CSP · CORS builders leaf (no Next.js · no `@afenda/*` runtime deps; living `next.config` adapts `securityHeadersForNext()` with Permissions-Policy; strict CSP / HSTS stay opt-in; RH CORS via `createPlatformRouteHandler({ cors })`). `@afenda/metrics` = Prometheus registry · HTTP/DB/cache instruments · scrape text leaf (`prom-client` only; no Next.js · no `@afenda/*` runtime deps · no OTEL/APM). `@afenda/openapi` = Zod→OpenAPI glue · `{ data }` envelope · `x-afenda-*` stamps · YAML emit leaf (`zod` + `@asteasolutions/zod-to-openapi` + `yaml`; no Next.js · no `@afenda/*` runtime deps · no product Swagger under `apps/web`; path registration stays in `scripts/generate-openapi.mts`; docs UI stays `@afenda/docs`). `@afenda/ai-the-machine` = AI SDK conversational engine (prompt-only assistants; web injects Gateway model + session context; no Next.js / `@afenda/db`). DNA: [../ai/ai-the-machine-dna.md](../ai/ai-the-machine-dna.md). **No `@afenda/api-middleware`** — Vierp DNA absorb/reject matrix: [../api/middleware-dna.md](../api/middleware-dna.md). **No `@afenda/feature-flags`** — Vierp tier-catalog DNA absorb/reject (ops toggles stay on `@afenda/env`): [../entitlements/entitlements-dna.md](../entitlements/entitlements-dna.md). Metrics DNA: [../observability/metrics-dna.md](../observability/metrics-dna.md). `@afenda/rate-limit` → `@afenda/env` · `@afenda/errors` (+ Upstash SDK); Upstash on Vercel multi-instance, process memory only for non-production without keys; hit results include quota for `X-RateLimit-*`. `@afenda/cache` → `@afenda/env` · `@afenda/errors` (+ Upstash Redis L2); L1+L2 when keys set, L1-only for non-production without keys, fail closed in Vercel production without Upstash; shares Upstash with rate-limit under `@afenda/cache:` prefix (never `FLUSHDB`). `@afenda/audit` → `@afenda/db` · `@afenda/errors` (sole `platform_audit_log` write/list/export/purge SSOT — general domain activity; distinct from RBAC; first living caller = `apps/web` `deleteOrganizationAction`). `@afenda/search` → `@afenda/db` · `@afenda/errors` (sole `platform_search_document` Postgres FTS upsert/search/delete SSOT — product search; docs Orama stays in `@afenda/docs`; no paid search SaaS). `@afenda/notifications` → `@afenda/db` · `@afenda/errors` (sole `platform_notification` IN_APP write/list/mark-read/unread SSOT — no WebSocket / Redis primary / multi-channel claims; first living caller = `apps/web` `assignOrgRoleAction` via events handler). Notifications DNA: [../notifications/README.md](../notifications/README.md). `@afenda/events` → `@afenda/db` · `@afenda/errors` (sole `platform_domain_event` outbox publish/claim/query/purge SSOT — no NATS / Redis bus; handlers injected from `apps/web`; first living caller = `apps/web` `assignOrgRoleAction` → `identity.org_role.assigned`). Events DNA: [../events/events-dna.md](../events/events-dna.md). `@afenda/master-data` → `@afenda/db` · `@afenda/errors` · `@afenda/audit` · `@afenda/events` · `@afenda/search` (sole mutation owner for Authority B `ref_*` + `md_party` · `md_item_group` · `md_item` · `md_warehouse`; UoM = platform `ref_uom` only; search projectors write derived `platform_search_document` rows). Master-data DNA: [../master-data/README.md](../master-data/README.md). `@afenda/sales` → `@afenda/db` · `@afenda/errors` · `@afenda/audit` · `@afenda/events` · `@afenda/master-data` (sales_order / sales_order_line transactional consumer; FK + snapshots only — ARCH-006). Contract: [../master-data/arch-006-consumer-contract.md](../master-data/arch-006-consumer-contract.md). `@afenda/auth` → `@afenda/env` · `@afenda/http` · `@afenda/logger` · `@afenda/rate-limit` · `@afenda/errors` (incl. session-scoped `persistActiveOrganization` for RH/Action; BFF POST rate limit + RateLimit/Server-Timing headers). `@afenda/admin` → `@afenda/auth` · `@afenda/db` · `@afenda/env` · `@afenda/errors` (org-console services; sole `platform_rbac_audit` write/list SSOT — no dual writer under `apps/web`; `provisionOrganization` = create → setActive → invite; health probes + readiness `latencyMs` SSOT — web domain re-exports). RBAC audit callers use `@afenda/admin/audit`; general activity audit callers use `@afenda/audit`; health callers use `@afenda/admin/health` (no Neon Auth client load). App domain: `apps/web/modules/*` · `features/*`.

`@afenda/docs` = official documentation site — may depend on workspace `@afenda/config` only; **must not** import `@afenda/db` · `@afenda/auth` · `@afenda/env` product secrets. OpenAPI consumer rules: [../docs/README.md](../docs/README.md).

---

## Rules (must)

| # | Do | Don't |
|---|----|-------|
| 1 | `import { … } from "@afenda/db"` | `../../packages/data-plane/db/src/...` |
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
| `@afenda/openapi` | Next.js; Surfaces / `apps/*`; `@afenda/*` runtime deps; product Swagger under `apps/web`; manual OAS builders |
| `@afenda/ai-the-machine` | Next.js; Surfaces / `apps/*`; `@afenda/db`; direct Anthropic SDK; ERP module assistants |
| `@afenda/rate-limit` | Next.js; Surfaces / `apps/*`; foreign Redis outside Upstash |
| `@afenda/cache` | Next.js; Surfaces / `apps/*`; foreign Redis outside Upstash; `FLUSHDB` |
| `@afenda/audit` | Next.js; Surfaces / `apps/*`; `@afenda/admin` / `@afenda/auth`; dual-write into `platform_rbac_audit` |
| `@afenda/search` | Next.js; Surfaces / `apps/*`; paid search SaaS (Algolia / Orama Cloud / Mixedbread); Meili/Typesense/FlexSearch SDKs; dual-write into `platform_search_document`; docs Orama ownership |
| `@afenda/notifications` | Next.js; Surfaces / `apps/*`; WebSocket servers; Redis primary store; EMAIL/SMS/PUSH without transport; dual-write into `platform_notification` |
| `@afenda/events` | Next.js; Surfaces / `apps/*`; NATS / Redis bus; dual-write into `platform_domain_event`; importing `@afenda/notifications` (handlers stay in web) |
| `@afenda/master-data` | Next.js; Surfaces / `apps/*`; org-scoped `md_uom`; dual-write `md_*` outside package; shadow customer/product/vendor tables |
| `@afenda/sales` | Next.js; Surfaces / `apps/*`; dual-write `md_*`; local customer/product shadow tables; Purchasing/Inventory ownership; peer ERP `package.json` edges without WORKSPACE-EDGE-REGISTER approval |
| `@afenda/purchasing` | Next.js; Surfaces / `apps/*`; dual-write `md_*`; local supplier/product shadow tables; peer ERP `package.json` edges without WORKSPACE-EDGE-REGISTER approval |
| `@afenda/ui-system` | Server-only / DB / secrets |
| `@afenda/emails` | Import from client components in `apps/web` |
| Any R1-F ERP | Peer R1-F package imports without dual-control approved edge; `@afenda/admin` |

---

## Add an import

```text
[ ] Declared in this package.json
[ ] Matching approved row in docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml (or add both in the same mission)
[ ] Package name / exports subpath (not deep src/)
[ ] Same or lower rank; no apps/* upward; no peer ERP unless dual-control approved
[ ] No cycle; update target exports if new public surface
```

---

## Verify

```text
1. pnpm --filter @afenda/web test -- feature-db-boundary ui-boundary auth-sdk-boundary
2. pnpm typecheck
3. rg "from [\"']\\.\\./.*/packages/" apps packages --glob "*.{ts,tsx}"
4. rg "from [\"']@afenda/[^\"']+/src/" apps packages --glob "*.{ts,tsx}"
5. pnpm validate:modules
   (Phase 2 Living — WORKSPACE-EDGE-REGISTER ↔ package.json reconcile + living ERP gates; also in CI quality)
```

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Relative / deep `src` imports | Breaks package public door |
| Package → `apps/*` | Inverts the DAG |
| `@afenda/shared` mega-package | Collapses boundaries |
| Peer ERP import without dual-control | Ownership / DAG drift |
| Band used as import permission | Bands classify only |

Companion: [../pnpm/README.md](../pnpm/README.md) (incl. **Peer Observations (disposed)** — fumadocs-mdx/vite · Neon Auth optionals) · [../discipline/README.md](../discipline/README.md) · [../nextjs/folders.md](../nextjs/folders.md) · accepted reference [../_scratch/packages_refactor_v2.3.md](../_scratch/packages_refactor_v2.3.md).
