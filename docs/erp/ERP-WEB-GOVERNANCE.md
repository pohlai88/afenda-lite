# ERP and web application governance

| Field | Value |
| --- | --- |
| Surface | `docs/architecture/ERP-WEB-GOVERNANCE.md` |
| Status | Normative |
| Applies to | `packages/erp/*`, ERP-owned relational surfaces in `@afenda/db`, and ERP-facing code in `apps/web` |
| Parent authority | `packages/KERNEL-GOVERNANCE.md` |
| Structural projections | `packages/erp/ERP-SCAFFOLDING.md` and `apps/web/FRONTEND-SCAFFOLDING.md` |
| Supersedes | Conflicting ERP flat-layout rules, package-wide business layer farms, root-level Server Action placement for new ERP work, and any web feature topology that does not mirror the backend owner |
| Waiver authority | ERP package owner + application owner + architecture owner; C1 security controls also require the security owner |
| Evidence authority | Canonical feature operation registries, module and schema registers, workspace-edge register, scaffold gates, CI evidence, and digest-bound integration records |

**Notation.**

- Requirement class:
  - `M` — mandatory and not waiverable.
  - `C` — conditional; the trigger is stated and must be machine-resolved.
  - `W` — waiverable only through §21.
- Proof method:
  - `T` — automated behavior, contract, parity, property, integration, accessibility, or end-to-end test.
  - `A` — static analysis, deterministic guard, dependency analysis, generated parity, or build check.
  - `I` — controlled artifact inspection with recorded evidence.
  - `D` — executable demonstration against a declared workflow.
- Evidence result:
  - `PASS`
  - `FAIL`
  - `NOT_APPLICABLE`

A requirement is satisfied only when it is `PASS`, or when it is `NOT_APPLICABLE` with a machine-validated false trigger. A skipped, timed-out, killed, resource-starved, partially executed, or unrecorded applicable requirement is `FAIL`.

---

## 1. Authority and precedence

When two surfaces disagree, the following order applies:

1. `packages/KERNEL-GOVERNANCE.md` — universal package, boundary, evidence, and seal semantics.
2. `docs/architecture/ERP-WEB-GOVERNANCE.md` — cross-layer ownership, integration, and full-stack requirements.
3. Accepted module domain architecture and PRD — product meaning, scope, terminology, actors, rules, and required outcomes.
4. Accepted development roadmap and implementation-slice authority — sequence, eligibility, and permitted write sets.
5. Workspace module roadmap and package register — admitted module identity and lifecycle.
6. Feature-owned `operation-registry.ts` files — executable semantic authority for implemented operations.
7. Composed package operation registry and generated module manifest — package projections.
8. Schema ownership manifest and workspace-edge register — write ownership and dependency authorization.
9. `packages/erp/ERP-SCAFFOLDING.md` and `apps/web/FRONTEND-SCAFFOLDING.md` — structural projections of this contract.
10. `package.json`, `next.config.ts`, `vercel.json`, `scaffold.lock.json`, and package-local configuration — executable projections.
11. Generated catalogs, YAML registers, evidence reports, and READMEs — derived or explanatory surfaces.

A lower-authority surface must not override a higher-authority surface. Drift is a build failure.

No document, generator, manifest, route, or application file may create product meaning absent from the accepted domain architecture or PRD.

---

## 2. Required outcome

A conforming ERP capability has one uninterrupted ownership chain:

```text
accepted product requirement
  → one ERP feature owner
  → one canonical operation definition
  → one package execution path
  → one sole-mutator persistence boundary
  → one stable package facade
  → one trusted application composition seam
  → one mirrored web feature capsule
  → one or more thin route capsules
  → recorded full-stack evidence
```

A capability is not complete because files, tables, screens, or tests exist independently. Completion requires semantic ownership, public execution, persistence parity, tenancy, authorization, transaction behavior, audit and event behavior, application composition, user-state handling, and evidence to agree.

---

## 3. Cross-layer ownership model

```text
┌──────────────────────────────────────────────────────────────────────┐
│ apps/web                                                             │
│ trusted session context · application composition · Server Actions   │
│ loaders · view models · route shells · product UI · app-level sagas  │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ root facade / registered app seam
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ packages/erp/<module-id>                                             │
│ bounded-context meaning · rules · operations · authorization         │
│ store contracts · sole business mutation · audit/event disposition   │
└───────────────┬───────────────────────┬──────────────────────────────┘
                │ registered edges      │ owned schema projection
                ▼                       ▼
┌──────────────────────────┐   ┌───────────────────────────────────────┐
│ kernel/runtime packages  │   │ @afenda/db                            │
│ Result · IDs · authz ·    │   │ DDL · migrations · connectivity ·    │
│ audit · events · tenancy  │   │ transactions · RLS session binding   │
└──────────────────────────┘   └───────────────────────────────────────┘
```

### 3.1 Kernel and platform ownership

Kernel, runtime, and data-plane packages own universal semantics and infrastructure mechanisms under `KERNEL-GOVERNANCE.md`. They do not own bounded ERP business meaning.

### 3.2 ERP package ownership

An ERP package is simultaneously:

| Identity | Meaning |
| --- | --- |
| Bounded context | Owns one coherent business capability family and its vocabulary |
| Published library | Production consumers use `@afenda/<module-id>` |
| Sole mutator | Only the package may perform business `INSERT`, `UPDATE`, or `DELETE` against its registered mutation tables |
| Governed module | Feature definitions derive package manifests, permissions, policies, events, and evidence |
| Server capability | The business facade is server-only and never imported into a client component |

`packages/erp/` is a category folder, not a package. `@afenda/erp` and `@afenda/erp/*` are prohibited.

### 3.3 Database ownership

`@afenda/db` owns relational representation, migrations, connectivity, transaction primitives, and RLS binding. It is not the business mutator and does not own ERP lifecycle decisions.

### 3.4 Application ownership

`apps/web` owns:

- trusted session-to-context translation;
- production adapter and port composition;
- application-level orchestration;
- Server Action transport seams;
- read loaders;
- view-model shaping;
- route composition;
- product UI;
- navigation and revalidation.

`apps/web` does not own ERP business invariants, canonical operation metadata, mutation SQL, domain authorization outcomes, or domain event meaning.

### 3.5 UI-system ownership

`@afenda/ui-system` owns semantic tokens, primitives, and thin shared compounds. Product routes, feature forms, domain widgets, workflow decisions, permissions, and backend access remain in `apps/web`.

---

## 4. Lifecycle and status dimensions

Backend maturity, frontend maturity, and rollout are separate.

### 4.1 Backend status

| Status | Meaning |
| --- | --- |
| `ABSENT` | No admitted feature exists |
| `SCAFFOLDED` | Feature identity, contracts, topology, and initial gates exist |
| `IMPLEMENTED` | Domain behavior, operations, memory behavior, and required persistence exist |
| `VERIFIED` | All applicable backend requirements and evidence pass |

### 4.2 Web status

| Status | Meaning |
| --- | --- |
| `NOT_REQUIRED` | The accepted requirement has no user-facing or app-hosted workflow |
| `ABSENT` | A web workflow is required but not present |
| `SCAFFOLDED` | Mirrored capsule and route anchors exist |
| `IMPLEMENTED` | Loaders, Actions, views, states, and application composition exist |
| `VERIFIED` | Structural, type, interaction, accessibility, and integrated tests pass |

### 4.3 Rollout status

| Status | Meaning |
| --- | --- |
| `NOT_ELIGIBLE` | Required backend or web evidence is incomplete |
| `ELIGIBLE` | Verification is complete; activation decision is pending |
| `ACTIVE` | Capability is enabled for the registered audience |
| `SUSPENDED` | Activation has been withdrawn without erasing historical verification |

A web shell may be designed before backend verification, but it cannot be activated against invented data, placeholder operations, or unverified mutation paths.

A backend feature may be `VERIFIED` while its web status is `ABSENT` or `NOT_REQUIRED`. Neither state may be misreported as full-stack completion.

---

## 5. Admission contract

Before scaffolding, each module and feature must be able to answer the following contract.

```yaml
module:
  id: <kebab-case>
  package: "@afenda/<module-id>"
  category: <registered-category>
  activation_mode: core | organization_toggle
  owner: <package-owner>
  architecture_owner: <architecture-owner>
  security_owner: <required-for-C1>
  admitted_capability: <one coherent bounded-context statement>
  non_ownership:
    - <explicitly excluded concern>
  required_dependencies:
    - <registered package id>
  optional_integrations:
    - module_id: <peer>
      style: event | port | app_saga
  mutation_table_prefixes:
    - <prefix>
  accepted_consumers:
    - apps/web
  runtime_target: node

feature:
  module_id: <module-id>
  feature_group: <business-group>
  feature_id: <business-feature>
  backend_path: packages/erp/<module-id>/src/features/<feature-group>/<feature-id>
  business_mission: <one bounded feature statement>
  aggregates:
    - <aggregate>
  owned_terms:
    - <term>
  excluded_terms:
    - <term>
  commands:
    - <operation-id>
  queries:
    - <operation-id>
  mutation_tables:
    - <table>
  permissions:
    - <permission>
  approvals:
    - <policy-or-none>
  privacy:
    - <policy-or-none>
  events:
    emits:
      - <event-id>
    consumes:
      - <event-id>
  ports:
    - <genuinely required external capability>
  web:
    required: true | false
    bucket: public | operator | client
    route: <route-or-none>
    capsule_path: apps/web/features/<module-id>/<feature-group>/<feature-id>
    reads:
      - <query-id>
    mutations:
      - <command-id>
    client_islands:
      - <interactive leaf>
    acceptance:
      - <observable user outcome>
```

Admission fails when:

- the feature mixes unrelated business missions;
- the feature re-owns another module’s vocabulary;
- required operations are unknown;
- mutation ownership is ambiguous;
- a web capsule has no backend owner;
- a route is proposed without an accepted user outcome;
- a dependency style is not selected;
- a port is proposed merely to avoid an event or application saga;
- tenant, authorization, approval, privacy, transaction, idempotency, audit, or emission disposition is unresolved.

---

## 6. ERP package topology

The permanent package structure is:

```text
packages/erp/<module-id>/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts
│   ├── facade/
│   │   └── <actual-public-facade-files>
│   ├── composition/
│   │   ├── module.manifest.ts
│   │   └── <actual-runtime-and-registry-composition-files>
│   ├── kernel/
│   │   └── <package-wide-derived-protocol-and-execution-files>
│   ├── features/
│   │   └── <feature-group>/
│   │       └── <feature>/
│   │           └── <feature-capsule>
│   └── testing/
│       └── <test-only-capabilities>
├── __tests__/
│   └── <package-boundary-and-integration-contracts>
└── scripts/
    └── <deterministic-package-checks-or-generation>
```

No directory is created without real semantic content. Empty, placeholder, decorative, or future-use files are prohibited.

The source root must not contain package-wide business layer farms such as:

```text
src/adapters/
src/schemas/
src/store/
src/shared/
src/types.ts
src/ports.ts
src/commands/
src/queries/
```

Package-wide technical composition belongs in `kernel`, `composition`, `facade`, or `testing`. Business meaning belongs in the owning feature capsule.

### 6.1 `src/index.ts`

- Begins with `import "server-only";`.
- Re-exports the stable root facade only.
- Contains no logic, environment access, storage construction, or wildcard export.
- Does not expose internal composition or testing surfaces.

### 6.2 `src/facade/`

Owns the stable package business API.

It may expose:

- business-named commands and queries;
- public input and output types;
- canonical schemas where public parsing is intended;
- public permission and error-code types;
- package capability factories when composition must inject dependencies.

It must not expose:

- Drizzle tables or query builders;
- store contracts or implementations;
- raw operation registry representations;
- package-internal execution services;
- testing fixtures;
- mutable adapter instances.

### 6.3 `src/composition/`

Owns package-wide assembly:

- composing feature operation definitions;
- validating registry uniqueness and references;
- deriving the module manifest;
- binding feature stores and ports;
- constructing production capabilities;
- projecting package-level metadata.

Composition may know multiple features. A feature may not import composition.

### 6.4 `src/kernel/`

Owns only package-wide reusable protocol required by multiple features, including:

- operation-definition contracts;
- contextual authorization protocol;
- approval-verification protocol;
- execution sequencing;
- canonical mutation metadata;
- transaction and idempotency coordination;
- audit, event, privacy, and observability dispositions;
- registry composition and validation.

`src/kernel/` must not become a second domain layer. Feature-specific rules, statuses, schemas, commands, queries, or persistence contracts remain in the feature owner.

### 6.5 `src/testing/`

Owns test-only package capabilities, deterministic builders, memory composition, and contract fixtures.

It is reachable only through the declared `/testing` export and only from test code.

### 6.6 `scripts/`

Contains deterministic package-specific generation or verification. Generated output must identify its source and regenerate byte-identically on unchanged input.

---

## 7. Uniform ERP feature capsule

Canonical path:

```text
packages/erp/<module-id>/src/features/<feature-group>/<feature>/
├── index.ts
├── schema.ts
├── guards.ts
├── policy.ts
├── <business-noun>.ts
├── store-contract.ts
├── operation-registry.ts
├── run-operation.ts
├── ports.ts
├── adapters/
│   ├── <feature>.memory.ts
│   └── <feature>.drizzle.ts
└── __tests__/
```

Files are conditional on real behavior except:

- `schema.ts` when public or external input exists;
- `guards.ts` or an equivalent invariant owner when rules exist;
- `operation-registry.ts` when a public operation exists;
- `run-operation.ts` when the feature executes through the module kernel;
- `store-contract.ts` and adapters when persistence exists;
- tests for every implemented responsibility.

The following are prohibited:

```text
definition.ts
operations.ts
commands/
queries/
relational.ts
generic service.ts
generic repository.ts
```

A feature-level `ports.ts` is permitted only when the accepted PRD identifies a genuinely feature-owned external capability.

### 7.1 Feature dependency rules

A feature may import:

- its own files;
- package-wide kernel contracts and execution primitives;
- authorized lower packages through declared exports;
- explicit narrow ports;
- pure, package-neutral helpers owned by the kernel or the same feature.

A feature must not import:

- `src/facade/**`;
- `src/composition/**`;
- `src/testing/**`;
- another feature’s internals;
- a composite package store;
- another feature’s memory or Drizzle adapter;
- an application file;
- a peer ERP implementation without an approved edge.

Cross-feature workflows use explicit capabilities assembled by composition. They do not use lateral implementation imports.

---

## 8. Canonical operation ownership

Every public operation has exactly one feature-owned definition in `operation-registry.ts`.

A complete operation definition records only fields that drive real behavior:

```ts
interface ErpOperationDefinition {
  readonly id: string;
  readonly kind: "command" | "query";
  readonly featureOwner: string;
  readonly publicName: string;
  readonly inputContract: string;
  readonly outputContract: string;
  readonly permission: string;
  readonly authorizationPolicy: string;
  readonly approvalPolicy: string | "none";
  readonly privacyPolicy: string | "none";
  readonly transaction: "required" | "supported" | "none";
  readonly idempotency: "required" | "supported" | "none";
  readonly audit: "required" | "conditional" | "none";
  readonly emission: "required" | "conditional" | "none";
  readonly observabilityClass: string;
  readonly mutationTables: readonly string[];
  readonly errorCodes: readonly string[];
  readonly publicProjection: string | "none";
}
```

The composed package registry must fail closed on:

- duplicate operation IDs;
- missing owners;
- missing permissions;
- missing policy references;
- unresolved approval or privacy disposition;
- contradictory transaction or idempotency metadata;
- audit or emission requirements without a runtime capability;
- command mutation tables outside package ownership;
- query declarations that mutate state;
- public facade exports absent from the registry;
- registry operations absent from the facade when declared public.

### 8.1 Derived projections

The following are derived from feature operation definitions and may not become parallel authorities:

- command and query ID unions;
- permission inventory;
- command and query authorization maps;
- approval policy map;
- privacy policy map;
- transaction policy map;
- idempotency policy map;
- audit and emission coverage;
- event inventory;
- mutation-table coverage;
- observability classification;
- public operation types;
- module manifest ownership sections;
- generated module catalogs;
- documentation operation inventories.

A tool-required YAML or JSON register is a deterministic projection, not an independent semantic owner.

---

## 9. Public facade and export policy

### 9.1 Root business export

Production consumers use:

```text
@afenda/<module-id>
```

The root is the sole business entrypoint.

Every public operation:

- has a business name;
- accepts a typed input that excludes browser-owned tenant identity;
- returns canonical `Result<T, C>` or the repository’s canonical narrowed `Result`;
- performs package-level authorization even when the app already checked access;
- resolves through the canonical operation definition;
- exposes no ORM, SQL, store, adapter, or internal-registry type.

### 9.2 Conditional subpaths

Only the following classes are permitted:

| Subpath | Consumer | Purpose |
| --- | --- | --- |
| `/adapters/drizzle` | Application composition only | Production persistence construction |
| `/testing` | Test code only | Deterministic memory composition, builders, and fixtures |
| Registered runtime-isolation subpath | Registered composition class only | Real runtime separation |

A convenience, legacy, versioned, deprecated, feature-internal, or duplicated business subpath is prohibited.

Production route, loader, view, and component code uses the root facade. It does not import `/adapters/drizzle` or `/testing`.

### 9.3 Consumer stability

An internal feature, kernel, composition, or adapter refactor must require zero production-consumer edits unless the accepted public contract itself changes.

---

## 10. Persistence and relational ownership

### 10.1 Sole-mutator rule

For every table in a module’s `mutationTables`:

- `@afenda/db` owns DDL and migration representation;
- the registered ERP package owns business mutation;
- no peer ERP package, app, script, route, webhook, or background handler writes it directly;
- maintenance or migration writes require an explicitly authorized migration lane and are not production business APIs.

### 10.2 Registry parity

The following must agree:

- feature operation mutation-table declarations;
- composed package mutation-table register;
- module manifest;
- schema ownership manifest;
- actual Drizzle adapter writes;
- database ownership tests.

A table with no owner, more than one business owner, or an unregistered writer is a blocking failure.

### 10.3 Tenancy

- Every organization-scoped root row carries non-null `organization_id`.
- Reads by primary key also constrain `organization_id`.
- Cross-organization reads return non-disclosing absence.
- Cross-organization mutations fail.
- Natural-key uniqueness is organization-scoped unless explicitly registered as global.
- Trusted organization identity is supplied by server composition.
- Browser payloads, query strings, route params, and `FormData` cannot choose the storage tenant.
- RLS session binding is defense in depth, not a substitute for package tenancy tests.

### 10.4 Store contracts

A feature store contract:

- is persistence-agnostic;
- exposes the smallest capability required by the feature;
- contains no ORM or SQL type;
- states transaction, concurrency, retry, and idempotency expectations;
- preserves deterministic ordering and cursor semantics;
- returns canonical outcomes;
- contains no application or bounded-context-external policy.

### 10.5 Memory and Drizzle parity

Where both adapters exist, they must produce equivalent semantic outcomes for:

- create, retrieve, update, list, and terminal-state behavior;
- organization isolation;
- natural-key uniqueness;
- optimistic concurrency;
- idempotent replay;
- pagination and stable ordering;
- missing references;
- invariant rejection;
- transaction rollback;
- canonical error codes.

### 10.6 Atomic mutation boundary

For operations requiring transactionality:

```text
authorization
  → approval verification
  → idempotency claim/replay
  → business invariant evaluation
  → state mutation
  → audit append
  → outbox append
  → commit
  → event publication after commit
```

Required proofs:

- state failure creates no audit or event;
- audit failure rolls back state;
- outbox failure rolls back state and audit;
- success creates exactly the declared audit and outbox facts;
- replay duplicates neither state, audit, nor event;
- no event escapes before commit.

---

## 11. Cross-module integration

Peer ERP imports are denied by default.

### 11.1 Event-first integration

Use events when the downstream module reacts independently to a completed fact.

Events contain stable identifiers, organization identity, version, actor, correlation, and minimal stamped display values. They do not expose secrets, unrestricted protected data, full documents, or mutable internal representations.

### 11.2 Registered narrow ports

A synchronous peer capability requires:

- a demonstrated need that cannot be satisfied by an event;
- an explicit port contract;
- caller and provider owner approval;
- architecture-owner approval;
- workspace-edge registration;
- failure, timeout, retry, and transaction semantics;
- a consumer contract test.

A port does not permit peer implementation imports or lateral table writes.

### 11.3 Application saga

A multi-package user workflow belongs in application composition when no package owns the whole business transaction.

A standard web feature capsule imports exactly one ERP root facade. A cross-package saga is therefore isolated in:

```text
apps/web/lib/erp/orchestration/<workflow>.ts
```

The orchestrator:

- has an approved application-orchestration admission record;
- imports only root facades and registered application ports;
- owns no domain invariant belonging to a package;
- defines compensation or partial-failure semantics;
- returns canonical application outcomes;
- is invoked by a capsule Action through an app-local capability;
- cannot write tables or import Drizzle directly.

### 11.4 Master-data consumption

Transactional modules:

- reference master records by registered identifiers;
- stamp codes and required display fields at create or post time when historical truth requires it;
- use the master-data public API or an approved lookup port;
- do not create shadow customer, supplier, product, party, or legal-entity tables;
- do not mutate master-data tables laterally.

---

## 12. `apps/web` ownership and mandatory topology

`apps/web` is the single deployable Next.js application for public, operator, client, and machine-facing surfaces.

```text
apps/web/
├── app/
│   ├── (public)/
│   ├── (operator)/
│   ├── (client)/
│   └── api/
├── features/
│   ├── chrome/
│   └── <module-id>/
│       └── <feature-group>/
│           └── <feature>/
├── lib/
│   └── erp/
│       ├── <module-composition-files>
│       └── orchestration/
├── __tests__/
├── proxy.ts
├── globals.css
├── scaffold.lock.json
├── next.config.ts
└── vercel.json
```

The four route buckets are exactly:

```text
(public)
(operator)
(client)
api
```

A route does not create a fifth bucket by inventing a top-level product folder.

### 12.1 Route capsules

A product route capsule contains Next.js reserved files only, such as:

```text
page.tsx
layout.tsx
loading.tsx
error.tsx
not-found.tsx
template.tsx
default.tsx
```

An API capsule uses `route.ts` only for machine-facing concerns such as:

- health;
- authentication callbacks;
- session endpoints;
- cron;
- webhooks;
- externally consumed APIs.

An RSC product route must not call the app’s own API route to read ERP data.

### 12.2 Thin-page rule

A new or adopted ERP `page.tsx`:

- is a server component;
- stays within the governed 40-line budget;
- does not await product data;
- does not perform authorization;
- does not import an ERP package directly;
- delegates rendering to the mirrored feature capsule;
- contains no business transformation.

### 12.3 Composition root

Production package construction, authorization ports, master lookups, audit/outbox adapters, and application-level orchestration live under:

```text
apps/web/lib/erp/
```

This surface may import `/adapters/drizzle`. Route and feature UI code may not.

---

## 13. Mirrored web feature capsule

The canonical mirror includes the full backend relative path:

```text
packages/erp/<module-id>/src/features/<feature-group>/<feature>
apps/web/features/<module-id>/<feature-group>/<feature>
```

A web capsule without the backend owner is prohibited.

Existing flat two-level capsules are legacy migration surfaces. New work must use the full mirror. The `module-mirror` guard must resolve nested backend features before this contract can be claimed fully enforced.

### 13.1 Uniform grammar

```text
apps/web/features/<module-id>/<feature-group>/<feature>/
├── index.ts
├── view.tsx
├── loader.ts
├── actions.ts
├── schema.ts
├── view-model.ts
├── metadata.ts
├── skeletons.tsx
├── copy.ts
├── parts/
└── __tests__/
```

Permitted files are limited to:

```text
index.ts
view.tsx
loader.ts
actions.ts
schema.ts
view-model.ts
metadata.ts
skeletons.tsx
copy.ts
```

Permitted directories are limited to:

```text
parts/
__tests__/
```

Omit files and directories without real content.

### 13.2 Capsule responsibilities

| Surface | Responsibility |
| --- | --- |
| `view.tsx` | Server-first feature composition, Suspense boundaries, and product state selection |
| `loader.ts` | Server-only reads through exactly one ERP root facade |
| `actions.ts` | Mutations through the canonical authorized Action seam |
| `schema.ts` | Transport and form validation; not a duplicate domain authority |
| `view-model.ts` | Pure display shaping with no I/O, auth, route, or mutation |
| `metadata.ts` | Feature-owned page metadata projection |
| `skeletons.tsx` | Feature-specific loading presentation |
| `copy.ts` | Feature-local user-facing copy and labels |
| `parts/` | Server leaves and bounded interactive client islands |
| `index.ts` | Private capsule projection for route consumption |

### 13.3 Capsule isolation

A capsule:

- imports exactly one ERP root facade in its loader and Actions;
- does not import a sibling capsule;
- does not import another module capsule;
- does not import Drizzle, database tables, package internals, or adapter subpaths;
- does not re-export its internals as an app-wide generic library;
- does not own shared chrome;
- does not create a parallel domain store;
- does not hide a cross-module saga inside a component or loader.

Shared non-domain navigation and shell composition belongs under `features/chrome`. Reusable UI primitives or thin compounds follow the `@afenda/ui-system` promotion rule.

---

## 14. Loaders, view models, and rendering

### 14.1 Loader contract

A loader:

- is server-only;
- imports the root facade of its mirrored ERP module;
- receives or resolves an application-approved trusted read context;
- does not call direct auth APIs in feature code;
- does not import session permission implementation details;
- does not mutate;
- returns canonical feature data or an explicit load outcome;
- does not return ORM rows or package-internal types;
- does not call the app’s own API route.

Package queries still enforce authorization internally.

### 14.2 View-model contract

A view model is pure:

- no I/O;
- no package imports;
- no auth;
- no cache mutation;
- no route navigation;
- no environment access;
- no current-time read unless time is explicit input;
- no React hooks.

It may transform canonical public package data into display-ready values.

### 14.3 Server-first rendering

- `view.tsx` and non-interactive parts remain server components.
- `"use client"` appears only on interactive leaves.
- A client island receives serializable data and callbacks.
- A client component never imports an ERP package.
- A client component never chooses organization identity, permission truth, or approval truth.
- Suspense and loading states are feature-owned.
- Route `page.tsx` remains a composition anchor, not a data loader.

---

## 15. Server Action contract

All new ERP mutations live in the mirrored capsule’s `actions.ts`.

Legacy `apps/web/app/actions/**` surfaces are frozen migration areas. They may shrink or be moved; they may not receive new ERP capability ownership.

Every Action uses the canonical seam:

```text
withAuthorizedAction()
  → validate transport input
  → resolve trusted session organization and actor
  → establish correlation and idempotency metadata
  → call one ERP root facade or approved app orchestrator
  → map Result to ActionResult
  → revalidate only affected paths or tags
```

### 15.1 Mandatory Action behavior

An Action:

1. Uses `"use server"`.
2. Uses `withAuthorizedAction()` or its registered canonical successor.
3. Resolves organization and actor from the trusted session.
4. Rejects or omits browser-supplied `organizationId`, `actorUserId`, permission, approval, role, and tenant scope.
5. Parses a narrow transport schema.
6. Generates or resolves correlation metadata.
7. Uses a stable idempotency key when the operation requires it.
8. Calls the root package facade or approved application orchestrator.
9. Maps canonical package `Result` to `ActionResult`.
10. Preserves canonical public error codes and safe messages.
11. Revalidates only affected routes or tags.
12. Imports no table, SQL, Drizzle adapter, environment reader, or package internal.
13. Does not weaken package authorization because app authorization already passed.
14. Fails closed when session, permission, approval, or composition capability is missing.

### 15.2 Query and mutation separation

- Loaders perform reads.
- Actions perform mutations.
- A query does not hide a write.
- An Action does not become the ordinary read path.
- A route does not self-fetch its own API.
- Revalidation is not a substitute for a successful committed mutation.

---

## 16. UI composition policy

### 16.1 UI-system consumption

Allowed:

```ts
import { Button, DataTable, FormField } from "@afenda/ui-system";
import "@afenda/ui-system/styles.css";
```

Forbidden:

```text
@afenda/ui-system/components/*
apps/web/components/ui/**
parallel UI primitive packages
domain services inside @afenda/ui-system
```

### 16.2 Ownership split

| Concern | Owner |
| --- | --- |
| Tokens, primitives, thin shared compounds | `@afenda/ui-system` |
| Tailwind compilation, Preflight, source scanning, brand fonts | `apps/web/globals.css` |
| Feature forms and domain widgets | Mirrored web capsule |
| Product route layout and navigation | `apps/web` |
| Permission and approval truth | ERP package plus trusted application seam |
| Table data, URL synchronization, saved views, domain filters | Web feature capsule |
| Generic DataTable rendering and slots | `@afenda/ui-system` |

### 16.3 Required user states

Every user-facing feature identifies and verifies applicable states:

- loading;
- empty;
- no-result;
- success;
- validation failure;
- forbidden;
- not found;
- conflict or stale version;
- approval required or pending;
- retryable infrastructure failure;
- non-retryable failure;
- disabled or read-only;
- idempotent replay result.

Only shipped capabilities appear in navigation, tabs, menus, and action lists.

### 16.4 Accessibility and responsive behavior

Where UI exists, verification covers:

- keyboard operation;
- visible focus;
- accessible names and descriptions;
- error association;
- dialog and menu focus management;
- table and form semantics;
- reduced-motion behavior where motion exists;
- 390px-width overflow;
- desktop workspace behavior;
- localized and long-string resilience.

---

## 17. End-to-end execution flows

### 17.1 Query flow

```text
route page.tsx
  → feature view.tsx
  → feature loader.ts
  → @afenda/<module-id> root query
  → package authorization
  → feature store contract
  → production adapter
  → canonical public projection
  → pure view-model
  → server render
  → bounded client islands
```

### 17.2 Mutation flow

```text
user interaction
  → feature actions.ts
  → withAuthorizedAction()
  → trusted session context
  → transport schema
  → correlation + idempotency metadata
  → @afenda/<module-id> root command
  → canonical operation registry
  → package authorization
  → approval verification
  → feature guards and policy
  → transaction
      → state write
      → audit append
      → outbox append
  → commit
  → Result
  → ActionResult
  → targeted revalidation
  → loader refresh
  → rendered outcome
```

### 17.3 Cross-module saga flow

```text
feature Action
  → approved app-local orchestration capability
  → package A root facade
  → package B root facade
  → declared compensation / partial-failure policy
  → canonical application outcome
  → ActionResult
```

The orchestrator does not create a third copy of either package’s rules.

---

## 18. Requirement register

### 18.1 ERP admission and ownership — `ERP-ADM`, `ERP-OWN`

| ID | Requirement | Class | Method |
| --- | --- | --- | --- |
| ERP-ADM-001 | Module exists in the approved roadmap and package register before source creation | M | A, I |
| ERP-ADM-002 | Package path and package name match `packages/erp/<module-id>` and `@afenda/<module-id>` | M | A |
| ERP-ADM-003 | Accepted domain architecture and PRD exist before feature implementation | M | I |
| ERP-ADM-004 | Feature group, feature ID, mission, owner, operations, and mutation tables are recorded | M | A, I |
| ERP-ADM-005 | Backend, web, and rollout statuses are recorded independently | M | A |
| ERP-ADM-006 | Every dependency style is declared as event, port, or app saga | M | I |
| ERP-OWN-001 | Package is sole business mutator of every registered mutation table | M | A, T |
| ERP-OWN-002 | `@afenda/db` contains no ERP business command or lifecycle policy | M | A |
| ERP-OWN-003 | `apps/web` contains no ERP business invariant or direct mutation SQL | M | A, T |
| ERP-OWN-004 | No feature re-owns another module’s vocabulary or master records | M | I, A |
| ERP-OWN-005 | No shadow master-data table exists | M | A |
| ERP-OWN-006 | Every public operation has exactly one feature owner | M | A, T |
| ERP-OWN-007 | Package-wide kernel contains no feature-specific business layer | M | A, I |
| ERP-OWN-008 | No package-wide generic business layer farm exists at `src/` | M | A |

### 18.2 ERP feature architecture — `ERP-FTR`

| ID | Requirement | Class | Method |
| --- | --- | --- | --- |
| ERP-FTR-001 | Feature path is `src/features/<feature-group>/<feature>` | M | A |
| ERP-FTR-002 | Files exist only when they contain real behavior | M | A, I |
| ERP-FTR-003 | Feature does not import facade, composition, testing, or sibling internals | M | A |
| ERP-FTR-004 | Store contract is feature-owned and persistence-agnostic | C | A, I |
| ERP-FTR-005 | Memory adapter exists before Drizzle parity is claimed | C | T |
| ERP-FTR-006 | `definition.ts`, generic `operations.ts`, `commands/`, `queries/`, and `relational.ts` are absent | M | A |
| ERP-FTR-007 | Feature-level port exists only for an accepted external capability | C | I |
| ERP-FTR-008 | Business rules and lifecycle transitions are testable without production persistence | M | T |
| ERP-FTR-009 | Public types expose no ORM, SQL, secret, or negative-ownership field | M | A, T |

### 18.3 Operations and facade — `ERP-OPS`

| ID | Requirement | Class | Method |
| --- | --- | --- | --- |
| ERP-OPS-001 | Every public command and query has one canonical operation definition | M | A, T |
| ERP-OPS-002 | Operation IDs are stable, unique, and business-named | M | A |
| ERP-OPS-003 | Permission, authorization, approval, privacy, transaction, idempotency, audit, emission, and observability dispositions are complete | M | A, T |
| ERP-OPS-004 | Package projections derive from operation definitions | M | A, T |
| ERP-OPS-005 | Missing or contradictory operation metadata fails closed | M | T |
| ERP-OPS-006 | Root facade exports only declared public operations and public contracts | M | A, T |
| ERP-OPS-007 | Public failures use canonical `Result` outcomes | M | A, T |
| ERP-OPS-008 | Internal refactor requires zero production-consumer edits | M | D |
| ERP-OPS-009 | Production consumers use the root facade | M | A |
| ERP-OPS-010 | `/adapters/drizzle` and `/testing` consumer classes are enforced | C | A, T |

### 18.4 Persistence, tenancy, and atomicity — `ERP-PER`

| ID | Requirement | Class | Method |
| --- | --- | --- | --- |
| ERP-PER-001 | Operation, manifest, schema-ownership, and actual-write tables have exact parity | M | A, T |
| ERP-PER-002 | Every tenant root has non-null `organization_id` | M | A, T |
| ERP-PER-003 | Every read and write constrains trusted organization context | M | T |
| ERP-PER-004 | Browser-controlled organization identity is absent or rejected | M | A, T |
| ERP-PER-005 | Natural-key uniqueness is enforced in the correct tenant scope | M | T |
| ERP-PER-006 | Optimistic concurrency produces canonical conflict outcomes | C | T |
| ERP-PER-007 | Memory and Drizzle adapters have semantic parity | C | T |
| ERP-PER-008 | Required state, audit, and outbox changes are atomic | C | T |
| ERP-PER-009 | Replay does not duplicate state, audit, or event facts | C | T |
| ERP-PER-010 | No event is published before transaction commit | C | T |

### 18.5 Integration — `ERP-INT`

| ID | Requirement | Class | Method |
| --- | --- | --- | --- |
| ERP-INT-001 | Cross-module integration is event-first | M | I, A |
| ERP-INT-002 | Every peer port has dual-control approval and a workspace edge | C | A, I |
| ERP-INT-003 | Peer ERP implementation imports and lateral table writes are absent | M | A |
| ERP-INT-004 | Multi-package sagas live in approved application composition | C | A, I, T |
| ERP-INT-005 | Master lookups use public capabilities or registered ports | C | A, T |
| ERP-INT-006 | Event payloads contain minimal canonical facts and no protected internal representation | C | T, I |

### 18.6 Web topology — `WEB-TOP`

| ID | Requirement | Class | Method |
| --- | --- | --- | --- |
| WEB-TOP-001 | Top-level route buckets are exactly `(public)`, `(operator)`, `(client)`, and `api` | M | A |
| WEB-TOP-002 | Product route capsules contain only permitted Next.js reserved files | M | A |
| WEB-TOP-003 | ERP `page.tsx` is server-only, within 40 lines, and performs no product data await | M | A |
| WEB-TOP-004 | Web feature capsule mirrors the full backend feature path | M | A |
| WEB-TOP-005 | Web capsule contains only the uniform grammar | M | A |
| WEB-TOP-006 | Capsule imports no sibling or other-module capsule | M | A |
| WEB-TOP-007 | New ERP Actions are not added under legacy `app/actions/**` | M | A |
| WEB-TOP-008 | API routes are not used for internal RSC product reads | M | A, T |
| WEB-TOP-009 | Adoption and legacy paths obey `scaffold.lock.json` | M | A |

### 18.7 Web data and rendering — `WEB-DAT`

| ID | Requirement | Class | Method |
| --- | --- | --- | --- |
| WEB-DAT-001 | Loader imports exactly one mirrored ERP root facade | M | A |
| WEB-DAT-002 | Loader performs no mutation and no direct feature-level auth implementation | M | A, T |
| WEB-DAT-003 | Loader returns public package projections, not ORM or internal types | M | A, T |
| WEB-DAT-004 | View model is pure | M | A, T |
| WEB-DAT-005 | Client islands do not import ERP packages | M | A |
| WEB-DAT-006 | Organization, permission, and approval truth are not client-controlled | M | A, T |
| WEB-DAT-007 | Route and feature rendering handles every applicable declared user state | M | T, D |
| WEB-DAT-008 | Navigation and tabs expose only shipped capabilities | M | T, I |

### 18.8 Server Actions — `WEB-ACT`

| ID | Requirement | Class | Method |
| --- | --- | --- | --- |
| WEB-ACT-001 | Every new ERP Action uses the canonical authorized Action seam | M | A, T |
| WEB-ACT-002 | Action transport input is narrowly validated | M | T |
| WEB-ACT-003 | Trusted session supplies organization and actor identity | M | T |
| WEB-ACT-004 | Spoofed organization, actor, permission, role, or approval input is rejected or absent | M | T, A |
| WEB-ACT-005 | Correlation and required idempotency metadata are established server-side | M | T |
| WEB-ACT-006 | Action calls a root facade or approved app orchestrator only | M | A |
| WEB-ACT-007 | Canonical `Result` maps to canonical `ActionResult` without unsafe detail leakage | M | T |
| WEB-ACT-008 | Revalidation is targeted and occurs only after success | M | T |
| WEB-ACT-009 | Action imports no database, SQL, Drizzle, raw environment, or package internal | M | A |
| WEB-ACT-010 | Missing session, authorization, approval, or runtime composition fails closed | M | T |

### 18.9 UI and accessibility — `WEB-UI`

| ID | Requirement | Class | Method |
| --- | --- | --- | --- |
| WEB-UI-001 | UI-system consumption uses the package barrel and stylesheet only | M | A |
| WEB-UI-002 | `apps/web/components/ui/**` and UI-system deep imports are absent | M | A |
| WEB-UI-003 | Product forms and domain widgets remain in the mirrored capsule | M | A, I |
| WEB-UI-004 | Client directives occur only on interactive leaves | M | A |
| WEB-UI-005 | Semantic tokens are used instead of raw product colors | M | A |
| WEB-UI-006 | Keyboard, focus, labels, error association, and overlay behavior are verified | C | T, D |
| WEB-UI-007 | 390px and desktop layouts have no unintended overflow | C | T, D |
| WEB-UI-008 | Long, localized, and right-to-left text does not break critical workflows | C | T, D |

### 18.10 Integrated completion — `E2E`

| ID | Requirement | Class | Method |
| --- | --- | --- | --- |
| E2E-001 | Every accepted PRD requirement maps to an implementation and verification location | M | A, I |
| E2E-002 | Backend status, web status, and rollout status are evidence-derived | M | A |
| E2E-003 | A user workflow calls the intended root facade and no alternate mutation path | C | T |
| E2E-004 | Authorization is enforced in both application and package boundaries | C | T |
| E2E-005 | Conflict, replay, rollback, and redaction behavior are visible correctly at the app boundary | C | T, D |
| E2E-006 | Migration impact and production prerequisite status are recorded | C | I |
| E2E-007 | Exact pass, fail, skip, and not-applicable counts are recorded | M | A, I |
| E2E-008 | No full-stack completion claim exists while a required lane is `BLOCKED`, `PARTIAL`, or unproved | M | A |
| E2E-009 | Integrated evidence names package, DB, web, routes, commit, and digests | M | I |
| E2E-010 | Activation is separate from verification and requires an explicit rollout decision | M | I |

---

## 19. Gate matrix

### 19.1 Existing mandatory gates

| Gate | Blocks | Command |
| --- | --- | --- |
| Module catalog and manifest parity | Backend `SCAFFOLDED` | `pnpm validate:modules` |
| Package and dependency governance | Backend `SCAFFOLDED` | `pnpm governance:packages` |
| ERP lint | Backend `SCAFFOLDED` | `pnpm --filter @afenda/<module-id> lint` |
| ERP typecheck | Backend `SCAFFOLDED` | `pnpm --filter @afenda/<module-id> typecheck` |
| ERP tests | Backend `IMPLEMENTED` | `pnpm --filter @afenda/<module-id> test` |
| Tenancy-root audit | Backend `VERIFIED` when schema changes | `pnpm audit:tenancy-nulls` |
| Database package tests | Backend `VERIFIED` when schema changes | repository-approved `@afenda/db` test command |
| Web scaffold | Web `SCAFFOLDED` | `pnpm check:web-scaffold` |
| Web typecheck | Web `IMPLEMENTED` | `pnpm --filter @afenda/web typecheck` |
| Web tests | Web `IMPLEMENTED` | `pnpm --filter @afenda/web test` |
| UI-system integration | Web `VERIFIED` when UI changes | `pnpm check:ui-system` |
| Full repository checks | Integrated `VERIFIED` | `pnpm checks` |

### 19.2 Frontend structural checks

`pnpm check:web-scaffold` contains exactly these structural check IDs unless this contract and the gate are amended together:

```text
bucket-closure
reserved-filename-tier
route-capsule-purity
no-data-await-in-page
capsule-grammar
capsule-isolation
module-mirror
client-island-boundary
no-direct-auth-in-loader
view-model-purity
action-wrapper-parity
sealed-integrity
anchor-presence
barrel-optimization-parity
no-banned-tree
```

The grouped backend and web mirror introduced by this contract requires `module-mirror` and capsule traversal to resolve:

```text
<module-id>/<feature-group>/<feature>
```

A gate that checks only `<module-id>/<feature>` is incomplete evidence.

### 19.3 Required integrated gate

The repository must provide one aggregate command that evaluates one module and emits structured evidence for:

- package identity and exports;
- feature topology;
- operation-registry completeness;
- module-manifest parity;
- schema-ownership and actual-write parity;
- memory/Drizzle parity;
- tenancy;
- consumer imports;
- web mirror;
- Action wrapper parity;
- route mapping;
- UI boundary;
- integrated tests;
- digest calculation.

Recommended command surface:

```text
pnpm governance:erp-web --module <module-id>
```

Until this aggregate exists, equivalent constituent commands may satisfy verification only when one evidence record proves they ran against the same commit and working-tree digest.

---

## 20. Evidence and integration record

A full-stack integration record contains:

- module ID and package;
- feature group and feature ID;
- accepted PRD requirement IDs;
- backend status;
- web status;
- rollout status;
- package commit and digest;
- operation-registry digest;
- module-manifest digest;
- mutation-table list;
- schema and migration digests;
- schema-ownership result;
- memory/Drizzle parity result;
- tenancy result;
- root facade export list;
- web capsule path and digest;
- route list;
- Action list;
- UI states verified;
- accessibility and responsive results;
- CI run identifier;
- exact pass, fail, skip, and not-applicable counts;
- migration prerequisites;
- active blockers;
- package-owner signature;
- application-owner signature;
- architecture-owner signature;
- security-owner signature when C1.

An integration record is invalid when any required path, dependency, operation, table, route, Action, or digest changes.

Historical package seals under `KERNEL-GOVERNANCE.md` remain separate. The integration record attests the connection between a package revision, relational revision, and web revision.

---

## 21. Waiver protocol

Only requirements explicitly classified `W` are waiverable. This document currently defines no standing `W` requirement.

A future waiverable requirement must be amended into the register before a waiver can exist.

No waiver may authorize:

- ambiguous business ownership;
- lateral table mutation;
- browser-controlled organization identity;
- missing package authorization;
- skipped audit or outbox atomicity;
- unsafe error disclosure;
- direct client import of ERP packages;
- unregistered peer imports;
- invented backend or frontend capabilities;
- activation without required evidence.

When an eligible waiver exists, it must name the requirement, paths, digest, justification, compensating control, owner, expiry, and lifecycle stage invalidated. Maximum duration is 90 days.

---

## 22. Adoption and migration

The repository may contain older ERP and web shapes. Adoption is progressive, not a pretext for preserving new drift.

### 22.1 Classification

| Class | Rule |
| --- | --- |
| New | Must conform fully on creation |
| Adopted | Full applicable governance is enforced |
| Legacy | Frozen by an adoption record; may shrink or migrate but may not expand |
| Sealed | Digest-protected; modification requires explicit unsealing and re-verification |

### 22.2 Required migrations

The following older shapes are migration targets:

- flat package-wide business files at `src/`;
- package-wide `adapters`, `store`, `schemas`, `shared`, or generic type layers;
- feature definitions duplicated in manifests and authorization maps;
- root-level `apps/web/app/actions/**` ERP Actions;
- web capsules that do not mirror the full grouped backend path;
- route pages that await ERP data;
- direct route or component imports of ERP packages;
- hand-rolled `apps/web/components/ui/**`;
- application mutation code importing DB tables or Drizzle.

### 22.3 Migration protocol

1. Inventory and classify the existing path.
2. Freeze its current scope and record the accepted target.
3. Move one bounded capability without changing product meaning.
4. Run backend, web, and integrated evidence against the same commit.
5. Remove superseded paths and update the adoption register.
6. Do not leave compatibility shims that create a second business surface.

No big-bang rewrite is required. No new feature may copy a legacy shape merely because migration is incomplete elsewhere.

---

## 23. Rejected designs

The following are permanently rejected unless this governance contract is amended:

- `@afenda/erp` or an ERP gateway package;
- peer ERP implementation imports;
- direct ERP table writes from `apps/web`;
- business commands in `@afenda/db`;
- package-wide generic layer farms;
- feature `commands/` and `queries/` directories;
- a second operation registry;
- manually synchronized permission, authorization, event, or mutation maps;
- browser-supplied organization or actor identity;
- route-only authorization;
- loaders that perform mutations;
- Actions as the ordinary read path;
- internal RSC self-fetch through `app/api`;
- route pages that own data loading and business transformation;
- web feature capsules with no backend owner;
- sibling capsule imports;
- multiple ERP facades inside a standard feature capsule;
- hidden application sagas inside components;
- ERP imports in client components;
- package adapter imports in product routes;
- `apps/web/components/ui/**`;
- UI-system deep imports;
- domain rules inside `@afenda/ui-system`;
- placeholder screens, fake data, stub operations, or empty architecture files used to claim completion;
- a full-stack `DONE` claim assembled from independent partial evidence.

---

## 24. Normative invariants

1. Every ERP capability has one bounded-context owner.
2. Every public operation has one feature-owned canonical definition.
3. Every business table has one ERP business mutator.
4. Database ownership and business ownership are distinct.
5. Feature meaning never moves into package-wide generic layers.
6. Features do not import facade, composition, testing, or sibling internals.
7. Package manifests and policy maps are derived projections.
8. Production consumers use the root facade.
9. Application composition alone may construct production adapters.
10. Browser input never controls tenant, actor, permission, approval, or internal policy.
11. Package authorization remains authoritative even after app authorization.
12. State, audit, and outbox behavior is atomic when required.
13. Cross-module integration is event-first, port-second, app-saga-third.
14. A standard web capsule mirrors one backend feature and one ERP facade.
15. A route is thin; a feature capsule owns the user workflow.
16. Loaders read, Actions mutate, and view models remain pure.
17. Client islands never import ERP packages.
18. UI primitives come from the governed UI-system barrel.
19. Backend, web, and rollout statuses are independent.
20. Full-stack completion requires one evidence chain across package, database, and web digests.
