# HR-AUD-01 — Workforce foundation cluster scorecard

| Field | Value |
|---|---|
| Mission | **HR-AUD-01** |
| Cluster | A — workforce-foundation, core, organization, lifecycle, recruitment |
| Audit date | 2026-07-24 |
| Type | Audit only — no product edits |
| Evidence pack | [`cluster-a/`](cluster-a/) |
| Baseline | HR-AUD-00 (`00–04`) |

## Executive verdict

Cluster A has a **strong person/worker/organization kernel** with Memory/Drizzle parity on foundation, core, and organization slices. **Recruitment is blocked** by candidate consent schema/DDL/adapter drift (typecheck failure, 13/14 failing cluster tests in recruitment + one lifecycle parity case). **Lifecycle and core employment** are functionally deep but under-registered for domain events (~8.5% emission coverage). **Hire-from-offer** is a handoff only — no automated candidate→worker conversion.

---

## Domain scorecard

Scale: **Pass** · **Partial** · **Gap** · **N/A** — Overall = weakest blocking axis.

| Domain | Contract | Store+Adapters | DB invariants | Authz/Audit | Tests | Overall |
|---|---|---|---|---|---|---|
| person | Pass | Pass | Pass | Partial (audit; no outbox update) | Pass | **Pass** |
| worker | Pass | Pass | Pass | Partial (create/change in registry) | Pass | **Pass** |
| classification | N/A | N/A | Pass (checks) | N/A | Pass | **N/A** |
| employee | Pass | Pass | Pass | Partial (create only in registry) | Pass | **Pass** |
| employment | Pass | Pass | Partial (open unique; no overlap DDL) | Gap (no registry) | Pass | **Partial** |
| employment contract | Pass | Pass | Partial | Gap | Pass | **Partial** |
| assignment | Pass | Pass | Partial (open unique; no date check) | Gap | Pass | **Partial** |
| organization context | Pass | Pass (composed) | N/A | N/A | Pass | **Partial** |
| department | Pass | Pass | Pass | Gap | Pass | **Pass** |
| job | Pass | Pass | Pass | Gap | Pass | **Pass** |
| position | Pass | Pass | Pass | Gap | Pass | **Pass** |
| reporting line | Pass | Pass | Partial (open primary unique) | Gap | Pass | **Pass** |
| onboarding | Pass | Pass | Partial | Gap | Pass | **Partial** |
| probation | Pass | Pass | Partial | Gap | Pass | **Partial** |
| confirmation | Pass | Pass | Partial | Gap | Pass | **Partial** |
| transfer | Pass | Pass (atomic TX) | Partial | Gap | Partial (parity timestamp) | **Partial** |
| termination | Pass | Pass | Partial | Gap | Pass | **Partial** |
| offboarding | Pass | Pass | Partial | Gap | Pass | **Partial** |
| requisition | Pass | Pass | Pass | Gap | Gap (blocked) | **Gap** |
| candidate | Partial (consent) | Gap (mapper) | Gap (consent cols) | Gap | Gap | **Gap** |
| application | Pass | Pass | Pass (open unique) | Gap | Gap (blocked) | **Gap** |
| interview | Pass | Pass | Pass | Partial (eval permission) | Gap (blocked) | **Gap** |
| offer | Pass | Pass (atomic accept) | Pass | Gap | Gap (blocked) | **Gap** |

**Summary:** Pass 8 · Partial 10 · Gap 4 · N/A 1

---

## HR-ENT-* coverage

| ID | Requirement | Cluster A status | Evidence |
|---|---|---|---|
| HR-ENT-03 | Person/worker foundation | **Pass** | `0008` tables; foundation parity 2/2; worker idempotency tests |
| HR-ENT-04 | Deterministic historical org context | **Partial** | Query resolves dimensions when snapshot present; fails closed on null snapshot; enterprise.md stale |
| HR-ENT-05 | Package-wide effective truth | **Partial** | 7/28 cluster tables in matrix; `hr_person` absent |
| HR-ENT-06 | Contextual authorization | **Partial** | Manifest guards only; interview eval test blocked |
| HR-ENT-07 | Privacy / retention | **Gap** | Candidate consent in type/Zod; not in DDL or adapters |
| HR-ENT-12 | HR product surfaces | **Partial** | Shell lists employees/candidates; no mutation Actions |
| HR-ENT-15 | Structural ownership | **Pass** | Canonical domain paths; documented store/folder split |
| HR-ENT-16 | Domain depth | **Mixed** | Org/core strong; recruitment blocked; lifecycle deep but unverified parity edge |
| HR-ENT-18 | Package quality gates | **Fail (cluster subset)** | Typecheck fail; 14 cluster tests fail |

Consumes HR-AUD-00 findings: **HR-XCUT-P0-003** (emission), **OPEN-DECISION-04** (org dimensions), **OPEN-DECISION-01** (effective-truth scope).

---

## Canonical-definition conflicts

| Concept | Conflict | Canonical owner (HR-AUD-00) | Cluster A note |
|---|---|---|---|
| Candidate shape | Type/Zod vs DDL vs adapter | `src/schemas/recruitment.ts` + `@afenda/db` | **P0 defect** — triple drift |
| Organization dimensions | enterprise.md null costCentre vs disk | `OrganizationDimensionDirectoryPort` | Disk resolves when snapshot present |
| Store layout | `organization/` folder vs `HumanResourcesCoreStore` | `src/store/index.ts` | Document-only fix acceptable |
| Assignment schema home | `schemas/organization.ts` vs `core/assignment.ts` | Domain schema + core command | Normalize in STRUCTURE-ALIGN |
| Rehire semantics | Error code vs generic CONFLICT | `src/error-codes.ts` | Emit semantic code in createEmployment |
| Offer handoff | Expected hire chain vs handoff DTO | Recruitment README (missing) | OPEN-DECISION-A2 |

Full matrix: [`02-canonical-definitions.tsv`](../02-canonical-definitions.tsv)

---

## Memory / Drizzle parity findings

| Slice | Unit | Parity | Finding |
|---|---|---|---|
| workforce-foundation | Pass | Pass (2/2) | None |
| core | Pass | Pass | None |
| organization | Pass | Pass | None |
| position-occupancy | Pass | Pass | None |
| lifecycle | Pass | **Partial** | Transfer `createdAt`/`updatedAt` type mismatch (P2-002) |
| recruitment | **Fail** | **Fail** | Candidate mapper/typecheck (P0-001) |

Compile-time coverage guards (`Missing*HumanResourcesMethods`) remain **green** at typecheck for non-recruitment slices; recruitment Drizzle slice fails on `Candidate` mapping.

---

## Missing database invariants

See [`cluster-a/03-cluster-conflicts.md`](cluster-a/03-cluster-conflicts.md). Highlights:

- `hr_candidate` — consent/retention columns missing vs domain type
- `hr_work_assignment` — no date-range check constraint
- `hr_employment_contract` — no overlap exclusion at DDL
- Positive: worker↔person/employee uniques, open employment/assignment uniques, application/offer idempotency uniques

---

## Missing tests

| Priority | Gap |
|---|---|
| P0 | Recruitment suite (blocked by candidate create) |
| P1 | Rehire after termination with semantic error |
| P1 | Offer accept → person → employee → employment → worker chain |
| P2 | Retroactive transfer edge cases |
| P2 | Duplicate person legal-name policy (if required by product) |

---

## Ordered repair candidates

1. HR-COREORG-CANDIDATE-CONSENT-ALIGN (**CLOSED** Slice 0.1)  
2. HR-COREORG-LIFECYCLE-SERIALIZE-PARITY (**CLOSED** Slice 1.2)  
3. HR-XCUT-EMISSION-REGISTRY (cluster A tranche)  
4. HR-ENT-02-ORG-CONTEXT  
5. HR-COREORG-REHIRE-SEMANTICS  
6. HR-COREORG-HIRE-ORCHESTRATION  
7. HR-ENT-03-EFFECTIVE-TRUTH (cluster A tranche)  
8. HR-COREORG-STRUCTURE-ALIGN  
9. HR-COREORG-DB-INVARIANTS  
10. HR-ENT-07-PRODUCT-OPS (cluster A Actions)

Detail: [`cluster-a/04-repair-readiness.md`](cluster-a/04-repair-readiness.md)

---

## Residual dependencies

| Downstream | Needs from Cluster A |
|---|---|
| **HR-AUD-02** (time/leave) | Org-context, employment/assignment asOf |
| **HR-AUD-03** (comp/compliance) | Employee/employment identity |
| **Platform events/search** | Emission registry expansion |
| **apps/web hire flow** | Consent-aligned candidate + hire orchestration |
| **@afenda/payroll** | Worker + employment effective ranges |

---

## Verification evidence (2026-07-24)

```text
pnpm --filter @afenda/human-resources typecheck
→ Exit 2 (recruitment.ts Candidate consent field mismatch)

pnpm --filter @afenda/human-resources test -- [cluster globs]
→ 13 files, 121 passed, 14 failed, 2 skipped
→ Failures: recruitment.test.ts (9), recruitment.parity.test.ts (4),
           lifecycle.parity.test.ts (1 transfer timestamp)
```

---

## Finding index (Cluster A)

| ID | Severity | Title |
|---|---|---|
| HR-COREORG-P0-001 | P0 | Candidate consent drift blocks recruitment |
| HR-COREORG-P0-002 | P0 | Emission registry 6/71 cluster commands |
| HR-COREORG-P1-001 | P1 | Candidate type vs DDL mismatch |
| HR-COREORG-P1-002 | P1 | Rehire error code never emitted |
| HR-COREORG-P1-003 | P1 | Effective-truth gaps (person, lifecycle, recruitment) |
| HR-COREORG-P1-004 | P1 | enterprise.md HR-ENT-04 stale |
| HR-COREORG-P1-005 | P1 | No candidate→worker conversion on offer accept |
| HR-COREORG-P2-001 | P2 | Organization folder vs core store split |
| HR-COREORG-P2-002 | P2→**closed** | Lifecycle transfer timestamp parity (**CLOSED** Slice 1.2) |

Full lens write-up: [`cluster-a/01-domain-findings.md`](cluster-a/01-domain-findings.md)
