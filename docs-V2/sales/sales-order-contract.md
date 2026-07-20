# Sales order contract (Scratch)

Band: **R1-F ERP** · Package: `@afenda/sales` · Tables: `@afenda/db`

Operational SSOT for deeper Sales Order rules that would overload the package README. Tier A companions: package README · `module.manifest.ts` · `docs-V2/_scratch/packages_governance.md`. Living ARCH bodies are absent on this checkout.

## Aggregate

| Entity | Table | Notes |
|--------|-------|-------|
| Sales order | `sales_order` | Org-scoped; statuses `draft` \| `posted` \| `cancelled` |
| Sales order line | `sales_order_line` | Belongs to one order; base UoM from item |

## Lifecycle

```text
draft ──post──► posted
  │                │
  └──cancel────────┴──► cancelled
```

- Draft: create, add lines, cancel.
- Posted: immutable except explicit cancel (reversal path).
- Cancelled: terminal; no further mutations.

## Master validation

| Reference | Rule |
|-----------|------|
| Party | Same org; **active**; active `customer` role in `md_party_role` |
| Item | Same org; **active** (sellable) on line add and post |
| UoM | Item base UoM must resolve via ref UoM |
| Payment term | Optional; when set, same org and **active** on create and post |

## Commercial snapshot (frozen on post)

**Header:** party code/name · bill-to / ship-to address snapshots · payment-term code/name/net days · `currencyCode` · `exchangeRate` · `subtotalAmount` · `discountTotal` · `taxTotal` · `documentTotal`

**Line:** item code/name · base UoM id/code · quantity · `unitPrice` · `discountAmount` · `taxClassification` · `lineAmount`

Money and quantities are decimal **strings**. `lineAmount = qty × unitPrice − discountAmount` (floor at 0). On post: `subtotalAmount = Σ lineAmount`, `discountTotal = Σ discountAmount`, `documentTotal = subtotalAmount + taxTotal`.

## Idempotency and concurrency

| Mutation | Key | Concurrency |
|----------|-----|-------------|
| Create | `createIdempotencyKey` (unique per org) | — |
| Add line | `lineIdempotencyKey` (unique per org+order) | `expectedVersion` |
| Post | `postIdempotencyKey` | `expectedVersion` |
| Cancel | `cancelIdempotencyKey` | `expectedVersion` |

Same key + same outcome returns the prior aggregate (or line). Version mismatch → `sales.order.version_conflict`.

## Events (`@afenda/events`)

| Event | When |
|-------|------|
| `sales.order.created.v1` | Draft created |
| `sales.order.line_added.v1` | Line added |
| `sales.order.posted.v1` | Posted |
| `sales.order.cancelled.v1` | Cancelled |

Emitted in the same TX as aggregate + audit fact.

## Permissions

| Operation | Permission |
|-----------|------------|
| `createDraftSalesOrder` | `sales.order.create` |
| `addSalesOrderLine` | `sales.order.update` |
| `postSalesOrder` | `sales.order.post` |
| `cancelSalesOrder` | `sales.order.cancel` |
| `getSalesOrderById` | `sales.order.read` |
| `listSalesOrders` | `sales.order.list` |

Enforced inside package via `SalesAuthorizationPort`. Coarse `sales.read` / `sales.manage` are retired.

## Queries

`listSalesOrders`: org stamp · `page` / `pageSize` (≤100) · optional `status` filter · allowlisted `sort` (`updatedAt:desc` default; also `updatedAt:asc`, `createdAt:desc|asc`, `code:asc|desc`). Every allowlisted sort applies a stable secondary `id` order in the **same direction** as the primary key so offset pages do not duplicate or skip rows when primary values tie. No cursor API. No cross-tenant leakage.

## Adapter export map

| Subpath | Publishes |
|---------|-----------|
| `@afenda/sales` | Commands/queries · schemas · types · permissions · error codes · auth port types |
| `@afenda/sales/adapters/drizzle` | `DrizzleSalesStore` · `SalesStore` records · `MasterLookupPort` — **not** `MutationPorts` |
| `@afenda/sales/testing` | `MemorySalesStore` · `SalesStore` records · `MasterLookupPort` · `MutationPorts` |
| `@afenda/sales/module-manifest` | Module manifest |

Drizzle embeds audit/outbox SQL in the mutation TX; memory injects `MutationPorts`. Do not restore `SalesStore` / `MutationPorts` on the root barrel.

## Downstream boundaries

| Module | Boundary |
|--------|----------|
| Inventory / Fulfillment / Receivables | Event consumers only — no dual-write of `sales_*` |
| Master Data | Read FK / snapshot / roles only — no `md_*` mutations from Sales |
| apps/web | Thin Actions + `features/sales/*`; map `Result` → `ActionResult` |

## Machine ownership

```text
permissions.ts · error-codes.ts · module.manifest.ts · schemas.ts
event contracts in @afenda/events
anti-shadow + domain Vitest
pnpm validate:modules
```
