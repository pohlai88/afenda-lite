# ERP canonical operation registry specification

| Field | Value |
| --- | --- |
| Owner | Feature containing the operation |
| Canonical file | `src/features/<group>/<feature>/operation-registry.ts` |
| Package projection | Composed operation registry |
| Purpose | Single semantic authority for executable command and query metadata |

## 1. Contract

```ts
export type ErpOperationKind = "command" | "query";
export type TransactionMode = "required" | "supported" | "none";
export type IdempotencyMode = "required" | "supported" | "none";
export type Disposition = "required" | "conditional" | "none";

export interface ErpOperationDefinition<
  Id extends string = string,
  ErrorCode extends string = string,
> {
  readonly id: Id;
  readonly kind: ErpOperationKind;
  readonly featureOwner: `${string}/${string}`;
  readonly publicName: string;
  readonly inputContract: string;
  readonly outputContract: string;
  readonly permission: string;
  readonly authorizationPolicy: string;
  readonly approvalPolicy: string | "none";
  readonly privacyPolicy: string | "none";
  readonly transaction: TransactionMode;
  readonly idempotency: IdempotencyMode;
  readonly audit: Disposition;
  readonly emission: Disposition;
  readonly observabilityClass: string;
  readonly mutationTables: readonly string[];
  readonly errorCodes: readonly ErrorCode[];
  readonly emittedEvents: readonly string[];
  readonly publicProjection: string | "none";
}
```

The repository implementation may use a narrower generic form, but it must preserve the semantic fields.

## 2. Invariants

1. Operation ID is globally unique within the package.
2. `featureOwner` matches the physical feature path.
3. Commands and queries use distinct operation kinds.
4. A query declares no mutation table, transaction-required mutation, audit mutation, or emitted business event.
5. A mutating command declares every table it can write.
6. Every permission and policy reference resolves.
7. Required approval has a verifier.
8. Required idempotency has a key source and store capability.
9. Required audit has an append capability.
10. Required emission has an outbox/event capability.
11. Public facade name resolves to one operation.
12. Every declared error code is part of the public narrowed `Result`.
13. Registry composition rejects duplicates and unknown references.
14. Feature definitions cannot be overridden by package composition.

## 3. Derived projections

Generate or derive:

- `CommandId`;
- `QueryId`;
- public operation map;
- command authorization map;
- query authorization map;
- permission inventory;
- approval and privacy maps;
- transaction and idempotency maps;
- audit coverage;
- event inventory;
- mutation-table inventory;
- manifest ownership;
- public error-code unions;
- consumer and documentation inventories.

Do not manually synchronize these surfaces.

## 4. Example

```ts
export const establishmentOperations = defineOperations({
  registerEstablishment: {
    id: "corporate-administration.establishments.register",
    kind: "command",
    featureOwner: "organization-structure/establishments",
    publicName: "registerEstablishment",
    inputContract: "RegisterEstablishmentInput",
    outputContract: "Establishment",
    permission: "corporate-administration.establishments.create",
    authorizationPolicy: "organization-member",
    approvalPolicy: "none",
    privacyPolicy: "business-record",
    transaction: "required",
    idempotency: "required",
    audit: "required",
    emission: "required",
    observabilityClass: "business-mutation",
    mutationTables: ["corporate_administration_establishments"],
    errorCodes: [
      "VALIDATION_FAILED",
      "FORBIDDEN",
      "DUPLICATE",
      "CONCURRENCY_CONFLICT",
    ],
    emittedEvents: [
      "corporate-administration.establishment-registered.v1",
    ],
    publicProjection: "Establishment",
  },
} as const);
```

The example is illustrative. A module PRD remains the source of product meaning.

## 5. Registry tests

Mandatory tests prove:

- no duplicate IDs;
- no duplicate public names;
- all owners exist;
- all permissions resolve;
- all policies resolve;
- all events are versioned;
- queries cannot mutate;
- command write sets are within package ownership;
- manifest and registry parity;
- facade and registry parity;
- error union parity;
- deterministic composition;
- no raw string operation IDs outside the owner and generated fixtures.

## 6. Change policy

| Change | Classification |
| --- | --- |
| Add private, unreachable operation | Internal, subject to PRD and tests |
| Add public operation | Additive public change |
| Add error code to existing operation | Potential consumer change; review required |
| Rename operation ID | Breaking |
| Rename public method | Breaking |
| Expand mutation tables | Architecture and schema-ownership review |
| Change authorization/approval | Security and product behavior change |
| Change event payload/version | Wire compatibility review |
| Change query into command | New operation; mutation review required |
