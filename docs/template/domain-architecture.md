# `<Domain Name>` Architecture

> **Document purpose.**
> This document defines the permanent business boundary, semantic ownership, architectural rules, integration model, and delivery governance for `<domain-name>`.
>
> It is the authoritative architecture document for the domain as a whole. It is not an implementation plan for an individual feature.
>
> Each feature listed in this document requires its own approved `PRD.md` before implementation.

---

## 0. Document control

```yaml
document_id: DOMAIN-ARCH-001
domain_id: <module-id> # kebab-case; equals the manifest `id`
domain_name: <Domain Name>
package: "@afenda/<module-id>"
package_path: packages/erp/<module-id>

status: draft
# draft | review | approved | superseded | retired

version: 0.1.0
owner_domain: <business department or accountable function>
owner_architecture: <architecture owner or team>
approved_by: []
approved_on: null
supersedes: null
last_reviewed_on: null
next_review_due_on: null

tenancy_model: organization-scoped
runtime_model: modular-monolith
public_api: package-root-facade

# The four fields below are projections of `AfendaModuleManifest`
# (packages/data-plane/db/src/module-manifest-contract.ts). They must match
# src/composition/module.manifest.ts exactly — this block is not a second source.
band: R1-F
lifecycle: scaffolded # scaffolded | active | deprecated | retired
activation_mode: organization_toggle # core | organization_toggle
schema_owner: "@afenda/db"
```

### 0.1 Authority

This document is authoritative for:

- the domain mission;
- bounded-context ownership;
- feature classification;
- permanent source structure;
- package dependency direction;
- facade rules;
- cross-feature coordination;
- integration boundaries;
- tenancy and privacy posture;
- domain-wide implementation controls;
- architectural Definition of Done.

This document is not authoritative for:

- individual feature fields;
- feature state machines;
- feature-specific operations;
- feature-specific permissions;
- database columns;
- migration identifiers;
- frontend screen details;
- implementation status;
- verification evidence.

Those belong to individual feature PRDs, implementation records, source code, tests, and evidence.

### 0.2 Authority precedence

When two artifacts conflict, apply the following precedence:

1. Repository-wide architectural decisions and package policies.
2. This domain architecture.
3. Approved individual feature PRDs.
4. Approved domain or feature decision records.
5. Implementation-slice plans.
6. Source code and tests.
7. Generated inventories and README summaries.
8. Historical evidence.

A lower-level artifact may implement or prove a higher-level requirement. It may not silently override it.

A contradiction with a higher authority blocks the affected implementation slice until:

- the lower-level artifact is corrected; or
- the higher-level authority is formally amended or superseded.

### 0.3 Repository binding

This template is generic in shape but bound to this repository's canonical vocabulary. Where a term below is given, use it verbatim — a synonym is a defect, not a style choice.

| Concept                        | Canonical term in this repository                                      | Authority                                                      |
| ------------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| Package scope                  | `@afenda/<module-id>`                                                  | root `package.json`, `AfendaModuleManifest.packageName`        |
| Domain unit at runtime         | **module** (`id`, `moduleId`)                                          | `packages/data-plane/db/src/module-manifest-contract.ts`       |
| Module manifest                | `src/composition/module.manifest.ts` satisfying `AfendaModuleManifest` | same                                                           |
| Result type                    | `Result<Data, Code>` from `@afenda/errors`, discriminant `ok`          | `packages/foundation/errors/src/public-types.ts`               |
| Error identity                 | `CanonicalErrorCode` union                                             | `packages/foundation/errors/src/contract/registry.ts`          |
| Production persistence adapter | **Drizzle** — `<feature>.drizzle.ts`                                   | `packages/erp/*/src/features/**/adapters/`                     |
| Schema and migration owner     | `@afenda/db`                                                           | `AfendaModuleManifest.persistence.schemaOwner` (typed literal) |
| Tenant column                  | `organization_id` (SQL) · `organizationId` (Drizzle)                   | `packages/data-plane/db/src/schema/**`                         |
| Hard tenant root registry      | `packages/data-plane/db/src/hard-tenant-roots.ts`                      | ARCH-023                                                       |
| Dependency authorization | `docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml` | ARCH-024 |
| Schema write-ownership | `docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml` | — |
| Design system                  | `@afenda/ui-system` (sole UI import surface)                           | `CLAUDE.md` / `AGENTS.md` hard stops                           |
| Configuration                  | `@afenda/env` — never raw `process.env` for product config             | same                                                           |

Two words are overloaded in this repository. Use the qualified form in this document:

- **kernel** — _module kernel_ means `src/kernel/` inside one ERP package (this document's §8.2). It is unrelated to the _kernel package family_ (`packages/{foundation,runtime,data-plane,control-plane}`, see `packages/KERNEL-SCAFFOLDING.md`) and to the `kernel-generator`.
- **domain** — used here for the business boundary. The runtime and manifest term for the same unit is **module**. Prefer _module_ in code, identifiers, and manifests; _domain_ only in business prose.

> **Working-tree caveat.** `docs-V2/**` is currently deleted in the working tree, so the workspace-edge and schema-ownership registers resolve only at `HEAD` (`git show HEAD:docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml`). Re-point these paths when the Docs lane reopens.

---

# 1. Executive architecture decision

## 1.1 Recommendation

Approve `<Domain Name>` as the `<tenancy model>` system of record for:

1. `<primary responsibility>`;
2. `<primary responsibility>`;
3. `<primary responsibility>`;
4. `<primary responsibility>`;
5. `<primary responsibility>`.

The domain provides governed records and operations required for `<business outcome>`.

## 1.2 Architecture style

```yaml
architecture_style: feature-first-modular-monolith
semantic_owner: individual-feature
feature_group_role: classification-only
execution_policy_owner: module-kernel # src/kernel/ — not the kernel package family
composition_owner: module-composition-layer
consumer_entrypoint: package-root-facade
persistence_boundary: feature-owned-store-contract
relational_authority: "@afenda/db"
```

## 1.3 Permanent architecture statement

> `<Domain Name>` is the `<business owner>` system of record for `<complete but concise scope statement>`.

## 1.4 Permanent ownership principle

> Feature groups organize the domain. Individual features own business meaning. The operation registry governs execution. The package facade protects consumers. External domains own their own financial, technical, personnel, operational, legal, and regulatory consequences.

---

# 2. Domain mission

## 2.1 Mission

`<Domain Name>` exists to ensure that:

- `<required business condition>`;
- `<required business condition>`;
- `<required business condition>`;
- `<required business condition>`.

## 2.2 Business accountability

The primary accountable business function is:

```text
<department, function, or operational owner>
```

Supporting stakeholders include:

| Stakeholder     | Relationship to domain                              |
| --------------- | --------------------------------------------------- |
| `<stakeholder>` | `<creates, maintains, approves, reviews, consumes>` |
| `<stakeholder>` | `<relationship>`                                    |
| `<stakeholder>` | `<relationship>`                                    |

## 2.3 Business outcomes

The domain should produce measurable improvements in:

| Outcome                        | Expected improvement          |
| ------------------------------ | ----------------------------- |
| Record completeness            | `<target or expected effect>` |
| Processing consistency         | `<target or expected effect>` |
| Control effectiveness          | `<target or expected effect>` |
| Renewal or deadline visibility | `<target or expected effect>` |
| Audit readiness                | `<target or expected effect>` |
| Operational accountability     | `<target or expected effect>` |

## 2.4 Domain success indicators

Domain-wide indicators may include:

- percentage of active records with complete required evidence;
- percentage of upcoming obligations assigned to an accountable owner;
- overdue obligations by severity;
- records with unresolved ownership;
- exceptions remaining beyond service-level targets;
- failed or incomplete lifecycle transitions;
- rejected cross-tenant access attempts;
- adapter-parity and architecture-gate status.

These are domain health indicators. Individual feature KPIs belong in their feature PRDs.

---

# 3. Bounded-context definition

## 3.1 Domain boundary

The domain owns facts whose primary meaning is:

```text
<define the shared semantic purpose of the domain>
```

The domain may reference foreign records where necessary, but it must not duplicate or reinterpret another domain’s authoritative business meaning.

## 3.2 Ownership test

A record or operation belongs to this domain when most of the following are true:

1. The accountable business owner for the record belongs to this domain.
2. The record persists beyond a single transaction or workflow execution.
3. The record has a domain-specific lifecycle.
4. The domain is accountable for its correctness and chronology.
5. Other modules can reference the record without owning its meaning.
6. The record requires domain-specific custody, approval, renewal, assignment, evidence, or assurance.
7. Failure to maintain it is primarily a failure of this domain.

A proposed capability that does not satisfy the ownership test must not be added merely because it is convenient.

## 3.3 Inclusion criteria

This domain may own:

- records directly maintained by `<business owner>`;
- lifecycle decisions within the domain mandate;
- domain-specific chronology;
- governed assignments and relationships;
- administrative or operational evidence;
- authoritative domain statuses;
- domain-specific obligations and controls;
- stable references to foreign records.

## 3.4 Exclusion criteria

This domain must not own a record when its primary purpose is:

- general-ledger recognition;
- payment settlement;
- procurement transaction execution;
- employee or payroll administration;
- investor or securities administration;
- technical identity or security configuration;
- production execution;
- inventory quantity management;
- tax calculation;
- legal advice or litigation strategy;
- generic file storage;
- analytics-only projection.

## 3.5 Governed references

The domain may retain:

- opaque identifiers;
- stable external references;
- source-system identifiers;
- reference type;
- source module;
- display-safe labels where explicitly allowed;
- reference status snapshots only when the stale-data policy is defined.

The domain must not copy:

- foreign lifecycle state as its own state;
- foreign accounting values;
- security credentials;
- another module’s approval decision;
- mutable foreign business rules;
- sensitive data not required for this domain’s purpose.

---

# 4. Domain terminology

## 4.1 Ubiquitous language

Terms defined here apply across feature PRDs, source code, events, UI, documentation, and analytics.

| Term     | Canonical meaning        | Forbidden or misleading alternatives |
| -------- | ------------------------ | ------------------------------------ |
| `<term>` | `<exact domain meaning>` | `<synonyms not to use>`              |
| `<term>` | `<exact domain meaning>` | `<synonyms not to use>`              |
| `<term>` | `<exact domain meaning>` | `<synonyms not to use>`              |

## 4.2 Naming rules

- One business concept has one canonical name.
- A synonym is not introduced merely to match another ERP product.
- Record names use singular nouns.
- Feature identifiers use kebab-case.
- Operation identifiers use the repository’s canonical operation convention.
- Event names describe completed facts in past tense.
- Permission identifiers describe domain and capability.
- Database names follow the relational authority’s naming policy.
- UI language must not redefine backend terminology.

## 4.3 Terminology changes

Changing a canonical domain term requires:

1. an approved decision record;
2. impact analysis across features, events, APIs, migrations, UI, and documentation;
3. a compatibility or migration plan;
4. explicit supersession of the former term.

---

# 5. Capability and feature model

## 5.1 Capability groups

A feature group is a classification and navigation boundary. It is not a runtime owner.

| Feature group     | Purpose                    |
| ----------------- | -------------------------- |
| `<feature-group>` | `<classification purpose>` |
| `<feature-group>` | `<classification purpose>` |
| `<feature-group>` | `<classification purpose>` |

## 5.2 Feature inventory

| Feature group | Feature     | Semantic responsibility    | Lifecycle status |
| ------------- | ----------- | -------------------------- | ---------------- |
| `<group>`     | `<feature>` | `<one-sentence ownership>` | planned          |
| `<group>`     | `<feature>` | `<one-sentence ownership>` | planned          |
| `<group>`     | `<feature>` | `<one-sentence ownership>` | planned          |

Allowed lifecycle reporting:

```yaml
spec_status:
  values:
    - not-started
    - draft
    - review
    - approved
    - superseded

implementation_status:
  values:
    - not-started
    - active
    - complete

verification_status:
  values:
    - unverified
    - blocked
    - verified

activation_status:
  values:
    - inactive
    - pilot
    - active
    - suspended

enterprise_status:
  values:
    - not-assessed
    - blocked
    - ready
```

These dimensions must not be collapsed into one misleading status.

They are also **document-level reporting dimensions only**. Exactly one status is executable, and it is narrower:

```yaml
# AfendaModuleManifest.lifecycle — the only status the runtime reads
manifest_lifecycle:
  values: [scaffolded, active, deprecated, retired]
```

Rules:

- `manifest_lifecycle: active` requires `verification_status: verified` and an approved activation decision. A directory that compiles is `scaffolded`.
- The reporting dimensions above must never be written into `module.manifest.ts`; the manifest has no field for them.
- `activation_status` is operational state per organization and is governed by `activationMode` (`core` | `organization_toggle`), not by the manifest lifecycle.

## 5.3 Feature ownership rule

Each individual feature owns:

- its terminology;
- public business contracts;
- input schemas;
- business rules;
- lifecycle state machine;
- commands and queries;
- feature error codes;
- domain events;
- persistence contract;
- required ports;
- memory adapter;
- Drizzle adapter;
- feature tests.

A feature group may own only:

- identifier and label;
- feature-membership projection;
- documentation classification;
- frontend navigation classification;
- completeness validation.

## 5.4 Feature eligibility rule

A planned feature is eligible for implementation only when:

- its ownership is approved;
- its exclusions are explicit;
- its dependencies are available or intentionally scheduled;
- its individual PRD is approved;
- its implementation manifest is complete;
- blocking decisions are resolved;
- the preceding required phase gates are green.

A directory, placeholder file, generated menu item, or database table does not make a feature implemented.

---

# 6. Ownership matrix

## 6.1 Domain ownership

| Business fact or action | This domain | External owner | Relationship              |
| ----------------------- | ----------: | -------------- | ------------------------- |
| `<fact>`                |        Owns | —              | Authoritative             |
| `<fact>`                |  References | `<domain>`     | Opaque governed reference |
| `<fact>`                |       Emits | `<domain>`     | Other domain reacts       |
| `<fact>`                |    Excluded | `<domain>`     | No storage or mutation    |

## 6.2 Cross-domain boundaries

| External domain    | Owns                                | This domain may                              | This domain must not                   |
| ------------------ | ----------------------------------- | -------------------------------------------- | -------------------------------------- |
| Accounting         | Financial recognition               | Emit facts, reference entries                | Post ledgers or calculate balances     |
| Purchasing         | Requisitions and purchase orders    | Reference procurement records                | Create or mutate purchase orders       |
| Payments           | Settlement                          | Reference payment outcomes                   | Initiate or record settlement as owner |
| Human Resources    | Employee lifecycle                  | Reference person or employment identity      | Duplicate employee records             |
| IT or Identity     | Technical accounts and provisioning | Emit provisioning requests or references     | Store credentials or technical secrets |
| Investor Relations | Investors and securities            | Reference an approved entity where necessary | Store investor or holding information  |
| Document platform  | Binary files and storage            | Store governed file references               | Become generic file storage            |

Replace or extend this table according to the domain.

## 6.3 Conflict-resolution rule

When two features or domains appear to own the same fact:

1. identify who is accountable for correctness;
2. identify which lifecycle gives the fact meaning;
3. identify which module can expose it without copying another lifecycle;
4. assign one authoritative owner;
5. define references, events, or projections for all other consumers;
6. record the decision.

Shared ownership of mutable business meaning is prohibited.

---

# 7. Permanent source architecture

## 7.1 Package structure

Specifications live outside the package; production source lives inside it.

```text
docs/erp/<module-id>/                    # specifications — not shipped
├── <module-id>-architecture.md          # this document
├── <module-id>-prd.md
├── decisions/
├── feature-specs/
│   └── <feature-group>/
│       └── <feature>/
│           ├── PRD.md
│           ├── IMPLEMENTATION-SLICES.md
│           └── evidence/
└── runbooks/

packages/erp/<module-id>/                # production source
├── package.json
├── tsconfig.json
├── README.md
│
├── src/
│   ├── index.ts                         # begins `import "server-only";`
│   ├── facade/
│   ├── kernel/                          # module kernel
│   ├── composition/
│   │   └── module.manifest.ts           # satisfies AfendaModuleManifest
│   ├── features/
│   │   └── <feature-group>/
│   │       ├── group.definition.ts
│   │       └── <feature>/
│   └── testing/
│
├── __tests__/
│   ├── architecture/
│   ├── facade/
│   ├── registry/
│   ├── authorization/
│   ├── tenancy/
│   ├── privacy/
│   ├── atomicity/
│   ├── idempotency/
│   ├── emissions/
│   ├── adapter-parity/
│   └── consumer-contracts/
│
└── scripts/                             # module-specific projections only
```

Notes:

- The `__tests__/` subdirectories are concern labels, not mandatory directories. Create one when it holds a real suite.
- **Do not add local layout, ownership, or deep-import checkers under `scripts/`.** Layout and structural governance are owned by the ERP generator (`turbo/generators/erp-generator/`); a local `feature-first-layout.mjs` is reported as superseded (`AFG-ERP-103`). Run `pnpm gen:doctor:erp` instead. `scripts/` is for projections the shared generator does not already own.
- Feature PRDs must not live inside production source directories.
- `docs-V2/` remains the scratch-ops surface. Placing specifications under `docs/erp/<module-id>/` matches current practice (`docs/erp/corporate-administration/`).

## 7.2 Permanent feature rule

```text
src/features/<feature-group>/<feature>/<files>
```

The four levels are:

1. `features`;
2. feature group;
3. individual feature;
4. semantic files and directories owned by that feature.

## 7.3 Standard feature capsule

```text
<feature>/
├── index.ts                  # private projection when composition needs it
├── operation-registry.ts     # canonical operation definitions — present in every feature
├── run-operation.ts          # feature execution entrypoint, where the kernel protocol is used
├── schema.ts                 # ingress validation derived from owned contracts
├── policy.ts                 # authorization / privacy / workflow policy
├── guards.ts                 # invariant enforcement
├── store-contract.ts         # smallest persistence capability
├── <business-noun>.ts        # domain model and use cases, named for the business term
│
├── adapters/
│   ├── <feature>.memory.ts   # semantic-parity adapter
│   └── <feature>.drizzle.ts  # production persistence adapter
│
└── __tests__/
```

This is a default shape, not a requirement to create empty files.

Naming is bound to what the repository actually ships — verify against `packages/erp/human-resources/src/features/leave/` (the exemplar) before inventing a name:

- **`operation-registry.ts`** is the canonical per-feature operation owner. `definition.ts` is not used anywhere in `packages/erp/**`.
- The production adapter is **`drizzle`**, never `relational`. Both flat (`<feature>.drizzle.ts`) and nested (`adapters/<feature>.drizzle.ts`) forms exist; pick one per package and stay consistent.
- **Do not create `commands/` or `queries/` directories.** No ERP package has them. They are the generic layer farm that `packages/erp/ERP-SCAFFOLDING.md` §12 rejects — commands and queries are named for their business meaning and live in the feature root.
- `ports.ts` is normally a _kernel_ or _composition_ surface (`src/kernel/contracts/ports.ts`); add a feature-level `ports.ts` only for a genuinely feature-owned external capability.
- Accounting uses `<feature>.store.ts` where Human Resources uses `store-contract.ts`. Prefer `store-contract.ts` for new work; the contract, not the filename, is what matters.

Rules:

- omit files with no semantic content;
- group small operations when that improves readability;
- split complex operations into dedicated files;
- do not create placeholder directories;
- do not introduce feature-specific infrastructure already provided by the module kernel;
- do not place feature PRDs inside production source directories.

---

# 8. Layer responsibilities

## 8.1 Feature layer

The feature layer owns business meaning.

It may depend on:

- approved foundation contracts;
- domain kernel types intentionally exposed to features;
- its own contracts and ports;
- representation-safe shared primitives.

It must not depend on:

- facade;
- composition;
- testing utilities in production code;
- sibling concrete adapters;
- application code;
- transport frameworks;
- database implementation details in public contracts.

## 8.2 Kernel layer

The domain kernel owns reusable execution mechanics that apply consistently across features.

Typical responsibilities:

```text
kernel/
├── authorization/
├── execution/
├── operations/
├── emissions/
├── tenancy/
├── privacy/
├── validation/
└── internal/
```

The kernel may own:

- operation-definition contracts;
- operation registry;
- authorization enforcement;
- approval verification policy;
- transaction policy;
- idempotency protocol;
- audit protocol;
- outbox protocol;
- trusted execution context;
- input parsing;
- error translation;
- projection rules.

The kernel must not own:

- feature-specific statuses;
- feature-specific business rules;
- feature-specific field schemas;
- feature-specific records;
- feature-specific decisions disguised as generic infrastructure.

## 8.3 Composition layer

The composition layer owns runtime assembly.

It may:

- bind feature ports to providers;
- construct memory and relational runtimes;
- compose feature operation definitions;
- provide a shared opaque unit of work;
- wire authorization, audit, outbox, and dependency implementations;
- validate the completed operation registry.

It must not:

- redefine feature business rules;
- become a package-wide domain service;
- expose raw stores to consumers;
- bypass feature contracts;
- mutate another domain’s tables.

## 8.4 Facade layer

The facade is the stable package business API.

It exposes:

- explicit command and query capabilities;
- representation-safe contracts;
- opaque execution context;
- stable runtime interfaces;
- approved schemas needed at trusted ingress;
- canonical result outcomes.

It must not expose:

- stores;
- SQL or Drizzle types;
- database handles;
- transactions;
- concrete adapters;
- raw dependency ports;
- internal event envelopes;
- registry implementation details;
- composite mutable context objects.

## 8.5 Testing layer

The testing layer may provide:

- builders;
- fixtures;
- memory runtime;
- parity harness;
- hostile-input scenarios;
- contract-test suites;
- fault-injection helpers.

Production feature code must not import the testing layer.

---

# 9. Dependency rules

## 9.1 Permitted direction

```text
consumer
  → package root
    → facade
      → composition
        → feature
          → feature contracts
          → feature store contracts
          → feature ports
```

At runtime:

```text
composition
  → binds feature store contract to adapter
  → binds required port to provider
  → supplies kernel execution services
```

## 9.2 Prohibited dependencies

A feature must not import:

- the package facade;
- composition;
- another feature’s concrete adapter;
- another feature’s internal handler;
- a package-wide composite store;
- an application route or controller;
- a peer ERP package not approved as a dependency;
- transport response types;
- raw Drizzle or SQL types in its public API.

## 9.3 Cross-feature coordination

Cross-feature coordination must use one of:

1. a narrow capability port;
2. a committed domain event;
3. domain composition using an opaque shared unit of work;
4. an application-owned saga where multiple packages participate.

The architecture must not rely on:

- direct writes to another feature’s tables;
- imports from sibling adapter implementations;
- duplicated records;
- hidden calls between handlers;
- shared mutable singleton state.

## 9.4 Cross-domain coordination

Effects crossing package boundaries should normally use:

- committed domain events;
- application orchestration;
- approved read-only capability ports;
- explicit application sagas.

A domain package must not directly mutate another package’s persistence.

---

# 10. Operation architecture

## 10.1 Canonical ownership

The canonical chain is:

```text
Approved feature PRD
    ↓ specifies
Feature-owned operation definitions
    ↓ composed into
Domain operation registry
    ↓ projected into
Facade, authorization, audit, events, documentation, and checks
```

## 10.2 Feature operation definitions

Each feature defines its operations in:

```text
src/features/<group>/<feature>/operation-registry.ts
```

or an equivalent set of operation files. `operation-registry.ts` is the name used by every shipped ERP feature; prefer it over `operations.ts` or `definition.ts`.

Each operation declares:

- operation identifier;
- feature owner;
- command or query kind;
- input and output contracts;
- permission;
- approval policy;
- transaction policy;
- idempotency policy;
- audit policy;
- emission policy;
- retry classification where relevant.

## 10.3 Domain operation registry

The domain registry:

- composes feature-owned definitions;
- rejects duplicate identifiers;
- verifies every operation has an owning feature;
- verifies every public facade operation is registered;
- verifies every registered operation is implemented;
- derives policy projections;
- exposes an immutable validated registry.

The central registry must not manually duplicate feature definitions.

### 10.3.1 Module manifest projection

`src/composition/module.manifest.ts` is the registry's governed projection and the only module surface the platform reads. It satisfies `AfendaModuleManifest` and is validated by `pnpm validate:modules`.

Fields the domain must fill honestly:

| Field                             | Content                                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------------------- |
| `id` · `packageName` · `category` | module identity; `packageName` is `` `@afenda/${string}` ``                                         |
| `band`                            | `R1-F` (the only accepted value today)                                                              |
| `lifecycle`                       | `scaffolded` until verified — see §5.2                                                              |
| `activationMode`                  | `core` or `organization_toggle`                                                                     |
| `owns`                            | `aggregates`, `commandNamespace`, `commands`, `queryNamespace`, `queries`                           |
| `persistence`                     | `schemaOwner: "@afenda/db"` plus the exact `mutationTables` this module writes                      |
| `events`                          | `namespace`, `emits`, `consumes`                                                                    |
| `permissions`                     | `namespace` and `codes`                                                                             |
| `authorization`                   | command and query permission maps                                                                   |
| `moduleDependencies.required`     | must match `package.json` and the workspace-edge register                                           |
| `optionalIntegratesWith`          | `{ moduleId, style }` where style is `events`, `ports`, or `app-saga` — the executable form of §9.4 |

`commands`, `queries`, `emits`, `codes`, and the authorization maps are spread from the feature-owned registries. They are never retyped as literals in the manifest.

## 10.4 Transaction policy

Every state-mutating operation declares its transaction policy.

Feature-owned state mutations must atomically commit:

- state changes;
- required audit records;
- required outbox records;
- package-local effects explicitly declared atomic.

A non-transactional command requires an explicit rationale and must not partially mutate feature-owned state.

## 10.5 Idempotency

Every retryable mutation defines:

- idempotency-key source;
- scope;
- fingerprint inputs;
- result replay behavior;
- conflict behavior when a key is reused with different inputs;
- retention period;
- event and audit replay rules.

An idempotent replay returns the original observable outcome and must not:

- repeat the state mutation;
- emit a duplicate event;
- create duplicate audit evidence;
- bypass authorization or tenancy checks.

---

# 11. Outcome and error architecture

## 11.1 Result contract

Public feature operations return the canonical typed result from `@afenda/errors`:

```ts
import type { Result } from "@afenda/errors";

Promise<Result<JournalLine, "NOT_FOUND" | "VALIDATION_ERROR">>;
```

The shape (`packages/foundation/errors/src/public-types.ts`):

```ts
type ResultSuccess<Data> = Readonly<{ data: Data; ok: true }>;
type Result<Data, Code extends CanonicalErrorCode = CanonicalErrorCode> =
  ResultSuccess<Data> | ResultFailure<Code>;
```

Binding rules:

- The discriminant is **`ok`**. `{ success, data }` is prohibited repository-wide.
- The success payload field is **`data`**.
- The second type parameter is a **`CanonicalErrorCode`** union, not an error class. There is **no `DomainError` type** — do not introduce one.
- Failure is flattened, not wrapped: a failure carries `code`, `message`, `messageKey`, and optional `details` alongside `ok: false`. There is no `result.error` object.
- Narrow the `Code` parameter to the codes an operation can actually produce. Leaving it at the default widens every consumer's exhaustiveness check to the whole registry.
- Construct results with the `errorResult` capability (`{ ok, fail }`), not object literals.
- Expected business outcomes must not escape as unclassified thrown errors.

Server Actions in `apps/web` alias this same type as `ActionResult`; it is an import alias, not a separate contract:

```ts
import { type Result as ActionResult, errorResult } from "@afenda/errors";
```

## 11.2 Domain error vocabulary

The domain reasons in business terms, but every business outcome must resolve to one canonical code. Domains do **not** define their own error taxonomy.

The canonical codes are fixed in `packages/foundation/errors/src/contract/registry.ts`:

```text
BAD_REQUEST · UNAUTHORIZED · FORBIDDEN · NOT_FOUND · CONFLICT
CONCURRENCY_CONFLICT · VALIDATION_ERROR · RATE_LIMITED
INTERNAL_ERROR · SERVICE_UNAVAILABLE
```

Map each domain outcome to a code, and record the mapping here:

| Domain outcome                                     | Canonical code                      | Notes                                                                             |
| -------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------- |
| Input or business-rule rejection                   | `VALIDATION_ERROR`                  | `BAD_REQUEST` only for malformed requests, not failed rules                       |
| Record unavailable in the permitted scope          | `NOT_FOUND`                         | also the tenancy-safe absence outcome — see §11.3                                 |
| Actor lacks permission                             | `FORBIDDEN`                         | `UNAUTHORIZED` means unauthenticated, not unauthorized                            |
| Required approval missing or unavailable           | `<decide per domain>`               | genuinely ambiguous — record the choice as a decision, do not vary it per feature |
| Lifecycle movement not permitted                   | `CONFLICT`                          | the record exists; its current state forbids the move                             |
| Version, uniqueness, or concurrent-change conflict | `CONFLICT` / `CONCURRENCY_CONFLICT` | reserve `CONCURRENCY_CONFLICT` for optimistic-concurrency loss                    |
| Required external capability unavailable           | `SERVICE_UNAVAILABLE`               | pairs with the fail-closed posture in §14.3                                       |
| A protected domain invariant would be violated     | `CONFLICT`                          | `INTERNAL_ERROR` only when the state should have been unreachable                 |

Adding a canonical code is a change to `@afenda/errors`, not a domain decision.

The internal `ErrorCategory` enum (`authentication`, `authorization`, `availability`, `concurrency`, `internal`, `request`, `resource`) classifies codes inside the errors contract layer. It is **not exported** from the package root — domain code must not import or reproduce it.

HTTP, RPC, queue, or UI mappings belong to consuming adapters and are projected by `errorWire` / `errorOpenApi`.

## 11.3 Tenancy-safe absence

Cross-tenant record access returns the domain’s non-disclosing absence outcome unless an explicit cross-organization policy grants access.

The system must not reveal that a record exists in another tenant.

---

# 12. Persistence architecture

## 12.1 Semantic versus relational ownership

The feature owns:

- record meaning;
- lifecycle;
- store contract;
- persistence invariants;
- query semantics;
- required uniqueness;
- required indexes as business/query requirements.

The relational authority owns:

- Drizzle schema declarations;
- database-specific types;
- migration files;
- database constraints;
- physical indexes;
- migration execution tooling.

In this repository the authority is fixed, not per-domain — `AfendaModuleManifest.persistence.schemaOwner` is the typed literal `"@afenda/db"`:

```yaml
relational_schema_authority: "@afenda/db" # packages/data-plane/db/src/schema/**
migration_authority: "@afenda/db"
schema_write_ownership_register: docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml
migration_execution_owner: <team or process>
```

The module is the sole business mutator of the tables registered to it in the schema-ownership register. It does not host DDL.

## 12.2 Store contracts

Feature store contracts must be:

- persistence-agnostic;
- tenant-aware;
- explicit about ordering;
- explicit about concurrency;
- explicit about not-found behavior;
- explicit about pagination;
- free from public SQL or Drizzle types.

## 12.3 Adapter policy

Each persistent feature should normally provide:

1. a deterministic memory adapter — `<feature>.memory.ts`;
2. a production Drizzle adapter — `<feature>.drizzle.ts`.

The same behavioral suite must run against both.

A feature adapter implements its own feature store contract. It never names, accepts, constructs, or imports the composite package store.

## 12.4 Memory-first rule

Implementation order:

```text
approved PRD
→ contracts and schemas
→ policy and lifecycle tests
→ store contract
→ memory adapter
→ operations and contract tests
→ Drizzle schema and migration
→ Drizzle adapter
→ parity verification
```

SQL is not where business behavior is discovered.

## 12.5 Adapter parity

Parity requires identical observable behavior for:

- successful results;
- error codes;
- tenancy isolation;
- uniqueness;
- sorting;
- pagination boundaries;
- state transitions;
- optimistic concurrency;
- idempotent replay;
- emitted facts;
- chronology.

A parity failure blocks feature closure.

## 12.6 Migration policy

Migrations must follow repository rules and include:

- forward path;
- rollback or explicit irreversibility;
- expand–backfill–contract ordering where applicable;
- existing-row strategy;
- row-count expectations;
- constraint sequencing;
- verification procedure;
- restored-snapshot evidence where required.

No feature PRD may invent migration paths inconsistent with the repository’s relational authority.

The canonical migration path is fixed and gated:

```bash
pnpm db:generate
pnpm db:check
AFENDA_ALLOW_DB_MIGRATE=1 pnpm --filter @afenda/db db:migrate
```

`db:push` and `db:pull` are prohibited. A domain architecture must not describe an alternative apply path.

---

# 13. Tenancy architecture

## 13.1 Trusted organization identity

Organization identity must come from server-trusted execution context.

Client-supplied organization identity must not be accepted as authority.

## 13.2 Store-level enforcement

Organization scope must be enforced at the store or persistence boundary, not merely in handlers or UI filters.

The tenant column is `organization_id` in SQL and `organizationId` in Drizzle. Every hard tenant root declares it `NOT NULL` and is registered in `packages/data-plane/db/src/hard-tenant-roots.ts` (authority: ARCH-023). Registration is not optional — `pnpm audit:tenancy-nulls` asserts zero null `organization_id` values across registered roots.

Related gates: `pnpm check:tenancy-residue`, `pnpm check:tenant-sql-safety`.

## 13.3 Relationship lineage

Relationships between records must satisfy approved tenant-lineage rules.

At minimum:

- records related within the domain belong to the same organization unless explicitly approved otherwise;
- foreign references are checked for permitted organization relationship;
- cross-organization access is explicit, logged, and reviewable;
- tenant scope leads relevant query and index design.

## 13.4 Required tests

Every feature must test:

- same-organization success;
- cross-organization read rejection;
- cross-organization mutation rejection;
- spoofed organization input;
- absent trusted organization context;
- organization-scoped uniqueness;
- organization-scoped pagination.

---

# 14. Authorization and approval architecture

## 14.1 Permission model

Permissions are:

- defined using canonical identifiers;
- assigned to feature operations;
- enforced at the operation boundary;
- projected to the UI only as a convenience;
- never trusted solely because an action is hidden in the frontend.

## 14.2 Approval separation

The domain distinguishes:

- authority facts owned by a business feature;
- approval execution owned by the platform approval capability;
- operation authorization owned by the domain execution boundary.

A feature must not create an informal approval mechanism when the platform approval service is authoritative.

## 14.3 Failure posture

Security-sensitive dependencies fail closed.

Examples:

- unavailable authorization provider: deny;
- unavailable approval verifier: do not perform the protected mutation;
- missing tenant context: reject;
- unverifiable authority: reject or return the declared approval outcome.

## 14.4 Auditability

Authorization and approval decisions should record, where permitted:

- operation identifier;
- actor identifier;
- organization identifier;
- decision outcome;
- approval reference;
- decision timestamp;
- policy version or relevant authority reference.

Sensitive tokens or payload bodies must not be logged.

---

# 15. Privacy, retention, and records architecture

## 15.1 Privacy classification

Each feature PRD classifies its fields as:

- public;
- internal;
- restricted;
- regulated.

The architecture must define:

- default classification;
- permitted projections;
- event exclusions;
- export rules;
- log-redaction rules;
- cross-domain disclosure requirements.

## 15.2 Secrets prohibition

The domain must not store:

- passwords;
- API keys;
- private tokens;
- cryptographic secrets;
- session credentials;
- technical authentication material.

Where required, store only a platform-owned secret handle.

## 15.3 Retention

Each feature PRD defines:

- retention period;
- archival requirements;
- legal-hold interaction;
- disposal conditions;
- disposal authority;
- chronology preservation;
- fields that must be redacted rather than deleted.

## 15.4 Evidence versus files

A file-storage platform owns binary file storage.

The domain may own:

- record classification;
- evidence requirement;
- file reference;
- version relationship;
- approval state;
- retention rule;
- legal hold;
- evidence-pack membership.

The domain must not become a generic document repository.

---

# 16. Event architecture

## 16.1 Event ownership

A feature emits facts about its own completed state changes.

Events must:

- use past-tense fact names;
- identify their owning feature;
- carry representation-safe payloads;
- exclude secrets;
- avoid internal store or Drizzle row shapes;
- be additively versioned;
- use the domain outbox where delivery is required.

## 16.2 Event intent

Events inform consumers. They do not command another domain to violate its ownership boundary.

Example:

```text
SubscriptionTerminationInitiated
```

may inform IT, Purchasing, or Accounting.

It must not directly mutate their records.

## 16.3 Ordering and deduplication

Each feature PRD defines:

- aggregate or stream identifier;
- ordering requirement;
- event identifier;
- schema version;
- deduplication expectation;
- replay behavior;
- consumer compatibility posture.

## 16.4 Atomicity

Where an event represents a committed domain mutation, the state change and outbox record commit atomically.

---

# 17. Public facade architecture

## 17.1 Consumer rule

Production consumers import from:

```text
@afenda/<module-id>
```

Deep imports are prohibited unless an explicit supported subpath is approved and declared in `package.json` `exports`.

`src/index.ts` begins with `import "server-only";` — all twelve shipped ERP packages do this, and it is what keeps a Node-only module out of a client bundle.

## 17.2 Permitted exports

The package root may expose:

- stable runtime construction;
- explicit feature commands and queries;
- approved public contracts;
- canonical result and error types;
- opaque execution context;
- ingress-safe schemas where justified;
- feature availability or capability projections.

## 17.3 Prohibited exports

The package root must not expose:

- internal stores;
- concrete adapters;
- Drizzle or SQL constructors and database schema types;
- transactions;
- raw ports;
- internal event envelopes;
- private registry structures;
- internal feature handlers;
- mutable global runtime objects.

## 17.4 Facade evolution

Facade changes require:

- an approved feature PRD;
- consumer impact assessment;
- compatibility decision;
- consumer-contract tests;
- release-note or migration guidance when breaking.

---

# 18. Frontend architecture boundary

## 18.1 Backend and frontend separation

The domain architecture defines frontend integration contracts and navigation rules, but individual feature PRDs define screens and interactions.

Backend implementation and frontend implementation must have separate:

- file manifests;
- delivery statuses;
- test gates;
- ownership;
- activation decisions.

A backend feature may be verified while its frontend remains planned, provided status reporting says so explicitly.

## 18.2 Navigation

Navigation should be projected from activated feature definitions.

A planned or merely scaffolded feature must not appear as a live empty screen.

## 18.3 Standard feature states

Individual frontend feature PRDs must address:

- loading;
- empty before any data;
- empty filtered result;
- partial data;
- retryable error;
- terminal error;
- permission denial;
- stale or concurrent conflict;
- optimistic pending;
- unavailable or inactive capability where applicable.

## 18.4 Design-system rule

Applications import UI exclusively from `@afenda/ui-system`:

```ts
import { … } from "@afenda/ui-system";
```

This is a repository hard stop, not a preference. A domain feature must not create an ungoverned parallel component system, and must not reach into `@afenda/ui-blocks` or a design-token package directly.

Configuration follows the same rule: read `import { env } from "@afenda/env"`, never raw `process.env` for product config.

---

# 19. Observability architecture

## 19.1 Structured logs

Domain operation logs may include:

- operation identifier;
- feature identifier;
- organization identifier;
- actor identifier;
- outcome code;
- duration;
- correlation identifier;
- dependency status.

They must not include:

- credentials;
- full payload bodies;
- unrestricted personal data;
- binary evidence;
- sensitive document contents.

## 19.2 Metrics

Domain-wide metrics may include:

- command and query rate;
- outcomes by error category;
- p50, p95, and p99 latency;
- approval-wait duration;
- idempotent replay count;
- conflict rate;
- dependency failure rate;
- outbox backlog;
- audit-to-mutation parity;
- tenant-boundary rejection rate.

## 19.3 Tracing

Where supported, traces should cover:

```text
facade
→ execution boundary
→ authorization and approval
→ feature operation
→ store
→ required capability port
→ audit and outbox
```

## 19.4 Alert ownership

For each operational alert, define:

- threshold;
- severity;
- accountable team;
- escalation path;
- runbook;
- suppression or maintenance policy.

---

# 20. Domain-wide quality gates

## 20.1 Architecture gates

The package should permanently verify:

- valid feature layout;
- declared feature ownership;
- valid feature-group membership;
- operation-registry parity;
- facade-to-registry parity;
- projection parity;
- forbidden deep imports;
- prohibited dependency direction;
- empty-file and placeholder prohibition;
- package-root export stability.

Most of this is already executable. Use the shared gates rather than writing per-package equivalents:

```bash
pnpm --filter @afenda/<module-id> lint
pnpm --filter @afenda/<module-id> typecheck
pnpm --filter @afenda/<module-id> test

pnpm gen:doctor:erp          # layout, manifest, and projection authority
pnpm validate:modules        # module manifest conformance
pnpm governance:packages     # package governance
pnpm audit:tenancy-nulls     # when tenant roots change
pnpm checks                  # local aggregate gate
```

A grep or source-pattern test is a guard, not behavior proof.

## 20.2 Behavioral gates

Each feature must verify:

- every operation;
- every documented outcome;
- every state transition;
- every rejected transition;
- every numbered business rule;
- tenancy isolation;
- authorization denial;
- approval failure posture;
- idempotency;
- concurrency;
- audit and outbox atomicity;
- adapter parity;
- hostile input;
- excluded-field assertions.

## 20.3 Database gates

Database closure requires:

- approved schema location;
- migration review;
- migration apply evidence;
- rollback or recovery evidence;
- constraints and indexes verified;
- row-count expectations checked;
- parity suite against the Drizzle adapter.

## 20.4 Consumer gates

Facade closure requires:

- public contract review;
- no internal type leakage;
- consumer-contract tests;
- compatibility assessment;
- deep-import check;
- documentation regeneration.

---

# 21. Feature PRD contract

## 21.1 Required location

```text
docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/PRD.md
```

Feature PRDs live in the specification tree, never inside `packages/erp/<module-id>/src/**`. Use the companion template `docs/template/feature-PRD.md`.

## 21.2 Required feature PRD content

Each feature PRD must define:

1. feature identity;
2. problem and user jobs;
3. semantic ownership;
4. scope and exclusions;
5. users and permissions;
6. records and value objects;
7. lifecycle and transitions;
8. operations;
9. numbered business rules;
10. invariants;
11. errors and outcomes;
12. persistence requirements;
13. events and integrations;
14. tenancy and privacy;
15. frontend behavior;
16. observability;
17. testing and acceptance;
18. exact write manifests;
19. implementation slices;
20. Definition of Done;
21. open questions and decisions.

## 21.3 Feature PRD approval test

A feature PRD is ready for implementation only when:

- no blocking section contains `TBD`;
- operation names are final;
- business rules are numbered;
- exclusions can become negative tests;
- lifecycle transitions are explicit;
- required ports have identified providers;
- persistence authority is known;
- file manifests are exhaustive;
- tests can be derived from the document;
- open questions identify whether and what they block.

## 21.4 Prohibition against architecture reinvention

An individual feature PRD must not redefine:

- the package directory model;
- package facade rules;
- kernel responsibilities;
- operation-registry architecture;
- tenancy source;
- adapter-parity policy;
- public error architecture;
- database authority;
- cross-domain dependency direction.

A required exception must be proposed as a domain architecture decision first.

---

# 22. Delivery strategy

## 22.1 Greenfield assumption

Unless current-state evidence is explicitly attached and verified, planning must assume:

- no feature is implemented;
- no schema is production-ready;
- no migration is approved;
- no facade capability is stable;
- no operation registry is complete;
- no frontend screen is activated;
- no feature is verified;
- no production rollout has occurred.

Existing files are evidence to examine, not proof of completion.

## 22.2 Mandatory build order

Recommended domain sequence:

### Phase 0 — Architecture foundation

- approve domain boundary;
- approve feature inventory;
- approve ownership and exclusions;
- freeze source architecture;
- identify relational authority;
- implement architecture checks;
- implement and test kernel mechanics;
- implement composition skeleton;
- preserve or create the root facade contract.

### Phase 1 — Golden feature

Select one representative feature that exercises:

- tenancy;
- authorization;
- commands and queries;
- lifecycle;
- memory adapter;
- Drizzle adapter;
- audit;
- outbox;
- facade exposure;
- consumer tests.

Take it through complete closure.

### Phase 2 — Mechanical replication

Every later feature follows:

```text
approved feature PRD
→ feature capsule
→ memory behavior
→ contract tests
→ relational implementation
→ parity
→ facade integration
→ optional frontend delivery
→ verification evidence
```

### Phase 3 — Cross-feature capabilities

Implement shared domain capabilities only when at least one approved feature requires them.

They must live in:

- an explicit feature when they own business meaning; or
- the kernel when they provide generic execution mechanics.

### Phase 4 — Activation

- migration authority;
- role rollout;
- pilot organization;
- runbooks;
- recovery drill;
- operational evidence;
- enterprise-readiness review.

## 22.3 Golden-feature selection criteria

The golden feature should:

- represent the domain’s central ownership model;
- contain meaningful commands and queries;
- require tenancy and authorization;
- exercise lifecycle transitions;
- have manageable external dependencies;
- require both memory and Drizzle adapters;
- be understandable to human reviewers;
- avoid being the most complex feature in the domain.

## 22.4 No half-feature rule

A feature slice should not leave behind:

- placeholder handlers;
- empty adapters;
- untested operations;
- migrations without behavior;
- active routes without backend capability;
- registry entries without implementations;
- documentation claiming completion before verification.

---

# 23. Rollout and activation architecture

## 23.1 Lifecycle separation

The following decisions are distinct:

- specification approval;
- implementation completion;
- verification;
- deployment;
- organization activation;
- pilot acceptance;
- enterprise readiness.

None implies the next automatically.

## 23.2 Activation model

Define:

```yaml
activation_scope: organization
default_state: inactive
activation_authority: <role or process>
feature_flag_source: <system>
emergency_disable_supported: true
```

## 23.3 Rollout stages

| Stage                  | Required gate                           | Rollback or containment             |
| ---------------------- | --------------------------------------- | ----------------------------------- |
| Schema prepared        | Migration evidence approved             | Restore or approved reversal        |
| Code deployed inactive | Contract and consumer tests green       | Disable capability                  |
| Pilot                  | Pilot scope and exit criteria approved  | Deactivate pilot                    |
| General activation     | Pilot accepted and runbooks ready       | Organization-level disable          |
| Enterprise-ready       | Operational and assurance review passed | Suspend capability if controls fail |

## 23.4 Operational readiness

Activation requires, where applicable:

- support ownership;
- runbooks;
- data migration reconciliation;
- access-role assignment;
- monitoring;
- alert thresholds;
- recovery procedure;
- retention configuration;
- audit review;
- user training;
- evidence of pilot acceptance.

---

# 24. Architecture Definition of Done

The domain architecture is approved only when:

- [ ] Mission and business owner are explicit.
- [ ] Inclusion and exclusion boundaries are explicit.
- [ ] Cross-domain ownership is resolved.
- [ ] Canonical terminology is defined.
- [ ] Feature groups and feature inventory are approved.
- [ ] Feature groups are classification-only.
- [ ] Features are declared semantic owners.
- [ ] Permanent source structure is approved.
- [ ] Facade, kernel, composition, and feature responsibilities are separated.
- [ ] Dependency directions are explicit and enforceable.
- [ ] Operation-definition and registry ownership is unambiguous.
- [ ] Transaction and idempotency policies are defined.
- [ ] Relational schema and migration authority are identified.
- [ ] Memory-first and adapter-parity policy is approved.
- [ ] Tenancy identity source and enforcement boundary are defined.
- [ ] Authorization and approval responsibilities are separated.
- [ ] Privacy, retention, and secrets rules are defined.
- [ ] Event and outbox policy is defined.
- [ ] Frontend and backend delivery statuses are separated.
- [ ] Architecture checks are identified.
- [ ] Greenfield delivery phases are approved.
- [ ] Golden-feature criteria are established.
- [ ] Activation and enterprise-readiness rules are distinct.
- [ ] Open architectural decisions identify their blockers.
- [ ] No section falsely claims implementation or verification without evidence.

---

# 25. Architecture invariants

The following must remain true throughout the domain’s lifetime.

> **Identifier namespace.** These are domain **invariants** and use the `<MODULE>-INV-nn` series — for example `HR-INV-01`, `CA-INV-01`. Do **not** number them `ARCH-nn`: this repository already uses `ARCH-001`…`ARCH-028` for repository-wide _architecture decision records_ (for example ARCH-023 hard tenant roots, ARCH-024 workspace edges). Two meanings separated only by zero-padding is a collision, and it breaks any grep or traceability matrix over the decision series.

- `<MODULE>-INV-01` Every mutable business fact has exactly one semantic owner.
- `<MODULE>-INV-02` Feature groups classify; they do not own runtime business behavior.
- `<MODULE>-INV-03` Consumers use the package facade rather than internal feature paths.
- `<MODULE>-INV-04` Features do not import facade or composition.
- `<MODULE>-INV-05` Features do not mutate sibling or foreign-module tables.
- `<MODULE>-INV-06` Organization identity is server-trusted.
- `<MODULE>-INV-07` Store operations enforce tenant scope.
- `<MODULE>-INV-08` Public contracts do not expose Drizzle or database types.
- `<MODULE>-INV-09` Expected business outcomes use `Result<Data, Code>` from `@afenda/errors`.
- `<MODULE>-INV-10` Transport status mappings remain outside domain errors.
- `<MODULE>-INV-11` State, required audit, and required outbox effects commit atomically.
- `<MODULE>-INV-12` Idempotent replay does not duplicate state, audit, or events.
- `<MODULE>-INV-13` Feature operation definitions are composed, not manually duplicated.
- `<MODULE>-INV-14` The memory and Drizzle adapters have equivalent observable behavior.
- `<MODULE>-INV-15` Secrets and technical credentials are not stored by domain features.
- `<MODULE>-INV-16` Planned features do not render as active empty capabilities.
- `<MODULE>-INV-17` Documentation status does not substitute for implementation evidence.
- `<MODULE>-INV-18` A failed closure gate blocks dependent forward progress.
- `<MODULE>-INV-19` Module kernel changes are reviewed independently from feature implementation.
- `<MODULE>-INV-20` An individual feature requires an approved PRD before implementation.

Architecture tests should reference these identifiers. Where an invariant is enforced by an existing repository decision or gate, cite it alongside — for example `<MODULE>-INV-07` is enforced by ARCH-023 and `pnpm audit:tenancy-nulls`.

---

# 26. Architecture risks

| Risk                                          | Consequence                             | Control                                    |
| --------------------------------------------- | --------------------------------------- | ------------------------------------------ |
| Domain becomes a miscellaneous module         | Ambiguous ownership and duplication     | Ownership test and explicit exclusions     |
| Feature groups acquire business logic         | Hidden mega-modules                     | Classification-only checks                 |
| Registry definitions are duplicated           | Policy drift                            | Compose feature-owned definitions          |
| Feature PRDs redesign architecture            | Structural divergence                   | Authority precedence and architecture gate |
| SQL drives behavior                           | Inconsistent adapters                   | Memory-first and parity                    |
| Tenant filtering occurs only in handlers      | Data exposure                           | Store-boundary enforcement                 |
| Facade leaks adapters or Drizzle types        | Consumer coupling                       | Export checks and consumer contracts       |
| External records are copied for convenience   | Stale and conflicting truth             | Governed-reference policy                  |
| Status reporting is overstated                | False readiness                         | Multidimensional lifecycle status          |
| Shared kernel becomes a domain dumping ground | Generic abstractions hide feature rules | Kernel admission criteria                  |
| Planned folders imply progress                | Misleading delivery state               | No-empty-scaffold rule                     |
| Frontend and backend completion are conflated | Incomplete feature called done          | Separate surface status                    |

---

# 27. Decision log

| Decision ID | Decision     | Alternatives rejected | Rationale     | Status   | Date     |
| ----------- | ------------ | --------------------- | ------------- | -------- | -------- |
| ADR-001     | `<decision>` | `<alternatives>`      | `<reasoning>` | proposed | `<date>` |
| ADR-002     | `<decision>` | `<alternatives>`      | `<reasoning>` | proposed | `<date>` |

Material decisions should be moved to dedicated decision records when approved.

---

# 28. Open architectural questions

| Question ID | Question     | Blocks               | Owner     | Required by      | Resolution |
| ----------- | ------------ | -------------------- | --------- | ---------------- | ---------- |
| AQ-001      | `<question>` | `<phase or feature>` | `<owner>` | `<date or gate>` | unresolved |
| AQ-002      | `<question>` | `<phase or feature>` | `<owner>` | `<date or gate>` | unresolved |

Rules:

- an unresolved blocking question stops the affected work;
- agents and implementers must not invent answers;
- non-blocking questions must state why work may proceed safely;
- resolved questions should become decisions or architecture amendments.

---

# 29. Architecture change process

A proposed change to this document must include:

1. problem statement;
2. affected architectural sections;
3. affected features and consumers;
4. compatibility impact;
5. migration impact;
6. security and tenancy impact;
7. alternatives considered;
8. decision and rationale;
9. required updates to checks, templates, and exemplars;
10. supersession information.

A feature implementation must not smuggle an architectural change into its own slice.

---

# Appendix A — Feature admission checklist

Before adding a feature to the inventory:

1. What exact business meaning does it own?
2. Who is accountable for maintaining it?
3. What lifecycle does it own?
4. Which facts must it never own?
5. Is another existing feature already authoritative?
6. Can it be represented as a governed reference instead?
7. Does it require independent commands, queries, rules, and persistence?
8. Does it belong in this domain according to the ownership test?
9. What external ports or events does it require?
10. Can its completion be proven independently?

A feature that lacks distinct semantic ownership should not be created.

---

# Appendix B — Kernel admission checklist

A capability belongs in the kernel only when:

- it is execution mechanics rather than business meaning;
- at least two features require identical semantics;
- feature-specific vocabulary is absent;
- it can be tested independently;
- centralization reduces policy drift;
- it does not require knowledge of a feature status or record type.

Otherwise, it belongs in the owning feature.

---

# Appendix C — New feature workflow

```text
1. Confirm feature ownership.
2. Add or approve feature inventory entry.
3. Author individual feature PRD.
4. Resolve blocking questions.
5. Approve exact write manifests.
6. Implement contracts and rules.
7. Prove behavior with memory adapter.
8. Implement relational schema and migration.
9. Pass relational parity.
10. Compose operation definitions into registry.
11. Expose approved facade capabilities.
12. Implement frontend separately where planned.
13. Record verification evidence.
14. Decide activation independently.
```

---

# Appendix D — Architecture review checklist

A reviewer should be able to answer:

1. What does this domain own?
2. What does it explicitly not own?
3. Who is accountable for its records?
4. What are its feature groups?
5. Which individual features own business meaning?
6. How do consumers access the package?
7. Where is execution policy enforced?
8. Where do feature operation definitions live?
9. Who owns relational schemas and migrations?
10. How is tenant isolation enforced?
11. How do features coordinate without direct coupling?
12. How are state, audit, and events committed?
13. How is memory-versus-relational parity proven?
14. What must exist before a feature can be implemented?
15. What distinguishes implemented, verified, activated, and enterprise-ready?

If these cannot be answered clearly, the architecture is not ready for approval.

---

# Appendix E — File name and location

```text
docs/erp/<module-id>/<module-id>-architecture.md
```

Kebab-case, matching the module id and the repository's `namingPolicy.files: kebab-case`. Examples:

```text
docs/erp/corporate-administration/corporate-administration-architecture.md
docs/erp/human-resources/human-resources-architecture.md
docs/erp/payments/payments-architecture.md
docs/erp/inventory/inventory-architecture.md
docs/erp/master-data/master-data-architecture.md
```

> **Open naming decision.** The first consumer on disk uses an abbreviated prefix — `docs/erp/corporate-administration/CA-PRD.md` and `CA-architecture.md` (currently empty). That conflicts with the spelled-out kebab-case form above and with lowercase file naming. Settle on one convention and rename the existing pair before more domains are authored; record it as a decision in §27 rather than letting both forms spread.
