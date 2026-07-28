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

This Scratch report reconciles the current implementation with the enterprise roadmap. Phases 0–12 are locally implemented. Phase 13 remediation remains open. The current working tree contains the production scheduler/claim/acknowledgement path, but durable scheduled bulk import/export handling and same-revision full-suite/live-parity evidence are not closed. This report does not grant external security/privacy approval, production-scale performance certification, signed recovery certification, controlled module-readiness approval, or lifecycle promotion.

## Evidence ledger

Historical counts are explicitly labelled. Before implementation, this audit reproduced HR typecheck, modified HR tests **39/39**, and focused web reliability tests **9/9**. Its initial full-suite attempt timed out; after implementation, the complete HR unit lane passed **95 files / 978 tests**. Focused live parity passed Memory and failed Drizzle at the expected pre-migration boundary because migration `0039` has not been applied to the shared production branch.

| Lane | Result | What it establishes |
|---|---:|---|
| `pnpm test:hr:unit` | **Current: 95 files / 978 passed** | Full local unit behavior on the implemented working tree |
| `$env:REQUIRE_DATABASE_TESTS = "1"; focused reliability parity` | **Memory passed / Drizzle blocked before create** | Neon environment validation passed 15/15; Drizzle returned `Failed to find reliability work` because migration `0039` is not applied |
| Phase 11 focused web lane | **52 passed** | Admin, ESS, MSS, recruitment, operations and compensation journey composition and authorization |
| Phase 12–13 focused web lane | **64 passed** | Reporting/import, bulk export, payroll delivery, reliability and Phase 13 composition |
| Privacy telemetry focused lane | **4 files / 24 passed** | Package and web Actions record privacy outcomes; privacy queries also record denial and privacy commands record shared command outcome/duration without changing domain `Result` semantics |
| Performance verification focused lane | **1 file / 3 passed** | All eight local workloads use real HR memory-store, domain-kernel, or bulk-pipeline paths; scope remains `local_verification_only` and is not production-scale certification |
| Outer permission-denial focused lane | **1 file / 3 passed** | HR Actions opt into explicit area-specific denial telemetry at the shared permission gate; telemetry failure cannot replace the governed `FORBIDDEN` result |
| Parity reporter focused lane | **1 file / 3 passed** | The dedicated live Memory/Drizzle Vitest gate emits `hr.parity.failure.total` and `hr.parity.failed` on failed or unhandled runs; passing runs emit no failure signal |
| `pnpm --filter @afenda/human-resources typecheck` | **Passed** | HR package contracts |
| `pnpm --filter @afenda/web typecheck` | **Passed** | Web Action and worker composition |
| `pnpm --filter @afenda/events typecheck` | **Passed** | Event contract integration |
| `pnpm --filter @afenda/db typecheck` | **Passed** | Schema and migration-host contracts |
| `pnpm --filter @afenda/events test` | **8 files / 49 passed** | Event contracts, including platform HR integration events |
| `pnpm --filter @afenda/db test` | **52 files passed; 1 CA file failed (191/192 tests)** | HR scheduler migration test passed; unrelated CA retirement test rejects working-tree migrations `0034` and `0037` |
| `pnpm validate:modules:write` | **Blocked by 83 CA findings** | Generated registers were refreshed and HR permission/catalog findings are closed; remaining findings are Corporate Administration tables, events, permissions, and ownership |
| Database migration scope | **Historical HR capability DDL through 0032; scheduler DDL at 0039** | CA migrations `0034`–`0038` and HR scheduler migration `0039` exist in the working tree; no claim is made that no forward migrations are pending |
| `pnpm audit:tenancy-nulls` | **260 roots / 245 audited / 15 skipped** | Passed; all 136 HR roots audited, while 15 unrelated CA roots are pending DDL |

The HR inventory is **348 commands**, **198 queries**, **113 permissions**, **136 HR hard-tenant roots**, **136/136 effective-truth classifications**, and **348/348 mutation-emission classifications**.

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
- [Reliability cron route](../../../../apps/web/app/api/cron/hr-reliability/route.ts)
- [Reliability operator Actions](../../../../apps/web/app/actions/hr-reliability.ts)
- [Reliability scheduler migration](../../../../packages/data-plane/db/drizzle/0039_hr_reliability_scheduler.sql)
- [HR observability adapter](../../../../apps/web/modules/platform/observability/human-resources-observability.ts)
- [Performance verification workloads and harness](../../../../packages/erp/human-resources/src/performance-verification/)
- [Recovery verification drills and harness](../../../../packages/erp/human-resources/src/recovery-verification/)
- [Operational recovery runbooks](44-operational-recovery-runbooks.md)

## Recorded Product Score — 90 / 100

This score predates the current scheduler changes and remains historical until the shipping-revision gates are recaptured. It is not equivalent to enterprise certification.

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
| Security and privacy | 8 / 10 | Local negative, projection, export, cryptographic audit-tamper and privacy checks exist; independent approval is absent. |
| Operational certification | 6 / 10 | Harnesses and runbooks exist; production-scale benchmarks and signed drills have not been supplied. |

**Product gate result:** **Met locally.** Certification remains **not ready**.

## Recorded Coding Score — 93 / 100

This score predates the current scheduler changes and remains historical until the shipping-revision gates are recaptured. It does not authorize lifecycle promotion.

| Dimension | Score | Evidence and deduction |
|---|---:|---|
| Package boundaries and typed contracts | 10 / 10 | Ports, strict schemas, declared exports and no payroll-calculation leakage. |
| Authorization and privacy enforcement | 10 / 10 | Unified contextual facade, field projection and domain bypass tests. |
| Audit, event and correlation integrity | 10 / 10 | 348/348 mutation outcomes classified with fail-closed evidence paths. |
| Memory adapter completeness | 10 / 10 | Deterministic stores cover the full domain and reliability kernels. |
| Drizzle adapter and parity | 10 / 10 | Full live lane records 38 files and 369 passes; the only skip is explicitly adapter-specific rather than a hidden database suite. |
| Tenancy and database integrity | 10 / 10 | Historical score: 136 HR roots, HR capability migrations through 0032, baseline database evidence through 0033, and the then-current null-audit evidence. Working-tree migrations 0034–0039 require recertification. |
| Automated test depth | 10 / 10 | 966 unit passes, 369 live parity passes and focused web lanes. |
| Reliability and observability | 8 / 10 | Fair claims, leases, acknowledgement states, bounded cron execution, retry/dead-letter, metrics and recovery controls exist; durable scheduled bulk import/export and production certification remain open. |
| Documentation and recovery | 8 / 10 | Roadmap, package guide and eight recovery runbooks are linked; signed drill results are absent. |
| Clean gates and lifecycle honesty | 7 / 10 | Named typecheck lanes pass and lifecycle remains honestly `scaffolded`; same-revision external/controlled approval is absent. |

**Coding gate result:** **Met locally.** Certification remains **not ready**.

## Remaining certification gates

The scheduler architecture decision is now implemented for composed operations. The following implementation, evidence, external, and controlled gates remain:

1. Add authoritative durable request records and real scheduled handlers for bulk import/export. Production registration currently fails closed instead of accepting these uncomposed operations.
2. Obtain independent security approval, including cross-tenant penetration, privilege escalation, export authorization, document-reference and audit-tamper review.
3. Obtain independent privacy approval, including processor/subprocessor boundaries and review of subject export, legal hold, retention, anonymization and deletion decisions.
4. Execute all eight Phase 13 workloads with approved representative production-scale fixtures and thresholds; retain regression evidence.
5. Execute the migration, outbox, payroll delivery, attendance, privacy incident, data correction, tenant leakage and rollback runbooks; record sanitized RTO/RPO evidence and approver sign-off.
6. Record same-revision CI/deploy and applicable operational-control evidence required by the module-readiness lane.
7. Open the controlled Docs/module-readiness lane and obtain explicit approval before changing `src/module.manifest.ts` from `scaffolded`. This Scratch report cannot authorize that change.

## Check coverage

```text
Applicable certification control groups:       13
Groups with local implementation evidence:      12
Local automated lanes recorded as passed:       10
Groups still requiring external approval:        2
Groups still requiring operational execution:    2
Unevaluated controlled lifecycle promotion:       1
Coverage status: Bulk reliability composition and same-revision evidence open; enterprise certification incomplete
```

## References

- [Program roadmap](../../00.hrm.md)
- [Operational recovery runbooks](44-operational-recovery-runbooks.md)
- [Historical architecture and dual scores](45-architecture-composition-and-dual-scores.md)
- [`@afenda/human-resources` package README](../../../../packages/erp/human-resources/README.md)
- [Tenancy Scratch pack](../../../tenancy/README.md)
- [Testing authority](../../../../testing/README.md)
