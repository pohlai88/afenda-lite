# ERP package family — product requirements document

| Field | Value |
| --- | --- |
| Product surface | `packages/erp/*` |
| Product type | Server-side ERP business capability family |
| Status | Normative family PRD |
| Primary consumers | `apps/web`, approved workers, tests, and registered integrations |
| Architecture | Feature-first semantic modular monolith per package |
| Persistence | ERP-owned relational surfaces represented by `@afenda/db` |
| Public API | Root-only business facade per module |
| Product quality bar | Enterprise transactional correctness with evidence |

---

## 1. Product mission

The ERP package family provides reusable, tenant-safe, auditable, and application-neutral business capabilities for Afenda products.

Each ERP package owns one bounded context. It converts accepted business rules into:

- canonical business vocabulary;
- validated commands and queries;
- deterministic lifecycle and invariant behavior;
- package-level authorization;
- persistence contracts and sole-mutator implementations;
- audit and event outcomes;
- stable root facade operations;
- evidence that the business behavior, relational behavior, and public API agree.

The ERP family is not a collection of schemas, CRUD repositories, route handlers, or generated files. Its product is **trusted business behavior**.

---

## 2. Product principles

1. **One bounded context per package.**
2. **One feature owner per operation.**
3. **One business mutator per table.**
4. **Product meaning precedes implementation.**
5. **The package remains application-neutral.**
6. **Authorization is enforced inside the package.**
7. **Tenant identity is trusted server context, never browser authority.**
8. **Business outcomes use canonical `Result`.**
9. **State, audit, and outbox effects are atomic when required.**
10. **Feature registries are semantic owners; manifests and catalogs are projections.**
11. **Memory behavior precedes or accompanies production-adapter parity.**
12. **Completion is evidence-derived, not asserted.**

---

## 3. Users and stakeholders

### 3.1 Business users

Business users interact through approved application surfaces. They require:

- correct business terminology;
- safe workflows;
- predictable validation;
- clear status and conflict outcomes;
- permissions and approvals aligned with responsibility;
- historical truth;
- reliable lists, searches, and reports;
- no cross-organization disclosure.

### 3.2 Application developers

Application developers require:

- one stable package root;
- business-named operations;
- no ORM leakage;
- safe public input and output types;
- canonical error codes;
- predictable authorization and tenancy;
- testable memory composition;
- production composition isolated from product UI.

### 3.3 Package maintainers

Maintainers require:

- one canonical feature topology;
- operation-level ownership;
- dependency and mutation boundaries;
- deterministic gates;
- migration-safe public contracts;
- precise evidence and lifecycle status.

### 3.4 Architecture, security, audit, and operations

These stakeholders require:

- traceable ownership;
- negative-path tests;
- transaction and idempotency proof;
- audit completeness;
- event versioning;
- threat review for C1 behavior;
- exact deployment and migration prerequisites.

---

## 4. Product scope

The family supports the following capability classes when admitted by a module PRD:

| Capability class | Required product behavior |
| --- | --- |
| Master and reference management | Canonical identity, validity, deduplication, effective dating, safe lookup |
| Transaction processing | Valid lifecycle transitions, totals, concurrency, posting, reversal, closure |
| Obligation and settlement | Due-state truth, allocation, matching, reconciliation, aging |
| Inventory and logistics | Quantities, reservations, movements, custody, fulfillment status |
| Financial control | Monetary precision, accounting disposition, period control, auditability |
| Administrative governance | Entities, licenses, contracts, insurance, facilities, subscriptions, obligations |
| Workforce operations | Employment, assignment, time, leave, learning, payroll integration |
| Planning and operational control | Approved plans, versions, effective periods, variances, execution status |
| Read models and reporting projections | Rebuildable, traceable, staleness-aware public projections |

A module PRD must define its own accepted subset. This family PRD does not admit a module merely because a capability class is listed.

---

## 5. Explicit non-scope

ERP packages do not own:

- HTTP, REST, GraphQL, Next.js routes, Server Actions, or UI;
- session implementation;
- browser-provided tenant identity;
- application navigation;
- infrastructure credentials;
- generic UI primitives;
- direct peer-module table mutation;
- cross-domain umbrella registries;
- unbounded “shared” helpers;
- product requirements invented from existing tables;
- regulatory or statutory conclusions without accepted qualified authority;
- analytics warehouses or BI presentation unless specifically admitted as a bounded context.

---

## 6. Package admission requirements

A module is admitted only when all are defined:

1. Module ID, package name, owners, criticality, and activation mode.
2. One coherent bounded-context mission.
3. Explicit non-ownership.
4. Feature groups and features.
5. Canonical vocabulary.
6. Actors and permission model.
7. Aggregate and lifecycle ownership.
8. Mutation tables or planned schema ownership.
9. Required commands and queries.
10. Approval, privacy, idempotency, audit, event, and transaction dispositions.
11. Cross-module integration style.
12. Accepted application consumers.
13. Migration posture.
14. Evidence and rollout prerequisites.

No implementation file is admission evidence by itself.

---

## 7. Required module product surfaces

Every admitted module must provide, as applicable:

### 7.1 Business facade

- root package export;
- business-named operations;
- public schemas and types;
- canonical outcomes;
- no storage or internal registry leakage.

### 7.2 Feature behavior

- invariant validation;
- lifecycle transitions;
- normalization;
- permission and approval requirements;
- deterministic ordering;
- conflict behavior;
- idempotency behavior;
- audit and event disposition.

### 7.3 Persistence

- feature-owned store contract;
- memory implementation where the behavior is independently testable;
- production implementation;
- organization isolation;
- uniqueness and concurrency;
- atomic write behavior;
- semantic adapter parity.

### 7.4 Composition

- canonical feature registry composition;
- production adapter binding;
- package manifest projection;
- accepted integration ports;
- deterministic package construction.

### 7.5 Testing and evidence

- behavior and rejection tests;
- authorization and tenancy negatives;
- lifecycle and invariant tests;
- parity and boundary tests;
- consumer compile checks;
- migration and DB evidence where applicable.

---

## 8. Feature model

The permanent taxonomy is:

```text
module
  → feature group
    → feature
      → aggregate or business capability
        → command/query operation
```

### 8.1 Feature-group rule

A feature group:

- represents a stable business responsibility family;
- is not a technical layer;
- does not duplicate the module name;
- does not exist merely to keep directory counts balanced.

### 8.2 Feature rule

A feature:

- has one bounded mission;
- owns its vocabulary and rules;
- owns its canonical operations;
- owns its persistence contract where applicable;
- is independently testable;
- does not import sibling implementation.

### 8.3 Operation rule

An operation:

- has one stable ID;
- is either command or query;
- has one public business name;
- records its authorization and execution dispositions;
- has a declared output and error contract;
- is represented exactly once in the canonical feature registry.

---

## 9. Functional requirements

### 9.1 Command requirements

Every command must:

1. Accept trusted execution context separately from business input.
2. Reject cross-organization references.
3. Enforce package authorization.
4. Verify required approval evidence.
5. Validate business invariants.
6. Enforce expected version when concurrency matters.
7. Enforce or support idempotency as declared.
8. Execute inside the declared transaction boundary.
9. Append required audit facts.
10. Append required outbox events.
11. Return a canonical success or failure outcome.
12. Avoid partial mutation.

### 9.2 Query requirements

Every query must:

1. Enforce organization scope.
2. Enforce package authorization or registered public-read policy.
3. Be side-effect free.
4. Return stable public projections.
5. Use deterministic ordering.
6. Define pagination and cursor behavior where collections are unbounded.
7. Avoid returning secrets, internal diagnostics, or storage representations.
8. Distinguish non-disclosing absence from forbidden detail where security requires it.

### 9.3 Lifecycle requirements

Every lifecycle-owning feature must define:

- complete state vocabulary;
- allowed transitions;
- prohibited transitions;
- terminal states;
- reopening or reversal policy;
- effective-date behavior;
- concurrency behavior;
- transition audit facts;
- emitted events;
- user-visible conflict outcomes.

### 9.4 Monetary and quantity requirements

Where applicable:

- monetary values use canonical money representation;
- floating-point monetary arithmetic is prohibited;
- rounding mode and allocation remainder behavior are explicit;
- quantities use registered dimensions and units;
- conversion behavior is explicit and property-tested;
- historical stamped values are retained when later master-data changes must not rewrite truth.

### 9.5 Reference requirements

References must:

- identify the owner module;
- constrain tenant scope;
- define behavior when the referenced record becomes inactive;
- avoid shadow copies except explicit historical stamps;
- reject dangling or cross-tenant references.

---

## 10. Authorization, approval, and separation of duties

The package is the final business authorization boundary.

Each operation records:

- required permission;
- authorization policy;
- approval policy or `none`;
- privacy policy or `none`;
- actor restrictions;
- separation-of-duties constraints;
- delegated or system-actor rules where applicable.

The package must not trust:

- UI visibility;
- route guards;
- client-provided roles;
- client-provided approval claims;
- caller assertions that authorization already occurred.

For C1 operations, negative-path coverage is mandatory.

---

## 11. Tenancy and privacy

Every organization-scoped operation:

- receives organization identity from trusted execution context;
- constrains every root read and write by organization;
- rejects cross-organization references;
- prevents enumeration through unsafe error detail;
- records privacy disposition;
- redacts diagnostics and audit detail according to policy;
- does not expose internal cause chains publicly.

Global records require explicit admission and cannot be inferred from a missing `organization_id`.

---

## 12. Persistence and transaction requirements

The package is the sole business mutator for its registered tables.

A transaction-required operation proves:

```text
business state + audit fact + outbox fact = one commit decision
```

Failure of any required component rolls back the complete unit.

Concurrency, retries, idempotency, and lock behavior must be explicit rather than left to adapter accident.

---

## 13. Event requirements

An emitted event:

- represents a completed fact;
- uses a stable ID and version;
- includes organization, actor, correlation, and occurrence metadata;
- contains only the minimal accepted payload;
- is appended inside the business transaction;
- is published only after commit;
- is safe for replay;
- does not become a command disguised as an event.

A consumed event:

- has an explicit owner and version;
- is idempotent;
- validates organization and payload;
- records retry and dead-letter behavior;
- does not mutate peer-owned tables.

---

## 14. Application integration requirements

When a user-facing capability is required, the feature is mirrored at:

```text
apps/web/features/<module-id>/<feature-group>/<feature>
```

The app:

- resolves trusted session context;
- calls the package root facade;
- does not duplicate domain validation;
- does not import package internals or database tables;
- maps canonical outcomes to user states;
- keeps loaders read-only and Actions mutation-only;
- records integrated evidence separately from package verification.

---

## 15. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Correctness | Invariants and transition rules have behavior and negative tests |
| Reliability | Required mutations are atomic and replay-safe |
| Security | Tenant, permission, approval, and disclosure boundaries fail closed |
| Maintainability | Feature ownership and imports are statically enforceable |
| Compatibility | Public changes follow the declared compatibility policy |
| Performance | Material queries and mutations declare deterministic proxy budgets |
| Observability | Operations carry correlation and declared telemetry classification |
| Recoverability | Events and projections support registered replay or rebuild behavior |
| Testability | Business behavior can be verified without UI and, where practical, without production DB |
| Portability | Package public behavior is independent of Next.js and route structure |

---

## 16. Product acceptance

A module is product-accepted only when:

- every in-scope requirement maps to one feature;
- every feature maps to canonical operations;
- every command mutation maps to registered tables;
- every operation is reachable through the root facade;
- memory and production behavior agree where both exist;
- tenancy, authorization, approval, conflict, replay, audit, and event behavior pass;
- required web workflows pass integrated acceptance;
- migration prerequisites are recorded;
- exact gate results and digests are recorded;
- no required lane is blocked, skipped, or represented by placeholder implementation.

Activation is a separate decision.
