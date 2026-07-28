# Current HR implementation evidence and dual scores

**Evidence date:** 2026-07-28
**Scope:** local implementation and approved Neon-branch verification
**Manifest lifecycle:** `scaffolded`
**Enterprise certification:** **Not ready**

**Current-status marker (2026-07-28):** This report supersedes
[`43-repair-roadmap.md`](43-repair-roadmap.md),
[`45-architecture-composition-and-dual-scores.md`](45-architecture-composition-and-dual-scores.md),
and [`46-dual-score-matrix.tsv`](46-dual-score-matrix.tsv) for current
implementation status, open gates, and package-level scores. Those files remain
historical audit and architecture provenance.

This Scratch report reconciles the current implementation with the enterprise roadmap. Phases 0–12 are implemented and locally verified. Phase 13 implementation assets exist, but this report does not grant external security/privacy approval, production-scale performance certification, signed recovery certification, controlled module-readiness approval, or lifecycle promotion.

## Measured evidence ledger

| Lane | Result | What it establishes |
|---|---:|---|
| `pnpm test:hr:unit` | **961 passed / 1 skipped** | Current package unit behavior; the recorded skip remains visible |
| `$env:REQUIRE_DATABASE_TESTS = "1"; pnpm test:hr:parity` | **37 files / 368 passed / 1 skipped** | Full live Memory/Drizzle parity on the approved branch; the recorded skip remains visible |
| Phase 11 focused web lane | **52 passed** | Admin, ESS, MSS, recruitment, operations and compensation journey composition and authorization |
| Phase 12–13 focused web lane | **64 passed** | Reporting/import, bulk export, payroll delivery, reliability and Phase 13 composition |
| `pnpm --filter @afenda/human-resources typecheck` | **Passed** | HR package contracts |
| `pnpm --filter @afenda/web typecheck` | **Passed** | Web Action and worker composition |
| `pnpm --filter @afenda/events typecheck` | **Passed** | Event contract integration |
| `pnpm --filter @afenda/db typecheck` | **Passed** | Schema and migration-host contracts |
| Database migration verification | **Repository ledger applied through 0033; HR implementation migrations through 0032** | Payroll delivery, platform work items and bulk reliability durability are present; `0033_schema_reconciliation` is a repository ledger repair with no `hr_*` DDL |
| `pnpm audit:tenancy-nulls` | **245 roots / 243 audited / 2 skipped** | Current hard-tenant inventory; the two skips are unrelated pending-DDL roots, not HR roots silently omitted |

The HR inventory is **348 commands**, **198 queries**, **111 permissions**, **136 HR hard-tenant roots**, **136/136 effective-truth classifications**, and **348/348 mutation-emission classifications**.

## Implemented product and worker composition

Phase 11 journeys:

- [Admin journeys](../../../../apps/web/app/actions/hr-admin-journeys.ts)
- [Employee self-service journeys](../../../../apps/web/app/actions/hr-self-service-journeys.ts)
- [Manager self-service journeys](../../../../apps/web/app/actions/hr-manager-journeys.ts)
- [Recruitment journeys](../../../../apps/web/app/actions/hr-recruitment.ts)
- [HR operations journeys](../../../../apps/web/app/actions/hr-operations.ts)
- [Compensation journeys](../../../../apps/web/app/actions/hr-compensation.ts)

Phase 12 reporting, bulk and integration composition:

- [Reporting and bulk-import Actions](../../../../apps/web/app/actions/hr-reporting-bulk.ts)
- [Reporting and bulk-import worker](../../../../apps/web/lib/erp/human-resources-reporting-bulk-worker.ts)
- [Bulk-export Actions](../../../../apps/web/app/actions/hr-bulk-export.ts)
- [Bulk-export worker](../../../../apps/web/lib/erp/human-resources-bulk-export-worker.ts)
- [Bulk-export registry](../../../../apps/web/lib/erp/human-resources-bulk-export-registry.ts)
- [Payroll-delivery migration](../../../../packages/data-plane/db/drizzle/0030_hr_payroll_handoff_delivery.sql)
- [Platform-work-item migration](../../../../packages/data-plane/db/drizzle/0031_platform_work_items.sql)
- [Bulk-reliability migration](../../../../packages/data-plane/db/drizzle/0032_hr_bulk_reliability_durability.sql)

Phase 13 local implementation assets:

- [Payroll-delivery Actions](../../../../apps/web/app/actions/hr-payroll-delivery.ts)
- [Payroll-delivery worker](../../../../apps/web/modules/platform/domain/human-resources-payroll-delivery.ts)
- [Privacy-deletion Actions](../../../../apps/web/app/actions/hr-privacy-deletion.ts)
- [Privacy-deletion composition](../../../../apps/web/lib/erp/human-resources-privacy-deletion.ts)
- [Reliability worker](../../../../apps/web/modules/platform/domain/human-resources-reliability-worker.ts)
- [HR observability adapter](../../../../apps/web/modules/platform/observability/human-resources-observability.ts)
- [Performance verification workloads and harness](../../../../packages/erp/human-resources/src/performance-verification/)
- [Recovery verification drills and harness](../../../../packages/erp/human-resources/src/recovery-verification/)
- [Operational recovery runbooks](44-operational-recovery-runbooks.md)

## Product Score — 90 / 100

The Product Score measures implemented enterprise capability, product composition and current verification. The roadmap threshold of **85** is met at the local evidence layer; it is not equivalent to enterprise certification.

| Dimension | Score | Evidence and deduction |
|---|---:|---|
| Workforce foundation and organization | 10 / 10 | Deep package model, historical truth and Admin composition verified. |
| Recruitment and lifecycle | 10 / 10 | Recruitment, hire and lifecycle journeys plus live parity are green. |
| Leave, time and attendance | 10 / 10 | Policy, request, attendance, timesheet, overtime and connector paths are implemented and verified. |
| Compensation, benefits and payroll boundary | 9 / 10 | Exact-money contracts and durable payroll delivery are verified; external payroll operational certification is open. |
| Performance, learning and talent | 9 / 10 | Domain depth and career/succession parity are present; representative production performance certification is open. |
| Compliance, employee relations and workforce planning | 9 / 10 | Governance semantics and parity are green; external security/privacy approval is open. |
| Product composition | 10 / 10 | Six canonical journey surfaces and 52 focused web tests are present. |
| Reporting, bulk, search and integrations | 9 / 10 | Durable workers and integrations are composed; production operational sign-off is open. |
| Security and privacy | 8 / 10 | Local negative, projection, export and privacy checks exist; independent approval is absent. |
| Operational certification | 6 / 10 | Harnesses and runbooks exist; production-scale benchmarks and signed drills have not been supplied. |

**Product gate result:** **Met locally.** Certification remains **not ready**.

## Coding Score — 93 / 100

The Coding Score measures architecture, typed boundaries, adapter parity, automated verification and operational implementation. The roadmap threshold of **90** is met at the local evidence layer; it does not authorize lifecycle promotion.

| Dimension | Score | Evidence and deduction |
|---|---:|---|
| Package boundaries and typed contracts | 10 / 10 | Ports, strict schemas, declared exports and no payroll-calculation leakage. |
| Authorization and privacy enforcement | 10 / 10 | Unified contextual facade, field projection and domain bypass tests. |
| Audit, event and correlation integrity | 10 / 10 | 348/348 mutation outcomes classified with fail-closed evidence paths. |
| Memory adapter completeness | 10 / 10 | Deterministic stores cover the full domain and reliability kernels. |
| Drizzle adapter and parity | 10 / 10 | Full live lane records 37 files and 368 passes. |
| Tenancy and database integrity | 10 / 10 | 136 HR roots, HR implementation migrations through 0032, repository ledger through 0033, and current null-audit evidence. |
| Automated test depth | 10 / 10 | 961 unit passes, 368 live parity passes and focused web lanes. |
| Reliability and observability | 8 / 10 | Bounded retry, dead-letter, metrics and recovery implementations exist; production operations are not certified. |
| Documentation and recovery | 8 / 10 | Roadmap, package guide and eight recovery runbooks are linked; signed drill results are absent. |
| Clean gates and lifecycle honesty | 7 / 10 | Named typecheck lanes pass and lifecycle remains honestly `scaffolded`; same-revision external/controlled approval is absent. |

**Coding gate result:** **Met locally.** Certification remains **not ready**.

## Remaining certification gates

Implementation blockers previously listed for typechecks, migrations, payroll-delivery durability, broad live parity and product composition are closed by the evidence above. The remaining gates require authority or operational evidence not supplied by local implementation:

1. Obtain independent security approval, including cross-tenant penetration, privilege escalation, export authorization, document-reference and audit-tamper review.
2. Obtain independent privacy approval, including processor/subprocessor boundaries and review of subject export, legal hold, retention, anonymization and deletion decisions.
3. Execute all eight Phase 13 workloads with approved representative production-scale fixtures and thresholds; retain regression evidence.
4. Execute the migration, outbox, payroll delivery, attendance, privacy incident, data correction, tenant leakage and rollback runbooks; record sanitized RTO/RPO evidence and approver sign-off.
5. Record same-revision CI/deploy and applicable operational-control evidence required by the module-readiness lane.
6. Open the controlled Docs/module-readiness lane and obtain explicit approval before changing `src/module.manifest.ts` from `scaffolded`. This Scratch report cannot authorize that change.

## Check coverage

```text
Applicable certification control groups:       13
Groups with local implementation evidence:      13
Local automated lanes recorded as passed:       10
Groups still requiring external approval:        2
Groups still requiring operational execution:    2
Unevaluated controlled lifecycle promotion:       1
Coverage status: Local implementation complete; enterprise certification incomplete
```

## References

- [Program roadmap](../../00.hrm.md)
- [Operational recovery runbooks](44-operational-recovery-runbooks.md)
- [Historical architecture and dual scores](45-architecture-composition-and-dual-scores.md)
- [`@afenda/human-resources` package README](../../../../packages/erp/human-resources/README.md)
- [Tenancy Scratch pack](../../../tenancy/README.md)
- [Testing authority](../../../../testing/README.md)
