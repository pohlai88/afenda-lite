# HR-AUD-01 — Cluster A scope

| Field | Value |
|---|---|
| Mission | **HR-AUD-01** — Workforce foundation cluster audit |
| Type | Audit only (no product edits) |
| Package | `@afenda/human-resources` |
| Audit date | 2026-07-24 |
| Prerequisite | HR-AUD-00 baseline pack (`00–04`) |
| Output home | `docs-V2/_scratch/erp/human-resources-enterprise-audit/cluster-a/` |

## Cluster boundary

| Folder | Domains | Store slice | Adapter slices |
|---|---|---|---|
| `src/workforce-foundation/` | person, worker, classification | `store/workforce-foundation.ts` | `adapters/{memory,drizzle}/workforce-foundation.ts` |
| `src/core/` | employee, employment, employment contract, assignment, organization context | `store/core.ts` | `adapters/{memory,drizzle}/core.ts` |
| `src/organization/` | department, job, position, reporting line | methods on `HumanResourcesCoreStore` | `adapters/{memory,drizzle}/organization.ts` |
| `src/lifecycle/` | onboarding, probation, confirmation, transfer, termination, offboarding | `store/lifecycle.ts` | `adapters/{memory,drizzle}/lifecycle.ts` |
| `src/recruitment/` | requisition, candidate, application, interview, offer | `store/recruitment.ts` | `adapters/{memory,drizzle}/recruitment.ts` |

Matching layers: `src/schemas/{workforce-foundation,core,org-context,organization,lifecycle,recruitment}.ts` · `shared/{core,lifecycle,recruitment}-command.ts` · `shared/employment-status.ts` · `shared/recruitment-status.ts` · `shared/recruitment-guards.ts`.

## Required domains (22)

person · worker · classification · employee · employment · employment contract · assignment · organization context · department · job · position · reporting line · onboarding · probation · confirmation · transfer · termination · offboarding · requisition · candidate · application · interview · offer

## Public surface inventory

| Metric | Count | Authority |
|---|---:|---|
| Cluster commands | **71** | `src/module-ids.ts` (excludes time/leave/comp/talent/compliance/ER/WFP) |
| Cluster queries | **50** | `src/module-ids.ts` |
| Emission registry coverage (cluster commands) | **6 / 71 (8.5%)** | `src/mutation-emission-registry.ts` |
| Covered commands | person create/update; worker create/change type/status; employee create | same |
| Cluster `hr_*` tables (direct) | **28** | `packages/data-plane/db/src/schema/human-resources.ts` |
| Effective-truth matrix rows (cluster tables) | **7 / 28** | `src/effective-truth-adoption.ts` |

## Out of scope

- leave, time, compensation, learning, performance, talent, compliance, employee-relations, workforce-planning (except where they consume Cluster A public contracts)
- Cross-cutting kernel re-audit (reference HR-AUD-00)
- Product repair implementation

## Verification evidence (2026-07-24)

```bash
pnpm --filter @afenda/human-resources typecheck
# Exit 2 — recruitment Drizzle adapter Candidate type mismatch (consent fields)

pnpm --filter @afenda/human-resources test -- \
  human-resources.core human-resources.foundation human-resources.organization \
  human-resources.lifecycle human-resources.recruitment position-occupancy \
  worker-foundation workforce-foundation
# Exit 1 — 13 files, 121 passed, 14 failed, 2 skipped
# Failed: human-resources.recruitment.test.ts (9)
#         human-resources.recruitment.parity.test.ts (4)
#         human-resources.lifecycle.parity.test.ts (1 transfer timestamp)
```

Parity with `REQUIRE_DATABASE_TESTS=1` ran as part of the combined vitest projects above (drizzle parity cases included in failed recruitment/lifecycle parity files).

## App composition (consume-only)

| Path | Role |
|---|---|
| `apps/web/lib/erp/human-resources-command-options.ts` | Composition root |
| `apps/web/lib/erp/human-resources-organization-dimension-port.ts` | `OrganizationDimensionDirectoryPort` → `@afenda/master-data` |
| `apps/web/features/human-resources/human-resources-shell.tsx` | `listEmployees`, `listCandidates` queries |
| `apps/web/app/(operator)/admin/human-resources/candidates/page.tsx` | Candidate admin surface |

No dedicated Server Actions for Cluster A mutations (HR-ENT-12 residual).

## Related artifacts

- Findings: [`01-domain-findings.md`](01-domain-findings.md)
- Matrix: [`02-aggregate-matrix.tsv`](02-aggregate-matrix.tsv)
- Conflicts: [`03-cluster-conflicts.md`](03-cluster-conflicts.md)
- Repair order: [`04-repair-readiness.md`](04-repair-readiness.md)
- Executive scorecard: [`../10-workforce-foundation-cluster.md`](../10-workforce-foundation-cluster.md)
