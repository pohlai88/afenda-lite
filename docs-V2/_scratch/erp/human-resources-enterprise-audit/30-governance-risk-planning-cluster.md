# HR-AUD-03 — Governance, Risk and Planning Cluster

| Field | Value |
|---|---|
| Mission | **HR-AUD-03** |
| Type | Domain-cluster audit only |
| Package | `@afenda/human-resources` |
| Audit date | 2026-07-24 |
| Prerequisite | [`00-authority-map.md`](00-authority-map.md) through [`04-domain-cluster-audit-contract.md`](04-domain-cluster-audit-contract.md) |
| Product edits | **None** (this mission) |
| Findings prefix | `HR-GOV-{P0|P1|P2|P3}-###` |

## Mission identity and scope

**Objective:** Deep audit of governance, risk, and workforce-planning domains named in CURSOR PROMPT 2C.

**In scope (Prompt 2C):**

- `src/compliance/**`
- `src/employee-relations/**`
- `src/talent/**` and `src/schemas/talent/**`
- `src/workforce-planning/**`
- `src/integrations/**`
- `src/identity-resolver.ts`, `src/privacy.ts`, `src/sensitive-operation-policies.ts`
- Matching schemas, stores, Memory/Drizzle adapters, DB tables, tests, apps/web composition ports

**Boundary note:** HR-AUD-00 Cluster C also listed `compensation-benefits`, `performance`, and `learning`. This mission follows **Prompt 2C** and excludes those domains except where cross-cut ports apply. Compensation/performance/learning depth belongs to HR-AUD-02.

**Cross-cut consumption (do not re-litigate):** Reuse open baseline IDs — `HR-XCUT-P0-001`, `HR-XCUT-P0-003`, `HR-XCUT-P0-004`, `OPEN-DECISION-02`, `OPEN-DECISION-03`, `OPEN-DECISION-01`.

---

## Executive verdict

The governance/risk/planning cluster has **strong package-layer contracts** (Zod schemas, store slices, Memory/Drizzle adapters, state-machine guards, vault reference validation, headcount reservation DB uniqueness). Enterprise blockers concentrate on **authorization inconsistency** (case list vs get), **missing product composition** (no Server Actions), **privacy port unwiring** (baseline P0-004), **incomplete mutation emission registry** for cluster commands, and **workforce variance semantics** that do not compare to actual employment facts.

Package domain depth exceeds product surface depth for every capability in this cluster.

---

## Five-axis domain scorecard

Axes scored **Pass** / **Partial** / **Fail** with one-line evidence.

| Domain | Contract completeness | Correctness & invariants | Authorization & privacy | Persistence parity | Evidence & composition |
|---|---|---|---|---|---|
| **Compliance** | **Pass** — schema → command → store → adapter → 4 DB tables aligned | **Partial** — expiry is command-driven; no scheduled producer in package | **Partial** — document identifier masking + sensitive ops for employee-document/work-eligibility; manifest permission only on many commands | **Pass** — unit + parity suites; vault adapter tested | **Partial** — no apps/web Actions; identity + documentReference ports wired |
| **Employee relations** | **Pass** — full case/action/appeal/event stack + 4 DB tables | **Pass** — status guards + appeal/action machines tested | **Fail** — `getEmployeeCaseById` uses `requireCaseAccess` + projection; **list queries do not** | **Pass** — unit + parity; Memory/Drizzle share `hasCaseAccess` helper | **Partial** — no product Actions; identity resolver required on get |
| **Talent** | **Pass** — `src/talent/*` orchestration + `src/schemas/talent/*` Zod-only split is intentional | **Pass** — succession readiness staleness enforced in adapters (`assertReadinessNotStale`) | **Partial** — sensitive prefixes for profile/pool/career/succession; **competency.* not in policy register** | **Pass** — compile-time store coverage; parity suite only | **Fail** — no dedicated unit tests; no apps/web Actions |
| **Workforce planning** | **Pass** — plan/line/reservation/availability chain complete | **Partial** — reservation math + DB unique active-per-requisition; **variance ≠ actual headcount** | **Partial** — manifest permission only; headcount ops absent from sensitive policy register | **Pass** — unit + parity structure; one unit test failing | **Partial** — no apps/web Actions |
| **Integration / governance** | **Pass** — identity resolver port + platform-facts projection + sensitive policy table | **Partial** — platform-facts maps compliance notification templates; event constants partially outside `@afenda/events` registry | **Fail** — privacy port defined but unwired ([`HR-XCUT-P0-004`](01-cross-cutting-baseline.md)); auth layering open ([`OPEN-DECISION-02`](03-cross-cutting-conflicts.md)) | **N/A** — no dedicated integration store | **Partial** — `human-resources-command-options.ts` wires identity + vault; **omits privacy**; ops retry only in web |

---

## HR-ENT-* coverage (cluster-relevant)

| ID | Requirement | Cluster evidence | Status |
|---|---|---|---|
| HR-ENT-06 | Contextual and field authorization | Case get uses ACL + projection; list bypasses; talent/competency/headcount use manifest guards; sensitive prefix gaps | **Partial** |
| HR-ENT-07 | Privacy, retention, legal hold | Retention taxonomy in `privacy.ts`; compliance identifier fingerprinting; **no DSAR port consumer** (HR-XCUT-P0-004) | **Partial** |
| HR-ENT-09 | Document capability | Vault reference adapter validates URI shape/kinds; rejects `data:`; HR does not own storage | **Partial** (reference-only, as designed) |
| HR-ENT-10 | Integration and bulk data | `platform-facts.ts` projects workflow/notification facts; no bulk import/export | **Fail** (out of cluster scope to implement; observed absent) |
| HR-ENT-11 | Reporting/read projections | Compliance summary + WFP variance queries exist; variance not employment-backed | **Partial** |
| HR-ENT-12 | HR product surfaces | Permissions seeded in `session-permission.ts`; **zero** `apps/web/app/actions` for cluster domains | **Fail** |
| HR-ENT-16 | Domain depth | Compliance/ER/WFP have unit tests; talent parity-only; domain logic substantially ahead of product UI | **Partial** |
| HR-ENT-05 | Effective truth | `hr_work_eligibility`, `hr_document_requirement`, `hr_competency*`, `hr_headcount_plan*` in matrix; **case/talent profile tables excluded** (OPEN-DECISION-01) | **Partial** |

---

## Aggregate matrix

| Aggregate | DB tables | Command/query surface | Store slice | Adapter parity | Effective-truth row |
|---|---|---|---|---|---|
| Document requirement | `hr_document_requirement` | create/update/publish/retire | `store/compliance.ts` | Memory + Drizzle | Yes |
| Employee document | `hr_employee_document` | register/verify/reject/expire/list | same | same | No (operational) |
| Work eligibility | `hr_work_eligibility` | record/verify/suspend/renew/close | same | same | Yes |
| Policy acknowledgement | `hr_policy_acknowledgement` | issue/ack/revoke/supersede | same | same | Yes |
| Employee case | `hr_employee_case` | open…reopen + queries | `store/employee-relations.ts` | same | No |
| Case event/action/appeal | `hr_employee_case_event`, `_action`, `_appeal` | events, evidence, action, appeal | same | same | No |
| Competency | `hr_competency`, `hr_job_competency`, `hr_competency_assessment` | CRUD + assess | `store/talent.ts` | same | Partial (assessment yes) |
| Talent profile/pool | `hr_talent_profile`, `hr_talent_pool`, `hr_talent_pool_member` | profile/pool/member cmds | same | same | No |
| Career / succession | `hr_career_plan`, `hr_career_plan_action`, `hr_succession_plan`, `hr_succession_candidate` | career + succession cmds | same | same | No |
| Headcount plan | `hr_headcount_plan`, `hr_headcount_plan_line`, `hr_headcount_reservation` | plan workflow + reserve/release/consume | `store/workforce-planning.ts` | same | Yes (plan + line) |
| Platform facts | (event plane) | `projectHumanResourcesPlatformFacts` | n/a | n/a | n/a |

---

## Special-risk probe summary

| Risk | Verdict | Finding |
|---|---|---|
| Document reference ownership | **Pass** | Vault adapter enforces org/kind/id URI; kinds from `ports.ts`; case evidence allows `case_evidence` |
| Evidence immutability | **Partial** | Events append-only; redact creates audit trail on evidence events — no silent delete |
| Work-eligibility expiry | **Partial** | Status transitions + risk queries; expiry via explicit commands, not scheduler |
| Privacy field projection | **Partial** | Compliance list masking; case get projection — list queries skip projection |
| Subject-aware authorization | **Partial** | Identity resolver on case get + some compliance paths; not on case lists |
| Case access leakage | **Fail** | HR-GOV-P0-001 |
| Action/appeal state machines | **Pass** | Guards in `employee-relations-guards.ts`; covered by unit/parity tests |
| Competency schema duplication | **Pass** (intentional) | Commands in `src/talent/`; Zod in `src/schemas/talent/`; statuses in `shared/talent-status.ts` |
| Succession effective dating | **Pass** | Readiness staleness at approve/assess in adapters |
| Headcount double reservation | **Pass** | Command pre-check + `hr_headcount_reservation_org_requisition_active_uidx` |
| Planning vs actual workforce | **Fail** | HR-GOV-P1-002 |
| Integration sensitive fields | **Partial** | Platform facts use entity payload schema; templates generic — HR-GOV-P2-003 |

---

## Findings by domain

### Cross-reference — baseline (consume, do not duplicate)

| ID | Title | Cluster impact |
|---|---|---|
| HR-XCUT-P0-001 | Parallel authorization entry points | Case ACL vs contextual policies vs manifest guards |
| HR-XCUT-P0-003 | Mutation emission registry incomplete | Cluster ER/talent/WFP commands largely unregistered |
| HR-XCUT-P0-004 | Privacy port unwired | No DSAR/export in compliance/ER lifecycle |
| OPEN-DECISION-02 | Authorization layering model | Blocks HR-ENT-06 closure |
| OPEN-DECISION-03 | Privacy / DSAR execution owner | Blocks HR-ENT-07 closure |

---

### Compliance

#### HR-GOV-P1-001

| Field | Value |
|---|---|
| **Paths/symbols** | `src/compliance/work-eligibility.ts` · `src/compliance/employee-document.ts` · `src/mutation-emission-registry.ts` |
| **Conflicting authorities** | HR-ENT-09/14 imply proactive expiry signals; registry lists document/eligibility commands but **no scheduled nearing-expiry producer** in compliance commands |
| **Observed disk** | `markEmployeeDocumentExpired` is explicit command; `HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_NEARING_EXPIRY_EVENT` referenced in registry for register command only; platform-facts maps template for string constant event |
| **Expected contract** | Either documented batch/connector produces nearing-expiry events, or enterprise.md scopes manual/command-only expiry |
| **Consequence** | Compliance dashboards may show stale “active” documents until manual mark-expired |
| **Recommendation** | Named platform job or HR command batch with audit trail; align registry + `@afenda/events` |
| **Decision** | None |
| **Repair mission** | HR-ENT-COMPLIANCE-EXPIRY-OPS |
| **Verification** | Integration test emits nearing-expiry event when `expiresOn` within threshold |

#### HR-GOV-P2-001

| Field | Value |
|---|---|
| **Paths/symbols** | `src/compliance/vault-document-reference-adapter.ts` · `apps/web/lib/erp/human-resources-document-reference-port.ts` |
| **Conflicting authorities** | HR-ENT-09 platform document boundary |
| **Observed disk** | Reference validation only; adapter wired at composition root |
| **Expected contract** | HR stores references; platform owns blob ACL/retention |
| **Consequence** | Correct reference-only posture — **Pass** with platform dependency |
| **Recommendation** | Document platform owner in repair mission for storage/scanning |
| **Decision** | None |
| **Repair mission** | HR-ENT-09-PLATFORM-DOCUMENT-BOUNDARY |
| **Verification** | Contract test: invalid URI rejected; valid vault URI persisted |

---

### Employee relations

#### HR-GOV-P0-001

| Field | Value |
|---|---|
| **Paths/symbols** | `src/employee-relations/employee-case.ts#listEmployeeCases` · `#listCasesAssignedToActor` · `#listOpenEmployeeRelationsCases` · `src/employee-relations/case-access-control.ts#requireCaseAccess` · `src/adapters/{memory,drizzle}/employee-relations.ts#hasCaseAccess` |
| **Conflicting authorities** | HR-ENT-06 · OPEN-DECISION-02 · case-access-control investigator/subject/manager matrix |
| **Observed disk** | `getEmployeeCaseById` calls `requireCaseAccess` + `applyCaseFieldProjection`; list queries call store directly with `hasCaseAccess(case, actorUserId)` matching **owner or participant actorUserId only** — no investigator permission path, no subject/manager read paths, **no field projection** |
| **Expected contract** | All case reads enforce same ACL + field projection as get-by-id |
| **Consequence** | Investigators with `employee-case.investigate` may be denied list visibility while get works; conversely participants may see **full case records** in list pages without projection — sensitive field leakage |
| **Recommendation** | Route all case list/history queries through `requireCaseAccess` + projection per row, or store-level equivalent of full ACL |
| **Decision** | None |
| **Repair mission** | HR-ENT-ER-CASE-LIST-ACL |
| **Verification** | Unit test: subject list returns participant fields only; investigator list requires assignment mapping |

---

### Talent

#### HR-GOV-P1-003

| Field | Value |
|---|---|
| **Paths/symbols** | `src/sensitive-operation-policies.ts` · `src/talent/competency.ts` · `src/module-ids.ts` (`human-resources.competency.*`) |
| **Conflicting authorities** | HR-ENT-06 sensitive register claims complete classification (`contextual-authorization-privacy.test.ts`) |
| **Observed disk** | Competency commands/queries **not** covered by any `operationPrefixes` rule; rely on manifest permission only |
| **Expected contract** | Competency assessments classified (likely `succession` or new resource type) |
| **Consequence** | New competency operations inherit broad module permission without subject/contextual gate |
| **Recommendation** | Add competency prefix family to sensitive policies + enforce in `runTalentCommand` |
| **Decision** | None |
| **Repair mission** | HR-ENT-TALENT-SENSITIVE-POLICY |
| **Verification** | Coverage test includes competency ops; unauthorized subject denied |

#### HR-GOV-P2-002

| Field | Value |
|---|---|
| **Paths/symbols** | `__tests__/human-resources.talent.parity.test.ts` (exists) · no `human-resources.talent.test.ts` |
| **Conflicting authorities** | HR-ENT-18 package quality parity with compliance/ER/WFP unit depth |
| **Observed disk** | Talent has **parity tests only** (no dedicated unit file) |
| **Expected contract** | Unit tests for guards/state transitions before DB parity |
| **Consequence** | Faster parity feedback loop missing; guard regressions harder to localize |
| **Recommendation** | Add unit suite mirroring WFP/compliance pattern |
| **Decision** | None |
| **Repair mission** | HR-ENT-TALENT-UNIT-TESTS |
| **Verification** | `pnpm --filter @afenda/human-resources test -- human-resources.talent.test` green |

#### HR-GOV-P3-001

| Field | Value |
|---|---|
| **Paths/symbols** | `src/talent/**` vs `src/schemas/talent/**` · `src/shared/talent-status.ts` |
| **Conflicting authorities** | None — intentional architecture |
| **Observed disk** | Commands import Zod from `schemas/talent/`; status enums single-owned in `shared/talent-status.ts` |
| **Expected contract** | No duplicate business logic between folders |
| **Consequence** | **Pass** — not harmful duplication |
| **Recommendation** | Retain split; document in package README |
| **Decision** | None |
| **Repair mission** | n/a |
| **Verification** | Grep shows schemas contain Zod only |

---

### Workforce planning

#### HR-GOV-P1-002

| Field | Value |
|---|---|
| **Paths/symbols** | `src/workforce-planning/headcount-plan.ts#getWorkforcePlanVariance` · `src/adapters/memory/workforce-planning.ts#getWorkforcePlanVariance` |
| **Conflicting authorities** | HR-ENT-11 reporting/read projections; enterprise workforce planning semantics |
| **Observed disk** | Variance computed as **planned minus consumed reservations** per line (`computeLineAvailability` consumed bucket) — does not query employment/assignment actuals |
| **Expected contract** | “Plan vs actual” compares approved plan to live workforce facts (assignments/employments) or document as “plan vs filled requisitions” |
| **Consequence** | Operators misread variance as headcount truth; staffing gaps hidden |
| **Recommendation** | Rename query contract or add employment-backed actuals port |
| **Decision** | **OPEN-DECISION** — variance definition: reservation-consumed vs employment actual |
| **Repair mission** | HR-ENT-WFP-VARIANCE-ACTUALS |
| **Verification** | Test with known employment count vs plan |

#### HR-GOV-P2-004 — **CLOSED** (Slice 1.3 · 2026-07-24)

| Field | Value |
|---|---|
| **Paths/symbols** | `__tests__/human-resources.workforce-planning.test.ts` · `consumes reservation on offer acceptance` · consume reject paths · Memory/Drizzle `consumeHeadcountReservation` / offer `acceptOffer` handoff |
| **Conflicting authorities** | HR-ENT-18 |
| **Observed disk** | Offer accept consumes active requisition reservation; candidate consent fixture succeeds; duplicate/released/cross-tenant consume rejected with stable `human_resources.*` codes |
| **Expected contract** | Recruitment handoff consumes headcount reservation |
| **Consequence** | — (closed) |
| **Recommendation** | — |
| **Decision** | None |
| **Repair mission** | HR-ENT-WFP-RESERVATION-CONSUME — **CLOSED** |
| **Verification** | Named test + reject-path unit tests green; typecheck exit 0 |

---

### Integration and governance

#### HR-GOV-P0-002

| Field | Value |
|---|---|
| **Paths/symbols** | `src/mutation-emission-registry.ts` · cluster command IDs in `module-ids.ts` |
| **Conflicting authorities** | HR-XCUT-P0-003 |
| **Observed disk** | Registry has **90** command rows; includes compliance document/eligibility/policy-ack commands; **zero** rows for `employee-case.*`, `headcount.*`, `competency.*`, `talent-*`, `succession-*`, `career-*` |
| **Expected contract** | All mutation commands mapped audit_only or domain_event |
| **Consequence** | Correlation-integrity CI does not cover cluster mutations; event parity unenforceable |
| **Recommendation** | Extend registry in HR-XCUT-EMISSION-REGISTRY |
| **Decision** | None (extends baseline defect) |
| **Repair mission** | HR-XCUT-EMISSION-REGISTRY |
| **Verification** | Registry count matches command inventory; correlation test includes sample cluster cmds |

#### HR-GOV-P0-003

| Field | Value |
|---|---|
| **Paths/symbols** | `apps/web/lib/erp/human-resources-command-options.ts` · `src/privacy.ts` · HR-XCUT-P0-004 |
| **Conflicting authorities** | HR-ENT-07 · OPEN-DECISION-03 |
| **Observed disk** | Composition root wires authorization, identity, documentReference — **no `privacy` port**; `requirePrivacyPort` never called from cluster commands |
| **Expected contract** | Platform privacy adapter at composition root |
| **Consequence** | Retention/DSAR/legal-hold lifecycle non-functional for ER/compliance data |
| **Recommendation** | See HR-ENT-04-AUTH-PRIVACY |
| **Decision** | OPEN-DECISION-03 |
| **Repair mission** | HR-ENT-04-AUTH-PRIVACY |
| **Verification** | Export/anonymize integration test with tenant isolation |

#### HR-GOV-P1-004

| Field | Value |
|---|---|
| **Paths/symbols** | `apps/web/app/actions/hr-*.ts` · `apps/web/modules/identity/domain/session-permission.ts` |
| **Conflicting authorities** | HR-ENT-12 |
| **Observed disk** | Permissions exist for case/headcount/compliance/talent; **no** Server Actions import cluster commands (only `hr-time`, `hr-learning`, `hr-operations`, `hr-self-service` partial) |
| **Expected contract** | Product Actions for governed capabilities or explicit “API-only” lifecycle |
| **Consequence** | Permission catalog and domain logic drift; authz untested at app boundary |
| **Recommendation** | HR product slices per domain (after AUD completes) |
| **Decision** | None |
| **Repair mission** | HR-ENT-12-GOV-PRODUCT-SLICE |
| **Verification** | Action tests for one command per aggregate |

#### HR-GOV-P2-003

| Field | Value |
|---|---|
| **Paths/symbols** | `src/integrations/platform-facts.ts` · `EMPLOYEE_DOCUMENT_NEARING_EXPIRY_EVENT` · `POLICY_ACKNOWLEDGEMENT_OUTSTANDING_EVENT` |
| **Conflicting authorities** | `@afenda/events` `HUMAN_RESOURCES_EVENT_IDS` set |
| **Observed disk** | Platform facts accepts string constants not in `HUMAN_RESOURCES_EVENT_TYPE_SET` for compliance notifications; validated via `humanResourcesEntityPayloadSchema` at boundary |
| **Expected contract** | All HR event types registered in `@afenda/events` |
| **Consequence** | Downstream consumers may miss schema/version governance for compliance notification events |
| **Recommendation** | Register events in `@afenda/events` and import constants |
| **Decision** | None |
| **Repair mission** | HR-ENT-EVENT-CATALOG-COMPLIANCE |
| **Verification** | Event schema test includes compliance notification types |

#### HR-GOV-P2-005

| Field | Value |
|---|---|
| **Paths/symbols** | `src/sensitive-operation-policies.ts` · `human-resources.headcount.*` |
| **Conflicting authorities** | HR-ENT-06 |
| **Observed disk** | Headcount plan/reserve commands use manifest permission only; no sensitive prefix |
| **Expected contract** | Executive/workforce planning data classified (`executive_planner` scope exists) |
| **Consequence** | Over-broad read access to approved plans and availability |
| **Recommendation** | Add headcount prefix family with `privileged_only` or scoped planner policy |
| **Decision** | None |
| **Repair mission** | HR-ENT-WFP-SENSITIVE-POLICY |
| **Verification** | Sensitive coverage test includes headcount ops |

#### HR-GOV-P2-006

| Field | Value |
|---|---|
| **Paths/symbols** | `__tests__/contextual-authorization-privacy.test.ts` · `classifies the complete sensitive command/query surface` |
| **Conflicting authorities** | Self-test expected counts 123/47 |
| **Observed disk** | Test fails: **128** command policies (2026-07-24) |
| **Expected contract** | Coverage test tracks register growth |
| **Consequence** | CI red on cluster-adjacent auth suite; drift undetected for new prefixes |
| **Recommendation** | Update expected counts or derive dynamically from registers |
| **Decision** | None |
| **Repair mission** | HR-XCUT-SENSITIVE-COVERAGE-TEST |
| **Verification** | contextual-authorization-privacy.test.ts green |

---

## Canonical-definition conflicts (cluster-local)

| Concept | Observation | Severity | Reference |
|---|---|---|---|
| Authorization entry | Case list uses store `hasCaseAccess` ≠ `requireCaseAccess` | P0 | HR-GOV-P0-001 · `02-canonical-definitions.tsv` row 17 |
| Privacy port | Defined, not composed | P0 | HR-XCUT-P0-004 · TSV row 23 |
| Workforce variance | “Variance” means reservation consumption | P1 | HR-GOV-P1-002 |
| Talent folder split | Zod vs command orchestration | Pass | HR-GOV-P3-001 |
| Effective-truth scope | Case/talent tables outside 33-table matrix | P2 | OPEN-DECISION-01 |

---

## Memory/Drizzle parity findings

| Area | Verdict | Notes |
|---|---|---|
| Store coverage guards | **Pass** | Compile-time `Missing*Methods` = `never` for cluster slices |
| Compliance | **Pass** | Unit + parity test files present |
| Employee relations | **Pass** | Unit + parity; ACL gap is **command-layer**, both adapters identical |
| Talent | **Pass** (structure) | Parity file only; parity **not executed** this session (see appendix) |
| Workforce planning | **Partial** | Unit suite 13/14 pass; one recruitment-consume test failing |
| Vault adapter | **Pass** | `vault-document-reference.test.ts` |

---

## Missing database invariants (observed gaps)

| Table / concern | Present | Gap |
|---|---|---|
| `hr_headcount_reservation` active per requisition | Unique index | **Pass** |
| `hr_headcount_plan` approved per scope/period | Unique partial | **Pass** |
| `hr_employee_case_event` sequence | Index + event kind | Redact path validated in tests |
| Work eligibility expiry | Column `expires_on` | No DB check enforcing auto-expire (command-driven — acceptable if documented) |
| Case list ACL | org index | **No row-level security** — relies on app/store filtering (currently weak — HR-GOV-P0-001) |

---

## Missing tests

| Gap | Priority |
|---|---|
| Case list ACL + projection | P0 |
| Talent unit suite (non-parity) | P2 |
| Sensitive policy count drift | P2 |
| WFP reservation consume on offer acceptance | P2 |
| Compliance scheduled expiry producer | P1 |
| Parity execution with DATABASE_URL in vitest process | P1 (env wiring) |

---

## Ordered repair candidates (names only)

1. **HR-ENT-ER-CASE-LIST-ACL** — P0 case read path unification
2. **HR-ENT-04-AUTH-PRIVACY** — privacy port + auth unification (baseline)
3. **HR-XCUT-EMISSION-REGISTRY** — cluster command emission map
4. **HR-ENT-WFP-VARIANCE-ACTUALS** — workforce plan vs employment facts
5. **HR-ENT-TALENT-SENSITIVE-POLICY** — competency + enforcement
6. **HR-ENT-WFP-SENSITIVE-POLICY** — headcount classification
7. **HR-ENT-COMPLIANCE-EXPIRY-OPS** — nearing-expiry producer
8. **HR-ENT-12-GOV-PRODUCT-SLICE** — Server Actions / UI
9. **HR-ENT-TALENT-UNIT-TESTS** — unit depth
10. **HR-ENT-WFP-RESERVATION-CONSUME** — **CLOSED** (Slice 1.3)
11. **HR-XCUT-SENSITIVE-COVERAGE-TEST** — stale counts
12. **HR-ENT-EVENT-CATALOG-COMPLIANCE** — platform event registration

---

## Residual dependencies on other clusters

| Dependency | Owner |
|---|---|
| Employment/assignment actuals for WFP variance | HR-AUD-01 foundation |
| Recruitment offer → reservation consume | HR-AUD-01 recruitment |
| Compensation sensitive ops (not deep-audited here) | HR-AUD-02 |
| Payroll money handoff | OPEN-DECISION-05 · `@afenda/payroll` |
| Platform DSAR execution | OPEN-DECISION-03 · platform mission |
| Emission registry completion | HR-XCUT-EMISSION-REGISTRY (cross-cut) |

---

## Verify evidence appendix

Commands run 2026-07-24 on working tree. Failures recorded as **pre-existing**; this mission made no product edits.

### Typecheck

```bash
pnpm --filter @afenda/human-resources typecheck
```

**Exit code: 2** (pre-existing, out-of-cluster)

```
src/adapters/drizzle/recruitment.ts — Candidate consent fields type mismatch (3 errors)
src/adapters/memory/recruitment.ts — retentionDueAsOf possibly undefined (1 error)
```

### Cluster unit tests

```bash
pnpm --filter @afenda/human-resources test -- compliance employee-relations talent workforce-planning vault-document contextual-authorization platform-integration
```

**Exit code: 1**

| Result | Detail |
|---|---|
| 8 files passed | compliance, employee-relations, talent.parity, vault-document, platform-integration-facts, etc. |
| 74 tests passed | |
| 2 tests failed | See below |

Failures:

1. `contextual-authorization-privacy.test.ts` — expected 123 sensitive command policies, got **128**
2. `human-resources.workforce-planning.test.ts` — `consumes reservation on offer acceptance` — `candidate.ok` false

### Parity tests (DATABASE_URL)

```bash
REQUIRE_DATABASE_TESTS=1 pnpm --filter @afenda/human-resources test -- compliance.parity employee-relations.parity talent.parity workforce-planning.parity
```

**Exit code: 1** — all four suites blocked: `DATABASE_URL missing under CI/REQUIRE_DATABASE_TESTS=1` in vitest process (`.env.local` present on disk but not loaded into test runner). **Parity not evaluated this session.**

---

## Finding index

| ID | Severity | Title |
|---|---|---|
| HR-GOV-P0-001 | P0 | Case list queries bypass ACL and field projection |
| HR-GOV-P0-002 | P0 | Cluster mutations absent from emission registry (extends HR-XCUT-P0-003) |
| HR-GOV-P0-003 | P0 | Privacy port unwired at composition root (extends HR-XCUT-P0-004) |
| HR-GOV-P1-001 | P1 | Work/document expiry lacks scheduled producer |
| HR-GOV-P1-002 | P1 | Workforce variance is reservation-based, not employment actuals |
| HR-GOV-P1-003 | P1 | Competency ops missing from sensitive policy register |
| HR-GOV-P1-004 | P1 | No apps/web Server Actions for cluster domains |
| HR-GOV-P2-001 | P2 | Vault reference posture correct; platform storage owner external |
| HR-GOV-P2-002 | P2 | Talent domain lacks unit test file |
| HR-GOV-P2-003 | P2 | Compliance notification events not in `@afenda/events` catalog |
| HR-GOV-P2-004 | P2→**closed** | WFP reservation consume — **CLOSED** Slice 1.3 |
| HR-GOV-P2-005 | P2 | Headcount ops absent from sensitive policy register |
| HR-GOV-P2-006 | P2 | Sensitive coverage test count stale (128 vs 123) |
| HR-GOV-P3-001 | P3 | talent/** vs schemas/talent/** split is intentional (Pass) |

---

## HR-AUD-03 exit criteria

- [x] Prerequisite baseline pack consumed
- [x] Prompt 2C domains audited with seven lenses
- [x] Five-axis scorecard included
- [x] Finding format matches HR-AUD-00 contract
- [x] Verify commands executed and evidence appended
- [x] No product, schema, migration, or app file changes from this mission
- [x] Repair candidates named only (no product repair prompt)
