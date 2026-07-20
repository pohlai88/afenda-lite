# Review verdict

This is a **strong package README and ownership statement**, but it is not yet fully aligned with the consolidated package-governance contract.

**Current score: 8.3/10**
**After the blocking fixes below: approximately 9.4/10**

The strongest parts are:

* clear table ownership;
* no shadow masters;
* no HTTP or Next.js leakage;
* same-transaction audit/outbox intent;
* explicit master-data read boundary;
* clear `Result` adapter boundary;
* production and test-store distinction;
* prohibition on raw Drizzle exports.

The main missing pieces are **authorization, module-manifest conformance, atomicity symmetry, lifecycle invariants, and corrected post-nesting paths**.

---

# Blocking findings

## 1. Relative links appear stale after Phase 3 nesting

Assuming this README now lives at:

```text
packages/erp/sales/README.md
```

the following links are likely still using the old flat-package depth:

```md
../../docs-V2/...
../../.cursor/...
../../AGENTS.md
../events/README.md
```

They should likely become:

```md
../../../docs-V2/...
../../../.cursor/...
../../../AGENTS.md
../../data-plane/events/README.md
```

Examples:

```md
[docs-V2/monorepo](../../../docs-V2/monorepo/README.md)

[LAYERS.md](../../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md)

[ARCH-006 consumer contract](../../../docs-V2/master-data/arch-006-consumer-contract.md)

[`@afenda/events`](../../data-plane/events/README.md)

[AGENTS.md](../../../AGENTS.md)
```

This is a **must-fix**, because the README may feed the package-doc generator and produce broken published links.

---

## 2. Authorization is missing from the package contract

The parent governance law requires every public ERP mutation and organization-scoped query to enforce its declared permission **inside the operation**, through an injected authorization port.

The README currently requires:

```text
organizationId
actorUserId
correlationId
```

but does not mention:

* `SalesAuthorizationPort`;
* Sales permission codes;
* command and query operation IDs;
* operation-to-permission mapping;
* authorization failure behavior;
* `module.manifest.ts`.

That is the largest architecture omission.

### Add an authorization section

```ts
export interface SalesAuthorizationPort {
  can(input: {
    organizationId: string;
    actorUserId: string;
    permission: SalesPermission;
  }): Promise<boolean>;
}
```

Recommended permission namespace:

```ts
export const salesPermissions = {
  orderCreate: "sales.order.create",
  orderUpdate: "sales.order.update",
  orderPost: "sales.order.post",
  orderRead: "sales.order.read",
  orderList: "sales.order.list",
} as const;
```

Every operation must map exactly once:

| Operation               | Permission           |
| ----------------------- | -------------------- |
| `createDraftSalesOrder` | `sales.order.create` |
| `addSalesOrderLine`     | `sales.order.update` |
| `postSalesOrder`        | `sales.order.post`   |
| `getSalesOrderById`     | `sales.order.read`   |
| `listSalesOrders`       | `sales.order.list`   |

A route-level check in `apps/web` is not sufficient.

---

## 3. The production and memory transaction contracts are asymmetric

This paragraph exposes a potential substitutability problem:

> `MutationPorts` remain on the store interface for test injection; Drizzle embeds SQL side-effects and does not call SQL ports.

That means the memory implementation and production implementation do not exercise the same abstraction:

```text
Memory store → AuditFactPort + OutboxPort
Drizzle store → direct audit/outbox SQL
```

Tests may therefore pass through behavior that production does not use.

### Better model

Define one atomic mutation boundary implemented by both adapters:

```ts
export interface SalesMutationUnitOfWork {
  createDraftOrder(input: CreateDraftOrderPersistenceInput): Promise<Result<SalesOrder>>;
  addOrderLine(input: AddOrderLinePersistenceInput): Promise<Result<SalesOrder>>;
  postOrder(input: PostOrderPersistenceInput): Promise<Result<SalesOrder>>;
}
```

Each implementation guarantees:

```text
aggregate mutation
+ audit fact
+ outbox event
= one atomic commit
```

| Implementation      | Atomicity                                       |
| ------------------- | ----------------------------------------------- |
| `DrizzleSalesStore` | Database transaction or single atomic statement |
| `MemorySalesStore`  | Snapshot/commit/rollback transaction harness    |

The application command should not care whether production achieves this through SQL CTEs, transaction batching, or another database mechanism.

### Avoid this contract

```text
Port exists, but one implementation ignores it.
```

That creates a test-only architecture rather than a production architecture.

---

## 4. The root barrel exports too much

The current exports description includes:

* commands;
* schemas;
* store interface;
* Drizzle store;
* memory store;
* master lookup;
* production ports;
* domain types.

That makes it easy for application code to instantiate testing adapters or bypass the canonical production composition.

### Recommended export boundaries

| Export                           | Contents                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `@afenda/sales`                  | Commands/services, public inputs and outputs, operation IDs, permission codes, manifest, public domain types |
| `@afenda/sales/adapters/drizzle` | `DrizzleSalesStore`, production composition helpers                                                          |
| `@afenda/sales/testing`          | `MemorySalesStore`, fake authorization, audit and outbox helpers                                             |
| `@afenda/sales/contracts`        | Public ports only, when external composition needs them                                                      |

Example:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./adapters/drizzle": "./src/adapters/drizzle/index.ts",
    "./testing": "./src/testing/index.ts"
  }
}
```

Do not expose `MemorySalesStore` from the normal production barrel.

---

## 5. Domain error ownership is too broad

This ownership row is risky:

| Surface                | Owner            |
| ---------------------- | ---------------- |
| `Result` / error codes | `@afenda/errors` |

`@afenda/errors` should own:

* `Result`;
* standard error structure;
* generic platform error categories;
* shared serialization or matching utilities.

But Sales should own Sales-specific error codes, such as:

```ts
export const salesErrorCodes = {
  orderNotFound: "sales.order.not_found",
  orderAlreadyPosted: "sales.order.already_posted",
  orderVersionConflict: "sales.order.version_conflict",
  customerNotEligible: "sales.customer.not_eligible",
  itemNotSellable: "sales.item.not_sellable",
} as const;
```

Otherwise, `@afenda/errors` gradually becomes a centralized registry for every domain’s business language.

### Corrected ownership

| Surface                                | Owner            |
| -------------------------------------- | ---------------- |
| `Result` and generic error primitives  | `@afenda/errors` |
| Sales-specific error codes and meaning | `@afenda/sales`  |
| HTTP status and ActionResult mapping   | `apps/web`       |

---

## 6. The package band should be explicit

“Rank-1 Platform” is too broad after introducing the formal band model.

Use:

```text
Band: R1-F ERP
Layer: Rank-1
Package: @afenda/sales
```

The dependency statement should also acknowledge that Sales → Master Data is an approved ERP edge, not a generally permitted peer-package dependency:

```text
The @afenda/sales → @afenda/master-data dependency must exist in both
package.json and WORKSPACE-EDGE-REGISTER.yaml.
```

---

# Domain contract gaps

## 7. The lifecycle is too narrow

The README currently says:

```text
draft → posted
```

For an enterprise Sales Order, this should at least decide what happens to abandoned or invalid drafts.

Recommended minimal lifecycle:

```text
draft → posted
draft → cancelled
posted → closed
posted → cancelled only through an explicit approved rule
```

Sales should not absorb Fulfillment or Receivables states. It can expose projections such as fulfilled quantity or invoiced quantity through approved read models, but it should not own delivery or invoice lifecycle.

### Recommended states

```ts
type SalesOrderStatus =
  | "draft"
  | "posted"
  | "closed"
  | "cancelled";
```

At minimum add:

```ts
cancelDraftSalesOrder;
closeSalesOrder;
```

If these operations are intentionally deferred, the README should explicitly say how unusable drafts and completed posted orders are handled.

---

## 8. Idempotency and optimistic concurrency are absent

The parent Phase 4 acceptance gate requires:

* material mutation idempotency;
* optimistic concurrency;
* explicit cancellation or reversal;
* no hard deletion after posting.

Add these invariants:

```text
Every material command accepts an idempotency key.

Every state-changing command checks expectedVersion.

Posting an already posted order is idempotent only when the same
idempotency key and payload are replayed.

Posted orders and lines are immutable.

No posted order is hard-deleted.

Corrections occur through an explicit cancellation, amendment,
or downstream reversal policy.
```

Example input:

```ts
type PostSalesOrderInput = {
  organizationId: string;
  actorUserId: string;
  correlationId: string;
  idempotencyKey: string;
  orderId: SalesOrderId;
  expectedVersion: number;
};
```

---

## 9. Commercial snapshot contents are unspecified

“Post freezes commercial snapshots” is correct, but the snapshot boundary should be named.

At posting, Sales should normally freeze at least:

```text
Customer code and display name
Bill-to and ship-to address snapshot
Payment-term code and description
Item code and description
Ordered unit of measure
Ordered quantity
Unit price
Discounts
Tax classification or tax decision reference
Transaction currency
Exchange rate, where applicable
Line and document totals
```

Master Data remains the identity owner, but the transaction package owns the **historical transaction snapshot**.

Without an explicit list, future developers may:

* retain live joins to mutable master names;
* duplicate unnecessary master fields;
* omit data needed for audit or document reproduction.

---

## 10. Customer and item eligibility should be explicit

“Same-org master” is necessary but not sufficient.

Sales should validate:

```text
Party exists in the same organization.
Party has an active customer role.
Item exists in the same organization.
Item is active and sellable.
Requested UoM is valid for that item.
Payment term is active and permitted.
Referenced masters are not soft-deleted or inactive.
```

It should not infer a customer merely because an `md_party` row exists.

---

## 11. Query authorization and pagination need stronger wording

The README says request context is required on every mutation, but the same requirements should apply to organization-scoped queries.

For example:

```ts
await getSalesOrderById({
  organizationId,
  actorUserId,
  correlationId,
  orderId,
});

await listSalesOrders({
  organizationId,
  actorUserId,
  correlationId,
  cursor,
  limit,
  status,
  sort: "createdAt:desc",
});
```

The README should explicitly promise:

* server-side pagination;
* allowlisted filters;
* allowlisted sorting;
* organization filter at the store boundary;
* no cross-tenant result distinction that leaks existence;
* no N+1 line loading.

---

# Naming recommendation

The current API names are generic:

```ts
createDraftOrder
addOrderLine
postOrder
getOrderById
listOrders
```

Inside a package this is understandable, but at application composition points several modules will expose similarly named operations.

Prefer:

```ts
createDraftSalesOrder
addSalesOrderLine
postSalesOrder
getSalesOrderById
listSalesOrders
```

This improves:

* logs;
* stack traces;
* imports;
* telemetry;
* code search;
* cross-module composition.

Because the package is still undergoing architecture hardening, renaming now is better than carrying ambiguous names permanently.

Do not add permanent compatibility aliases unless the package already has external stable consumers that cannot be migrated atomically.

---

# Manual anti-shadow check should become a machine gate

This is useful:

```bash
rg "sales_customer|purchase_supplier|inventory_product|finance_vendor" ...
```

But it is too dependent on maintainers remembering to run it, and it only catches known names.

The stronger gate is:

```text
TABLE-OWNERSHIP validation
+ forbidden mutation AST scanning
+ hostile negative fixtures
+ known shadow-name scan
```

The manual command can remain a diagnostic command, but it should not be described as the enforcement mechanism.

Recommended wording:

```text
The canonical anti-shadow gate is part of pnpm validate:modules.
The rg command below is a local diagnostic only.
```

---

# Root engine versions may drift

The README repeats:

```text
Node 24.x
pnpm ≥10.33.4
```

and then says those values come from root engines.

This duplicates authority.

Prefer:

```text
Toolchain versions are governed by the root package.json engines and
packageManager fields. Package checks must run from the repository root.
```

Only retain the exact numbers if a validator confirms README values against the root manifest.

---

# Recommended revised exports section

```md
## Public surfaces

| Path | Role |
|---|---|
| `@afenda/sales` | Sales-order commands and queries, public schemas and types, Sales operation IDs, permission codes, error codes, authorization port and module manifest |
| `@afenda/sales/adapters/drizzle` | Production Drizzle store and production composition helpers |
| `@afenda/sales/testing` | Memory store, fake authorization adapter and test-only audit/outbox fixtures |

The root surface never exports raw Drizzle tables, query builders, database
handles, memory adapters, Next.js types or HTTP envelopes.
```

---

# Recommended revised ownership table

| Surface                                             | Owner                                            |
| --------------------------------------------------- | ------------------------------------------------ |
| `sales_order` and `sales_order_line` DDL/migrations | `@afenda/db`                                     |
| Sales-order mutation authority                      | `@afenda/sales`                                  |
| Sales commands, queries and lifecycle invariants    | `@afenda/sales`                                  |
| Commercial transaction snapshots                    | `@afenda/sales`                                  |
| Sales-specific operation IDs                        | `@afenda/sales`                                  |
| Sales-specific permission codes                     | `@afenda/sales`                                  |
| Sales-specific error codes                          | `@afenda/sales`                                  |
| Generic `Result` and error primitives               | `@afenda/errors`                                 |
| Party, Item, UoM and Payment Term masters           | `@afenda/master-data`                            |
| Event names, versions and payload schemas           | `@afenda/events`                                 |
| Decision to emit a Sales event                      | `@afenda/sales`                                  |
| Grants and authorization evaluation                 | authorization subsystem through injected adapter |
| ActionResult, HTTP mapping and Sales UI             | `apps/web`                                       |

---

# Add a module-conformance section

````md
## Module conformance

`@afenda/sales` exports `src/module.manifest.ts`.

The manifest declares:

- module id and `R1-F` band;
- package lifecycle and activation mode;
- owned aggregates;
- command and query IDs;
- mutation tables;
- emitted and consumed event IDs;
- Sales permission codes;
- command/query authorization maps;
- required module dependencies;
- optional integrations.

Generated module, dependency and permission registers must remain clean under:

```bash
pnpm validate:modules
````

The manifest imports event IDs from `@afenda/events`; it must not reproduce
event-name string literals.

````

---

# Add a compact invariants section

```md
## Invariants

- Every order belongs to exactly one organization.
- Customer, item, UoM and payment-term references must resolve within that organization.
- The party must have an active customer role.
- The item and selected UoM must be active and sellable.
- Order code uniqueness is organization-scoped.
- Draft orders may be edited; posted orders are immutable.
- Posting freezes all required commercial snapshots.
- Every material mutation is idempotent and version-checked.
- Aggregate mutation, audit fact and outbox event commit atomically.
- A failed transaction persists none of the three.
- No public command or organization-scoped query runs without its declared permission.
- No app or peer package writes the Sales mutation tables.
````

---

# Additional document recommendation

Do not create a large Sales documentation pack. The README plus machine contracts should remain sufficient for ordinary maintenance.

Only **one additional narrative document** is justified:

```text
docs-V2/sales/sales-order-contract.md
```

It should own the deeper details that would overload the README:

1. Sales Order aggregate and line model;
2. lifecycle and transition table;
3. master validation requirements;
4. exact commercial snapshot fields;
5. money, quantity and rounding rules;
6. idempotency and concurrency behavior;
7. cancellation and closing policy;
8. event emission matrix;
9. downstream boundaries with Inventory, Fulfillment and Receivables;
10. rollback and recovery scenarios.

Everything else should remain machine-owned:

```text
operation-ids.ts
permissions.ts
error-codes.ts
module.manifest.ts
event contracts in @afenda/events
TABLE-OWNERSHIP.yaml
generated permission and command registers
tests
```

# Final recommendation

Approve the README **after amendment**, not yet as fully closed.

The immediate priority order is:

```text
1. Fix all post-nesting relative links
2. Add authorization port, permissions and operation mappings
3. Add module.manifest ownership and validation
4. Repair production/test atomicity symmetry
5. Separate root, production-adapter and testing exports
6. Move Sales-specific errors back to Sales ownership
7. Add lifecycle, idempotency and concurrency invariants
8. Define exact commercial snapshot contents
9. Convert anti-shadow checks into a machine gate
```

The most critical architectural issue is the current statement that the Drizzle implementation does not use the same mutation-port contract as the memory implementation. That should be resolved before treating the tests as enterprise evidence.
