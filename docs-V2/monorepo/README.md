# Monorepo boundaries

| Field | Value |
|-------|-------|
| Surface | `docs-V2/monorepo/README.md` |
| Authority | **Operative** (docs-V2 Scratch pack) — coding-standards · monorepo-discipline + disk `packages/*/*` · `apps/web` |
| Purpose | Lean import / layer / workspace rules + ERP expansion governance baseline |
| Updated | 2026-07-20 |
| Version | `monorepo-governance/2026-07-20` |
| Promoted from | [`packages_refactor_v2.3.md`](../_scratch/packages_refactor_v2.3.md) (historical stamp) · consolidated: [`packages_governance.md`](../_scratch/packages_governance.md) |
| Companion | [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) · [packages/README.md](../../packages/README.md) · [WORKSPACE-EDGE-REGISTER.yaml](../modules/WORKSPACE-EDGE-REGISTER.yaml) |

Re-probe after package add/rename or DAG change. Controlled Living `docs/` remains dormant until Docs-lane reopen — this pack + LAYERS.md are the named promotion targets.

### Phase status (2026-07-20)

| Phase | Meaning | Status |
|-------|---------|--------|
| **1** | Classification + banded catalog | **Done** — [packages/README.md](../../packages/README.md) |
| **2** | Dual-control validators (`pnpm validate:modules`) | **Done** — Living in CI; [PHASE-2-REPORT.md](../modules/PHASE-2-REPORT.md) |
| **3** | One-level category folders under `packages/` (imports stay `@afenda/<name>`) | **Done** — living shape `packages/<category>/<name>`. Evidence gate waived in writing 2026-07-20; program: [packages_governance.md](../_scratch/packages_governance.md). Categories are not packages (no `@afenda/foundation` etc.). |
| **4.1** | `@afenda/purchasing` P0 transactional package | **Done** — nest under `packages/erp/purchasing`; dual-control edges + manifest + permission catalog. |
| **4.2** | `@afenda/inventory` P0 transactional package | **Done** — nest under `packages/erp/inventory`; sole mutator of stock/ledger/reservation/balance; dual-control edges + manifest + permission catalog. |
| **4.3** | `@afenda/receiving` P0 transactional package | **Done** — nest under `packages/erp/receiving`; sole mutator of goods receipt/line/discrepancy; dual-control edges + manifest + permission catalog. |
| **4.4** | `@afenda/fulfillment` P0 transactional package | **Done** — nest under `packages/erp/fulfillment`; sole mutator of delivery/line/pick/pack/proof-of-delivery; dual-control edges + manifest + permission catalog. |
| **4.5** | `@afenda/receivables` P0 transactional package | **Done** — nest under `packages/erp/receivables`; sole mutator of invoice/line/credit-note/allocation/balance-projection; dual-control edges + manifest + permission catalog. |
| **4.6** | `@afenda/payables` P0 transactional package | **Done** — nest under `packages/erp/payables`; sole mutator of supplier invoice/line/credit-note/allocation/balance-projection/three-way-match result; dual-control edges + manifest + permission catalog. |
| **4.7** | `@afenda/payments` P0 transactional package | **Done** — nest under `packages/erp/payments`; sole mutator of payment/allocation/reversal; refunds use `payment.direction = refund` with no separate refund table; dual-control edges + manifest + permission catalog. |
| **4.8** | `@afenda/accounting` P0 transactional package | **Done** — nest under `packages/erp/accounting`; sole mutator of chart-of-account / ledger-account / account-role-mapping / posting-profile(+lines) / journal / journal-line / ledger-posting / accounting-period / source-posting-link / financial-posting-exception; period open→soft_closed→closed+reopen; 17 fine permissions; dual-control edges + manifest + permission catalog; Scratch [erp/accounting.md](../_scratch/erp/accounting.md) CLOSED 9.4/10. |
| **4** | New ERP packages from MODULE-ROADMAP | **Done — Phase 4 complete.** All authorized roadmap ERP packages were promoted package-by-package ([packages_governance.md](../_scratch/packages_governance.md)). |

Still out of scope for this pack (separate missions): `@afenda/module-catalog` runtime · `@afenda/authorization` extraction · `@afenda/jobs` · new transaction-core packages.

---

## Layers (disk)

Imports flow **down** only. Packages never import `apps/*`. No cycles.

| Rank | Layer | Packages |
|------|-------|----------|
| 3 | Application | `apps/web` · `apps/docs` (`@afenda/docs`) |
| 2 | Surfaces | `@afenda/ui-system` · `@afenda/emails` |
| 1 | Platform | `@afenda/db` · `@afenda/auth` · `@afenda/admin` · `@afenda/env` · `@afenda/errors` · `@afenda/testing` · `@afenda/logger` · `@afenda/rate-limit` · `@afenda/cache` · `@afenda/audit` · `@afenda/search` · `@afenda/notifications` · `@afenda/events` · `@afenda/master-data` · `@afenda/sales` · `@afenda/purchasing` · `@afenda/inventory` · `@afenda/receiving` · `@afenda/fulfillment` · `@afenda/receivables` · `@afenda/payables` · `@afenda/payments` · `@afenda/accounting` · `@afenda/http` · `@afenda/security` · `@afenda/metrics` · `@afenda/openapi` · `@afenda/ai-the-machine` · `@afenda/config` |

### Rank-1 bands (classification only)

Bands never grant import rights. Every edge is package-specific via dual-control (below). Catalog: [packages/README.md](../../packages/README.md).

| Band | Kind | On-disk path |
|------|------|--------------|
| R1-A | Foundation | `packages/foundation/{config,env,errors,testing}` |
| R1-B | Runtime | `packages/runtime/{logger,http,security,metrics,openapi,rate-limit,cache}` |
| R1-C | Data plane | `packages/data-plane/{db,audit,events,search,notifications}` |
| R1-D | Control plane | `packages/control-plane/{auth,admin}` |
| R1-F | ERP | `packages/erp/{master-data,sales,purchasing,inventory,receiving,fulfillment,receivables,payables,payments,accounting}` |
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

**Default:** peer ERP packages (`R1-F`) do **not** import each other. Living dual-control edges for `@afenda/sales` / `@afenda/purchasing` / `@afenda/inventory` / `@afenda/receiving` / `@afenda/fulfillment` / `@afenda/receivables` / `@afenda/payables` / `@afenda/payments` / `@afenda/accounting` to their platform dependencies are listed in the register.

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

`@afenda/config` = devDep / tsconfig / Biome extend only — not a runtime import. `@afenda/errors` = transport-neutral AppError / codes / Result / http / postgres-adapter leaf (no Next.js · no DB drivers). `@afenda/logger` = Pino Node logger + edge emit leaf (`pino` only; no APM). `@afenda/http` = Fetch compose · correlation (`x-correlation-id`) · pagination · Retry-After / `X-RateLimit-*` / `Server-Timing` header leaf (no Next.js · no `@afenda/*` runtime deps). `@afenda/security` = security headers · CSP · CORS builders leaf (no Next.js · no `@afenda/*` runtime deps; living `next.config` adapts `securityHeadersForNext()` with Permissions-Policy; strict CSP / HSTS stay opt-in; RH CORS via `createPlatformRouteHandler({ cors })`). `@afenda/metrics` = Prometheus registry · HTTP/DB/cache instruments · scrape text leaf (`prom-client` only; no Next.js · no `@afenda/*` runtime deps · no OTEL/APM). `@afenda/openapi` = Zod→OpenAPI glue · `{ data }` envelope · `x-afenda-*` stamps · YAML emit leaf (`zod` + `@asteasolutions/zod-to-openapi` + `yaml`; no Next.js · no `@afenda/*` runtime deps · no product Swagger under `apps/web`; path registration stays in `scripts/generate-openapi.mts`; docs UI stays `@afenda/docs`). `@afenda/ai-the-machine` = AI SDK conversational engine (prompt-only assistants; web injects Gateway model + session context; no Next.js / `@afenda/db`). DNA: [../ai/ai-the-machine-dna.md](../ai/ai-the-machine-dna.md). **No `@afenda/api-middleware`** — Vierp DNA absorb/reject matrix: [../api/middleware-dna.md](../api/middleware-dna.md). **No `@afenda/feature-flags`** — Vierp tier-catalog DNA absorb/reject (ops toggles stay on `@afenda/env`): [../entitlements/entitlements-dna.md](../entitlements/entitlements-dna.md). Metrics DNA: [../observability/metrics-dna.md](../observability/metrics-dna.md). `@afenda/rate-limit` → `@afenda/env` · `@afenda/errors` (+ Upstash SDK); Upstash on Vercel multi-instance, process memory only for non-production without keys; hit results include quota for `X-RateLimit-*`. `@afenda/cache` → `@afenda/env` · `@afenda/errors` (+ Upstash Redis L2); L1+L2 when keys set, L1-only for non-production without keys, fail closed in Vercel production without Upstash; shares Upstash with rate-limit under `@afenda/cache:` prefix (never `FLUSHDB`). `@afenda/audit` → `@afenda/db` · `@afenda/errors` (sole `platform_audit_log` write/list/export/purge SSOT — general domain activity; distinct from RBAC; first living caller = `apps/web` `deleteOrganizationAction`). `@afenda/search` → `@afenda/db` · `@afenda/errors` (sole `platform_search_document` Postgres FTS upsert/search/delete SSOT — product search; docs Orama stays in `@afenda/docs`; no paid search SaaS). `@afenda/notifications` → `@afenda/db` · `@afenda/errors` (sole `platform_notification` IN_APP write/list/mark-read/unread SSOT — no WebSocket / Redis primary / multi-channel claims; first living caller = `apps/web` `assignOrgRoleAction` via events handler). Notifications DNA: [../notifications/README.md](../notifications/README.md). `@afenda/events` → `@afenda/db` · `@afenda/errors` (sole `platform_domain_event` outbox publish/claim/query/purge SSOT — no NATS / Redis bus; handlers injected from `apps/web`; first living caller = `apps/web` `assignOrgRoleAction` → `identity.org_role.assigned`). Events DNA: [../events/events-dna.md](../events/events-dna.md). `@afenda/master-data` → `@afenda/db` · `@afenda/errors` · `@afenda/audit` · `@afenda/events` · `@afenda/search` (sole mutation owner for Authority B `ref_*` + `md_party` · `md_item_group` · `md_item` · `md_warehouse`; UoM = platform `ref_uom` only; search projectors write derived `platform_search_document` rows). Master-data DNA: [../master-data/README.md](../master-data/README.md). `@afenda/sales` → `@afenda/db` · `@afenda/errors` · `@afenda/audit` · `@afenda/events` · `@afenda/master-data` (sales_order / sales_order_line transactional consumer; FK + snapshots only — ARCH-006). `@afenda/receiving` → `@afenda/db` · `@afenda/errors` · `@afenda/audit` · `@afenda/events` · `@afenda/master-data` (goods_receipt / goods_receipt_line / receiving_discrepancy transactional consumer; FK + snapshots only — ARCH-006). `@afenda/fulfillment` → `@afenda/db` · `@afenda/errors` · `@afenda/audit` · `@afenda/events` · `@afenda/master-data` (delivery / delivery_line / delivery_pick / delivery_pack / proof_of_delivery transactional consumer; Sales and Inventory integration is events-only — ARCH-006). Contract: [../master-data/arch-006-consumer-contract.md](../master-data/arch-006-consumer-contract.md). `@afenda/auth` → `@afenda/env` · `@afenda/http` · `@afenda/logger` · `@afenda/rate-limit` · `@afenda/errors` (incl. session-scoped `persistActiveOrganization` for RH/Action; BFF POST rate limit + RateLimit/Server-Timing headers). `@afenda/admin` → `@afenda/auth` · `@afenda/db` · `@afenda/env` · `@afenda/errors` (org-console services; sole `platform_rbac_audit` write/list SSOT — no dual writer under `apps/web`; `provisionOrganization` = create → setActive → invite; health probes + readiness `latencyMs` SSOT — web domain re-exports). RBAC audit callers use `@afenda/admin/audit`; general activity audit callers use `@afenda/audit`; health callers use `@afenda/admin/health` (no Neon Auth client load). App domain: `apps/web/modules/*` · `features/*`.

`@afenda/payables` → `@afenda/db` · `@afenda/errors` · `@afenda/events` (supplier_invoice / supplier_invoice_line / supplier_credit_note / supplier_allocation / supplier_balance_projection / three_way_match_result transactional owner; Purchasing and Receiving references are identities and DB-level FKs; cross-module integration is events-only — ARCH-006).

`@afenda/payments` → `@afenda/db` · `@afenda/errors` · `@afenda/events` (payment / payment_allocation / payment_reversal transactional owner; refunds are payment rows with `direction = refund`; Receivables, Payables, and Accounting integration is events-only — ARCH-006).

`@afenda/accounting` → `@afenda/db` · `@afenda/errors` · `@afenda/events` (chart_of_account / ledger_account / account_role_mapping / posting_profile(+lines) / journal / journal_line / ledger_posting / accounting_period / source_posting_link / financial_posting_exception transactional owner; peer ERP integrations are events-only via `postFinancialSourceEvent` — ARCH-006 label).

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
| `@afenda/inventory` | Next.js; Surfaces / `apps/*`; dual-write `md_*`; local product shadow tables; peer ERP direct writes to on_hand/available/reserved/ledger/movement; peer ERP `package.json` edges without WORKSPACE-EDGE-REGISTER approval |
| `@afenda/fulfillment` | Next.js; Surfaces / `apps/*`; dual-write `md_*` or `stock_*`; local item/warehouse shadow tables; direct Sales/Inventory package imports; peer ERP `package.json` edges without WORKSPACE-EDGE-REGISTER approval |
| `@afenda/receivables` | Next.js; Surfaces / `apps/*`; dual-write `md_*`, `sales_order*`, payment, ledger, or journal tables; local customer/item shadow tables; direct peer ERP imports; peer ERP `package.json` edges without WORKSPACE-EDGE-REGISTER approval |
| `@afenda/payables` | Next.js; Surfaces / `apps/*`; dual-write `md_*`, `purchase_order*`, `goods_receipt*`, payment, ledger, or journal tables; local supplier/item shadow tables; direct peer ERP imports; peer ERP `package.json` edges without WORKSPACE-EDGE-REGISTER approval |
| `@afenda/payments` | Next.js; Surfaces / `apps/*`; separate refund tables; dual-write receivables, payables, ledger, journal, or accounting tables; direct peer ERP imports; peer ERP `package.json` edges without WORKSPACE-EDGE-REGISTER approval |
| `@afenda/accounting` | Next.js; Surfaces / `apps/*`; dual-write peer ERP tables; mutable posted journal lines; direct peer ERP imports; peer ERP `package.json` edges without WORKSPACE-EDGE-REGISTER approval |
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
5. pnpm governance:packages
   (catalog-to-disk · WORKSPACE-EDGE-REGISTER · SCHEMA-OWNERSHIP-MANIFEST · DAG · living ERP gates; also in CI quality)
   Equivalent Phase 2 entrypoint: `pnpm validate:modules`
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

Companion: [../pnpm/README.md](../pnpm/README.md) (incl. **Peer Observations (disposed)** — fumadocs-mdx/vite · Neon Auth optionals) · [../discipline/README.md](../discipline/README.md) · [../nextjs/folders.md](../nextjs/folders.md) · Scratch program [../_scratch/packages_governance.md](../_scratch/packages_governance.md).
