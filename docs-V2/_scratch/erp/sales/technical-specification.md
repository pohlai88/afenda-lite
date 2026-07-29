# ERP Sales technical specification

## 1. Problem

The former Sales package combined a narrow order scaffold with contracts that could not support enterprise commercial control. Incremental repair would preserve ambiguous boundaries and accumulated debugging cost. The rebuild therefore starts from the proven `@afenda/master-data` package shape while treating all former Sales source and tests as discarded.

## 2. Goals and non-goals

The module shall own commercial pricing, quotations, order capture and revisions, approvals and holds, release and cancellation, fulfillment-progress projection, and return authorization. It shall provide deterministic calculations, immutable master snapshots, optimistic concurrency, idempotent commands, atomic evidence, explicit tenancy, and stable application-facing order APIs.

It shall not own CRM or opportunities, commissions, subscriptions, inventory mutation, physical fulfillment, invoicing, payment allocation, credit-ledger state, tax master state, or accounting posting. It shall not expose a new REST catalogue or import another transactional ERP package.

## 3. Ownership boundaries

Master Data owns canonical commercial identities and reference records. Sales reads those records through public contracts and stores only document-time snapshots. A later Master Data change cannot rewrite a quotation, order, or return history, and Sales cannot create or update an `md_*` record.

Inventory owns availability and stock mutation. A supplied `AvailabilityCheckPort` may block release; fulfillment progress enters Sales as an authorized projection update. Credit, tax, Fulfillment, Receivables, and Accounting retain their own source-of-truth state. Synchronous checks use injected ports at the application composition root; asynchronous handoffs use versioned outbox events.

## 4. Architecture

The server-only root barrel exports contracts and capability functions. Root files form the shared kernel: brands, context schemas, authorization, permissions, module identifiers, ports, command options, constraints, pagination, input parsing, manifest, and common types. Business behavior exists only below `src/capabilities`.

The package declares four exports: `.`, `./adapters/drizzle`, `./testing`, and `./module-manifest`. Production code cannot import `./testing`. SQL is confined to the Drizzle adapter. The default store is resolved at the package boundary; applications may inject a memory store for deterministic tests.

Every public input is parsed by Zod before authorization or persistence. Every command carries organization, actor, correlation, and idempotency identifiers. Mutable aggregate commands additionally carry an expected version. Results use the discriminated `Result` envelope; application Server Actions map it to `ActionResult`.

## 5. Lifecycle models

### Price books

Price books move from `draft` to `active`, `inactive`, or `archived`. Entries are effective-dated and scoped by item, UoM, currency inherited from the book, minimum quantity, and priority. Price selection is deterministic: applicable active books are ordered by ascending priority and then by the most specific qualifying quantity break. Fixed-scale decimal arithmetic produces a calculation trace. Manual overrides require a price, reason, and approver identity and remain visible in the trace.

### Quotations

Quotations progress `draft → submitted → approved → sent → accepted → converted`. Terminal alternatives are `expired`, `rejected`, and `cancelled` from their allowed states. Each revision is immutable after submission; amendment creates the next revision under the same business code. Conversion is idempotent and binds the source quotation to exactly one order.

### Orders

Orders progress `draft → submitted → approved → confirmed → released → partially_fulfilled → fulfilled → closed`. Cancellation is permitted only where downstream ownership has not made cancellation unsafe. `postSalesOrder` is the native validation, confirmation, and release command retained for web compatibility. It requires at least one line, no blocking hold, successful supplied credit and availability checks, a tax result when supplied, and a matching expected version.

Lines and schedules are mutable only before release. Document and line amounts use fixed-scale decimal arithmetic. Fulfillment progress cannot exceed ordered quantity. Closure requires a fulfilled or permitted cancelled state.

### Holds

Holds are orthogonal records, not an order status. Kinds are credit, availability, pricing or margin, compliance, and manual review. Release is denied while any blocking hold remains open. Resolution records actor and timestamp and emits evidence.

### Return authorizations

Return authorizations progress `draft → submitted → approved → closed`, with `rejected` and `cancelled` alternatives. Lines refer to fulfilled order lines, include reason and requested disposition, and cannot exceed fulfilled quantity. Approval is a downstream handoff; Sales does not receive stock, issue a credit note, or allocate payment.

## 6. Data flow and transaction boundary

1. A Server Action stamps organization and actor from the authenticated session and supplies a correlation identifier.
2. The package validates input and checks the command permission.
3. Master Data or an injected decision port resolves authoritative facts.
4. Sales constructs immutable snapshots and deterministic calculations.
5. The Drizzle adapter commits aggregate state, audit fact, and outbox record in one database transaction using organization predicates and version compare-and-swap.
6. RSC queries read package projections directly. Consumers react to committed, versioned events.

An authoritative mutation is unsuccessful unless all three persisted effects—state, audit, and outbox—commit. Idempotency is tenant-scoped. A replay returns the original result without duplicating state or evidence.

## 7. Security and tenancy

Organization identity is mandatory and never inferred inside the package. Every SQL read and write includes the tenant predicate. Composite tenant foreign keys prevent a child row from referencing a parent in another organization. Package authorization fails closed when no authorization port is supplied. Server Actions repeat permission checks at the user boundary and never accept organization or actor identity from form input.

External data is parsed before use. Failures return safe messages and structured details; database or provider credentials are never included. Commercial snapshots retain business evidence but must not contain secret tokens or unrestricted personal data.

## 8. Failure modes

| Failure | Result | Required behavior |
| --- | --- | --- |
| Invalid external input | `BAD_REQUEST` | No authorization-dependent write and no persistence |
| Missing or denied permission | `UNAUTHORIZED` or `FORBIDDEN` | Fail closed |
| Master inactive or unsuitable | `CONFLICT` with `SALES_MASTER_NOT_USABLE` | No shadow-master fallback |
| Stale version | `CONFLICT` with `SALES_VERSION_CONFLICT` | Return expected and actual version |
| Duplicate command | Original successful result | No duplicate audit or outbox record |
| Invalid lifecycle or excess quantity | `CONFLICT` with `SALES_INVALID_STATE` | Atomic rollback |
| Blocking hold or rejected port check | `CONFLICT` with structured reason | Order remains unreleased |
| Persistence/provider exception | Safe failure envelope | Transaction rolls back; details are not leaked |

## 9. Database migration and rollback

The Sales schema replacement intentionally preserves no legacy Sales rows. Migration generation occurs only after contracts and schema tests stabilize. The generated SQL must be reviewed for a Sales-only destructive scope, create-order correctness, composite tenant constraints, indexes, checks, and absence of changes to Master Data or other ERP tables.

The rehearsal creates `sales-rebuild-20260728` from production branch `br-tiny-hill-ao82jp6f` in project `young-hat-54755363`. Only local `.env.local` may point to the temporary branch pooled connection. The workflow resets Sales-owned tables, applies the inspected migration, runs integration and tenancy evidence, restores the original local production configuration, and deletes the temporary branch. Production migration execution is out of scope.

Rollback during rehearsal is branch deletion after restoring `.env.local`. A production rollback design for a future release must use a reviewed forward recovery migration; legacy Sales data restoration is explicitly unavailable.

## 10. Acceptance

Acceptance requires the commands in the requirements evidence matrix to pass, all ten Sales tables to be hard tenant roots, manifest parity across commands, queries, permissions, events, and tables, no peer ERP imports, no SQL outside the Drizzle adapter, no production dependency on testing code, and no legacy source retained. Temporary-Neon evidence must show migration success and cross-tenant protection without applying to production.
