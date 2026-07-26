# HR-AUD-06 — Cluster C scope (compensation · performance · learning)

| Field | Value |
|---|---|
| Mission | **HR-AUD-06 domain-depth** (Slice 8.1) |
| Cluster | **C subset** — compensation-benefits, performance, learning only |
| Type | Audit only (no product edits) |
| Package | `@afenda/human-resources` |
| Audit date | 2026-07-26 |
| Finding prefix | `HR-CPL-P{0\|1\|2\|3}-###` |
| Prerequisite | HR-AUD-00 baseline pack (`00–04`) |
| Emission matrix | Consume-only — [`HR-AUD-06-COMPENSATION-PERFORMANCE-LEARNING.md`](../HR-AUD-06-COMPENSATION-PERFORMANCE-LEARNING.md) (Phase 3 classification; not rewritten) |
| Output home | `docs-V2/_scratch/erp/human-resources-enterprise-audit/cluster-c/` |

## Cluster boundary

This pack is a **three-domain subset** of AUD-00 Cluster C. Talent, compliance, employee-relations, and workforce-planning remain in [`30-governance-risk-planning-cluster.md`](../30-governance-risk-planning-cluster.md) (HR-AUD-03 Prompt 2C).

| Folder | Domain | Store slice | Adapter slices |
|---|---|---|---|
| `src/compensation-benefits/` | compensation-benefits | `store/compensation.ts` | `adapters/{memory,drizzle}/compensation-benefits.ts` |
| `src/performance/` | performance | `store/performance.ts` | `adapters/{memory,drizzle}/performance.ts` |
| `src/learning/` | learning | `store/learning.ts` | `adapters/{memory,drizzle}/learning.ts` |

Matching layers: `src/schemas/{compensation,performance,learning}.ts` · `shared/{compensation,performance,learning}-command.ts` · `shared/authorization-policies/{compensation,performance,learning}.ts` · `emissions/domains/{compensation,performance,learning}.ts`, including certification/completion Learning emissions.

## Command / query inventory (disk 2026-07-26)

| Surface | Compensation-benefits | Performance | Learning† | Subset total |
|---|---:|---:|---:|---:|
| Mutations | **21** (`HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMAND_IDS`) | **30** (`HUMAN_RESOURCES_PERFORMANCE_COMMAND_IDS`) | **15** (11 learning + completion + 3 certification) | **66** |
| Queries | **3** (handoff + proposal get/list) | **9** | **8** | **20** |
| Permission codes | 7 | 6 | 2 | **15** |

† Learning mutations include `completion.record` and `certification.{issue,revoke,expire}` under `src/learning/` but outside `HUMAN_RESOURCES_LEARNING_COMMAND_IDS` array.

**Compensation proposal note:** three proposal commands (`compensation-proposal.create|amend|approve`) are in `module-ids.ts` and Slice 6.6 DDL; frozen Phase 3 emission matrix predates proposal rows — inventory observation only ([`01-domain-findings.md`](01-domain-findings.md) HR-CPL-P2-003).

## Database tables (implemented vs scaffold)

**Compensation / benefits (7 full + 2 scaffold):** `hr_compensation_grade`, `hr_salary_band`, `hr_employee_compensation`, `hr_benefit_plan`, `hr_benefit_enrollment`, `hr_compensation_review`, `hr_compensation_proposal` · scaffold: `hr_benefit_eligibility`, `hr_compensation_review_cycle`

**Performance (9 full):** `hr_performance_cycle`, `hr_performance_cycle_participant`, `hr_performance_goal`, `hr_performance_goal_progress`, `hr_performance_review`, `hr_performance_review_participant`, `hr_performance_assessment`, `hr_performance_improvement_plan`, `hr_performance_improvement_checkpoint`

**Learning (5 full + 4 scaffold):** `hr_learning_course`, `hr_learning_session`, `hr_learning_assignment`, `hr_learning_completion`, `hr_employee_certification` · scaffold: `hr_learning_program`, `hr_learning_attendance`, `hr_learning_assessment`, `hr_development_plan`

Authority: `packages/data-plane/db/src/schema/human-resources.ts` · hard-tenant roots in `packages/data-plane/db/src/hard-tenant-roots.ts`.

## Effective-truth adoption (subset)

In matrix (`src/effective-truth-adoption.ts`): `hr_compensation_grade`, `hr_salary_band`, `hr_employee_compensation`, `hr_benefit_plan`, `hr_benefit_enrollment`, `hr_compensation_review`, `hr_learning_course` (operational-definition), `hr_learning_session` (scheduled-definition), `hr_performance_cycle`.

Excluded / scaffold: proposal table, goal/review/improvement operational rows, certification/completion — see HR-XCUT-P0-002 consumption.

## Emission registry (consume-only)

Phase 3 classifies the frozen cluster matrix across Compensation, Performance, and Learning. Canonical domain packs are `emissions/domains/compensation.ts`, `performance.ts`, and `learning.ts`; certification/completion are owned by the Learning pack.

**Do not** treat emission-matrix DONE as domain-depth DONE — this pack scores contract, correctness, authz, parity, and product evidence separately.

## Out of scope

- Talent, compliance, employee-relations, workforce-planning (HR-AUD-03)
- Privacy emission trio (`privacy.*` commands)
- Slice 8.2–8.9 / 9.x product implementation
- Payroll gross-to-net inside HR
- Rewriting Phase 3 emission matrix file

## Verification evidence (2026-07-26)

```bash
pnpm --filter @afenda/human-resources typecheck
# Exit 0

pnpm --filter @afenda/human-resources test -- compensation performance learning
# Exit 0 — 6 files, 70 passed, 14 skipped (drizzle parity gated on REQUIRE_DATABASE_TESTS / DATABASE_URL)
```

Test files executed:

| Domain | Unit | Memory parity | Drizzle parity |
|---|---|---|---|
| compensation-benefits | `compensation-benefits.test.ts` | `human-resources.compensation-benefits.parity.test.ts` | same file `describe.skipIf(!runDrizzleParity)` |
| performance | `human-resources.performance.test.ts` | `human-resources.performance.parity.test.ts` | same |
| learning | `human-resources.learning.test.ts` | `human-resources.learning.parity.test.ts` | same |

## App composition (consume-only)

| Path | Role |
|---|---|
| `apps/web/app/actions/hr-learning.ts` | **15** Server Actions (course, session, assignment, completion, certification) |
| `apps/web/lib/erp/human-resources-command-options.ts` | Composition root |
| `apps/web/app/actions/hr-compensation.ts` | **Absent** |
| `apps/web/app/actions/hr-performance.ts` | **Absent** |
| `apps/web/features/human-resources/**` | No compensation/performance/learning feature farms |

## Related artifacts

- Findings: [`01-domain-findings.md`](01-domain-findings.md)
- Matrix: [`02-aggregate-matrix.tsv`](02-aggregate-matrix.tsv)
- Conflicts: [`03-cluster-conflicts.md`](03-cluster-conflicts.md)
- Repair order: [`04-repair-readiness.md`](04-repair-readiness.md)
- Executive scorecard: [`../35-compensation-performance-learning-cluster.md`](../35-compensation-performance-learning-cluster.md)
