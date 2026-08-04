# `<Feature group> / <Feature>` — feature PRD

| Field | Value |
| --- | --- |
| Module | `<module-id>` |
| Feature group | `<feature-group>` |
| Feature | `<feature>` |
| Backend path | `packages/erp/<module-id>/src/features/<feature-group>/<feature>` |
| Web mirror | `apps/web/features/<module-id>/<feature-group>/<feature>` or `NOT_REQUIRED` |
| Status | `DRAFT / APPROVED / SUPERSEDED` |
| Criticality | `C1 / C2 / C3` |
| Owner | `<owner>` |
| Parent module PRD | `<path>` |

## 1. Mission

`<One bounded business outcome. Do not combine unrelated capabilities.>`

## 2. Non-ownership

This feature does not own:

- `<term or behavior>`;
- `<peer feature responsibility>`;
- `<application or infrastructure concern>`.

## 3. Actors and use cases

| Actor | Use case | Required outcome | Prohibited outcome |
| --- | --- | --- | --- |
| `<actor>` | `<use case>` | `<result>` | `<restriction>` |

## 4. Canonical terms

| Term | Definition | Invariant |
| --- | --- | --- |
| `<term>` | `<meaning>` | `<always-true rule>` |

## 5. Aggregate or capability model

### 5.1 Identity

| Record | ID type | Tenant scope | Natural key |
| --- | --- | --- | --- |
| `<record>` | `<brand>` | `<organization/global>` | `<key>` |

### 5.2 Fields and invariants

| Field | Type | Required | Source | Invariant |
| --- | --- | ---: | --- | --- |
| `<field>` | `<type>` | `yes/no` | `<actor/system/reference>` | `<rule>` |

### 5.3 Lifecycle

| State | Meaning | Allowed operations | Terminal |
| --- | --- | --- | ---: |
| `<state>` | `<meaning>` | `<operations>` | `yes/no` |

| From | Command | To | Preconditions | Failure |
| --- | --- | --- | --- | --- |
| `<state>` | `<command>` | `<state>` | `<rules>` | `<code>` |

## 6. Command requirements

### 6.1 `<command-id>`

**Business outcome:** `<outcome>`

**Input:**

| Field | Type | Trust source | Rule |
| --- | --- | --- | --- |
| `<field>` | `<type>` | `session/input/system` | `<rule>` |

**Preconditions:**

1. `<precondition>`
2. `<precondition>`

**Mutation:**

- `<state change>`
- `<owned tables>`

**Atomic effects:**

- Audit: `<fact/none>`
- Event: `<event/none>`
- Other: `<effect/none>`

**Errors:**

| Code | Trigger | Retryable | Public detail |
| --- | --- | ---: | --- |
| `<code>` | `<condition>` | `yes/no` | `<safe detail>` |

**Idempotency:** `<required/supported/none; key semantics>`

**Concurrency:** `<expected version and conflict behavior>`

Repeat for every command.

## 7. Query requirements

### 7.1 `<query-id>`

**Information outcome:** `<outcome>`

**Filters and pagination:**

| Input | Rule |
| --- | --- |
| `<filter>` | `<normalization/limit>` |

**Ordering:** `<stable ordering and tie-breaker>`

**Projection:**

| Field | Source | Privacy rule |
| --- | --- | --- |
| `<field>` | `<owner>` | `<rule>` |

**Absence behavior:** `<not found/empty/non-disclosing>`

Repeat for every query.

## 8. Canonical operation matrix

| ID | Kind | Public name | Permission | Approval | Privacy | Transaction | Idempotency | Audit | Emission |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `<id>` | `<command/query>` | `<name>` | `<permission>` | `<policy>` | `<policy>` | `<mode>` | `<mode>` | `<mode>` | `<mode>` |

## 9. Persistence contract

### 9.1 Tables

| Table | Ownership | Row type | Tenant scoped | Operations |
| --- | --- | --- | ---: | --- |
| `<table>` | `<feature>` | `<root/child/fact>` | `yes/no` | `<commands>` |

### 9.2 Store capabilities

| Store method | Semantic outcome | Transaction expectation |
| --- | --- | --- |
| `<method>` | `<outcome>` | `<expectation>` |

### 9.3 Adapter parity scenarios

- [ ] happy path;
- [ ] duplicate natural key;
- [ ] cross-tenant access;
- [ ] missing reference;
- [ ] invalid transition;
- [ ] optimistic conflict;
- [ ] idempotent replay;
- [ ] stable pagination;
- [ ] rollback on required side-effect failure.

## 10. Integration

### 10.1 References

| Reference | Owner module | Lookup method | Historical stamp |
| --- | --- | --- | --- |
| `<reference>` | `<module>` | `<facade/port>` | `<fields/none>` |

### 10.2 Emitted events

| Event | Version | Trigger | Payload |
| --- | ---: | --- | --- |
| `<event>` | `1` | `<command>` | `<minimal facts>` |

### 10.3 Consumed events or ports

`<contracts and idempotency/failure behavior, or NOT_APPLICABLE>`

## 11. Web workflow

### 11.1 User journey

1. `<step>`
2. `<step>`
3. `<observable result>`

### 11.2 Route and capsule

| Surface | Path |
| --- | --- |
| Capsule | `apps/web/features/<module>/<group>/<feature>` |
| Route | `<route>` |
| Loader queries | `<query IDs>` |
| Actions | `<command IDs>` |

### 11.3 User states

- [ ] loading;
- [ ] empty;
- [ ] no result;
- [ ] success;
- [ ] validation failure;
- [ ] forbidden;
- [ ] not found;
- [ ] conflict;
- [ ] approval required/pending;
- [ ] retryable failure;
- [ ] non-retryable failure;
- [ ] replay result.

## 12. Tests and acceptance

### 12.1 Behavior

- [ ] every invariant;
- [ ] every transition;
- [ ] every public operation;
- [ ] every failure code;
- [ ] every emitted event;
- [ ] every required audit fact.

### 12.2 Security

- [ ] missing actor;
- [ ] missing organization;
- [ ] missing permission;
- [ ] spoofed organization;
- [ ] cross-tenant reference;
- [ ] expired/missing approval;
- [ ] unsafe detail redaction.

### 12.3 Integrated acceptance

| Scenario | Package evidence | DB evidence | Web evidence |
| --- | --- | --- | --- |
| `<scenario>` | `<test>` | `<test>` | `<test>` |

## 13. Definition of complete

The feature is complete only when:

- operation registry, facade, store behavior, relational writes, audit/events, and web workflow agree;
- all applicable acceptance evidence passes;
- no alternate mutation path exists;
- no placeholder or unproved behavior remains;
- the parent roadmap records closure and the next slice becomes eligible.
