# `<Module name>` — product requirements document

> Replace every `<placeholder>`. Delete every non-applicable section only after recording `NOT_APPLICABLE` with its reason.

| Field | Value |
| --- | --- |
| Module ID | `<module-id>` |
| Package | `@afenda/<module-id>` |
| Path | `packages/erp/<module-id>` |
| Status | `DRAFT / REVIEW / APPROVED / SUPERSEDED` |
| Criticality | `C1 / C2 / C3` |
| Activation | `core / organization_toggle` |
| Package owner | `<owner>` |
| Architecture owner | `<owner>` |
| Security owner | `<owner-or-N/A>` |
| Domain architecture | `<path>` |
| Roadmap | `<path>` |
| Admission record | `<path>` |

---

## 1. Executive definition

### 1.1 Mission

`<One paragraph defining the business capability this module owns.>`

### 1.2 Business outcome

The module enables `<actors>` to `<business result>` while ensuring `<control, compliance, or correctness outcome>`.

### 1.3 Product promise

- `<promise 1>`
- `<promise 2>`
- `<promise 3>`

### 1.4 Explicit non-ownership

This module does not own:

- `<excluded bounded context>`;
- `<excluded sensitive or specialist concern>`;
- `<excluded platform or application concern>`.

---

## 2. Problem statement

### 2.1 Current problem

`<Describe the operational, control, data, or workflow problem without proposing implementation.>`

### 2.2 Consequences

| Consequence | Affected actor | Evidence or observed impact |
| --- | --- | --- |
| `<problem>` | `<actor>` | `<impact>` |

### 2.3 Why a bounded module is required

`<Explain why the capability has coherent vocabulary, lifecycle, operations, and mutation ownership.>`

---

## 3. Objectives and non-objectives

### 3.1 Objectives

1. `<Measurable product objective>`
2. `<Correctness or control objective>`
3. `<User or operational objective>`

### 3.2 Non-objectives

1. `<Explicitly deferred or separately owned outcome>`
2. `<Technology or UI detail that is not the module’s product mission>`

### 3.3 Success measures

| Measure | Baseline | Target | Evidence source |
| --- | ---: | ---: | --- |
| `<measure>` | `<value>` | `<value>` | `<source>` |

---

## 4. Actors and responsibilities

| Actor | Responsibility | Allowed outcomes | Prohibited outcomes |
| --- | --- | --- | --- |
| `<actor>` | `<responsibility>` | `<actions>` | `<separation-of-duties restriction>` |

Include system actors, workers, approvers, auditors, and integration actors where applicable.

---

## 5. Canonical vocabulary

| Term | Definition | Owner | Not equivalent to |
| --- | --- | --- | --- |
| `<term>` | `<precise definition>` | `<feature>` | `<commonly confused term>` |

Rules:

- one definition per term;
- no UI labels presented as canonical terms;
- no duplicate local meaning for another module’s term;
- statuses and lifecycle facts are defined here or in the owning feature PRD.

---

## 6. Capability map

| Feature group | Feature | Mission | Aggregate or capability owner | Web required |
| --- | --- | --- | --- | ---: |
| `<group>` | `<feature>` | `<bounded mission>` | `<aggregate>` | `yes/no` |

Permanent backend path:

```text
src/features/<feature-group>/<feature>
```

Permanent web mirror when required:

```text
apps/web/features/<module-id>/<feature-group>/<feature>
```

---

## 7. Functional scope by feature

### 7.1 `<Feature group> / <Feature>`

**Mission:** `<one bounded statement>`

**Owned records or aggregates:**

- `<aggregate>`

**Commands:**

- `<operation-id>` — `<business outcome>`

**Queries:**

- `<operation-id>` — `<information outcome>`

**Rules:**

1. `<rule>`
2. `<rule>`

**Non-scope:**

- `<excluded behavior>`

Repeat for every admitted feature.

---

## 8. Lifecycle models

### 8.1 `<Aggregate>`

| State | Meaning | Mutable | Terminal |
| --- | --- | ---: | ---: |
| `<state>` | `<meaning>` | `yes/no` | `yes/no` |

| From | Operation | To | Preconditions | Failure code | Audit/event |
| --- | --- | --- | --- | --- | --- |
| `<state>` | `<command>` | `<state>` | `<rules>` | `<code>` | `<facts>` |

Define reversal, cancellation, closure, reopening, effective dates, and historical truth.

---

## 9. Operation inventory

| Operation ID | Kind | Feature owner | Public name | Permission | Approval | Transaction | Idempotency | Audit | Event |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `<id>` | `command/query` | `<feature>` | `<name>` | `<permission>` | `<policy/none>` | `<mode>` | `<mode>` | `<mode>` | `<event/none>` |

Every row must later exist exactly once in the feature-owned `operation-registry.ts`.

---

## 10. Authorization and separation of duties

### 10.1 Permission grammar

`<module>.<resource>.<action>`

### 10.2 Permission inventory

| Permission | Operations | Actor class | Notes |
| --- | --- | --- | --- |
| `<permission>` | `<operation ids>` | `<actor>` | `<constraints>` |

### 10.3 Approval policies

| Policy | Trigger | Required approver | Prohibited approver | Expiry or revocation |
| --- | --- | --- | --- | --- |
| `<policy>` | `<condition>` | `<actor>` | `<SoD>` | `<rule>` |

### 10.4 Fail-closed rules

- missing actor;
- missing organization;
- missing permission;
- expired approval;
- self-approval where prohibited;
- cross-organization reference;
- unrecognized operation.

---

## 11. Data ownership and persistence

### 11.1 Table ownership

| Table | Feature owner | Root/child/fact | Tenant scoped | Mutation operations |
| --- | --- | --- | ---: | --- |
| `<table>` | `<feature>` | `<kind>` | `yes/no` | `<commands>` |

### 11.2 Uniqueness and references

| Record | Natural key | Tenant scope | Referenced owner | Inactive-reference behavior |
| --- | --- | --- | --- | --- |
| `<record>` | `<key>` | `<scope>` | `<module>` | `<rule>` |

### 11.3 Concurrency

| Aggregate | Strategy | Expected version input | Conflict outcome |
| --- | --- | --- | --- |
| `<aggregate>` | `<optimistic/pessimistic/serialized>` | `<field>` | `<code>` |

### 11.4 Transaction units

| Command | State writes | Audit | Outbox | Other atomic effect |
| --- | --- | --- | --- | --- |
| `<command>` | `<tables>` | `<fact>` | `<event>` | `<effect>` |

---

## 12. Events and integrations

### 12.1 Emitted events

| Event ID | Version | Owning operation | Minimal payload | Consumers |
| --- | ---: | --- | --- | --- |
| `<event>` | `1` | `<command>` | `<fields>` | `<consumers>` |

### 12.2 Consumed events

| Event ID | Owner | Handler feature | Idempotency key | Retry/dead-letter |
| --- | --- | --- | --- | --- |
| `<event>` | `<module>` | `<feature>` | `<key>` | `<policy>` |

### 12.3 Synchronous ports

| Port | Need | Provider | Failure/timeout semantics | Approval |
| --- | --- | --- | --- | --- |
| `<port>` | `<why event is insufficient>` | `<owner>` | `<semantics>` | `<record>` |

### 12.4 Application sagas

| Workflow | Participating packages | App owner | Compensation or partial-failure rule |
| --- | --- | --- | --- |
| `<workflow>` | `<packages>` | `<app orchestrator>` | `<rule>` |

---

## 13. Public facade contract

### 13.1 Root export

```text
@afenda/<module-id>
```

### 13.2 Public operation shape

```ts
type ModuleOperation<Input, Output, Code extends string> = (
  context: TrustedExecutionContext,
  input: Input,
) => Promise<Result<Output, Code>>;
```

### 13.3 Permitted auxiliary exports

| Export | Consumer | Reason |
| --- | --- | --- |
| `./adapters/drizzle` | application composition | production adapter construction |
| `./testing` | tests | deterministic memory composition |

Record any additional runtime-isolation entrypoint explicitly.

### 13.4 Compatibility

| Dimension | Policy |
| --- | --- |
| Source | `<policy>` |
| Runtime exports | `<policy>` |
| Event wire | `<policy>` |
| Stored data | `<migration policy>` |

---

## 14. Web application requirements

### 14.1 Required routes

| Route bucket | Route | Feature mirror | User outcome |
| --- | --- | --- | --- |
| `(operator)` | `<route>` | `<module/group/feature>` | `<outcome>` |

### 14.2 Required user states

| Feature | Loading | Empty | No-result | Forbidden | Conflict | Approval | Retryable failure |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `<feature>` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### 14.3 Action map

| Web Action | Package command | Transport input | Revalidation |
| --- | --- | --- | --- |
| `<action>` | `<command>` | `<fields excluding tenant/actor>` | `<paths/tags>` |

### 14.4 Read map

| Loader | Package query | View model | Route |
| --- | --- | --- | --- |
| `<loader>` | `<query>` | `<view model>` | `<route>` |

---

## 15. Non-functional requirements

| Area | Requirement | Target | Proof |
| --- | --- | --- | --- |
| Correctness | `<requirement>` | `<target>` | `<test/gate>` |
| Security | `<requirement>` | `<target>` | `<test/review>` |
| Performance | `<requirement>` | `<budget>` | `<gate>` |
| Accessibility | `<requirement>` | `<target>` | `<test>` |
| Recoverability | `<requirement>` | `<target>` | `<demonstration>` |
| Compatibility | `<requirement>` | `<window>` | `<fixtures/consumer check>` |

---

## 16. Migration and rollout

### 16.1 Existing-data migration

`<migration, backfill, validation, rollback, and cutover plan>`

### 16.2 Consumer migration

| Consumer | Current surface | Target surface | Cutover requirement |
| --- | --- | --- | --- |
| `<consumer>` | `<current>` | `<root facade>` | `<requirement>` |

### 16.3 Activation

| Audience | Default | Prerequisites | Rollback |
| --- | --- | --- | --- |
| `<organizations/roles>` | `<on/off>` | `<evidence>` | `<method>` |

---

## 17. Acceptance criteria

The module is accepted when:

- [ ] Every scope requirement has one feature owner.
- [ ] Every operation has one registry definition.
- [ ] Every mutation table has one business owner.
- [ ] Every command enforces trusted tenant and authorization context.
- [ ] Required state, audit, and outbox effects are atomic.
- [ ] Memory and production adapters have semantic parity where applicable.
- [ ] Root facade and consumer checks pass.
- [ ] Required web mirrors, routes, loaders, Actions, and states pass.
- [ ] Migration prerequisites and blockers are recorded.
- [ ] Exact evidence counts and digests are recorded.
- [ ] No required item is represented by a placeholder, skipped gate, or unresolved ownership decision.

---

## 18. Open decisions

| ID | Decision | Options | Owner | Deadline | Blocks |
| --- | --- | --- | --- | --- | --- |
| `<DEC-001>` | `<question>` | `<options>` | `<owner>` | `<date>` | `<slice>` |

A PRD cannot be approved while an open decision changes ownership, operation meaning, data model, authorization, transaction boundaries, or acceptance.
