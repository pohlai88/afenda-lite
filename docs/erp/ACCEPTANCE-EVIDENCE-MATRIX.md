# ERP acceptance and evidence matrix

## 1. Evidence rule

Every accepted requirement maps to:

```text
requirement
  → feature
  → operation or invariant
  → implementation path
  → test/gate
  → evidence result
  → digest
```

An evidence row without a requirement owner or implementation owner is invalid.

## 2. Module evidence matrix

| Area | Required evidence | Stage |
| --- | --- | --- |
| Admission | Approved architecture, PRD, owners, feature map | SCAFFOLDED |
| Topology | Exact grouped feature paths; no banned layer farm | SCAFFOLDED |
| Operations | Registry uniqueness and completeness | IMPLEMENTED |
| Facade | Root export parity and consumer compile | IMPLEMENTED |
| Authorization | Positive and negative operation tests | IMPLEMENTED |
| Tenancy | Cross-tenant read/write/reference negatives | VERIFIED |
| Persistence | Memory/Drizzle semantic parity | VERIFIED |
| Atomicity | Failure-injection rollback for state/audit/outbox | VERIFIED |
| Idempotency | Replay and duplicate-prevention tests | VERIFIED |
| Events | Payload/version/parity and post-commit proof | VERIFIED |
| Schema ownership | Manifest, DDL, adapter write parity | VERIFIED |
| Web mirror | Capsule, route, loader, Action parity | Web VERIFIED |
| Accessibility | Keyboard/focus/error/responsive evidence | Web VERIFIED |
| Integrated workflow | User outcome across package, DB, and web | Integrated VERIFIED |
| Migration | Apply, validate, rollback prerequisites | Rollout ELIGIBLE |

## 3. Requirement traceability template

| PRD ID | Requirement | Feature | Operation/invariant | Implementation | Evidence | Result |
| --- | --- | --- | --- | --- | --- | --- |
| `<REQ-001>` | `<requirement>` | `<group/feature>` | `<id>` | `<path>` | `<test/gate>` | `<status>` |

## 4. Command scenario matrix

| Command | Success | Validation | Forbidden | Cross-tenant | Conflict | Replay | Rollback | Audit | Event |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `<command>` | ✓ | ✓ | ✓ | ✓ | `N/A/✓` | `N/A/✓` | `N/A/✓` | `N/A/✓` | `N/A/✓` |

## 5. Query scenario matrix

| Query | Success | Empty | Forbidden | Cross-tenant | Stable order | Cursor | Redaction |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `<query>` | ✓ | ✓ | ✓ | ✓ | ✓ | `N/A/✓` | ✓ |

## 6. Adapter parity matrix

| Scenario | Memory | Drizzle | Equivalent code/data |
| --- | --- | --- | --- |
| Create | `<evidence>` | `<evidence>` | `<result>` |
| Duplicate | `<evidence>` | `<evidence>` | `<result>` |
| Missing | `<evidence>` | `<evidence>` | `<result>` |
| Invalid transition | `<evidence>` | `<evidence>` | `<result>` |
| Concurrency | `<evidence>` | `<evidence>` | `<result>` |
| Pagination | `<evidence>` | `<evidence>` | `<result>` |
| Replay | `<evidence>` | `<evidence>` | `<result>` |

## 7. Integrated web matrix

| User outcome | Route | Loader/query | Action/command | Required states | Test |
| --- | --- | --- | --- | --- | --- |
| `<outcome>` | `<route>` | `<query>` | `<command>` | `<states>` | `<test>` |

## 8. Closure evidence record

```yaml
module: <module-id>
feature: <feature-group>/<feature>
slice: <id>
commit: <sha>
working_tree_digest: <digest>
package_digest: <digest>
operation_registry_digest: <digest>
schema_digest: <digest-or-not-applicable>
web_digest: <digest-or-not-applicable>
gates:
  passed: <count>
  failed: 0
  skipped: 0
  not_applicable: <count>
blockers: []
migration_prerequisites: []
next_eligible_slice: <id-or-none>
signatories:
  package_owner: <name>
  application_owner: <name-or-N/A>
  architecture_owner: <name>
  security_owner: <name-or-N/A>
```

## 9. Invalid evidence

The following do not prove completion:

- a screenshot without a reproducible scenario;
- a passing package test when DB parity is required;
- a generated manifest without registry parity;
- a table existing without an operation;
- a route rendering mocked data;
- a test skipped because the prerequisite is inconvenient;
- a README statement;
- a test count without names, command, commit, and result;
- an independent frontend result against a different backend digest.
