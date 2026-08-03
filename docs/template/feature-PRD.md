Product Requirements Document: <Feature Name>

Document purpose.This PRD defines one individual feature within <Domain Name>. It translates the approved domain architecture into an executable product and engineering contract.

This document defines the feature’s purpose, ownership, records, lifecycle, operations, business rules, integrations, user experience, acceptance criteria, and delivery boundaries.

It must not redefine the domain architecture.

0. Document control

prd_id: <DOMAIN>-<GROUP>-<FEATURE>-001

feature_id: <feature>
feature_name: <Feature Name>
feature_group: <feature-group>
domain_id: <domain-name>
domain_name: <Domain Name>

package: "@afenda/<module-id>"
package_path: packages/erp/<module-id>
feature_source_path: src/features/<feature-group>/<feature>
prd_path: docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/PRD.md

spec_status: draft

# not-started | draft | review | approved | superseded

implementation_status:
backend: not-started
database: not-started
facade: not-started
frontend: not-started

verification_status: unverified

# unverified | blocked | verified

activation_status: inactive

# inactive | pilot | active | suspended

enterprise_status: not-assessed

# not-assessed | blocked | ready

version: 0.1.0
owner_business: <business owner>
owner_product: <product owner>
owner_engineering: <engineering owner>
approved_by: []
approved_on: null
supersedes: null

tenancy_model: organization-scoped
privacy_class: internal
activation_model: organization-toggle

depends_on_features: []
depends_on_platform_capabilities: []
required_ports: []
emitted_events: []
consumed_by: []
estimated_slices: <number>

0.1 Governing architecture

This document is a feature specification under the domain architecture. It mayspecialize feature behavior, but it may not redefine module structure, kernelmechanics, facade policy, dependency direction, tenancy authority, errorarchitecture, persistence authority, or adapter-parity policy.

This feature is governed by:

docs/erp/<module-id>/<module-id>-architecture.md

Relevant architecture sections:

Architecture section

Relevance to this feature

Domain boundary

Confirms this feature belongs in the domain

Feature inventory

Confirms feature identifier and group

Ownership rules

Defines what this feature may and may not own

Source architecture

Defines permanent feature location

Dependency rules

Defines permitted imports and integrations

Operation architecture

Defines operation registration and execution policy

Persistence architecture

Defines schema and migration authority

Tenancy architecture

Defines trusted organization context

Authorization architecture

Defines enforcement and approval separation

Privacy and retention

Defines domain-wide protection rules

Facade architecture

Defines the supported consumer surface

Quality gates

Defines mandatory package controls

This PRD must not override those rules.

0.2 Authority precedence

When artifacts conflict, apply this order:

Repository-wide architecture decisions and package policies.

docs/erp/<module-id>/<module-id>-architecture.md.

This approved feature PRD.

Approved feature decision records.

Implementation-slice plans.

Source code and tests.

Generated documentation and inventories.

Historical evidence.

A contradiction with a higher authority blocks the affected slice.

0.3 PRD scope

This PRD is authoritative for:

the feature problem;

feature ownership;

feature terminology;

records and value objects;

lifecycle states and transitions;

public commands and queries;

business rules and invariants;

feature-specific errors;

feature-required ports;

feature-emitted events;

persistence requirements;

authorization requirements;

tenancy and privacy behavior;

user experience requirements;

testing and acceptance criteria;

exact implementation manifests;

implementation slices;

feature Definition of Done.

This PRD is not authoritative for:

domain-wide architecture;

package folder conventions;

kernel mechanics;

operation-registry implementation;

repository-wide database policy;

public transport mappings;

another feature’s behavior;

production activation by itself.

1. Feature identity

1.1 Definition

Field

Value

Feature name

<Feature Name>

Feature identifier

<feature>

Feature group

<feature-group>

Domain

<Domain Name>

One-line definition

The system of record for <specific business meaning>

Primary business owner

<department or accountable role>

Primary users

<roles>

Trigger for existence

<what breaks without this feature>

Primary success signal

<single most important measurable outcome>

1.2 Architecture inventory trace

Architecture inventory entry:

<Quote or reproduce the approved one-sentence feature responsibility from the domain architecture.>

This PRD may clarify that responsibility but must not materially widen it.

1.3 Feature purpose

<Feature Name> exists to enable <business users> to:

<job or outcome>;

<job or outcome>;

<job or outcome>;

<job or outcome>.

1.4 Non-goals

This feature is not intended to:

<non-goal>;

<non-goal>;

<non-goal>.

2. Problem statement

2.1 Current situation

Describe the current process factually:

how the work is performed today;

where records are held;

where ownership is unclear;

which controls depend on manual follow-up;

which failures or delays occur;

what evidence is missing;

what users cannot reliably determine.

Do not describe a preferred solution in this section.

2.2 Core problem

<Business user> cannot reliably <required action or decision> because <specific information, process, control, or ownership failure>, resulting in <business impact>.

2.3 Consequences

Consequence

Business impact

Affected stakeholder

<consequence>

<impact>

<stakeholder>

<consequence>

<impact>

<stakeholder>

<consequence>

<impact>

<stakeholder>

2.4 Evidence

Record known evidence supporting the problem:

Evidence

Source

Date

Confidence

<finding>

<interview, audit, report, workflow>

<date>

high/medium/low

If evidence is unavailable, say so explicitly. Do not invent measurements.

3. Users and jobs to be done

3.1 User roles

User role

Responsibility

Uses this feature to

<role>

<responsibility>

<purpose>

<role>

<responsibility>

<purpose>

<role>

<responsibility>

<purpose>

3.2 Jobs to be done

Use no more than seven primary jobs.

When <situation>, I want to <motivation>, so that <outcome>.

When <situation>, I want to <motivation>, so that <outcome>.

When <situation>, I want to <motivation>, so that <outcome>.

3.3 User decisions supported

The feature must enable users to answer:

<decision question>;

<decision question>;

<decision question>.

3.4 User actions supported

The feature must enable authorized users to:

<action>;

<action>;

<action>.

4. Ownership and boundaries

4.1 Ownership test

Confirm why this feature belongs to the domain.

Ownership question

Answer

Reason

Is the domain’s business owner accountable for this record?

yes/no

<reason>

Does the record persist beyond one transaction?

yes/no

<reason>

Does it have a feature-specific lifecycle?

yes/no

<reason>

Is the feature accountable for correctness and chronology?

yes/no

<reason>

Can other modules reference it without owning its meaning?

yes/no

<reason>

Does it require feature-specific evidence or assurance?

yes/no

<reason>

If ownership is not clearly established, stop and amend the domain architecture before implementing.

4.2 Authoritative facts

This feature is the sole authoritative owner of:

Fact

Meaning

Why owned here

<fact>

<meaning>

<reason>

<fact>

<meaning>

<reason>

4.3 Governed foreign references

This feature may reference:

Foreign record

Authoritative owner

Reference retained

Validation rule

<record>

<domain or feature>

<opaque id or permitted label>

<same-org or port check>

4.4 Never-owned facts

Fact or action

Authoritative owner

This feature’s relationship

<foreign fact>

<owner>

reference only

<foreign action>

<owner>

emit event only

<sensitive fact>

<owner>

never stored

4.5 Negative assertions

The implementation must prove that it does not store or own:

<excluded field or concept>;

<excluded field or concept>;

<excluded lifecycle>;

<excluded technical secret>;

<excluded foreign status>.

Each assertion must become a test where technically enforceable.

5. Scope

5.1 In scope

Each item must map to at least one operation in Section 10.

Capability

Description

Operation reference

<capability>

<description>

<operation>

<capability>

<description>

<operation>

5.2 Out of scope for this release

Deferred capability

Reason deferred

Target phase or future condition

<capability>

<reason>

<phase>

5.3 Permanently out of scope

<capability owned elsewhere>;

<capability that violates architecture>;

<technical concern outside feature meaning>.

5.4 Scope-change rule

Any addition that introduces:

a new record type;

a new lifecycle;

a new public operation;

a new external dependency;

a new event;

a new permission;

a new sensitive-data class;

a new persistence table;

requires PRD amendment and approval before implementation.

6. Ubiquitous language

6.1 Canonical terminology

Term

Exact meaning

Forbidden synonyms

<term>

<meaning>

<alternatives>

<term>

<meaning>

<alternatives>

6.2 Naming conventions

Repository-binding rules:

Feature identifiers use kebab-case.

Operation definitions live in operation-registry.ts.

Public result types use Result<Data, Code> from @afenda/errors.

The result discriminant is ok; success data is carried in data.

Production persistence adapters are Drizzle adapters named <feature>.drizzle.ts.

Commands and queries are named for business meaning and remain in the feature root.

Events describe completed facts in past tense.

Permission identifiers use the approved module namespace.

Record names use singular nouns.

Commands use active verb phrases.

Queries use get, list, search, or another approved query verb.

Events use completed facts in past tense.

Status values use stable business language.

UI labels must not introduce different vocabulary.

Database names must not redefine business meaning.

6.3 Term ownership

This feature owns only the terminology listed here.

Terms shared across multiple features must already be defined in the domain architecture or an approved shared contract.

7. Records and domain model

7.1 Aggregate and record inventory

Record

Type

Aggregate owner

Description

<Record>

aggregate/entity/value object/history

<aggregate>

<meaning>

<Record>

aggregate/entity/value object/history

<aggregate>

<meaning>

7.2 Primary aggregate

<AggregateName>
  id
  organizationId
  <business fields>
  status
  version
  createdAt
  createdBy
  updatedAt
  updatedBy

7.3 Field specification

Field

Type

Required

Normalization

Mutability

Privacy

id

opaque identifier

yes

server-generated

immutable

internal

organizationId

organization identifier

yes

trusted context

immutable

internal

<field>

<type>

yes/no

<rule>

<rule>

<class>

version

positive integer

yes

server-managed

increments

internal

7.4 Natural keys and uniqueness

Record

Natural key

Uniqueness scope

Case sensitivity

<record>

<fields>

organization

insensitive/sensitive

7.5 Relationships

Source

Relationship

Target

Cardinality

Integrity rule

<record>

<verb>

<record>

1:1 / 1 / n

<rule>

7.6 Effective dating

Choose one:

effective_dating: none

effective_dating: effective-range

effective_dating: bitemporal

Define:

effective start rule;

effective end rule;

overlap policy;

correction behavior;

chronology behavior;

future-effective changes;

cancellation or supersession.

7.7 Chronology

Chronology records must define:

event or change type;

effective date;

recorded date;

actor;

reason;

source;

immutable fields;

correction process.

Historical records must not be silently overwritten.

8. Lifecycle and state model

8.1 Status vocabulary

Status

Meaning

Entry condition

Exit condition

Terminal

<status>

<meaning>

<condition>

<condition>

yes/no

8.2 Allowed transitions

Transition ID

From

Trigger

To

Guard

Permission

Approval

TR-01

<from>

<operation>

<to>

<guard>

<permission>

yes/no

TR-02

<from>

<operation>

<to>

<guard>

<permission>

yes/no

8.3 Rejected transitions

Every transition absent from the allowed table must be rejected with the canonical invalid-transition outcome unless explicitly defined otherwise.

8.4 Terminal-state behavior

Define:

permitted queries;

prohibited mutations;

correction behavior;

reopening policy;

retention behavior.

8.5 Lifecycle diagram

stateDiagram-v2
[_] --> Draft
Draft --> Active: activate
Active --> Suspended: suspend
Suspended --> Active: restore
Active --> Closed: close
Closed --> [_]

Replace with the feature’s actual states.

9. Business rules and invariants

9.1 Business rules

Every rule must have an identifier and a named test.

Rule ID

Rule

Enforcement point

Violation outcome

BR-01

<rule>

schema/policy/store/operation

<error code>

BR-02

<rule>

<point>

<error code>

BR-03

<rule>

<point>

<error code>

Rules should be testable and unambiguous.

Avoid statements such as:

“should normally”;

“where appropriate”;

“as required”;

“reasonable”;

“support standard behavior”.

Replace them with measurable rules.

9.2 Feature invariants

Feature invariants use a feature-qualified namespace to avoid collision withdomain architecture invariants and repository ADR identifiers:

<MODULE>-<FEATURE>-INV-01

Do not use bare INV-01 in implementation, tests, or evidence.

Invariant ID

Invariant

<MODULE>-<FEATURE>-INV-01

Every record belongs to exactly one trusted organization context.

<MODULE>-<FEATURE>-INV-02

<feature-specific invariant>

<MODULE>-<FEATURE>-INV-03

<feature-specific invariant>

Invariants must hold after every successful mutation.

9.3 Store constraints

Constraint ID

Constraint

Database enforcement

Application guard

CON-01

<constraint>

yes/no

yes/no

9.4 Correction policy

Define how factual errors are corrected:

amend;

supersede;

reverse;

append correction;

administrator-only correction;

prohibited after terminal state.

Corrections must preserve evidence and chronology.

10. Operation catalog

10.1 Operation definitions

Operation identifiers and their policy metadata are authored by this featureand implemented in:

src/features/<feature-group>/<feature>/operation-registry.ts

The module registry and src/composition/module.manifest.ts must project thesedefinitions; they must not retype them as independent literals.

This table is the feature-level source for operation definitions that are composed into the domain operation registry.

Operation ID

Method name

Kind

Input

Output

Permission

Approval

Txn

Idempotency

Audit

Emits

<domain>.<group>.<feature>.create

create<Record>

command

<Input>

<View>

<permission>

no

required

request ID

yes

<Event>

<domain>.<group>.<feature>.get

get<Record>

query

<Input>

<View or null>

<permission>

—

none

—

no

—

<domain>.<group>.<feature>.list

list<Records>

query

<Input>

Page<View>

<permission>

—

none

—

no

—

10.2 Operation invariants

Every operation listed here must exist in code.

Every public feature operation in code must be listed here.

Every operation must belong to this feature.

Every mutation must declare transaction policy.

Every retryable mutation must declare idempotency policy.

Approval-required operations fail closed.

Public operations return canonical typed outcomes.

No operation may trust a client-supplied organization identity.

10.3 Operation details

Repeat this subsection for each operation.

Operation: <operationId>

Purpose

<What business outcome this operation performs.>

Kind

kind: command

Input

Field

Type

Required

Validation

Source

<field>

<type>

yes/no

<rule>

client/trusted-context/server

Output

<representation-safe output contract>

Preconditions

<precondition>;

<precondition>.

Business rules

BR-01;

BR-04.

Authorization

<permission>

Approval

required: false

Transaction policy

policy: required

Idempotency

enabled: true
key_source: requestId
fingerprint_fields:

- <field>

replay_behavior: return-original-result
mismatch_behavior: conflict

Emissions

<event>;

or none.

Possible outcomes

<success>;

<error code>;

<error code>.

11. Input contracts and validation

11.1 Validation posture

Unknown fields are rejected.

Strings are trimmed according to explicit rules.

Empty strings are not silently treated as null unless declared.

Client validation does not replace server validation.

Organization identity comes from trusted context.

Identifiers are opaque and validated.

Dates use the domain’s canonical date type.

Monetary values use the repository’s canonical decimal type.

Unicode behavior is explicitly tested.

Size and collection limits are explicit.

11.2 Input schema inventory

Schema

Used by

Unknown keys

Description

<Schema>

<operation>

reject

<purpose>

11.3 Field-level validation

Field

Minimum

Maximum

Format

Normalization

Null behavior

<field>

<min>

<max>

<format>

<rule>

rejected/allowed

12. Outcomes and error taxonomy

12.1 Result model

All public operations return:

Promise<Result<Data, Code>>

where Code is the narrow union of canonical error codes the operation can produce.

Expected business outcomes must not escape as unclassified exceptions.

12.2 Domain outcomes mapped to canonical error codes

Domain outcome

Canonical code

Retry posture

Notes

Malformed request shape

BAD_REQUEST

no

Reserved for malformed requests, not business-rule failure

Input or business-rule rejection

VALIDATION_ERROR

no

Default validation outcome

Record unavailable in permitted scope

NOT_FOUND

no

Also used for tenancy-safe absence

Actor lacks permission

FORBIDDEN

no

UNAUTHORIZED means unauthenticated

Lifecycle movement prohibited

CONFLICT

no

Record exists but current state forbids the move

Optimistic-concurrency loss

CONCURRENCY_CONFLICT

conditional

Use only for stale expected version or equivalent race

Uniqueness or other business conflict

CONFLICT

conditional

Do not overload concurrency code

Required capability unavailable

SERVICE_UNAVAILABLE

yes

Security-sensitive dependencies fail closed

Unexpected unreachable failure

INTERNAL_ERROR

conditional

Not an expected business outcome

The feature does not create a private error taxonomy. Any new canonical code is a change to @afenda/errors, not a feature-level decision.

12.3 Error constraints

Public failures use the flattened Result failure shape from @afenda/errors:ok: false, code, message, messageKey, and permitted details. There isno DomainError, FeatureError, result.error, or feature-local error classin the public contract.

Errors remain transport-neutral.

HTTP status codes are not defined here.

Cross-tenant lookup returns non-disclosing absence.

Internal dependency exceptions are translated.

Sensitive fields are not included in public error details.

Every declared error must have an operation-contract test.

13. Authorization and approval

13.1 Permission catalog

Permission

Grants

Default business roles

<domain>.<feature>.read

<queries>

<roles>

<domain>.<feature>.create

<commands>

<roles>

<domain>.<feature>.manage

<commands>

<roles>

13.2 Enforcement

Authorization is enforced at the domain operation boundary based on the composed operation definition.

It must not rely solely on:

frontend visibility;

route guards;

handler-local checks;

client-supplied role information.

13.3 Record-sensitive authorization

Where permission depends on record state, define:

Operation

Record condition

Required decision

<operation>

<condition>

allow/deny/approval

13.4 Approval requirements

Operation

Approval required

Approval subject

Failure posture

<operation>

yes/no

<subject>

fail closed

The platform approval capability owns approval execution.

This feature owns only the business fact or transition being approved.

14. Tenancy

14.1 Organization identity

Organization identity comes from:

server-trusted execution context

A client-supplied organization identifier must be:

absent from public input; or

rejected if supplied.

14.2 Tenant enforcement

Every store method must enforce organization scope.

Handler-only filtering is insufficient.

14.3 Foreign-reference lineage

Reference

Required lineage rule

Verification method

<foreign id>

same organization

<port>

<foreign id>

approved group relationship

<policy>

14.4 Cross-organization policy

Cross-organization access is:

default: denied
exception_policy: <policy or none>
audit_required: true

14.5 Tenancy tests

Required tests:

same-organization success;

cross-organization read returns absence;

cross-organization mutation rejected;

spoofed organization identifier rejected;

missing trusted organization context rejected;

uniqueness isolated per organization;

pagination isolated per organization;

foreign reference with invalid lineage rejected.

15. Privacy, retention, and evidence

15.1 Field classification

Field

Classification

Public projection

Events

Logs

Exports

<field>

public/internal/restricted/regulated

yes/no/redacted

yes/no

yes/no

yes/no

15.2 Secrets

This feature stores:

secrets_stored: none

If a technical secret is required, store only a platform-owned secret handle.

15.3 Retention

Record

Retention period

Trigger

Disposal method

Authority

<record>

<duration>

<event>

delete/redact/archive

<role>

15.4 Legal hold

Define:

whether records may be placed on legal hold;

which capability owns the hold;

how disposal is blocked;

how release is recorded.

15.5 Evidence

This feature may own evidence requirements and references, but not generic binary storage.

Evidence type

Required for

Storage owner

Feature stores

<evidence>

<transition or record>

document platform

opaque file reference and metadata

16. Persistence requirements

16.1 Store contract

The store contract must define:

tenant-scoped reads;

mutation methods;

expected ordering;

optimistic concurrency;

uniqueness behavior;

pagination;

chronology;

transaction participation through the approved opaque unit of work.

It must not expose SQL, ORM, or database-specific types.

16.2 Relational authority

The feature owns semantic persistence requirements and its store contract.@afenda/db owns Drizzle schema declarations, migrations, physical indexes,and database-specific constraints. This PRD specifies required behavior anddata integrity; it does not invent an alternative migration authority or applypath.

schema_authority: "@afenda/db"
migration_authority: "@afenda/db"

16.3 Table inventory

Table

Purpose

Aggregate

Expected volume

<table>

<purpose>

<aggregate>

<estimate>

16.4 Column requirements

Table

Column

Type requirement

Null

Default

Constraint

<table>

<column>

<semantic type>

yes/no

<default>

<constraint>

The relational owner selects the exact database representation consistent with these requirements.

16.5 Index requirements

Query

Sort/filter shape

Required leading columns

Expected result size

<operation>

<shape>

organization_id, ...

<number>

16.6 Concurrency

Mutable aggregates use:

concurrency_model: optimistic-version

Define:

version source;

expected-version input;

conflict outcome;

retry posture;

history behavior.

16.7 Migration plan

Expand

<new tables or nullable fields>;

<new indexes>;

<non-breaking constraints>.

Backfill

<data source>;

<batching>;

<validation>;

<row-count expectation>.

Contract

<constraints made required>;

<obsolete structures removed>;

<destructive steps and approvals>.

Rollback or recovery

<rollback procedure>;

<restore procedure>;

<verification procedure>.

16.8 Query and pagination strategy

pagination: cursor
default_page_size: <number>
maximum_page_size: <number>

Cursor fields:

<field>;

<tie-breaker identifier>.

Ordering must be stable and identical across memory and relational adapters.

17. Ports and integrations

17.1 Required inbound ports

These are capabilities this feature requires.

Port

Provider

Methods

Failure behavior

Atomicity

<Port>

<feature or platform>

<methods>

fail closed/soft

same unit/eventual

17.2 Provided outbound capabilities

These are stable capabilities another feature may consume.

Capability

Consumer

Contract

Stability

<capability>

<consumer>

<contract>

public/internal

Anything not listed is private.

17.3 Forbidden coupling

This feature must not:

import sibling adapters;

write sibling tables;

import application code;

depend on unapproved peer packages;

copy foreign lifecycle states;

invoke transport endpoints from domain logic where a port is required.

17.4 Cross-package workflow

Where more than one package mutates its own state, define:

coordination_model: event | application-saga
orchestrator: <owner>

Do not claim one database transaction across independently owned packages.

17.5 Dependency failure behavior

Dependency

Read or mutation

Failure outcome

Retryable

User effect

<dependency>

<type>

<error>

yes/no

<behavior>

18. Events

18.1 Event catalog

Event

Trigger operation

Payload

Consumers

Ordering

<FeatureCreated>

<operation>

<fields>

<consumers>

per aggregate

18.2 Event payload rules

Events may include:

aggregate identifier;

organization identifier;

business fact;

effective date;

actor reference where permitted;

schema version.

Events must not include:

database rows;

ORM objects;

secrets;

unrestricted personal data;

another feature’s internal state;

mutable display-only snapshots unless explicitly required.

18.3 Event schema example

interface <EventName>V1 {
schema: "<domain>.<feature>.<event>/v1";
eventId: string;
occurredAt: string;
organizationId: string;
aggregateId: string;
// representation-safe business facts
}

18.4 Delivery

Required domain events use the domain outbox and commit atomically with the state mutation.

18.5 Replay and deduplication

Define:

event ID uniqueness;

aggregate ordering;

consumer deduplication key;

replay compatibility;

additive schema evolution rules.

19. Public contracts and facade

19.1 Public types

Public contracts must be:

representation-safe;

stable;

tenant-neutral in shape where context supplies tenancy;

free from ORM and store types;

explicit about dates, decimals, pagination, and redaction.

19.2 Facade capabilities

Production consumers import only from the package root:

@afenda/<module-id>

The package root begins with import "server-only";. Deep imports areprohibited unless a separately approved and exported subpath exists.

The package facade will expose:

Facade method

Feature operation

Consumer class

<method>

<operation ID>

application/server job

19.3 Prohibited facade exposure

The facade must not expose:

feature stores;

transaction handles;

relational schemas;

adapters;

raw ports;

internal handlers;

event-storage envelopes;

mutable registry internals.

19.4 Compatibility

Classify facade changes:

compatibility: additive

or:

compatibility: breaking
migration_plan: <required plan>

19.5 Consumer-contract tests

Required consumers:

Consumer

Contract tested

Test owner

<consumer>

<methods/types>

<owner>

20. User experience

20.1 Frontend delivery scope

frontend_in_release: true
application: <app>
base_route: </route>
navigation_group: <group>

If frontend is not included:

frontend_in_release: false
reason: <reason>

20.2 Navigation

The feature appears in navigation only when:

the organization capability is active;

the actor has the required read permission;

the backend feature is available;

the route is implemented;

activation status permits access.

A planned feature must not render an empty route.

20.3 Screen inventory

Screen

Purpose

Primary action

Data operation

Permission

List

<purpose>

<action>

<list operation>

<permission>

Detail

<purpose>

<action>

<get operation>

<permission>

Create/Edit

<purpose>

<action>

<command>

<permission>

20.4 Screen-state matrix

Every applicable screen must define:

State

Required behavior

Loading

Skeleton matches final layout

Empty—never populated

Explain concept and show permitted primary action

Empty—filtered to zero

Explain filter result and allow clearing filters

Partial

Render available sections and degrade failed sections inline

Retryable error

Show actionable message and retry

Terminal error

Show escape route without false retry

Permission denied

Explain required access without leaking restricted facts

Stale conflict

Explain change and allow reload or reapply

Optimistic pending

Prevent duplicate submission

Feature inactive

Explain availability according to product policy

20.5 Forms

For each form define:

fields;

field ordering;

required fields;

conditional fields;

server and client validation;

inline error placement;

unsaved-change behavior;

submit idempotency;

disabled and pending states;

accessible labels and instructions.

20.6 List behavior

Define:

visible columns;

default sort;

filters;

search behavior;

cursor pagination;

row actions;

bulk actions;

export behavior;

restricted-field redaction.

20.7 Detail behavior

Define:

summary;

lifecycle status;

chronology;

related records;

evidence;

available actions by state;

approval information;

audit visibility;

sensitive-field access.

20.8 Accessibility and internationalization

Meet the approved accessibility standard.

All user-visible strings are externalized.

Dates and numbers are localized.

No color-only status communication.

Keyboard navigation is supported.

Error messages identify affected fields.

RTL and long-text behavior are tested where required.

21. Non-functional requirements

21.1 Performance

Dimension

Target

Verification

p95 query latency

<target>

load test

p95 command latency

<target>

load test

list volume

<rows per organization>

representative fixture

concurrent mutation

<target>

conflict test

Targets must be realistic and based on expected use where evidence exists.

21.2 Availability

Dependency or path

Required posture

Authorization

fail closed

Approval

fail closed

Primary persistence

mutation fails atomically

Optional projection

fail soft where declared

Event delivery

outbox retry

21.3 Audit

Required command audit coverage:

audit_coverage: 100_percent_of_mutations

21.4 Security

Required controls:

trusted tenant context;

operation-boundary authorization;

input validation;

no secret storage;

safe logs;

stable error translation;

protected cross-tenant absence;

least-privilege permissions;

concurrency control.

21.5 Data integrity

The system must preserve:

uniqueness;

tenant lineage;

lifecycle validity;

chronology;

referential integrity;

atomic mutation evidence;

deterministic ordering;

adapter parity.

22. Observability and analytics

22.1 Structured logs

Record:

operation ID;

feature ID;

organization ID;

actor ID;

outcome code;

duration;

correlation ID;

dependency result.

Do not record sensitive payload bodies.

22.2 Metrics

Metric

Purpose

Alert threshold

command count

usage

none

error rate by code

reliability

<threshold>

p95 latency

performance

<threshold>

conflict rate

concurrency health

<threshold>

approval wait

process health

<threshold>

outbox backlog

delivery health

<threshold>

22.3 Product analytics

Event

Question answered

<feature_started>

Are users adopting the feature?

<primary_job_completed>

Can users complete the main job?

<workflow_abandoned>

Where does the workflow fail?

Analytics events must not become domain events unless they represent authoritative business facts.

22.4 Alerts and runbooks

Alert

Owner

Runbook

<alert>

<team>

<path>

23. Testing specification

Tests are the executable acceptance criteria.

23.1 Policy and rule tests

Required:

one named test per business rule;

one named test per invariant;

one test per allowed state transition;

one test per rejected transition;

correction-policy tests;

terminal-state tests.

Naming examples:

BR-01 rejects duplicate active reference within one organization
TR-03 moves an approved draft to active
INV-02 preserves immutable chronology after correction

23.2 Operation contract tests

For each operation:

happy path;

validation failure;

every declared feature error;

authorization denial;

approval-required behavior;

dependency failure;

tenancy isolation;

idempotent replay;

idempotency mismatch;

optimistic conflict;

audit behavior;

event behavior.

23.3 Adapter parity

The same behavioral scenario suite runs against<feature>.memory.ts and <feature>.drizzle.ts. Parity is measured byobservable feature semantics, not implementation similarity.

The same scenario suite must run against:

memory adapter;

relational adapter.

Parity covers:

values;

errors;

ordering;

pagination;

uniqueness;

concurrency;

chronology;

tenant isolation;

idempotency.

23.4 Hostile-input tests

Test:

oversized strings;

empty and whitespace-only strings;

Unicode normalization;

RTL text;

null bytes;

injection-like strings;

unknown keys;

wrong types;

deeply nested objects;

excessive collection sizes;

spoofed organization ID;

malformed identifiers;

replayed request IDs;

concurrent mutations.

23.5 Atomicity and emissions

Prove:

state failure creates no audit or event;

audit failure rolls back state;

outbox failure rolls back state and audit;

successful mutation creates exactly the required audit and outbox records;

replay does not duplicate either;

no event escapes before commit.

23.6 Persistence tests

Test:

required constraints;

uniqueness by organization;

index-supported query behavior where measurable;

migration apply;

migration recovery or rollback;

existing-row handling;

cursor stability;

deterministic sort.

23.7 Frontend tests

Where frontend is included:

every state in Section 20.4;

form validation parity;

permission-projected actions;

conflict handling;

idempotent submission;

accessibility scan;

keyboard navigation;

responsive behavior;

internationalized strings.

23.8 Negative ownership tests

Prove the feature does not:

expose excluded fields;

write foreign tables;

import forbidden adapters;

store secrets;

accept browser-controlled organization identity;

expose ORM types;

create undocumented public operations.

23.9 Coverage posture

Coverage expectations:

business_rules: 100_percent
state_transitions: 100_percent
declared_operation_outcomes: 100_percent
adapter_behavior: parity_suite

A generic line-coverage percentage is not a substitute.

24. Exact implementation manifests

These manifests are exhaustive. A slice may modify only the paths assigned to it.

24.1 Feature backend manifest

src/features/<feature-group>/<feature>/
├── index.ts # optional private projection
├── operation-registry.ts # canonical feature operation owner
├── run-operation.ts # feature execution entrypoint
├── schema.ts # trusted-ingress validation
├── policy.ts # authorization/privacy/workflow policy
├── guards.ts # invariant enforcement
├── store-contract.ts # persistence-agnostic capability
├── <business-noun>.ts # business model and use cases
├── adapters/
│ ├── <feature>.memory.ts
│ └── <feature>.drizzle.ts
└── **tests**/

Do not create empty files. Do not add `definition.ts`, generic `operations.ts`,
`commands/`, `queries/`, or a `relational.ts` adapter. A feature-level `ports.ts`
is permitted only for a genuinely feature-owned external capability.

List exact actual files below:

File

Purpose

Slice

<path>

<purpose>

<n>

24.2 Database manifest

File

Authority

Purpose

Slice

<schema path>

relational owner

schema

<n>

<migration path>

migration owner

migration

<n>

<database test path>

relational owner

constraint tests

<n>

24.3 Composition, module manifest, and registry manifest

Only actual repository paths may be listed. Do not assume genericcompose-features.ts or compose-operation-registry.ts files exist.

The feature slice may update src/composition/module.manifest.ts only throughprojections sourced from the feature operation registry. Command, query,permission, authorization, event, and dependency values must not be manuallyduplicated.

File

Permitted change

Slice

<actual composition projection path>

register feature definition

<n>

<actual registry composition path>

compose feature operations

<n>

<runtime composition path>

bind feature store and ports

<n>

Kernel changes are not permitted in a feature slice unless separately approved as a domain-architecture slice.

24.4 Facade manifest

File

Permitted change

Slice

<facade path>

expose approved capability

<n>

<public contract path>

expose representation-safe type

<n>

<consumer test path>

verify facade contract

<n>

24.5 Frontend manifest

File

Purpose

Slice

<route>

route registration

<n>

<list screen>

list UI

<n>

<detail screen>

detail UI

<n>

<form>

create/edit UI

<n>

<tests>

state and accessibility tests

<n>

24.6 Documentation and evidence manifest

File

Purpose

Slice

PRD.md

approved feature specification

0

IMPLEMENTATION-SLICES.md

execution plan

0

<evidence path>

slice evidence

<n>

<decision path>

feature decision

as needed

24.7 Prohibited modifications

Unless separately approved, this feature must not modify:

another feature;

domain kernel;

package-wide architecture;

unrelated migrations;

peer packages;

application areas outside its frontend manifest;

repository configuration;

dependency declarations.

25. Implementation slices

Each slice must be independently reviewable, revertible, and leave its declared scope green.

25.1 Recommended sequence

Slice

Name

Produces

Done when

0

PRD closure

Approved PRD and manifests

No blocking TBDs

1

Contracts

Definitions, public types, schemas

Contract compilation and schema tests pass

2

Policy

Rules and lifecycle

All rule and transition tests pass

3

Store and memory

Store contract and memory adapter

Memory scenarios pass

4

Operations

Commands, queries, operation definitions

Contract tests pass

5

Persistence

Relational schema, migration, adapter

Parity passes

6

Atomicity

Audit, outbox, idempotency

Atomicity tests pass

7

Composition and facade

Runtime binding and public API

Consumer contracts pass

8

Frontend

Screens, forms, states

UI and accessibility tests pass

9

Closure

Full verification evidence

Feature closure gates pass

Adjust only where dependencies justify it.

25.2 Slice card

SLICE <n> — <name>

PRD:
<prd_id>

Read:
<exact sections>
<exact files>

Write:
<exact paths>

Produce:
<artifacts>

Business rules:
<rule IDs>

Operations:
<operation IDs>

Tests:
<exact test names or suites>

Commands:
<exact verification commands>

Done when:
<machine-verifiable conditions>

Do not:
<likely scope creep>
<likely architecture violation>

Blocking questions:
<question IDs or none>

25.3 Slice reporting

Each completed slice reports:

files changed;

tests added;

commands run;

exit codes;

rules implemented;

operations implemented;

gates passed;

evidence path;

remaining questions;

status changes.

A prose claim of completion without evidence is insufficient.

26. Rollout and activation

26.1 Deployment stages

Stage

Entry criteria

Exit criteria

Rollback

Database prepared

Migration approved

Migration verified

restore/reverse

Code deployed inactive

Backend verified

Health checks pass

disable path

Pilot

Roles and data ready

Pilot acceptance

deactivate

General activation

Pilot exit criteria met

Stable operation

organization toggle off

Enterprise ready

Assurance review passed

Ongoing controls accepted

suspend

26.2 Feature flag

feature_flag: <flag-name>
default: false
scope: organization

26.3 Pilot

Field

Value

Pilot organization

<organization>

Pilot users

<roles/count>

Pilot duration

<duration>

Entry criteria

<criteria>

Exit criteria

<criteria>

Rollback authority

<role>

26.4 Data readiness

Before activation:

required records are migrated or entered;

ownership is assigned;

duplicates are resolved;

mandatory evidence is available;

cross-reference integrity is verified;

access roles are assigned;

reconciliation is approved.

26.5 Operational readiness

Required:

runbook;

support owner;

monitoring;

alert thresholds;

backup and recovery procedure;

user guidance;

retention configuration;

audit review process;

feature-disable procedure.

27. Success metrics

27.1 Primary metric

<single primary outcome metric>

Define:

numerator;

denominator;

measurement window;

source;

owner;

baseline;

target.

27.2 Supporting metrics

Metric

Definition

Baseline

Target

Owner

<metric>

<definition>

<value or unknown>

<target>

<owner>

27.3 Guardrail metrics

Guardrail

Why it matters

Maximum acceptable level

<error rate>

<reason>

<threshold>

<processing delay>

<reason>

<threshold>

<manual exception rate>

<reason>

<threshold>

27.4 Measurement limitations

Document:

missing baselines;

incomplete data sources;

measurement lag;

proxy metrics;

risks of misinterpretation.

Do not invent numerical targets without evidence or an explicit management decision.

28. Feature Definition of Done

28.1 Specification

Feature is present in the approved domain architecture inventory.

Ownership and exclusions are explicit.

PRD contains no blocking TBD.

Canonical terms are defined.

Records and lifecycle are complete.

Operations and errors are complete.

Exact file manifests are approved.

Blocking questions are resolved.

28.2 Backend

operation-registry.ts is the canonical owner of operation metadata.

Module-manifest projections are derived rather than retyped.

Public outcomes use narrow Result<Data, Code> contracts.

No definition.ts, generic commands/, generic queries/, or relational adapter naming has been introduced.

Every operation in Section 10 exists.

No undocumented public operation exists.

Every business rule has a named test.

Every lifecycle transition is tested.

Every rejected transition is tested.

Memory adapter scenarios pass.

Tenancy and authorization tests pass.

Idempotency and concurrency tests pass.

Negative ownership tests pass.

No prohibited imports or files exist.

28.3 Database

Schema is owned by the approved relational authority.

Migration applies successfully.

Recovery or rollback is verified.

Required constraints exist.

Required indexes exist.

Existing-row strategy is verified.

Relational adapter passes parity.

28.4 Atomicity and emissions

State, audit, and required outbox effects commit together.

Failure injection proves rollback.

Events match the event catalog.

Replay does not duplicate effects.

Event payloads contain no prohibited fields.

28.5 Facade

Approved capabilities are exposed.

Public contracts are representation-safe.

No adapter, store, transaction, or ORM types leak.

Consumer-contract tests pass.

Deep-import checks pass.

Compatibility assessment is recorded.

28.6 Frontend

Where included:

Required screens exist.

All applicable state-matrix states are implemented.

Form validation matches server contracts.

Permission projection matches server decisions.

Conflict handling works.

Accessibility checks pass.

Internationalization requirements pass.

Inactive features do not render as live empty screens.

28.7 Verification

Architecture gates pass.

Package lint passes.

Package typecheck passes.

Package tests pass.

Database tests pass.

Consumer tests pass.

Evidence is recorded.

No file outside approved manifests changed.

Status dimensions are updated accurately.

28.8 Activation

Implementation completion does not imply activation.

Activation requires:

rollout approval;

data readiness;

role assignment;

operational runbook;

monitoring;

recovery procedure;

pilot acceptance where applicable.

28.9 Canonical verification commands

At minimum, closure evidence records fresh execution of:

pnpm --filter @afenda/<module-id> lint
pnpm --filter @afenda/<module-id> typecheck
pnpm --filter @afenda/<module-id> test
pnpm gen:doctor:erp
pnpm validate:modules
pnpm governance:packages

When tenant roots or SQL tenancy behavior change, also run:

pnpm audit:tenancy-nulls
pnpm check:tenancy-residue
pnpm check:tenant-sql-safety

When database artifacts change, use only the repository migration path:

pnpm db:generate
pnpm db:check
AFENDA_ALLOW_DB_MIGRATE=1 pnpm --filter @afenda/db db:migrate

db:push and db:pull are prohibited.

29. Known failure modes

Failure mode

Prevention

Feature duplicates another domain’s record

Ownership and negative-assertion tests

Feature group becomes a runtime owner

Architecture checks

Operation is added without PRD entry

Registry parity

Registry duplicates feature policy manually

Composed feature-owned operation definitions

Client controls organization identity

Schema and tenancy tests

Authorization exists only in UI

Operation-boundary test

Memory and relational behavior diverge

Shared parity suite

SQL determines business behavior

Memory-first sequence

Events escape before commit

Atomicity fault injection

Idempotent replay duplicates effects

Replay tests

Facade leaks ORM or store types

Consumer and export checks

Feature stores credentials

Contract-shape and persistence tests

Planned route appears as empty screen

Activation-derived navigation

Implementation status is overstated

Multidimensional status model

Kernel change is hidden in feature slice

Exact manifest and independent kernel slice

Add feature-specific failure modes below:

Feature-specific failure mode

Prevention

<failure>

<control>

30. Decisions

Decision ID

Decision

Alternatives rejected

Rationale

Status

Date

FD-01

<decision>

<alternatives>

<reason>

proposed

<date>

Material decisions should move to:

docs/erp/<module-id>/feature-specs/<feature-group>/<feature>/DECISIONS.md

or dedicated ADRs according to repository policy.

31. Open questions

Question ID

Question

Blocks

Owner

Needed by

Resolution

FQ-01

<question>

slice <n>

<owner>

<date/gate>

unresolved

Rules:

blocking questions stop the affected slice;

implementers must not invent answers;

resolved questions become PRD amendments or decision records;

non-blocking questions must state why work may safely continue.

32. Agent operating contract

32.1 Required read set

Before implementing a slice, the agent reads:

the relevant repository-wide architecture decisions;

docs/erp/<module-id>/<module-id>-architecture.md;

this PRD;

the approved golden feature or reference implementation;

contracts imported by the slice;

the exact slice read set.

Additional reads are permitted only when required to:

understand an imported contract;

follow a repository convention;

verify an authority path;

diagnose a failed required test.

Additional reads do not authorize additional writes.

32.2 Write restrictions

The agent may write only to the exact paths assigned in:

Section 24;

the approved slice card.

A required write outside that set blocks the slice until the manifest is amended.

32.3 Prohibited actions

inventing behavior absent from the PRD;

changing the domain architecture within a feature slice;

creating placeholder files;

adding dependencies without approval;

editing another feature;

weakening or skipping tests;

suppressing type errors;

bypassing tenancy or authorization;

storing technical secrets;

writing directly to foreign tables;

manually duplicating registry definitions;

claiming completion without fresh evidence.

32.4 Stop conditions

Stop and report when:

the PRD contradicts the domain architecture;

two business rules conflict;

a required dependency contract is missing;

persistence requirements contradict the relational authority;

adapter parity requires changing business behavior;

a migration would destructively affect existing rows without an approved plan;

an operation requires foreign data ownership;

an unresolved question blocks the slice;

required work falls outside the write manifest.

32.5 Slice output protocol

Report:

Slice:
Files changed:
Tests added:
Rules covered:
Operations covered:
Commands run:
Exit codes:
Gates passed:
Evidence:
Open questions:
Status update:

Do not substitute a general prose summary for verification evidence.

Appendix A — PRD authoring order

Complete sections in this order:

1. Ownership and exclusions
2. Records and lifecycle
3. Operations
4. Business rules and invariants
5. Errors
6. Ports and events
7. Persistence
8. Tenancy, authorization, and privacy
9. Tests
10. Exact manifests
11. Implementation slices
12. Problem, jobs, and metrics
13. Rollout

This order prevents prose from getting ahead of executable requirements.

Appendix B — PRD approval checklist

A reviewer should be able to answer:

What exact problem does this feature solve?

Who owns the feature?

Why does it belong in this domain?

What facts does it own?

What facts must it never own?

What records and lifecycle states exist?

What public operations exist?

What permission protects each operation?

What business rule governs each mutation?

What errors can each operation return?

What foreign capabilities are required?

What events are emitted?

How is tenancy enforced?

Where do schemas and migrations live?

How is parity proven?

Which exact files may implementation change?

What proves the feature complete?

What remains separate from activation?

If these cannot be answered, the PRD is not implementation-ready.

Appendix C — Requirement traceability matrix

Requirement

Operation

Rule

Test

Implementation file

Evidence

<requirement>

<operation>

BR-01

<test>

<path>

<evidence>

This matrix may be generated from the PRD and source definitions.

Appendix D — Example document location

docs/erp/<module-id>/
├── <module-id>-architecture.md
└── feature-specs/
└── <feature-group>/
└── <feature>/
├── PRD.md
├── IMPLEMENTATION-SLICES.md
├── DECISIONS.md
└── evidence/

packages/erp/<module-id>/
└── src/features/<feature-group>/<feature>/

Appendix E — Relationship to the domain architecture

docs/erp/<module-id>/<module-id>-architecture.md
defines:
domain mission
ownership model
feature inventory
permanent package structure
dependency direction
kernel and facade rules
tenancy and persistence authority
domain-wide quality gates

Feature PRD
defines:
one feature problem
records and lifecycle
operations and rules
permissions and errors
ports and events
persistence requirements
screens and behavior
tests, manifests, and slices

Implementation
realizes:
approved contracts and behavior

Evidence
proves:
implementation conforms to architecture and PRD
