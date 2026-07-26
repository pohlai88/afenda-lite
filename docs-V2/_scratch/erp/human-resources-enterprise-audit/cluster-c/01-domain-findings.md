# HR-AUD-06 — Cluster C domain findings (compensation · performance · learning)

| Field | Value |
|---|---|
| Mission | **HR-AUD-06 domain-depth** (Slice 8.1) |
| Finding prefix | `HR-CPL-P{0\|1\|2\|3}-###` |
| Lenses | Normalize · Serialize · Stabilize · Standardize · Optimize · Enrich · Repair readiness |
| Scope | [`00-cluster-scope.md`](00-cluster-scope.md) |

Cross-cut findings from HR-AUD-00 are **referenced**, not duplicated: **HR-XCUT-P0-002** (effective-truth scope), **HR-XCUT-P0-003** (package-wide emission registry — leave/time blockers), **HR-XCUT-P1-006** (payroll money boundary), **HR-XCUT-P0-004** (privacy port — closed Slice 2.10).

Phase 3 emission classification for these domains is **frozen** in [`HR-AUD-06-COMPENSATION-PERFORMANCE-LEARNING.md`](../HR-AUD-06-COMPENSATION-PERFORMANCE-LEARNING.md) — consume only; domain-depth findings below are independent.

---

## 1. Normalize

**Assessment:** Command IDs follow `human-resources.{aggregate}.{verb}` consistently across all three domains. Store slice names align with domain folders. Compensation proposal commands live under `compensation-benefits/compensation-proposal.ts` with recruitment offer FK — naming is explicit.

### HR-CPL-P1-001

| Field | Value |
|---|---|
| **paths/symbols** | `src/module-ids.ts#HUMAN_RESOURCES_COMMAND_COURSE_ACTIVATE` · `src/store/learning.ts#activateCourse` · `src/adapters/{memory,drizzle}/learning.ts#activateCourse` · `src/learning/course.ts` (no export) · `src/index.ts` |
| **conflicting authorities** | Command ID + store contract vs public domain command surface |
| **observed disk behavior** | **Repair 2026-07-26:** `activateCourse` exported from `src/learning/course.ts` via `index.ts`; `activateCourseAction` in `apps/web/app/actions/hr-learning.ts`; lifecycle test covers archive → reactivate |
| **expected contract** | Every registered mutation command has a public command wrapper callable by product composition |
| **production or maintenance consequence** | ~~Course activation reachable only via direct store/internal paths~~ — **closed** |
| **canonical recommendation** | ~~Export `activateCourse`~~ — **done** |
| **required decision** | None |
| **owning repair mission** | HR-CPL-LEARNING-COURSE-ACTIVATE-EXPORT — **closed 2026-07-26** |
| **verification needed for closure** | `pnpm --filter @afenda/human-resources test -- human-resources.learning` exit 0 (38 passed, 10 skipped) |

### HR-CPL-P2-003

| Field | Value |
|---|---|
| **paths/symbols** | `src/module-ids.ts#HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMAND_IDS` (21 entries) · frozen emission matrix (18 compensation rows) · `src/compensation-benefits/compensation-proposal.ts` |
| **conflicting authorities** | Phase 3 emission inventory (pre-proposal) vs post–Slice 6.6 command surface |
| **observed disk behavior** | Three proposal commands + queries + `hr_compensation_proposal` DDL present; frozen matrix documents 18 compensation-benefits rows without proposal aggregates |
| **expected contract** | Inventory docs either versioned or annotated when commands added after classification slice |
| **production or maintenance consequence** | Auditors may under-count compensation mutations; no runtime defect if registry maps all 21 IDs at CI |
| **canonical recommendation** | Record as forward inventory delta in domain-depth pack only — **do not** reopen emission matrix file this mission |
| **required decision** | None (observation) |
| **owning repair mission** | HR-XCUT-HYGIENE (optional matrix companion note) |
| **verification needed for closure** | `emission-registry-parity.test.ts` includes proposal command IDs |

---

## 2. Serialize

**Assessment:** Compensation uses `moneyAmountSchema` string decimals and currency lookup validation (`compensation-benefits.test.ts` rejects unknown currency). Performance ratings use approved scale guards. Learning uses ISO dates for certification expiry.

### HR-XCUT-P1-006 (referenced — payroll boundary)

| Field | Value |
|---|---|
| **paths/symbols** | `src/schemas/compensation.ts#moneyAmountSchema` · `getApprovedCompensationHandoff` · `@afenda/payroll` boundary |
| **conflicting authorities** | HR decimal strings vs payroll minor-unit conventions |
| **observed disk behavior** | Handoff returns string decimal amounts; `compensation-benefits.test.ts` asserts handoff shape; no HR import of `@afenda/payroll` (test enforced) |
| **expected contract** | Single money serialization at ERP boundary (OPEN-DECISION-05) |
| **production or maintenance consequence** | Scale/rounding bugs at payroll ingestion if handoff contract not parity-tested cross-package |
| **canonical recommendation** | Close via Slice 8.7 payroll handoff parity mission — not HR-AUD-06 |
| **required decision** | OPEN-DECISION-05 |
| **owning repair mission** | HR-ENT-PAYROLL-HANDOFF-PARITY |
| **verification needed for closure** | Cross-package parser test green |

No additional cluster-specific serialize defects beyond HR-XCUT-P1-006.

---

## 3. Stabilize

**Assessment:** Idempotency keys on create paths; optimistic concurrency on updates (learning course stale-version test); domain_event emissions tested for compensation (`compensation.changed.v1`, `benefit-enrollment.changed.v1`) and performance cycle open. Review finalize → apply compensation path tested atomically in unit suite.

No P0 stabilize defects observed in 2026-07-26 verify run (typecheck exit 0; 70 tests passed).

---

## 4. Standardize

**Assessment:** Permissions seeded in `permissions.ts` and `platform-permission-catalog.ts`. Authorization policies registered in `shared/authorization-policies/index.ts`. Sensitive-operation prefix table covers compensation, benefits, and performance — not learning certification/completion.

### HR-CPL-P1-004

| Field | Value |
|---|---|
| **paths/symbols** | `src/sensitive-operation-policies.ts` · `src/shared/authorization-policies/learning.ts` |
| **conflicting authorities** | Performance/compensation in sensitive prefix register vs learning/certification absent |
| **observed disk behavior** | **Repair 2026-07-26:** `SENSITIVE_OPERATION_POLICIES` includes `human-resources.compensation-proposal.`, `human-resources.course.`, `human-resources.session.`, `human-resources.learning-assignment.`, `human-resources.completion.`, `human-resources.certification.` prefixes |
| **expected contract** | Consistent sensitive-operation coverage for PII-bearing reads/writes across HR domains |
| **production or maintenance consequence** | ~~Certification and completion mutations may bypass sensitive-operation runner hooks~~ — prefix register aligned |
| **canonical recommendation** | ~~Extend sensitive prefix register~~ — **done**; Phase 2 runner consolidation remains HR-CPL-P2-002 |
| **required decision** | None |
| **owning repair mission** | HR-ENT-04-AUTH-PRIVACY (learning prefixes) — **closed 2026-07-26** |
| **verification needed for closure** | `authorization-policy-registry.test.ts` iterates `HUMAN_RESOURCES_SENSITIVE_OPERATION_IDS` green |

### HR-CPL-P2-002 (Phase 2 cross-reference)

| Field | Value |
|---|---|
| **paths/symbols** | `00.hrm.md` Phase 2 · compensation authorization policy · sensitive runner |
| **conflicting authorities** | Policy + projection implemented vs unified sensitive runner not consolidated for compensation paths |
| **observed disk behavior** | `shared/authorization-policies/compensation.ts` implements tiered field projection; Phase 2 status: WFP/compensation sensitive **enforcement** still forward |
| **expected contract** | Phase 2 exit: all classified sensitive domains use parity shell without bypass |
| **production or maintenance consequence** | Divergent auth enforcement paths until consolidation |
| **canonical recommendation** | Track under Phase 2 — not a new P0 for domain-depth audit |
| **required decision** | None |
| **owning repair mission** | HR-ENT-04-COMPENSATION-SENSITIVE-RUNNER |
| **verification needed for closure** | Phase 2 verdict Met for compensation/WFP |

---

## 5. Optimize

**Assessment:** No duplicate command runners within cluster scope. Currency lookup factory (`currency-lookup.ts`) shared by compensation modules. Performance and learning command runners follow the same `shared/*-command.ts` pattern as leave/time.

No cluster-specific optimize findings.

---

## 6. Enrich

**Assessment:** Effective-truth matrix includes core compensation tables and performance cycle; learning course/session partially classified. Scaffold ERP tables exist for forward Phase 8/9 slices.

### HR-CPL-P2-005

| Field | Value |
|---|---|
| **paths/symbols** | `packages/data-plane/db/src/schema/human-resources.ts` · `createErpScaffoldTable` |
| **conflicting authorities** | Enterprise Phase 8/9 completeness vs honest scaffold posture |
| **observed disk behavior** | Scaffold-only: `hr_benefit_eligibility`, `hr_compensation_review_cycle`, `hr_learning_program`, `hr_learning_attendance`, `hr_learning_assessment`, `hr_development_plan` |
| **expected contract** | Scaffold tables remain until owning slice implements domain behavior |
| **production or maintenance consequence** | None until product claims those capabilities |
| **canonical recommendation** | Forward-record as Phase 8/9 work — not a domain-depth Fail |
| **required decision** | None |
| **owning repair mission** | Phase 8.2–8.5 / Phase 9 slices |
| **verification needed for closure** | Scaffold replaced by full DDL + commands in owning slice |

Privacy subject collector includes compensation, performance, and learning entities (`privacy/subject-data-collector.ts`) — consumes HR-XCUT-P0-004 closed posture.

---

## 7. Repair readiness (findings summary)

| Priority | ID | Domain | Headline |
|---|---|---|---|
| P1 | HR-CPL-P1-001 | learning | ~~Public `activateCourse` export gap~~ **closed 2026-07-26** |
| P1 | HR-CPL-P1-002 | comp + perf | ~~Zero product Server Actions~~ **closed 2026-07-26** (Slice 8.9 + perf Actions + tests) |
| P1 | HR-CPL-P1-003 | all three | Drizzle parity skipped in audit session |
| P1 | HR-CPL-P1-004 | learning | ~~Sensitive-operation prefix gap~~ **closed 2026-07-26** |
| P2 | HR-CPL-P2-002 | compensation | Phase 2 sensitive runner consolidation residual |
| P2 | HR-CPL-P2-003 | compensation | Proposal commands post-date frozen emission table |
| P2 | HR-CPL-P2-005 | all three | Scaffold DDL forward tables |
| ref | HR-XCUT-P1-006 | compensation | Payroll handoff money boundary |

### HR-CPL-P1-002

| Field | Value |
|---|---|
| **paths/symbols** | `apps/web/app/actions/hr-learning.ts` (15 exports) · absent `hr-compensation.ts` · absent `hr-performance.ts` |
| **conflicting authorities** | HR-ENT-12 product surfaces vs package domain depth |
| **observed disk behavior** | **Repair 2026-07-26:** `hr-compensation.ts` (29 Actions), `hr-benefits.ts` (11), `hr-compensation-review.ts` (12), `hr-performance.ts` (11); contract tests green (`hr-compensation-actions`, `hr-benefits-actions`, `hr-compensation-review-actions`, `hr-performance-actions`) |
| **expected contract** | Product composition for enterprise HR modules includes Actions per major domain |
| **production or maintenance consequence** | ~~Operators cannot mutate compensation/performance through apps/web~~ — **closed** for package-wired Actions |
| **canonical recommendation** | ~~Slice 8.9 / Phase 9 Actions~~ — **done** for listed farms; UI routes remain Phase 8/9 forward |
| **required decision** | None |
| **owning repair mission** | HR-ENT-12-COMP-PRODUCT-ACTIONS · HR-ENT-12-PERF-PRODUCT-ACTIONS — **closed 2026-07-26** |
| **verification needed for closure** | `pnpm --filter @afenda/web test -- --project web __tests__/hr-compensation-actions.test.ts __tests__/hr-benefits-actions.test.ts __tests__/hr-compensation-review-actions.test.ts __tests__/hr-performance-actions.test.ts` exit 0 (8 passed) |

### HR-CPL-P1-003

| Field | Value |
|---|---|
| **paths/symbols** | `__tests__/human-resources.{compensation-benefits,performance,learning}.parity.test.ts` · `describe.skipIf(!runDrizzleParity)` |
| **conflicting authorities** | Parity Pass claim vs DATABASE_URL not loaded in audit session |
| **observed disk behavior** | 14 tests skipped in 2026-07-26 verify; memory parity suites passed |
| **expected contract** | Drizzle parity executed in CI or audit verify with `REQUIRE_DATABASE_TESTS=1` |
| **production or maintenance consequence** | Adapter drift may exist undetected until DB parity runs |
| **canonical recommendation** | Run REQUIRE_DATABASE_TESTS=1 before closing Parity axis to Pass |
| **required decision** | None |
| **owning repair mission** | HR-ENT-18-PARITY-CI-WIRING |
| **verification needed for closure** | 0 skipped parity cases with DATABASE_URL present |

---

## Lens rollup

| Lens | Compensation | Performance | Learning |
|---|---|---|---|
| Normalize | Pass | Pass | Pass |
| Serialize | Partial (HR-XCUT-P1-006) | Pass | Pass |
| Stabilize | Pass | Pass | Pass |
| Standardize | Partial (Phase 2 runner) | Partial (sensitive prefixes) | Pass |
| Optimize | Pass | Pass | Pass |
| Enrich | Partial (scaffold + matrix) | Partial (matrix scope) | Partial (scaffold) |
| Repair readiness | Payroll handoff (HR-XCUT-P1-006) | Parity CI (HR-CPL-P1-003) | Parity CI (HR-CPL-P1-003) |
