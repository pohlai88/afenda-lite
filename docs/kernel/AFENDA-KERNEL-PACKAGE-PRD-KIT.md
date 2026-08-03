# AFENDA Kernel Package PRD Kit — Integrated Review Copy

# AFENDA Kernel Package PRD Index

This kit decomposes the normative kernel governance registry into **17 individual package PRDs**, one for each admitted bounded reusable capability.

| No. | Package | Band | Kind | Persistence | Criticality | Individual PRD |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `@afenda/errors` | `foundation` | `CLOSED` | `NONE` | C1 | [errors PRD](package-specs/foundation/errors/PRD.md) |
| 2 | `@afenda/ids` | `foundation` | `CLOSED` | `NONE` | C1 | [ids PRD](package-specs/foundation/ids/PRD.md) |
| 3 | `@afenda/money` | `foundation` | `CLOSED` | `NONE` | C1 | [money PRD](package-specs/foundation/money/PRD.md) |
| 4 | `@afenda/quantity` | `foundation` | `OPEN` | `INJECTED` | C1 | [quantity PRD](package-specs/foundation/quantity/PRD.md) |
| 5 | `@afenda/temporal` | `foundation` | `CLOSED` | `NONE` | C1 | [temporal PRD](package-specs/foundation/temporal/PRD.md) |
| 6 | `@afenda/codes` | `foundation` | `CLOSED` | `NONE` | C2 | [codes PRD](package-specs/foundation/codes/PRD.md) |
| 7 | `@afenda/tenancy` | `foundation` | `CLOSED` | `NONE` | C1 | [tenancy PRD](package-specs/foundation/tenancy/PRD.md) |
| 8 | `@afenda/authz` | `foundation` | `CLOSED` | `NONE` | C1 | [authz PRD](package-specs/foundation/authz/PRD.md) |
| 9 | `@afenda/idempotency` | `runtime` | `CLOSED` | `INJECTED` | C1 | [idempotency PRD](package-specs/runtime/idempotency/PRD.md) |
| 10 | `@afenda/events` | `runtime` | `CLOSED` | `NONE` | C1 | [events PRD](package-specs/runtime/events/PRD.md) |
| 11 | `@afenda/observability` | `runtime` | `CLOSED` | `INJECTED` | C2 | [observability PRD](package-specs/runtime/observability/PRD.md) |
| 12 | `@afenda/env` | `runtime` | `CLOSED` | `NONE` | C2 | [env PRD](package-specs/runtime/env/PRD.md) |
| 13 | `@afenda/db` | `data-plane` | `CLOSED` | `OWNED` | C1 | [db PRD](package-specs/data-plane/db/PRD.md) |
| 14 | `@afenda/outbox` | `data-plane` | `CLOSED` | `OWNED` | C1 | [outbox PRD](package-specs/data-plane/outbox/PRD.md) |
| 15 | `@afenda/audit` | `data-plane` | `CLOSED` | `OWNED` | C1 | [audit PRD](package-specs/data-plane/audit/PRD.md) |
| 16 | `@afenda/numbering` | `data-plane` | `OPEN` | `OWNED` | C1 | [numbering PRD](package-specs/data-plane/numbering/PRD.md) |
| 17 | `@afenda/read-models` | `data-plane` | `CLOSED` | `INJECTED` | C2 | [read-models PRD](package-specs/data-plane/read-models/PRD.md) |

## Authority model

1. `sources/KERNEL-GOVERNANCE.md` remains the normative governance source.
2. These PRDs define package-specific product behavior, architecture trees, tests, and sequential implementation slices.
3. Workspace registers and frozen admission contracts must supply named owners, exact consumers, final dependency edges, compatibility windows, and measurable budgets.
4. A PRD does not create authority to implement a package absent from the admission registry.

## Documentation placement

```text
docs/kernel/package-specs/<band>/<package>/PRD.md
```

Production source mirrors the admitted band/package identity:

```text
packages/<band>/<package>/
```

## Review order

1. Foundation semantics: errors → ids → temporal → codes → tenancy → authz → money → quantity.
2. Runtime mechanisms: env → events → observability → idempotency.
3. Data plane: db → audit → outbox → numbering → read-models.

The order is a delivery proposal, not a dependency-edge authority. The final workspace-edge register controls admissible edges.


---

# @afenda/errors — Product Requirements Document

| Field | Value |
| --- | --- |
| Document type | Individual kernel package PRD |
| Status | Draft for admission and implementation approval |
| Package | `@afenda/errors` |
| Physical path | `packages/foundation/errors` |
| Band | `foundation` |
| Kernel kind | `CLOSED` |
| Persistence mode | `NONE` |
| Criticality | `C1` |
| Governing authority | `packages/KERNEL-GOVERNANCE.md` |
| Capability owner | Package Owner role; named human must be recorded in the admission contract |
| Architecture owner | Architecture Owner role; named human must be recorded in the admission contract |
| Security owner | Required for C1 admission, verification, and seal |

> This PRD defines one package capability. It does not override the governance authority, workspace package register, frozen admission contract, workspace-edge register, or machine-readable requirement register.

---

## 1. Product/capability statement

**Admitted capability:** Canonical outcome representation, code space, retry semantics, and normalization of unknown or vendor failures.

**Problem.** Without one outcome kernel, packages invent incompatible error codes, leak vendor diagnostics, disagree on retryability, and force consumers to branch on transport-specific exceptions.

## 2. Goals

- Provide one code-narrowable `Result<Data, Code>` contract.
- Own canonical error codes and per-code retry semantics.
- Normalize unknown and vendor failures once without exposing unsafe causes.
- Preserve public error stability while allowing private diagnostic evolution.

## 3. Explicit non-goals and non-ownership

- HTTP status mapping, route response formatting, or UI copy.
- Business-domain validation rules or package-specific error taxonomies.
- Logging, tracing, incident management, or exception transport.

The package must not absorb unrelated shared helpers, bounded-context policy, application concerns, UI concerns, or a canonical cross-domain registry.

## 4. Consumers and jobs to be done

**Candidate production consumer classes** — exact package names must be frozen in the admission contract:

- All kernel packages
- ERP packages that return representable failures
- Application composition layers that translate outcomes to transport responses

Consumer jobs:

1. Import the registered entrypoint rather than an internal path.
2. Invoke a stable representation-safe capability.
3. Receive canonical values or `@afenda/errors` outcomes.
4. Replace internal implementation without production-consumer edits.

## 5. Admission decisions

| Decision | Required result | Package-specific interpretation |
| --- | --- | --- |
| Ownership | PASS | `@afenda/errors` is the single owner of the admitted capability and nothing broader. |
| Policy neutrality | PASS | No organization-specific, workflow-specific, legal, tax, accounting, or domain disposition is encoded. |
| Jurisdiction portability | PASS | Facts may be represented; jurisdictional conclusions remain with bounded contexts or approved policy layers. |
| Reuse portability | PASS | Capability remains reusable by multiple registered consumers without app/framework coupling. |

## 6. Runtime and dependency contract

| Surface | Proposed admission value |
| --- | --- |
| Permitted runtime targets | `pure` |
| Default entrypoint | `.` |
| Auxiliary entrypoints | None. |
| Proposed authorized dependency edges | None proposed. |

These values are implementation-ready proposals but become authoritative only when recorded in the workspace package register, admission contract, `package.json`, and workspace-edge register.

## 7. Canonical records and public types

- `ErrorCode`
- `Result<Data, Code>`
- `PublicError<Code, Details>`
- `RetryDisposition`
- `ErrorNormalizationInput`
- `CompatibilityProfile`

Public types must be derived from these canonical definitions. Separately maintained unions, maps, validators, or registries are prohibited.

## 8. Functional operations

| No. | Required operation |
| ---: | --- |
| 01 | `ok(data)` creates a successful result. |
| 02 | `fail(code, publicDetails?)` creates a public-safe failure. |
| 03 | `normalizeUnknown(input)` converts unknown or vendor failures to canonical failure outcomes. |
| 04 | `retryDisposition(code)` returns the canonical retry policy. |
| 05 | `isFailure(result)` and code-aware narrowing helpers preserve exhaustive handling. |

## 9. Normative package invariants

| Invariant ID | Requirement |
| --- | --- |
| ERRORS-INV-001 | Public failures never expose internal causes, stack traces, secrets, or vendor payloads. |
| ERRORS-INV-002 | Every code has exactly one retry disposition. |
| ERRORS-INV-003 | Unknown input never escapes as an unhandled throw from normalization. |
| ERRORS-INV-004 | Public result discriminants and payload keys remain stable within a major version. |

## 10. Failure and outcome model

- Normalization fallback uses the canonical internal/unexpected code.
- Invalid public detail shapes fail construction rather than widening silently.

All representable failures use code-narrowable `Result<Data, Code>` outcomes. Internal causes and unsafe diagnostics are not public payloads.

## 11. Ingress and normalization

- Unknown exceptions and vendor errors enter through `src/ingress/`.
- Vendor-specific aliases normalize immediately and are never emitted.

Every applicable ingress path accepts `unknown`, parses once, applies declared byte/depth/count bounds, and emits canonical-only values.

## 12. Persistence and transaction model

- Not applicable. The package must declare no store, schema, or persistence adapter.

Persistence implementation must remain mechanism-only and must not encode bounded-context policy.

## 13. Events, integrations, and composition

- Consumers translate canonical failures to HTTP, event, CLI, or UI representations outside this package.

No application, route, React, Next.js, presentation, or undeclared internal-path dependency is permitted.

## 14. Tenancy, privacy, and security

- Diagnostic causes remain private and identity-preserved only through unreachable internal storage.
- Public projections are redaction-safe by construction.

For C1, an approved threat model, SBOM, high-severity vulnerability gate, and negative-path security tests are mandatory before `VERIFIED`.

## 15. Non-functional requirements

- Normalization is deterministic for identical explicit input classification.
- Result construction is constant-time and allocation-bounded.
- Default entrypoint has no I/O and no ambient runtime dependency.

The final admission contract must record measurable complexity, input-size, throughput, bundle, compatibility, and controlled-latency budgets applicable to the package profile.

## 16. Conditional applicability resolution

| Trigger family | Proposed result | Reason |
| --- | --- | --- |
| Ingress | APPLICABLE | Package accepts unknown, serialized, vendor, alias-bearing, or configuration input. |
| Generated projections | NOT_APPLICABLE | No generated artifact in proposed topology. |
| Persistent-kernel storage | NOT_APPLICABLE | Persistence mode is NONE. |
| Multi-target isolation | NOT_APPLICABLE | Targets: pure. |
| C1 threat model | APPLICABLE | Criticality is C1. |

`NOT_APPLICABLE` is valid only when the machine-readable requirement register evaluates the trigger as false.

## 17. Architecture tree

This topology contains only responsibilities triggered by this PRD. Empty, decorative, placeholder, or future-use directories are prohibited.

```text
packages/foundation/errors/
├── __tests__
│   ├── errors.boundary.test.ts
│   ├── errors.contract.test.ts
│   ├── errors.normalization.test.ts
│   └── errors.retry-parity.test.ts
└── src
    ├── capabilities
    │   ├── narrowing.ts
    │   ├── result.ts
    │   └── retry.ts
    ├── contract
    │   ├── compatibility.ts
    │   ├── error-code.ts
    │   ├── public-error.ts
    │   ├── result.ts
    │   └── retry-disposition.ts
    ├── index.ts
    ├── ingress
    │   ├── normalize-unknown.ts
    │   └── normalize-vendor.ts
    └── internal
        └── diagnostic-cause.ts
```

### 17.1 File responsibility register

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | explicit public facade |
| `src/contract/error-code.ts` | canonical code definitions |
| `src/contract/result.ts` | Result contract and narrowing types |
| `src/contract/public-error.ts` | public-safe failure shape |
| `src/contract/retry-disposition.ts` | retry semantics |
| `src/contract/compatibility.ts` | compatibility declaration |
| `src/capabilities/result.ts` | success/failure constructors |
| `src/capabilities/narrowing.ts` | code-aware guards |
| `src/capabilities/retry.ts` | retry lookup |
| `src/ingress/normalize-unknown.ts` | unknown normalization |
| `src/ingress/normalize-vendor.ts` | vendor normalization boundary |
| `src/internal/diagnostic-cause.ts` | private diagnostic identity |
| `__tests__/errors.contract.test.ts` | public contract coverage |
| `__tests__/errors.normalization.test.ts` | hostile/vendor input coverage |
| `__tests__/errors.retry-parity.test.ts` | code-to-retry parity |
| `__tests__/errors.boundary.test.ts` | purity and export boundary checks |

### 17.2 Facade rules

- `src/index.ts` contains explicit named exports only and no logic or side effects.
- Auxiliary entrypoints expose only the registered isolation/composition surface.
- Raw clients, SQL objects, mutable adapter instances, storage implementations, and private registries are never exported through `.`.
- Cross-package consumers import `@afenda/errors` or a registered auxiliary entrypoint only.

## 18. Test and evidence contract

Required evidence families:

- `KRN-ID-*`
- `KRN-OWN-*`
- `KRN-CTR-*`
- `KRN-BND-*`
- `KRN-SEC-*`
- `KRN-QUA-*`
- `KRN-NFR-*`
- `KRN-REL-*`
- `KRN-DOC-*`
- `KRN-ING-*`

Minimum executable gates:

1. Inspector snapshot.
2. Registry parity and dependency-boundary gates.
3. Package lint and strict typecheck.
4. Behavior/contract tests for every exported capability.
5. Rejection tests for every ingress path.
6. Projection and adapter parity where applicable.
7. Consumer compile demonstration for every declared consumer.
8. Coverage threshold: 90% branch coverage.
9. Mutation testing where the C1 logic trigger applies.
10. Entrypoint isolation, budgets, compatibility, security, evidence-completeness, and digest calculation.

A skipped, timed-out, killed, resource-starved, or unrecorded applicable gate is failure.

## 19. Implementation slices

| Slice | Coherent outcome | Gate to advance |
| --- | --- | --- |
| ERRORS-1.0 | Freeze code registry, Result shape, retry table, and non-ownership. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| ERRORS-2.0 | Implement constructors and exhaustive narrowing helpers. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| ERRORS-3.0 | Implement unknown/vendor normalization with public/private separation. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| ERRORS-4.0 | Add parity, hostile-input, boundary, coverage, and mutation evidence. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| ERRORS-5.0 | Run consumer refactor demonstration and issue verification record. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |

Slices are sequential-gated, independently reviewable, and constrained to exact package/write boundaries. No later slice begins while an earlier slice is non-green.

## 20. Acceptance criteria and definition of done

The package is `IMPLEMENTED` only when:

- all exported behavior is real, tested, and derived from canonical definitions or admitted mechanism state;
- all applicable ownership, contract, ingress, projection, storage, and consumer checks pass;
- memory/fake and production adapter parity passes where multiple adapters exist;
- no placeholder runtime path, stub return, TODO behavior branch, or deferred deletion remains.

The package is `VERIFIED` only when one evidence-complete CI run proves all applicable mandatory requirements for one content digest, including security, budgets, compatibility, coverage, mutation where triggered, internal-refactor demonstration, and evidence completeness.

A seal may be issued only after verification and attests one package capability, commit, and content digest. It is not release, deployment, migration, or statutory approval.

## 21. Required admission records before production-source merge

1. Named owners and signatories.
2. Exact accepted production consumers.
3. Exact runtime targets and auxiliary-entrypoint isolation reasons.
4. Exact dependency edges in both `package.json` and the workspace-edge register.
5. Compatibility support windows.
6. Machine-resolved requirement applicability expressions.
7. Measurable non-functional budgets.
8. Four admission decisions recorded as PASS.

## 22. Rejected designs

- Generic `shared`, `common`, `utils`, `core`, `types`, `registry`, or umbrella kernel package.
- Wildcard exports or internal-path consumption.
- Mutable request/tenant/transaction/clock/adapter singleton.
- App/framework dependency.
- Manually synchronized projection.
- Business-policy ownership not stated in the admitted capability.
- A mutable `SEALED` lifecycle state.
- Treating partial, skipped, or undocumented evidence as success.


---

# @afenda/ids — Product Requirements Document

| Field | Value |
| --- | --- |
| Document type | Individual kernel package PRD |
| Status | Draft for admission and implementation approval |
| Package | `@afenda/ids` |
| Physical path | `packages/foundation/ids` |
| Band | `foundation` |
| Kernel kind | `CLOSED` |
| Persistence mode | `NONE` |
| Criticality | `C1` |
| Governing authority | `packages/KERNEL-GOVERNANCE.md` |
| Capability owner | Package Owner role; named human must be recorded in the admission contract |
| Architecture owner | Architecture Owner role; named human must be recorded in the admission contract |
| Security owner | Required for C1 admission, verification, and seal |

> This PRD defines one package capability. It does not override the governance authority, workspace package register, frozen admission contract, workspace-edge register, or machine-readable requirement register.

---

## 1. Product/capability statement

**Admitted capability:** Branded identifier contracts, parsing, validation, and controlled ULID/UUIDv7 generation.

**Problem.** Unbranded strings allow identifier mix-ups, inconsistent parsing, uncontrolled randomness, and format drift across package boundaries.

## 2. Goals

- Provide branded identifiers that cannot be accidentally interchanged.
- Parse and validate external identifier values once.
- Support controlled ULID and UUIDv7 generation through explicit entropy and clock capabilities.
- Keep generated values canonical and sortable where the chosen format guarantees it.

## 3. Explicit non-goals and non-ownership

- Database primary-key policy for business entities.
- Human-readable document numbering.
- Tenant ownership, authorization, or entity lookup.

The package must not absorb unrelated shared helpers, bounded-context policy, application concerns, UI concerns, or a canonical cross-domain registry.

## 4. Consumers and jobs to be done

**Candidate production consumer classes** — exact package names must be frozen in the admission contract:

- Kernel packages requiring stable identifiers
- ERP bounded contexts
- Data-plane packages creating facts, messages, or positions

Consumer jobs:

1. Import the registered entrypoint rather than an internal path.
2. Invoke a stable representation-safe capability.
3. Receive canonical values or `@afenda/errors` outcomes.
4. Replace internal implementation without production-consumer edits.

## 5. Admission decisions

| Decision | Required result | Package-specific interpretation |
| --- | --- | --- |
| Ownership | PASS | `@afenda/ids` is the single owner of the admitted capability and nothing broader. |
| Policy neutrality | PASS | No organization-specific, workflow-specific, legal, tax, accounting, or domain disposition is encoded. |
| Jurisdiction portability | PASS | Facts may be represented; jurisdictional conclusions remain with bounded contexts or approved policy layers. |
| Reuse portability | PASS | Capability remains reusable by multiple registered consumers without app/framework coupling. |

## 6. Runtime and dependency contract

| Surface | Proposed admission value |
| --- | --- |
| Permitted runtime targets | `pure`, `node` |
| Default entrypoint | `.` |
| Auxiliary entrypoints | `./node` |
| Proposed authorized dependency edges | `@afenda/errors` |

These values are implementation-ready proposals but become authoritative only when recorded in the workspace package register, admission contract, `package.json`, and workspace-edge register.

## 7. Canonical records and public types

- `IdentifierBrand<Name>`
- `IdentifierKind`
- `Ulid`
- `UuidV7`
- `EntropySource`
- `TimestampSource`
- `IdentifierParseFailure`

Public types must be derived from these canonical definitions. Separately maintained unions, maps, validators, or registries are prohibited.

## 8. Functional operations

| No. | Required operation |
| ---: | --- |
| 01 | `parseIdentifier(kind, unknown)` validates and brands input. |
| 02 | `isIdentifier(kind, value)` performs safe runtime validation. |
| 03 | `generateUlid(clock, entropy)` creates a controlled ULID. |
| 04 | `generateUuidV7(clock, entropy)` creates a controlled UUIDv7. |
| 05 | `compareSortableIds(left, right)` compares formats with guaranteed lexical ordering. |

## 9. Normative package invariants

| Invariant ID | Requirement |
| --- | --- |
| IDS-INV-001 | Brands are compile-time distinctions backed by runtime format checks. |
| IDS-INV-002 | Generation never reads ambient clock or randomness through the default entrypoint. |
| IDS-INV-003 | A parser accepts only the declared canonical representation. |
| IDS-INV-004 | Identifier format changes are breaking unless an approved compatibility record exists. |

## 10. Failure and outcome model

- Malformed, wrong-kind, or out-of-range values return canonical Result failures.
- Generation rejects invalid clock or entropy capabilities without partial output.

All representable failures use code-narrowable `Result<Data, Code>` outcomes. Internal causes and unsafe diagnostics are not public payloads.

## 11. Ingress and normalization

- All external values enter as `unknown`.
- No legacy alias is emitted after successful parsing.

Every applicable ingress path accepts `unknown`, parses once, applies declared byte/depth/count bounds, and emits canonical-only values.

## 12. Persistence and transaction model

- Not applicable. Identifier persistence belongs to consuming packages.

Persistence implementation must remain mechanism-only and must not encode bounded-context policy.

## 13. Events, integrations, and composition

- The `./node` entrypoint may supply registered host clock and cryptographic entropy composition only.

No application, route, React, Next.js, presentation, or undeclared internal-path dependency is permitted.

## 14. Tenancy, privacy, and security

- Entropy must be cryptographically appropriate for production generation.
- Inputs are length-bounded before parsing.

For C1, an approved threat model, SBOM, high-severity vulnerability gate, and negative-path security tests are mandatory before `VERIFIED`.

## 15. Non-functional requirements

- Parsing is linear in bounded identifier length.
- Generation is deterministic under fixed injected clock and entropy fixtures.
- Pure default facade remains browser/edge safe.

The final admission contract must record measurable complexity, input-size, throughput, bundle, compatibility, and controlled-latency budgets applicable to the package profile.

## 16. Conditional applicability resolution

| Trigger family | Proposed result | Reason |
| --- | --- | --- |
| Ingress | APPLICABLE | Package accepts unknown, serialized, vendor, alias-bearing, or configuration input. |
| Generated projections | NOT_APPLICABLE | No generated artifact in proposed topology. |
| Persistent-kernel storage | NOT_APPLICABLE | Persistence mode is NONE. |
| Multi-target isolation | APPLICABLE | Targets: pure, node. |
| C1 threat model | APPLICABLE | Criticality is C1. |

`NOT_APPLICABLE` is valid only when the machine-readable requirement register evaluates the trigger as false.

## 17. Architecture tree

This topology contains only responsibilities triggered by this PRD. Empty, decorative, placeholder, or future-use directories are prohibited.

```text
packages/foundation/ids/
├── __tests__
│   ├── ids.contract.test.ts
│   ├── ids.entrypoints.test.ts
│   ├── ids.generation.test.ts
│   └── ids.parser.property.test.ts
└── src
    ├── capabilities
    │   ├── compare.ts
    │   ├── generate.ts
    │   ├── parse.ts
    │   └── validate.ts
    ├── contract
    │   ├── brand.ts
    │   ├── compatibility.ts
    │   ├── generation.ts
    │   └── kind.ts
    ├── index.ts
    ├── ingress
    │   └── external-identifier.ts
    ├── internal
    │   ├── ulid.ts
    │   └── uuidv7.ts
    ├── node.ts
    └── runtime
        └── node
            ├── clock.ts
            └── entropy.ts
```

### 17.1 File responsibility register

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | pure public facade |
| `src/node.ts` | registered Node generation facade |
| `src/contract/brand.ts` | identifier brand type |
| `src/contract/kind.ts` | supported identifier kinds |
| `src/contract/generation.ts` | clock and entropy capabilities |
| `src/contract/compatibility.ts` | format compatibility profile |
| `src/capabilities/parse.ts` | parsing and branding |
| `src/capabilities/validate.ts` | runtime guards |
| `src/capabilities/generate.ts` | controlled generation |
| `src/capabilities/compare.ts` | sortable comparison |
| `src/ingress/external-identifier.ts` | unknown input boundary |
| `src/internal/ulid.ts` | ULID mechanism |
| `src/internal/uuidv7.ts` | UUIDv7 mechanism |
| `src/runtime/node/entropy.ts` | Node entropy composition |
| `src/runtime/node/clock.ts` | Node clock composition |
| `__tests__/ids.contract.test.ts` | brand and facade contracts |
| `__tests__/ids.parser.property.test.ts` | parser property coverage |
| `__tests__/ids.generation.test.ts` | deterministic generation fixtures |
| `__tests__/ids.entrypoints.test.ts` | target isolation |

### 17.2 Facade rules

- `src/index.ts` contains explicit named exports only and no logic or side effects.
- Auxiliary entrypoints expose only the registered isolation/composition surface.
- Raw clients, SQL objects, mutable adapter instances, storage implementations, and private registries are never exported through `.`.
- Cross-package consumers import `@afenda/ids` or a registered auxiliary entrypoint only.

## 18. Test and evidence contract

Required evidence families:

- `KRN-ID-*`
- `KRN-OWN-*`
- `KRN-CTR-*`
- `KRN-BND-*`
- `KRN-SEC-*`
- `KRN-QUA-*`
- `KRN-NFR-*`
- `KRN-REL-*`
- `KRN-DOC-*`
- `KRN-ING-*`

Minimum executable gates:

1. Inspector snapshot.
2. Registry parity and dependency-boundary gates.
3. Package lint and strict typecheck.
4. Behavior/contract tests for every exported capability.
5. Rejection tests for every ingress path.
6. Projection and adapter parity where applicable.
7. Consumer compile demonstration for every declared consumer.
8. Coverage threshold: 90% branch coverage.
9. Mutation testing where the C1 logic trigger applies.
10. Entrypoint isolation, budgets, compatibility, security, evidence-completeness, and digest calculation.

A skipped, timed-out, killed, resource-starved, or unrecorded applicable gate is failure.

## 19. Implementation slices

| Slice | Coherent outcome | Gate to advance |
| --- | --- | --- |
| IDS-1.0 | Freeze supported formats, brands, and compatibility profile. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| IDS-2.0 | Implement bounded parse/validate behavior. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| IDS-3.0 | Implement injected-clock and injected-entropy generation. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| IDS-4.0 | Add isolated Node composition entrypoint. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| IDS-5.0 | Complete property, mutation, boundary, and consumer compile evidence. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |

Slices are sequential-gated, independently reviewable, and constrained to exact package/write boundaries. No later slice begins while an earlier slice is non-green.

## 20. Acceptance criteria and definition of done

The package is `IMPLEMENTED` only when:

- all exported behavior is real, tested, and derived from canonical definitions or admitted mechanism state;
- all applicable ownership, contract, ingress, projection, storage, and consumer checks pass;
- memory/fake and production adapter parity passes where multiple adapters exist;
- no placeholder runtime path, stub return, TODO behavior branch, or deferred deletion remains.

The package is `VERIFIED` only when one evidence-complete CI run proves all applicable mandatory requirements for one content digest, including security, budgets, compatibility, coverage, mutation where triggered, internal-refactor demonstration, and evidence completeness.

A seal may be issued only after verification and attests one package capability, commit, and content digest. It is not release, deployment, migration, or statutory approval.

## 21. Required admission records before production-source merge

1. Named owners and signatories.
2. Exact accepted production consumers.
3. Exact runtime targets and auxiliary-entrypoint isolation reasons.
4. Exact dependency edges in both `package.json` and the workspace-edge register.
5. Compatibility support windows.
6. Machine-resolved requirement applicability expressions.
7. Measurable non-functional budgets.
8. Four admission decisions recorded as PASS.

## 22. Rejected designs

- Generic `shared`, `common`, `utils`, `core`, `types`, `registry`, or umbrella kernel package.
- Wildcard exports or internal-path consumption.
- Mutable request/tenant/transaction/clock/adapter singleton.
- App/framework dependency.
- Manually synchronized projection.
- Business-policy ownership not stated in the admitted capability.
- A mutable `SEALED` lifecycle state.
- Treating partial, skipped, or undocumented evidence as success.


---

# @afenda/money — Product Requirements Document

| Field | Value |
| --- | --- |
| Document type | Individual kernel package PRD |
| Status | Draft for admission and implementation approval |
| Package | `@afenda/money` |
| Physical path | `packages/foundation/money` |
| Band | `foundation` |
| Kernel kind | `CLOSED` |
| Persistence mode | `NONE` |
| Criticality | `C1` |
| Governing authority | `packages/KERNEL-GOVERNANCE.md` |
| Capability owner | Package Owner role; named human must be recorded in the admission contract |
| Architecture owner | Architecture Owner role; named human must be recorded in the admission contract |
| Security owner | Required for C1 admission, verification, and seal |

> This PRD defines one package capability. It does not override the governance authority, workspace package register, frozen admission contract, workspace-edge register, or machine-readable requirement register.

---

## 1. Product/capability statement

**Admitted capability:** Minor-unit monetary representation, arithmetic, allocation, and explicit rounding.

**Problem.** Floating-point money and implicit rounding create financially material drift, non-reproducible allocations, and inconsistent cross-module totals.

## 2. Goals

- Represent monetary amounts in integer minor units.
- Require explicit currency identity and rounding mode.
- Provide checked arithmetic, comparison, rounding, and deterministic allocation.
- Reject currency mismatch and overflow rather than coercing.

## 3. Explicit non-goals and non-ownership

- Foreign-exchange rates, valuation policy, tax calculation, pricing, or accounting conclusions.
- Currency code ownership where governed by `@afenda/codes`.
- Ledger posting or payment processing.

The package must not absorb unrelated shared helpers, bounded-context policy, application concerns, UI concerns, or a canonical cross-domain registry.

## 4. Consumers and jobs to be done

**Candidate production consumer classes** — exact package names must be frozen in the admission contract:

- ERP financial and commercial packages
- Numbering or document packages carrying monetary metadata
- Applications formatting money for presentation

Consumer jobs:

1. Import the registered entrypoint rather than an internal path.
2. Invoke a stable representation-safe capability.
3. Receive canonical values or `@afenda/errors` outcomes.
4. Replace internal implementation without production-consumer edits.

## 5. Admission decisions

| Decision | Required result | Package-specific interpretation |
| --- | --- | --- |
| Ownership | PASS | `@afenda/money` is the single owner of the admitted capability and nothing broader. |
| Policy neutrality | PASS | No organization-specific, workflow-specific, legal, tax, accounting, or domain disposition is encoded. |
| Jurisdiction portability | PASS | Facts may be represented; jurisdictional conclusions remain with bounded contexts or approved policy layers. |
| Reuse portability | PASS | Capability remains reusable by multiple registered consumers without app/framework coupling. |

## 6. Runtime and dependency contract

| Surface | Proposed admission value |
| --- | --- |
| Permitted runtime targets | `pure` |
| Default entrypoint | `.` |
| Auxiliary entrypoints | None. |
| Proposed authorized dependency edges | `@afenda/errors`, `@afenda/codes` |

These values are implementation-ready proposals but become authoritative only when recorded in the workspace package register, admission contract, `package.json`, and workspace-edge register.

## 7. Canonical records and public types

- `Money<Currency>`
- `MinorUnitAmount`
- `CurrencyCode reference`
- `RoundingMode`
- `AllocationWeight`
- `AllocationResult`

Public types must be derived from these canonical definitions. Separately maintained unions, maps, validators, or registries are prohibited.

## 8. Functional operations

| No. | Required operation |
| ---: | --- |
| 01 | `money(currency, minorUnits)` creates a validated value. |
| 02 | `add`, `subtract`, and `compare` require matching currency. |
| 03 | `multiplyRational` and `divideRational` require explicit rounding. |
| 04 | `allocate(total, weights, strategy)` preserves the exact total. |
| 05 | `formatParts` returns presentation-neutral numeric parts, not localized UI text. |

## 9. Normative package invariants

| Invariant ID | Requirement |
| --- | --- |
| MONEY-INV-001 | No floating-point representation appears on a public path. |
| MONEY-INV-002 | Arithmetic across different currencies fails closed. |
| MONEY-INV-003 | Allocation outputs sum exactly to the input total. |
| MONEY-INV-004 | Overflow and unsafe integer ranges are rejected. |
| MONEY-INV-005 | Rounding is always named and testable. |

## 10. Failure and outcome model

- Currency mismatch, invalid minor units, invalid weights, division by zero, and overflow are canonical failures.

All representable failures use code-narrowable `Result<Data, Code>` outcomes. Internal causes and unsafe diagnostics are not public payloads.

## 11. Ingress and normalization

- Serialized decimal input is parsed through an explicit scale and currency contract.
- Locale-formatted strings are not silently interpreted.

Every applicable ingress path accepts `unknown`, parses once, applies declared byte/depth/count bounds, and emits canonical-only values.

## 12. Persistence and transaction model

- Not applicable. Stored monetary columns belong to bounded-context schemas.

Persistence implementation must remain mechanism-only and must not encode bounded-context policy.

## 13. Events, integrations, and composition

- Currency identity is referenced from the canonical codes package without re-owning code values.

No application, route, React, Next.js, presentation, or undeclared internal-path dependency is permitted.

## 14. Tenancy, privacy, and security

- Hostile numeric strings are length- and precision-bounded.
- No unsafe cast or widening conversion is allowed on public paths.

For C1, an approved threat model, SBOM, high-severity vulnerability gate, and negative-path security tests are mandatory before `VERIFIED`.

## 15. Non-functional requirements

- Arithmetic and allocation are deterministic.
- Allocation complexity is bounded by participant count and declared maximum size.
- Property and mutation tests cover all financial algorithms.

The final admission contract must record measurable complexity, input-size, throughput, bundle, compatibility, and controlled-latency budgets applicable to the package profile.

## 16. Conditional applicability resolution

| Trigger family | Proposed result | Reason |
| --- | --- | --- |
| Ingress | APPLICABLE | Package accepts unknown, serialized, vendor, alias-bearing, or configuration input. |
| Generated projections | NOT_APPLICABLE | No generated artifact in proposed topology. |
| Persistent-kernel storage | NOT_APPLICABLE | Persistence mode is NONE. |
| Multi-target isolation | NOT_APPLICABLE | Targets: pure. |
| C1 threat model | APPLICABLE | Criticality is C1. |

`NOT_APPLICABLE` is valid only when the machine-readable requirement register evaluates the trigger as false.

## 17. Architecture tree

This topology contains only responsibilities triggered by this PRD. Empty, decorative, placeholder, or future-use directories are prohibited.

```text
packages/foundation/money/
├── __tests__
│   ├── money.allocation.property.test.ts
│   ├── money.arithmetic.property.test.ts
│   ├── money.boundary.test.ts
│   └── money.contract.test.ts
└── src
    ├── capabilities
    │   ├── allocate.ts
    │   ├── arithmetic.ts
    │   ├── compare.ts
    │   ├── create.ts
    │   └── round.ts
    ├── contract
    │   ├── allocation.ts
    │   ├── compatibility.ts
    │   ├── money.ts
    │   └── rounding.ts
    ├── index.ts
    ├── ingress
    │   └── parse-decimal.ts
    └── internal
        └── integer-math.ts
```

### 17.1 File responsibility register

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | public monetary facade |
| `src/contract/money.ts` | minor-unit value contract |
| `src/contract/rounding.ts` | rounding modes |
| `src/contract/allocation.ts` | allocation inputs/results |
| `src/contract/compatibility.ts` | source and stored-data compatibility |
| `src/capabilities/create.ts` | validated construction |
| `src/capabilities/arithmetic.ts` | checked arithmetic |
| `src/capabilities/round.ts` | explicit rounding |
| `src/capabilities/allocate.ts` | exact-sum allocation |
| `src/capabilities/compare.ts` | currency-safe comparison |
| `src/ingress/parse-decimal.ts` | bounded decimal ingress |
| `src/internal/integer-math.ts` | private checked integer mechanism |
| `__tests__/money.contract.test.ts` | public contract tests |
| `__tests__/money.arithmetic.property.test.ts` | arithmetic properties |
| `__tests__/money.allocation.property.test.ts` | allocation conservation |
| `__tests__/money.boundary.test.ts` | purity and dependency boundary |

### 17.2 Facade rules

- `src/index.ts` contains explicit named exports only and no logic or side effects.
- Auxiliary entrypoints expose only the registered isolation/composition surface.
- Raw clients, SQL objects, mutable adapter instances, storage implementations, and private registries are never exported through `.`.
- Cross-package consumers import `@afenda/money` or a registered auxiliary entrypoint only.

## 18. Test and evidence contract

Required evidence families:

- `KRN-ID-*`
- `KRN-OWN-*`
- `KRN-CTR-*`
- `KRN-BND-*`
- `KRN-SEC-*`
- `KRN-QUA-*`
- `KRN-NFR-*`
- `KRN-REL-*`
- `KRN-DOC-*`
- `KRN-ING-*`

Minimum executable gates:

1. Inspector snapshot.
2. Registry parity and dependency-boundary gates.
3. Package lint and strict typecheck.
4. Behavior/contract tests for every exported capability.
5. Rejection tests for every ingress path.
6. Projection and adapter parity where applicable.
7. Consumer compile demonstration for every declared consumer.
8. Coverage threshold: 90% branch coverage.
9. Mutation testing where the C1 logic trigger applies.
10. Entrypoint isolation, budgets, compatibility, security, evidence-completeness, and digest calculation.

A skipped, timed-out, killed, resource-starved, or unrecorded applicable gate is failure.

## 19. Implementation slices

| Slice | Coherent outcome | Gate to advance |
| --- | --- | --- |
| MONEY-1.0 | Freeze monetary representation and rounding vocabulary. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| MONEY-2.0 | Implement construction and checked arithmetic. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| MONEY-3.0 | Implement deterministic rational rounding. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| MONEY-4.0 | Implement exact-sum allocation and property tests. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| MONEY-5.0 | Complete mutation, compatibility, and consumer demonstration evidence. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |

Slices are sequential-gated, independently reviewable, and constrained to exact package/write boundaries. No later slice begins while an earlier slice is non-green.

## 20. Acceptance criteria and definition of done

The package is `IMPLEMENTED` only when:

- all exported behavior is real, tested, and derived from canonical definitions or admitted mechanism state;
- all applicable ownership, contract, ingress, projection, storage, and consumer checks pass;
- memory/fake and production adapter parity passes where multiple adapters exist;
- no placeholder runtime path, stub return, TODO behavior branch, or deferred deletion remains.

The package is `VERIFIED` only when one evidence-complete CI run proves all applicable mandatory requirements for one content digest, including security, budgets, compatibility, coverage, mutation where triggered, internal-refactor demonstration, and evidence completeness.

A seal may be issued only after verification and attests one package capability, commit, and content digest. It is not release, deployment, migration, or statutory approval.

## 21. Required admission records before production-source merge

1. Named owners and signatories.
2. Exact accepted production consumers.
3. Exact runtime targets and auxiliary-entrypoint isolation reasons.
4. Exact dependency edges in both `package.json` and the workspace-edge register.
5. Compatibility support windows.
6. Machine-resolved requirement applicability expressions.
7. Measurable non-functional budgets.
8. Four admission decisions recorded as PASS.

## 22. Rejected designs

- Generic `shared`, `common`, `utils`, `core`, `types`, `registry`, or umbrella kernel package.
- Wildcard exports or internal-path consumption.
- Mutable request/tenant/transaction/clock/adapter singleton.
- App/framework dependency.
- Manually synchronized projection.
- Business-policy ownership not stated in the admitted capability.
- A mutable `SEALED` lifecycle state.
- Treating partial, skipped, or undocumented evidence as success.


---

# @afenda/quantity — Product Requirements Document

| Field | Value |
| --- | --- |
| Document type | Individual kernel package PRD |
| Status | Draft for admission and implementation approval |
| Package | `@afenda/quantity` |
| Physical path | `packages/foundation/quantity` |
| Band | `foundation` |
| Kernel kind | `OPEN` |
| Persistence mode | `INJECTED` |
| Criticality | `C1` |
| Governing authority | `packages/KERNEL-GOVERNANCE.md` |
| Capability owner | Package Owner role; named human must be recorded in the admission contract |
| Architecture owner | Architecture Owner role; named human must be recorded in the admission contract |
| Security owner | Required for C1 admission, verification, and seal |

> This PRD defines one package capability. It does not override the governance authority, workspace package register, frozen admission contract, workspace-edge register, or machine-readable requirement register.

---

## 1. Product/capability statement

**Admitted capability:** Dimension taxonomy, unit definition, and dimensional conversion.

**Problem.** ERP domains need tenant-defined units without duplicating conversion logic or allowing dimensionally invalid conversions.

## 2. Goals

- Own universal dimension and unit-definition semantics.
- Permit tenant-created units through an injected store.
- Convert values only within compatible dimensions.
- Make conversion factors explicit, exact where possible, and deterministically rounded where necessary.

## 3. Explicit non-goals and non-ownership

- Inventory policy, product packaging, recipe yield, pricing, or domain-specific default units.
- A global cross-domain catalog of business measures.
- Physical sensor ingestion or calibration workflow.

The package must not absorb unrelated shared helpers, bounded-context policy, application concerns, UI concerns, or a canonical cross-domain registry.

## 4. Consumers and jobs to be done

**Candidate production consumer classes** — exact package names must be frozen in the admission contract:

- Inventory, purchasing, sales, manufacturing, and food-production bounded contexts
- Applications configuring tenant units
- Import pipelines normalizing vendor quantities

Consumer jobs:

1. Import the registered entrypoint rather than an internal path.
2. Invoke a stable representation-safe capability.
3. Receive canonical values or `@afenda/errors` outcomes.
4. Replace internal implementation without production-consumer edits.

## 5. Admission decisions

| Decision | Required result | Package-specific interpretation |
| --- | --- | --- |
| Ownership | PASS | `@afenda/quantity` is the single owner of the admitted capability and nothing broader. |
| Policy neutrality | PASS | No organization-specific, workflow-specific, legal, tax, accounting, or domain disposition is encoded. |
| Jurisdiction portability | PASS | Facts may be represented; jurisdictional conclusions remain with bounded contexts or approved policy layers. |
| Reuse portability | PASS | Capability remains reusable by multiple registered consumers without app/framework coupling. |

## 6. Runtime and dependency contract

| Surface | Proposed admission value |
| --- | --- |
| Permitted runtime targets | `pure` |
| Default entrypoint | `.` |
| Auxiliary entrypoints | `./adapter-contract`, `./testing` |
| Proposed authorized dependency edges | `@afenda/errors`, `@afenda/ids` |

These values are implementation-ready proposals but become authoritative only when recorded in the workspace package register, admission contract, `package.json`, and workspace-edge register.

## 7. Canonical records and public types

- `DimensionId`
- `DimensionDefinition`
- `UnitId`
- `UnitDefinition`
- `ConversionRatio`
- `Quantity<Unit>`
- `RoundingPolicy`

Public types must be derived from these canonical definitions. Separately maintained unions, maps, validators, or registries are prohibited.

## 8. Functional operations

| No. | Required operation |
| ---: | --- |
| 01 | `defineDimension(input)` validates a tenant dimension definition. |
| 02 | `defineUnit(input)` validates a unit against its dimension. |
| 03 | `convert(quantity, targetUnit, catalog, rounding)` performs dimensional conversion. |
| 04 | `validateCatalog(definitions)` proves identifier and referential integrity. |
| 05 | `listUnits(dimensionId)` delegates lookup through the injected store capability. |

## 9. Normative package invariants

| Invariant ID | Requirement |
| --- | --- |
| QUANTITY-INV-001 | A unit belongs to exactly one dimension. |
| QUANTITY-INV-002 | Conversions across dimensions fail closed. |
| QUANTITY-INV-003 | Base-unit conversion graphs are acyclic and compositionally consistent. |
| QUANTITY-INV-004 | Tenant-defined values are scoped by server-trusted organization context. |
| QUANTITY-INV-005 | Memory and production adapters return equivalent semantic outcomes. |

## 10. Failure and outcome model

- Unknown dimensions/units, duplicate identifiers, cycles, invalid ratios, precision overflow, and tenant-scope violations return canonical failures.

All representable failures use code-narrowable `Result<Data, Code>` outcomes. Internal causes and unsafe diagnostics are not public payloads.

## 11. Ingress and normalization

- Tenant configuration and vendor aliases enter as unknown and normalize immediately.
- Aliases are accepted only for migration/import paths and never emitted.

Every applicable ingress path accepts `unknown`, parses once, applies declared byte/depth/count bounds, and emits canonical-only values.

## 12. Persistence and transaction model

- Injected store owns mechanism only: get/put/list definitions under server-bound organization scope.
- The package owns no database schema.

Persistence implementation must remain mechanism-only and must not encode bounded-context policy.

## 13. Events, integrations, and composition

- Composition supplies storage and transaction capability.
- Bounded contexts retain ownership of product-specific units and policies.

No application, route, React, Next.js, presentation, or undeclared internal-path dependency is permitted.

## 14. Tenancy, privacy, and security

- Organization identity cannot be supplied as an untrusted store predicate.
- Definition counts and graph depth are bounded to prevent resource exhaustion.

For C1, an approved threat model, SBOM, high-severity vulnerability gate, and negative-path security tests are mandatory before `VERIFIED`.

## 15. Non-functional requirements

- Conversion is deterministic for fixed catalog and rounding policy.
- Catalog validation has declared node/edge limits.
- Adapter parity is mandatory.

The final admission contract must record measurable complexity, input-size, throughput, bundle, compatibility, and controlled-latency budgets applicable to the package profile.

## 16. Conditional applicability resolution

| Trigger family | Proposed result | Reason |
| --- | --- | --- |
| Ingress | APPLICABLE | Package accepts unknown, serialized, vendor, alias-bearing, or configuration input. |
| Generated projections | NOT_APPLICABLE | No generated artifact in proposed topology. |
| Persistent-kernel storage | APPLICABLE | Persistence mode is INJECTED. |
| Multi-target isolation | NOT_APPLICABLE | Targets: pure. |
| C1 threat model | APPLICABLE | Criticality is C1. |

`NOT_APPLICABLE` is valid only when the machine-readable requirement register evaluates the trigger as false.

## 17. Architecture tree

This topology contains only responsibilities triggered by this PRD. Empty, decorative, placeholder, or future-use directories are prohibited.

```text
packages/foundation/quantity/
├── __tests__
│   ├── quantity.adapter-parity.test.ts
│   ├── quantity.contract.test.ts
│   ├── quantity.conversion.property.test.ts
│   └── quantity.tenant-boundary.test.ts
└── src
    ├── adapter-contract.ts
    ├── adapters
    │   └── memory-quantity-definition-store.ts
    ├── capabilities
    │   ├── catalog.ts
    │   ├── convert.ts
    │   └── define.ts
    ├── contract
    │   ├── compatibility.ts
    │   ├── conversion.ts
    │   ├── dimension.ts
    │   ├── quantity.ts
    │   └── unit.ts
    ├── index.ts
    ├── ingress
    │   ├── aliases.ts
    │   └── parse-definition.ts
    ├── internal
    │   └── conversion-graph.ts
    ├── store
    │   └── quantity-definition-store.ts
    └── testing.ts
```

### 17.1 File responsibility register

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | default capability facade |
| `src/adapter-contract.ts` | composition-only store contract facade |
| `src/testing.ts` | registered testing utilities |
| `src/contract/dimension.ts` | dimension definitions |
| `src/contract/unit.ts` | unit definitions |
| `src/contract/quantity.ts` | typed quantity value |
| `src/contract/conversion.ts` | ratio and rounding contracts |
| `src/contract/compatibility.ts` | compatibility profile |
| `src/capabilities/define.ts` | definition validation |
| `src/capabilities/convert.ts` | conversion behavior |
| `src/capabilities/catalog.ts` | catalog validation and lookup |
| `src/ingress/parse-definition.ts` | unknown configuration ingress |
| `src/ingress/aliases.ts` | migration/vendor alias normalization |
| `src/store/quantity-definition-store.ts` | narrow injected store capability |
| `src/adapters/memory-quantity-definition-store.ts` | semantic reference adapter |
| `src/internal/conversion-graph.ts` | private graph mechanism |
| `__tests__/quantity.contract.test.ts` | public contract tests |
| `__tests__/quantity.conversion.property.test.ts` | conversion properties |
| `__tests__/quantity.adapter-parity.test.ts` | adapter equivalence |
| `__tests__/quantity.tenant-boundary.test.ts` | negative tenancy tests |

### 17.2 Facade rules

- `src/index.ts` contains explicit named exports only and no logic or side effects.
- Auxiliary entrypoints expose only the registered isolation/composition surface.
- Raw clients, SQL objects, mutable adapter instances, storage implementations, and private registries are never exported through `.`.
- Cross-package consumers import `@afenda/quantity` or a registered auxiliary entrypoint only.

## 18. Test and evidence contract

Required evidence families:

- `KRN-ID-*`
- `KRN-OWN-*`
- `KRN-CTR-*`
- `KRN-BND-*`
- `KRN-SEC-*`
- `KRN-QUA-*`
- `KRN-NFR-*`
- `KRN-REL-*`
- `KRN-DOC-*`
- `KRN-ING-*`
- `KRN-STO-*`

Minimum executable gates:

1. Inspector snapshot.
2. Registry parity and dependency-boundary gates.
3. Package lint and strict typecheck.
4. Behavior/contract tests for every exported capability.
5. Rejection tests for every ingress path.
6. Projection and adapter parity where applicable.
7. Consumer compile demonstration for every declared consumer.
8. Coverage threshold: 90% branch coverage.
9. Mutation testing where the C1 logic trigger applies.
10. Entrypoint isolation, budgets, compatibility, security, evidence-completeness, and digest calculation.

A skipped, timed-out, killed, resource-starved, or unrecorded applicable gate is failure.

## 19. Implementation slices

| Slice | Coherent outcome | Gate to advance |
| --- | --- | --- |
| QUANTITY-1.0 | Freeze dimension/unit contracts and store capability. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| QUANTITY-2.0 | Implement catalog validation and conversion graph. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| QUANTITY-3.0 | Implement memory adapter as semantic reference. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| QUANTITY-4.0 | Add alias ingress and hostile graph-bound tests. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| QUANTITY-5.0 | Verify production adapter parity, coverage, mutation, and tenant safety. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |

Slices are sequential-gated, independently reviewable, and constrained to exact package/write boundaries. No later slice begins while an earlier slice is non-green.

## 20. Acceptance criteria and definition of done

The package is `IMPLEMENTED` only when:

- all exported behavior is real, tested, and derived from canonical definitions or admitted mechanism state;
- all applicable ownership, contract, ingress, projection, storage, and consumer checks pass;
- memory/fake and production adapter parity passes where multiple adapters exist;
- no placeholder runtime path, stub return, TODO behavior branch, or deferred deletion remains.

The package is `VERIFIED` only when one evidence-complete CI run proves all applicable mandatory requirements for one content digest, including security, budgets, compatibility, coverage, mutation where triggered, internal-refactor demonstration, and evidence completeness.

A seal may be issued only after verification and attests one package capability, commit, and content digest. It is not release, deployment, migration, or statutory approval.

## 21. Required admission records before production-source merge

1. Named owners and signatories.
2. Exact accepted production consumers.
3. Exact runtime targets and auxiliary-entrypoint isolation reasons.
4. Exact dependency edges in both `package.json` and the workspace-edge register.
5. Compatibility support windows.
6. Machine-resolved requirement applicability expressions.
7. Measurable non-functional budgets.
8. Four admission decisions recorded as PASS.

## 22. Rejected designs

- Generic `shared`, `common`, `utils`, `core`, `types`, `registry`, or umbrella kernel package.
- Wildcard exports or internal-path consumption.
- Mutable request/tenant/transaction/clock/adapter singleton.
- App/framework dependency.
- Manually synchronized projection.
- Business-policy ownership not stated in the admitted capability.
- A mutable `SEALED` lifecycle state.
- Treating partial, skipped, or undocumented evidence as success.


---

# @afenda/temporal — Product Requirements Document

| Field | Value |
| --- | --- |
| Document type | Individual kernel package PRD |
| Status | Draft for admission and implementation approval |
| Package | `@afenda/temporal` |
| Physical path | `packages/foundation/temporal` |
| Band | `foundation` |
| Kernel kind | `CLOSED` |
| Persistence mode | `NONE` |
| Criticality | `C1` |
| Governing authority | `packages/KERNEL-GOVERNANCE.md` |
| Capability owner | Package Owner role; named human must be recorded in the admission contract |
| Architecture owner | Architecture Owner role; named human must be recorded in the admission contract |
| Security owner | Required for C1 admission, verification, and seal |

> This PRD defines one package capability. It does not override the governance authority, workspace package register, frozen admission contract, workspace-edge register, or machine-readable requirement register.

---

## 1. Product/capability statement

**Admitted capability:** Instant, business date, effective range, and period arithmetic.

**Problem.** Mixing timestamps, local dates, periods, and effective ranges causes timezone defects, invalid overlap logic, and non-deterministic date behavior.

## 2. Goals

- Provide distinct canonical temporal types.
- Make timezone and calendar assumptions explicit.
- Support safe range, period, comparison, and arithmetic operations.
- Keep clock access injectable and controllable.

## 3. Explicit non-goals and non-ownership

- HR leave policy, payroll calendars, statutory deadlines, accounting close policy, or scheduling workflows.
- A process-global clock or timezone.

The package must not absorb unrelated shared helpers, bounded-context policy, application concerns, UI concerns, or a canonical cross-domain registry.

## 4. Consumers and jobs to be done

**Candidate production consumer classes** — exact package names must be frozen in the admission contract:

- All packages handling dates, times, periods, expiry, or effective dating
- ERP lifecycle and validity models
- Runtime mechanisms requiring deadlines or timestamps

Consumer jobs:

1. Import the registered entrypoint rather than an internal path.
2. Invoke a stable representation-safe capability.
3. Receive canonical values or `@afenda/errors` outcomes.
4. Replace internal implementation without production-consumer edits.

## 5. Admission decisions

| Decision | Required result | Package-specific interpretation |
| --- | --- | --- |
| Ownership | PASS | `@afenda/temporal` is the single owner of the admitted capability and nothing broader. |
| Policy neutrality | PASS | No organization-specific, workflow-specific, legal, tax, accounting, or domain disposition is encoded. |
| Jurisdiction portability | PASS | Facts may be represented; jurisdictional conclusions remain with bounded contexts or approved policy layers. |
| Reuse portability | PASS | Capability remains reusable by multiple registered consumers without app/framework coupling. |

## 6. Runtime and dependency contract

| Surface | Proposed admission value |
| --- | --- |
| Permitted runtime targets | `pure` |
| Default entrypoint | `.` |
| Auxiliary entrypoints | `./testing` |
| Proposed authorized dependency edges | `@afenda/errors` |

These values are implementation-ready proposals but become authoritative only when recorded in the workspace package register, admission contract, `package.json`, and workspace-edge register.

## 7. Canonical records and public types

- `Instant`
- `BusinessDate`
- `EffectiveRange`
- `Period`
- `TimeZoneId`
- `Clock`
- `CalendarArithmeticPolicy`

Public types must be derived from these canonical definitions. Separately maintained unions, maps, validators, or registries are prohibited.

## 8. Functional operations

| No. | Required operation |
| ---: | --- |
| 01 | Parse and validate canonical ISO representations. |
| 02 | Compare and order like temporal types. |
| 03 | Create and validate half-open effective ranges. |
| 04 | Detect overlap, containment, adjacency, and gaps. |
| 05 | Add/subtract explicit durations or calendar units under named policy. |

## 9. Normative package invariants

| Invariant ID | Requirement |
| --- | --- |
| TEMPORAL-INV-001 | Instant and business date are never implicitly interchangeable. |
| TEMPORAL-INV-002 | Range start precedes end unless an explicitly open-ended range is permitted. |
| TEMPORAL-INV-003 | Ambient wall clock is absent from the default capability. |
| TEMPORAL-INV-004 | Serialization is canonical and versioned where wire use applies. |

## 10. Failure and outcome model

- Invalid format, impossible date, timezone ambiguity, invalid range, and arithmetic overflow return canonical failures.

All representable failures use code-narrowable `Result<Data, Code>` outcomes. Internal causes and unsafe diagnostics are not public payloads.

## 11. Ingress and normalization

- External strings enter as unknown and parse once.
- Locale-dependent date strings are rejected unless a named adapter normalizes them.

Every applicable ingress path accepts `unknown`, parses once, applies declared byte/depth/count bounds, and emits canonical-only values.

## 12. Persistence and transaction model

- Not applicable. Temporal columns are owned by consuming schemas.

Persistence implementation must remain mechanism-only and must not encode bounded-context policy.

## 13. Events, integrations, and composition

- Testing entrypoint supplies deterministic clocks and fixtures only.

No application, route, React, Next.js, presentation, or undeclared internal-path dependency is permitted.

## 14. Tenancy, privacy, and security

- Input lengths and recursion are bounded.
- No host locale or timezone is read implicitly.

For C1, an approved threat model, SBOM, high-severity vulnerability gate, and negative-path security tests are mandatory before `VERIFIED`.

## 15. Non-functional requirements

- Pure operations are deterministic.
- Range operations are constant-time; collection interval algorithms declare size/complexity budgets.
- Property tests cover arithmetic and range laws.

The final admission contract must record measurable complexity, input-size, throughput, bundle, compatibility, and controlled-latency budgets applicable to the package profile.

## 16. Conditional applicability resolution

| Trigger family | Proposed result | Reason |
| --- | --- | --- |
| Ingress | APPLICABLE | Package accepts unknown, serialized, vendor, alias-bearing, or configuration input. |
| Generated projections | NOT_APPLICABLE | No generated artifact in proposed topology. |
| Persistent-kernel storage | NOT_APPLICABLE | Persistence mode is NONE. |
| Multi-target isolation | NOT_APPLICABLE | Targets: pure. |
| C1 threat model | APPLICABLE | Criticality is C1. |

`NOT_APPLICABLE` is valid only when the machine-readable requirement register evaluates the trigger as false.

## 17. Architecture tree

This topology contains only responsibilities triggered by this PRD. Empty, decorative, placeholder, or future-use directories are prohibited.

```text
packages/foundation/temporal/
├── __tests__
│   ├── temporal.arithmetic.property.test.ts
│   ├── temporal.contract.test.ts
│   ├── temporal.determinism.test.ts
│   └── temporal.ranges.property.test.ts
└── src
    ├── capabilities
    │   ├── arithmetic.ts
    │   ├── compare.ts
    │   ├── parse.ts
    │   └── ranges.ts
    ├── contract
    │   ├── business-date.ts
    │   ├── clock.ts
    │   ├── compatibility.ts
    │   ├── effective-range.ts
    │   ├── instant.ts
    │   └── period.ts
    ├── index.ts
    ├── ingress
    │   └── external-temporal.ts
    ├── internal
    │   └── iso.ts
    └── testing.ts
```

### 17.1 File responsibility register

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | public temporal facade |
| `src/testing.ts` | deterministic clock utilities |
| `src/contract/instant.ts` | instant contract |
| `src/contract/business-date.ts` | date-only contract |
| `src/contract/effective-range.ts` | range contract |
| `src/contract/period.ts` | period contract |
| `src/contract/clock.ts` | explicit clock capability |
| `src/contract/compatibility.ts` | serialization compatibility |
| `src/capabilities/parse.ts` | canonical parsing |
| `src/capabilities/arithmetic.ts` | temporal arithmetic |
| `src/capabilities/ranges.ts` | range laws |
| `src/capabilities/compare.ts` | type-safe comparison |
| `src/ingress/external-temporal.ts` | unknown input boundary |
| `src/internal/iso.ts` | private canonical serialization |
| `__tests__/temporal.contract.test.ts` | public contract coverage |
| `__tests__/temporal.ranges.property.test.ts` | range properties |
| `__tests__/temporal.arithmetic.property.test.ts` | calendar properties |
| `__tests__/temporal.determinism.test.ts` | clock control evidence |

### 17.2 Facade rules

- `src/index.ts` contains explicit named exports only and no logic or side effects.
- Auxiliary entrypoints expose only the registered isolation/composition surface.
- Raw clients, SQL objects, mutable adapter instances, storage implementations, and private registries are never exported through `.`.
- Cross-package consumers import `@afenda/temporal` or a registered auxiliary entrypoint only.

## 18. Test and evidence contract

Required evidence families:

- `KRN-ID-*`
- `KRN-OWN-*`
- `KRN-CTR-*`
- `KRN-BND-*`
- `KRN-SEC-*`
- `KRN-QUA-*`
- `KRN-NFR-*`
- `KRN-REL-*`
- `KRN-DOC-*`
- `KRN-ING-*`

Minimum executable gates:

1. Inspector snapshot.
2. Registry parity and dependency-boundary gates.
3. Package lint and strict typecheck.
4. Behavior/contract tests for every exported capability.
5. Rejection tests for every ingress path.
6. Projection and adapter parity where applicable.
7. Consumer compile demonstration for every declared consumer.
8. Coverage threshold: 90% branch coverage.
9. Mutation testing where the C1 logic trigger applies.
10. Entrypoint isolation, budgets, compatibility, security, evidence-completeness, and digest calculation.

A skipped, timed-out, killed, resource-starved, or unrecorded applicable gate is failure.

## 19. Implementation slices

| Slice | Coherent outcome | Gate to advance |
| --- | --- | --- |
| TEMPORAL-1.0 | Freeze temporal type distinctions and serialization. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| TEMPORAL-2.0 | Implement strict parsers and constructors. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| TEMPORAL-3.0 | Implement range and period arithmetic. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| TEMPORAL-4.0 | Add deterministic test clock utilities. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| TEMPORAL-5.0 | Complete property, mutation, compatibility, and consumer evidence. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |

Slices are sequential-gated, independently reviewable, and constrained to exact package/write boundaries. No later slice begins while an earlier slice is non-green.

## 20. Acceptance criteria and definition of done

The package is `IMPLEMENTED` only when:

- all exported behavior is real, tested, and derived from canonical definitions or admitted mechanism state;
- all applicable ownership, contract, ingress, projection, storage, and consumer checks pass;
- memory/fake and production adapter parity passes where multiple adapters exist;
- no placeholder runtime path, stub return, TODO behavior branch, or deferred deletion remains.

The package is `VERIFIED` only when one evidence-complete CI run proves all applicable mandatory requirements for one content digest, including security, budgets, compatibility, coverage, mutation where triggered, internal-refactor demonstration, and evidence completeness.

A seal may be issued only after verification and attests one package capability, commit, and content digest. It is not release, deployment, migration, or statutory approval.

## 21. Required admission records before production-source merge

1. Named owners and signatories.
2. Exact accepted production consumers.
3. Exact runtime targets and auxiliary-entrypoint isolation reasons.
4. Exact dependency edges in both `package.json` and the workspace-edge register.
5. Compatibility support windows.
6. Machine-resolved requirement applicability expressions.
7. Measurable non-functional budgets.
8. Four admission decisions recorded as PASS.

## 22. Rejected designs

- Generic `shared`, `common`, `utils`, `core`, `types`, `registry`, or umbrella kernel package.
- Wildcard exports or internal-path consumption.
- Mutable request/tenant/transaction/clock/adapter singleton.
- App/framework dependency.
- Manually synchronized projection.
- Business-policy ownership not stated in the admitted capability.
- A mutable `SEALED` lifecycle state.
- Treating partial, skipped, or undocumented evidence as success.


---

# @afenda/codes — Product Requirements Document

| Field | Value |
| --- | --- |
| Document type | Individual kernel package PRD |
| Status | Draft for admission and implementation approval |
| Package | `@afenda/codes` |
| Physical path | `packages/foundation/codes` |
| Band | `foundation` |
| Kernel kind | `CLOSED` |
| Persistence mode | `NONE` |
| Criticality | `C2` |
| Governing authority | `packages/KERNEL-GOVERNANCE.md` |
| Capability owner | Package Owner role; named human must be recorded in the admission contract |
| Architecture owner | Architecture Owner role; named human must be recorded in the admission contract |
| Security owner | Not required by criticality unless a security trigger is activated |

> This PRD defines one package capability. It does not override the governance authority, workspace package register, frozen admission contract, workspace-edge register, or machine-readable requirement register.

---

## 1. Product/capability statement

**Admitted capability:** Canonical externally governed reference codes and their validation or lookup projections.

**Problem.** External standards and reference codes drift when copied into business packages, manually synchronized, or mixed with organization-specific classifications.

## 2. Goals

- Own canonical externally governed code-system facts.
- Generate validation and lookup projections from one authority.
- Record provenance and generator version for static datasets.
- Support aliases only at ingress and emit canonical values.

## 3. Explicit non-goals and non-ownership

- Tenant-created classifications, chart of accounts, tax/legal conclusions, workflow statuses, or business registries.
- A universal cross-domain registry.

The package must not absorb unrelated shared helpers, bounded-context policy, application concerns, UI concerns, or a canonical cross-domain registry.

## 4. Consumers and jobs to be done

**Candidate production consumer classes** — exact package names must be frozen in the admission contract:

- Money and address-related primitives
- ERP packages validating standard external codes
- Import/export adapters

Consumer jobs:

1. Import the registered entrypoint rather than an internal path.
2. Invoke a stable representation-safe capability.
3. Receive canonical values or `@afenda/errors` outcomes.
4. Replace internal implementation without production-consumer edits.

## 5. Admission decisions

| Decision | Required result | Package-specific interpretation |
| --- | --- | --- |
| Ownership | PASS | `@afenda/codes` is the single owner of the admitted capability and nothing broader. |
| Policy neutrality | PASS | No organization-specific, workflow-specific, legal, tax, accounting, or domain disposition is encoded. |
| Jurisdiction portability | PASS | Facts may be represented; jurisdictional conclusions remain with bounded contexts or approved policy layers. |
| Reuse portability | PASS | Capability remains reusable by multiple registered consumers without app/framework coupling. |

## 6. Runtime and dependency contract

| Surface | Proposed admission value |
| --- | --- |
| Permitted runtime targets | `pure`, `tooling` |
| Default entrypoint | `.` |
| Auxiliary entrypoints | `./generated/<artifact>`, `./tooling` |
| Proposed authorized dependency edges | `@afenda/errors` |

These values are implementation-ready proposals but become authoritative only when recorded in the workspace package register, admission contract, `package.json`, and workspace-edge register.

## 7. Canonical records and public types

- `CodeSystemId`
- `CanonicalCode`
- `CodeRecord`
- `CodeStatus`
- `ExternalAuthority`
- `DatasetProvenance`
- `AliasRecord`

Public types must be derived from these canonical definitions. Separately maintained unions, maps, validators, or registries are prohibited.

## 8. Functional operations

| No. | Required operation |
| ---: | --- |
| 01 | `validateCode(system, unknown)` returns a canonical branded code. |
| 02 | `lookupCode(system, code)` returns immutable reference facts. |
| 03 | `listCodes(system, filter)` returns deterministic projections. |
| 04 | `normalizeAlias(system, alias)` resolves migration/vendor aliases. |
| 05 | Tooling regenerates byte-identical static artifacts from pinned sources. |

## 9. Normative package invariants

| Invariant ID | Requirement |
| --- | --- |
| CODES-INV-001 | Each governed term has exactly one canonical owner and code. |
| CODES-INV-002 | Generated projections have exact parity with canonical source data. |
| CODES-INV-003 | Aliases are never emitted. |
| CODES-INV-004 | Organization-specific or interpretive policy is excluded. |
| CODES-INV-005 | No manually synchronized union, map, or schema exists. |

## 10. Failure and outcome model

- Unknown system, unknown code, retired code used where prohibited, invalid alias, and provenance mismatch return canonical failures.

All representable failures use code-narrowable `Result<Data, Code>` outcomes. Internal causes and unsafe diagnostics are not public payloads.

## 11. Ingress and normalization

- External code values and aliases enter as unknown.
- Structured datasets have declared byte, row, and nesting bounds.

Every applicable ingress path accepts `unknown`, parses once, applies declared byte/depth/count bounds, and emits canonical-only values.

## 12. Persistence and transaction model

- Not applicable. Static generated artifacts are not persistence schemas.

Persistence implementation must remain mechanism-only and must not encode bounded-context policy.

## 13. Events, integrations, and composition

- Tooling may ingest pinned external authority files; production default entrypoint remains pure and network-free.

No application, route, React, Next.js, presentation, or undeclared internal-path dependency is permitted.

## 14. Tenancy, privacy, and security

- Generated artifacts exclude secrets and untrusted executable content.
- Tooling verifies checksums and provenance.

For C1, an approved threat model, SBOM, high-severity vulnerability gate, and negative-path security tests are mandatory before `VERIFIED`.

## 15. Non-functional requirements

- Lookup budgets are deterministic and bounded.
- Regeneration is byte-identical for unchanged inputs.
- Bundle budgets apply per generated artifact entrypoint.

The final admission contract must record measurable complexity, input-size, throughput, bundle, compatibility, and controlled-latency budgets applicable to the package profile.

## 16. Conditional applicability resolution

| Trigger family | Proposed result | Reason |
| --- | --- | --- |
| Ingress | APPLICABLE | Package accepts unknown, serialized, vendor, alias-bearing, or configuration input. |
| Generated projections | APPLICABLE | Generated/static projection files exist. |
| Persistent-kernel storage | NOT_APPLICABLE | Persistence mode is NONE. |
| Multi-target isolation | APPLICABLE | Targets: pure, tooling. |
| C1 threat model | NOT_APPLICABLE | Criticality is C2. |

`NOT_APPLICABLE` is valid only when the machine-readable requirement register evaluates the trigger as false.

## 17. Architecture tree

This topology contains only responsibilities triggered by this PRD. Empty, decorative, placeholder, or future-use directories are prohibited.

```text
packages/foundation/codes/
├── __tests__
│   ├── codes.aliases.test.ts
│   ├── codes.contract.test.ts
│   ├── codes.parity.test.ts
│   └── codes.reproducibility.test.ts
├── scripts
│   ├── generate-codes.mts
│   └── verify-codes.mts
└── src
    ├── capabilities
    │   ├── list.ts
    │   ├── lookup.ts
    │   └── validate.ts
    ├── contract
    │   ├── code-record.ts
    │   ├── code-system.ts
    │   ├── compatibility.ts
    │   └── provenance.ts
    ├── generated
    │   ├── code-records.ts
    │   ├── code-systems.ts
    │   └── provenance.json
    ├── index.ts
    ├── ingress
    │   ├── aliases.ts
    │   └── parse-code.ts
    ├── runtime
    │   └── tooling
    │       └── generate.ts
    └── tooling.ts
```

### 17.1 File responsibility register

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | default validation/lookup facade |
| `src/tooling.ts` | tooling-only generation facade |
| `src/contract/code-system.ts` | system identity |
| `src/contract/code-record.ts` | canonical code fact |
| `src/contract/provenance.ts` | source metadata |
| `src/contract/compatibility.ts` | dataset compatibility profile |
| `src/capabilities/validate.ts` | code validation |
| `src/capabilities/lookup.ts` | immutable lookup |
| `src/capabilities/list.ts` | deterministic listing |
| `src/ingress/parse-code.ts` | unknown code ingress |
| `src/ingress/aliases.ts` | alias normalization |
| `src/generated/code-systems.ts` | generated system register |
| `src/generated/code-records.ts` | generated records |
| `src/generated/provenance.json` | generated provenance |
| `src/runtime/tooling/generate.ts` | deterministic generator |
| `scripts/generate-codes.mts` | package generation command |
| `scripts/verify-codes.mts` | parity and reproducibility check |
| `__tests__/codes.contract.test.ts` | public contracts |
| `__tests__/codes.parity.test.ts` | owner/projection parity |
| `__tests__/codes.aliases.test.ts` | canonical emission |
| `__tests__/codes.reproducibility.test.ts` | byte-identical regeneration |

### 17.2 Facade rules

- `src/index.ts` contains explicit named exports only and no logic or side effects.
- Auxiliary entrypoints expose only the registered isolation/composition surface.
- Raw clients, SQL objects, mutable adapter instances, storage implementations, and private registries are never exported through `.`.
- Cross-package consumers import `@afenda/codes` or a registered auxiliary entrypoint only.

## 18. Test and evidence contract

Required evidence families:

- `KRN-ID-*`
- `KRN-OWN-*`
- `KRN-CTR-*`
- `KRN-BND-*`
- `KRN-SEC-*`
- `KRN-QUA-*`
- `KRN-NFR-*`
- `KRN-REL-*`
- `KRN-DOC-*`
- `KRN-ING-*`
- `KRN-PRJ-*`

Minimum executable gates:

1. Inspector snapshot.
2. Registry parity and dependency-boundary gates.
3. Package lint and strict typecheck.
4. Behavior/contract tests for every exported capability.
5. Rejection tests for every ingress path.
6. Projection and adapter parity where applicable.
7. Consumer compile demonstration for every declared consumer.
8. Coverage threshold: 80% branch coverage.
9. Mutation testing where the C1 logic trigger applies.
10. Entrypoint isolation, budgets, compatibility, security, evidence-completeness, and digest calculation.

A skipped, timed-out, killed, resource-starved, or unrecorded applicable gate is failure.

## 19. Implementation slices

| Slice | Coherent outcome | Gate to advance |
| --- | --- | --- |
| CODES-1.0 | Freeze admitted external code systems and provenance rules. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| CODES-2.0 | Implement canonical definitions and pure lookup facade. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| CODES-3.0 | Implement alias ingress and canonical-only emission. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| CODES-4.0 | Implement deterministic generator and artifact entrypoints. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| CODES-5.0 | Complete parity, reproducibility, bundle, compatibility, and security evidence. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |

Slices are sequential-gated, independently reviewable, and constrained to exact package/write boundaries. No later slice begins while an earlier slice is non-green.

## 20. Acceptance criteria and definition of done

The package is `IMPLEMENTED` only when:

- all exported behavior is real, tested, and derived from canonical definitions or admitted mechanism state;
- all applicable ownership, contract, ingress, projection, storage, and consumer checks pass;
- memory/fake and production adapter parity passes where multiple adapters exist;
- no placeholder runtime path, stub return, TODO behavior branch, or deferred deletion remains.

The package is `VERIFIED` only when one evidence-complete CI run proves all applicable mandatory requirements for one content digest, including security, budgets, compatibility, coverage, mutation where triggered, internal-refactor demonstration, and evidence completeness.

A seal may be issued only after verification and attests one package capability, commit, and content digest. It is not release, deployment, migration, or statutory approval.

## 21. Required admission records before production-source merge

1. Named owners and signatories.
2. Exact accepted production consumers.
3. Exact runtime targets and auxiliary-entrypoint isolation reasons.
4. Exact dependency edges in both `package.json` and the workspace-edge register.
5. Compatibility support windows.
6. Machine-resolved requirement applicability expressions.
7. Measurable non-functional budgets.
8. Four admission decisions recorded as PASS.

## 22. Rejected designs

- Generic `shared`, `common`, `utils`, `core`, `types`, `registry`, or umbrella kernel package.
- Wildcard exports or internal-path consumption.
- Mutable request/tenant/transaction/clock/adapter singleton.
- App/framework dependency.
- Manually synchronized projection.
- Business-policy ownership not stated in the admitted capability.
- A mutable `SEALED` lifecycle state.
- Treating partial, skipped, or undocumented evidence as success.


---

# @afenda/tenancy — Product Requirements Document

| Field | Value |
| --- | --- |
| Document type | Individual kernel package PRD |
| Status | Draft for admission and implementation approval |
| Package | `@afenda/tenancy` |
| Physical path | `packages/foundation/tenancy` |
| Band | `foundation` |
| Kernel kind | `CLOSED` |
| Persistence mode | `NONE` |
| Criticality | `C1` |
| Governing authority | `packages/KERNEL-GOVERNANCE.md` |
| Capability owner | Package Owner role; named human must be recorded in the admission contract |
| Architecture owner | Architecture Owner role; named human must be recorded in the admission contract |
| Security owner | Required for C1 admission, verification, and seal |

> This PRD defines one package capability. It does not override the governance authority, workspace package register, frozen admission contract, workspace-edge register, or machine-readable requirement register.

---

## 1. Product/capability statement

**Admitted capability:** Execution-context representation for organization, actor, and correlation identity.

**Problem.** Passing loose tenant and actor strings enables context confusion, client-controlled organization predicates, and inconsistent correlation across package calls.

## 2. Goals

- Represent trusted execution identity in one immutable context.
- Distinguish organization, actor, request, and correlation identifiers.
- Validate and construct context only at trusted composition boundaries.
- Support safe propagation without process-global state.

## 3. Explicit non-goals and non-ownership

- Authentication, membership lookup, authorization evaluation, RLS implementation, or HTTP middleware.
- Tenant configuration or organization lifecycle.

The package must not absorb unrelated shared helpers, bounded-context policy, application concerns, UI concerns, or a canonical cross-domain registry.

## 4. Consumers and jobs to be done

**Candidate production consumer classes** — exact package names must be frozen in the admission contract:

- All tenant-aware ERP and data-plane packages
- Application server composition
- Audit, events, observability, and idempotency mechanisms

Consumer jobs:

1. Import the registered entrypoint rather than an internal path.
2. Invoke a stable representation-safe capability.
3. Receive canonical values or `@afenda/errors` outcomes.
4. Replace internal implementation without production-consumer edits.

## 5. Admission decisions

| Decision | Required result | Package-specific interpretation |
| --- | --- | --- |
| Ownership | PASS | `@afenda/tenancy` is the single owner of the admitted capability and nothing broader. |
| Policy neutrality | PASS | No organization-specific, workflow-specific, legal, tax, accounting, or domain disposition is encoded. |
| Jurisdiction portability | PASS | Facts may be represented; jurisdictional conclusions remain with bounded contexts or approved policy layers. |
| Reuse portability | PASS | Capability remains reusable by multiple registered consumers without app/framework coupling. |

## 6. Runtime and dependency contract

| Surface | Proposed admission value |
| --- | --- |
| Permitted runtime targets | `pure` |
| Default entrypoint | `.` |
| Auxiliary entrypoints | `./testing` |
| Proposed authorized dependency edges | `@afenda/errors`, `@afenda/ids` |

These values are implementation-ready proposals but become authoritative only when recorded in the workspace package register, admission contract, `package.json`, and workspace-edge register.

## 7. Canonical records and public types

- `OrganizationId`
- `ActorId`
- `CorrelationId`
- `RequestId`
- `ExecutionContext`
- `TrustedContextInput`

Public types must be derived from these canonical definitions. Separately maintained unions, maps, validators, or registries are prohibited.

## 8. Functional operations

| No. | Required operation |
| ---: | --- |
| 01 | `createExecutionContext(trustedInput)` constructs immutable context. |
| 02 | `validateExecutionContext(unknown)` parses serialized trusted handoff. |
| 03 | `withCorrelation(context, correlationId)` returns a derived immutable context. |
| 04 | `publicContextProjection(context)` exposes the minimum safe subset. |

## 9. Normative package invariants

| Invariant ID | Requirement |
| --- | --- |
| TENANCY-INV-001 | Organization identity is server-trusted and cannot originate from an untrusted storage predicate. |
| TENANCY-INV-002 | Context is immutable and request-scoped. |
| TENANCY-INV-003 | No process-global or async-global mutable context exists in the default package. |
| TENANCY-INV-004 | Actor absence is explicit for system operations. |

## 10. Failure and outcome model

- Missing organization, malformed identifiers, contradictory actor state, and unsafe public projection requests fail closed.

All representable failures use code-narrowable `Result<Data, Code>` outcomes. Internal causes and unsafe diagnostics are not public payloads.

## 11. Ingress and normalization

- Serialized trusted handoff enters as unknown and validates once.
- HTTP headers/cookies are interpreted by application adapters, not this package.

Every applicable ingress path accepts `unknown`, parses once, applies declared byte/depth/count bounds, and emits canonical-only values.

## 12. Persistence and transaction model

- Not applicable. Context is execution state, not persisted ownership data.

Persistence implementation must remain mechanism-only and must not encode bounded-context policy.

## 13. Events, integrations, and composition

- Database RLS binding, authorization, events, audit, and telemetry consume this context through registered edges.

No application, route, React, Next.js, presentation, or undeclared internal-path dependency is permitted.

## 14. Tenancy, privacy, and security

- Negative tests prove untrusted organization override is impossible.
- Public projection excludes private diagnostics and secrets.

For C1, an approved threat model, SBOM, high-severity vulnerability gate, and negative-path security tests are mandatory before `VERIFIED`.

## 15. Non-functional requirements

- Construction and derivation are constant-time.
- Same explicit input yields semantically identical context.
- Testing utilities provide deterministic identifiers only.

The final admission contract must record measurable complexity, input-size, throughput, bundle, compatibility, and controlled-latency budgets applicable to the package profile.

## 16. Conditional applicability resolution

| Trigger family | Proposed result | Reason |
| --- | --- | --- |
| Ingress | APPLICABLE | Package accepts unknown, serialized, vendor, alias-bearing, or configuration input. |
| Generated projections | NOT_APPLICABLE | No generated artifact in proposed topology. |
| Persistent-kernel storage | NOT_APPLICABLE | Persistence mode is NONE. |
| Multi-target isolation | NOT_APPLICABLE | Targets: pure. |
| C1 threat model | APPLICABLE | Criticality is C1. |

`NOT_APPLICABLE` is valid only when the machine-readable requirement register evaluates the trigger as false.

## 17. Architecture tree

This topology contains only responsibilities triggered by this PRD. Empty, decorative, placeholder, or future-use directories are prohibited.

```text
packages/foundation/tenancy/
├── __tests__
│   ├── tenancy.boundary.test.ts
│   ├── tenancy.contract.test.ts
│   ├── tenancy.projection.test.ts
│   └── tenancy.trust-boundary.test.ts
└── src
    ├── capabilities
    │   ├── create.ts
    │   ├── derive.ts
    │   └── project.ts
    ├── contract
    │   ├── compatibility.ts
    │   ├── execution-context.ts
    │   ├── identities.ts
    │   └── trusted-input.ts
    ├── index.ts
    ├── ingress
    │   └── parse-context.ts
    ├── internal
    │   └── freeze.ts
    └── testing.ts
```

### 17.1 File responsibility register

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | public context facade |
| `src/testing.ts` | deterministic context fixtures |
| `src/contract/identities.ts` | organization/actor/correlation brands |
| `src/contract/execution-context.ts` | immutable context contract |
| `src/contract/trusted-input.ts` | trusted construction boundary |
| `src/contract/compatibility.ts` | source/wire profile |
| `src/capabilities/create.ts` | trusted context construction |
| `src/capabilities/derive.ts` | immutable derivation |
| `src/capabilities/project.ts` | safe public projection |
| `src/ingress/parse-context.ts` | serialized handoff validation |
| `src/internal/freeze.ts` | private immutability mechanism |
| `__tests__/tenancy.contract.test.ts` | public contract coverage |
| `__tests__/tenancy.trust-boundary.test.ts` | negative tenant override tests |
| `__tests__/tenancy.projection.test.ts` | data minimization tests |
| `__tests__/tenancy.boundary.test.ts` | no global state evidence |

### 17.2 Facade rules

- `src/index.ts` contains explicit named exports only and no logic or side effects.
- Auxiliary entrypoints expose only the registered isolation/composition surface.
- Raw clients, SQL objects, mutable adapter instances, storage implementations, and private registries are never exported through `.`.
- Cross-package consumers import `@afenda/tenancy` or a registered auxiliary entrypoint only.

## 18. Test and evidence contract

Required evidence families:

- `KRN-ID-*`
- `KRN-OWN-*`
- `KRN-CTR-*`
- `KRN-BND-*`
- `KRN-SEC-*`
- `KRN-QUA-*`
- `KRN-NFR-*`
- `KRN-REL-*`
- `KRN-DOC-*`
- `KRN-ING-*`

Minimum executable gates:

1. Inspector snapshot.
2. Registry parity and dependency-boundary gates.
3. Package lint and strict typecheck.
4. Behavior/contract tests for every exported capability.
5. Rejection tests for every ingress path.
6. Projection and adapter parity where applicable.
7. Consumer compile demonstration for every declared consumer.
8. Coverage threshold: 90% branch coverage.
9. Mutation testing where the C1 logic trigger applies.
10. Entrypoint isolation, budgets, compatibility, security, evidence-completeness, and digest calculation.

A skipped, timed-out, killed, resource-starved, or unrecorded applicable gate is failure.

## 19. Implementation slices

| Slice | Coherent outcome | Gate to advance |
| --- | --- | --- |
| TENANCY-1.0 | Freeze identity brands and trusted-context boundary. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| TENANCY-2.0 | Implement immutable construction and derivation. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| TENANCY-3.0 | Implement bounded serialized handoff parser. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| TENANCY-4.0 | Add safe projection and negative-path security tests. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| TENANCY-5.0 | Complete coverage, mutation, compatibility, and consumer evidence. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |

Slices are sequential-gated, independently reviewable, and constrained to exact package/write boundaries. No later slice begins while an earlier slice is non-green.

## 20. Acceptance criteria and definition of done

The package is `IMPLEMENTED` only when:

- all exported behavior is real, tested, and derived from canonical definitions or admitted mechanism state;
- all applicable ownership, contract, ingress, projection, storage, and consumer checks pass;
- memory/fake and production adapter parity passes where multiple adapters exist;
- no placeholder runtime path, stub return, TODO behavior branch, or deferred deletion remains.

The package is `VERIFIED` only when one evidence-complete CI run proves all applicable mandatory requirements for one content digest, including security, budgets, compatibility, coverage, mutation where triggered, internal-refactor demonstration, and evidence completeness.

A seal may be issued only after verification and attests one package capability, commit, and content digest. It is not release, deployment, migration, or statutory approval.

## 21. Required admission records before production-source merge

1. Named owners and signatories.
2. Exact accepted production consumers.
3. Exact runtime targets and auxiliary-entrypoint isolation reasons.
4. Exact dependency edges in both `package.json` and the workspace-edge register.
5. Compatibility support windows.
6. Machine-resolved requirement applicability expressions.
7. Measurable non-functional budgets.
8. Four admission decisions recorded as PASS.

## 22. Rejected designs

- Generic `shared`, `common`, `utils`, `core`, `types`, `registry`, or umbrella kernel package.
- Wildcard exports or internal-path consumption.
- Mutable request/tenant/transaction/clock/adapter singleton.
- App/framework dependency.
- Manually synchronized projection.
- Business-policy ownership not stated in the admitted capability.
- A mutable `SEALED` lifecycle state.
- Treating partial, skipped, or undocumented evidence as success.


---

# @afenda/authz — Product Requirements Document

| Field | Value |
| --- | --- |
| Document type | Individual kernel package PRD |
| Status | Draft for admission and implementation approval |
| Package | `@afenda/authz` |
| Physical path | `packages/foundation/authz` |
| Band | `foundation` |
| Kernel kind | `CLOSED` |
| Persistence mode | `NONE` |
| Criticality | `C1` |
| Governing authority | `packages/KERNEL-GOVERNANCE.md` |
| Capability owner | Package Owner role; named human must be recorded in the admission contract |
| Architecture owner | Architecture Owner role; named human must be recorded in the admission contract |
| Security owner | Required for C1 admission, verification, and seal |

> This PRD defines one package capability. It does not override the governance authority, workspace package register, frozen admission contract, workspace-edge register, or machine-readable requirement register.

---

## 1. Product/capability statement

**Admitted capability:** Permission grammar, decision representation, and universal evaluation primitives.

**Problem.** Authorization fails when permissions are free-form strings, decisions vary by package, or evaluators hide tenant/business policy inside a shared kernel.

## 2. Goals

- Define one canonical permission grammar and decision shape.
- Provide policy-neutral evaluation primitives.
- Fail closed on malformed, missing, or contradictory inputs.
- Keep business role assignment and resource policy in bounded contexts.

## 3. Explicit non-goals and non-ownership

- User authentication, membership storage, role administration, approval workflow, row-level policy definitions, or domain-specific authorization maps.

The package must not absorb unrelated shared helpers, bounded-context policy, application concerns, UI concerns, or a canonical cross-domain registry.

## 4. Consumers and jobs to be done

**Candidate production consumer classes** — exact package names must be frozen in the admission contract:

- ERP operation registries and authorization boundaries
- Application policy composition
- Security-sensitive runtime and data-plane packages

Consumer jobs:

1. Import the registered entrypoint rather than an internal path.
2. Invoke a stable representation-safe capability.
3. Receive canonical values or `@afenda/errors` outcomes.
4. Replace internal implementation without production-consumer edits.

## 5. Admission decisions

| Decision | Required result | Package-specific interpretation |
| --- | --- | --- |
| Ownership | PASS | `@afenda/authz` is the single owner of the admitted capability and nothing broader. |
| Policy neutrality | PASS | No organization-specific, workflow-specific, legal, tax, accounting, or domain disposition is encoded. |
| Jurisdiction portability | PASS | Facts may be represented; jurisdictional conclusions remain with bounded contexts or approved policy layers. |
| Reuse portability | PASS | Capability remains reusable by multiple registered consumers without app/framework coupling. |

## 6. Runtime and dependency contract

| Surface | Proposed admission value |
| --- | --- |
| Permitted runtime targets | `pure` |
| Default entrypoint | `.` |
| Auxiliary entrypoints | `./testing` |
| Proposed authorized dependency edges | `@afenda/errors`, `@afenda/tenancy` |

These values are implementation-ready proposals but become authoritative only when recorded in the workspace package register, admission contract, `package.json`, and workspace-edge register.

## 7. Canonical records and public types

- `Permission`
- `PermissionNamespace`
- `Action`
- `Resource`
- `AuthorizationInput`
- `AuthorizationDecision`
- `DecisionReason`

Public types must be derived from these canonical definitions. Separately maintained unions, maps, validators, or registries are prohibited.

## 8. Functional operations

| No. | Required operation |
| ---: | --- |
| 01 | `parsePermission(unknown)` validates canonical grammar. |
| 02 | `evaluate(input, grants)` returns allow/deny without side effects. |
| 03 | `allOf`, `anyOf`, and `not` combine universal predicates. |
| 04 | `explainDecision(decision)` returns safe machine-readable reason data. |

## 9. Normative package invariants

| Invariant ID | Requirement |
| --- | --- |
| AUTHZ-INV-001 | Malformed or unknown permission input denies. |
| AUTHZ-INV-002 | No tenant-specific role, workflow, or resource rule is encoded. |
| AUTHZ-INV-003 | Evaluation is deterministic and side-effect free. |
| AUTHZ-INV-004 | Decision reason data is public-safe and does not reveal protected policy internals. |

## 10. Failure and outcome model

- Parsing failures return canonical Result failures; evaluation itself returns an explicit deny decision rather than throwing.

All representable failures use code-narrowable `Result<Data, Code>` outcomes. Internal causes and unsafe diagnostics are not public payloads.

## 11. Ingress and normalization

- Permission strings and serialized grants enter as unknown and are size-bounded.

Every applicable ingress path accepts `unknown`, parses once, applies declared byte/depth/count bounds, and emits canonical-only values.

## 12. Persistence and transaction model

- Not applicable. Grants, roles, and assignments are owned by consuming systems.

Persistence implementation must remain mechanism-only and must not encode bounded-context policy.

## 13. Events, integrations, and composition

- Consumes trusted execution context identity only where required by an evaluation input.

No application, route, React, Next.js, presentation, or undeclared internal-path dependency is permitted.

## 14. Tenancy, privacy, and security

- Security-sensitive decisions fail closed.
- Negative-path tests cover absent grants, wrong organization, malformed resource, and contradictory predicates.

For C1, an approved threat model, SBOM, high-severity vulnerability gate, and negative-path security tests are mandatory before `VERIFIED`.

## 15. Non-functional requirements

- Evaluation complexity is bounded by declared grant and predicate counts.
- Pure evaluation is deterministic.
- Mutation score threshold applies to evaluator logic.

The final admission contract must record measurable complexity, input-size, throughput, bundle, compatibility, and controlled-latency budgets applicable to the package profile.

## 16. Conditional applicability resolution

| Trigger family | Proposed result | Reason |
| --- | --- | --- |
| Ingress | APPLICABLE | Package accepts unknown, serialized, vendor, alias-bearing, or configuration input. |
| Generated projections | NOT_APPLICABLE | No generated artifact in proposed topology. |
| Persistent-kernel storage | NOT_APPLICABLE | Persistence mode is NONE. |
| Multi-target isolation | NOT_APPLICABLE | Targets: pure. |
| C1 threat model | APPLICABLE | Criticality is C1. |

`NOT_APPLICABLE` is valid only when the machine-readable requirement register evaluates the trigger as false.

## 17. Architecture tree

This topology contains only responsibilities triggered by this PRD. Empty, decorative, placeholder, or future-use directories are prohibited.

```text
packages/foundation/authz/
├── __tests__
│   ├── authz.boundary.test.ts
│   ├── authz.contract.test.ts
│   ├── authz.evaluation.property.test.ts
│   └── authz.negative-path.test.ts
└── src
    ├── capabilities
    │   ├── combinators.ts
    │   ├── evaluate.ts
    │   ├── explain.ts
    │   └── parse.ts
    ├── contract
    │   ├── compatibility.ts
    │   ├── decision.ts
    │   ├── evaluation.ts
    │   └── permission.ts
    ├── index.ts
    ├── ingress
    │   └── parse-grants.ts
    ├── internal
    │   └── grammar.ts
    └── testing.ts
```

### 17.1 File responsibility register

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | public authorization facade |
| `src/testing.ts` | decision and grant fixtures |
| `src/contract/permission.ts` | permission grammar |
| `src/contract/decision.ts` | allow/deny representation |
| `src/contract/evaluation.ts` | policy-neutral input contracts |
| `src/contract/compatibility.ts` | source compatibility |
| `src/capabilities/parse.ts` | permission parser |
| `src/capabilities/evaluate.ts` | universal evaluator |
| `src/capabilities/combinators.ts` | predicate composition |
| `src/capabilities/explain.ts` | safe decision explanation |
| `src/ingress/parse-grants.ts` | bounded serialized grants |
| `src/internal/grammar.ts` | private parser grammar |
| `__tests__/authz.contract.test.ts` | public contracts |
| `__tests__/authz.evaluation.property.test.ts` | evaluation laws |
| `__tests__/authz.negative-path.test.ts` | fail-closed security tests |
| `__tests__/authz.boundary.test.ts` | policy-neutrality checks |

### 17.2 Facade rules

- `src/index.ts` contains explicit named exports only and no logic or side effects.
- Auxiliary entrypoints expose only the registered isolation/composition surface.
- Raw clients, SQL objects, mutable adapter instances, storage implementations, and private registries are never exported through `.`.
- Cross-package consumers import `@afenda/authz` or a registered auxiliary entrypoint only.

## 18. Test and evidence contract

Required evidence families:

- `KRN-ID-*`
- `KRN-OWN-*`
- `KRN-CTR-*`
- `KRN-BND-*`
- `KRN-SEC-*`
- `KRN-QUA-*`
- `KRN-NFR-*`
- `KRN-REL-*`
- `KRN-DOC-*`
- `KRN-ING-*`

Minimum executable gates:

1. Inspector snapshot.
2. Registry parity and dependency-boundary gates.
3. Package lint and strict typecheck.
4. Behavior/contract tests for every exported capability.
5. Rejection tests for every ingress path.
6. Projection and adapter parity where applicable.
7. Consumer compile demonstration for every declared consumer.
8. Coverage threshold: 90% branch coverage.
9. Mutation testing where the C1 logic trigger applies.
10. Entrypoint isolation, budgets, compatibility, security, evidence-completeness, and digest calculation.

A skipped, timed-out, killed, resource-starved, or unrecorded applicable gate is failure.

## 19. Implementation slices

| Slice | Coherent outcome | Gate to advance |
| --- | --- | --- |
| AUTHZ-1.0 | Freeze permission grammar and decision contract. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| AUTHZ-2.0 | Implement parser and exhaustive evaluator. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| AUTHZ-3.0 | Implement policy-neutral combinators and explanation. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| AUTHZ-4.0 | Add fail-closed negative, property, and mutation tests. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| AUTHZ-5.0 | Demonstrate consumer integration without kernel-owned business policy. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |

Slices are sequential-gated, independently reviewable, and constrained to exact package/write boundaries. No later slice begins while an earlier slice is non-green.

## 20. Acceptance criteria and definition of done

The package is `IMPLEMENTED` only when:

- all exported behavior is real, tested, and derived from canonical definitions or admitted mechanism state;
- all applicable ownership, contract, ingress, projection, storage, and consumer checks pass;
- memory/fake and production adapter parity passes where multiple adapters exist;
- no placeholder runtime path, stub return, TODO behavior branch, or deferred deletion remains.

The package is `VERIFIED` only when one evidence-complete CI run proves all applicable mandatory requirements for one content digest, including security, budgets, compatibility, coverage, mutation where triggered, internal-refactor demonstration, and evidence completeness.

A seal may be issued only after verification and attests one package capability, commit, and content digest. It is not release, deployment, migration, or statutory approval.

## 21. Required admission records before production-source merge

1. Named owners and signatories.
2. Exact accepted production consumers.
3. Exact runtime targets and auxiliary-entrypoint isolation reasons.
4. Exact dependency edges in both `package.json` and the workspace-edge register.
5. Compatibility support windows.
6. Machine-resolved requirement applicability expressions.
7. Measurable non-functional budgets.
8. Four admission decisions recorded as PASS.

## 22. Rejected designs

- Generic `shared`, `common`, `utils`, `core`, `types`, `registry`, or umbrella kernel package.
- Wildcard exports or internal-path consumption.
- Mutable request/tenant/transaction/clock/adapter singleton.
- App/framework dependency.
- Manually synchronized projection.
- Business-policy ownership not stated in the admitted capability.
- A mutable `SEALED` lifecycle state.
- Treating partial, skipped, or undocumented evidence as success.


---

# @afenda/idempotency — Product Requirements Document

| Field | Value |
| --- | --- |
| Document type | Individual kernel package PRD |
| Status | Draft for admission and implementation approval |
| Package | `@afenda/idempotency` |
| Physical path | `packages/runtime/idempotency` |
| Band | `runtime` |
| Kernel kind | `CLOSED` |
| Persistence mode | `INJECTED` |
| Criticality | `C1` |
| Governing authority | `packages/KERNEL-GOVERNANCE.md` |
| Capability owner | Package Owner role; named human must be recorded in the admission contract |
| Architecture owner | Architecture Owner role; named human must be recorded in the admission contract |
| Security owner | Required for C1 admission, verification, and seal |

> This PRD defines one package capability. It does not override the governance authority, workspace package register, frozen admission contract, workspace-edge register, or machine-readable requirement register.

---

## 1. Product/capability statement

**Admitted capability:** Claim, release, replay, expiry, and conflict semantics over an injected idempotency store.

**Problem.** Retryable commands can duplicate irreversible work unless claim ownership, completion, replay, expiry, and conflicts share one transaction-safe semantic model.

## 2. Goals

- Provide deterministic idempotency state transitions.
- Separate mechanism from command/business policy.
- Support replay of completed canonical outcomes.
- Define expiry, lease, conflict, and recovery behavior over a narrow store.

## 3. Explicit non-goals and non-ownership

- Choosing which business operations require idempotency.
- HTTP idempotency middleware, job scheduling, distributed locks in general, or payment-specific deduplication policy.

The package must not absorb unrelated shared helpers, bounded-context policy, application concerns, UI concerns, or a canonical cross-domain registry.

## 4. Consumers and jobs to be done

**Candidate production consumer classes** — exact package names must be frozen in the admission contract:

- ERP command execution layers
- Outbox publication coordination
- Application APIs and background workers

Consumer jobs:

1. Import the registered entrypoint rather than an internal path.
2. Invoke a stable representation-safe capability.
3. Receive canonical values or `@afenda/errors` outcomes.
4. Replace internal implementation without production-consumer edits.

## 5. Admission decisions

| Decision | Required result | Package-specific interpretation |
| --- | --- | --- |
| Ownership | PASS | `@afenda/idempotency` is the single owner of the admitted capability and nothing broader. |
| Policy neutrality | PASS | No organization-specific, workflow-specific, legal, tax, accounting, or domain disposition is encoded. |
| Jurisdiction portability | PASS | Facts may be represented; jurisdictional conclusions remain with bounded contexts or approved policy layers. |
| Reuse portability | PASS | Capability remains reusable by multiple registered consumers without app/framework coupling. |

## 6. Runtime and dependency contract

| Surface | Proposed admission value |
| --- | --- |
| Permitted runtime targets | `node` |
| Default entrypoint | `.` |
| Auxiliary entrypoints | `./adapter-contract`, `./testing` |
| Proposed authorized dependency edges | `@afenda/errors`, `@afenda/ids`, `@afenda/temporal`, `@afenda/tenancy` |

These values are implementation-ready proposals but become authoritative only when recorded in the workspace package register, admission contract, `package.json`, and workspace-edge register.

## 7. Canonical records and public types

- `IdempotencyKey`
- `IdempotencyScope`
- `ClaimToken`
- `ClaimState`
- `ReplayRecord`
- `Lease`
- `IdempotencyOutcome`

Public types must be derived from these canonical definitions. Separately maintained unions, maps, validators, or registries are prohibited.

## 8. Functional operations

| No. | Required operation |
| ---: | --- |
| 01 | `claim(request, store, clock)` acquires or reports existing state. |
| 02 | `complete(claim, outcome, store)` atomically records replayable outcome. |
| 03 | `release(claim, store)` releases eligible claims. |
| 04 | `replay(key, store)` returns completed canonical outcome. |
| 05 | `expire(now, store)` transitions stale claims under explicit policy. |

## 9. Normative package invariants

| Invariant ID | Requirement |
| --- | --- |
| IDEMPOTENCY-INV-001 | At most one active claim exists per organization and canonical key scope. |
| IDEMPOTENCY-INV-002 | Only the matching claim token may complete or release. |
| IDEMPOTENCY-INV-003 | Completed outcomes are immutable for their key. |
| IDEMPOTENCY-INV-004 | Expiry never permits two concurrent valid owners. |
| IDEMPOTENCY-INV-005 | Tenant context is bound server-side. |

## 10. Failure and outcome model

- Conflict, stale token, missing claim, invalid transition, store failure, and expired replay are canonical outcomes.

All representable failures use code-narrowable `Result<Data, Code>` outcomes. Internal causes and unsafe diagnostics are not public payloads.

## 11. Ingress and normalization

- External idempotency keys enter as unknown, normalize once, and are length-bounded.

Every applicable ingress path accepts `unknown`, parses once, applies declared byte/depth/count bounds, and emits canonical-only values.

## 12. Persistence and transaction model

- Injected store defines atomic claim/compare-and-set/complete/read operations and explicit transaction expectations.
- Memory and production adapters must be semantically equivalent.

Persistence implementation must remain mechanism-only and must not encode bounded-context policy.

## 13. Events, integrations, and composition

- Uses explicit clock and trusted execution context.
- Consumers decide outcome serialization and retention within the admitted compatibility profile.

No application, route, React, Next.js, presentation, or undeclared internal-path dependency is permitted.

## 14. Tenancy, privacy, and security

- Cross-tenant key collision and token forgery fail closed.
- Replay payloads must already be public-safe canonical outcomes.

For C1, an approved threat model, SBOM, high-severity vulnerability gate, and negative-path security tests are mandatory before `VERIFIED`.

## 15. Non-functional requirements

- Claim operations declare contention and retry budgets.
- State-machine logic is mutation-tested.
- No uncontrolled wall clock or randomness appears in tests.

The final admission contract must record measurable complexity, input-size, throughput, bundle, compatibility, and controlled-latency budgets applicable to the package profile.

## 16. Conditional applicability resolution

| Trigger family | Proposed result | Reason |
| --- | --- | --- |
| Ingress | APPLICABLE | Package accepts unknown, serialized, vendor, alias-bearing, or configuration input. |
| Generated projections | NOT_APPLICABLE | No generated artifact in proposed topology. |
| Persistent-kernel storage | APPLICABLE | Persistence mode is INJECTED. |
| Multi-target isolation | NOT_APPLICABLE | Targets: node. |
| C1 threat model | APPLICABLE | Criticality is C1. |

`NOT_APPLICABLE` is valid only when the machine-readable requirement register evaluates the trigger as false.

## 17. Architecture tree

This topology contains only responsibilities triggered by this PRD. Empty, decorative, placeholder, or future-use directories are prohibited.

```text
packages/runtime/idempotency/
├── __tests__
│   ├── idempotency.adapter-parity.test.ts
│   ├── idempotency.concurrency.test.ts
│   ├── idempotency.contract.test.ts
│   ├── idempotency.state-machine.test.ts
│   └── idempotency.tenant-boundary.test.ts
└── src
    ├── adapter-contract.ts
    ├── adapters
    │   └── memory-idempotency-store.ts
    ├── capabilities
    │   ├── claim.ts
    │   ├── complete.ts
    │   ├── expire.ts
    │   ├── release.ts
    │   └── replay.ts
    ├── contract
    │   ├── claim.ts
    │   ├── compatibility.ts
    │   ├── key.ts
    │   └── replay.ts
    ├── index.ts
    ├── ingress
    │   └── parse-key.ts
    ├── internal
    │   └── state-machine.ts
    ├── store
    │   └── idempotency-store.ts
    └── testing.ts
```

### 17.1 File responsibility register

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | runtime capability facade |
| `src/adapter-contract.ts` | composition-only store facade |
| `src/testing.ts` | memory adapter and deterministic fixtures |
| `src/contract/key.ts` | key and scope contracts |
| `src/contract/claim.ts` | claim token/state |
| `src/contract/replay.ts` | replay record |
| `src/contract/compatibility.ts` | stored/wire compatibility |
| `src/capabilities/claim.ts` | claim behavior |
| `src/capabilities/complete.ts` | completion behavior |
| `src/capabilities/release.ts` | release behavior |
| `src/capabilities/replay.ts` | replay behavior |
| `src/capabilities/expire.ts` | expiry behavior |
| `src/ingress/parse-key.ts` | bounded key ingress |
| `src/store/idempotency-store.ts` | narrow atomic store contract |
| `src/adapters/memory-idempotency-store.ts` | semantic reference adapter |
| `src/internal/state-machine.ts` | transition rules |
| `__tests__/idempotency.contract.test.ts` | public contracts |
| `__tests__/idempotency.state-machine.test.ts` | transition coverage |
| `__tests__/idempotency.concurrency.test.ts` | claim conflict tests |
| `__tests__/idempotency.adapter-parity.test.ts` | adapter equivalence |
| `__tests__/idempotency.tenant-boundary.test.ts` | negative tenancy tests |

### 17.2 Facade rules

- `src/index.ts` contains explicit named exports only and no logic or side effects.
- Auxiliary entrypoints expose only the registered isolation/composition surface.
- Raw clients, SQL objects, mutable adapter instances, storage implementations, and private registries are never exported through `.`.
- Cross-package consumers import `@afenda/idempotency` or a registered auxiliary entrypoint only.

## 18. Test and evidence contract

Required evidence families:

- `KRN-ID-*`
- `KRN-OWN-*`
- `KRN-CTR-*`
- `KRN-BND-*`
- `KRN-SEC-*`
- `KRN-QUA-*`
- `KRN-NFR-*`
- `KRN-REL-*`
- `KRN-DOC-*`
- `KRN-ING-*`
- `KRN-STO-*`

Minimum executable gates:

1. Inspector snapshot.
2. Registry parity and dependency-boundary gates.
3. Package lint and strict typecheck.
4. Behavior/contract tests for every exported capability.
5. Rejection tests for every ingress path.
6. Projection and adapter parity where applicable.
7. Consumer compile demonstration for every declared consumer.
8. Coverage threshold: 90% branch coverage.
9. Mutation testing where the C1 logic trigger applies.
10. Entrypoint isolation, budgets, compatibility, security, evidence-completeness, and digest calculation.

A skipped, timed-out, killed, resource-starved, or unrecorded applicable gate is failure.

## 19. Implementation slices

| Slice | Coherent outcome | Gate to advance |
| --- | --- | --- |
| IDEMPOTENCY-1.0 | Freeze key scope, state machine, and atomic store contract. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| IDEMPOTENCY-2.0 | Implement memory reference adapter and claim flow. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| IDEMPOTENCY-3.0 | Implement complete, replay, release, and expiry. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| IDEMPOTENCY-4.0 | Add concurrency, tenant, hostile-input, and mutation tests. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| IDEMPOTENCY-5.0 | Verify production adapter parity, budgets, compatibility, and threat model. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |

Slices are sequential-gated, independently reviewable, and constrained to exact package/write boundaries. No later slice begins while an earlier slice is non-green.

## 20. Acceptance criteria and definition of done

The package is `IMPLEMENTED` only when:

- all exported behavior is real, tested, and derived from canonical definitions or admitted mechanism state;
- all applicable ownership, contract, ingress, projection, storage, and consumer checks pass;
- memory/fake and production adapter parity passes where multiple adapters exist;
- no placeholder runtime path, stub return, TODO behavior branch, or deferred deletion remains.

The package is `VERIFIED` only when one evidence-complete CI run proves all applicable mandatory requirements for one content digest, including security, budgets, compatibility, coverage, mutation where triggered, internal-refactor demonstration, and evidence completeness.

A seal may be issued only after verification and attests one package capability, commit, and content digest. It is not release, deployment, migration, or statutory approval.

## 21. Required admission records before production-source merge

1. Named owners and signatories.
2. Exact accepted production consumers.
3. Exact runtime targets and auxiliary-entrypoint isolation reasons.
4. Exact dependency edges in both `package.json` and the workspace-edge register.
5. Compatibility support windows.
6. Machine-resolved requirement applicability expressions.
7. Measurable non-functional budgets.
8. Four admission decisions recorded as PASS.

## 22. Rejected designs

- Generic `shared`, `common`, `utils`, `core`, `types`, `registry`, or umbrella kernel package.
- Wildcard exports or internal-path consumption.
- Mutable request/tenant/transaction/clock/adapter singleton.
- App/framework dependency.
- Manually synchronized projection.
- Business-policy ownership not stated in the admitted capability.
- A mutable `SEALED` lifecycle state.
- Treating partial, skipped, or undocumented evidence as success.


---

# @afenda/events — Product Requirements Document

| Field | Value |
| --- | --- |
| Document type | Individual kernel package PRD |
| Status | Draft for admission and implementation approval |
| Package | `@afenda/events` |
| Physical path | `packages/runtime/events` |
| Band | `runtime` |
| Kernel kind | `CLOSED` |
| Persistence mode | `NONE` |
| Criticality | `C1` |
| Governing authority | `packages/KERNEL-GOVERNANCE.md` |
| Capability owner | Package Owner role; named human must be recorded in the admission contract |
| Architecture owner | Architecture Owner role; named human must be recorded in the admission contract |
| Security owner | Required for C1 admission, verification, and seal |

> This PRD defines one package capability. It does not override the governance authority, workspace package register, frozen admission contract, workspace-edge register, or machine-readable requirement register.

---

## 1. Product/capability statement

**Admitted capability:** Event interoperability contract: envelope, versioning, serialization, and subscription interfaces.

**Problem.** Events become unusable when envelopes, names, versions, metadata, serialization, and subscription contracts vary by producer.

## 2. Goals

- Provide one versioned event envelope and canonical serialization contract.
- Preserve producer-owned payload schemas without a cross-domain registry.
- Carry trusted identity and correlation metadata safely.
- Define transport-neutral subscription interfaces.

## 3. Explicit non-goals and non-ownership

- Broker implementation, event-store persistence, outbox storage, business event ownership, or a canonical cross-domain event registry.

The package must not absorb unrelated shared helpers, bounded-context policy, application concerns, UI concerns, or a canonical cross-domain registry.

## 4. Consumers and jobs to be done

**Candidate production consumer classes** — exact package names must be frozen in the admission contract:

- ERP bounded contexts emitting/consuming events
- Outbox and read-model mechanisms
- Application transport adapters

Consumer jobs:

1. Import the registered entrypoint rather than an internal path.
2. Invoke a stable representation-safe capability.
3. Receive canonical values or `@afenda/errors` outcomes.
4. Replace internal implementation without production-consumer edits.

## 5. Admission decisions

| Decision | Required result | Package-specific interpretation |
| --- | --- | --- |
| Ownership | PASS | `@afenda/events` is the single owner of the admitted capability and nothing broader. |
| Policy neutrality | PASS | No organization-specific, workflow-specific, legal, tax, accounting, or domain disposition is encoded. |
| Jurisdiction portability | PASS | Facts may be represented; jurisdictional conclusions remain with bounded contexts or approved policy layers. |
| Reuse portability | PASS | Capability remains reusable by multiple registered consumers without app/framework coupling. |

## 6. Runtime and dependency contract

| Surface | Proposed admission value |
| --- | --- |
| Permitted runtime targets | `pure` |
| Default entrypoint | `.` |
| Auxiliary entrypoints | `./testing` |
| Proposed authorized dependency edges | `@afenda/errors`, `@afenda/ids`, `@afenda/temporal`, `@afenda/tenancy` |

These values are implementation-ready proposals but become authoritative only when recorded in the workspace package register, admission contract, `package.json`, and workspace-edge register.

## 7. Canonical records and public types

- `EventName`
- `EventVersion`
- `EventEnvelope<Payload>`
- `EventMetadata`
- `SerializedEvent`
- `Subscription`
- `EventHandler`

Public types must be derived from these canonical definitions. Separately maintained unions, maps, validators, or registries are prohibited.

## 8. Functional operations

| No. | Required operation |
| ---: | --- |
| 01 | `createEnvelope(definition, payload, context, clock)` creates canonical metadata. |
| 02 | `serializeEvent(envelope)` produces bounded canonical wire data. |
| 03 | `deserializeEvent(unknown, definition)` validates envelope and payload boundary. |
| 04 | `matchSubscription(event, subscription)` performs transport-neutral matching. |
| 05 | Version compatibility is checked against producer-supplied definitions. |

## 9. Normative package invariants

| Invariant ID | Requirement |
| --- | --- |
| EVENTS-INV-001 | Each bounded context owns its event names and payload definitions. |
| EVENTS-INV-002 | The kernel owns envelope semantics only. |
| EVENTS-INV-003 | Serialized output is canonical and versioned. |
| EVENTS-INV-004 | Unknown or incompatible versions never reach typed handlers. |
| EVENTS-INV-005 | Private diagnostics and secrets are absent from envelopes. |

## 10. Failure and outcome model

- Malformed envelope, invalid metadata, payload validation failure, unsupported version, and size-limit breach return canonical failures.

All representable failures use code-narrowable `Result<Data, Code>` outcomes. Internal causes and unsafe diagnostics are not public payloads.

## 11. Ingress and normalization

- Serialized event input enters as unknown with explicit byte/depth/count bounds.
- Vendor transport metadata is normalized outside or at a named ingress adapter.

Every applicable ingress path accepts `unknown`, parses once, applies declared byte/depth/count bounds, and emits canonical-only values.

## 12. Persistence and transaction model

- Not applicable. Outbox/event-store persistence belongs elsewhere.

Persistence implementation must remain mechanism-only and must not encode bounded-context policy.

## 13. Events, integrations, and composition

- Outbox stores serialized envelopes; read-models consume subscriptions and positions.
- Transport adapters implement delivery without entering the default facade.

No application, route, React, Next.js, presentation, or undeclared internal-path dependency is permitted.

## 14. Tenancy, privacy, and security

- Envelope metadata uses trusted context, not client-supplied organization identity.
- Deserialization is hostile-input tested and fail-closed.

For C1, an approved threat model, SBOM, high-severity vulnerability gate, and negative-path security tests are mandatory before `VERIFIED`.

## 15. Non-functional requirements

- Serialization is deterministic and byte-bounded.
- Handler matching is bounded by subscription count.
- Wire compatibility fixtures are required.

The final admission contract must record measurable complexity, input-size, throughput, bundle, compatibility, and controlled-latency budgets applicable to the package profile.

## 16. Conditional applicability resolution

| Trigger family | Proposed result | Reason |
| --- | --- | --- |
| Ingress | APPLICABLE | Package accepts unknown, serialized, vendor, alias-bearing, or configuration input. |
| Generated projections | NOT_APPLICABLE | No generated artifact in proposed topology. |
| Persistent-kernel storage | NOT_APPLICABLE | Persistence mode is NONE. |
| Multi-target isolation | NOT_APPLICABLE | Targets: pure. |
| C1 threat model | APPLICABLE | Criticality is C1. |

`NOT_APPLICABLE` is valid only when the machine-readable requirement register evaluates the trigger as false.

## 17. Architecture tree

This topology contains only responsibilities triggered by this PRD. Empty, decorative, placeholder, or future-use directories are prohibited.

```text
packages/runtime/events/
├── __tests__
│   ├── events.compatibility.test.ts
│   ├── events.contract.test.ts
│   ├── events.hostile-input.test.ts
│   ├── events.ownership.test.ts
│   └── events.serialization.test.ts
└── src
    ├── capabilities
    │   ├── create-envelope.ts
    │   ├── deserialize.ts
    │   ├── match.ts
    │   └── serialize.ts
    ├── contract
    │   ├── compatibility.ts
    │   ├── envelope.ts
    │   ├── metadata.ts
    │   ├── name.ts
    │   └── subscription.ts
    ├── index.ts
    ├── ingress
    │   └── serialized-event.ts
    ├── internal
    │   └── canonical-json.ts
    └── testing.ts
```

### 17.1 File responsibility register

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | event interoperability facade |
| `src/testing.ts` | event fixtures and test definitions |
| `src/contract/name.ts` | event identity/version |
| `src/contract/envelope.ts` | canonical envelope |
| `src/contract/metadata.ts` | trusted metadata |
| `src/contract/subscription.ts` | transport-neutral subscription |
| `src/contract/compatibility.ts` | wire compatibility profile |
| `src/capabilities/create-envelope.ts` | envelope construction |
| `src/capabilities/serialize.ts` | canonical serialization |
| `src/capabilities/deserialize.ts` | validated deserialization |
| `src/capabilities/match.ts` | subscription matching |
| `src/ingress/serialized-event.ts` | hostile wire boundary |
| `src/internal/canonical-json.ts` | private canonical encoding |
| `__tests__/events.contract.test.ts` | public contracts |
| `__tests__/events.serialization.test.ts` | round-trip and canonical bytes |
| `__tests__/events.hostile-input.test.ts` | bounded parser tests |
| `__tests__/events.compatibility.test.ts` | version fixtures |
| `__tests__/events.ownership.test.ts` | no cross-domain registry |

### 17.2 Facade rules

- `src/index.ts` contains explicit named exports only and no logic or side effects.
- Auxiliary entrypoints expose only the registered isolation/composition surface.
- Raw clients, SQL objects, mutable adapter instances, storage implementations, and private registries are never exported through `.`.
- Cross-package consumers import `@afenda/events` or a registered auxiliary entrypoint only.

## 18. Test and evidence contract

Required evidence families:

- `KRN-ID-*`
- `KRN-OWN-*`
- `KRN-CTR-*`
- `KRN-BND-*`
- `KRN-SEC-*`
- `KRN-QUA-*`
- `KRN-NFR-*`
- `KRN-REL-*`
- `KRN-DOC-*`
- `KRN-ING-*`

Minimum executable gates:

1. Inspector snapshot.
2. Registry parity and dependency-boundary gates.
3. Package lint and strict typecheck.
4. Behavior/contract tests for every exported capability.
5. Rejection tests for every ingress path.
6. Projection and adapter parity where applicable.
7. Consumer compile demonstration for every declared consumer.
8. Coverage threshold: 90% branch coverage.
9. Mutation testing where the C1 logic trigger applies.
10. Entrypoint isolation, budgets, compatibility, security, evidence-completeness, and digest calculation.

A skipped, timed-out, killed, resource-starved, or unrecorded applicable gate is failure.

## 19. Implementation slices

| Slice | Coherent outcome | Gate to advance |
| --- | --- | --- |
| EVENTS-1.0 | Freeze envelope, metadata, version, and ownership boundaries. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| EVENTS-2.0 | Implement construction and canonical serialization. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| EVENTS-3.0 | Implement bounded deserialization and subscription matching. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| EVENTS-4.0 | Add compatibility, hostile-input, property, and mutation tests. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| EVENTS-5.0 | Demonstrate outbox and read-model consumers without transport coupling. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |

Slices are sequential-gated, independently reviewable, and constrained to exact package/write boundaries. No later slice begins while an earlier slice is non-green.

## 20. Acceptance criteria and definition of done

The package is `IMPLEMENTED` only when:

- all exported behavior is real, tested, and derived from canonical definitions or admitted mechanism state;
- all applicable ownership, contract, ingress, projection, storage, and consumer checks pass;
- memory/fake and production adapter parity passes where multiple adapters exist;
- no placeholder runtime path, stub return, TODO behavior branch, or deferred deletion remains.

The package is `VERIFIED` only when one evidence-complete CI run proves all applicable mandatory requirements for one content digest, including security, budgets, compatibility, coverage, mutation where triggered, internal-refactor demonstration, and evidence completeness.

A seal may be issued only after verification and attests one package capability, commit, and content digest. It is not release, deployment, migration, or statutory approval.

## 21. Required admission records before production-source merge

1. Named owners and signatories.
2. Exact accepted production consumers.
3. Exact runtime targets and auxiliary-entrypoint isolation reasons.
4. Exact dependency edges in both `package.json` and the workspace-edge register.
5. Compatibility support windows.
6. Machine-resolved requirement applicability expressions.
7. Measurable non-functional budgets.
8. Four admission decisions recorded as PASS.

## 22. Rejected designs

- Generic `shared`, `common`, `utils`, `core`, `types`, `registry`, or umbrella kernel package.
- Wildcard exports or internal-path consumption.
- Mutable request/tenant/transaction/clock/adapter singleton.
- App/framework dependency.
- Manually synchronized projection.
- Business-policy ownership not stated in the admitted capability.
- A mutable `SEALED` lifecycle state.
- Treating partial, skipped, or undocumented evidence as success.


---

# @afenda/observability — Product Requirements Document

| Field | Value |
| --- | --- |
| Document type | Individual kernel package PRD |
| Status | Draft for admission and implementation approval |
| Package | `@afenda/observability` |
| Physical path | `packages/runtime/observability` |
| Band | `runtime` |
| Kernel kind | `CLOSED` |
| Persistence mode | `INJECTED` |
| Criticality | `C2` |
| Governing authority | `packages/KERNEL-GOVERNANCE.md` |
| Capability owner | Package Owner role; named human must be recorded in the admission contract |
| Architecture owner | Architecture Owner role; named human must be recorded in the admission contract |
| Security owner | Not required by criticality unless a security trigger is activated |

> This PRD defines one package capability. It does not override the governance authority, workspace package register, frozen admission contract, workspace-edge register, or machine-readable requirement register.

---

## 1. Product/capability statement

**Admitted capability:** Structured operational telemetry emission, context propagation, and canonical redaction.

**Problem.** Logs, metrics, and traces become unsafe and uncorrelated when packages emit arbitrary fields, leak protected data, or bind directly to one vendor SDK.

## 2. Goals

- Provide a structured telemetry record and context model.
- Apply canonical privacy dispositions and redaction before sink emission.
- Use injected sinks and runtime-isolated adapters.
- Preserve correlation across node, edge, and browser targets without mutable global tenant state.

## 3. Explicit non-goals and non-ownership

- Incident response, alert policy, dashboards, vendor account configuration, business analytics, or audit facts.

The package must not absorb unrelated shared helpers, bounded-context policy, application concerns, UI concerns, or a canonical cross-domain registry.

## 4. Consumers and jobs to be done

**Candidate production consumer classes** — exact package names must be frozen in the admission contract:

- Kernel and ERP packages
- Application runtimes
- Operational sink adapters

Consumer jobs:

1. Import the registered entrypoint rather than an internal path.
2. Invoke a stable representation-safe capability.
3. Receive canonical values or `@afenda/errors` outcomes.
4. Replace internal implementation without production-consumer edits.

## 5. Admission decisions

| Decision | Required result | Package-specific interpretation |
| --- | --- | --- |
| Ownership | PASS | `@afenda/observability` is the single owner of the admitted capability and nothing broader. |
| Policy neutrality | PASS | No organization-specific, workflow-specific, legal, tax, accounting, or domain disposition is encoded. |
| Jurisdiction portability | PASS | Facts may be represented; jurisdictional conclusions remain with bounded contexts or approved policy layers. |
| Reuse portability | PASS | Capability remains reusable by multiple registered consumers without app/framework coupling. |

## 6. Runtime and dependency contract

| Surface | Proposed admission value |
| --- | --- |
| Permitted runtime targets | `node`, `edge`, `browser` |
| Default entrypoint | `.` |
| Auxiliary entrypoints | `./node`, `./edge`, `./browser`, `./adapter-contract`, `./testing` |
| Proposed authorized dependency edges | `@afenda/errors`, `@afenda/temporal`, `@afenda/tenancy` |

These values are implementation-ready proposals but become authoritative only when recorded in the workspace package register, admission contract, `package.json`, and workspace-edge register.

## 7. Canonical records and public types

- `TelemetryRecord`
- `TelemetryKind`
- `Severity`
- `TelemetryContext`
- `PrivacyDisposition`
- `RedactedValue`
- `TelemetrySink`

Public types must be derived from these canonical definitions. Separately maintained unions, maps, validators, or registries are prohibited.

## 8. Functional operations

| No. | Required operation |
| ---: | --- |
| 01 | `createTelemetryRecord(input, context, clock)` validates structure. |
| 02 | `redact(record, policy)` applies canonical data handling. |
| 03 | `emit(record, sink)` sends only redacted structured data. |
| 04 | `deriveTelemetryContext(parent, child)` propagates correlation safely. |

## 9. Normative package invariants

| Invariant ID | Requirement |
| --- | --- |
| OBSERVABILITY-INV-001 | No unredacted protected field reaches a sink. |
| OBSERVABILITY-INV-002 | Audit facts are not substituted with operational telemetry. |
| OBSERVABILITY-INV-003 | Vendor SDK types do not appear in the default public contract. |
| OBSERVABILITY-INV-004 | Runtime-specific adapters remain isolated by entrypoint. |
| OBSERVABILITY-INV-005 | Tenant/request context is immutable and explicit. |

## 10. Failure and outcome model

- Invalid field shape, prohibited data class, redaction failure, and sink failure return canonical outcomes under declared loss policy.

All representable failures use code-narrowable `Result<Data, Code>` outcomes. Internal causes and unsafe diagnostics are not public payloads.

## 11. Ingress and normalization

- Vendor metadata or browser error objects enter through target-specific ingress and normalize once.

Every applicable ingress path accepts `unknown`, parses once, applies declared byte/depth/count bounds, and emits canonical-only values.

## 12. Persistence and transaction model

- Injected sink capability only; the package owns no telemetry storage schema.
- Memory sink and production sinks must satisfy semantic contract where provided.

Persistence implementation must remain mechanism-only and must not encode bounded-context policy.

## 13. Events, integrations, and composition

- Target entrypoints compose vendor or console sinks without polluting the default capability.

No application, route, React, Next.js, presentation, or undeclared internal-path dependency is permitted.

## 14. Tenancy, privacy, and security

- Canonical redaction is mandatory before emission.
- Secrets, protected data, vendor payloads, and unsafe causes are negative-tested.

For C1, an approved threat model, SBOM, high-severity vulnerability gate, and negative-path security tests are mandatory before `VERIFIED`.

## 15. Non-functional requirements

- Emission has bounded record size and field count.
- Target entrypoints have bundle budgets.
- Sink failure behavior is explicit and must not recursively emit.

The final admission contract must record measurable complexity, input-size, throughput, bundle, compatibility, and controlled-latency budgets applicable to the package profile.

## 16. Conditional applicability resolution

| Trigger family | Proposed result | Reason |
| --- | --- | --- |
| Ingress | APPLICABLE | Package accepts unknown, serialized, vendor, alias-bearing, or configuration input. |
| Generated projections | NOT_APPLICABLE | No generated artifact in proposed topology. |
| Persistent-kernel storage | APPLICABLE | Persistence mode is INJECTED. |
| Multi-target isolation | APPLICABLE | Targets: node, edge, browser. |
| C1 threat model | NOT_APPLICABLE | Criticality is C2. |

`NOT_APPLICABLE` is valid only when the machine-readable requirement register evaluates the trigger as false.

## 17. Architecture tree

This topology contains only responsibilities triggered by this PRD. Empty, decorative, placeholder, or future-use directories are prohibited.

```text
packages/runtime/observability/
├── __tests__
│   ├── observability.adapter-parity.test.ts
│   ├── observability.entrypoints.test.ts
│   ├── observability.failure.test.ts
│   └── observability.redaction.test.ts
└── src
    ├── adapter-contract.ts
    ├── adapters
    │   └── memory-telemetry-sink.ts
    ├── browser.ts
    ├── capabilities
    │   ├── create.ts
    │   ├── emit.ts
    │   ├── propagate.ts
    │   └── redact.ts
    ├── contract
    │   ├── compatibility.ts
    │   ├── context.ts
    │   ├── privacy.ts
    │   ├── record.ts
    │   └── sink.ts
    ├── edge.ts
    ├── index.ts
    ├── ingress
    │   └── vendor-metadata.ts
    ├── node.ts
    ├── runtime
    │   ├── browser
    │   │   └── index.ts
    │   ├── edge
    │   │   └── index.ts
    │   └── node
    │       └── index.ts
    ├── store
    │   └── telemetry-sink.ts
    └── testing.ts
```

### 17.1 File responsibility register

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | target-neutral contract/capability facade |
| `src/node.ts` | Node runtime composition |
| `src/edge.ts` | edge runtime composition |
| `src/browser.ts` | browser runtime composition |
| `src/adapter-contract.ts` | sink contract facade |
| `src/testing.ts` | memory sink and fixtures |
| `src/contract/record.ts` | telemetry record |
| `src/contract/context.ts` | correlation context |
| `src/contract/privacy.ts` | privacy/redaction disposition |
| `src/contract/sink.ts` | sink capability |
| `src/contract/compatibility.ts` | target compatibility profile |
| `src/capabilities/create.ts` | record construction |
| `src/capabilities/redact.ts` | canonical redaction |
| `src/capabilities/emit.ts` | sink emission |
| `src/capabilities/propagate.ts` | context derivation |
| `src/ingress/vendor-metadata.ts` | vendor normalization |
| `src/store/telemetry-sink.ts` | narrow injected sink contract |
| `src/adapters/memory-telemetry-sink.ts` | semantic reference sink |
| `src/runtime/node/index.ts` | Node-only adapter composition |
| `src/runtime/edge/index.ts` | edge-only adapter composition |
| `src/runtime/browser/index.ts` | browser-only adapter composition |
| `__tests__/observability.redaction.test.ts` | data protection tests |
| `__tests__/observability.adapter-parity.test.ts` | sink equivalence |
| `__tests__/observability.entrypoints.test.ts` | target isolation |
| `__tests__/observability.failure.test.ts` | sink failure behavior |

### 17.2 Facade rules

- `src/index.ts` contains explicit named exports only and no logic or side effects.
- Auxiliary entrypoints expose only the registered isolation/composition surface.
- Raw clients, SQL objects, mutable adapter instances, storage implementations, and private registries are never exported through `.`.
- Cross-package consumers import `@afenda/observability` or a registered auxiliary entrypoint only.

## 18. Test and evidence contract

Required evidence families:

- `KRN-ID-*`
- `KRN-OWN-*`
- `KRN-CTR-*`
- `KRN-BND-*`
- `KRN-SEC-*`
- `KRN-QUA-*`
- `KRN-NFR-*`
- `KRN-REL-*`
- `KRN-DOC-*`
- `KRN-ING-*`
- `KRN-STO-*`

Minimum executable gates:

1. Inspector snapshot.
2. Registry parity and dependency-boundary gates.
3. Package lint and strict typecheck.
4. Behavior/contract tests for every exported capability.
5. Rejection tests for every ingress path.
6. Projection and adapter parity where applicable.
7. Consumer compile demonstration for every declared consumer.
8. Coverage threshold: 80% branch coverage.
9. Mutation testing where the C1 logic trigger applies.
10. Entrypoint isolation, budgets, compatibility, security, evidence-completeness, and digest calculation.

A skipped, timed-out, killed, resource-starved, or unrecorded applicable gate is failure.

## 19. Implementation slices

| Slice | Coherent outcome | Gate to advance |
| --- | --- | --- |
| OBSERVABILITY-1.0 | Freeze telemetry, privacy, and sink contracts. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| OBSERVABILITY-2.0 | Implement construction, context propagation, and redaction. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| OBSERVABILITY-3.0 | Implement memory sink and semantic tests. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| OBSERVABILITY-4.0 | Add isolated Node/edge/browser compositions and bundle gates. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| OBSERVABILITY-5.0 | Verify sink parity, security negatives, compatibility, and budgets. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |

Slices are sequential-gated, independently reviewable, and constrained to exact package/write boundaries. No later slice begins while an earlier slice is non-green.

## 20. Acceptance criteria and definition of done

The package is `IMPLEMENTED` only when:

- all exported behavior is real, tested, and derived from canonical definitions or admitted mechanism state;
- all applicable ownership, contract, ingress, projection, storage, and consumer checks pass;
- memory/fake and production adapter parity passes where multiple adapters exist;
- no placeholder runtime path, stub return, TODO behavior branch, or deferred deletion remains.

The package is `VERIFIED` only when one evidence-complete CI run proves all applicable mandatory requirements for one content digest, including security, budgets, compatibility, coverage, mutation where triggered, internal-refactor demonstration, and evidence completeness.

A seal may be issued only after verification and attests one package capability, commit, and content digest. It is not release, deployment, migration, or statutory approval.

## 21. Required admission records before production-source merge

1. Named owners and signatories.
2. Exact accepted production consumers.
3. Exact runtime targets and auxiliary-entrypoint isolation reasons.
4. Exact dependency edges in both `package.json` and the workspace-edge register.
5. Compatibility support windows.
6. Machine-resolved requirement applicability expressions.
7. Measurable non-functional budgets.
8. Four admission decisions recorded as PASS.

## 22. Rejected designs

- Generic `shared`, `common`, `utils`, `core`, `types`, `registry`, or umbrella kernel package.
- Wildcard exports or internal-path consumption.
- Mutable request/tenant/transaction/clock/adapter singleton.
- App/framework dependency.
- Manually synchronized projection.
- Business-policy ownership not stated in the admitted capability.
- A mutable `SEALED` lifecycle state.
- Treating partial, skipped, or undocumented evidence as success.


---

# @afenda/env — Product Requirements Document

| Field | Value |
| --- | --- |
| Document type | Individual kernel package PRD |
| Status | Draft for admission and implementation approval |
| Package | `@afenda/env` |
| Physical path | `packages/runtime/env` |
| Band | `runtime` |
| Kernel kind | `CLOSED` |
| Persistence mode | `NONE` |
| Criticality | `C2` |
| Governing authority | `packages/KERNEL-GOVERNANCE.md` |
| Capability owner | Package Owner role; named human must be recorded in the admission contract |
| Architecture owner | Architecture Owner role; named human must be recorded in the admission contract |
| Security owner | Not required by criticality unless a security trigger is activated |

> This PRD defines one package capability. It does not override the governance authority, workspace package register, frozen admission contract, workspace-edge register, or machine-readable requirement register.

---

## 1. Product/capability statement

**Admitted capability:** Configuration schema, parse, validation, and runtime-isolated environment loading.

**Problem.** Direct environment access spreads secrets, inconsistent defaults, runtime incompatibilities, and unvalidated configuration throughout the workspace.

## 2. Goals

- Define typed configuration schemas and parse raw values once.
- Separate public and secret configuration fields.
- Isolate Node, edge, browser, and tooling loaders.
- Prevent direct environment access outside registered consumers and entrypoints.

## 3. Explicit non-goals and non-ownership

- Secret storage service, feature flags, tenant settings, application business configuration, or deployment orchestration.

The package must not absorb unrelated shared helpers, bounded-context policy, application concerns, UI concerns, or a canonical cross-domain registry.

## 4. Consumers and jobs to be done

**Candidate production consumer classes** — exact package names must be frozen in the admission contract:

- Application composition roots
- Runtime/data-plane packages with registered edges
- Tooling that validates deployment configuration

Consumer jobs:

1. Import the registered entrypoint rather than an internal path.
2. Invoke a stable representation-safe capability.
3. Receive canonical values or `@afenda/errors` outcomes.
4. Replace internal implementation without production-consumer edits.

## 5. Admission decisions

| Decision | Required result | Package-specific interpretation |
| --- | --- | --- |
| Ownership | PASS | `@afenda/env` is the single owner of the admitted capability and nothing broader. |
| Policy neutrality | PASS | No organization-specific, workflow-specific, legal, tax, accounting, or domain disposition is encoded. |
| Jurisdiction portability | PASS | Facts may be represented; jurisdictional conclusions remain with bounded contexts or approved policy layers. |
| Reuse portability | PASS | Capability remains reusable by multiple registered consumers without app/framework coupling. |

## 6. Runtime and dependency contract

| Surface | Proposed admission value |
| --- | --- |
| Permitted runtime targets | `pure`, `node`, `edge`, `browser`, `tooling` |
| Default entrypoint | `.` |
| Auxiliary entrypoints | `./node`, `./edge`, `./browser`, `./tooling`, `./testing` |
| Proposed authorized dependency edges | `@afenda/errors` |

These values are implementation-ready proposals but become authoritative only when recorded in the workspace package register, admission contract, `package.json`, and workspace-edge register.

## 7. Canonical records and public types

- `ConfigSchema`
- `ConfigField`
- `ConfigVisibility`
- `ParsedConfig`
- `ConfigFailure`
- `RuntimeTarget`

Public types must be derived from these canonical definitions. Separately maintained unions, maps, validators, or registries are prohibited.

## 8. Functional operations

| No. | Required operation |
| ---: | --- |
| 01 | `defineConfig(schema)` validates a configuration contract. |
| 02 | `parseConfig(schema, rawMap)` parses unknown strings into typed values. |
| 03 | `publicConfig(config)` returns only browser-safe fields. |
| 04 | Target loaders collect raw runtime values and delegate to the pure parser. |

## 9. Normative package invariants

| Invariant ID | Requirement |
| --- | --- |
| ENV-INV-001 | Raw environment access exists only in registered target loaders. |
| ENV-INV-002 | Secrets never enter browser/public projections. |
| ENV-INV-003 | Defaults are explicit in schema and not hidden in consumers. |
| ENV-INV-004 | Unknown or invalid required fields fail startup. |
| ENV-INV-005 | No mutable process-global config singleton is exported. |

## 10. Failure and outcome model

- Missing, malformed, forbidden, duplicate, or target-incompatible fields return canonical failures.

All representable failures use code-narrowable `Result<Data, Code>` outcomes. Internal causes and unsafe diagnostics are not public payloads.

## 11. Ingress and normalization

- Raw maps are treated as unknown and size-bounded.
- Aliases are migration-only and never emitted in parsed config.

Every applicable ingress path accepts `unknown`, parses once, applies declared byte/depth/count bounds, and emits canonical-only values.

## 12. Persistence and transaction model

- Not applicable. Environment configuration is not tenant persistence.

Persistence implementation must remain mechanism-only and must not encode bounded-context policy.

## 13. Events, integrations, and composition

- Composition roots choose the target entrypoint and pass immutable parsed config to consumers.

No application, route, React, Next.js, presentation, or undeclared internal-path dependency is permitted.

## 14. Tenancy, privacy, and security

- Secret/public classification is machine-verified.
- Browser bundle checks prove secret loaders and names are absent.

For C1, an approved threat model, SBOM, high-severity vulnerability gate, and negative-path security tests are mandatory before `VERIFIED`.

## 15. Non-functional requirements

- Pure parsing is deterministic.
- Target entrypoints have bundle-size and forbidden-import gates.
- Startup parsing has bounded schema and value lengths.

The final admission contract must record measurable complexity, input-size, throughput, bundle, compatibility, and controlled-latency budgets applicable to the package profile.

## 16. Conditional applicability resolution

| Trigger family | Proposed result | Reason |
| --- | --- | --- |
| Ingress | APPLICABLE | Package accepts unknown, serialized, vendor, alias-bearing, or configuration input. |
| Generated projections | NOT_APPLICABLE | No generated artifact in proposed topology. |
| Persistent-kernel storage | NOT_APPLICABLE | Persistence mode is NONE. |
| Multi-target isolation | APPLICABLE | Targets: pure, node, edge, browser, tooling. |
| C1 threat model | NOT_APPLICABLE | Criticality is C2. |

`NOT_APPLICABLE` is valid only when the machine-readable requirement register evaluates the trigger as false.

## 17. Architecture tree

This topology contains only responsibilities triggered by this PRD. Empty, decorative, placeholder, or future-use directories are prohibited.

```text
packages/runtime/env/
├── __tests__
│   ├── env.contract.test.ts
│   ├── env.entrypoints.test.ts
│   ├── env.hostile-input.test.ts
│   └── env.secrets.test.ts
└── src
    ├── browser.ts
    ├── capabilities
    │   ├── define.ts
    │   ├── parse.ts
    │   └── project-public.ts
    ├── contract
    │   ├── compatibility.ts
    │   ├── field.ts
    │   ├── result.ts
    │   └── schema.ts
    ├── edge.ts
    ├── index.ts
    ├── ingress
    │   └── raw-map.ts
    ├── node.ts
    ├── runtime
    │   ├── browser
    │   │   └── load.ts
    │   ├── edge
    │   │   └── load.ts
    │   ├── node
    │   │   └── load.ts
    │   └── tooling
    │       └── load.ts
    ├── testing.ts
    └── tooling.ts
```

### 17.1 File responsibility register

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | pure schema/parser facade |
| `src/node.ts` | Node loader facade |
| `src/edge.ts` | edge loader facade |
| `src/browser.ts` | browser-safe loader facade |
| `src/tooling.ts` | tooling loader facade |
| `src/testing.ts` | raw-map fixtures |
| `src/contract/schema.ts` | configuration schema |
| `src/contract/field.ts` | field and visibility contracts |
| `src/contract/result.ts` | parsed config shape |
| `src/contract/compatibility.ts` | runtime compatibility profile |
| `src/capabilities/define.ts` | schema validation |
| `src/capabilities/parse.ts` | pure parser |
| `src/capabilities/project-public.ts` | secret-safe projection |
| `src/ingress/raw-map.ts` | unknown raw input boundary |
| `src/runtime/node/load.ts` | process environment loader |
| `src/runtime/edge/load.ts` | edge environment loader |
| `src/runtime/browser/load.ts` | public environment loader |
| `src/runtime/tooling/load.ts` | tooling loader |
| `__tests__/env.contract.test.ts` | schema/parser contracts |
| `__tests__/env.secrets.test.ts` | secret isolation |
| `__tests__/env.entrypoints.test.ts` | runtime isolation |
| `__tests__/env.hostile-input.test.ts` | bounded parsing |

### 17.2 Facade rules

- `src/index.ts` contains explicit named exports only and no logic or side effects.
- Auxiliary entrypoints expose only the registered isolation/composition surface.
- Raw clients, SQL objects, mutable adapter instances, storage implementations, and private registries are never exported through `.`.
- Cross-package consumers import `@afenda/env` or a registered auxiliary entrypoint only.

## 18. Test and evidence contract

Required evidence families:

- `KRN-ID-*`
- `KRN-OWN-*`
- `KRN-CTR-*`
- `KRN-BND-*`
- `KRN-SEC-*`
- `KRN-QUA-*`
- `KRN-NFR-*`
- `KRN-REL-*`
- `KRN-DOC-*`
- `KRN-ING-*`

Minimum executable gates:

1. Inspector snapshot.
2. Registry parity and dependency-boundary gates.
3. Package lint and strict typecheck.
4. Behavior/contract tests for every exported capability.
5. Rejection tests for every ingress path.
6. Projection and adapter parity where applicable.
7. Consumer compile demonstration for every declared consumer.
8. Coverage threshold: 80% branch coverage.
9. Mutation testing where the C1 logic trigger applies.
10. Entrypoint isolation, budgets, compatibility, security, evidence-completeness, and digest calculation.

A skipped, timed-out, killed, resource-starved, or unrecorded applicable gate is failure.

## 19. Implementation slices

| Slice | Coherent outcome | Gate to advance |
| --- | --- | --- |
| ENV-1.0 | Freeze schema vocabulary, visibility rules, and runtime targets. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| ENV-2.0 | Implement pure schema definition and parser. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| ENV-3.0 | Implement public projection and secret isolation tests. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| ENV-4.0 | Implement isolated runtime loaders. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| ENV-5.0 | Complete bundle, compatibility, hostile-input, and consumer checks. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |

Slices are sequential-gated, independently reviewable, and constrained to exact package/write boundaries. No later slice begins while an earlier slice is non-green.

## 20. Acceptance criteria and definition of done

The package is `IMPLEMENTED` only when:

- all exported behavior is real, tested, and derived from canonical definitions or admitted mechanism state;
- all applicable ownership, contract, ingress, projection, storage, and consumer checks pass;
- memory/fake and production adapter parity passes where multiple adapters exist;
- no placeholder runtime path, stub return, TODO behavior branch, or deferred deletion remains.

The package is `VERIFIED` only when one evidence-complete CI run proves all applicable mandatory requirements for one content digest, including security, budgets, compatibility, coverage, mutation where triggered, internal-refactor demonstration, and evidence completeness.

A seal may be issued only after verification and attests one package capability, commit, and content digest. It is not release, deployment, migration, or statutory approval.

## 21. Required admission records before production-source merge

1. Named owners and signatories.
2. Exact accepted production consumers.
3. Exact runtime targets and auxiliary-entrypoint isolation reasons.
4. Exact dependency edges in both `package.json` and the workspace-edge register.
5. Compatibility support windows.
6. Machine-resolved requirement applicability expressions.
7. Measurable non-functional budgets.
8. Four admission decisions recorded as PASS.

## 22. Rejected designs

- Generic `shared`, `common`, `utils`, `core`, `types`, `registry`, or umbrella kernel package.
- Wildcard exports or internal-path consumption.
- Mutable request/tenant/transaction/clock/adapter singleton.
- App/framework dependency.
- Manually synchronized projection.
- Business-policy ownership not stated in the admitted capability.
- A mutable `SEALED` lifecycle state.
- Treating partial, skipped, or undocumented evidence as success.


---

# @afenda/db — Product Requirements Document

| Field | Value |
| --- | --- |
| Document type | Individual kernel package PRD |
| Status | Draft for admission and implementation approval |
| Package | `@afenda/db` |
| Physical path | `packages/data-plane/db` |
| Band | `data-plane` |
| Kernel kind | `CLOSED` |
| Persistence mode | `OWNED` |
| Criticality | `C1` |
| Governing authority | `packages/KERNEL-GOVERNANCE.md` |
| Capability owner | Package Owner role; named human must be recorded in the admission contract |
| Architecture owner | Architecture Owner role; named human must be recorded in the admission contract |
| Security owner | Required for C1 admission, verification, and seal |

> This PRD defines one package capability. It does not override the governance authority, workspace package register, frozen admission contract, workspace-edge register, or machine-readable requirement register.

---

## 1. Product/capability statement

**Admitted capability:** Database schema authority, connectivity, transaction capabilities, and RLS session binding.

**Problem.** Multiple schema owners, raw client leakage, ad hoc transactions, and client-controlled tenant predicates destroy persistence correctness and auditability.

## 2. Goals

- Own the workspace database schema and migration authority.
- Expose narrow transaction-safe capabilities rather than raw clients.
- Bind trusted execution context to RLS sessions server-side.
- Verify schema ownership, migration integrity, and consumer boundaries.

## 3. Explicit non-goals and non-ownership

- Business repository policy, domain command behavior, cross-domain transaction orchestration, analytics warehouse, or application query design.

The package must not absorb unrelated shared helpers, bounded-context policy, application concerns, UI concerns, or a canonical cross-domain registry.

## 4. Consumers and jobs to be done

**Candidate production consumer classes** — exact package names must be frozen in the admission contract:

- OWNED persistence kernel packages
- ERP Drizzle adapters through registered capabilities
- Application composition and migration tooling

Consumer jobs:

1. Import the registered entrypoint rather than an internal path.
2. Invoke a stable representation-safe capability.
3. Receive canonical values or `@afenda/errors` outcomes.
4. Replace internal implementation without production-consumer edits.

## 5. Admission decisions

| Decision | Required result | Package-specific interpretation |
| --- | --- | --- |
| Ownership | PASS | `@afenda/db` is the single owner of the admitted capability and nothing broader. |
| Policy neutrality | PASS | No organization-specific, workflow-specific, legal, tax, accounting, or domain disposition is encoded. |
| Jurisdiction portability | PASS | Facts may be represented; jurisdictional conclusions remain with bounded contexts or approved policy layers. |
| Reuse portability | PASS | Capability remains reusable by multiple registered consumers without app/framework coupling. |

## 6. Runtime and dependency contract

| Surface | Proposed admission value |
| --- | --- |
| Permitted runtime targets | `node`, `tooling` |
| Default entrypoint | `.` |
| Auxiliary entrypoints | `./node`, `./tooling`, `./testing`, `./adapter-contract` |
| Proposed authorized dependency edges | `@afenda/errors`, `@afenda/tenancy`, `@afenda/env` |

These values are implementation-ready proposals but become authoritative only when recorded in the workspace package register, admission contract, `package.json`, and workspace-edge register.

## 7. Canonical records and public types

- `DatabaseCapability`
- `TransactionCapability`
- `TransactionContext`
- `RlsSessionBinding`
- `SchemaOwnershipRecord`
- `MigrationRecord`
- `DatabaseFailure`

Public types must be derived from these canonical definitions. Separately maintained unions, maps, validators, or registries are prohibited.

## 8. Functional operations

| No. | Required operation |
| ---: | --- |
| 01 | `withTransaction(context, fn)` executes through a narrow transaction capability. |
| 02 | `bindRlsSession(transaction, executionContext)` sets trusted tenant/actor session state. |
| 03 | `connect(config)` is exposed only through the Node composition entrypoint. |
| 04 | Tooling validates schema ownership, migration order, and generated schema indexes. |

## 9. Normative package invariants

| Invariant ID | Requirement |
| --- | --- |
| DB-INV-001 | `@afenda/db` is the sole database schema and migration authority. |
| DB-INV-002 | Raw SQL/client objects are not exported from the default business capability. |
| DB-INV-003 | Tenant context is server-bound before tenant-scoped access. |
| DB-INV-004 | A failed transaction leaves no partial write. |
| DB-INV-005 | Every table has exactly one registered owner and scope classification. |

## 10. Failure and outcome model

- Connection, transaction, constraint, migration, RLS binding, and ownership violations normalize to canonical failures.

All representable failures use code-narrowable `Result<Data, Code>` outcomes. Internal causes and unsafe diagnostics are not public payloads.

## 11. Ingress and normalization

- Database configuration enters through `@afenda/env` target composition.
- Migration/tooling inputs are bounded and checksum-verified.

Every applicable ingress path accepts `unknown`, parses once, applies declared byte/depth/count bounds, and emits canonical-only values.

## 12. Persistence and transaction model

- OWNED: schemas, migrations, connectivity adapters, transaction implementation, and RLS binding mechanism.
- Domain-specific store policies remain in owning packages.

Persistence implementation must remain mechanism-only and must not encode bounded-context policy.

## 13. Events, integrations, and composition

- Provides transaction capabilities to audit, outbox, numbering, and ERP adapters via registered edges.

No application, route, React, Next.js, presentation, or undeclared internal-path dependency is permitted.

## 14. Tenancy, privacy, and security

- RLS binding and tenant isolation carry mandatory negative-path tests.
- Credentials and connection diagnostics never reach public projections.
- C1 threat model and SBOM are mandatory.

For C1, an approved threat model, SBOM, high-severity vulnerability gate, and negative-path security tests are mandatory before `VERIFIED`.

## 15. Non-functional requirements

- Transaction and pool budgets are declared per runtime target.
- Migration verification is deterministic.
- Node/tooling bundles remain isolated from browser/edge targets.

The final admission contract must record measurable complexity, input-size, throughput, bundle, compatibility, and controlled-latency budgets applicable to the package profile.

## 16. Conditional applicability resolution

| Trigger family | Proposed result | Reason |
| --- | --- | --- |
| Ingress | APPLICABLE | Package accepts unknown, serialized, vendor, alias-bearing, or configuration input. |
| Generated projections | APPLICABLE | Generated/static projection files exist. |
| Persistent-kernel storage | APPLICABLE | Persistence mode is OWNED. |
| Multi-target isolation | APPLICABLE | Targets: node, tooling. |
| C1 threat model | APPLICABLE | Criticality is C1. |

`NOT_APPLICABLE` is valid only when the machine-readable requirement register evaluates the trigger as false.

## 17. Architecture tree

This topology contains only responsibilities triggered by this PRD. Empty, decorative, placeholder, or future-use directories are prohibited.

```text
packages/data-plane/db/
├── __tests__
│   ├── db.entrypoints.test.ts
│   ├── db.rls-negative.test.ts
│   ├── db.schema-parity.test.ts
│   └── db.transaction.test.ts
├── scripts
│   ├── verify-migrations.mts
│   └── verify-schema-ownership.mts
└── src
    ├── adapter-contract.ts
    ├── adapters
    │   └── postgres
    │       ├── connection.ts
    │       ├── rls-session.ts
    │       └── transaction.ts
    ├── capabilities
    │   ├── bind-rls-session.ts
    │   ├── health.ts
    │   └── with-transaction.ts
    ├── contract
    │   ├── compatibility.ts
    │   ├── migration.ts
    │   ├── rls-session.ts
    │   ├── schema-ownership.ts
    │   └── transaction.ts
    ├── generated
    │   └── schema-index.ts
    ├── index.ts
    ├── ingress
    │   └── database-config.ts
    ├── node.ts
    ├── runtime
    │   ├── node
    │   │   └── index.ts
    │   └── tooling
    │       └── index.ts
    ├── store
    │   └── schema-registry.ts
    ├── testing.ts
    └── tooling.ts
```

### 17.1 File responsibility register

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | narrow database capability facade |
| `src/node.ts` | Node connectivity composition |
| `src/tooling.ts` | migration/schema tooling facade |
| `src/testing.ts` | transaction fixtures and test harness |
| `src/adapter-contract.ts` | composition-safe transaction contracts |
| `src/contract/transaction.ts` | transaction capability |
| `src/contract/rls-session.ts` | trusted RLS binding |
| `src/contract/schema-ownership.ts` | table ownership metadata |
| `src/contract/migration.ts` | migration metadata |
| `src/contract/compatibility.ts` | stored-data/runtime profile |
| `src/capabilities/with-transaction.ts` | transaction orchestration |
| `src/capabilities/bind-rls-session.ts` | server-side context binding |
| `src/capabilities/health.ts` | safe health projection |
| `src/ingress/database-config.ts` | validated config boundary |
| `src/store/schema-registry.ts` | owned schema authority contract |
| `src/adapters/postgres/connection.ts` | Postgres connectivity |
| `src/adapters/postgres/transaction.ts` | transaction implementation |
| `src/adapters/postgres/rls-session.ts` | RLS session implementation |
| `src/generated/schema-index.ts` | deterministic schema projection |
| `src/runtime/node/index.ts` | Node runtime composition |
| `src/runtime/tooling/index.ts` | tooling composition |
| `scripts/verify-schema-ownership.mts` | ownership gate |
| `scripts/verify-migrations.mts` | migration integrity gate |
| `__tests__/db.transaction.test.ts` | atomicity tests |
| `__tests__/db.rls-negative.test.ts` | tenant security tests |
| `__tests__/db.schema-parity.test.ts` | schema projection parity |
| `__tests__/db.entrypoints.test.ts` | target isolation |

### 17.2 Facade rules

- `src/index.ts` contains explicit named exports only and no logic or side effects.
- Auxiliary entrypoints expose only the registered isolation/composition surface.
- Raw clients, SQL objects, mutable adapter instances, storage implementations, and private registries are never exported through `.`.
- Cross-package consumers import `@afenda/db` or a registered auxiliary entrypoint only.

## 18. Test and evidence contract

Required evidence families:

- `KRN-ID-*`
- `KRN-OWN-*`
- `KRN-CTR-*`
- `KRN-BND-*`
- `KRN-SEC-*`
- `KRN-QUA-*`
- `KRN-NFR-*`
- `KRN-REL-*`
- `KRN-DOC-*`
- `KRN-ING-*`
- `KRN-PRJ-*`
- `KRN-STO-*`

Minimum executable gates:

1. Inspector snapshot.
2. Registry parity and dependency-boundary gates.
3. Package lint and strict typecheck.
4. Behavior/contract tests for every exported capability.
5. Rejection tests for every ingress path.
6. Projection and adapter parity where applicable.
7. Consumer compile demonstration for every declared consumer.
8. Coverage threshold: 90% branch coverage.
9. Mutation testing where the C1 logic trigger applies.
10. Entrypoint isolation, budgets, compatibility, security, evidence-completeness, and digest calculation.

A skipped, timed-out, killed, resource-starved, or unrecorded applicable gate is failure.

## 19. Implementation slices

| Slice | Coherent outcome | Gate to advance |
| --- | --- | --- |
| DB-1.0 | Freeze schema authority, table ownership, and transaction contracts. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| DB-2.0 | Implement connection and transaction capability without raw-client facade leakage. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| DB-3.0 | Implement trusted RLS session binding and negative tests. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| DB-4.0 | Implement deterministic schema/migration tooling and projections. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| DB-5.0 | Complete integration, threat model, compatibility, budget, and seal evidence. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |

Slices are sequential-gated, independently reviewable, and constrained to exact package/write boundaries. No later slice begins while an earlier slice is non-green.

## 20. Acceptance criteria and definition of done

The package is `IMPLEMENTED` only when:

- all exported behavior is real, tested, and derived from canonical definitions or admitted mechanism state;
- all applicable ownership, contract, ingress, projection, storage, and consumer checks pass;
- memory/fake and production adapter parity passes where multiple adapters exist;
- no placeholder runtime path, stub return, TODO behavior branch, or deferred deletion remains.

The package is `VERIFIED` only when one evidence-complete CI run proves all applicable mandatory requirements for one content digest, including security, budgets, compatibility, coverage, mutation where triggered, internal-refactor demonstration, and evidence completeness.

A seal may be issued only after verification and attests one package capability, commit, and content digest. It is not release, deployment, migration, or statutory approval.

## 21. Required admission records before production-source merge

1. Named owners and signatories.
2. Exact accepted production consumers.
3. Exact runtime targets and auxiliary-entrypoint isolation reasons.
4. Exact dependency edges in both `package.json` and the workspace-edge register.
5. Compatibility support windows.
6. Machine-resolved requirement applicability expressions.
7. Measurable non-functional budgets.
8. Four admission decisions recorded as PASS.

## 22. Rejected designs

- Generic `shared`, `common`, `utils`, `core`, `types`, `registry`, or umbrella kernel package.
- Wildcard exports or internal-path consumption.
- Mutable request/tenant/transaction/clock/adapter singleton.
- App/framework dependency.
- Manually synchronized projection.
- Business-policy ownership not stated in the admitted capability.
- A mutable `SEALED` lifecycle state.
- Treating partial, skipped, or undocumented evidence as success.


---

# @afenda/outbox — Product Requirements Document

| Field | Value |
| --- | --- |
| Document type | Individual kernel package PRD |
| Status | Draft for admission and implementation approval |
| Package | `@afenda/outbox` |
| Physical path | `packages/data-plane/outbox` |
| Band | `data-plane` |
| Kernel kind | `CLOSED` |
| Persistence mode | `OWNED` |
| Criticality | `C1` |
| Governing authority | `packages/KERNEL-GOVERNANCE.md` |
| Capability owner | Package Owner role; named human must be recorded in the admission contract |
| Architecture owner | Architecture Owner role; named human must be recorded in the admission contract |
| Security owner | Required for C1 admission, verification, and seal |

> This PRD defines one package capability. It does not override the governance authority, workspace package register, frozen admission contract, workspace-edge register, or machine-readable requirement register.

---

## 1. Product/capability statement

**Admitted capability:** Transactional outbox persistence, claim, publication coordination, and idempotent delivery state.

**Problem.** Publishing events outside the originating transaction loses messages or duplicates delivery when database commits and broker calls fail independently.

## 2. Goals

- Append outbox records within the caller transaction.
- Coordinate claim, publication, retry, expiry, and idempotent completion.
- Keep transport details outside canonical persistence semantics.
- Preserve tenant scope and event wire compatibility.

## 3. Explicit non-goals and non-ownership

- Owning business event definitions, broker SDKs in the default facade, subscriber policy, workflow orchestration, or generic job queues.

The package must not absorb unrelated shared helpers, bounded-context policy, application concerns, UI concerns, or a canonical cross-domain registry.

## 4. Consumers and jobs to be done

**Candidate production consumer classes** — exact package names must be frozen in the admission contract:

- ERP command adapters
- Event publisher workers
- Read-model and integration pipelines

Consumer jobs:

1. Import the registered entrypoint rather than an internal path.
2. Invoke a stable representation-safe capability.
3. Receive canonical values or `@afenda/errors` outcomes.
4. Replace internal implementation without production-consumer edits.

## 5. Admission decisions

| Decision | Required result | Package-specific interpretation |
| --- | --- | --- |
| Ownership | PASS | `@afenda/outbox` is the single owner of the admitted capability and nothing broader. |
| Policy neutrality | PASS | No organization-specific, workflow-specific, legal, tax, accounting, or domain disposition is encoded. |
| Jurisdiction portability | PASS | Facts may be represented; jurisdictional conclusions remain with bounded contexts or approved policy layers. |
| Reuse portability | PASS | Capability remains reusable by multiple registered consumers without app/framework coupling. |

## 6. Runtime and dependency contract

| Surface | Proposed admission value |
| --- | --- |
| Permitted runtime targets | `node` |
| Default entrypoint | `.` |
| Auxiliary entrypoints | `./adapter-contract`, `./testing` |
| Proposed authorized dependency edges | `@afenda/errors`, `@afenda/ids`, `@afenda/temporal`, `@afenda/tenancy`, `@afenda/events`, `@afenda/db` |

These values are implementation-ready proposals but become authoritative only when recorded in the workspace package register, admission contract, `package.json`, and workspace-edge register.

## 7. Canonical records and public types

- `OutboxRecord`
- `OutboxMessageId`
- `OutboxStatus`
- `PublicationClaim`
- `DeliveryAttempt`
- `PublicationOutcome`

Public types must be derived from these canonical definitions. Separately maintained unions, maps, validators, or registries are prohibited.

## 8. Functional operations

| No. | Required operation |
| ---: | --- |
| 01 | `append(transaction, event)` persists the canonical serialized event atomically. |
| 02 | `claimBatch(context, limits)` claims eligible records. |
| 03 | `markPublished(claim, receipt)` records idempotent success. |
| 04 | `markFailed(claim, failure, retryAt)` records bounded retry state. |
| 05 | `releaseExpired(now)` recovers abandoned claims. |

## 9. Normative package invariants

| Invariant ID | Requirement |
| --- | --- |
| OUTBOX-INV-001 | Append occurs in the same transaction as the originating state change. |
| OUTBOX-INV-002 | Only the active claim token may update a record. |
| OUTBOX-INV-003 | Published state is terminal and idempotent. |
| OUTBOX-INV-004 | Every tenant-scoped row has non-null organization_id. |
| OUTBOX-INV-005 | Transport publication happens outside the database transaction but completion is durably recorded. |

## 10. Failure and outcome model

- Duplicate append, claim conflict, stale token, serialization incompatibility, store failure, and retry exhaustion return canonical failures.

All representable failures use code-narrowable `Result<Data, Code>` outcomes. Internal causes and unsafe diagnostics are not public payloads.

## 11. Ingress and normalization

- Only canonical serialized events are accepted; external broker payloads are not outbox ingress.

Every applicable ingress path accepts `unknown`, parses once, applies declared byte/depth/count bounds, and emits canonical-only values.

## 12. Persistence and transaction model

- OWNED outbox schema, indexes, claim queries, transaction-safe append adapter, and delivery-state transitions.

Persistence implementation must remain mechanism-only and must not encode bounded-context policy.

## 13. Events, integrations, and composition

- Consumes `@afenda/events` wire envelope and `@afenda/db` transaction capability.
- Publisher adapters remain composition-owned.

No application, route, React, Next.js, presentation, or undeclared internal-path dependency is permitted.

## 14. Tenancy, privacy, and security

- Organization scope is server-bound.
- Event payload and diagnostics are checked for public-safe serialization.
- Claim APIs resist cross-tenant access.

For C1, an approved threat model, SBOM, high-severity vulnerability gate, and negative-path security tests are mandatory before `VERIFIED`.

## 15. Non-functional requirements

- Claim batches, lease duration, retry count, and payload bytes are explicitly bounded.
- Concurrency and crash-recovery tests are mandatory.
- Stored-data and wire compatibility fixtures are required.

The final admission contract must record measurable complexity, input-size, throughput, bundle, compatibility, and controlled-latency budgets applicable to the package profile.

## 16. Conditional applicability resolution

| Trigger family | Proposed result | Reason |
| --- | --- | --- |
| Ingress | APPLICABLE | Package accepts unknown, serialized, vendor, alias-bearing, or configuration input. |
| Generated projections | NOT_APPLICABLE | No generated artifact in proposed topology. |
| Persistent-kernel storage | APPLICABLE | Persistence mode is OWNED. |
| Multi-target isolation | NOT_APPLICABLE | Targets: node. |
| C1 threat model | APPLICABLE | Criticality is C1. |

`NOT_APPLICABLE` is valid only when the machine-readable requirement register evaluates the trigger as false.

## 17. Architecture tree

This topology contains only responsibilities triggered by this PRD. Empty, decorative, placeholder, or future-use directories are prohibited.

```text
packages/data-plane/outbox/
├── __tests__
│   ├── outbox.adapter-parity.test.ts
│   ├── outbox.atomicity.test.ts
│   ├── outbox.concurrency.test.ts
│   ├── outbox.recovery.test.ts
│   └── outbox.tenant-boundary.test.ts
└── src
    ├── adapter-contract.ts
    ├── adapters
    │   ├── drizzle
    │   │   └── outbox-store.ts
    │   └── memory
    │       └── outbox-store.ts
    ├── capabilities
    │   ├── append.ts
    │   ├── claim.ts
    │   ├── complete.ts
    │   ├── fail.ts
    │   └── recover.ts
    ├── contract
    │   ├── claim.ts
    │   ├── compatibility.ts
    │   ├── outcome.ts
    │   ├── record.ts
    │   └── status.ts
    ├── index.ts
    ├── internal
    │   └── state-machine.ts
    ├── store
    │   └── outbox-store.ts
    └── testing.ts
```

### 17.1 File responsibility register

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | outbox capability facade |
| `src/adapter-contract.ts` | publisher/store composition contracts |
| `src/testing.ts` | memory fixtures and deterministic clock |
| `src/contract/record.ts` | outbox record |
| `src/contract/status.ts` | delivery state machine |
| `src/contract/claim.ts` | claim token/lease |
| `src/contract/outcome.ts` | publication outcome |
| `src/contract/compatibility.ts` | wire/stored-data profile |
| `src/capabilities/append.ts` | transactional append |
| `src/capabilities/claim.ts` | batch claim |
| `src/capabilities/complete.ts` | published completion |
| `src/capabilities/fail.ts` | retry/failure transition |
| `src/capabilities/recover.ts` | expired claim recovery |
| `src/store/outbox-store.ts` | narrow owned store contract |
| `src/adapters/drizzle/outbox-store.ts` | transaction-safe production adapter |
| `src/adapters/memory/outbox-store.ts` | semantic reference adapter |
| `src/internal/state-machine.ts` | delivery transitions |
| `__tests__/outbox.atomicity.test.ts` | same-transaction append |
| `__tests__/outbox.concurrency.test.ts` | claim races |
| `__tests__/outbox.adapter-parity.test.ts` | memory/production parity |
| `__tests__/outbox.recovery.test.ts` | crash/expiry behavior |
| `__tests__/outbox.tenant-boundary.test.ts` | negative tenancy tests |

### 17.2 Facade rules

- `src/index.ts` contains explicit named exports only and no logic or side effects.
- Auxiliary entrypoints expose only the registered isolation/composition surface.
- Raw clients, SQL objects, mutable adapter instances, storage implementations, and private registries are never exported through `.`.
- Cross-package consumers import `@afenda/outbox` or a registered auxiliary entrypoint only.

## 18. Test and evidence contract

Required evidence families:

- `KRN-ID-*`
- `KRN-OWN-*`
- `KRN-CTR-*`
- `KRN-BND-*`
- `KRN-SEC-*`
- `KRN-QUA-*`
- `KRN-NFR-*`
- `KRN-REL-*`
- `KRN-DOC-*`
- `KRN-ING-*`
- `KRN-STO-*`

Minimum executable gates:

1. Inspector snapshot.
2. Registry parity and dependency-boundary gates.
3. Package lint and strict typecheck.
4. Behavior/contract tests for every exported capability.
5. Rejection tests for every ingress path.
6. Projection and adapter parity where applicable.
7. Consumer compile demonstration for every declared consumer.
8. Coverage threshold: 90% branch coverage.
9. Mutation testing where the C1 logic trigger applies.
10. Entrypoint isolation, budgets, compatibility, security, evidence-completeness, and digest calculation.

A skipped, timed-out, killed, resource-starved, or unrecorded applicable gate is failure.

## 19. Implementation slices

| Slice | Coherent outcome | Gate to advance |
| --- | --- | --- |
| OUTBOX-1.0 | Freeze record, state machine, transaction, and compatibility contracts. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| OUTBOX-2.0 | Implement memory reference store and transition behavior. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| OUTBOX-3.0 | Implement Drizzle schema and transaction-safe append. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| OUTBOX-4.0 | Implement claim, publish completion, retry, and recovery with concurrency tests. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| OUTBOX-5.0 | Complete adapter parity, threat model, migration, budget, and seal evidence. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |

Slices are sequential-gated, independently reviewable, and constrained to exact package/write boundaries. No later slice begins while an earlier slice is non-green.

## 20. Acceptance criteria and definition of done

The package is `IMPLEMENTED` only when:

- all exported behavior is real, tested, and derived from canonical definitions or admitted mechanism state;
- all applicable ownership, contract, ingress, projection, storage, and consumer checks pass;
- memory/fake and production adapter parity passes where multiple adapters exist;
- no placeholder runtime path, stub return, TODO behavior branch, or deferred deletion remains.

The package is `VERIFIED` only when one evidence-complete CI run proves all applicable mandatory requirements for one content digest, including security, budgets, compatibility, coverage, mutation where triggered, internal-refactor demonstration, and evidence completeness.

A seal may be issued only after verification and attests one package capability, commit, and content digest. It is not release, deployment, migration, or statutory approval.

## 21. Required admission records before production-source merge

1. Named owners and signatories.
2. Exact accepted production consumers.
3. Exact runtime targets and auxiliary-entrypoint isolation reasons.
4. Exact dependency edges in both `package.json` and the workspace-edge register.
5. Compatibility support windows.
6. Machine-resolved requirement applicability expressions.
7. Measurable non-functional budgets.
8. Four admission decisions recorded as PASS.

## 22. Rejected designs

- Generic `shared`, `common`, `utils`, `core`, `types`, `registry`, or umbrella kernel package.
- Wildcard exports or internal-path consumption.
- Mutable request/tenant/transaction/clock/adapter singleton.
- App/framework dependency.
- Manually synchronized projection.
- Business-policy ownership not stated in the admitted capability.
- A mutable `SEALED` lifecycle state.
- Treating partial, skipped, or undocumented evidence as success.


---

# @afenda/audit — Product Requirements Document

| Field | Value |
| --- | --- |
| Document type | Individual kernel package PRD |
| Status | Draft for admission and implementation approval |
| Package | `@afenda/audit` |
| Physical path | `packages/data-plane/audit` |
| Band | `data-plane` |
| Kernel kind | `CLOSED` |
| Persistence mode | `OWNED` |
| Criticality | `C1` |
| Governing authority | `packages/KERNEL-GOVERNANCE.md` |
| Capability owner | Package Owner role; named human must be recorded in the admission contract |
| Architecture owner | Architecture Owner role; named human must be recorded in the admission contract |
| Security owner | Required for C1 admission, verification, and seal |

> This PRD defines one package capability. It does not override the governance authority, workspace package register, frozen admission contract, workspace-edge register, or machine-readable requirement register.

---

## 1. Product/capability statement

**Admitted capability:** Append-only audit fact contract and transaction-safe append mechanism.

**Problem.** Audit evidence is unreliable when facts are mutable, emitted after commit, mixed with operational logs, or omit trusted actor and tenant context.

## 2. Goals

- Define an immutable append-only audit fact.
- Append audit facts inside the caller transaction.
- Capture trusted actor, organization, correlation, subject, and action facts.
- Prevent audit data from becoming a mutable business workflow.

## 3. Explicit non-goals and non-ownership

- Operational logging, analytics, audit-case management, approval workflow, compliance conclusions, or cross-domain read-model ownership.

The package must not absorb unrelated shared helpers, bounded-context policy, application concerns, UI concerns, or a canonical cross-domain registry.

## 4. Consumers and jobs to be done

**Candidate production consumer classes** — exact package names must be frozen in the admission contract:

- C1 ERP command adapters
- Security and administration operations
- Application composition requiring immutable accountability facts

Consumer jobs:

1. Import the registered entrypoint rather than an internal path.
2. Invoke a stable representation-safe capability.
3. Receive canonical values or `@afenda/errors` outcomes.
4. Replace internal implementation without production-consumer edits.

## 5. Admission decisions

| Decision | Required result | Package-specific interpretation |
| --- | --- | --- |
| Ownership | PASS | `@afenda/audit` is the single owner of the admitted capability and nothing broader. |
| Policy neutrality | PASS | No organization-specific, workflow-specific, legal, tax, accounting, or domain disposition is encoded. |
| Jurisdiction portability | PASS | Facts may be represented; jurisdictional conclusions remain with bounded contexts or approved policy layers. |
| Reuse portability | PASS | Capability remains reusable by multiple registered consumers without app/framework coupling. |

## 6. Runtime and dependency contract

| Surface | Proposed admission value |
| --- | --- |
| Permitted runtime targets | `node` |
| Default entrypoint | `.` |
| Auxiliary entrypoints | `./adapter-contract`, `./testing` |
| Proposed authorized dependency edges | `@afenda/errors`, `@afenda/ids`, `@afenda/temporal`, `@afenda/tenancy`, `@afenda/db` |

These values are implementation-ready proposals but become authoritative only when recorded in the workspace package register, admission contract, `package.json`, and workspace-edge register.

## 7. Canonical records and public types

- `AuditFact`
- `AuditFactId`
- `AuditAction`
- `AuditSubject`
- `ActorSnapshot`
- `AuditMetadata`
- `AuditAppendRequest`

Public types must be derived from these canonical definitions. Separately maintained unions, maps, validators, or registries are prohibited.

## 8. Functional operations

| No. | Required operation |
| ---: | --- |
| 01 | `createAuditFact(input, context, clock)` validates a canonical immutable fact. |
| 02 | `appendAuditFact(transaction, fact, store)` appends inside the active transaction. |
| 03 | `publicAuditProjection(fact)` returns a privacy-safe representation where permitted. |

## 9. Normative package invariants

| Invariant ID | Requirement |
| --- | --- |
| AUDIT-INV-001 | Facts are append-only and never updated or deleted through package capability. |
| AUDIT-INV-002 | Audit append shares the transaction of the governed mutation. |
| AUDIT-INV-003 | Actor and organization come from trusted context. |
| AUDIT-INV-004 | Facts record what occurred, not legal/compliance conclusions. |
| AUDIT-INV-005 | Operational telemetry cannot substitute for audit. |

## 10. Failure and outcome model

- Invalid subject/action, missing trusted context, duplicate fact id, transaction mismatch, and append failure return canonical failures.

All representable failures use code-narrowable `Result<Data, Code>` outcomes. Internal causes and unsafe diagnostics are not public payloads.

## 11. Ingress and normalization

- Audit facts are constructed from trusted internal inputs; imported legacy facts require a separately registered bounded ingress path.

Every applicable ingress path accepts `unknown`, parses once, applies declared byte/depth/count bounds, and emits canonical-only values.

## 12. Persistence and transaction model

- OWNED append-only table/indexes and transaction-safe append adapter.
- Read models and retention/export policy remain outside this capability.

Persistence implementation must remain mechanism-only and must not encode bounded-context policy.

## 13. Events, integrations, and composition

- Uses database transaction capability and trusted tenancy context.
- Consumers may project audit views through bounded-context read models.

No application, route, React, Next.js, presentation, or undeclared internal-path dependency is permitted.

## 14. Tenancy, privacy, and security

- Protected fields are classified and minimized.
- No secret, unsafe cause, or full vendor payload enters a fact.
- Negative tests cover actor/tenant spoofing and attempted mutation.

For C1, an approved threat model, SBOM, high-severity vulnerability gate, and negative-path security tests are mandatory before `VERIFIED`.

## 15. Non-functional requirements

- Append behavior is constant per fact and transaction-bounded.
- Fact payload bytes and metadata counts are bounded.
- Stored-data compatibility and retention evidence are mandatory.

The final admission contract must record measurable complexity, input-size, throughput, bundle, compatibility, and controlled-latency budgets applicable to the package profile.

## 16. Conditional applicability resolution

| Trigger family | Proposed result | Reason |
| --- | --- | --- |
| Ingress | APPLICABLE | Package accepts unknown, serialized, vendor, alias-bearing, or configuration input. |
| Generated projections | NOT_APPLICABLE | No generated artifact in proposed topology. |
| Persistent-kernel storage | APPLICABLE | Persistence mode is OWNED. |
| Multi-target isolation | NOT_APPLICABLE | Targets: node. |
| C1 threat model | APPLICABLE | Criticality is C1. |

`NOT_APPLICABLE` is valid only when the machine-readable requirement register evaluates the trigger as false.

## 17. Architecture tree

This topology contains only responsibilities triggered by this PRD. Empty, decorative, placeholder, or future-use directories are prohibited.

```text
packages/data-plane/audit/
├── __tests__
│   ├── audit.adapter-parity.test.ts
│   ├── audit.append-only.test.ts
│   ├── audit.atomicity.test.ts
│   ├── audit.contract.test.ts
│   └── audit.security-negative.test.ts
└── src
    ├── adapter-contract.ts
    ├── adapters
    │   ├── drizzle
    │   │   └── audit-store.ts
    │   └── memory
    │       └── audit-store.ts
    ├── capabilities
    │   ├── append.ts
    │   ├── create.ts
    │   └── project.ts
    ├── contract
    │   ├── action.ts
    │   ├── compatibility.ts
    │   ├── fact.ts
    │   ├── metadata.ts
    │   └── subject.ts
    ├── index.ts
    ├── store
    │   └── audit-store.ts
    └── testing.ts
```

### 17.1 File responsibility register

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | audit append facade |
| `src/adapter-contract.ts` | store composition contract |
| `src/testing.ts` | fact fixtures and memory store |
| `src/contract/fact.ts` | immutable audit fact |
| `src/contract/action.ts` | canonical action representation |
| `src/contract/subject.ts` | audited subject representation |
| `src/contract/metadata.ts` | actor/correlation metadata |
| `src/contract/compatibility.ts` | stored-data profile |
| `src/capabilities/create.ts` | fact validation |
| `src/capabilities/append.ts` | transaction-safe append |
| `src/capabilities/project.ts` | privacy-safe projection |
| `src/store/audit-store.ts` | append-only owned store contract |
| `src/adapters/drizzle/audit-store.ts` | production append adapter |
| `src/adapters/memory/audit-store.ts` | semantic reference adapter |
| `__tests__/audit.contract.test.ts` | public contracts |
| `__tests__/audit.atomicity.test.ts` | same-transaction evidence |
| `__tests__/audit.append-only.test.ts` | mutation prohibition |
| `__tests__/audit.adapter-parity.test.ts` | adapter equivalence |
| `__tests__/audit.security-negative.test.ts` | spoofing/data leakage tests |

### 17.2 Facade rules

- `src/index.ts` contains explicit named exports only and no logic or side effects.
- Auxiliary entrypoints expose only the registered isolation/composition surface.
- Raw clients, SQL objects, mutable adapter instances, storage implementations, and private registries are never exported through `.`.
- Cross-package consumers import `@afenda/audit` or a registered auxiliary entrypoint only.

## 18. Test and evidence contract

Required evidence families:

- `KRN-ID-*`
- `KRN-OWN-*`
- `KRN-CTR-*`
- `KRN-BND-*`
- `KRN-SEC-*`
- `KRN-QUA-*`
- `KRN-NFR-*`
- `KRN-REL-*`
- `KRN-DOC-*`
- `KRN-ING-*`
- `KRN-STO-*`

Minimum executable gates:

1. Inspector snapshot.
2. Registry parity and dependency-boundary gates.
3. Package lint and strict typecheck.
4. Behavior/contract tests for every exported capability.
5. Rejection tests for every ingress path.
6. Projection and adapter parity where applicable.
7. Consumer compile demonstration for every declared consumer.
8. Coverage threshold: 90% branch coverage.
9. Mutation testing where the C1 logic trigger applies.
10. Entrypoint isolation, budgets, compatibility, security, evidence-completeness, and digest calculation.

A skipped, timed-out, killed, resource-starved, or unrecorded applicable gate is failure.

## 19. Implementation slices

| Slice | Coherent outcome | Gate to advance |
| --- | --- | --- |
| AUDIT-1.0 | Freeze fact schema, privacy classification, and append-only contract. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| AUDIT-2.0 | Implement fact construction and memory reference adapter. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| AUDIT-3.0 | Implement owned schema and transaction-safe Drizzle append. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| AUDIT-4.0 | Add append-only, atomicity, tenant/actor, and data-minimization tests. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| AUDIT-5.0 | Complete adapter parity, threat model, migration, compatibility, and seal evidence. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |

Slices are sequential-gated, independently reviewable, and constrained to exact package/write boundaries. No later slice begins while an earlier slice is non-green.

## 20. Acceptance criteria and definition of done

The package is `IMPLEMENTED` only when:

- all exported behavior is real, tested, and derived from canonical definitions or admitted mechanism state;
- all applicable ownership, contract, ingress, projection, storage, and consumer checks pass;
- memory/fake and production adapter parity passes where multiple adapters exist;
- no placeholder runtime path, stub return, TODO behavior branch, or deferred deletion remains.

The package is `VERIFIED` only when one evidence-complete CI run proves all applicable mandatory requirements for one content digest, including security, budgets, compatibility, coverage, mutation where triggered, internal-refactor demonstration, and evidence completeness.

A seal may be issued only after verification and attests one package capability, commit, and content digest. It is not release, deployment, migration, or statutory approval.

## 21. Required admission records before production-source merge

1. Named owners and signatories.
2. Exact accepted production consumers.
3. Exact runtime targets and auxiliary-entrypoint isolation reasons.
4. Exact dependency edges in both `package.json` and the workspace-edge register.
5. Compatibility support windows.
6. Machine-resolved requirement applicability expressions.
7. Measurable non-functional budgets.
8. Four admission decisions recorded as PASS.

## 22. Rejected designs

- Generic `shared`, `common`, `utils`, `core`, `types`, `registry`, or umbrella kernel package.
- Wildcard exports or internal-path consumption.
- Mutable request/tenant/transaction/clock/adapter singleton.
- App/framework dependency.
- Manually synchronized projection.
- Business-policy ownership not stated in the admitted capability.
- A mutable `SEALED` lifecycle state.
- Treating partial, skipped, or undocumented evidence as success.


---

# @afenda/numbering — Product Requirements Document

| Field | Value |
| --- | --- |
| Document type | Individual kernel package PRD |
| Status | Draft for admission and implementation approval |
| Package | `@afenda/numbering` |
| Physical path | `packages/data-plane/numbering` |
| Band | `data-plane` |
| Kernel kind | `OPEN` |
| Persistence mode | `OWNED` |
| Criticality | `C1` |
| Governing authority | `packages/KERNEL-GOVERNANCE.md` |
| Capability owner | Package Owner role; named human must be recorded in the admission contract |
| Architecture owner | Architecture Owner role; named human must be recorded in the admission contract |
| Security owner | Required for C1 admission, verification, and seal |

> This PRD defines one package capability. It does not override the governance authority, workspace package register, frozen admission contract, workspace-edge register, or machine-readable requirement register.

---

## 1. Product/capability statement

**Admitted capability:** Tenant-defined series and gapless allocation per tenant, series, and period.

**Problem.** Business documents require configurable numbers, but naive counters create duplicates, cross-tenant collisions, or gaps under rollback and concurrency.

## 2. Goals

- Allow tenant-defined numbering series.
- Allocate unique gapless numbers within tenant, series, and period.
- Make period rollover, formatting, and concurrency semantics explicit.
- Own transaction-safe storage and allocation mechanism only.

## 3. Explicit non-goals and non-ownership

- Choosing which documents require legal gaplessness, invoice/tax conclusions, document lifecycle, or business approval policy.

The package must not absorb unrelated shared helpers, bounded-context policy, application concerns, UI concerns, or a canonical cross-domain registry.

## 4. Consumers and jobs to be done

**Candidate production consumer classes** — exact package names must be frozen in the admission contract:

- ERP bounded contexts issuing documents
- Application administration for series configuration
- Migration tooling importing approved starting states

Consumer jobs:

1. Import the registered entrypoint rather than an internal path.
2. Invoke a stable representation-safe capability.
3. Receive canonical values or `@afenda/errors` outcomes.
4. Replace internal implementation without production-consumer edits.

## 5. Admission decisions

| Decision | Required result | Package-specific interpretation |
| --- | --- | --- |
| Ownership | PASS | `@afenda/numbering` is the single owner of the admitted capability and nothing broader. |
| Policy neutrality | PASS | No organization-specific, workflow-specific, legal, tax, accounting, or domain disposition is encoded. |
| Jurisdiction portability | PASS | Facts may be represented; jurisdictional conclusions remain with bounded contexts or approved policy layers. |
| Reuse portability | PASS | Capability remains reusable by multiple registered consumers without app/framework coupling. |

## 6. Runtime and dependency contract

| Surface | Proposed admission value |
| --- | --- |
| Permitted runtime targets | `node` |
| Default entrypoint | `.` |
| Auxiliary entrypoints | `./adapter-contract`, `./testing` |
| Proposed authorized dependency edges | `@afenda/errors`, `@afenda/ids`, `@afenda/temporal`, `@afenda/tenancy`, `@afenda/db` |

These values are implementation-ready proposals but become authoritative only when recorded in the workspace package register, admission contract, `package.json`, and workspace-edge register.

## 7. Canonical records and public types

- `NumberSeriesId`
- `NumberSeriesDefinition`
- `NumberPeriodKey`
- `AllocationRequest`
- `AllocatedNumber`
- `FormattingPattern`
- `SeriesState`

Public types must be derived from these canonical definitions. Separately maintained unions, maps, validators, or registries are prohibited.

## 8. Functional operations

| No. | Required operation |
| ---: | --- |
| 01 | `createSeries(input, context, store)` validates and persists tenant definition. |
| 02 | `allocate(transaction, request, context, store)` atomically advances and returns the next number. |
| 03 | `previewFormat(series, candidate)` formats without consuming. |
| 04 | `closePeriod(series, period)` prevents further allocation under explicit mechanism rules. |

## 9. Normative package invariants

| Invariant ID | Requirement |
| --- | --- |
| NUMBERING-INV-001 | Uniqueness scope is organization + series + period. |
| NUMBERING-INV-002 | A successful allocation advances exactly once in the caller transaction. |
| NUMBERING-INV-003 | Rolled-back transactions do not consume numbers. |
| NUMBERING-INV-004 | Organization identity is server-bound. |
| NUMBERING-INV-005 | Format output is derived from immutable series definition and allocated sequence. |

## 10. Failure and outcome model

- Duplicate series, invalid pattern, closed period, exhausted range, concurrency conflict, transaction mismatch, and tenant violation return canonical failures.

All representable failures use code-narrowable `Result<Data, Code>` outcomes. Internal causes and unsafe diagnostics are not public payloads.

## 11. Ingress and normalization

- Tenant series configuration enters as unknown with bounded pattern syntax.
- Legacy imported state requires explicit migration provenance and monotonicity checks.

Every applicable ingress path accepts `unknown`, parses once, applies declared byte/depth/count bounds, and emits canonical-only values.

## 12. Persistence and transaction model

- OWNED series-definition and series-state schemas with locking/atomic allocation adapter.
- Memory and production adapters must match semantic outcomes.

Persistence implementation must remain mechanism-only and must not encode bounded-context policy.

## 13. Events, integrations, and composition

- Uses temporal period keys and database transaction capability.
- Bounded contexts decide when allocation is legally or operationally required.

No application, route, React, Next.js, presentation, or undeclared internal-path dependency is permitted.

## 14. Tenancy, privacy, and security

- Cross-tenant allocation and series mutation fail closed.
- Pattern parser disallows executable or unbounded expressions.

For C1, an approved threat model, SBOM, high-severity vulnerability gate, and negative-path security tests are mandatory before `VERIFIED`.

## 15. Non-functional requirements

- Allocation behavior declares contention, retry, and throughput budgets.
- Concurrency and rollback tests are mandatory.
- C1 mutation score applies to allocation/state logic.

The final admission contract must record measurable complexity, input-size, throughput, bundle, compatibility, and controlled-latency budgets applicable to the package profile.

## 16. Conditional applicability resolution

| Trigger family | Proposed result | Reason |
| --- | --- | --- |
| Ingress | APPLICABLE | Package accepts unknown, serialized, vendor, alias-bearing, or configuration input. |
| Generated projections | NOT_APPLICABLE | No generated artifact in proposed topology. |
| Persistent-kernel storage | APPLICABLE | Persistence mode is OWNED. |
| Multi-target isolation | NOT_APPLICABLE | Targets: node. |
| C1 threat model | APPLICABLE | Criticality is C1. |

`NOT_APPLICABLE` is valid only when the machine-readable requirement register evaluates the trigger as false.

## 17. Architecture tree

This topology contains only responsibilities triggered by this PRD. Empty, decorative, placeholder, or future-use directories are prohibited.

```text
packages/data-plane/numbering/
├── __tests__
│   ├── numbering.adapter-parity.test.ts
│   ├── numbering.concurrency.test.ts
│   ├── numbering.contract.test.ts
│   ├── numbering.rollback.test.ts
│   └── numbering.tenant-boundary.test.ts
└── src
    ├── adapter-contract.ts
    ├── adapters
    │   ├── drizzle
    │   │   └── numbering-store.ts
    │   └── memory
    │       └── numbering-store.ts
    ├── capabilities
    │   ├── allocate.ts
    │   ├── close-period.ts
    │   ├── create-series.ts
    │   └── preview.ts
    ├── contract
    │   ├── allocation.ts
    │   ├── compatibility.ts
    │   ├── pattern.ts
    │   ├── period.ts
    │   └── series.ts
    ├── index.ts
    ├── ingress
    │   ├── import-state.ts
    │   └── parse-series.ts
    ├── internal
    │   └── pattern-parser.ts
    ├── store
    │   └── numbering-store.ts
    └── testing.ts
```

### 17.1 File responsibility register

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | numbering capability facade |
| `src/adapter-contract.ts` | store/transaction composition contracts |
| `src/testing.ts` | memory store and concurrency fixtures |
| `src/contract/series.ts` | tenant series definition |
| `src/contract/period.ts` | period key/state |
| `src/contract/allocation.ts` | request/result |
| `src/contract/pattern.ts` | bounded format pattern |
| `src/contract/compatibility.ts` | stored-data/source profile |
| `src/capabilities/create-series.ts` | definition creation |
| `src/capabilities/allocate.ts` | gapless allocation |
| `src/capabilities/preview.ts` | non-consuming formatting |
| `src/capabilities/close-period.ts` | period closure mechanism |
| `src/ingress/parse-series.ts` | unknown configuration ingress |
| `src/ingress/import-state.ts` | controlled migration ingress |
| `src/store/numbering-store.ts` | owned store contract |
| `src/adapters/drizzle/numbering-store.ts` | locking production adapter |
| `src/adapters/memory/numbering-store.ts` | semantic reference adapter |
| `src/internal/pattern-parser.ts` | bounded formatting mechanism |
| `__tests__/numbering.contract.test.ts` | public contracts |
| `__tests__/numbering.concurrency.test.ts` | uniqueness/gaplessness races |
| `__tests__/numbering.rollback.test.ts` | no-consume rollback |
| `__tests__/numbering.adapter-parity.test.ts` | adapter equivalence |
| `__tests__/numbering.tenant-boundary.test.ts` | cross-tenant negatives |

### 17.2 Facade rules

- `src/index.ts` contains explicit named exports only and no logic or side effects.
- Auxiliary entrypoints expose only the registered isolation/composition surface.
- Raw clients, SQL objects, mutable adapter instances, storage implementations, and private registries are never exported through `.`.
- Cross-package consumers import `@afenda/numbering` or a registered auxiliary entrypoint only.

## 18. Test and evidence contract

Required evidence families:

- `KRN-ID-*`
- `KRN-OWN-*`
- `KRN-CTR-*`
- `KRN-BND-*`
- `KRN-SEC-*`
- `KRN-QUA-*`
- `KRN-NFR-*`
- `KRN-REL-*`
- `KRN-DOC-*`
- `KRN-ING-*`
- `KRN-STO-*`

Minimum executable gates:

1. Inspector snapshot.
2. Registry parity and dependency-boundary gates.
3. Package lint and strict typecheck.
4. Behavior/contract tests for every exported capability.
5. Rejection tests for every ingress path.
6. Projection and adapter parity where applicable.
7. Consumer compile demonstration for every declared consumer.
8. Coverage threshold: 90% branch coverage.
9. Mutation testing where the C1 logic trigger applies.
10. Entrypoint isolation, budgets, compatibility, security, evidence-completeness, and digest calculation.

A skipped, timed-out, killed, resource-starved, or unrecorded applicable gate is failure.

## 19. Implementation slices

| Slice | Coherent outcome | Gate to advance |
| --- | --- | --- |
| NUMBERING-1.0 | Freeze series, period, pattern, and allocation contracts. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| NUMBERING-2.0 | Implement parser and memory reference adapter. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| NUMBERING-3.0 | Implement owned schema and transactional allocation adapter. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| NUMBERING-4.0 | Add concurrency, rollback, period, and tenant negative tests. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| NUMBERING-5.0 | Complete parity, migration, threat model, budgets, compatibility, and seal evidence. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |

Slices are sequential-gated, independently reviewable, and constrained to exact package/write boundaries. No later slice begins while an earlier slice is non-green.

## 20. Acceptance criteria and definition of done

The package is `IMPLEMENTED` only when:

- all exported behavior is real, tested, and derived from canonical definitions or admitted mechanism state;
- all applicable ownership, contract, ingress, projection, storage, and consumer checks pass;
- memory/fake and production adapter parity passes where multiple adapters exist;
- no placeholder runtime path, stub return, TODO behavior branch, or deferred deletion remains.

The package is `VERIFIED` only when one evidence-complete CI run proves all applicable mandatory requirements for one content digest, including security, budgets, compatibility, coverage, mutation where triggered, internal-refactor demonstration, and evidence completeness.

A seal may be issued only after verification and attests one package capability, commit, and content digest. It is not release, deployment, migration, or statutory approval.

## 21. Required admission records before production-source merge

1. Named owners and signatories.
2. Exact accepted production consumers.
3. Exact runtime targets and auxiliary-entrypoint isolation reasons.
4. Exact dependency edges in both `package.json` and the workspace-edge register.
5. Compatibility support windows.
6. Machine-resolved requirement applicability expressions.
7. Measurable non-functional budgets.
8. Four admission decisions recorded as PASS.

## 22. Rejected designs

- Generic `shared`, `common`, `utils`, `core`, `types`, `registry`, or umbrella kernel package.
- Wildcard exports or internal-path consumption.
- Mutable request/tenant/transaction/clock/adapter singleton.
- App/framework dependency.
- Manually synchronized projection.
- Business-policy ownership not stated in the admitted capability.
- A mutable `SEALED` lifecycle state.
- Treating partial, skipped, or undocumented evidence as success.


---

# @afenda/read-models — Product Requirements Document

| Field | Value |
| --- | --- |
| Document type | Individual kernel package PRD |
| Status | Draft for admission and implementation approval |
| Package | `@afenda/read-models` |
| Physical path | `packages/data-plane/read-models` |
| Band | `data-plane` |
| Kernel kind | `CLOSED` |
| Persistence mode | `INJECTED` |
| Criticality | `C2` |
| Governing authority | `packages/KERNEL-GOVERNANCE.md` |
| Capability owner | Package Owner role; named human must be recorded in the admission contract |
| Architecture owner | Architecture Owner role; named human must be recorded in the admission contract |
| Security owner | Not required by criticality unless a security trigger is activated |

> This PRD defines one package capability. It does not override the governance authority, workspace package register, frozen admission contract, workspace-edge register, or machine-readable requirement register.

---

## 1. Product/capability statement

**Admitted capability:** Projection registration protocol, rebuild coordination, position tracking, and staleness reporting.

**Problem.** Projection mechanisms drift when every bounded context reinvents position storage, rebuild coordination, and staleness semantics—or when a shared kernel incorrectly owns all domain projections.

## 2. Goals

- Provide a generic projection protocol and coordinator.
- Track processing positions and expose staleness consistently.
- Coordinate bounded rebuilds and resumable recovery.
- Keep projection definitions, IDs, handlers, and registrations owned by each bounded context.

## 3. Explicit non-goals and non-ownership

- A cross-domain canonical projection registry, domain read models, query APIs, event payload ownership, or analytics warehouse orchestration.

The package must not absorb unrelated shared helpers, bounded-context policy, application concerns, UI concerns, or a canonical cross-domain registry.

## 4. Consumers and jobs to be done

**Candidate production consumer classes** — exact package names must be frozen in the admission contract:

- ERP bounded contexts with projections
- Application projection workers
- Operational diagnostics consuming staleness reports

Consumer jobs:

1. Import the registered entrypoint rather than an internal path.
2. Invoke a stable representation-safe capability.
3. Receive canonical values or `@afenda/errors` outcomes.
4. Replace internal implementation without production-consumer edits.

## 5. Admission decisions

| Decision | Required result | Package-specific interpretation |
| --- | --- | --- |
| Ownership | PASS | `@afenda/read-models` is the single owner of the admitted capability and nothing broader. |
| Policy neutrality | PASS | No organization-specific, workflow-specific, legal, tax, accounting, or domain disposition is encoded. |
| Jurisdiction portability | PASS | Facts may be represented; jurisdictional conclusions remain with bounded contexts or approved policy layers. |
| Reuse portability | PASS | Capability remains reusable by multiple registered consumers without app/framework coupling. |

## 6. Runtime and dependency contract

| Surface | Proposed admission value |
| --- | --- |
| Permitted runtime targets | `node` |
| Default entrypoint | `.` |
| Auxiliary entrypoints | `./adapter-contract`, `./testing` |
| Proposed authorized dependency edges | `@afenda/errors`, `@afenda/ids`, `@afenda/temporal`, `@afenda/tenancy`, `@afenda/events` |

These values are implementation-ready proposals but become authoritative only when recorded in the workspace package register, admission contract, `package.json`, and workspace-edge register.

## 7. Canonical records and public types

- `ProjectionId`
- `ProjectionDefinition`
- `ProjectionHandler`
- `ProjectionPosition`
- `RebuildRequest`
- `RebuildState`
- `StalenessReport`

Public types must be derived from these canonical definitions. Separately maintained unions, maps, validators, or registries are prohibited.

## 8. Functional operations

| No. | Required operation |
| ---: | --- |
| 01 | `createProjectionCoordinator(definitions, store, clock)` validates composition-owned definitions. |
| 02 | `advance(projection, event, position)` applies handler and atomically records progress through the injected store. |
| 03 | `beginRebuild(request)` creates bounded rebuild state. |
| 04 | `resumeRebuild(state)` continues from recorded checkpoint. |
| 05 | `reportStaleness(projection, head)` returns a canonical staleness projection. |

## 9. Normative package invariants

| Invariant ID | Requirement |
| --- | --- |
| READ-MODELS-INV-001 | The package owns protocol and mechanism only. |
| READ-MODELS-INV-002 | Each bounded context owns its projection definitions and registrations. |
| READ-MODELS-INV-003 | No global canonical projection registry is introduced. |
| READ-MODELS-INV-004 | Position advancement is monotonic and atomic with projected writes under the declared protocol. |
| READ-MODELS-INV-005 | Rebuilds are resumable, bounded, and cannot silently replace live state. |

## 10. Failure and outcome model

- Unknown projection, duplicate composition registration, non-monotonic position, handler failure, checkpoint conflict, and store failure return canonical outcomes.

All representable failures use code-narrowable `Result<Data, Code>` outcomes. Internal causes and unsafe diagnostics are not public payloads.

## 11. Ingress and normalization

- Rebuild commands and serialized positions enter as unknown with explicit bounds.

Every applicable ingress path accepts `unknown`, parses once, applies declared byte/depth/count bounds, and emits canonical-only values.

## 12. Persistence and transaction model

- Injected position/rebuild store capability only.
- Domain projection tables remain owned by their bounded contexts.
- Reference memory adapter and production adapter parity are required when both exist.

Persistence implementation must remain mechanism-only and must not encode bounded-context policy.

## 13. Events, integrations, and composition

- Consumes event envelope/subscription contracts but not domain payload ownership.
- Composition supplies transaction boundaries for projected writes and position updates.

No application, route, React, Next.js, presentation, or undeclared internal-path dependency is permitted.

## 14. Tenancy, privacy, and security

- Organization-scoped projections bind trusted tenant context.
- Rebuild controls require consuming-layer authorization; the kernel exposes no admin bypass.

For C1, an approved threat model, SBOM, high-severity vulnerability gate, and negative-path security tests are mandatory before `VERIFIED`.

## 15. Non-functional requirements

- Batch size, lag, checkpoint frequency, rebuild window, and concurrency are bounded.
- Staleness calculation is deterministic for fixed positions and clock.
- Failure/restart integration tests are mandatory.

The final admission contract must record measurable complexity, input-size, throughput, bundle, compatibility, and controlled-latency budgets applicable to the package profile.

## 16. Conditional applicability resolution

| Trigger family | Proposed result | Reason |
| --- | --- | --- |
| Ingress | APPLICABLE | Package accepts unknown, serialized, vendor, alias-bearing, or configuration input. |
| Generated projections | NOT_APPLICABLE | No generated artifact in proposed topology. |
| Persistent-kernel storage | APPLICABLE | Persistence mode is INJECTED. |
| Multi-target isolation | NOT_APPLICABLE | Targets: node. |
| C1 threat model | NOT_APPLICABLE | Criticality is C2. |

`NOT_APPLICABLE` is valid only when the machine-readable requirement register evaluates the trigger as false.

## 17. Architecture tree

This topology contains only responsibilities triggered by this PRD. Empty, decorative, placeholder, or future-use directories are prohibited.

```text
packages/data-plane/read-models/
├── __tests__
│   ├── read-models.adapter-parity.test.ts
│   ├── read-models.ownership.test.ts
│   ├── read-models.position.test.ts
│   ├── read-models.rebuild.test.ts
│   └── read-models.tenant-boundary.test.ts
└── src
    ├── adapter-contract.ts
    ├── adapters
    │   └── memory
    │       └── projection-coordination-store.ts
    ├── capabilities
    │   ├── advance.ts
    │   ├── create-coordinator.ts
    │   ├── rebuild.ts
    │   └── staleness.ts
    ├── contract
    │   ├── compatibility.ts
    │   ├── position.ts
    │   ├── projection.ts
    │   ├── rebuild.ts
    │   └── staleness.ts
    ├── index.ts
    ├── ingress
    │   └── parse-rebuild.ts
    ├── internal
    │   └── definition-index.ts
    ├── store
    │   └── projection-coordination-store.ts
    └── testing.ts
```

### 17.1 File responsibility register

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | projection mechanism facade |
| `src/adapter-contract.ts` | position/rebuild store facade |
| `src/testing.ts` | memory store and projection fixtures |
| `src/contract/projection.ts` | composition-owned definition protocol |
| `src/contract/position.ts` | monotonic position |
| `src/contract/rebuild.ts` | rebuild state/request |
| `src/contract/staleness.ts` | staleness report |
| `src/contract/compatibility.ts` | wire/stored-data profile |
| `src/capabilities/create-coordinator.ts` | composition validation |
| `src/capabilities/advance.ts` | handler/position coordination |
| `src/capabilities/rebuild.ts` | bounded rebuild control |
| `src/capabilities/staleness.ts` | lag reporting |
| `src/ingress/parse-rebuild.ts` | bounded rebuild ingress |
| `src/store/projection-coordination-store.ts` | narrow injected store |
| `src/adapters/memory/projection-coordination-store.ts` | semantic reference adapter |
| `src/internal/definition-index.ts` | private composition index, not canonical registry |
| `__tests__/read-models.ownership.test.ts` | no cross-domain registry |
| `__tests__/read-models.position.test.ts` | monotonicity/atomicity |
| `__tests__/read-models.rebuild.test.ts` | resume/recovery behavior |
| `__tests__/read-models.adapter-parity.test.ts` | adapter equivalence |
| `__tests__/read-models.tenant-boundary.test.ts` | tenant negatives |

### 17.2 Facade rules

- `src/index.ts` contains explicit named exports only and no logic or side effects.
- Auxiliary entrypoints expose only the registered isolation/composition surface.
- Raw clients, SQL objects, mutable adapter instances, storage implementations, and private registries are never exported through `.`.
- Cross-package consumers import `@afenda/read-models` or a registered auxiliary entrypoint only.

## 18. Test and evidence contract

Required evidence families:

- `KRN-ID-*`
- `KRN-OWN-*`
- `KRN-CTR-*`
- `KRN-BND-*`
- `KRN-SEC-*`
- `KRN-QUA-*`
- `KRN-NFR-*`
- `KRN-REL-*`
- `KRN-DOC-*`
- `KRN-ING-*`
- `KRN-STO-*`

Minimum executable gates:

1. Inspector snapshot.
2. Registry parity and dependency-boundary gates.
3. Package lint and strict typecheck.
4. Behavior/contract tests for every exported capability.
5. Rejection tests for every ingress path.
6. Projection and adapter parity where applicable.
7. Consumer compile demonstration for every declared consumer.
8. Coverage threshold: 80% branch coverage.
9. Mutation testing where the C1 logic trigger applies.
10. Entrypoint isolation, budgets, compatibility, security, evidence-completeness, and digest calculation.

A skipped, timed-out, killed, resource-starved, or unrecorded applicable gate is failure.

## 19. Implementation slices

| Slice | Coherent outcome | Gate to advance |
| --- | --- | --- |
| READ-MODELS-1.0 | Freeze protocol/non-ownership and store capability. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| READ-MODELS-2.0 | Implement composition validation and memory reference adapter. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| READ-MODELS-3.0 | Implement monotonic advance and staleness reporting. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| READ-MODELS-4.0 | Implement bounded, resumable rebuild coordination. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |
| READ-MODELS-5.0 | Complete parity, restart, tenant, compatibility, budget, and verification evidence. | All earlier slices remain green; exact write boundary limited to this package and registered schema artifacts. |

Slices are sequential-gated, independently reviewable, and constrained to exact package/write boundaries. No later slice begins while an earlier slice is non-green.

## 20. Acceptance criteria and definition of done

The package is `IMPLEMENTED` only when:

- all exported behavior is real, tested, and derived from canonical definitions or admitted mechanism state;
- all applicable ownership, contract, ingress, projection, storage, and consumer checks pass;
- memory/fake and production adapter parity passes where multiple adapters exist;
- no placeholder runtime path, stub return, TODO behavior branch, or deferred deletion remains.

The package is `VERIFIED` only when one evidence-complete CI run proves all applicable mandatory requirements for one content digest, including security, budgets, compatibility, coverage, mutation where triggered, internal-refactor demonstration, and evidence completeness.

A seal may be issued only after verification and attests one package capability, commit, and content digest. It is not release, deployment, migration, or statutory approval.

## 21. Required admission records before production-source merge

1. Named owners and signatories.
2. Exact accepted production consumers.
3. Exact runtime targets and auxiliary-entrypoint isolation reasons.
4. Exact dependency edges in both `package.json` and the workspace-edge register.
5. Compatibility support windows.
6. Machine-resolved requirement applicability expressions.
7. Measurable non-functional budgets.
8. Four admission decisions recorded as PASS.

## 22. Rejected designs

- Generic `shared`, `common`, `utils`, `core`, `types`, `registry`, or umbrella kernel package.
- Wildcard exports or internal-path consumption.
- Mutable request/tenant/transaction/clock/adapter singleton.
- App/framework dependency.
- Manually synchronized projection.
- Business-policy ownership not stated in the admitted capability.
- A mutable `SEALED` lifecycle state.
- Treating partial, skipped, or undocumented evidence as success.


---
