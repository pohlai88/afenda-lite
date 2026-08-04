# `<Module>` — development roadmap

| Field | Value |
| --- | --- |
| Module | `<module-id>` |
| Package | `@afenda/<module-id>` |
| Module PRD | `<path>` |
| Slice authority | `<path>` |
| Roadmap status | `DRAFT / APPROVED / ACTIVE / CLOSED` |

## 1. Roadmap objective

Deliver `<module mission>` through independently closable feature slices while preserving package ownership, sole mutation, root-facade stability, and integrated application evidence.

## 2. Planning rules

- Roadmap order follows dependency and business-risk order.
- C1 correctness foundations precede convenience features.
- A feature is not scheduled until its PRD is approved.
- A phase is not complete from file count or test count alone.
- Database migration is a deployment prerequisite, not implicit authorization.
- Web rollout is separate from backend implementation.
- Only the exact next eligible slice is active.

## 3. Feature dependency map

| Feature | Depends on | Dependency type | Why |
| --- | --- | --- | --- |
| `<feature>` | `<feature/module>` | `internal capability / event / port / app saga` | `<reason>` |

## 4. Release trains

### Train A — minimum trusted capability

**Goal:** `<smallest useful operational outcome>`

| Feature | Required operations | Web required | Critical evidence |
| --- | --- | ---: | --- |
| `<feature>` | `<operations>` | `yes/no` | `<evidence>` |

### Train B — operational completeness

`<Scope and outcomes>`

### Train C — enterprise controls and scale

`<Scope and outcomes>`

Release trains do not override slice eligibility.

## 5. Phase matrix

| Phase | Outcome | Entry condition | Exit condition | Status |
| --- | --- | --- | --- | --- |
| 0 Admission | Accepted module and feature ownership | Governance available | PRD and decisions approved | `<status>` |
| 1 Contract | Canonical schemas, rules, and operations | Phase 0 verified | Contract/rejection tests pass | `<status>` |
| 2 Memory | Complete semantic behavior | Phase 1 verified | Memory behavior and parity baseline pass | `<status>` |
| 3 Persistence | Tenant-safe production storage | Phase 2 verified | Migration, Drizzle, parity, rollback pass | `<status>` |
| 4 Facade | Stable package consumption | Phase 3 verified | Root export and consumer checks pass | `<status>` |
| 5 Web | User workflow | Required facade verified | Capsule, route, Action, states pass | `<status>` |
| 6 Integration | Full-stack correctness | Phases 3–5 verified | E2E evidence passes | `<status>` |
| 7 Closure | Deployment and activation eligibility | Integration verified | Evidence and prerequisites complete | `<status>` |

## 6. Milestone matrix

| Milestone | Included slices | Business outcome | Evidence | Target | Status |
| --- | --- | --- | --- | --- | --- |
| `<M1>` | `<slices>` | `<outcome>` | `<gates>` | `<date/sequence>` | `<status>` |

## 7. Risk register

| Risk | Probability | Impact | Preventive control | Recovery |
| --- | --- | --- | --- | --- |
| Ownership drift | `<level>` | `<level>` | Registry and boundary checks | Re-admission |
| Schema before behavior | `<level>` | `<level>` | Memory-first slice order | Remove/rework migration |
| App bypasses package | `<level>` | `<level>` | Import and sole-mutator gates | Block release |
| Cross-tenant disclosure | `<level>` | `<level>` | Negative tests and RLS defense | Incident process |
| Audit/event partial write | `<level>` | `<level>` | Transaction failure injection | Rollback and repair |
| Documentation-only completion | `<level>` | `<level>` | Evidence-derived statuses | Reopen slice |

## 8. External prerequisites

| Prerequisite | Owner | Required by | Current state | Fallback |
| --- | --- | --- | --- | --- |
| `<approval platform>` | `<owner>` | `<slice>` | `<state>` | `<none/alternative>` |

A missing prerequisite may block closure without invalidating correctly completed implementation. It must not be hidden.

## 9. Migration plan

| Migration | Required for | Environment | Validation | Rollback | Authorized |
| --- | --- | --- | --- | --- | --- |
| `<migration>` | `<feature>` | `<env>` | `<checks>` | `<method>` | `yes/no` |

## 10. Current exact next step

| Field | Value |
| --- | --- |
| Current phase | `<phase>` |
| Last verified slice | `<id>` |
| Exact next eligible slice | `<id>` |
| Permitted activity | `<implementation/closure/blocker-resolution>` |
| Ineligible successor | `<id>` |
| Reason | `<reason>` |
