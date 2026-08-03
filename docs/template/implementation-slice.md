Implementation Slices: <Feature Name>

Document purpose.This document converts the approved feature PRD into a sequence of controlled, independently reviewable implementation slices.

Each slice must:

deliver a coherent increment;

operate within an exact read and write boundary;

leave its declared scope green;

produce fresh verification evidence;

avoid implementing behavior not defined in the PRD;

remain independently revertible where technically possible.

This document does not define new product requirements. It implements the approved PRD under the rules of docs/erp/<module-id>/<module-id>-architecture.md.

0. Document control

document_id: <DOMAIN>-<GROUP>-<FEATURE>-SLICES-001

domain_id: <domain-name>
feature_group: <feature-group>
feature_id: <feature>
feature_name: <Feature Name>

architecture_document: docs/erp/<module-id>/<module-id>-architecture.md
prd_document: docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/PRD.md
package: "@afenda/<module-id>"
package_path: packages/erp/<module-id>
source_path: packages/erp/<module-id>/src/features/<feature-group>/<feature>

status: draft

# draft | review | approved | active | complete | superseded

version: 0.1.0
owner_engineering: <engineering owner>
owner_product: <product owner>
approved_by: []
approved_on: null
supersedes: null

current_slice: null
next_eligible_slice: 0

delivery_model: sequential-gated
parallel_work_allowed: false

manifest_lifecycle_at_start: scaffolded

# scaffolded | active | deprecated | retired

# Runtime reads only AfendaModuleManifest.lifecycle. Slice status is documentation-only.

activation_mode: organization_toggle

# core | organization_toggle

schema_owner: "@afenda/db"
consumer_entrypoint: package-root-facade
production_adapter: drizzle

1. Governing authorities

Implementation follows this precedence:

Repository-wide architecture decisions and package policies.

docs/erp/<module-id>/<module-id>-architecture.md.

Approved feature PRD.md.

Approved feature decisions.

This implementation-slices document.

Source code and tests.

Generated documentation.

Historical evidence.

This document may sequence and constrain implementation.

It must not:

expand feature scope;

invent operations;

add business rules;

change ownership;

redefine architecture;

change persistence authority;

add unapproved public contracts;

reinterpret an unresolved PRD question.

A required change to product behavior must first amend the PRD.

A required change to permanent structure or dependency rules must first amend the domain architecture.

This plan is a sequencing and verification authority only. It does not become asecond source for operation metadata, permissions, events, manifest values, orbusiness policy. Those values remain feature-owned and are projected into themodule registry and src/composition/module.manifest.ts.

2. Greenfield posture

Specifications live under:

docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/

Production source lives under:

packages/erp/<module-id>/src/features/<feature-group>/<feature>/

The specification tree is never treated as shipped production source.

Unless verified evidence explicitly proves otherwise, this plan assumes:

no feature behavior is implemented;

no schema is approved;

no migration exists;

no operation registry entry exists;

no facade capability exists;

no frontend route exists;

no adapter parity has been proven;

no rollout has occurred;

no previous code is authoritative.

Existing code may be inspected as evidence or a possible reference, but it does not override the approved architecture or PRD.

3. Delivery principles

3.1 One slice, one primary outcome

Each slice should have one primary result.

Examples:

approved contracts;

proven business policy;

working memory behavior;

verified Drizzle parity;

stable facade exposure;

complete frontend workflow.

Avoid slices such as:

Implement everything

or:

Finish remaining work

3.2 Independently reviewable

A reviewer must be able to determine:

what changed;

why it changed;

which PRD requirements it implements;

which tests prove it;

what remains incomplete;

whether the next slice is eligible.

3.3 Independently revertible

A slice should avoid mixing unrelated changes.

Where a database migration is not cleanly revertible, the slice must provide:

recovery strategy;

forward-fix strategy;

explicit irreversibility;

restored-snapshot evidence.

3.4 Green at every boundary

Each completed slice must leave its declared scope passing:

formatting;

lint;

typecheck;

relevant tests;

architecture checks;

feature-specific gates.

Repository-wide failures unrelated to the slice must be recorded separately and must not be misrepresented as introduced by the slice.

3.5 No deferred correctness

The following cannot be deferred to a later slice when relevant to the current behavior:

tenancy enforcement;

authorization;

validation;

concurrency;

idempotency;

audit;

event atomicity;

error translation;

adapter parity;

negative ownership tests.

A slice may defer a capability only when the current slice does not expose or rely on it.

3.6 Memory-first behavior

Feature behavior is proven against the memory adapter before Drizzle implementation.

The Drizzle adapter mirrors already-approved and already-tested behavior.

Business rules must not be discovered through SQL implementation.

3.7 Permanent layout constraints

The slice plan must not introduce:

definition.ts;

generic operations.ts;

commands/ or queries/ directories;

relational.ts;

a package-local schema or migration authority;

a local structural checker already owned by pnpm gen:doctor:erp;

empty placeholder files or directories.

3.8 Kernel independence

A feature slice must not modify the domain kernel unless:

the kernel change has its own approved slice;

the need is architectural rather than feature-specific;

at least two features require the same execution mechanic, or the domain architecture explicitly requires it;

feature-specific vocabulary is absent from the kernel change.

3.9 Canonical outcome contract

Public feature operations return Result<Data, Code> from @afenda/errors.

The discriminant is ok.

Success payload is data.

Code is a narrow union of CanonicalErrorCode values.

Expected business outcomes do not escape as unclassified exceptions.

The feature does not introduce DomainError, FeatureError, or a privatepublic error taxonomy.

3.10 Red gate stops progress

A failed mandatory gate blocks the next dependent slice.

Do not proceed by recording a follow-up ticket for:

missing business-rule tests;

failed adapter parity;

broken tenant isolation;

atomicity failure;

undocumented public operation;

incomplete migration evidence;

facade leakage;

prohibited dependency.

4. Slice status model

Each slice has one status:

slice_status:

- not-started
- ready
- active
- blocked
- implementation-complete
- verification-complete
- approved
- superseded

Definitions:

Status

Meaning

not-started

Preconditions are not yet satisfied

ready

All entry criteria are satisfied

active

Work is currently in progress

blocked

A named unresolved issue prevents completion

implementation-complete

Approved write-set changes exist, but required verification is incomplete

verification-complete

All slice verification gates pass

approved

Reviewer accepts scope and evidence

superseded

Replaced by a newer approved slice plan

A slice is not complete merely because its files exist.

5. Dependency model

5.1 Default sequence

Slice 0 PRD and architecture readiness
↓
Slice 1 Feature definition and contracts
↓
Slice 2 Business policy and lifecycle
↓
Slice 3 Store contract and memory adapter
↓
Slice 4 Feature operations and operation registry
↓
Slice 5 Relational schema and migration
↓
Slice 6 Drizzle adapter and parity
↓
Slice 7 Idempotency, audit, outbox, and atomicity
↓
Slice 8 Composition and package facade
↓
Slice 9 Frontend experience
↓
Slice 10 Operational closure and rollout readiness

This is the default. A feature may adjust the sequence where justified, but it must preserve:

contracts before implementation;

policy before persistence;

memory behavior before Drizzle parity;

verified backend before activation;

explicit facade approval;

separate frontend status;

separate rollout decision.

5.2 Slice dependency matrix

Slice

Depends on

May run in parallel with

0

None

None

1

0

None

2

1

None

3

1, 2

None

4

1, 2, 3

None

5

1, 2, 3, 4

Optional documentation-only work

6

5

None

7

4, 6

None

8

4, 6, 7

Frontend design preparation only

9

8

None

10

All applicable previous slices

None

Parallel work is allowed only when:

write sets do not overlap;

dependencies are stable;

no slice consumes an unapproved contract;

verification remains independent.

6. Master traceability matrix

Every PRD requirement must map to at least one slice.

PRD requirement

Rule or operation

Implemented in slice

Verified in slice

<requirement>

BR-01

2

2

<requirement>

<operation ID>

4

4

<requirement>

tenancy

3/4

4/6

<requirement>

facade capability

8

8

<requirement>

frontend state

9

9

No approved PRD requirement may be left without an implementation and verification location.

7. Master file ownership matrix

7.1 Feature backend

The feature capsule follows the permanent architecture. Empty files and genericlayer directories are prohibited.

Path

Owning slice

Purpose

packages/erp/<module-id>/src/features/<feature-group>/<feature>/schema.ts

1

Trusted-ingress validation

packages/erp/<module-id>/src/features/<feature-group>/<feature>/guards.ts

1/2

Feature invariant enforcement

packages/erp/<module-id>/src/features/<feature-group>/<feature>/<business-noun>.ts

1/2

Domain model and business use cases

packages/erp/<module-id>/src/features/<feature-group>/<feature>/policy.ts

2

Authorization, privacy, and workflow policy

packages/erp/<module-id>/src/features/<feature-group>/<feature>/store-contract.ts

3

Persistence-agnostic capability

packages/erp/<module-id>/src/features/<feature-group>/<feature>/adapters/<feature>.memory.ts

3

Deterministic semantic adapter

packages/erp/<module-id>/src/features/<feature-group>/<feature>/operation-registry.ts

4

Canonical operation definitions

packages/erp/<module-id>/src/features/<feature-group>/<feature>/run-operation.ts

4/7

Feature execution entrypoint using the module-kernel protocol

packages/erp/<module-id>/src/features/<feature-group>/<feature>/adapters/<feature>.drizzle.ts

6

Production persistence adapter

packages/erp/<module-id>/src/features/<feature-group>/<feature>/index.ts

8

Optional private projection for composition

Do not create definition.ts, generic operations.ts, commands/, queries/,or relational.ts. A feature-level ports.ts is allowed only when the PRDidentifies a genuinely feature-owned external capability.

7.2 Database

Path

Owning slice

Authority

<schema path>

5

Relational schema owner

<migration path>

5

Migration authority

<database tests>

5/6

Relational owner

7.3 Composition, module manifest, and facade

Only paths verified on disk may appear in the approved write manifest. Genericfilenames such as compose-features.ts must not be invented.

Path

Owning slice

Purpose

packages/erp/<module-id>/src/composition/module.manifest.ts

8

Governed projection satisfying AfendaModuleManifest

<actual operation-registry composition path>

8

Compose feature-owned definitions without duplication

<actual runtime composition path>

8

Bind stores, ports, and module-kernel services

<actual facade path>

8

Stable package business API

packages/erp/<module-id>/src/index.ts

8

Package-root entrypoint beginning with import "server-only";

<actual consumer-contract test path>

8

Package-root compatibility and export proof

Commands, queries, permissions, authorization maps, events, dependencies, andmutation tables must be projected from their canonical owners. They must not beretyped as independent literals in the module manifest.

7.4 Frontend

Path

Owning slice

Purpose

<route path>

9

Route registration

<list screen>

9

List experience

<detail screen>

9

Detail experience

<form>

9

Create/edit experience

<frontend tests>

9

State and accessibility verification

7.5 Evidence

Evidence

Owning slice

evidence/slice-00-prd-readiness.*

0

evidence/slice-01-contracts.*

1

evidence/slice-02-policy.*

2

evidence/slice-03-memory.*

3

evidence/slice-04-operations.*

4

evidence/slice-05-migration.*

5

evidence/slice-06-parity.*

6

evidence/slice-07-atomicity.*

7

evidence/slice-08-facade.*

8

evidence/slice-09-frontend.*

9

evidence/closure.*

10

A path must not be modified by another slice unless this matrix is amended and approved.

8. Slice 0 — PRD and architecture readiness

8.1 Objective

Prove that the feature is eligible for implementation.

This slice changes no production behavior.

8.2 Entry criteria

Feature exists in the approved domain architecture inventory.

Feature group is approved.

Ownership is unambiguous.

PRD draft exists.

Relational authority is known.

Golden feature or structural exemplar is identified.

No architecture contradiction is known.

8.3 Read set

docs/erp/<module-id>/<module-id>-architecture.md
docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/PRD.md
<relevant repository ADRs>
<golden feature PRD and closed implementation>
<database authority documentation>

8.4 Write set

docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/PRD.md
docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/IMPLEMENTATION-SLICES.md
docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/DECISIONS.md
docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/evidence/slice-00-prd-readiness.*

8.5 Required outcomes

Ownership test passes.

Scope and exclusions are complete.

Records are identified.

Lifecycle is complete.

Operations are final.

Business rules are numbered.

Errors are enumerated.

Ports and events are identified.

Persistence requirements are complete.

Exact manifests are complete.

Blocking questions are resolved.

Slice plan is approved.

8.6 Required checks

No blocking TBD.

Every in-scope capability maps to an operation.

Every operation maps to at least one acceptance test.

Every lifecycle transition is defined.

Every external dependency has a provider.

Every write path has an owning slice.

No feature requirement contradicts domain architecture.

Package identity is @afenda/<module-id>.

Schema and migration authority are @afenda/db.

The feature capsule contains no generic layer farm.

Canonical operation ownership is operation-registry.ts.

Public outcomes are narrow Result<Data, Code> contracts.

The package-root facade is the only consumer entrypoint.

8.7 Evidence

Record:

slice: 0
result: pass | blocked
architecture_conflicts: []
blocking_questions: []
prd_version: <version>
approved_operation_count: <number>
approved_rule_count: <number>
approved_transition_count: <number>
approved_file_count: <number>

8.8 Done when

PRD is approved.

Implementation slices are approved.

No blocking questions remain for Slice 1.

next_eligible_slice becomes 1.

9. Slice 1 — Feature contracts, schemas, model, and guards

9.1 Objective

Create representation-safe contracts, trusted-ingress schemas, the business model, and invariant guards without persistence or runtime composition.

9.2 Entry criteria

Slice 0 approved.

Contract terminology is final.

Record fields are approved.

Operation input and output shapes are approved.

No unresolved contract-level question remains.

9.3 Read set

docs/erp/<module-id>/<module-id>-architecture.md
PRD.md:

- feature identity
- terminology
- records and domain model
- input contracts
- outcomes and errors
<golden feature contract files>

`@afenda/errors` public result and canonical-code contracts
<canonical schema and validation utilities>

9.4 Write set

packages/erp/<module-id>/src/features/<feature-group>/<feature>/schema.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/guards.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/<business-noun>.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/**tests**/schema.test.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/**tests**/contract.test.ts
docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/evidence/slice-01-contracts.*

9.5 Produces

record identifiers;

public views;

operation input types;

canonical input schemas;

narrow canonical CanonicalErrorCode unions per public operation;

pagination inputs and outputs where required;

schema and representation tests.

9.6 Required tests

valid input accepted;

missing required fields rejected;

unknown keys rejected;

string normalization;

minimum and maximum bounds;

invalid identifiers rejected;

invalid date ranges rejected;

spoofed organization identity rejected or absent from schema;

public types contain no ORM or store types;

negative ownership fields absent;

secrets absent.

9.7 Prohibited work

command handlers;

query handlers;

database schema;

migrations;

memory adapter;

facade registration;

frontend screens;

kernel changes.

9.8 Verification commands

<format command>
<lint command scoped to feature>
<typecheck command scoped to package>
<schema test command>
<architecture layout command>

9.9 Done when

Contracts compile.

All schema tests pass.

No prohibited public type is exposed.

Feature identity matches architecture inventory.

No file outside the slice write set changed.

next_eligible_slice becomes 2.

10. Slice 2 — Business policy and lifecycle

10.1 Objective

Implement all pure business rules, lifecycle guards, and invariants independently of persistence and infrastructure.

10.2 Entry criteria

Slice 1 approved.

Status vocabulary is final.

Allowed transitions are final.

Business-rule table is complete.

Error outcomes are final.

10.3 Read set

PRD.md:

- lifecycle and state model
- business rules and invariants
- correction policy
- outcomes and error taxonomy
packages/erp/<module-id>/packages/erp/<module-id>/src/features/<feature-group>/<feature>/contract.ts
packages/erp/<module-id>/packages/erp/<module-id>/src/features/<feature-group>/<feature>/schema.ts
<golden feature policy files>

10.4 Write set

packages/erp/<module-id>/src/features/<feature-group>/<feature>/policy.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/guards.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/<business-noun>.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/**tests**/policy.test.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/**tests**/lifecycle.test.ts
docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/evidence/slice-02-policy.*

10.5 Produces

pure rule functions;

transition evaluator;

invariant assertions;

correction-policy functions;

rule-level test suite;

lifecycle transition test suite.

10.6 Required tests

one named test per business rule;

one named test per invariant;

one test per allowed transition;

one test per rejected transition;

terminal-state behavior;

correction behavior;

boundary values;

chronological rules;

uniqueness normalization logic where pure;

no dependency or persistence required to test policy.

10.7 Test naming

BR-01 <expected behavior>
BR-02 <expected behavior>
TR-01 moves <from> to <to> when <guard>
TR-01 rejects transition when <guard fails>
<MODULE>-<FEATURE>-<MODULE>-<FEATURE>-INV-01 preserves <invariant>

10.8 Prohibited work

store contract;

adapters;

operation handlers;

database files;

facade changes;

frontend implementation;

infrastructure abstractions.

10.9 Done when

Every rule has a passing named test.

Every transition and rejection is tested.

Policy code is pure.

No infrastructure dependency exists.

next_eligible_slice becomes 3.

11. Slice 3 — Store contract and memory adapter

11.1 Objective

Define persistence semantics and provide a deterministic in-memory implementation that enforces tenancy, ordering, concurrency, and uniqueness.

11.2 Entry criteria

Slices 1 and 2 approved.

Aggregate boundaries are final.

Query ordering is final.

Pagination rules are final.

Concurrency policy is final.

Store methods required by operations are known.

11.3 Read set

PRD.md:

- records and domain model
- business rules
- tenancy
- persistence requirements
- query and pagination strategy
packages/erp/<module-id>/packages/erp/<module-id>/src/features/<feature-group>/<feature>/contract.ts
packages/erp/<module-id>/packages/erp/<module-id>/src/features/<feature-group>/<feature>/policy.ts
<opaque unit-of-work contract>

<golden feature store and memory adapter>

11.4 Write set

packages/erp/<module-id>/src/features/<feature-group>/<feature>/store-contract.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/adapters/<feature>.memory.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/**tests**/memory-store.test.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/**tests**/tenancy.test.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/**tests**/pagination.test.ts
docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/evidence/slice-03-memory.*

11.5 Produces

persistence-agnostic store interface;

deterministic memory adapter;

organization-scoped reads and writes;

stable ordering;

cursor pagination;

optimistic version behavior;

uniqueness behavior;

transaction participation contract where required.

11.6 Required store behavior

all reads require trusted organization context;

all writes require trusted organization context;

cross-organization reads return non-disclosing absence;

cross-organization mutations fail;

uniqueness is organization-scoped;

cursor pagination is deterministic;

version conflicts produce the canonical conflict outcome;

chronology is preserved;

no ORM or SQL type appears in the store contract.

11.7 Required tests

create and retrieve within one organization;

same natural key permitted in different organizations;

duplicate natural key rejected within one organization;

cross-organization lookup hidden;

cross-organization update rejected;

missing organization context rejected;

deterministic list ordering;

cursor page boundaries;

concurrent version update conflict;

terminal records remain immutable where required;

memory reset and transaction behavior.

11.8 Prohibited work

public operations;

relational schema;

Drizzle adapter;

facade registration;

frontend;

audit and event implementation unless required solely by store semantics.

11.9 Done when

Store contract is complete.

Memory adapter passes all store tests.

Tenant enforcement is proven.

Pagination and concurrency are deterministic.

next_eligible_slice becomes 4.

12. Slice 4 — Feature operations and canonical operation registry

12.1 Objective

Implement the approved commands and queries as business-named feature-root capabilities, prove them against the memory adapter, and define their canonical metadata in operation-registry.ts.

12.2 Entry criteria

Slices 1–3 approved.

Every PRD operation is final.

Required ports are defined.

Permissions are final.

Approval policy is final.

Transaction and idempotency policy are final.

12.3 Read set

PRD.md:

- operation catalog
- authorization and approval
- tenancy
- ports and integrations
- events
- outcomes and errors
packages/erp/<module-id>/packages/erp/<module-id>/src/features/<feature-group>/<feature>/*
<domain operation-definition contract>

<domain execution context contract>
<golden feature operation implementation>

12.4 Write set

packages/erp/<module-id>/src/features/<feature-group>/<feature>/operation-registry.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/run-operation.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/<business-operation>.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/ports.ts

# only when the PRD proves a feature-owned external capability

packages/erp/<module-id>/src/features/<feature-group>/<feature>/**tests**/operations.test.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/**tests**/authorization.test.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/**tests**/hostile-inputs.test.ts
docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/evidence/slice-04-operations.*

12.5 Produces

every approved command and query, named for its business meaning;

immutable feature-owned operation definitions in operation-registry.ts;

required capability ports;

operation contract tests;

authorization tests;

hostile-input tests;

memory-backed feature behavior.

12.6 Operation definition requirements

Each operation declares:

canonical operation ID;

feature owner;

command or query;

input and output contracts;

permission;

approval policy;

transaction policy;

idempotency policy;

audit policy;

event policy;

retry classification where applicable;

narrow Result<Data, Code> outcome union using canonical codes.

12.7 Required tests per command

success;

validation failure;

each applicable business rule;

authorization denial;

approval missing;

approval dependency unavailable;

tenancy isolation;

not found;

invalid transition;

version conflict;

dependency failure;

idempotent replay where enabled;

mismatched idempotency fingerprint;

declared event intent;

declared audit intent.

12.8 Required tests per query

success;

not found or empty result;

authorization denial;

tenancy isolation;

stable ordering;

pagination;

filters;

redaction;

dependency degradation where applicable.

12.9 Hostile-input tests

oversized values;

Unicode and RTL;

null bytes;

unknown keys;

malformed identifiers;

nested payload abuse;

excessive arrays;

injection-like strings;

spoofed organization ID;

replayed request ID;

concurrent commands.

12.10 Prohibited work

generic commands/ or queries/ directories;

definition.ts or generic operations.ts;

central registry or module-manifest manual duplication;

relational schema;

Drizzle adapter;

facade exposure;

frontend implementation;

direct sibling imports;

direct foreign table writes.

12.11 Done when

Every PRD operation exists.

No undocumented operation exists.

All operations pass against memory runtime.

Operation definitions match PRD policy exactly.

Hostile-input suite passes.

next_eligible_slice becomes 5.

13. Slice 5 — @afenda/db schema, migration, and constraints

13.1 Objective

Create the approved Drizzle schema and migration under @afenda/db without changing already-proven feature semantics.

13.2 Entry criteria

Slices 1–4 approved.

Relational authority confirmed.

Table requirements final.

Index requirements final.

Migration strategy approved.

No unresolved destructive-change question remains.

13.3 Read set

PRD.md:

- records and fields
- constraints
- persistence requirements
- migration plan
- expected query shapes
<relational schema conventions>

<migration policy>
<existing database package patterns>
<golden feature schema and migration>

13.4 Write set

packages/data-plane/db/src/schema/<approved-domain-path>
packages/data-plane/db/drizzle/<approved-migration-path>
<approved @afenda/db constraint/parity test path>
docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/evidence/slice-05-migration.*

13.5 Produces

Drizzle schema declarations;

columns and types;

primary and foreign keys;

organization-leading indexes;

uniqueness constraints;

check constraints;

optimistic version field;

chronology structures;

migration;

migration tests;

migration evidence.

13.6 Required checks

table and column names match approved semantics;

organization ID is present on every tenant-owned row;

indexes lead with organization where required;

natural-key uniqueness is organization-scoped;

lifecycle values are constrained where repository policy permits;

chronology cannot silently overwrite history;

destructive changes are absent or explicitly approved;

migration follows expand–backfill–contract where needed.

13.7 Migration verification

Record:

empty-database apply;

representative existing-database apply;

row counts before and after;

constraint verification;

index verification;

rollback or recovery;

restored-snapshot verification where required;

execution duration;

irreversible steps.

13.8 Prohibited work

Drizzle adapter;

changing business rules to fit SQL;

changing public contracts;

adding undocumented fields;

creating foreign-domain ownership tables;

facade or frontend changes.

13.9 Verification commands

pnpm db:generate
pnpm db:check
AFENDA_ALLOW_DB_MIGRATE=1 pnpm --filter @afenda/db db:migrate

db:push and db:pull are prohibited.

13.10 Done when

Schema compiles.

Migration applies.

Recovery or rollback is verified.

Required constraints and indexes exist.

No semantic difference from memory model is introduced.

next_eligible_slice becomes 6.

14. Slice 6 — Drizzle adapter and memory–Drizzle parity

14.1 Objective

Implement the Drizzle adapter and prove that it behaves identically to the memory adapter for all observable feature behavior.

14.2 Entry criteria

Slice 5 approved.

Relational schema available.

Memory behavior complete and approved.

Parity scenarios enumerated.

Database test environment available.

14.3 Read set

packages/erp/<module-id>/src/features/<feature-group>/<feature>/store-contract.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/adapters/<feature>.memory.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/operation-registry.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/run-operation.ts
<approved @afenda/db schema>
<database transaction and query utilities>
<parity harness>
<golden feature Drizzle adapter>

14.4 Write set

packages/erp/<module-id>/src/features/<feature-group>/<feature>/adapters/<feature>.drizzle.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/**tests**/adapter-parity.test.ts
packages/erp/<module-id>/src/features/<feature-group>/<feature>/**tests**/drizzle-store.test.ts
<approved database test helpers if explicitly listed>
docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/evidence/slice-06-parity.*

14.5 Produces

relational store implementation;

parity scenario suite;

relational-specific constraint tests;

query-plan evidence where required;

deterministic database fixtures.

14.6 Parity scenarios

The same scenarios must run against both adapters:

create;

retrieve;

update;

lifecycle transition;

invalid transition;

not found;

cross-tenant absence;

uniqueness conflict;

optimistic conflict;

stable ordering;

pagination;

filters;

chronology;

correction;

terminal-state behavior;

idempotent result storage where store-owned;

dependency-independent observable result.

14.7 Parity comparison

Parity compares:

result values;

public error codes;

ordering;

cursor boundaries;

version behavior;

chronology entries;

tenant isolation;

emitted operation facts visible at the feature boundary.

Implementation-specific metadata may differ only when it is not publicly observable and is explicitly excluded.

14.8 Prohibited work

weakening memory behavior;

changing PRD rules to make SQL easier;

stubbing database calls;

using an in-memory database as the relational proof when a real database is required;

skipping slow parity cases;

facade or frontend work.

14.9 Done when

Full parity suite passes.

Relational-specific tests pass.

No observable behavioral difference remains.

Query ordering and pagination are stable.

next_eligible_slice becomes 7.

15. Slice 7 — Module-kernel protocol integration and atomicity

15.1 Objective

Integrate feature mutations with the existing module-kernel execution protocol and prove idempotency, audit, outbox, transaction, and replay guarantees.

15.2 Entry criteria

Slices 4 and 6 approved.

Operation policies finalized.

Audit contract available.

Outbox contract available.

Idempotency mechanism available.

Shared unit-of-work behavior available.

15.3 Read set

PRD.md:

- operation policy
- events
- audit requirements
- idempotency
- atomicity
  feature operation definitions
  domain execution kernel contracts
  audit contract
  outbox contract
  idempotency contract
  transaction contract

15.4 Write set

packages/erp/<module-id>/src/features/<feature-group>/<feature>/run-operation.ts
<feature-owned integration files explicitly listed>
packages/erp/<module-id>/packages/erp/<module-id>/src/features/<feature-group>/<feature>/**tests**/idempotency.test.ts
packages/erp/<module-id>/packages/erp/<module-id>/src/features/<feature-group>/<feature>/**tests**/atomicity.test.ts
packages/erp/<module-id>/packages/erp/<module-id>/src/features/<feature-group>/<feature>/**tests**/emissions.test.ts
<composition binding files only if assigned to this slice>
docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/evidence/slice-07-atomicity.*

15.5 Produces

idempotency behavior;

command fingerprints;

audit records;

outbox records;

event payloads;

fault-injection tests;

atomicity evidence.

15.6 Required idempotency tests

first execution commits;

exact replay returns original result;

replay does not mutate again;

replay does not duplicate audit;

replay does not duplicate outbox;

same key with different fingerprint conflicts;

key scope is organization-safe;

authorization is still checked on replay where architecture requires it;

expired key behavior follows policy.

15.7 Required atomicity tests

Inject failure:

before state write;

after state write;

during audit write;

during outbox write;

before commit;

after commit response handling.

Prove:

no partial state;

no orphan audit;

no orphan event;

no event before commit;

exactly one audit and required event after success;

retry does not duplicate committed effects.

15.8 Event verification

event name matches PRD;

event payload is representation-safe;

schema version exists;

secrets and restricted fields are absent;

organization and aggregate identifiers are correct;

ordering key is correct;

consumer references are informational, not commands.

15.9 Prohibited work

feature-specific kernel redesign;

direct event publication before commit;

custom idempotency mechanism when a kernel mechanism exists;

logging full input payloads;

frontend work.

15.10 Done when

All mutation operations satisfy declared policy.

Fault-injection suite passes.

Audit-to-mutation parity is exact.

Event-to-mutation parity is exact.

next_eligible_slice becomes 8.

16. Slice 8 — Composition, module-manifest projections, and package-root facade

16.1 Objective

Integrate the verified feature into the domain runtime and expose only the approved stable business surface.

16.2 Entry criteria

Slices 1–7 approved.

Operation definitions verified.

Memory and relational runtimes verified.

Required ports have providers.

Public facade contracts approved.

Compatibility classification recorded.

16.3 Read set

docs/erp/<module-id>/<module-id>-architecture.md:

- composition
- operation registry
- facade
  PRD.md:
- public contracts and facade
- ports and integrations
  feature operation definitions
  domain composition files
  domain registry contracts
  existing facade patterns
  consumer contracts

16.4 Write set

packages/erp/<module-id>/src/features/<feature-group>/<feature>/index.ts
packages/erp/<module-id>/src/composition/module.manifest.ts
<actual operation-registry composition path verified on disk>
<actual runtime binding path verified on disk>
<actual facade path verified on disk>
packages/erp/<module-id>/src/index.ts
<actual consumer-contract test path>
docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/evidence/slice-08-facade.*

16.5 Produces

feature registration;

composed operation definitions;

port bindings;

memory runtime binding;

relational runtime binding;

approved facade methods;

approved public exports;

consumer-contract tests;

derived AfendaModuleManifest projections;

generated registry/documentation updates.

16.6 Registry checks

Prove:

every feature operation appears exactly once;

every registry operation traces to this feature;

no duplicate operation ID exists;

registry policy matches feature definitions;

commands, queries, permissions, authorization, and events inmodule.manifest.ts are projected from canonical feature/module owners;

persistence.mutationTables matches @afenda/db ownership and the schema-ownership register;

module dependencies match package.json and the workspace-edge register;

facade exposes only registered operations;

no registry entry lacks implementation;

no implementation lacks registry entry.

16.7 Facade checks

Prove the facade does not expose:

stores;

adapters;

ORM types;

database handles;

transaction objects;

raw ports;

internal event envelopes;

internal handlers;

mutable registry structures.

16.8 Consumer tests

Test:

import from @afenda/<module-id>;

package root starts with import "server-only";;

approved method signatures;

approved result types;

compatibility with existing consumers;

no required deep import;

no accidental export expansion.

16.9 Prohibited work

feature business-rule changes;

database changes;

kernel changes;

frontend implementation;

adding a second business API;

direct adapter exposure.

16.10 Done when

Registry validation passes.

Runtime composition passes.

Facade consumer tests pass.

Deep-import checks pass.

Public API matches PRD.

next_eligible_slice becomes 9 if frontend is included, otherwise 10.

17. Slice 9 — Frontend workflow

17.1 Objective

Deliver the approved user experience against the verified facade without redefining backend behavior.

17.2 Entry criteria

Slice 8 approved.

Frontend is included in the PRD release scope.

Routes and screens are final.

Design-system components are available.

Required backend operations are stable.

Permission projections are available.

17.3 Read set

PRD.md:

- users and jobs
- user experience
- permissions
- frontend state matrix
- accessibility and i18n
  approved facade contracts
  application routing conventions
  design-system contracts
  reference feature screens

17.4 Write set

<route path>
<list screen path>
<detail screen path>
<form path>
<frontend feature client path>
<frontend tests>
<storybook or visual-test files if approved>
docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/evidence/slice-09-frontend.*

17.5 Produces

navigation entry;

list screen;

detail screen;

create/edit form;

state-aware actions;

permission-aware UI;

conflict handling;

validation;

accessibility tests;

responsive behavior;

internationalized strings.

17.6 Required UI states

loading;

empty before data;

empty filtered result;

partial result;

retryable error;

terminal error;

permission denied;

stale conflict;

optimistic pending;

inactive capability.

17.7 Required form behavior

client validation mirrors server shape;

server remains authoritative;

unknown server errors are safely rendered;

user input is preserved on retryable failure;

double submission is prevented;

unsaved changes are protected;

field errors are accessible;

organization ID is never collected from the user as authority.

17.8 Required tests

route permission;

each UI state;

primary job completion;

validation;

server error mapping;

stale conflict;

pending submission;

accessibility scan;

keyboard navigation;

long text;

localization;

responsive layouts.

17.9 Prohibited work

changing backend semantics;

direct database access;

direct store imports;

frontend-only authorization;

imports outside @afenda/ui-system;

raw process.env instead of @afenda/env;

active route for an inactive feature;

hidden failure without user feedback.

17.10 Done when

Every required screen exists.

Every applicable state passes.

Accessibility checks pass.

Permission-projected UI matches server enforcement.

Primary user job can be completed end to end.

next_eligible_slice becomes 10.

18. Slice 10 — Closure and operational readiness

18.1 Objective

Verify the complete feature and determine its honest lifecycle status.

This slice does not automatically activate the feature.

18.2 Entry criteria

All applicable implementation slices approved.

No mandatory gate remains red.

Verification environments are available.

Evidence paths are known.

Rollout owner is identified.

18.3 Read set

docs/erp/<module-id>/<module-id>-architecture.md
PRD.md
IMPLEMENTATION-SLICES.md
all slice evidence
source and tests
migration evidence
consumer contracts
frontend evidence where applicable
rollout and runbook requirements

18.4 Write set

docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/evidence/closure.*
docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/PRD.md
docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/IMPLEMENTATION-SLICES.md
<generated status inventory>
<runbook paths if included>

No production behavior should be added in closure. A defect found here returns work to the owning slice.

18.5 Full verification matrix

Area

Required result

Architecture

All checks pass

Contracts

All approved types and schemas present

Rules

Every rule tested

Lifecycle

Every transition tested

Memory adapter

Pass

Drizzle adapter

Pass

Parity

Pass

Tenancy

Pass

Authorization

Pass

Approval

Pass

Idempotency

Pass

Atomicity

Pass

Audit

Pass

Events

Pass

Migration

Apply and recovery verified

Registry

Bidirectional parity

Facade

Consumer tests pass

Frontend

Pass if included

Accessibility

Pass if included

Deep imports

None

Secrets

None

File scope

No unauthorized changes

18.6 Status decision

Update independently:

spec_status: approved

implementation_status:
backend: complete
database: complete
facade: complete
frontend: complete | not-started | excluded

verification_status: verified

activation_status: inactive

enterprise_status: not-assessed

manifest_lifecycle: scaffolded | active

# `active` only when verification is complete and an approved activation decision permits it.

manifest_lifecycle: active is permitted only when verification is complete andthe approved module activation decision allows promotion from scaffolded.

Do not set:

activation_status: active

without a separate activation decision.

Do not set:

enterprise_status: ready

without operational and assurance evidence.

18.7 Closure evidence

Record:

commit or worktree reference;

files changed;

test counts;

commands and exit codes;

migration evidence;

parity evidence;

architecture checks;

consumer checks;

frontend checks;

unresolved non-blocking limitations;

repository-wide unrelated failures;

lifecycle status decision;

next eligible activity.

18.8 Done when

Closure evidence is complete.

Verification status is accurate.

No blocking gap remains.

Activation decision is explicitly separate.

Feature is not overstated as enterprise-ready.

18.9 Canonical closure commands

Fresh evidence must include, at minimum:

pnpm --filter @afenda/<module-id> lint
pnpm --filter @afenda/<module-id> typecheck
pnpm --filter @afenda/<module-id> test
pnpm gen:doctor:erp
pnpm validate:modules
pnpm governance:packages

When tenant roots or SQL tenancy behavior change:

pnpm audit:tenancy-nulls
pnpm check:tenancy-residue
pnpm check:tenant-sql-safety

When database artifacts change:

pnpm db:generate
pnpm db:check
AFENDA_ALLOW_DB_MIGRATE=1 pnpm --filter @afenda/db db:migrate

A grep or source-pattern test is a guard, not behavioral proof.

19. Optional kernel-enablement slice

Use only when an approved feature requires execution mechanics absent from the domain kernel.

19.1 Objective

Add a reusable domain-wide execution capability without embedding feature-specific meaning.

19.2 Admission criteria

All must be true:

the need is architectural;

the feature cannot implement correctly without it;

the capability belongs in kernel under the domain architecture;

feature-specific terms are absent;

an independent kernel contract can be written;

the change is approved separately;

affected features are identified.

19.3 Examples

Potentially valid:

shared operation-definition field;

generic transaction policy;

reusable idempotency fingerprint protocol;

audit/outbox integration contract;

tenant-lineage evaluator;

generic projection policy.

Invalid:

subscription renewal calculator;

officer eligibility rules;

licence status evaluator;

asset custody rules.

Those belong to features.

19.4 Required structure

KERNEL SLICE K<n> — <capability>

Architecture decision:
Read set:
Write set:
Consumers:
Contract:
Tests:
Migration impact:
Compatibility impact:
Done when:

A feature slice resumes only after the kernel slice is approved.

20. Optional data-migration slice

Use when existing production or legacy data must be transformed.

20.1 Objective

Migrate and reconcile data independently from feature behavior implementation.

20.2 Required contents

source-system inventory;

field mapping;

normalization rules;

ownership validation;

deduplication policy;

rejected-row policy;

reconciliation totals;

dry-run process;

rollback or restore;

cutover window;

evidence retention;

business sign-off.

20.3 Data reconciliation matrix

Measure

Source

Target

Difference

Accepted

Record count

<n>

<n>

<n>

yes/no

Active records

<n>

<n>

<n>

yes/no

Rejected rows

<n>

—

<n>

yes/no

No migration is complete without reconciliation.

21. Optional activation slice

Activation must remain separate from implementation closure.

21.1 Objective

Activate the verified feature for an approved organization or pilot group.

21.2 Entry criteria

verification complete;

migration complete;

roles assigned;

operational runbook ready;

monitoring ready;

recovery process tested;

pilot scope approved;

business owner accepts data readiness.

21.3 Activities

enable organization feature flag;

confirm permissions;

verify initial access;

verify monitoring;

run smoke test;

confirm support owner;

record activation timestamp;

communicate rollback authority.

21.4 Done when

activation evidence exists;

organization scope is correct;

pilot users can complete the primary job;

no cross-tenant exposure exists;

rollback remains available;

activation status is updated accurately.

22. Slice card template

Use one card per slice.

SLICE <number> — <name>

Status:
not-started | ready | active | blocked |
implementation-complete | verification-complete | approved

Objective:
<one primary outcome>

PRD:
<prd_id>
Sections: - <section> - <section>

Architecture:
Sections: - <section> - <section>

Depends on:

- <slice or authority>

Entry criteria:

- <criterion>
- <criterion>

Read set:

- <exact file>
- <exact file>

Conditional additional reads:

- <contract that may need inspection>

Write set:

- <exact file or directory>
- <exact file or directory>

Produces:

- <artifact>
- <artifact>

Operations:

- <operation IDs>

Business rules:

- <rule IDs>

Transitions:

- <transition IDs>

Invariants:

- <invariant IDs>

Tests:

- <exact suite or test names>

Commands:

- <command>
- <command>

Evidence:

- <evidence path>

Done when:

- <machine-checkable result>
- <machine-checkable result>

Do not:

- <scope restriction>
- <architecture restriction>

Stop when:

- <blocking condition>
- <blocking condition>

Open questions:

- <question ID or none>

23. Slice evidence template

slice_id: <number>
slice_name: <name>
status: verification-complete

started_on: <timestamp>
verified_on: <timestamp>
verified_by: <name or agent>

prd_version: <version>
architecture_version: <version>
source_revision: <commit or worktree reference>

files_created: []
files_modified: []
files_deleted: []

operations_implemented: []
rules_implemented: []
transitions_implemented: []
invariants_verified: []

tests_added: []
tests_passed: 0
tests_failed: 0
tests_skipped: 0

commands:

- command: <command>
  exit_code: 0
  result: pass

gates:
formatting: pass
lint: pass
typecheck: pass
unit_tests: pass
architecture: pass
tenancy: pass
parity: not-applicable
atomicity: not-applicable
consumer_contracts: not-applicable
frontend: not-applicable

unauthorized_file_changes: []
blocking_questions: []
non_blocking_findings: []
unrelated_repository_failures: []

next_eligible_slice: <number>

Evidence must reflect actual verification. Do not mark an unexecuted gate as passed.

24. Blocker template

BLOCKER <id>

Slice:
<number>

Detected:
<date/time>

Category:
architecture | PRD | dependency | migration |
parity | test | tooling | environment

Description:
<precise problem>

Conflicting authorities:
<documents or contracts>

Impact:
<what cannot proceed>

Safe completed work:
<what remains valid>

Required decision:
<decision needed>

Owner:
<person or team>

Resolution:
unresolved

A blocker should not be hidden inside a general progress summary.

25. Change-control rules

25.1 PRD change

Amend the PRD before continuing when implementation reveals a need for:

new business rule;

new operation;

new state;

new record type;

new permission;

new event;

new external dependency;

new sensitive field;

widened ownership;

altered user workflow.

25.2 Architecture change

Amend the domain architecture before continuing when implementation requires:

new permanent layer;

changed dependency direction;

new facade policy;

changed schema authority;

changed tenancy source;

changed operation-registry architecture;

new package-level subpath;

new kernel responsibility;

cross-domain direct mutation.

25.3 Slice-plan change

Amend this document when:

write ownership moves between slices;

a slice is divided;

two slices are merged;

a new kernel or migration slice is introduced;

dependency order changes;

verification commands change materially.

25.4 No retrospective authorization

A manifest must not be amended after unauthorized changes merely to legitimize them.

The changes must first be reverted or independently reviewed as a deliberate scope amendment.

26. Overall implementation Definition of Done

The implementation plan is complete only when:

Slice 0 approved the PRD and manifests.

Contracts and schemas are verified.

Every business rule and transition is tested.

Store contract and memory adapter are verified.

Every approved operation is implemented.

No undocumented operation exists.

Relational schema and migration are verified.

Memory and Drizzle parity passes.

Tenancy isolation passes.

Authorization and approval behavior passes.

Idempotency passes.

State, audit, and outbox atomicity passes.

Operation registry parity passes.

Facade consumer contracts pass.

No deep imports or internal type leaks exist.

Frontend state matrix passes where included.

Accessibility passes where included.

No unauthorized file changes exist.

Closure evidence is complete.

Status dimensions are updated accurately.

Activation remains a separately approved decision.

Appendix A — Recommended slice summary table

Slice

Name

Primary artifact

Mandatory gate

0

PRD readiness

Approved PRD and manifests

No blocking questions

1

Contracts

Types and schemas

Contract tests

2

Policy

Rules and lifecycle

Rule/transition tests

3

Memory persistence

Store and memory adapter

Tenancy/store tests

4

Operations

Business-named operations and registry

Operation tests

5

Database

@afenda/db schema and migration

Migration evidence

6

Drizzle parity

Drizzle adapter

Full parity

7

Execution guarantees

Idempotency, audit, outbox

Atomicity tests

8

Integration

Composition and facade

Registry/consumer tests

9

Frontend

Complete user workflow

State/a11y tests

10

Closure

Verification evidence

All applicable gates

Appendix B — Reviewer checklist per slice

A reviewer should confirm:

Is the slice outcome singular and clear?

Were all entry criteria satisfied?

Did the slice modify only approved paths?

Does every change trace to the PRD?

Did the slice avoid architecture reinvention?

Are the tests named after rules or operations?

Were commands executed with fresh evidence?

Were failures and skipped tests disclosed?

Is the next slice genuinely eligible?

Can this slice be reverted without hiding unrelated work?

Appendix C — Agent kickoff prompt

You are implementing SLICE <n> — <name>
for feature <feature-id>.

Authorities:

1. docs/erp/<module-id>/<module-id>-architecture.md
2. docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/PRD.md
3. docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/IMPLEMENTATION-SLICES.md

Read only:

- the slice read set;
- directly imported contracts required to implement or diagnose the slice.

Write only:

- the exact slice write set.

Implement:

- operations: <operation IDs>;
- rules: <rule IDs>;
- transitions: <transition IDs>;
- invariants: <invariant IDs>.

Do not:

- invent behavior;
- change architecture;
- modify another feature;
- add dependencies;
- weaken tests;
- suppress type errors;
- write outside the manifest.

Stop when:

- authorities conflict;
- a blocking question is unresolved;
- required work falls outside the write set;
- parity requires changing approved behavior;
- migration safety is not established.

Verify using:

- <commands>.

Return:

- files changed;
- tests added;
- commands and exit codes;
- gates passed;
- evidence location;
- blockers;
- next eligible slice.

Appendix D — Relationship between the three documents

docs/erp/<module-id>/<module-id>-architecture.md
defines:
permanent ownership
package structure
dependency rules
kernel and facade policy
domain-wide controls

Feature PRD.md
defines:
what one feature must do
records and lifecycle
operations and rules
UX and acceptance criteria

IMPLEMENTATION-SLICES.md
defines:
implementation order
exact read/write scope
verification per increment
evidence and eligibility gates

Source code
implements:
approved requirements

Tests and evidence
prove:
implementation conforms
