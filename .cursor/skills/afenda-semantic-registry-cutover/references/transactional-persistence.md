# Transactional semantic persistence

Load this reference only when canonical operation policy governs persisted
mutations, audit facts, outbox events, history, supersession, or multiple
tenant-owned roots.

## Contents

1. Applicability
2. Ownership split
3. Atomic execution contract
4. Tenant-lineage contract
5. Evidence matrix
6. Reusable cutover lessons

## 1. Applicability

Use this contract when a successful command creates or changes more than one
durable fact, or when a mutation traverses multiple tenant-owned roots. Skip it for
read-only registries, pure normalization, static documentation projections, and
concepts with no durable execution policy.

## 2. Ownership split

Keep one semantic owner for the operation and one adapter owner for execution:

- The canonical definition owns whether a transaction is required and which
  durable effects must exist for success to be truthful.
- A derived private projection binds the definition to effect builders or a narrow
  execution capability with exact operation-key parity.
- The adapter owns SQL, transaction handles, row decoding, and vendor mechanics.
- The public facade returns the same durable result contract regardless of adapter.

Do not put database clients, SQL fragments, mutable stores, or request state in the
registry. Do not let each adapter decide independently whether audit or outbox is
required.

## 3. Atomic execution contract

For every `transaction: "required"` command, enumerate its atomic unit:

```text
authoritative state
  + required history or derived consistency rows
  + required audit fact
  + required outbox event
  = one commit or no commit
```

Compile that unit into one database transaction. Generate audit and outbox inputs
from canonical operation/effect projections; occurrence-specific IDs, timestamps,
actors, correlation IDs, and payload values remain command data.

Reject these shapes:

- commit state, then call an audit port;
- commit state, then append an outbox event;
- catch a later failure and restore, recompute, or compensate committed state;
- perform an HTTP/vendor call inside the database transaction;
- report success when a required durable fact was not committed.

External side effects begin from the committed outbox. If the infrastructure
cannot make all required database facts atomic, redesign the persistence boundary;
do not label a best-effort sequence transactional.

## 4. Tenant-lineage contract

A multi-root mutation must prove that every root and relationship belongs to the
command organization. Apply the tenant predicate to:

- source and target roots;
- relationship and junction rows;
- history, supersession, predecessor, and successor rows;
- nested `SELECT`, `UPDATE`, and `DELETE` statements;
- conflict/idempotency lookups and conditional inserts.

Never infer ownership from globally unique IDs or from a primary root alone. Prefer
database statements whose joins and `WHERE` clauses make same-tenant lineage
explicit and fail closed when any participant is absent or cross-tenant.

## 5. Evidence matrix

| Evidence | Required proof |
|----------|----------------|
| Registry contract | Every mutation has explicit transaction and emission dispositions |
| Projection parity | Definition keys exactly match private execution bindings |
| Atomic success | State, audit, outbox, and required derived rows all exist |
| Atomic failure | Injected failure leaves none of the unit visible |
| Boundary guard | Production adapter contains no post-commit emission or compensation path |
| Tenant success | Same-tenant multi-root mutation succeeds |
| Tenant hostility | Cross-tenant or missing-root mutation fails without writes |
| Adapter parity | Memory and database adapters expose the same semantic outcome |
| Live database | Production transaction and predicate behavior is exercised when required |

Prefer semantic assertions over representation snapshots. Tests may inspect source
to forbid known leakage patterns, but source inspection supplements rather than
replaces behavioral rollback and tenant-isolation evidence.

## 6. Reusable cutover lessons

1. Centralizing definitions is incomplete while persistence policy remains spread
   across handlers and adapters.
2. Audit and outbox are durable business facts when the operation registry marks
   them required; they are not optional observers after commit.
3. Compensation is not a substitute for an available atomic database boundary.
4. Tenant ownership is a graph invariant, not a single-column check on one table.
5. Replace tests coupled to old call order with outcome, durable-fact, rollback,
   and hostile-input contracts.
6. Add a narrow structural guard after cutover so post-commit interpretation cannot
   silently return.
