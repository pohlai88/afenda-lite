# `@afenda/purchasing`

Band: **R1-F ERP** · Layer: Rank-1 · Package: `@afenda/purchasing`

Org-scoped purchase orders (`draft` → `posted` → `closed`, with `↘ cancelled` from draft only), master-data FK + commercial snapshots, same-TX audit/outbox. Outcomes use `@afenda/errors` `Result` — this package does not own HTTP status lines, `NextResponse`, NATS, or Action envelopes.

**Tables live in `@afenda/db`.** Mutations are sole-owned here — do not dual-write `purchase_order` / `purchase_order_line` from `apps/web`. Do not invent shadow supplier/product tables (`purchase_supplier`, local item catalogs).

Use this package from Platform / app server code when creating draft purchase orders, adding priced lines (with over/under-receipt and invoice tolerance percents), posting, cancelling drafts, or closing posted orders. Masters resolve through `@afenda/master-data` lookups — never mutate `md_*` from the purchasing store. Supplier parties must carry an active `supplier` role in `md_party_role`. Toolchain: root `engines` **Node 24.x** · **pnpm ≥10.33.4** (`packageManager` pin); run package checks from the repository root.

## Consume

Workspace dependency — import commands from the root barrel:

```ts
import {
  createDraftPurchaseOrder,
  addPurchaseOrderLine,
  postPurchaseOrder,
  cancelPurchaseOrder,
  closePurchaseOrder,
  getPurchaseOrderById,
  listPurchaseOrders,
  type PurchasingCommandOptions,
} from "@afenda/purchasing";

const options: PurchasingCommandOptions = {
  // apps/web: createPurchasingCommandOptions()
  // authorization + masterAuthorization + commitmentQuery (close)
};

const order = await createDraftPurchaseOrder(
  {
    organizationId,
    actorUserId,
    correlationId,
    idempotencyKey,
    code: "PO-1001",
    partyId,
    currencyCode: "USD",
    paymentTermId, // optional
    warehouseId, // optional receiving destination
    exchangeRate, // optional
  },
  options,
);
if (!order.ok) {
  // map Result at the adapter — do not invent { success, data }
}
```

Pass request-scoped `organizationId`, `actorUserId`, `correlationId`, and `idempotencyKey` on every material mutation. Queries require `organizationId`, `actorUserId`, and `correlationId`. Party must have an **active supplier role**; items / payment-term / warehouse refs must be same-org masters; post freezes commercial snapshots and document totals. State-changing mutations that use OCC require `expectedVersion`.

**Authorization:** every public command and org-scoped query enforces its declared permission through an injected `PurchasingAuthorizationPort` (composition root — never import `@afenda/admin` here). Route-level checks in `apps/web` are not sufficient.

| Operation | Permission |
| --- | --- |
| `createDraftPurchaseOrder` | `purchasing.order.create` |
| `addPurchaseOrderLine` | `purchasing.order.update` |
| `postPurchaseOrder` | `purchasing.order.post` |
| `cancelPurchaseOrder` | `purchasing.order.cancel` |
| `closePurchaseOrder` | `purchasing.order.close` |
| `getPurchaseOrderById` | `purchasing.order.read` |
| `listPurchaseOrders` | `purchasing.order.list` |

Operation IDs and maps live in `src/module.manifest.ts` (export `@afenda/purchasing/module-manifest`). Fine-grained `purchasing.order.*` only — coarse `purchasing.read` / `purchasing.manage` are removed.

**Close:** requires injected `PurchaseOrderCommitmentQueryPort` (apps/web SQL adapter at `apps/web/lib/erp/purchasing-commitment-query-port.ts`). Posted orders may always close (partial fulfilment OK — remaining commitment terminated). Cancel is **draft only**.

**Boundary:** this package must not import `@afenda/receiving` or `@afenda/payables`. Goods-receipt create/post PO source-state is a **Receiving-owned** query port at the composition root — not this package’s commitment port.

**Living consumers:** `apps/web` thin Actions + `features/purchasing/*` + `/admin/purchasing` · `/client/purchasing`. Event types: `purchasing.order.created.v1` · `line_added` · `posted` · `cancelled` · `closed` (catalog in `@afenda/events`).

## Store / ports

`PurchasingStore` mutation methods are the atomic unit of work. Both adapters guarantee:

```text
aggregate mutation + audit fact + outbox event = one atomic commit
```

| Surface | Backend |
|---------|---------|
| Production default | `DrizzlePurchasingStore` (`@afenda/purchasing/adapters/drizzle`) → `@afenda/db` — org mutations use `runNeonHttpTransaction` CTE (entity + `platform_audit_log` + `platform_domain_event` same TX) |
| Vitest injection | `MemoryPurchasingStore` (`@afenda/purchasing/testing`) + memory `AuditFactPort` / `OutboxPort` + `createMemoryCommitmentQueryPort` |
| Master lookup | Defaulted via `PurchasingCommandOptions` → `@afenda/master-data` (read FK / code / snapshot / supplier role / warehouse only) |
| Commitment query | Port type in package; SQL adapter only in `apps/web` |

`MutationPorts` remain on the store interface so the memory adapter can inject audit/outbox. Drizzle embeds equivalent SQL side-effects inside the same transaction and does not call those ports — ports are an adapter-private mechanism, not a second command path.

## Module conformance

`@afenda/purchasing` exports `src/module.manifest.ts` (`band: R1-F`). The manifest declares owned aggregates, command/query IDs, mutation tables, emitted event IDs (imported from `@afenda/events`), permission codes, and authorization maps.

```bash
pnpm validate:modules
```

## Invariants

- Every order belongs to exactly one organization.
- Supplier, item, UoM, payment-term, and warehouse references must resolve within that organization.
- The party must have an active supplier role.
- Order code uniqueness is organization-scoped.
- Draft orders may be edited; posted orders are immutable except via explicit close.
- Cancel is draft-only; close is posted-only and terminal.
- Posting freezes commercial snapshots and document totals on the aggregate.
- Every material mutation accepts an idempotency key and is version-checked where state changes.
- Aggregate mutation, audit fact and outbox event commit atomically.
- No public command or organization-scoped query runs without its declared permission.
- No app or peer package writes the Purchasing mutation tables.
- Package must not import `@afenda/receiving` or `@afenda/payables` — commitment is a port.

## Maintain

```bash
pnpm --filter @afenda/purchasing lint
pnpm --filter @afenda/purchasing typecheck
pnpm --filter @afenda/purchasing test
pnpm --filter @afenda/purchasing check
```

Canonical anti-shadow enforcement is `pnpm validate:modules` plus package `__tests__/anti-shadow.test.ts`. Local diagnostic only:

```bash
rg "sales_customer|purchase_supplier|inventory_product|finance_vendor" packages apps --glob "!**/node_modules/**"
```

## Public surfaces

| Path | Role |
|------|------|
| `@afenda/purchasing` | Commands/queries, public schemas and types, permission codes, metrics name constants, Purchasing error codes, authorization + commitment port types, `PurchasingStore` interface |
| `@afenda/purchasing/adapters/drizzle` | `DrizzlePurchasingStore` and production default composition |
| `@afenda/purchasing/testing` | `MemoryPurchasingStore` + `createMemoryCommitmentQueryPort` for Vitest |
| `@afenda/purchasing/module-manifest` | Module manifest |

The root surface never exports raw Drizzle tables, query builders, database handles, Next.js types, or HTTP envelopes.

## Ownership

| Surface | Owner |
|---------|-------|
| `purchase_order` / `purchase_order_line` schema · hard-tenant roots | `@afenda/db` |
| Purchase-order mutation authority · lifecycle · snapshots · tolerances | `@afenda/purchasing` |
| Purchasing-specific operation IDs · permission codes · error codes · metric names | `@afenda/purchasing` |
| Generic `Result` and error primitives | `@afenda/errors` |
| Party · Item · Payment term · Warehouse masters | `@afenda/master-data` |
| `purchasing.*` event contracts | `@afenda/events` |
| Grants and authorization evaluation | authorization subsystem via injected adapter |
| Commitment SQL adapter · ActionResult · purchasing UI | `apps/web` |

**Approved edge:** `@afenda/purchasing` → `@afenda/master-data` must exist in `package.json` and [WORKSPACE-EDGE-REGISTER.yaml](../../../docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml).

Must not import Surfaces, `apps/*`, or Next.js. See [docs-V2/monorepo](../../../docs-V2/monorepo/README.md).

## Operations

| Concern | Guidance |
|---------|----------|
| Correlation | Every command and query input requires `correlationId`; Action adapters stamp from request attribution |
| Idempotency | Material mutations require `idempotencyKey`; create/line unique indexes; post/cancel/close keys stored for safe replay |
| Natural key | Org-scoped `normalizedCode` uniqueness — duplicate create returns `CONFLICT` (distinct from idempotent replay) |
| Optimistic concurrency | `post` / `cancel` / `close` require matching `expectedVersion` |
| Migration | Apply `@afenda/db` journal tags `0012_purchase_order` + `0021_purchase_order_idempotency` + `0022_purchase_order_close_commercial` via package migrate (allow-guarded). Leave migrate to Ops/parent after SQL lands. |
| Permission catalog | `pnpm --filter @afenda/db db:ensure-permission-catalog` seeds `purchasing.order.*` (removes retired `purchasing.read`/`manage`) |
| Close vs cancel | Cancel = draft only. Close = posted only; always allowed (partial fulfilment OK). Do not hard-delete posted/closed rows. |
| Repair | No hard delete of orders; repair via compensating close/cancel or data-lane SQL under Ops |
| Metrics | Named constants `PURCHASING_METRIC_COMMAND` (+ command/outcome labels) exported from barrel. Rank-1 ERP must not depend on `@afenda/metrics` — apps/web Actions emit after `Result`. Platform scrape: `GET /api/metrics`. |
| Verify | `pnpm --filter @afenda/purchasing check` · `pnpm validate:modules` · `pnpm --filter @afenda/web test -- product-authorization-wiring` · `pnpm --filter @afenda/db test -- purchasing-schema` |
| Lifecycle | `draft \| posted \| cancelled \| closed` |

## Out of scope

Do not add to this package: shadow supplier/product tables, `md_*` mutations, Receiving / Inventory / Payables ownership, Next.js handlers, tutorial `{ success, data }` envelopes, or a second tenancy model (shared schema · hard `organization_id` only).

## Authority

| Topic | Link |
|-------|------|
| Scratch package notes | [purchasing.md](../../../docs-V2/_scratch/erp/purchasing.md) |
| ARCH-006 consumer contract (Scratch) | [arch-006-consumer-contract.md](../../../docs-V2/master-data/arch-006-consumer-contract.md) |
| Master-data spine | [docs-V2/master-data](../../../docs-V2/master-data/README.md) |
| Package DAG | [docs-V2/monorepo](../../../docs-V2/monorepo/README.md) · [LAYERS.md](../../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Events catalog | [docs-V2/events](../../../docs-V2/events/README.md) · [`@afenda/events`](../../data-plane/events/README.md) |
| Tenancy · shared schema | [docs-V2/tenancy](../../../docs-V2/tenancy/README.md) |
| Package governance (Scratch accepted) | [packages_governance.md](../../../docs-V2/_scratch/packages_governance.md) |
| Agent checkout posture | [AGENTS.md](../../../AGENTS.md) |
