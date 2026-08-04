# `<Module>` — implementation slices

| Field | Value |
| --- | --- |
| Module | `<module-id>` |
| Package | `@afenda/<module-id>` |
| Parent PRD | `<path>` |
| Roadmap | `<path>` |
| Status | `ACTIVE` |
| Sequencing rule | Only the exact next eligible slice may modify implementation |

## 1. Slice doctrine

A slice is the smallest reviewable unit that delivers one observable capability across every required layer.

A slice must not be:

- “create files” without behavior;
- “add tables” without operations;
- “add tests” detached from a capability;
- “complete feature” without a bounded write set;
- a documentation update that claims implementation;
- a broad phase containing unrelated features.

## 2. Required slice fields

```yaml
id: <MODULE>-<phase>.<sequence>
title: <business outcome>
status: NOT_STARTED | ACTIVE | IMPLEMENTED | BLOCKED | VERIFIED
eligibility:
  predecessor_slices:
    - <id>
  required_decisions:
    - <decision-id>
  required_external_capabilities:
    - <capability-or-none>
business_outcome: <observable result>
feature_owner: <feature-group>/<feature>
operations:
  commands:
    - <id>
  queries:
    - <id>
write_set:
  package:
    - <paths>
  database:
    - <paths>
  web:
    - <paths>
  docs:
    - <paths>
forbidden_write_set:
  - <paths>
acceptance:
  - <binary criterion>
evidence:
  - <command or artifact>
closure:
  next_slice: <id-or-phase-exit>
```

## 3. Standard phase sequence

| Phase | Purpose | Exit condition |
| --- | --- | --- |
| 0 — Admission | Freeze ownership, vocabulary, topology, and decisions | No unresolved ownership or boundary decision |
| 1 — Contract | Public types, schemas, rules, operation definitions | Contract and rejection tests pass |
| 2 — Memory behavior | Store contract and deterministic memory behavior | Full semantic behavior passes without production DB |
| 3 — Persistence | DDL, migration, Drizzle adapter, parity | Memory/Drizzle, tenancy, and rollback evidence pass |
| 4 — Package facade | Root facade, composition, manifest projections | Consumer compile and export boundaries pass |
| 5 — Web workflow | Mirrored capsule, loaders, Actions, routes, states | Web structural and interaction tests pass |
| 6 — Integration | Full-stack workflows, audit, outbox, conflicts, replay | Integrated evidence passes on one digest |
| 7 — Closure | Documentation, evidence, migration prerequisites, activation eligibility | No blocked or skipped required item |

A feature may omit a phase only through a recorded `NOT_APPLICABLE` trigger.

## 4. Slice template

### `<ID>` — `<Title>`

| Field | Value |
| --- | --- |
| Status | `NOT_STARTED` |
| Feature | `<group>/<feature>` |
| Business outcome | `<outcome>` |
| Predecessor | `<slice>` |
| Next eligible | `<slice>` |

#### Scope

**Commands**

- `<operation>`

**Queries**

- `<operation>`

**Behavior**

- `<rule>`

#### Write set

```text
packages/erp/<module>/...
packages/data-plane/db/...
apps/web/...
docs/...
```

Only list files or bounded directories the slice is authorized to modify.

#### Forbidden scope

- unrelated features;
- peer package implementation;
- application DB mutation;
- public compatibility shims;
- future-slice files;
- opportunistic refactors not required for acceptance.

#### Acceptance criteria

- [ ] `<binary outcome>`
- [ ] `<negative outcome>`
- [ ] `<boundary outcome>`
- [ ] `<evidence outcome>`

#### Required evidence

```bash
pnpm --filter @afenda/<module> lint
pnpm --filter @afenda/<module> typecheck
pnpm --filter @afenda/<module> test
# plus applicable DB, web, governance, and integrated gates
```

#### Closure record

| Item | Result |
| --- | --- |
| Commit/digest | `<value>` |
| Tests | `<pass/fail counts>` |
| Skips | `<zero or justified NOT_APPLICABLE>` |
| Blockers | `<none or named blocker>` |
| Write-set delta | `<confirmed/violation>` |
| Next slice eligibility | `<eligible/not eligible>` |

## 5. Eligibility rules

A successor slice is ineligible when:

- its predecessor is not `VERIFIED`;
- a required decision is open;
- the package facade needed by the successor is absent;
- required migration evidence is missing;
- an external approval or capability is absent;
- closure evidence disagrees with disk;
- the previous slice exceeded its write set without accepted correction.

Implementation may be complete while closure remains blocked. In that case, only closure evidence or blocker resolution is eligible work.

## 6. Phase exit review

At each phase exit record:

1. Planned slices.
2. Verified slices.
3. Blocked slices.
4. Exact pass/fail/skip counts.
5. Current module, feature, and web statuses.
6. Remaining product requirements.
7. Migration prerequisites.
8. Exact next eligible slice.

Do not start the next phase because the code “looks ready.”
