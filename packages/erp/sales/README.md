# `@afenda/sales`

Band: **R1-F ERP** · Layer: Rank-1 · Package: `@afenda/sales`

Org-scoped sales orders (`draft` → `posted` | `cancelled`), master-data FK + commercial snapshots, same-TX audit/outbox. Outcomes use `@afenda/errors` `Result` — this package does not own HTTP status lines, `NextResponse`, NATS, or Action envelopes.

**Tables live in `@afenda/db`.** Mutations are sole-owned here — do not dual-write `sales_order` / `sales_order_line` from `apps/web`. Do not invent shadow customer/product tables (`sales_customer`, local item catalogs).

**Recorded (forward):** `closed` / `closeSalesOrder` — not on the public surface; v1 statuses are `draft | posted | cancelled` only.

Use this package from Platform / app server code when creating draft orders, adding lines, posting, or cancelling. Masters resolve through `@afenda/master-data` lookups — never mutate `md_*` from the sales store. Toolchain: root `engines` **Node 24.x** · **pnpm ≥10.33.4** (`packageManager` pin); run package checks from the repository root.

## Consume

Workspace dependency — import commands from the root barrel:

```ts
import {
  createDraftSalesOrder,
  addSalesOrderLine,
  postSalesOrder,
  cancelSalesOrder,
  getSalesOrderById,
  listSalesOrders,
} from "@afenda/sales";

const order = await createDraftSalesOrder({
  organizationId,
  actorUserId,
  correlationId,
  idempotencyKey,
  code: "SO-1001",
  partyId,
  currencyCode: "USD",
  paymentTermId, // optional
});
if (!order.ok) {
  // map Result at the adapter — do not invent { success, data }
}
```

Pass request-scoped `organizationId`, `actorUserId`, `correlationId`, and `idempotencyKey` on every material mutation. Queries require `organizationId`, `actorUserId`, and `correlationId`. Party must have an **active customer role**; items must be active/sellable; payment-term refs must be same-org masters. Create requires `currencyCode`; lines require `unitPrice` (optional discount / tax classification). Post freezes commercial snapshots (party/item/UoM/payment-term, currency, pricing, and document totals). `listSalesOrders` accepts allowlisted `sort` (`updatedAt:desc` default; also `updatedAt:asc`, `createdAt:desc|asc`, `code:asc|desc`) with a stable secondary `id` tie-breaker in the **same direction** as the primary key — offset pagination stays deterministic when timestamps collide. Material mutations that change aggregate state (line-add, post, cancel) require `expectedVersion` OCC.

**Authorization:** every public command and org-scoped query enforces its declared permission through an injected `SalesAuthorizationPort` (composition root — never import `@afenda/admin` here). Route-level checks in `apps/web` are not sufficient.

| Operation | Permission |
| --- | --- |
| `createDraftSalesOrder` | `sales.order.create` |
| `addSalesOrderLine` | `sales.order.update` |
| `postSalesOrder` | `sales.order.post` |
| `cancelSalesOrder` | `sales.order.cancel` |
| `getSalesOrderById` | `sales.order.read` |
| `listSalesOrders` | `sales.order.list` |

Operation IDs and maps live in `src/module.manifest.ts` (export `@afenda/sales/module-manifest`).

**Living consumers:** `apps/web` thin Actions + `features/sales/*`. Event types: `sales.order.created.v1` · `sales.order.line_added.v1` · `sales.order.posted.v1` · `sales.order.cancelled.v1` (catalog in `@afenda/events`).

## Store / ports

`SalesStore` mutation methods are the atomic unit of work. Both adapters guarantee:

```text
aggregate mutation + audit fact + outbox event = one atomic commit
```

| Surface | Backend |
|---------|---------|
| Production default | `DrizzleSalesStore` (`@afenda/sales/adapters/drizzle`) → `@afenda/db` — org mutations use `runNeonHttpTransaction` CTE (entity + `platform_audit_log` + `platform_domain_event` same TX) |
| Vitest injection | `MemorySalesStore` (`@afenda/sales/testing`) + injectable `MutationPorts` (memory `AuditFactPort` / `OutboxPort`) |
| Master lookup | `createMasterDataLookupPort` → `@afenda/master-data` (read FK / code / snapshot / customer-role only) |

`MutationPorts` stay on the store method signature for memory injection. Drizzle embeds equivalent SQL side-effects in the same TX and does not call those ports. Export hygiene: `MutationPorts` is published from `@afenda/sales/testing` only — not from the root barrel and not from `./adapters/drizzle` (OBS-01/OBS-02 closed; no dual root+subpath convenience export).

## Module conformance

`@afenda/sales` exports `src/module.manifest.ts` (`band: R1-F`). The manifest declares owned aggregates, command/query IDs, mutation tables, emitted event IDs (imported from `@afenda/events`), permission codes, and authorization maps.

```bash
pnpm validate:modules
```

## Invariants

- Every order belongs to exactly one organization.
- Customer, item, UoM and payment-term references must resolve within that organization.
- The party must have an active customer role.
- The item must be active (sellable) when lines are added or the order is posted.
- Order code uniqueness is organization-scoped.
- Draft orders may be edited; posted orders are immutable except via explicit cancel.
- Posting freezes commercial snapshots present on the aggregate (currency, line pricing, tax total, document totals).
- Header commercial fields: `currencyCode` (required), optional addresses / exchange rate / payment-term name.
- Line commercial fields: `unitPrice` (required), optional `discountAmount` / `taxClassification`, computed `lineAmount`.
- Document totals on post: `subtotalAmount` (sum of line amounts), `discountTotal` (sum of line discounts), `taxTotal`, `documentTotal` (= subtotal + tax).
- Party must be active; payment term (when set) must be active on create and post.
- Every material mutation accepts an idempotency key; line-add, post, and cancel are version-checked (`expectedVersion`).
- Aggregate mutation, audit fact and outbox event commit atomically.
- No public command or organization-scoped query runs without its declared permission.
- No app or peer package writes the Sales mutation tables.

## Maintain

```bash
pnpm --filter @afenda/sales lint
pnpm --filter @afenda/sales typecheck
pnpm --filter @afenda/sales test
pnpm --filter @afenda/sales check
```

Canonical anti-shadow enforcement is `pnpm validate:modules` plus package `__tests__/anti-shadow.test.ts`. Local diagnostic only:

```bash
rg "sales_customer|purchase_supplier|inventory_product|finance_vendor" packages apps --glob "!**/node_modules/**"
```

## Public surfaces

| Path | Role |
|------|------|
| `@afenda/sales` | Commands/queries, public schemas and types, permission codes, Sales error codes, authorization port types |
| `@afenda/sales/adapters/drizzle` | `DrizzleSalesStore`, `SalesStore` record types, `MasterLookupPort` |
| `@afenda/sales/testing` | `MemorySalesStore`, `SalesStore` record types, `MasterLookupPort`, `MutationPorts` |
| `@afenda/sales/module-manifest` | Module manifest |

The root surface never exports store/port adapter types, raw Drizzle tables, query builders, database handles, Next.js types, or HTTP envelopes. List sort helpers live under `src/shared/list-sort.ts` (memory + Drizzle both apply the allowlisted sorts + `id` tie-breaker).

## Ownership

| Surface | Owner |
|---------|-------|
| `sales_order` / `sales_order_line` schema · hard-tenant roots | `@afenda/db` |
| Sales-order mutation authority · lifecycle · snapshots | `@afenda/sales` |
| Sales-specific operation IDs · permission codes · error codes | `@afenda/sales` |
| Generic `Result` and error primitives | `@afenda/errors` |
| Party · Item · Payment term masters | `@afenda/master-data` |
| `sales.*` event contracts | `@afenda/events` |
| Grants and authorization evaluation | authorization subsystem via injected adapter |
| ActionResult adapters · sales UI | `apps/web` |

**Approved edge:** `@afenda/sales` → `@afenda/master-data` must exist in `package.json` and [WORKSPACE-EDGE-REGISTER.yaml](../../../docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml).

Must not import Surfaces, `apps/*`, or Next.js. See [docs-V2/monorepo](../../../docs-V2/monorepo/README.md).

## Out of scope

Do not add to this package: shadow customer/product tables, `md_*` mutations, Purchasing / Inventory / Finance ownership, Next.js handlers, tutorial `{ success, data }` envelopes, or a second tenancy model (shared schema · hard `organization_id` only).

## Authority

| Topic | Link |
|-------|------|
| ARCH-006 consumer contract (Scratch) | [arch-006-consumer-contract.md](../../../docs-V2/master-data/arch-006-consumer-contract.md) |
| Master-data spine · R5 remaining | [docs-V2/master-data](../../../docs-V2/master-data/README.md) · [remaining-slices.md](../../../docs-V2/master-data/remaining-slices.md) |
| Package DAG | [docs-V2/monorepo](../../../docs-V2/monorepo/README.md) · [LAYERS.md](../../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Events catalog | [docs-V2/events](../../../docs-V2/events/README.md) · [`@afenda/events`](../../data-plane/events/README.md) |
| Sales order contract (Scratch) | [sales-order-contract.md](../../../docs-V2/sales/sales-order-contract.md) |
| Tenancy · shared schema | [docs-V2/tenancy](../../../docs-V2/tenancy/README.md) |
| Package governance (Scratch accepted) | [packages_governance.md](../../../docs-V2/_scratch/packages_governance.md) |
| Agent checkout posture | [AGENTS.md](../../../AGENTS.md) |
