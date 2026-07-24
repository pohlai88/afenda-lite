# HR-AUD-04 — Consolidated conflict register

| Field | Value |
|---|---|
| Mission | **HR-AUD-04** |
| Type | Consolidation only |
| Inputs | HR-AUD-00 … HR-AUD-03 artifacts |
| Product edits | **Prohibited** |
| Phase 0 | **Exit MET** — Slice 0.1 CLOSED · Slice 0.2 RATIFIED · Slice 0.3 DONE ([`00.hrm.md`](../../00.hrm.md)) |
| Active mission queue | [`44`](44-next-repair-mission.md) → **HR-OPS-LEAVE-EMISSION-REGISTRY** (Slice 1.1 calendar **CLOSED**) |

Related: [`40-enterprise-completeness-matrix.tsv`](40-enterprise-completeness-matrix.tsv) · [`43-repair-roadmap.md`](43-repair-roadmap.md)

---

## Architecture decisions — **RATIFIED** (Slice 0.2 · 2026-07-24)

Authority: [`00.hrm.md`](../../00.hrm.md) Slice 0.2 · Tier 0 [`HR-AUD-04-DECISION-REGISTER`](43-repair-roadmap.md). Choices are the **canonical recommendations** from this register (no new options). Implementation remains with each **Owner mission**; ratification is not product closure.

| ID | Conflict | Options | Canonical recommendation | Ratified choice | Status | Blocking HR-ENT | Owner mission |
|---|---|---|---|---|---|---|---|
| OPEN-DECISION-01 | Effective-truth scope: HR-ENT-05 "package-wide" vs 33-table matrix | A) Expand matrix incrementally B) Publish exclusion register | B short-term; A long-term per domain | **B** short-term (exclusion register / classify all tables); **A** long-term per domain; lineage applied selectively | **RATIFIED** | HR-ENT-05 | HR-ENT-03-EFFECTIVE-TRUTH |
| OPEN-DECISION-02 | Four authorization entry points vs unified facade | A) Single contextual facade + ER plugin B) Document layered model + coverage test | A for HR-ENT-06 | **A** — one contextual authorization facade; Employee Relations ACL = specialized policy under the facade | **RATIFIED** | HR-ENT-06 | HR-ENT-04-AUTH-PRIVACY |
| OPEN-DECISION-03 | Privacy/DSAR execution owner: HR port vs platform | A) Platform service + apps/web adapter B) HR-internal port | A per enterprise.md Phase 4/5 | **A** — platform-owned privacy service; HR consumes via `HumanResourcesPrivacyPort` + apps/web adapter | **RATIFIED** | HR-ENT-07 | HR-ENT-04-AUTH-PRIVACY |
| OPEN-DECISION-04 | Organization dimension directory owner | A) Extend master-data B) HR snapshots only C) Hybrid | C — governed keys in master-data, snapshots on assignments | **C** — master-data governed keys + assignment snapshots | **RATIFIED** | HR-ENT-04 | HR-ENT-02-ORG-CONTEXT |
| OPEN-DECISION-05 | Payroll money handoff scale | Document shared handoff schema | HR decimal strings internally consistent | Decimal-string handoff with explicit scale and rounding; shared ERP handoff schema | **RATIFIED** | Compensation/time payroll | HR-AUD-03 + `@afenda/payroll` |
| OPEN-DECISION-A1 | Candidate consent persistence owner | A) `hr_candidate` consent columns B) Application-only C) Platform privacy refs | A for HR-ENT-07 — **implemented** (mission CLOSED; do not reopen) | **A** — durable HR-owned candidate consent fact | **RATIFIED** (implementation **CLOSED**; do not reopen) | HR-ENT-07, HR-ENT-16 | HR-COREORG-CANDIDATE-CONSENT-ALIGN (**CLOSED**) |
| OPEN-DECISION-A2 | Hire orchestration shape | A) Atomic `hireFromOfferAcceptance` B) Documented saga C) Workflow engine | B short-term; A for production bar | **B** short-term (documented saga); **A** for enterprise production bar | **RATIFIED** | HR-ENT-12 | HR-COREORG-HIRE-ORCHESTRATION |
| OPEN-DECISION-A3 | Store vs folder layout | Document-only vs refactor store types | Document-only (HR-COREORG-STRUCTURE-ALIGN) | Document-only alignment (no store-type refactor unless separately authorized) | **RATIFIED** | None | HR-COREORG-STRUCTURE-ALIGN |
| OPEN-DECISION-C1 | WFP variance definition | Reservation-consumed vs employment actuals | Rename contract or add employment-backed actuals port | Employment/assignment–backed actuals (approved plan vs actual employment/assignment facts); not reservation-consumed as “actual headcount” | **RATIFIED** | HR-ENT-11 | HR-ENT-WFP-VARIANCE-ACTUALS |

### Slice 0.2 ratification log

| 00.hrm decision | OPEN-DECISION | Ratified choice (canonical) |
|---|---|---|
| Authorization | OPEN-DECISION-02 | **A** — one contextual authorization facade |
| Employee Relations ACL | OPEN-DECISION-02 | **A** — specialized ER policy under the facade |
| Privacy execution | OPEN-DECISION-03 | **A** — platform privacy service through HR port |
| Candidate consent | OPEN-DECISION-A1 | **A** — durable HR-owned candidate fact (**CLOSED**/implemented; not reopened) |
| Organization dimensions | OPEN-DECISION-04 | **C** — master-data keys + assignment snapshots |
| Effective truth | OPEN-DECISION-01 | **B** short-term classify/exclude; **A** long-term matrix expand; lineage selective |
| Hire process | OPEN-DECISION-A2 | **B** documented saga first; **A** for enterprise production bar |
| Workforce variance | OPEN-DECISION-C1 | Approved plan vs employment/assignment actuals |
| Payroll money | OPEN-DECISION-05 | Decimal-string handoff with explicit scale and rounding |
| *(register completeness)* | OPEN-DECISION-A3 | Document-only (HR-COREORG-STRUCTURE-ALIGN) |

**Orphan check:** OPEN-DECISION-01…05, A1…A3, C1 — zero unratified rows. No ownerless open decisions. Do not reopen Slice 0.1 closed finding IDs.

---

## Deduplicated defect register

Canonical IDs only. **Aliases** absorbed into parent findings.

| Canonical ID | Aliases (do not duplicate) | Sev | Concern bucket | HR-ENT | Owner mission |
|---|---|---|---|---|---|
| HR-XCUT-P0-001 | — | P0 | package contract | HR-ENT-06 | HR-ENT-04-AUTH-PRIVACY |
| HR-XCUT-P0-002 | HR-OPS-P1-004; HR-COREORG-P1-003 | P0 | architecture decision | HR-ENT-05 | HR-ENT-03-EFFECTIVE-TRUTH |
| HR-XCUT-P0-003 | HR-COREORG-P0-002; HR-OPS-P0-001; HR-GOV-P0-002 | P0 | package contract | HR-ENT-13 | HR-XCUT-EMISSION-REGISTRY |
| HR-XCUT-P0-004 | HR-GOV-P0-003 | P0 | application composition | HR-ENT-07 | HR-ENT-04-AUTH-PRIVACY |
| HR-GOV-P0-001 | — | P0→**closed** | authorization (see reconciliation) | HR-ENT-06, HR-ENT-07 | HR-ENT-ER-CASE-LIST-ACL (**CLOSED**; ER DB parity = evidence residual only) |
| HR-COREORG-P0-001 | HR-COREORG-P1-001 | P0→**closed** | database + package contract | HR-ENT-07, HR-ENT-16, HR-ENT-18 | HR-COREORG-CANDIDATE-CONSENT-ALIGN (**CLOSED**) |
| HR-OPS-P1-001 | — | P1→**closed** | command/query | HR-ENT-06 | HR-OPS-OVERTIME-APPROVAL-AUTHORITY (**CLOSED**) |
| HR-OPS-P1-002 | — | P1 | package contract | HR-ENT-12 | HR-OPS-LEAVE-HANDOFF-PERMISSION |
| HR-OPS-P1-003 | — | P1 | missing product capability | HR-ENT-12 | HR-ENT-07-PRODUCT-LEAVE-ACTIONS |
| HR-OPS-P1-005 | — | P1→**closed** | adapter parity defect | HR-ENT-16 | HR-OPS-TIME-CALENDAR-RESOLUTION-FIXTURES (**CLOSED** Slice 1.1) |
| HR-OPS-P1-006 | — | P1 | command/query | HR-ENT-16 | HR-OPS-OVERTIME-REAPPROVAL-NOOP |
| HR-COREORG-P1-002 | — | P1 | command/query | HR-ENT-16 | HR-COREORG-REHIRE-SEMANTICS |
| HR-COREORG-P1-004 | — | P1 | non-blocking hygiene | HR-ENT-04 | Scratch doc refresh |
| HR-COREORG-P1-005 | — | P1 | missing product capability | HR-ENT-12 | HR-COREORG-HIRE-ORCHESTRATION |
| HR-GOV-P1-001 | — | P1 | missing product capability | HR-ENT-09 | HR-ENT-COMPLIANCE-EXPIRY-OPS |
| HR-GOV-P1-002 | — | P1 | command/query | HR-ENT-11 | HR-ENT-WFP-VARIANCE-ACTUALS |
| HR-GOV-P1-003 | — | P1 | package contract | HR-ENT-06 | HR-ENT-TALENT-SENSITIVE-POLICY |
| HR-GOV-P1-004 | — | P1 | application composition | HR-ENT-12 | HR-ENT-12-GOV-PRODUCT-SLICE |
| HR-XCUT-P1-003 | — | P1 | non-blocking hygiene | HR-ENT-19 | Scratch doc refresh |
| HR-XCUT-P1-006 | — | P1 | architecture decision | HR-ENT-16 | OPEN-DECISION-05 + payroll review |
| HR-XCUT-P1-007 | — | P1 | package contract | — | HR-XCUT-STORE-RESOLVER (optional) |
| HR-XCUT-P1-010 | — | P1 | non-blocking hygiene | — | Superseded (HR-AUD-00 done) |
| HR-COREORG-P2-001 | HR-XCUT-P2-005 | P2 | non-blocking hygiene | HR-ENT-15 | HR-COREORG-STRUCTURE-ALIGN |
| HR-COREORG-P2-002 | — | P2→**closed** | adapter parity defect | HR-ENT-18 | HR-COREORG-LIFECYCLE-SERIALIZE-PARITY (**CLOSED** Slice 1.2) |
| HR-OPS-P2-001 | — | P2 | command/query | HR-ENT-16 | HR-OPS-TIME-TIMEZONE-HANDOFF |
| HR-OPS-P2-002 | — | P2 | non-blocking hygiene | — | HR-XCUT-HYGIENE |
| HR-OPS-P2-003 | — | P2 | command/query | HR-ENT-16 | HR-OPS-TIME-SESSION-DETERMINISM |
| HR-OPS-P2-004 | — | P2 | database defect | HR-ENT-16 | HR-OPS-LEAVE-OVERLAP-GUARD |
| HR-OPS-P2-005 | — | P2 | missing product capability | HR-ENT-14 | HR-ENT-14-ATTENDANCE-CONNECTOR |
| HR-OPS-P2-006 | — | P2 | command/query | HR-ENT-06 | HR-OPS-TIME-AUTHORITY-EFFECTIVE-DATE |
| HR-GOV-P2-001 | — | P2 | architecture decision | HR-ENT-09 | HR-ENT-09-PLATFORM-DOCUMENT-BOUNDARY (doc) |
| HR-GOV-P2-002 | — | P2 | missing product capability | HR-ENT-18 | HR-ENT-TALENT-UNIT-TESTS |
| HR-GOV-P2-003 | — | P2 | package contract | HR-ENT-09 | HR-ENT-EVENT-CATALOG-COMPLIANCE |
| HR-GOV-P2-004 | — | P2→**closed** | adapter parity defect | HR-ENT-18 | HR-ENT-WFP-RESERVATION-CONSUME (**CLOSED** Slice 1.3) |
| HR-GOV-P2-005 | — | P2 | package contract | HR-ENT-06 | HR-ENT-WFP-SENSITIVE-POLICY |
| HR-GOV-P2-006 | — | P2 | non-blocking hygiene | HR-ENT-18 | HR-XCUT-SENSITIVE-COVERAGE-TEST |
| HR-XCUT-P2-004 | — | P2 | non-blocking hygiene | — | HR-XCUT-HYGIENE |
| HR-XCUT-P2-008 | — | P2 | non-blocking hygiene | — | HR-AUD-02 disposition |
| HR-XCUT-P3-009 | — | P3 | non-blocking hygiene | — | afenda-elite-repo-housekeeping |
| HR-OPS-P3-001 | — | P3 | non-blocking hygiene | HR-ENT-18 | HR-OPS-TEST-LEAVE-CONCURRENCY-CLEANUP |
| HR-GOV-P3-001 | — | P3 | Pass (intentional split) | HR-ENT-15 | n/a |

**Emission registry tranches** (child scope of HR-XCUT-P0-003):

| Tranche | Scope | Coverage observed |
|---|---|---|
| Cross-cut | 286 commands | 88–90 / 286 (~31%) |
| Cluster A | lifecycle/org/recruitment | 6 / 71 (~8.5%) |
| Cluster B leave | 18 mutations | 0 / 18 |
| Cluster B time | 59 mutations | 59 / 59 (Pass) |
| Cluster C gov | ER/talent/WFP/compliance | 0 for case/headcount/talent/succession/career |

---

## Severity reconciliation log

| Finding / HR-ENT | Source severity | Consolidated | Reason |
|---|---|---|---|
| HR-ENT-05 | enterprise.md Pass | **partial** | AUD-00 OPEN-DECISION-01: matrix covers 33/106 tables, not package-wide |
| HR-ENT-18 | enterprise.md Pass | **partial** | Consent/typecheck blockers CLOSED (Slice 0.1); lifecycle serialize parity CLOSED (Slice 1.2); calendar fixtures CLOSED (Slice 1.1 / HR-OPS-P1-005); live typecheck green; remaining = sensitive coverage, WFP reservation |
| HR-OPS-P1-005 | AUD-02 P1 | **closed** | Slice 1.1 (2026-07-24): assignment-context fixture wiring + Memory/Drizzle calendar scope/employment resolution + conflict/timezone evidence green |
| HR-ENT-04 | enterprise.md Major | **partial** (unchanged) | Disk ahead of enterprise.md; dimension snapshot requirement remains |
| HR-GOV-P0-001 | AUD-03 P0 | **closed** | Slice 0.1 (2026-07-24): list ACL + projection closed via `buildAuthorizedProjectedCaseListPage` / `evaluateCaseReadAccess`; unit matrix green. **Evidence residual only (not a blocker reopen):** Employee Relations Memory/Drizzle list ACL database parity coverage |
| HR-OPS-P1-001 | AUD-02 P1 | **closed** | HR-OPS-OVERTIME-APPROVAL-AUTHORITY COMPLETE; Slice 0.1 confirms not an open/next blocker |
| HR-COREORG-P0-001 vs P1-001 | P0 + P1 | **closed** (was single P0) | Consent triple drift repaired under HR-COREORG-CANDIDATE-CONSENT-ALIGN; P1-001 remains merged alias — do not reopen as separate finding |
| HR-COREORG-P2-002 | AUD-01 P2 | **closed** | Slice 1.2 (2026-07-24): `EmploymentMovement.createdAt`/`updatedAt` ISO datetime strings Memory + Drizzle; `human-resources.lifecycle.parity` transfer case green |
| HR-GOV-P0-002 / P0-003 | P0 | **alias of XCUT P0-003/004** | Do not double-count in scorecard |
| Cluster A/B "Gap" vs Cluster C "Fail" | Mixed labels | **Gap = Fail** | Normalized to Fail for blocking authorization/privacy/test gaps |

---

## Authority supersessions

| Superseded authority | Replacement | Action |
|---|---|---|
| `human-resources-implementation-audit.md` (HR-00) | HR-AUD-00 pack | Do not cite 43-table / 2-command counts |
| Prompt 2B compensation/performance/learning → AUD-03 | Prompt 2C excludes them → AUD-02 | Record as **scope orphan**; no pack |
| AUD-03 scorecard overtime authority Gap | AUD-02 finding CLOSED | Prefer AUD-02 closure record |
| enterprise.md command/query/permission counts | Scratch pack + README = disk 286/141/99 (Slice 0.3); enterprise.md still 284/138/98 | Residual **HR-XCUT-P1-003** only — does not reopen Phase 0 |

---

## Consolidation spot-checks (disk, read-only)

Executed during HR-AUD-04 only where audit findings conflicted.

| Probe | Audit claim | Disk on consolidation date | Disposition |
|---|---|---|---|
| ER case list ACL | List uses store `hasCaseAccess` only; no projection | `executeAuthorizedCaseListQuery` → `buildAuthorizedProjectedCaseListPage` → `evaluateCaseReadAccess` + `applyCaseFieldProjection` | **Closed** (HR-ENT-ER-CASE-LIST-ACL / HR-GOV-P0-001). Residual: ER DB parity evidence only — not an active blocker |
| Candidate consent | Type/Zod vs DDL drift | Aligned under HR-COREORG-CANDIDATE-CONSENT-ALIGN | **Closed** (HR-COREORG-P0-001) |
| ER list ACL tests | Missing | `__tests__/employee-relations-case-list-acl.test.ts` exists; 10/10 pass | Supports **closed** finding; ER DB parity remains evidence residual |

---

## Separated concern checklist

| Concern | Architecture decision | Database defect | Package contract | Adapter parity | App composition | Missing capability | Hygiene |
|---|---|---|---|---|---|---|---|
| Effective-truth breadth | HR-XCUT-P0-002 · OPEN-DECISION-01 (**RATIFIED**) | — | — | — | — | — | — |
| Auth layering | HR-XCUT-P0-001 · OPEN-DECISION-02 (**RATIFIED**) | — | — | — | — | — | — |
| Privacy/DSAR owner | OPEN-DECISION-03 (**RATIFIED**) | — | HR-XCUT-P0-004 | — | apps/web omits port | — | — |
| Org dimensions | OPEN-DECISION-04 (**RATIFIED**) | — | — | — | partial port wired | — | HR-COREORG-P1-004 |
| Payroll money | OPEN-DECISION-05 (**RATIFIED**) | — | HR-XCUT-P1-006 | — | — | — | — |
| Candidate consent | OPEN-DECISION-A1 (**RATIFIED**; implemented CLOSED; do not reopen) | — (HR-COREORG-P0-001 **closed**) | — | — | — | — | — |
| Emission registry | — | — | HR-XCUT-P0-003 | — | — | — | — |
| ER case list ACL | OPEN-DECISION-02 (**RATIFIED**; auth facade implementation → HR-ENT-04-AUTH-PRIVACY) | — | — | ER DB parity evidence residual only (finding **closed**) | — | — | — |
| Leave overlap | — | HR-OPS-P2-004 | — | — | — | — | — |
| Assignment date range | — | cluster-a conflicts table | — | command-only guard | — | — | — |
| Leave/product Actions | — | — | — | — | HR-OPS-P1-003 | HR-ENT-07-PRODUCT-LEAVE-ACTIONS | — |
| Gov product Actions | — | — | — | — | HR-GOV-P1-004 | HR-ENT-12-GOV-PRODUCT-SLICE | — |
| Doc count drift | — | — | — | — | — | — | HR-XCUT-P1-003 (enterprise.md only; Slice 0.3 pack aligned) |
| Sensitive count test | — | — | — | — | — | — | HR-GOV-P2-006 |

---

## Unaudited domains (record only)

| Domain | Status | Authority conflict |
|---|---|---|
| compensation-benefits | unaudited-depth | AUD-00 Cluster C vs AUD-02/03 bounce |
| performance | unaudited-depth | Same |
| learning | unaudited-depth | Same; partial `hr-learning` Actions only |

Do not infer Pass/Gap for these domains until a dedicated cluster pack is produced.
