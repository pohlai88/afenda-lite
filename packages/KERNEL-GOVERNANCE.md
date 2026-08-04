# Kernel package governance

| Field | Value |
| --- | --- |
| Surface | `packages/KERNEL-GOVERNANCE.md` |
| Status | Normative |
| Applies to | Every package registered in the `foundation`, `runtime`, or `data-plane` bands |
| Supersedes | Requirement clauses in `KERNEL-SCAFFOLDING.md` |
| Waiver authority | Package owner + architecture owner; C1 security requirements also require the security owner |
| Evidence authority | Machine-readable requirement and gate registers, CI evidence, and digest-bound seal records |

**Notation.**

- Requirement class:
  - `M` — mandatory and not waiverable.
  - `C` — conditional; the trigger is stated and must be machine-resolved.
  - `W` — waiverable only through §13.
- Proof method:
  - `T` — automated behavior, contract, parity, property, fuzz, or integration test.
  - `A` — static analysis, deterministic guard, dependency analysis, or generated verification.
  - `I` — controlled artifact inspection with recorded evidence.
  - `D` — executable demonstration against a declared scenario.
- Evidence result:
  - `PASS`
  - `FAIL`
  - `NOT_APPLICABLE`

A lifecycle decision remains binary. A requirement is satisfied only when it is `PASS`, or when it is `NOT_APPLICABLE` with a machine-validated false trigger. A skipped, timed-out, killed, resource-starved, or unrecorded applicable requirement is `FAIL`. Partial satisfaction is failure.

---

## 1. Authority and precedence

When two governance surfaces disagree, the following order applies:

1. `packages/KERNEL-GOVERNANCE.md` — governance semantics and requirement definitions.
2. `governance/kernel/package-registry.ts` (`KERNEL_PACKAGES`) — admitted package identity, capability, classification, owner, consumers, and lifecycle.
3. Frozen admission contract — package-specific capability boundary, non-ownership, accepted consumers, and approved runtime targets.
4. Workspace-edge register — authorized package dependency edges.
5. Machine-readable requirement register — applicability, gates, proof methods, and evidence kinds.
6. `package.json` and package-local configuration — executable projections of the registered package contract.
7. Generated gate and evidence artifacts — derived projections only.
8. Package README — explanatory and non-authoritative.

A lower-authority surface must not override a higher-authority surface. Drift between authoritative and derived surfaces is a build failure.

---

## 2. Core classification

### 2.1 Band

| Band | Purpose | Default dependency direction |
| --- | --- | --- |
| `foundation` | Pure or explicitly controlled universal semantics | May depend only on authorized `foundation` packages |
| `runtime` | Cross-cutting runtime mechanisms | May depend on authorized `foundation` and `runtime` packages |
| `data-plane` | Persistence, transactional, projection, and delivery mechanisms | May depend on authorized packages in `foundation`, `runtime`, and `data-plane` |
| `control-plane` | Authentication, authorization integration, and platform operator control surfaces | May depend on authorized packages in all four bands |

Same-band dependency edges require explicit workspace-edge registration. No package may depend downward against the matrix in §7.1.

### 2.2 Kernel kind

| Kind | Meaning |
| --- | --- |
| `CLOSED` | Canonical definitions or mechanism semantics are package-owned and cannot be tenant-created |
| `OPEN` | Canonical instances or definitions may be created by a tenant through the package capability |

Kernel kind does **not** determine whether a package uses persistence.

### 2.3 Persistence mode

| Mode | Meaning |
| --- | --- |
| `NONE` | The package declares no store contract and owns no persistence schema |
| `INJECTED` | The package declares the narrow storage capability it requires; implementation is supplied by composition |
| `OWNED` | The package owns its persistence schema and the transaction-safe adapters required by its capability |

### 2.4 Runtime targets

Each package records one or more permitted targets:

`pure` · `node` · `edge` · `browser` · `tooling`

The default `"."` entrypoint must be valid for its registered target. Additional entrypoints are permitted only under §6.2.

### 2.5 Lifecycle

| Lifecycle | Meaning |
| --- | --- |
| `ABSENT` | No admitted package exists |
| `SCAFFOLDED` | Identity, topology, boundaries, commands, and admission evidence are complete |
| `IMPLEMENTED` | Capability behavior, ingress, projections, and persistence obligations are complete |
| `VERIFIED` | All applicable mandatory requirements pass with recorded evidence |

`SEALED` is not a mutable lifecycle value. A seal is a separate immutable attestation for one capability, commit, and content digest under §11.

### 2.6 Criticality

| Criticality | Meaning |
| --- | --- |
| `C1` | Financial, authorization, security, identity, tenancy, transactional, or irreversible correctness |
| `C2` | Material correctness or operational continuity |
| `C3` | Utility or low-impact supporting behavior |

---

## 3. Package admission registry

No kernel package may exist outside this registry. Creation, rename, split, merge, band movement, kind change, persistence change, or capability expansion requires registry amendment and a new or amended admission contract.

**Canonical machine register:** `governance/kernel/package-registry.ts` (`KERNEL_PACKAGES`). This section is a derived projection; drift from the register is a build failure (`pnpm check:kernel-governance`).

**Admission state:**

| State | Meaning |
| --- | --- |
| `ADMITTED` | Frozen admission contract exists on disk |
| `PROVISIONAL` | Production source exists without a frozen admission contract (standing §4 violation until resolved) |
| `PLANNED` | Registered intent; no package directory on disk |

### 3.1 `foundation`

| Package | Band | Kind | Persistence | Criticality | Admission state | Admitted capability |
| --- | --- | --- | --- | --- | --- | --- |
| `@afenda/config` | `foundation` | `CLOSED` | `NONE` | C2 | `PROVISIONAL` | Shared TypeScript, Biome, and Vitest configuration profiles for the monorepo |
| `@afenda/errors` | `foundation` | `CLOSED` | `NONE` | C1 | `ADMITTED` | Canonical outcome representation, code space, retry semantics, and normalization of unknown or vendor failures |
| `@afenda/env` | `foundation` | `CLOSED` | `NONE` | C2 | `PROVISIONAL` | Configuration schema, parse, validation, and runtime-isolated environment loading |
| `@afenda/testing` | `foundation` | `CLOSED` | `NONE` | C2 | `PROVISIONAL` | Shared test harness, lane definitions, and Vitest control-plane contracts |
| `@afenda/ids` | `foundation` | `CLOSED` | `NONE` | C1 | `PLANNED` | Branded identifier contracts, parsing, validation, and controlled ULID/UUIDv7 generation |
| `@afenda/money` | `foundation` | `CLOSED` | `NONE` | C1 | `PLANNED` | Minor-unit monetary representation, arithmetic, allocation, and explicit rounding |
| `@afenda/quantity` | `foundation` | `OPEN` | `INJECTED` | C1 | `PLANNED` | Dimension taxonomy, unit definition, and dimensional conversion |
| `@afenda/temporal` | `foundation` | `CLOSED` | `NONE` | C1 | `PLANNED` | Instant, business date, effective range, and period arithmetic |
| `@afenda/codes` | `foundation` | `CLOSED` | `NONE` | C2 | `PLANNED` | Canonical externally governed reference codes and their validation or lookup projections |
| `@afenda/tenancy` | `foundation` | `CLOSED` | `NONE` | C1 | `PLANNED` | Execution-context representation for organization, actor, and correlation identity |
| `@afenda/authz` | `foundation` | `CLOSED` | `NONE` | C1 | `PLANNED` | Permission grammar, decision representation, and universal evaluation primitives |

### 3.2 `runtime`

| Package | Band | Kind | Persistence | Criticality | Admission state | Admitted capability |
| --- | --- | --- | --- | --- | --- | --- |
| `@afenda/logger` | `runtime` | `CLOSED` | `INJECTED` | C2 | `PROVISIONAL` | Structured logging emission, context propagation, and canonical redaction |
| `@afenda/http` | `runtime` | `CLOSED` | `NONE` | C2 | `PROVISIONAL` | HTTP client and server boundary utilities with transport-safe defaults |
| `@afenda/security` | `runtime` | `CLOSED` | `NONE` | C1 | `PROVISIONAL` | Security primitives, request hardening, and cryptographic boundary utilities |
| `@afenda/metrics` | `runtime` | `CLOSED` | `INJECTED` | C2 | `PROVISIONAL` | Metrics emission, instrumentation contracts, and RED-oriented telemetry hooks |
| `@afenda/openapi` | `runtime` | `CLOSED` | `NONE` | C2 | `PROVISIONAL` | OpenAPI schema generation, projection utilities, and contract emission |
| `@afenda/rate-limit` | `runtime` | `CLOSED` | `INJECTED` | C1 | `PROVISIONAL` | Rate limiting claim, window semantics, and conflict representation |
| `@afenda/cache` | `runtime` | `CLOSED` | `INJECTED` | C2 | `PROVISIONAL` | Cache keying, TTL semantics, and invalidation contracts over injected stores |
| `@afenda/idempotency` | `runtime` | `CLOSED` | `INJECTED` | C1 | `PLANNED` | Claim, release, replay, expiry, and conflict semantics over an injected idempotency store |
| `@afenda/observability` | `runtime` | `CLOSED` | `INJECTED` | C2 | `PLANNED` | Structured operational telemetry emission, context propagation, and canonical redaction |

### 3.3 `data-plane`

| Package | Band | Kind | Persistence | Criticality | Admission state | Admitted capability |
| --- | --- | --- | --- | --- | --- | --- |
| `@afenda/db` | `data-plane` | `CLOSED` | `OWNED` | C1 | `PROVISIONAL` | Database schema authority, connectivity, transaction capabilities, and RLS session binding |
| `@afenda/audit` | `data-plane` | `CLOSED` | `OWNED` | C1 | `PROVISIONAL` | Append-only audit fact contract and transaction-safe append mechanism |
| `@afenda/events` | `data-plane` | `CLOSED` | `NONE` | C1 | `PROVISIONAL` | Event interoperability contract: envelope, versioning, serialization, and subscription interfaces |
| `@afenda/search` | `data-plane` | `CLOSED` | `INJECTED` | C2 | `PROVISIONAL` | Search indexing contracts, query projections, and tenant-scoped discovery semantics |
| `@afenda/notifications` | `data-plane` | `CLOSED` | `INJECTED` | C2 | `PROVISIONAL` | Notification delivery contracts, channel projections, and dispatch state semantics |
| `@afenda/outbox` | `data-plane` | `CLOSED` | `OWNED` | C1 | `PLANNED` | Transactional outbox persistence, claim, publication coordination, and idempotent delivery state |
| `@afenda/numbering` | `data-plane` | `OPEN` | `OWNED` | C1 | `PLANNED` | Tenant-defined series and gapless allocation per tenant, series, and period |
| `@afenda/read-models` | `data-plane` | `CLOSED` | `INJECTED` | C2 | `PLANNED` | Projection registration protocol, rebuild coordination, position tracking, and staleness reporting |

`@afenda/read-models` owns the generic protocol and mechanism only. Each bounded context owns its projection definitions, identifiers, handlers, and registration declarations. A cross-domain canonical projection registry is prohibited.

### 3.4 `control-plane`

| Package | Band | Kind | Persistence | Criticality | Admission state | Admitted capability |
| --- | --- | --- | --- | --- | --- | --- |
| `@afenda/auth` | `control-plane` | `CLOSED` | `NONE` | C1 | `PROVISIONAL` | Authentication session integration, organization identity, and Neon Auth boundary |
| `@afenda/admin` | `control-plane` | `CLOSED` | `NONE` | C1 | `PROVISIONAL` | Administrative operator capability and platform control surfaces |

### 3.5 Prohibited packages

The following package categories are prohibited:

`@afenda/kernel` · `@afenda/shared` · `@afenda/common` · `@afenda/utils` · `@afenda/core` · `@afenda/types` · `@afenda/registry` · any package whose admitted capability is merely “shared code” · any canonical cross-domain registry package.

---

## 4. Admission contract

A frozen admission contract must exist no later than the first commit that introduces production source. No production source may merge before admission approval is recorded.

Every admission contract records:

1. Package name and physical path.
2. Band.
3. Kernel kind.
4. Persistence mode.
5. Criticality.
6. Package owner.
7. Architecture owner.
8. Security owner when C1.
9. One-sentence admitted capability.
10. Explicit non-ownership.
11. Accepted production consumers.
12. Permitted runtime targets and auxiliary entrypoints.
13. Authorized dependency edges.
14. Applicability triggers.
15. Compatibility profile.
16. Four admission decisions:
    - ownership;
    - policy neutrality;
    - jurisdiction portability;
    - reuse portability.

A package fails admission when its capability cannot be stated as exactly one bounded reusable capability without “and unrelated capability” composition.

---

## 5. Package topology

A directory exists only when its registered responsibility exists. Decorative, empty, placeholder, or future-use directories are prohibited.

| Path | Class | Trigger | Permitted content | Prohibited content |
| --- | --- | --- | --- | --- |
| `src/index.ts` | M | Always | Explicit named exports for the default public capability | Logic, side effects, wildcard exports |
| `src/contract/` | M | Always | Canonical definitions, brands, derived public types, compatibility declarations | I/O, mutable clients, tenant policy |
| `src/capabilities/` | M | Runtime or compile-time operations exist | Representation-safe operations and projections | Storage access, request-global state |
| `src/ingress/` | C | Untrusted, external, serialized, vendor, or alias-bearing input is accepted | Validation, parsing, alias tables, vendor normalization | Business policy, direct storage |
| `src/internal/` | C | Private composition spans modules | Private implementation modules | Any symbol reachable through a declared package export |
| `src/store/` | C | Persistence mode is `INJECTED` or `OWNED` | Narrow store capability contracts | Bounded-context policy |
| `src/adapters/` | C | The package ships a store, sink, runtime, or transport implementation | Registered implementations | Canonical definitions, business policy |
| `src/generated/` | C | Generated source or static data exists | Deterministically generated projections with provenance | Manually maintained canonical definitions |
| `src/runtime/<target>/` | C | Runtime-specific composition is required | Target-isolated implementation | Cross-target imports that violate §7 |
| `__tests__/` | M | Always | Behavior, rejection, property, parity, boundary, and compatibility contracts | Production-only hidden dependencies |
| `scripts/` | C | Generation or package-specific deterministic checks exist | Deterministic generation and verification | Unbounded or non-reproducible output |

Internal TypeScript modules may export symbols to other internal modules. Privacy is defined by package reachability, not by the presence of the TypeScript `export` keyword.

---

## 6. Contract and facade policy

### 6.1 Default entrypoint

`"."` is the sole default business-capability entrypoint.

The default entrypoint must:

- expose the admitted capability only;
- use explicit named exports;
- exclude raw clients, SQL, mutable adapter instances, package-internal registries, and storage implementations;
- preserve the package’s registered runtime target;
- resolve in both runtime and downstream TypeScript verification.

### 6.2 Auxiliary entrypoints

An auxiliary entrypoint is conditional, not a waiver. It is permitted only for:

- runtime isolation;
- tooling isolation;
- testing utilities;
- generated static artifacts;
- composition-only adapter contracts.

Every auxiliary entrypoint must record:

1. Named isolation reason.
2. Accepted consumer class.
3. Permitted runtime target.
4. Explicit non-overlap with the default business capability.
5. Independent resolution, boundary, and bundle-isolation tests.

Examples may include:

`./node` · `./browser` · `./edge` · `./tooling` · `./testing` · `./adapter-contract` · `./generated/<artifact>`

A convenience, legacy, versioned, deprecated, or duplicate business entrypoint is prohibited.

---

## 7. Dependency and runtime boundary model

### 7.1 Band dependency matrix

| Importer ↓ / Dependency → | `foundation` | `runtime` | `data-plane` |
| --- | ---: | ---: | ---: |
| `foundation` | Registered edge only | Prohibited | Prohibited |
| `runtime` | Permitted by registered edge | Registered edge only | Prohibited |
| `data-plane` | Permitted by registered edge | Permitted by registered edge | Registered edge only |

All dependency edges must be authorized in both `package.json` and the workspace-edge register.

### 7.2 Universal boundary rules

- No import from `apps/*`.
- Cross-package imports use package names and declared exports only.
- No direct or transitive package cycle.
- No UI, React, Next.js, route, request, or presentation dependency.
- No process-global singleton that carries tenant, actor, request, transaction, clock, or mutable adapter state.
- Browser, edge, Node, pure, and tooling code remain isolated by declared entrypoint.
- `@afenda/env` is imported only through registered runtime edges.
- A package may not obtain a capability by reaching into another package’s internal path.

### 7.3 Foundation purity

The default entrypoint of a `foundation` package performs no network, filesystem, database, environment, or process-global I/O.

Clock, entropy, locale, or host-runtime dependencies must be either:

- explicit input capabilities; or
- isolated behind a registered runtime-specific auxiliary entrypoint.

Uncontrolled ambient clock or randomness is prohibited.

---

## 8. Requirement register

### 8.1 Identity and admission — `KRN-ID`

| ID | Requirement | Class | Method |
| --- | --- | --- | --- |
| KRN-ID-001 | Package name is `@afenda/<kebab-name>` | M | A |
| KRN-ID-002 | `private: true` and `type: "module"` are declared | M | A |
| KRN-ID-003 | Band, kind, persistence mode, criticality, owners, capability, consumers, and runtime targets are recorded | M | A, I |
| KRN-ID-004 | Ownership, policy-neutrality, jurisdiction-portability, and reuse-portability admission decisions are recorded as PASS | M | I |
| KRN-ID-005 | Exactly one bounded reusable capability is admitted | M | I |
| KRN-ID-006 | Admission contract exists in the first commit introducing production source and precedes merge approval | M | A, I |
| KRN-ID-007 | Every dependency edge is authorized in `package.json` and the workspace-edge register | M | A |
| KRN-ID-008 | Physical path matches the workspace package register | M | A |
| KRN-ID-009 | Package metadata is parity-checked against the admission and workspace registers | M | A, T |

### 8.2 Semantic ownership — `KRN-OWN`

| ID | Requirement | Class | Method |
| --- | --- | --- | --- |
| KRN-OWN-001 | Exactly one canonical owner exists per governed term; duplicate interpretation is prohibited | M | A, I |
| KRN-OWN-002 | No vocabulary owned by a bounded business context is re-owned by the kernel | M | I |
| KRN-OWN-003 | No organization-specific, customer-specific, or workflow-specific policy disposition is encoded | M | I, T |
| KRN-OWN-004 | Jurisdictional or industry-standard facts may be represented, but legal, tax, accounting, eligibility, or process conclusions are prohibited | M | I, T |
| KRN-OWN-005 | Public types are derived from canonical definitions; separately maintained unions or maps are prohibited | M | A, T |
| KRN-OWN-006 | Identifier uniqueness and referential integrity are validated at composition | C | T |
| KRN-OWN-007 | Canonical definitions contain no live client, transaction, store instance, mutable adapter, request state, secret, or environment instance | M | A |
| KRN-OWN-008 | Entity-specific relationships are absent; only universal relationships required by the admitted capability are modeled | M | I |
| KRN-OWN-009 | The package owns only universal representation, validation, calculation, coordination, or infrastructure semantics within its admitted capability | M | I |

Trigger for `KRN-OWN-006`: the package composes multiple definitions or references between definitions.

### 8.3 Contract and facade — `KRN-CTR`

| ID | Requirement | Class | Method |
| --- | --- | --- | --- |
| KRN-CTR-001 | `"."` is the sole default business-capability entrypoint | M | A |
| KRN-CTR-002 | Every auxiliary entrypoint satisfies §6.2 and is registered | C | A, T, I |
| KRN-CTR-003 | No public export exposes a raw client, SQL object, mutable adapter instance, storage implementation, or internal registry representation | M | A, T |
| KRN-CTR-004 | Public outcomes reuse canonical brands and `@afenda/errors` `Result` where failure is representable | M | A |
| KRN-CTR-005 | Internal representation change requires zero production-consumer edits | M | D |
| KRN-CTR-006 | Public contract changes are additive within a major version unless an approved breaking-change record exists | M | A, I |
| KRN-CTR-007 | No duplicate `v2`, deprecated, singleton, shim, convenience, or compatibility business surface exists | M | A |
| KRN-CTR-008 | Runtime and downstream TypeScript resolution pass for every declared entrypoint | M | T |
| KRN-CTR-009 | Production consumers import only registered entrypoints | M | A |

Trigger for `KRN-CTR-002`: one or more auxiliary entrypoints are declared.

### 8.4 Ingress — `KRN-ING`

Applies when `src/ingress/` is triggered.

| ID | Requirement | Class | Method |
| --- | --- | --- | --- |
| KRN-ING-001 | External values enter the package typed as `unknown` or as an explicitly trusted internal brand | M | A |
| KRN-ING-002 | Each external value is parsed once; internal use is typed, discriminated, and exhaustive | M | A, I |
| KRN-ING-003 | Aliases live beside ingress and normalize immediately | C | I |
| KRN-ING-004 | Legacy aliases are not accepted for new construction | C | T |
| KRN-ING-005 | Aliases are never emitted | C | T |
| KRN-ING-006 | Hostile input returns a canonical `Result` failure without escaping throw | M | T |
| KRN-ING-007 | Every successful output path emits canonical-only values | M | T |
| KRN-ING-008 | Vendor values normalize once at the package boundary | C | T |
| KRN-ING-009 | Input byte, depth, count, and recursion bounds are declared for structured external payloads | C | T, A |

Alias requirements trigger when aliases exist. Vendor normalization triggers when vendor values exist. Structured-input bounds trigger when nested, collection, or serialized payloads are accepted.

### 8.5 Projections and generation — `KRN-PRJ`

Applies when derived types, maps, schemas, registries, static datasets, or generated artifacts exist.

| ID | Requirement | Class | Method |
| --- | --- | --- | --- |
| KRN-PRJ-001 | Every derived type, map, schema, and artifact has exact parity with its canonical owner | M | T |
| KRN-PRJ-002 | Generated artifacts identify their source and generator version | M | A |
| KRN-PRJ-003 | No manually synchronized projection exists | M | A |
| KRN-PRJ-004 | Parity failure blocks the build | M | A |
| KRN-PRJ-005 | Regeneration is byte-identical on unchanged input | M | A, T |
| KRN-PRJ-006 | Generated output is treated as derived and cannot become an independent authority | M | A, I |

### 8.6 Boundary — `KRN-BND`

| ID | Requirement | Class | Method |
| --- | --- | --- | --- |
| KRN-BND-001 | Imports conform to the band matrix in §7.1 | M | A |
| KRN-BND-002 | No import from `apps/*` exists | M | A |
| KRN-BND-003 | Cross-package imports use package names and declared exports only | M | A |
| KRN-BND-004 | Foundation default entrypoints satisfy §7.3 | M | A, T |
| KRN-BND-005 | No framework, UI, route, or Next.js dependency exists | M | A |
| KRN-BND-006 | `@afenda/env` is imported only where a registered edge and runtime target permit it | M | A |
| KRN-BND-007 | Pure, browser, edge, Node, and tooling targets remain isolated per entrypoint | C | T, A |
| KRN-BND-008 | No direct or transitive package cycle exists | M | A |
| KRN-BND-009 | No mutable request, tenant, transaction, adapter, clock, or correlation singleton exists | M | A, T |

`KRN-BND-007` triggers when more than one runtime target exists.

### 8.7 Persistent-kernel storage — `KRN-STO`

Applies when persistence mode is `INJECTED` or `OWNED`.

| ID | Requirement | Class | Method |
| --- | --- | --- | --- |
| KRN-STO-001 | Store contract is the narrowest capability sufficient for the admitted kernel behavior | M | I |
| KRN-STO-002 | Every tenant-scoped row carries non-null `organization_id`; global rows require explicit registered classification | M | T, A |
| KRN-STO-003 | Uniqueness is proven at write time within the correct tenant or global scope | M | T |
| KRN-STO-004 | Structural invariants are validated in the write boundary; failure leaves no partial write | M | T |
| KRN-STO-005 | Cache or projection invalidation required by a write occurs within the same transaction boundary or recorded atomic protocol | C | T |
| KRN-STO-006 | Store contracts contain mechanism only and no bounded-context policy | M | I |
| KRN-STO-007 | Persistence mode `NONE` declares no store contract, persistence adapter, or schema ownership | M | A |
| KRN-STO-008 | Memory, fake, and production adapters produce equivalent semantic outcomes where more than one adapter exists | C | T |
| KRN-STO-009 | Transaction, concurrency, retry, and idempotency expectations are explicit in the store contract | M | I, T |
| KRN-STO-010 | Tenant context is bound server-side and cannot be supplied as an untrusted storage predicate | M | T, A |

`KRN-STO-005` triggers when a write affects a cache or projection. `KRN-STO-008` triggers when multiple adapters exist.

### 8.8 Security — `KRN-SEC`

| ID | Requirement | Class | Method |
| --- | --- | --- | --- |
| KRN-SEC-001 | Secrets, protected data, vendor payloads, and private diagnostics cannot reach public projections | M | T, A |
| KRN-SEC-002 | Internal error causes and unsafe diagnostic detail are not exposed publicly | M | T |
| KRN-SEC-003 | Diagnostics redact according to the canonical privacy disposition | C | T |
| KRN-SEC-004 | Dependency vulnerability scan is clean at `high` and above, or a registered non-waiverable remediation block exists | M | A |
| KRN-SEC-005 | SBOM is produced and attached to the verification record | M | A |
| KRN-SEC-006 | Dynamic code evaluation is prohibited | M | A |
| KRN-SEC-007 | C1 packages carry an approved threat-model review | C | I |
| KRN-SEC-008 | Security-sensitive public decisions are fail-closed | C | T |
| KRN-SEC-009 | Authorization, tenancy, identity, and audit boundaries have negative-path tests | C | T |

Diagnostics requirements trigger when diagnostics exist. C1 requirements trigger for C1 packages. Decision requirements trigger when the package produces security-sensitive decisions.

### 8.9 Quality — `KRN-QUA`

| ID | Requirement | Class | Method |
| --- | --- | --- | --- |
| KRN-QUA-001 | Every exported capability has a behavior or compile-time contract test | M | T |
| KRN-QUA-002 | Every ingress path has rejection tests | C | T |
| KRN-QUA-003 | Every projection has a parity test | C | T |
| KRN-QUA-004 | Arithmetic, conversion, allocation, parser, authorization, and state-transition behavior has property or fuzz coverage | C | T |
| KRN-QUA-005 | Every exported symbol is exercised by a contract, behavior, or compile-consumer test | M | A, T |
| KRN-QUA-006 | Branch coverage is at least 90% for C1, 80% for C2, and 70% for C3 | M | A |
| KRN-QUA-007 | Lint and typecheck pass with no unregistered suppression | M | A |
| KRN-QUA-008 | No `any`, non-null assertion, or unchecked widening cast exists on a public path | M | A |
| KRN-QUA-009 | Tests have no uncontrolled wall clock, randomness, network, filesystem, process-global, or execution-order dependency | M | A, T |
| KRN-QUA-010 | C1 arithmetic, allocation, authorization, parser, retry, idempotency, and state-transition logic achieves mutation score ≥ 70% with no surviving critical mutant | C | A |
| KRN-QUA-011 | Narrowing assertions occur only after a tested runtime invariant or through an approved assertion helper | C | A, T |

A suppression is registered only when it has a reason code, owner, scope, expiry, and validating governance rule. C1 public paths may declare suppression categories as entirely prohibited.

### 8.10 Non-functional criteria — `KRN-NFR`

| ID | Requirement | Class | Method |
| --- | --- | --- | --- |
| KRN-NFR-001 | Every material capability class has an applicable complexity, size, throughput, or controlled latency budget | M | T, A |
| KRN-NFR-002 | Every runtime entrypoint has a declared bundle-size budget asserted in CI | C | A |
| KRN-NFR-003 | Pure capabilities produce semantically identical output from identical explicit input | C | T |
| KRN-NFR-004 | Nondeterministic dependencies are explicit, injectable or target-isolated, and controllable in tests | C | T, A |
| KRN-NFR-005 | Externally reachable collection, recursion, serialization, or allocation behavior has explicit input and complexity bounds | C | T, A |
| KRN-NFR-006 | Serialization is versioned, bounded, canonical, and hostile-input tested | C | T |
| KRN-NFR-007 | The package declares source, runtime, wire, stored-data, and generated-artifact compatibility applicability | M | I |
| KRN-NFR-008 | Each applicable compatibility dimension is maintained for the declared support window and verified against fixtures or consumers | C | T, D |
| KRN-NFR-009 | Wall-clock performance gates run only on controlled benchmark infrastructure; shared-CI checks use deterministic proxy budgets | C | A, T |

Pure determinism triggers for pure capabilities. Controlled nondeterminism triggers when clock, entropy, host runtime, concurrency, or I/O affects the result. Bundle budgets trigger for runtime entrypoints. Serialization and compatibility checks trigger by the package’s declared profile.

### 8.11 Release and documentation — `KRN-REL`, `KRN-DOC`

| ID | Requirement | Class | Method |
| --- | --- | --- | --- |
| KRN-REL-001 | Version-bump classification is recorded and matches the public diff | M | A |
| KRN-REL-002 | A breaking change carries an approved consumer-migration plan before merge | M | I, A |
| KRN-REL-003 | Content digest, export list, dependency snapshot, compatibility result, and working-tree state are recorded at verification and seal | M | I, A |
| KRN-REL-004 | Changed source, export, dependency, generated artifact, or configuration invalidates verification for the new digest | M | A |
| KRN-DOC-001 | README covers ownership, non-ownership, consumption, maintenance, runtime targets, and prohibitions | M | I |
| KRN-DOC-002 | Every exported symbol carries usable documentation | M | A |
| KRN-DOC-003 | Rejected-design list is present and current | M | I |
| KRN-DOC-004 | Package topology and entrypoints documented in the README match disk and `package.json` | M | A, I |

Breaking changes are not waiverable merely because they are planned. A waiver may apply only to a specifically `W`-classified implementation control, not to the requirement for migration planning.

---

## 9. Lifecycle state machine

### 9.1 `SCAFFOLDED`

All of the following must pass:

- Admission contract frozen and matching disk.
- Workspace package register entry complete.
- Workspace-edge register complete.
- Required topology present with no empty or decorative directory.
- `KRN-ID-*` applicable requirements.
- `KRN-BND-*` applicable requirements.
- `package.json`, `tsconfig.json`, README, test command, lint command, and typecheck command exist.
- Lint, typecheck, and initial tests execute and pass.
- No placeholder runtime path, stub return, TODO behavior branch, or deferred deletion exists.
- Inspector snapshot recorded.

### 9.2 `IMPLEMENTED`

All of the following must pass:

- `SCAFFOLDED` remains valid.
- Every applicable mandatory requirement in `KRN-OWN`, `KRN-CTR`, `KRN-ING`, `KRN-PRJ`, and `KRN-STO`.
- Every exported capability has behavior or contract tests.
- Every ingress path has rejection tests.
- Every projection has parity tests.
- Required adapters and adapter-equivalence tests are complete.
- No capability returns a value not derivable from canonical definitions or admitted mechanism state.
- Consumer compile checks pass for every declared consumer.

### 9.3 `VERIFIED`

All of the following must pass in one evidence-complete CI run:

- `IMPLEMENTED` remains valid.
- Every applicable mandatory requirement in §8.
- Quality thresholds for the declared criticality.
- Non-functional budgets for the declared capability profile.
- Security requirements, SBOM, and C1 threat-model approval where applicable.
- `KRN-CTR-005` internal-refactor demonstration.
- Every active waiver is valid, dual-controlled, unexpired, and linked to a `W` requirement.
- No gate is skipped.
- Final content digest and evidence register are complete.

### 9.4 Regression

- Any source, export, dependency, generated artifact, package configuration, admission contract, or workspace-register change creates a new digest and invalidates `VERIFIED` for that new revision.
- A failed applicable `VERIFIED` requirement regresses the current revision to `IMPLEMENTED`.
- A failed applicable `IMPLEMENTED` requirement regresses the current revision to `SCAFFOLDED`.
- A failed identity, admission, or boundary requirement makes the package `NONCONFORMING`; the package may remain physically present but cannot claim `SCAFFOLDED`.
- Regression does not erase historical evidence or historical seals.

---

## 10. Gate model

### 10.1 Gate matrix

| Gate | Earliest stage blocked | Command |
| --- | --- | --- |
| Inspector | `SCAFFOLDED` | `node .cursor/skills/afenda-elite-kernel/scripts/inspect-target.mjs packages/<band>/<pkg>` |
| Registry parity | `SCAFFOLDED` | `pnpm governance:kernel-registry --package @afenda/<pkg>` |
| Dependency boundary | `SCAFFOLDED` | `pnpm governance:packages --package @afenda/<pkg>` |
| Lint | `SCAFFOLDED` | `pnpm --filter @afenda/<pkg> lint` |
| Typecheck | `SCAFFOLDED` | `pnpm --filter @afenda/<pkg> typecheck` |
| Tests | `IMPLEMENTED` | `pnpm --filter @afenda/<pkg> test` |
| Projection parity | `IMPLEMENTED` | `pnpm --filter @afenda/<pkg> verify:projections` |
| Adapter parity | `IMPLEMENTED` | `pnpm --filter @afenda/<pkg> verify:adapters` |
| Consumer compile | `IMPLEMENTED` | `pnpm verify:consumers @afenda/<pkg>` |
| Coverage | `VERIFIED` | `pnpm --filter @afenda/<pkg> test:coverage` |
| Mutation | `VERIFIED` | `pnpm --filter @afenda/<pkg> test:mutation` |
| Entrypoint isolation | `VERIFIED` | `pnpm --filter @afenda/<pkg> verify:entrypoints` |
| Budgets | `VERIFIED` | `pnpm --filter @afenda/<pkg> verify:budgets` |
| Compatibility | `VERIFIED` | `pnpm --filter @afenda/<pkg> verify:compatibility` |
| Security | `VERIFIED` | `pnpm audit:deps && pnpm sbom && pnpm verify:threat-model @afenda/<pkg>` |
| Evidence completeness | `VERIFIED` | `pnpm governance:kernel-evidence --package @afenda/<pkg>` |
| Seal | Seal issuance | `pnpm governance:kernel-seal --package @afenda/<pkg>` |

A source-pattern scan satisfies `A` only. It never satisfies `T` or `D`.

### 10.2 Requirement-to-gate register

Every requirement must have one machine-readable record containing:

```ts
interface KernelRequirementRegistration {
  readonly id: string;
  readonly requirementClass: "M" | "C" | "W";
  readonly methods: readonly ("T" | "A" | "I" | "D")[];
  readonly applicability: KernelApplicabilityExpression;
  readonly gates: readonly KernelGateId[];
  readonly evidenceKinds: readonly KernelEvidenceKind[];
  readonly accountableOwner: KernelGovernanceOwner;
  readonly invalidatesStage:
    | "SCAFFOLDED"
    | "IMPLEMENTED"
    | "VERIFIED"
    | "SEAL_ONLY";
}
```

The governance system must prove:

- every requirement ID is registered exactly once;
- every applicable requirement maps to at least one executable gate or controlled inspection;
- every gate emits structured evidence;
- every `NOT_APPLICABLE` result records the evaluated trigger;
- no unknown, orphaned, or duplicate requirement exists;
- lifecycle calculation derives from the requirement register rather than from handwritten checklists.

---

## 11. Digest-bound seal

A seal is an immutable attestation, not a mutable lifecycle status.

A seal record contains:

- package;
- admitted capability;
- version;
- commit;
- content digest;
- export list;
- dependency snapshot;
- generated-artifact digests;
- compatibility profile and result;
- CI run identifier;
- evidence-register digest;
- package-owner signature;
- architecture-owner signature;
- security-owner signature when C1;
- issued timestamp;
- status: `VALID`, `SUPERSEDED`, or `REVOKED`.

A new revision does not modify an old seal. It creates a new unverified digest. A later seal supersedes, but does not erase, the earlier seal.

A seal is not release approval, deployment approval, statutory approval, or authorization to migrate production data.

---

## 12. Evidence register

| Artifact | Required at | Retention |
| --- | --- | --- |
| Frozen admission contract | `SCAFFOLDED` | Life of package |
| Workspace package-register record | Every stage | Life of package |
| Workspace-edge record | Every stage | Life of package |
| Inspector snapshot | Every stage | Life of package |
| Requirement applicability result | Every stage | 24 months minimum |
| Gate matrix run: CI id, commit, digest | `VERIFIED` | 24 months minimum |
| Coverage and mutation reports | `VERIFIED` when applicable | 24 months minimum |
| Budget and compatibility outputs | `VERIFIED` | 24 months minimum |
| SBOM and vulnerability scan | `VERIFIED` | 24 months minimum |
| Threat-model review | C1 `VERIFIED` | Life of package |
| Demonstration evidence | When `D` is required | 24 months minimum |
| Waiver record | As issued | Expiry + 12 months |
| Seal record | Seal issuance | Life of package |

Evidence is valid only when it names the package, requirement or gate, commit, content digest, execution result, and producing tool version.

---

## 13. Waiver protocol

Only requirements explicitly classified `W` are waiverable. No `M` or `C` requirement becomes waiverable because it is difficult, expensive, blocked, or not yet automated.

| Field | Requirement |
| --- | --- |
| Authority | Package owner and architecture owner; security owner also signs when the waived control is security-relevant or the package is C1 |
| Content | Requirement ID, package, digest scope, justification, compensating control, accountable owner, issue date, expiry date, invalidated stage |
| Maximum term | 90 days |
| Renewal | New justification, new signatures, and evidence that the compensating control remains effective |
| Register | `packages/WAIVERS.md` and the machine-readable waiver register |
| Effect | On expiry, the current revision regresses to the highest lifecycle stage whose applicable requirements still pass |
| Seal | A seal cannot be issued when an active waiver invalidates sealing |

A waiver not present in both registers does not exist. A waiver for one digest does not automatically apply to another digest.

---

## 14. Sign-off

| Decision | Required signatories | Recorded in |
| --- | --- | --- |
| Admission | Package owner + architecture owner; C1 also security owner | Admission contract |
| `SCAFFOLDED` | Package owner | Package register |
| `IMPLEMENTED` | Package owner | Package register |
| `VERIFIED` C2/C3 | Package owner + architecture owner | Evidence register |
| `VERIFIED` C1 | Package owner + architecture owner + security owner | Evidence register |
| Seal issuance C2/C3 | Package owner + architecture owner | Seal record |
| Seal issuance C1 | Package owner + architecture owner + security owner | Seal record |
| Seal revocation | Architecture owner; C1 also security owner | Seal record |

A person may hold more than one organizational role only when the governance register explicitly permits the combination. Dual-control requirements still require two distinct human approvers.

---

## 15. Normative invariants

The following invariants summarize this governance contract and are independently enforced:

1. One package owns one admitted universal capability.
2. Kernel kind and persistence mode are independent.
3. Every dependency edge is registered and conforms to the band DAG.
4. The default public entrypoint is narrow and runtime-correct.
5. Auxiliary entrypoints exist only for registered isolation or composition reasons.
6. Canonical definitions do not contain live infrastructure or bounded-context policy.
7. External input is normalized once and emitted canonically.
8. Derived artifacts cannot drift from their owner.
9. Persistence is tenant-safe, transaction-safe, and policy-neutral.
10. Nondeterminism is explicit and controllable.
11. Every applicable requirement maps to executable or controlled evidence.
12. Verification belongs to a content digest.
13. A seal attests one digest and never follows later changes.
14. No skipped or unrecorded applicable gate can be treated as success.
15. No waiver can weaken a mandatory requirement.

---

## 16. Enforcement profile taxonomy and authority placement

### 16.1 Canonical authority placement

Kernel package admission, enforcement-profile vocabulary, per-package enforcement declarations, and adoption surface checks live in `governance/kernel/`. Turborepo generators for kernel/ERP scaffolding are retired; do not reintroduce them.

Dependency direction:

1. `governance/kernel/` defines package identity, admission topology, enforcement vocabulary, and declared trust mechanisms.
2. Pure validators (`validateKernelGovernance`) evaluate those declarations plus root-capability adoption surfaces (`src/index.ts`, `exports["."]` via KRN-GOV-011 / KRN-GOV-012).
3. `governance/scripts/check-kernel-governance.mts` (`pnpm check:kernel-governance`) consumes the authority and emits deterministic evidence (also wired into local `pnpm checks`).
4. `packages/KERNEL-GOVERNANCE.md` §3 and `packages/KERNEL-PRD-INDEX.md` are derived projections checked by the gate.

No separate generator owns the register or scaffolds kernel packages toward it.

### 16.2 Enforcement profile vocabulary

Profiles are declared in `governance/kernel/enforcement-profiles.ts`:

| Profile | Meaning |
| --- | --- |
| `root-capability` | Default `"."` entrypoint exposes named capabilities only |
| `nominal-mint` | Branded or sealed mint paths are required to construct authoritative values |
| `runtime-opaque` | Runtime identity uses opaque trust (for example WeakMap-backed seals) |
| `registry-authority` | A frozen in-package registry owns canonical codes or definitions |
| `scoped-capability` | Named capability objects are the only approved consumer surface |
| `projection-boundary` | Projections intentionally strip mint or trust at transport boundaries |

Semantic intent is declared in `governance/kernel/enforcement-contracts.ts`. Structural evidence is validated by package-specific gates and `check:kernel-governance`. Issue codes are the frozen list `KERNEL_GOVERNANCE_ISSUE_CODES` in `governance/kernel/validator.ts` (report schema `afenda.kernel-governance/v2`). Notable codes: `KRN-GOV-009` unregistered enforcement-contract package; `KRN-GOV-010` missing contract for `ADMITTED`; `KRN-GOV-013` unknown profile; `KRN-GOV-014` duplicate profile; `KRN-GOV-015` unknown gate id.
