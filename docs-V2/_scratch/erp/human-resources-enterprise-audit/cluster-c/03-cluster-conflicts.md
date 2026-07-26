# HR-AUD-06 — Cluster C conflicts (architecture vs defects)

| Field | Value |
|---|---|
| Mission | **HR-AUD-06 domain-depth** (Slice 8.1) |
| Rule | Separate **intentional architecture** from **defects** requiring repair |

---

## Resolved: AUD-02 / AUD-03 scope bounce

| Authority | Prior state | Resolution (this pack) |
|---|---|---|
| [`04-domain-cluster-audit-contract.md`](../04-domain-cluster-audit-contract.md) Cluster C | Listed compensation, performance, learning under HR-AUD-03 | **Split:** governance subset → [`30-governance-risk-planning-cluster.md`](../30-governance-risk-planning-cluster.md); **domain-depth subset → this pack** |
| HR-AUD-03 Prompt 2C | Excluded comp/perf/learning | **Confirmed** — AUD-03 owns compliance/ER/talent/WFP only |
| HR-AUD-02 Prompt 2B supersession | Routed comp/perf/learning to AUD-03 | **Superseded for depth** — AUD-03 executed without them; **HR-AUD-06 domain-depth** closes the gap |
| [`42-five-axis-domain-scorecard.md`](../42-five-axis-domain-scorecard.md) Unaudited rows | No dedicated pack | **Closed** — scores in [`35-compensation-performance-learning-cluster.md`](../35-compensation-performance-learning-cluster.md) |

**Emission vs depth:** [`HR-AUD-06-COMPENSATION-PERFORMANCE-LEARNING.md`](../HR-AUD-06-COMPENSATION-PERFORMANCE-LEARNING.md) remains the Phase 3 **classification** artifact (Slices 3.6–3.8 DONE). This cluster-c pack is the Slice **8.1 domain-depth** artifact. Both missions share the HR-AUD-06 label; filenames distinguish emission matrix vs cluster-c pack.

---

## Architecture decisions (not defects)

| Decision | Evidence | Consequence |
|---|---|---|
| Payroll calculation stays in `@afenda/payroll` | `compensation-benefits.test.ts` forbids `@afenda/payroll` import; handoff query only | HR owns approved facts; G2N out of scope |
| Platform events carry entity references only | Frozen emission matrix sensitive-payload ban | No salary/rating text in outbox payloads |
| Compensation field-tier projection | `shared/authorization-policies/compensation.ts` | Tiered masking for compensation reads |
| Performance manager_or_privileged | `shared/authorization-policies/performance.ts` | Manager scope + confidential.read for reviews |
| Learning subject_or_privileged | `shared/authorization-policies/learning.ts` | Employee-scoped learning reads |
| Pre-hire compensation proposal | `hr_compensation_proposal` + offer FK (Slice 6.6) | Proposal ≠ employee compensation until post-accept conversion (forward Slice 8.3+) |
| Scaffold ERP tables for forward slices | `createErpScaffoldTable` rows in schema | Honest incomplete DDL until Phase 8/9 |

---

## Defects / gaps (require repair)

| ID | Type | Summary |
|---|---|---|
| HR-CPL-P1-001 | Defect | `course.activate` command surface incomplete at public API |
| HR-CPL-P1-002 | Gap | No compensation/performance product Actions |
| HR-CPL-P1-003 | Evidence gap | Drizzle parity not executed in audit session |
| HR-CPL-P1-004 | Standardize gap | Learning absent from sensitive-operation prefix register |
| HR-CPL-P2-002 | Phase residual | Compensation sensitive runner consolidation (Phase 2) |
| HR-XCUT-P1-006 | Cross-boundary | Money serialization at payroll handoff |

---

## OPEN-DECISION register (unchanged)

| ID | Topic | Cluster C impact |
|---|---|---|
| OPEN-DECISION-05 | Payroll money shape | Blocks HR-XCUT-P1-006 closure — Slice 8.7 |
| HR-XCUT-P0-002 | Effective-truth scope | Partial matrix rows for goal/review/certification — ratified exclusion |

No new OPEN-DECISION items opened in this audit.

---

## Conflict with enterprise claims

| Claim | Safe? | Reason |
|---|---|---|
| Phase 3 emission DONE for comp/perf/learning | **Yes** | Frozen matrix + CI — independent of domain-depth |
| Compensation domain audited (Slice 8.1) | **Yes** (depth) | This pack + scorecard update |
| Phase 8 compensation product complete | **No** | Actions, handoff parity, scaffold tables remain forward |
| Phase 9 performance/learning complete | **No** | Performance Actions absent; learning partial |
| Enterprise-ready HR module | **No** | Product surface + cross-cut blockers unchanged |
