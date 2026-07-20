# Afenda Packages — Phase 3 and Phase 4 Authorization

## Decision

```text
HUMAN OVERRIDE — 2026-07-20

PHASE 3 EVIDENCE GATE:
WAIVED IN WRITING BY THE USER.

PHASE 3:
AUTHORIZED — ONE-LEVEL PACKAGE CATEGORY NESTING.

PHASE 4:
AUTHORIZED — P0 ERP TRANSACTIONAL PACKAGE DELIVERY.

PUBLISHED PACKAGE NAMES:
UNCHANGED — @afenda/<name>.
```

This authorization supersedes the previous Phase 3/4 hold only for the scope defined below.

It does not authorize:

```text
@afenda/module-catalog runtime
@afenda/authorization extraction
@afenda/jobs
new transaction-core packages
category barrels
mega-packages
shadow master tables
cross-domain direct writes
```

---

# Phase 3 — One-Level Package Nesting

## Objective

Reorganize the existing workspace packages into clear architectural categories without changing:

- published package names;
- public exports;
- package ownership;
- package dependency direction;
- runtime behavior;
- database schema;
- application imports.

## Final physical layout

```text
packages/
├─ foundation/
│  ├─ config/
│  ├─ env/
│  └─ errors/
│
├─ runtime/
│  ├─ logger/
│  ├─ http/
│  ├─ security/
│  ├─ metrics/
│  ├─ openapi/
│  ├─ rate-limit/
│  └─ cache/
│
├─ data-plane/
│  ├─ db/
│  ├─ audit/
│  ├─ events/
│  ├─ search/
│  └─ notifications/
│
├─ control-plane/
│  ├─ auth/
│  └─ admin/
│
├─ erp/
│  ├─ master-data/
│  └─ sales/
│
├─ intelligence/
│  └─ ai-the-machine/
│
└─ surfaces/
   ├─ ui-system/
   └─ emails/
```

## Published names remain unchanged

```text
packages/erp/sales
→ @afenda/sales

packages/data-plane/events
→ @afenda/events

packages/surfaces/ui-system
→ @afenda/ui-system
```

Consumers continue using:

```ts
import { createDraftOrder } from "@afenda/sales";
import { Button } from "@afenda/ui-system";
import { env } from "@afenda/env";
```

No consumer may import physical paths.

---

## Phase 3 category rules

Category directories may contain only:

```text
README.md
child package directories
```

Category directories must not contain:

```text
package.json
src/
index.ts
barrel exports
domain logic
stores
commands
queries
tables
```

The following packages remain forbidden:

```text
@afenda/foundation
@afenda/runtime
@afenda/data-plane
@afenda/control-plane
@afenda/erp
@afenda/surfaces
```

Categories organize the repository; they are not dependency or ownership units.

---

## Phase 3 required updates

The nesting mission must update all affected path-based surfaces in the same change:

```text
pnpm-workspace.yaml
turbo.json and Turbo path inputs
root package scripts
TypeScript project references
Biome configuration references
Vitest configuration
CODEOWNERS
CI workflow path filters
documentation links
packages/README.md
docs-V2/monorepo
LAYERS.md
WORKSPACE-EDGE-REGISTER tooling
module validators
agent and skill path references
repository scripts
test fixtures
```

Search for stale paths including:

```bash
rg 'packages/(sales|master-data|db|events|audit|auth|admin|errors|env|logger|http|security|metrics|openapi|rate-limit|cache|search|notifications|ai-the-machine|ui-system|emails)'
```

No compatibility symlinks, path shims, duplicate folders, forwarding packages, or temporary copies are permitted.

---

## Phase 3 acceptance criteria

Phase 3 passes only when:

- all 22 existing packages are moved exactly once;
- all published package names remain unchanged;
- all package exports remain unchanged;
- `pnpm install --frozen-lockfile` succeeds;
- every package is discovered by pnpm;
- Turbo discovers all package tasks;
- workspace-edge validation passes;
- module validation passes;
- no old package directory remains;
- no compatibility shim exists;
- no category package or barrel exists;
- no application import changes from `@afenda/<name>`;
- package lint, typecheck, and tests pass;
- root lint, typecheck, test, and build gates pass;
- documentation and agent references resolve;
- `git status` contains no unintended generated files.

## Phase 3 terminal verdict

```text
PHASE 3 COMPLETE CANDIDATE

Existing packages moved: 22/22
Published package names changed: 0
Compatibility shims created: 0
Category barrels created: 0
Workspace discovery: PASS
DAG validation: PASS
Module validation: PASS
Root quality gates: PASS
Ready for independent audit: YES
```

Phase 4 may begin only after Phase 3 receives independent approval.

---

# Phase 4 — P0 ERP Transactional Packages

## Objective

Build the complete P0 transactional ERP spine as independently owned, plug-and-play packages.

Phase 4 authorizes these packages:

```text
packages/erp/
├─ purchasing/     → @afenda/purchasing
├─ inventory/      → @afenda/inventory
├─ receiving/      → @afenda/receiving
├─ fulfillment/    → @afenda/fulfillment
├─ receivables/    → @afenda/receivables
├─ payables/       → @afenda/payables
├─ payments/       → @afenda/payments
└─ accounting/     → @afenda/accounting
```

Existing:

```text
packages/erp/master-data → @afenda/master-data
packages/erp/sales       → @afenda/sales
```

## Phase 4 operating rule

Phase 4 is authorized as one program but executed as eight independently closable slices.

```text
Phase 4.1  Purchasing
Phase 4.2  Inventory
Phase 4.3  Receiving
Phase 4.4  Fulfillment
Phase 4.5  Receivables
Phase 4.6  Payables
Phase 4.7  Payments
Phase 4.8  Accounting
```

Each slice must pass its own quality gate before the next slice starts.

No eight-package empty scaffold mission is permitted.

---

# Phase 4.1 — `@afenda/purchasing`

## Ownership

```text
Purchase Order
Purchase Order Line
```

Initial lifecycle:

```text
draft → posted → closed
             ↘ cancelled
```

Initial public surface:

```ts
createDraftPurchaseOrder;
addPurchaseOrderLine;
postPurchaseOrder;
cancelPurchaseOrder;
getPurchaseOrderById;
listPurchaseOrders;
```

Master references:

```text
supplier → md_party with supplier role
item → md_item
payment term → master-data
warehouse / receiving destination → master-data reference
```

Initial events:

```text
purchasing.order.created.v1
purchasing.order.line_added.v1
purchasing.order.posted.v1
purchasing.order.cancelled.v1
```

Optional integrations:

```text
receiving — events
payables — events
inventory — events
```

---

# Phase 4.2 — `@afenda/inventory`

## Ownership

```text
Stock Movement
Stock Movement Line
Stock Ledger Entry
Stock Reservation
```

Initial movement types:

```text
receipt
issue
transfer
adjustment
reservation
reservation_release
```

Initial public surface:

```ts
createStockMovement;
addStockMovementLine;
postStockMovement;
reserveStock;
releaseReservation;
getStockMovementById;
listStockMovements;
getStockAvailability;
```

Inventory is the sole mutation owner of stock and ledger tables.

No package may directly update:

```text
on_hand
available
reserved
stock ledger
stock movement
```

Initial events:

```text
inventory.movement.created.v1
inventory.movement.posted.v1
inventory.stock.reserved.v1
inventory.reservation.released.v1
```

---

# Phase 4.3 — `@afenda/receiving`

## Ownership

```text
Goods Receipt
Goods Receipt Line
Receiving Discrepancy
```

Initial lifecycle:

```text
draft → posted → closed
             ↘ rejected/cancelled
```

Initial public surface:

```ts
createDraftGoodsReceipt;
addGoodsReceiptLine;
postGoodsReceipt;
recordReceivingDiscrepancy;
cancelGoodsReceipt;
getGoodsReceiptById;
listGoodsReceipts;
```

Source relationships:

```text
Purchase Order
Expected Receipt
Return Shipment
Unplanned Receipt
```

Receiving does not write Inventory tables directly.

It requests Inventory movement through an injected port or emits a versioned event from the application composition root.

Initial events:

```text
receiving.receipt.created.v1
receiving.receipt.line_added.v1
receiving.receipt.posted.v1
receiving.discrepancy.recorded.v1
```

---

# Phase 4.4 — `@afenda/fulfillment`

## Ownership

```text
Delivery
Delivery Line
Pick
Pack
Proof of Delivery
```

Initial lifecycle:

```text
draft
→ picking
→ packed
→ posted
→ delivered
→ closed
```

Initial public surface:

```ts
createDraftDelivery;
addDeliveryLine;
startPicking;
confirmPick;
confirmPack;
postDelivery;
recordProofOfDelivery;
cancelDelivery;
getDeliveryById;
listDeliveries;
```

Fulfillment does not write Inventory or Sales tables directly.

Initial events:

```text
fulfillment.delivery.created.v1
fulfillment.pick.confirmed.v1
fulfillment.delivery.posted.v1
fulfillment.delivery.completed.v1
```

---

# Phase 4.5 — `@afenda/receivables`

## Ownership

```text
Sales Invoice
Sales Invoice Line
Credit Note
Customer Allocation
Customer Balance Projection
```

Initial public surface:

```ts
createDraftSalesInvoice;
addSalesInvoiceLine;
postSalesInvoice;
issueCreditNote;
allocateCustomerReceipt;
cancelSalesInvoice;
getSalesInvoiceById;
listSalesInvoices;
getCustomerBalance;
```

Initial events:

```text
receivables.invoice.created.v1
receivables.invoice.posted.v1
receivables.credit_note.posted.v1
receivables.allocation.posted.v1
```

Receivables does not write Sales, Fulfillment, Payments, or Accounting tables directly.

---

# Phase 4.6 — `@afenda/payables`

## Ownership

```text
Supplier Invoice
Supplier Invoice Line
Supplier Credit Note
Supplier Allocation
Three-Way Match Result
```

Initial public surface:

```ts
createDraftSupplierInvoice;
addSupplierInvoiceLine;
matchSupplierInvoice;
postSupplierInvoice;
issueSupplierCreditNote;
allocateSupplierPayment;
cancelSupplierInvoice;
getSupplierInvoiceById;
listSupplierInvoices;
getSupplierBalance;
```

Initial events:

```text
payables.invoice.created.v1
payables.invoice.matched.v1
payables.invoice.posted.v1
payables.credit_note.posted.v1
payables.allocation.posted.v1
```

---

# Phase 4.7 — `@afenda/payments`

## Ownership

```text
Payment
Payment Allocation
Payment Reversal
Refund
```

Payment direction:

```text
receipt
disbursement
refund
transfer
```

Initial public surface:

```ts
createDraftPayment;
addPaymentAllocation;
postPayment;
reversePayment;
postRefund;
getPaymentById;
listPayments;
```

Initial events:

```text
payments.payment.created.v1
payments.payment.posted.v1
payments.payment.reversed.v1
payments.refund.posted.v1
```

Payments does not directly mutate Receivables, Payables, or Accounting tables.

---

# Phase 4.8 — `@afenda/accounting`

## Ownership

```text
Journal
Journal Line
Ledger Posting
Accounting Period
```

Initial public surface:

```ts
createDraftJournal;
addJournalLine;
postJournal;
reverseJournal;
openAccountingPeriod;
closeAccountingPeriod;
getJournalById;
listJournals;
getTrialBalance;
```

Core invariants:

```text
total debit = total credit
posted journal is immutable
reversal creates a new journal
closed period rejects posting
organization scope is mandatory
currency precision is deterministic
```

Initial events:

```text
accounting.journal.created.v1
accounting.journal.posted.v1
accounting.journal.reversed.v1
accounting.period.closed.v1
```

Accounting consumes approved financial events through application-composed handlers.

It does not import every transaction package.

---

# Uniform package shape

Every Phase 4 package follows the same recognizable structure:

```text
packages/erp/<module>/
├─ src/
│  ├─ commands/
│  ├─ queries/
│  ├─ domain/
│  ├─ ports/
│  ├─ stores/
│  ├─ schemas/
│  ├─ permissions.ts
│  ├─ operation-ids.ts
│  ├─ module.manifest.ts
│  └─ index.ts
│
├─ tests/
│  ├─ commands/
│  ├─ queries/
│  ├─ stores/
│  ├─ authorization/
│  ├─ tenancy/
│  └─ conformance/
│
├─ README.md
├─ package.json
├─ tsconfig.json
└─ vitest.config.ts
```

Folders appear only when real files exist.

---

# Mandatory package contract

Every package must provide:

```text
one owned aggregate
one mutation-table authority declaration
one real command
one real query
one store interface
Drizzle production store
memory test store
module manifest
exact command/query IDs
exact permission codes
operation→permission mapping
versioned event contracts
same-TX audit/outbox
cross-tenant tests
negative boundary fixtures
README ownership contract
```

No package may be created as:

```text
empty barrel
placeholder package
route-only shell
TODO implementation
mock production adapter
temporary cross-domain owner
```

---

# Universal Phase 4 acceptance gate

Every slice must pass:

## Ownership

- one aggregate owner;
- one mutation owner;
- no shadow Party, Item, Supplier, Customer, Warehouse, or Account tables;
- no direct app table mutation;
- no peer ERP imports without dual-control workspace edge.

## Tenancy

- non-null `organization_id`;
- every command and query organization-scoped;
- same-org master validation;
- hostile cross-tenant tests;
- no information leakage.

## Authorization

- exact permission constants;
- every public mutation and org-scoped query mapped;
- command/query calls injected authorization port;
- route checks alone are insufficient;
- system-only operations explicitly declared.

## Transactions

- entity, audit, and outbox commit atomically;
- no partial writes;
- idempotency on material mutations;
- optimistic concurrency;
- no hard deletion after posting;
- explicit reversal or cancellation.

## Queries

- canonical owner queries;
- server pagination;
- allowlisted filters and sorting;
- no N+1;
- defined read models;
- required indexes.

## Events

- contract exists in `@afenda/events`;
- event versioned;
- event emitted only after valid business transition;
- no event on rollback;
- consumer processing idempotent.

## Tests

- domain invariants;
- state transitions;
- authorization;
- tenancy;
- rollback;
- concurrency;
- idempotency;
- memory/Drizzle conformance;
- audit/outbox atomicity;
- negative import and ownership fixtures.

## Operations

- structured logs;
- correlation ID;
- mutation metrics;
- error metrics;
- migration guidance;
- rollback/repair guidance;
- runbook.

---

# Phase 4 rolling order

```text
4.1 Purchasing
4.2 Inventory
4.3 Receiving
4.4 Fulfillment
4.5 Receivables
4.6 Payables
4.7 Payments
4.8 Accounting
```

The delivery chains close progressively:

```text
Purchasing
→ Receiving
→ Inventory
→ Payables
→ Payments
→ Accounting
```

and:

```text
Sales
→ Inventory
→ Fulfillment
→ Receivables
→ Payments
→ Accounting
```

Each package is independently owned and independently testable, while the complete program delivers the full P0 ERP transactional spine.

---

# Final authorization

```text
AUTHORIZED NOW:

PHASE 3
- Move the existing 22 packages into one-level categories.
- Keep all @afenda/<name> package names unchanged.
- Update every affected repository path in the same mission.
- No compatibility shims or category barrels.

PHASE 4
- Create and implement:
  @afenda/purchasing
  @afenda/inventory
  @afenda/receiving
  @afenda/fulfillment
  @afenda/receivables
  @afenda/payables
  @afenda/payments
  @afenda/accounting

EXECUTION LAW:
- Phase 3 closes and passes audit first.
- Phase 4 executes package-by-package.
- Each Phase 4 slice closes before the next begins.
- No empty package batch.
- No peer-domain direct writes.
- No reduction of the enterprise quality bar.
```
