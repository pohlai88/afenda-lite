# Semantic registry contract

## Contents

1. Ownership test
2. Operation definition shape
3. Normalization and serialization
4. Public-boundary rules
5. Deletion rules

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
the permanent facade. Prohibit consumers from:

- importing implementation subpaths;
- constructing internal contexts, stores, ports, or adapters;
- mapping codes to authorization, retry, transport, privacy, or wording policy;
- manually serializing canonical values;
- depending on registry storage shape.

## 5. Deletion rules

Delete a replaced surface only after exact structural and behavioral parity is
proved. The same cutover must remove:

- manual projection maps;
- duplicate constants that existed only for those maps;
- superseded aggregating barrels;
- old constructors or alternate facades;
- compatibility adapters and historical output aliases;
- tests that enforce the superseded representation, replacing them with semantic
  contract tests rather than weakening coverage.
