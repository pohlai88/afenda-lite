# HR-AUD-01 — Cluster conflicts (architecture vs defects)

| Field | Value |
|---|---|
| Mission | **HR-AUD-01** |
| Purpose | Separate cluster architecture decisions from implementation defects |

Related: [`01-domain-findings.md`](01-domain-findings.md) · HR-AUD-00 [`03-cross-cutting-conflicts.md`](../03-cross-cutting-conflicts.md)

---

## Architecture decisions (require explicit approval)

### OPEN-DECISION-A1 — Candidate consent persistence owner

| Aspect | Detail |
|---|---|
| **Conflict** | Zod + domain type require consent metadata; `hr_candidate` DDL has no columns |
| **Options** | A) Add `hr_candidate` consent/retention columns + migration B) Store consent on application only C) Platform privacy service holds consent refs |
| **Canonical recommendation** | A for HR-ENT-07 alignment — candidate is PII root |
| **Blocking** | Recruitment typecheck, all recruitment tests, HR-ENT-07 |
| **Owner mission** | HR-COREORG-CANDIDATE-CONSENT-ALIGN |

### OPEN-DECISION-A2 — Hire orchestration shape

| Aspect | Detail |
|---|---|
| **Conflict** | `acceptOffer` returns handoff only; no person/worker/employee chain |
| **Options** | A) New orchestration command `hireFromOfferAcceptance` B) Documented multi-command saga C) Workflow engine owns saga |
| **Canonical recommendation** | B short-term (document sequence); A for enterprise production bar |
| **Blocking** | HR-ENT-12 product hire flow |
| **Owner mission** | HR-COREORG-HIRE-ORCHESTRATION |

### OPEN-DECISION-A3 — Store vs folder layout (inherits HR-AUD-00 store compose note)

| Aspect | Detail |
|---|---|
| **Conflict** | `HumanResourcesCoreStore` owns organization persistence; commands in `src/organization/` |
| **Canonical recommendation** | Document-only alignment (HR-COREORG-STRUCTURE-ALIGN) unless refactor mission authorized |
| **Blocking** | None — navigation cost only |

Consumes **OPEN-DECISION-04** (org dimensions) and **OPEN-DECISION-01** (effective-truth scope) from HR-AUD-00 without re-litigating.

---

## Implementation defects (disk-confirmed)

| ID | Defect | Severity | Owner mission |
|---|---|---|---|
| HR-COREORG-P0-001 | Candidate consent triple drift blocks typecheck + recruitment tests | P0 | HR-COREORG-CANDIDATE-CONSENT-ALIGN |
| HR-COREORG-P0-002 | Emission registry 6/71 cluster commands | P0 | HR-XCUT-EMISSION-REGISTRY |
| HR-COREORG-P1-002 | `REHIRE_REQUIRES_ENDED_EMPLOYMENT` never emitted | P1 | HR-COREORG-REHIRE-SEMANTICS |
| HR-COREORG-P2-002 | Lifecycle transfer timestamp Memory/Drizzle mismatch | P2→**closed** | HR-COREORG-LIFECYCLE-SERIALIZE-PARITY (**CLOSED** Slice 1.2) |
| HR-COREORG-P1-004 | enterprise.md HR-ENT-04 stale vs org-context disk | P1 | Scratch doc refresh |

---

## Missing database invariants (command-enforced only)

| Table | Missing DDL | Command/adapter enforcement | Risk |
|---|---|---|---|
| `hr_work_assignment` | No `starts_on <= ends_on` check | `assertValidDateRange` in adapters | Bad ranges if bypassing package |
| `hr_employment_contract` | No overlap exclusion constraint | Adapter overlap checks (verify per adapter) | Historical overlap under concurrency |
| `hr_reporting_line` | Open-primary unique only | Adapter + unique partial index | Overlap of dated ranges possible |
| `hr_person` | No FK from employee to person | Worker FK to person only | Orphan person records acceptable by design |
| `hr_candidate` | Consent columns absent vs type | Zod at command boundary only | Persistence cannot store consent |

Positive DDL evidence: `hr_worker_org_person_uidx`, `hr_worker_org_employee_uidx`, `hr_employment_org_employee_open_uidx`, `hr_work_assignment_org_employment_open_uidx`, `hr_candidate_application` open-application unique, offer accept idempotency unique.

---

## Missing tests

| Gap | Evidence |
|---|---|
| Rehire after termination | No test references `REHIRE_REQUIRES_ENDED_EMPLOYMENT` |
| Candidate-to-worker conversion | No integration test from offer accept to worker |
| Recruitment happy path | Blocked by consent fixture drift (9 unit + 4 parity failures) |
| Future-dated assignment | Core tests cover asOf; limited future-dated create scenarios |
| Retroactive transfer | Transfer tests use effectiveOn; limited backdating edge cases |
| Duplicate person prevention | Worker unique on personId; no duplicate legal-name test |

Existing coverage: overlap reporting lines (organization parity), position occupancy (dedicated tests), workforce foundation parity, core parity, worker idempotency.
