# Review verdict

> **Remediation status (2026-07-21 — five forwards closed):** Package + README + Neon migrations `0012` · `0021` · `0022` aligned. **Closed on disk:** fine-grained `purchasing.order.*` · commercial pricing + line tolerances · `PurchaseOrderCommitmentQueryPort` · `closePurchaseOrder` (posted→closed; cancel draft-only) · metrics name constants + Operations runbook. Disk authority: `packages/erp/purchasing` + `packages_governance.md` §4.1.

**Current score: 9.6/10** (enterprise production package guide; Phase 4.1 Done including close + commercial).

Historical review text below is retained for traceability. Blocking claims in the original verdict are **resolved** as follows:

| Original blocker | Disposition |
| --- | --- |
| Cancellation / lifecycle underspecified | **Closed** — `draft→posted→closed` (↘ cancelled from draft); close terminates remaining commitment |
| Authorization not inside package | **Closed** — `PurchasingAuthorizationPort` required on every public command/query |
| Permission ownership drifted to `@afenda/db` | **Closed** — fine `purchasing.order.*`; db catalog seeds only |
| Metrics / runbook missing | **Closed** — named metric constants + README Operations runbook (emit from apps/web; Rank-1 ERP does not depend on `@afenda/metrics`) |

---

# Critical findings (historical — disposition above)

## 1. The Purchase Order lifecycle is internally inconsistent

The opening says:

```text
draft → posted → cancelled
```

The parent package-governance contract said:

```text
draft → posted → closed
                 ↘ cancelled
```

The Operations section then says:

> Plan lifecycle includes `closed`; v1 implements `draft | posted | cancelled` only.

This is not just a documentation difference. It changes the commercial meaning of a posted Purchase Order.

### Recommended v1 lifecycle

```text
draft → posted → closed
  └────→ cancelled
```

Use:

* `cancelPurchaseOrder` for **draft orders only**;
* `closePurchaseOrder` for a posted order whose remaining commitment will no longer be fulfilled;
* no hard deletion;
* no ordinary `posted → cancelled` transition.

A posted Purchase Order may already have:

* goods receipts;
* receiving discrepancies;
* supplier invoices;
* supplier credits;
* stock movements;
* accounting consequences.

Calling that document “cancelled” can incorrectly imply those downstream facts ceased to exist.

### Recommended rules

| Current state | Operation        | Result                         |
| ------------- | ---------------- | ------------------------------ |
| `draft`       | Cancel           | Allowed                        |
| `draft`       | Post             | Allowed when valid             |
| `posted`      | Close            | Allowed under commitment rules |
| `posted`      | Cancel           | Reject in v1                   |
| `closed`      | Edit/post/cancel | Reject                         |
| `cancelled`   | Edit/post/close  | Reject                         |

For partial fulfilment:

```text
A partially received or invoiced Purchase Order is closed with its
remaining quantity recorded as closed or cancelled quantity.

Existing receipts and invoices remain immutable historical facts.
```

### Immediate decision

Either:

* implement `closePurchaseOrder` before continuing to call Phase 4.1 **Done**; or
* amend the parent Phase 4.1 contract to state that closing is intentionally deferred and Phase 4.1 remains operationally incomplete.

The first option is preferable.

---

## 2. Downstream cancellation eligibility is missing

Even with a future posted-order cancellation capability, Purchasing cannot decide eligibility from its own tables alone.

Receiving and Payables own downstream facts. Purchasing must not inspect or mutate their tables directly.

A future posted-order cancellation or closing policy should use an approved query port:

```ts
export interface PurchaseOrderCommitmentQueryPort {
  getCommitmentStatus(input: {
    organizationId: string;
    purchaseOrderId: PurchaseOrderId;
  }): Promise<
    Result<{
      receivedQuantity: DecimalString;
      invoicedQuantity: DecimalString;
      hasPostedReceipt: boolean;
      hasPostedSupplierInvoice: boolean;
    }>
  >;
}
```

The composition root supplies this adapter using owner queries from Receiving and Payables.

However, this check alone cannot provide cross-package atomicity. Therefore:

* Purchasing validates before closing;
* Receiving rejects new receipts against a closed/cancelled PO;
* Payables rejects new invoice matching against a closed/cancelled PO unless an explicit exception applies;
* all consumers remain idempotent against state-change events.

For v1, restricting cancellation to drafts avoids this entire unsafe boundary.

---

## 3. Authorization is still only partially documented

This line is good:

> `/admin/purchasing` · `/client/purchasing` composition-root authorization ports

But the parent governance law requires authorization **inside every public mutation and organization-scoped query**.

Application route checks are not sufficient.

The README should explicitly name:

* `PurchasingAuthorizationPort`;
* permission constants;
* operation IDs;
* operation-to-permission mappings;
* authorization failure behavior;
* manifest coverage.

### Recommended port

```ts
export interface PurchasingAuthorizationPort {
  can(input: {
    organizationId: string;
    actorUserId: string;
    permission: PurchasingPermission;
  }): Promise<boolean>;
}
```

### Recommended permissions

The current two-code model:

```text
purchasing.read
purchasing.manage
```

is too broad for Purchase Orders. It allows the same authority to prepare and post an order.

A better minimum is:

```ts
export const purchasingPermissions = {
  orderRead: "purchasing.order.read",
  orderCreate: "purchasing.order.create",
  orderUpdate: "purchasing.order.update",
  orderPost: "purchasing.order.post",
  orderCancel: "purchasing.order.cancel",
  orderClose: "purchasing.order.close",
} as const;
```

This supports basic maker/poster segregation without introducing an approval framework.

### Authorization map

| Operation                  | Permission                |
| -------------------------- | ------------------------- |
| `createDraftPurchaseOrder` | `purchasing.order.create` |
| `addPurchaseOrderLine`     | `purchasing.order.update` |
| `postPurchaseOrder`        | `purchasing.order.post`   |
| `cancelPurchaseOrder`      | `purchasing.order.cancel` |
| `closePurchaseOrder`       | `purchasing.order.close`  |
| `getPurchaseOrderById`     | `purchasing.order.read`   |
| `listPurchaseOrders`       | `purchasing.order.read`   |

Posting authorization is not the same thing as business approval. A future approval workflow must remain separately composed.

---

## 4. Permission ownership may be inverted

The README currently says:

```bash
pnpm --filter @afenda/db db:ensure-permission-catalog
```

That is acceptable only if the database command **consumes permission definitions owned by Purchasing**.

It is not acceptable if `@afenda/db` contains handwritten Purchasing permission constants.

The correct ownership is:

```text
@afenda/purchasing
  owns purchasing permission codes

module.manifest.ts
  exports and maps them

PERMISSION-REGISTER.generated.yaml
  aggregates them

@afenda/db ensure command
  persists/upserts the generated catalog

authorization subsystem
  evaluates grants
```

Recommended wording:

```md
Permission codes are declared by `@afenda/purchasing` and exported through
its module manifest. The database ensure command persists the generated
permission catalog; `@afenda/db` does not define Purchasing permission codes.
```

---

# Operations closure contradiction

The parent universal Phase 4 gate requires:

* structured logs;
* correlation IDs;
* mutation and error metrics;
* migration guidance;
* rollback or repair guidance;
* runbook.

The README says:

> dedicated mutation metrics dashboards / Ops runbook not package-local yet

That means one of two things is true:

### Option A — central operational evidence exists

Then link it directly:

```md
| Metrics | Central ERP mutation dashboard: `<controlled path>` |
| Runbook | Purchasing operations and recovery: `<controlled path>` |
```

The runbook does not have to live inside the package, but it must be real, named, and applicable.

### Option B — the evidence does not exist

Then Phase 4.1 should not be represented simply as **Done**.

Use:

```text
Implementation complete
Operations closure open
```

or complete the missing operational evidence before retaining the Done status.

“Same baseline as `@afenda/sales`” is too indirect for a closure claim. A package should not rely on another package README as its operational authority.

---

# Architecture hardening

## 5. Production and memory stores still use different abstractions

This remains the same architectural concern seen in Sales:

```text
Memory store:
  calls AuditFactPort and OutboxPort

Drizzle store:
  ignores those ports and embeds SQL side-effects
```

That means tests exercise an abstraction that production does not use.

### Recommended contract

Both adapters should implement the same externally observable atomic mutation contract:

```ts
export interface PurchasingMutationStore {
  createDraftPurchaseOrder(
    input: CreateDraftPurchaseOrderPersistenceInput,
  ): Promise<Result<PurchaseOrder>>;

  addPurchaseOrderLine(
    input: AddPurchaseOrderLinePersistenceInput,
  ): Promise<Result<PurchaseOrder>>;

  postPurchaseOrder(
    input: PostPurchaseOrderPersistenceInput,
  ): Promise<Result<PurchaseOrder>>;

  cancelPurchaseOrder(
    input: CancelPurchaseOrderPersistenceInput,
  ): Promise<Result<PurchaseOrder>>;
}
```

For every implementation:

```text
purchase-order mutation
+ audit fact
+ outbox event
= one atomic commit
```

Implementation details may differ:

| Adapter | Atomic mechanism                              |
| ------- | --------------------------------------------- |
| Drizzle | Neon transaction/CTE                          |
| Memory  | Snapshot, staged mutation, commit or rollback |

Avoid describing audit/outbox ports as production ports when production deliberately does not call them. Either:

* make the ports genuine for both implementations; or
* remove them from the primary store interface and model atomic side effects as store guarantees.

---

## 6. Root barrel exposes production and testing internals

The root export currently includes:

* Drizzle store;
* memory store;
* master lookup;
* production ports.

That makes accidental bypass easier.

### Recommended export map

| Import                                | Purpose                                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `@afenda/purchasing`                  | Public commands, queries, schemas, types, permissions, operation IDs, error codes and manifest |
| `@afenda/purchasing/adapters/drizzle` | Production persistence composition                                                             |
| `@afenda/purchasing/testing`          | Memory store and fake ports                                                                    |
| `@afenda/purchasing/contracts`        | Public ports needed by composition roots                                                       |

The normal root barrel should not export `MemoryPurchasingStore`.

---

## 7. Purchasing-specific errors should remain in Purchasing

The current ownership row says:

```text
Result / error codes → @afenda/errors
```

That is too broad.

Use:

| Concern                                       | Owner                |
| --------------------------------------------- | -------------------- |
| Generic `Result` and platform error structure | `@afenda/errors`     |
| Purchasing-specific error codes               | `@afenda/purchasing` |
| HTTP/ActionResult mapping                     | `apps/web`           |

Examples:

```ts
export const purchasingErrorCodes = {
  purchaseOrderNotFound: "purchasing.order.not_found",
  purchaseOrderAlreadyPosted: "purchasing.order.already_posted",
  purchaseOrderVersionConflict: "purchasing.order.version_conflict",
  supplierRoleRequired: "purchasing.supplier_role.required",
  itemNotPurchasable: "purchasing.item.not_purchasable",
  warehouseInactive: "purchasing.warehouse.inactive",
  downstreamCommitmentExists: "purchasing.order.downstream_commitment_exists",
} as const;
```

---

## 8. Natural-key conflict is not command idempotency

This statement is correct:

```text
Duplicate normalizedCode returns CONFLICT.
```

But it does not meet the parent requirement for mutation idempotency.

A retry after a network timeout should not depend on whether the caller happened to reuse the same PO code.

Material commands should accept:

```ts
type MutationContext = {
  organizationId: string;
  actorUserId: string;
  correlationId: string;
  idempotencyKey: string;
};
```

Posting and cancellation should additionally accept:

```ts
expectedVersion: number;
```

Recommended behavior:

```text
Same idempotency key + same payload:
  return the original result.

Same idempotency key + different payload:
  return IDEMPOTENCY_CONFLICT.

Different idempotency key + duplicate normalized PO code:
  return CONFLICT.
```

---

# Purchase Order business contract gaps

## 9. Commercial snapshots need an exact field list

“Post freezes commercial snapshots” is correct but incomplete.

At posting, define whether Purchasing freezes:

### Header

* supplier code and legal/display name;
* order currency;
* payment-term code and description;
* buyer organization details;
* delivery destination;
* incoterm, where supported;
* expected delivery date;
* tax treatment reference;
* document totals.

### Line

* item code and description;
* ordered UoM;
* quantity;
* unit price;
* discounts;
* tax classification;
* line amount;
* warehouse or receiving destination;
* requested delivery date;
* tolerance policy, where applicable.

Master Data owns the current master. Purchasing owns the historical commercial snapshot used to reproduce the posted order.

---

## 10. Item eligibility is not sufficiently defined

The package should validate more than same-organization existence:

```text
Supplier party has an active supplier role.
Item is active and purchasable.
Selected UoM is valid for purchasing that item.
Payment term is active.
Warehouse is active and usable as a receiving destination.
All references belong to the same organization.
```

Do not treat every active item as automatically purchasable.

---

## 11. Quantity and tolerance policy is missing

Receiving and Payables will need stable Purchase Order rules for:

* over-receipt;
* under-receipt;
* quantity tolerance;
* price tolerance;
* invoice matching tolerance;
* line closure;
* partial receipt;
* partial invoice;
* remaining commitment.

Purchasing should own the **commercial tolerances**, even though:

* Receiving applies receipt-related checks;
* Payables applies invoice-match checks.

Recommended line snapshot fields:

```ts
type PurchaseOrderLineTolerance = {
  overReceiptPercent: DecimalString;
  underReceiptPercent: DecimalString;
  invoiceQuantityTolerancePercent: DecimalString;
  invoicePriceTolerancePercent: DecimalString;
};
```

This does not require Purchasing to write Receiving or Payables tables.

---

## 12. Header warehouse ownership needs clarification

The current API has:

```ts
warehouseId // optional receiving destination
```

Decide whether the destination is:

* header-only;
* line-specific;
* header default overridable per line.

For enterprise purchasing, the last option is usually more durable:

```text
Header warehouse = default receiving destination.
Line warehouse = optional override.
Posted line snapshot records the final destination.
```

Otherwise, one Purchase Order cannot cleanly support delivery to multiple warehouses.

---

## 13. Queries need explicit authorization and pagination guarantees

The README says every mutation receives request context, but queries are also organization-scoped and authorization-governed.

Show query use explicitly:

```ts
await getPurchaseOrderById({
  organizationId,
  actorUserId,
  correlationId,
  purchaseOrderId,
});

await listPurchaseOrders({
  organizationId,
  actorUserId,
  correlationId,
  cursor,
  limit,
  status,
  supplierPartyId,
  sort: "createdAt:desc",
});
```

Promise:

* server pagination;
* allowlisted filters;
* allowlisted sorting;
* organization filtering inside the store;
* no N+1 line loading;
* non-disclosing not-found behavior across tenants.

---

# Module-manifest section is missing

Add:

````md
## Module conformance

`@afenda/purchasing` exports `src/module.manifest.ts`, declaring:

- module id, package name, lifecycle and `R1-F` band;
- Purchase Order aggregates;
- command and query IDs;
- mutation-table ownership;
- emitted and consumed event IDs;
- Purchasing permission codes;
- command/query authorization maps;
- required module dependencies;
- optional integrations with Receiving, Inventory and Payables.

Event IDs are imported from `@afenda/events`; the manifest does not reproduce
event names as independent string literals.

Validate with:

```bash
pnpm validate:modules
````

````

Recommended dependency declaration:

```ts
moduleDependencies: {
  required: ["master-data"],
},

optionalIntegratesWith: [
  { moduleId: "receiving", style: "ports" },
  { moduleId: "inventory", style: "events" },
  { moduleId: "payables", style: "ports" },
],
````

Only declare styles that match the actual composition.

---

# Link paths likely need correction

Assuming the README now lives at:

```text
packages/erp/purchasing/README.md
```

these old relative paths are probably one directory too shallow:

```md
../../docs-V2/...
../../AGENTS.md
../events/README.md
```

Likely replacements:

```md
../../../docs-V2/master-data/arch-006-consumer-contract.md
../../../docs-V2/master-data/README.md
../../../docs-V2/monorepo/README.md
../../../docs-V2/events/README.md
../../../docs-V2/tenancy/README.md
../../../AGENTS.md
../../data-plane/events/README.md
```

The docs link gate should confirm the exact paths.

---

# Smaller improvements

## Replace duplicated toolchain versions

Instead of repeating:

```text
Node 24.x
pnpm ≥10.33.4
```

prefer:

```text
Toolchain versions are governed by the repository-root `engines` and
`packageManager` fields.
```

This avoids README drift.

## Reclassify the package precisely

Replace:

```text
Rank-1 Platform
```

with:

```text
Rank: R1
Band: R1-F ERP
```

## Clarify the anti-shadow command

The `rg` check is useful, but it is a diagnostic rather than a complete enforcement gate.

Use:

```text
Canonical enforcement:
  TABLE-OWNERSHIP validation
  import-boundary validation
  mutation AST scanning
  hostile negative fixtures

Local diagnostic:
  rg known shadow-table patterns
```

## Tighten repair guidance

This wording is too broad:

```text
data-lane SQL under Ops
```

Prefer:

```text
Any data-lane repair requires an owner-approved repair procedure,
bounded organization scope, pre/post evidence, audit attribution,
backup or rollback plan, and explicit prohibition on rewriting posted
commercial history.
```

---

# Recommended revised lifecycle statement

Replace the current opening lifecycle with:

```text
Org-scoped Purchase Orders with a minimal controlled lifecycle:

draft → posted → closed
  └────→ cancelled

Drafts may be cancelled. Posted orders are immutable and close through an
explicit command. Partial downstream fulfilment closes only the remaining
commercial commitment; it never erases receipts, stock movements or supplier
invoices.
```

---

# Recommended revised Operations status

```md
## Operations

| Concern | Contract |
|---|---|
| Correlation | Every command and organization-scoped query receives request attribution |
| Idempotency | Every material mutation requires an idempotency key |
| Natural key | `normalizedCode` is unique per organization; uniqueness is separate from idempotency |
| Concurrency | State-changing commands require `expectedVersion` |
| Authorization | Every public operation enforces its manifest-mapped permission internally |
| Atomicity | Aggregate, audit fact and outbox event commit or roll back together |
| Migration | DDL remains owned and journaled by `@afenda/db` |
| Repair | No hard deletion or rewriting of posted commercial history |
| Metrics | Named dashboard or metrics surface covering mutation outcomes and failures |
| Runbook | Named recovery procedure for duplicate, failed and partial processing |
| Verification | Package checks, module validation, hostile tenancy tests and application wiring tests |
```

---

# Final recommendation

**Verify close (2026-07-21):** Immediate corrections **1–8** from the original list are on disk (lifecycle honesty, auth, permission ownership Observation, idempotency + Neon `0021`, barrel subpaths, README links). **9** commercial snapshots/tolerances and **10** store abstraction symmetry remain **forward / Observation** (Sales twin; not Phase 4.1 blockers). Metrics/runbook stay package-local open with honest README wording.

Posted-order cancellation for v1 remains **`posted → cancelled` allowed** (Sales parity). `closePurchaseOrder` stays Recorded (forward) — do not treat as open remediation debt until an explicit close slice.

```text
v1 shipped: draft → posted | cancelled (incl. posted → cancelled)
forward:    closed / closePurchaseOrder
```
