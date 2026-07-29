# ERP Sales requirements

Status values are `Implemented`, `Verified`, and `Pending evidence`. A requirement is accepted only when its named evidence passes; source presence alone is not acceptance.

## Functional requirements

| ID | Requirement | Capability | Evidence | Status |
| --- | --- | --- | --- | --- |
| SAL-FR-001 | Create, activate, and effective-date currency-specific price books and UoM-aware entries. | commercial-pricing | `pricing.test.ts` | Verified |
| SAL-FR-002 | Select prices deterministically by applicability, priority, and quantity break and return a calculation trace. | commercial-pricing | `pricing.test.ts`; Drizzle parity | Memory verified; Drizzle query implementation typechecked |
| SAL-FR-003 | Record manual price override value, reason, and approver in the trace. | commercial-pricing | pricing override test | Pending evidence |
| SAL-FR-004 | Create quotations, add lines, revise drafts, and enforce submission, approval, send, acceptance, expiry, rejection, cancellation, and conversion transitions. | quotation-management | quotation lifecycle tests | Core lifecycle verified; explicit revision scenario pending |
| SAL-FR-005 | Convert an accepted quotation to one order idempotently and atomically. | quotation-management | conversion rollback/concurrency tests | Pending evidence |
| SAL-FR-006 | Create draft orders and add immutable customer, item, payment-term, address, and UoM snapshots. | order-management | `order-lifecycle.test.ts` | Verified in memory |
| SAL-FR-007 | Enforce optimistic versioning and idempotency for mutable order operations. | order-management | `order-lifecycle.test.ts`; Drizzle concurrency | Memory verified; Drizzle pending |
| SAL-FR-008 | Retain native create, add-line, get, list, post, cancel, and fulfillable-order APIs. | order-management | package exports and web scaffold tests | Implemented; full evidence pending |
| SAL-FR-009 | Prevent release with no lines, unresolved holds, failed supplied credit or availability checks, or invalid approval state. | order-management; approvals-and-holds | `order-lifecycle.test.ts` | Approval, hold, and line gates verified |
| SAL-FR-010 | Record fulfillment progress without mutating inventory and prevent over-fulfillment. | order-management | fulfillment lifecycle tests | Pending evidence |
| SAL-FR-011 | Create and govern return authorizations without receipt, credit-note, or payment mutation. | return-authorizations | return lifecycle tests | Verified in memory |
| SAL-FR-012 | Provide cursor-based operational lists. | order-management and query capabilities | pagination tests | Price-book, quotation, order, and return lists implemented; focused query assertions pass |

## Data requirements

| ID | Requirement | Evidence | Status |
| --- | --- | --- | --- |
| SAL-DATA-001 | Sales owns exactly the declared price-book, quotation, order, hold, schedule, and return tables. | module manifest and DB schema tests | Implemented |
| SAL-DATA-002 | Every Sales table has non-null `organization_id` and composite tenant foreign keys where parented. | `sales-schema.test.ts`; `tenancy.test.ts`; `audit:tenancy-nulls` | Verified on temporary Neon branch |
| SAL-DATA-003 | Sales stores immutable JSON commercial snapshots and never defines `sales_customer`, `sales_item`, or another shadow master. | `sales-schema.test.ts` | Verified |
| SAL-DATA-004 | Monetary values are checked non-negative where applicable and calculated with deterministic fixed-scale arithmetic. | schema checks; `money-and-boundaries.test.ts` | Memory verified |
| SAL-DATA-005 | Mutable aggregate tables have positive versions and compare-and-swap writes. | schema and concurrency tests | Implemented; concurrency pending |
| SAL-DATA-006 | Tenant-scoped idempotency and business-code uniqueness prevent duplicate authoritative records. | schema indexes; replay tests | Order memory verified |
| SAL-DATA-007 | Lifecycle and operational query paths are indexed. | migration inspection and DB metadata tests | Pending evidence |

## Security requirements

| ID | Requirement | Evidence | Status |
| --- | --- | --- | --- |
| SAL-SEC-001 | Every operation requires explicit organization, actor, and correlation context. | Zod boundary tests | Verified |
| SAL-SEC-002 | Every mutation requires a tenant-scoped idempotency key; mutable aggregate commands require an expected version. | schema tests and command tests | Order, quotation-line, and return-line CAS verified in memory; Drizzle CAS implemented |
| SAL-SEC-003 | Authorization fails closed and maps every command/query to a Sales permission. | authorization and manifest parity tests | Pending evidence |
| SAL-SEC-004 | Server Actions derive tenant and actor from session and return `ActionResult`. | `sales-scaffold-contract` web test | Pending evidence |
| SAL-SEC-005 | Cross-organization reads and writes cannot disclose or alter records. | `order-lifecycle.test.ts`; temporary-Neon tests | Verified in memory and temporary Neon |
| SAL-SEC-006 | Failures expose safe structured details without credentials or raw provider errors. | error taxonomy and adapter tests | Pending evidence |

## Integration requirements

| ID | Requirement | Evidence | Status |
| --- | --- | --- | --- |
| SAL-INT-001 | Sales uses public Master Data read contracts and never writes `md_*`. | import-boundary test and app composition | Implemented |
| SAL-INT-002 | Tax, credit, and availability checks are injected ports; no peer ERP package import exists. | import-boundary test | Implemented |
| SAL-INT-003 | State, audit, and versioned outbox event commit atomically for authoritative mutations. | adapter rollback and temporary-Neon tests | Final order release transaction verified on temporary Neon; quotation and return CAS transactions implemented and typechecked |
| SAL-INT-004 | Sales events cover pricing, quotation, order, holds, release, fulfillment progress, and returns. | events tests and manifest parity | Verified by focused event and module gates |
| SAL-INT-005 | Fulfillment consumes the native fulfillable-order projection through app composition. | web typecheck and scaffold tests | Migrated; full evidence pending |
| SAL-INT-006 | Same-origin reads use package queries/RSC and writes use Server Actions; no Sales REST catalogue exists. | route/import inspection | Implemented |

## Non-functional requirements

| ID | Requirement | Evidence | Status |
| --- | --- | --- | --- |
| SAL-NFR-001 | Root files are kernel-only and business behavior is capability-local. | architecture/import test | Pending evidence |
| SAL-NFR-002 | Public exports are limited to `.`, `./adapters/drizzle`, `./testing`, and `./module-manifest`. | package contract test | Implemented |
| SAL-NFR-003 | SQL exists only in `src/adapters/drizzle`; production source never imports `src/testing`. | boundary grep test | Pending evidence |
| SAL-NFR-004 | Operational lists use bounded cursor pagination and indexed predicates. | pagination and migration inspection | Pending evidence |
| SAL-NFR-005 | Package lint, typecheck, and tests pass with no shim, stub, TODO, or unvalidated public input. | package verification gates | Verified |

## Test and release requirements

| ID | Requirement | Evidence | Status |
| --- | --- | --- | --- |
| SAL-TEST-001 | Package kernel, exports, manifest, permissions, events, brands, money, pagination, and errors have contract tests. | `packages/erp/sales/__tests__` | In progress |
| SAL-TEST-002 | Pricing, quotation, order, hold, fulfillment, return, authorization, tenancy, idempotency, and concurrency have lifecycle tests. | package tests | In progress |
| SAL-TEST-003 | Memory and Drizzle adapters pass the same behavioral scenarios. | parity suite | Focused order lifecycle parity verified; full cross-capability parity remains pending |
| SAL-TEST-004 | The new schema passes DB, event, module, and hard-tenancy gates. | repository verification commands | Focused DB/event/module/tenancy gates verified; `db:check` baseline blocked by orphan migrations `0034`–`0040` |
| SAL-TEST-005 | Existing Sales Actions, RSC shell, and Fulfillment adapter compile and pass scaffold contracts. | web typecheck/test | Sales errors cleared; unrelated web baseline errors remain |
| SAL-TEST-006 | A generated destructive migration is inspected and applied only on the temporary Neon branch. | migration file and command transcript | Verified against final adapter |
| SAL-TEST-007 | `.env.local` is restored and the temporary branch is deleted after evidence capture. | presence/branch checks without secret output | Verified; production branch validation passes |
