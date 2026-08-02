# Semantic registry contract

## Contents

1. Ownership test
2. Operation definition shape
3. Normalization and serialization
4. Public-boundary rules
5. Transaction and tenant ownership
6. Deletion rules

## 1. Ownership test

A registry is canonical only when it answers all of these questions:

- Which domain owns the meaning?
- Which identifier is canonical?
- Which historical values are accepted, and where are they normalized?
- Which behavior is policy rather than occurrence-specific data?
- Which projections are derived?
- Which public capability may consumers call?
- Which other files cease to be semantic sources?

Reject a design that requires two registries to be synchronized or teaches every
consumer the same new fact.

## 2. Operation definition shape

Adapt this bounded shape to the target; do not introduce fields without a real
projection or invariant:

```ts
type OperationDefinition<
	TId extends string,
	TOwner extends string,
	TPermission extends string,
> = {
	readonly id: TId;
	readonly kind: "command" | "query";
	readonly owner: TOwner;
	readonly permission: TPermission;
	readonly authorizationPolicy: string;
	readonly privacyPolicy: string | "none";
	readonly transaction: "required" | "supported" | "none";
	readonly idempotency: "required" | "supported" | "none";
	readonly audit: "required" | "conditional" | "none";
	readonly emission: "required" | "conditional" | "none";
	readonly publicProjection: string | "none";
	readonly observabilityClass: string;
};
```

Keep handlers and runtime dependencies outside globally readable metadata when
doing so improves isolation or compiler performance. Bind handlers through a
private domain projection with exact key parity.

## 3. Normalization and serialization

- Keep aliases beside the ingress schema that understands them.
- Parse external data from `unknown`.
- Normalize aliases immediately into canonical values.
- Accept canonical values only for new construction.
- Emit canonical values only.
- Keep wire/event/export serializers with the owning projection.
- Record alias use through bounded observability when operationally required.

Do not use one global alias map for unrelated domains.

## 4. Public-boundary rules

Permit consumers to call, carry, declare, and narrow canonical outcomes through
the permanent root facade.

Require exactly one business capability style at the package root. A declared
auxiliary entrypoint is allowed only when it prevents testing, composition,
tooling, or a distinct deployment/security context from loading through the root.
For every auxiliary entrypoint, record its isolation reason and accepted consumer
class. Prove that it:

- does not export alternate commands, queries, semantic registries, or results;
- does not become a second construction style for business consumers;
- does not leak implementation classes or storage shapes beyond its named context;
- resolves under both its real runtime and downstream TypeScript conditions.

Prohibit consumers from:

- importing undeclared or business-implementation subpaths;
- constructing internal contexts, stores, ports, or adapters;
- mapping codes to authorization, retry, transport, privacy, or wording policy;
- manually serializing canonical values;
- depending on registry storage shape.

An adapter factory may remain on an isolated composition subpath when the
application composition root genuinely needs it. Keep implementation classes and
store representations private even there unless their exposure is the explicit,
accepted composition contract.

## 5. Transaction and tenant ownership

An operation disposition of `transaction: "required"` means all durable facts
needed to truthfully report success share one database commit boundary. Derive the
execution projection from the canonical operation definition; do not maintain a
second adapter-owned transaction policy.

Audit and emission dispositions are exhaustive per operation. Adapters may supply
occurrence data, but they may not decide whether a required audit fact or event is
optional.

The atomic unit normally includes:

- authoritative domain-state writes;
- required audit facts;
- required outbox events;
- consistency-critical derived rows, history, or supersession links.

Live clients, transactions, SQL fragments, and request state remain adapter-owned.
The registry owns the policy and declared effects; the adapter compiles them into
the database transaction. External calls are not database effects and must follow
the committed outbox rather than execute inside or after the mutation as if atomic.

For tenant-owned data, every participating root and relationship must prove the
same canonical tenant. Apply the organization predicate to reads, joins, updates,
deletes, supersession links, and lineage traversal. Identifier uniqueness, a
foreign key, or a tenant predicate on only the primary row is insufficient.

See [transactional-persistence.md](transactional-persistence.md) for the conditional
implementation and evidence contract.

## 6. Deletion rules

Delete a replaced surface only after exact structural and behavioral parity is
proved. The same cutover must remove:

- manual projection maps;
- duplicate constants that existed only for those maps;
- superseded aggregating barrels;
- old constructors or alternate facades;
- compatibility adapters and historical output aliases;
- tests that enforce the superseded representation, replacing them with semantic
  contract tests rather than weakening coverage.
- post-commit audit/outbox calls and compensation routines made obsolete by an
  atomic execution projection.
