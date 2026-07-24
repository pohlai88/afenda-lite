# HR-AUD-00 — Authority map

| Field | Value |
|---|---|
| Mission | **HR-AUD-00** — Authority and cross-cutting baseline |
| Type | Audit only (no product edits) |
| Package | `@afenda/human-resources` |
| Audit date | 2026-07-24 |
| Phase 0 | **Exit MET** — Slice 0.1 CLOSED · Slice 0.2 RATIFIED · Slice 0.3 DONE ([`00.hrm.md`](../../00.hrm.md)) |
| Active mission queue | [`44-next-repair-mission.md`](44-next-repair-mission.md) → **HR-OPS-LEAVE-EMISSION-REGISTRY** (Slice 1.1 calendar **CLOSED**) |
| Output home | `docs-V2/_scratch/erp/human-resources-enterprise-audit/` |

## Authority tiers (this checkout)

| Tier | Source | Role in HR-AUD-00 |
|---|---|---|
| A1 | [`AGENTS.md`](../../../AGENTS.md) + `.cursor/rules/*` | Checkout posture; Scratch vs Living; no product edits this mission |
| A2 | [`docs-V2/_scratch/slice/enterprise.md`](../../slice/enterprise.md) | Active HR-ENT-01…19 gap matrix + phased strategy |
| A3 | [`docs-V2/_scratch/slice/final.md`](../../slice/final.md) | Sole wave/mission status index |
| A4 | Package + DB disk | [`packages/erp/human-resources`](../../../packages/erp/human-resources), [`packages/data-plane/db`](../../../packages/data-plane/db) |
| A5 | Supporting Scratch | See prior-audit currency below |
| Dormant | Living `docs/architecture/**`, ADR/TIP/FDR bodies | Absent by design until Docs-lane reopen — cite IDs as labels only |

**Living docs rule:** Do not treat missing `docs/architecture/ARCH-*` or ADR files as implementable SSOT.

## HR-ENT requirement inventory (gap matrix)

Source: [`enterprise.md`](../../slice/enterprise.md) gap matrix (2026-07-24).

| ID | Requirement | enterprise.md severity | HR-AUD-00 cross-cut note |
|---|---|---|---|
| HR-ENT-01 | Tenancy inventory accurate | Pass | 106 `hr_*` mutation tables align with hard-tenant registry |
| HR-ENT-02 | Lifecycle remains honest | Pass | `module.manifest.ts` → `lifecycle: scaffolded` |
| HR-ENT-03 | Person/worker foundation | Pass | Workforce foundation on disk; domain-cluster detail deferred |
| HR-ENT-04 | Deterministic historical org context | Major | Org-context query exists; dimension directory wiring is composition concern |
| HR-ENT-05 | Package-wide effective truth | Pass (focused) | Machine matrix covers **33** expected tables, not all **106** mutation tables |
| HR-ENT-06 | Contextual and field authorization | Major | Multiple parallel authz surfaces — see `01-cross-cutting-baseline.md` |
| HR-ENT-07 | Privacy, retention, legal hold | Major | Types/policies on disk; **privacy port not composed or consumed** |
| HR-ENT-08 | Shared workflow/tasks/approvals | Major | Platform boundary — `integrations/platform-facts.ts` |
| HR-ENT-09 | Document/e-signature capability | Major | Vault reference ports only |
| HR-ENT-10 | Integration and bulk data | Major | Attendance dry-run + platform events; no HR bulk framework |
| HR-ENT-11 | Reporting/read projections | Major | Platform search/event projections in apps/web modules |
| HR-ENT-12 | HR product surfaces | Major | Partial UI + Actions — inventory only here |
| HR-ENT-13 | HR operational readiness | Major | Out of cross-cut scope |
| HR-ENT-14 | Production attendance ingestion | Major | Fail-closed port at composition |
| HR-ENT-15 | Structural ownership singular | Pass | No duplicate root `store.ts` / `schemas.ts` in working tree |
| HR-ENT-16 | Domain depth | Major | Deferred to HR-AUD-01/02/03 |
| HR-ENT-17 | Module Enterprise Readiness evidence | Observation | Docs lane dormant |
| HR-ENT-18 | Package quality gates | Pass | `pnpm check:hr` cited in enterprise.md |
| HR-ENT-19 | Monorepo/module governance | Pass | Generated registers + `validate:modules` |

### Mission IDs (implementation waves — not gap rows)

| Mission group | Index |
|---|---|
| `HR-ENT-00-STABILIZE` … `HR-ENT-07-PRODUCT-OPS` | [`final.md`](../../slice/final.md) |
| `HR-ENT-05-PLATFORM-01` … `06` | Phase 5 capability ledger in final.md |
| `HR-ENT-06-DOMAIN-CORE-ORG-OCCUPANCY`, `HR-ENT-06-DOMAIN-LEAVE-ACCRUAL` | Phase 6 domain ledger in final.md |

## Prior Scratch audit currency

| Document | Date | Status | Reason |
|---|---|---|---|
| [`enterprise.md`](../../slice/enterprise.md) | 2026-07-24 | **Current (strategy)** | Active gap matrix; command/query counts **slightly stale** vs disk (see HR-XCUT-P1-003) |
| [`final.md`](../../slice/final.md) | 2026-07-24 | **Current (index)** | Wave closeouts; some structural cleanup rows predate working-tree cleanup |
| [`human-resources-implementation-audit.md`](../human-resources-implementation-audit.md) | 2026-07-21 | **Superseded** | Claims 43 `hr_*` tables, 2 commands — contradicts disk (106 tables, 286 commands) |
| [`human-resources-drizzle-adapter-audit.md`](../human-resources-drizzle-adapter-audit.md) | 2026-07-21 era | **Partial** | Adapter layout valid; table/command counts stale |
| [`human-resources-drizzle-adapter-migration.md`](../human-resources-drizzle-adapter-migration.md) | — | **Historical** | Migration narrative; verify paths against disk before use |
| [`human-resources-drizzle-adapter-validation.md`](../human-resources-drizzle-adapter-validation.md) | — | **Historical** | Validation record |
| [`human-resources-roadmap.md`](../human-resources-roadmap.md) | — | **Current (dev phases)** | HR0–HR16; points enterprise waves to final.md |
| [`human-resource.md`](../human-resource.md) | — | **Current (boundaries)** | Package/boundary ownership scratch |
| [`time.md`](../time.md), [`time-slices-roadmap.md`](../time-slices-roadmap.md), [`time-remaining.md`](../time-remaining.md) | — | **Current (Time domain)** | Cluster B authority companions |
| `packages/erp/human-resources/src/adapters/drizzle/AUDIT.md` | — | **Pointer only** | Redirects to Scratch drizzle audit |

**No** `HR-AUD-*` IDs existed before this mission. **No** dedicated `afenda-elite-human-resources` skill; payroll skill mirrors structural discipline only.

## Disk inventory — package kernel

| Path | Symbol / role |
|---|---|
| [`package.json`](../../../packages/erp/human-resources/package.json) | 10 export subpaths; no `./adapters/memory` |
| [`README.md`](../../../packages/erp/human-resources/README.md) | Diátaxis + domain map + tenancy counts |
| [`src/index.ts`](../../../packages/erp/human-resources/src/index.ts) | Root barrel: commands, schemas types, ports types, production helpers; **excludes** `resolve-store` |
| [`src/module.manifest.ts`](../../../packages/erp/human-resources/src/module.manifest.ts) | `band: R1-F`, `lifecycle: scaffolded`, authz maps, events |
| [`src/module-ids.ts`](../../../packages/erp/human-resources/src/module-ids.ts) | **286** commands, **141** queries (disk count 2026-07-24) |
| [`src/permissions.ts`](../../../packages/erp/human-resources/src/permissions.ts) | **99** permission codes |
| [`src/authorization.ts`](../../../packages/erp/human-resources/src/authorization.ts) | `HumanResourcesAuthorizationPort`, `HumanResourcesResourceAwareAuthorizationPort`, manifest-backed guards |
| [`src/command-options.ts`](../../../packages/erp/human-resources/src/command-options.ts) | Composition options + `require*` port helpers |
| [`src/ports.ts`](../../../packages/erp/human-resources/src/ports.ts) | Audit/outbox, document, currency, org-dimension, leave, attendance ports |
| [`src/production-ports.ts`](../../../packages/erp/human-resources/src/production-ports.ts) | SQL audit + event publisher adapters |
| [`src/resolve-store.ts`](../../../packages/erp/human-resources/src/resolve-store.ts) | Default Drizzle store resolver + module cache |
| [`src/types.ts`](../../../packages/erp/human-resources/src/types.ts) | Domain record/DTO shapes |
| [`src/brands.ts`](../../../packages/erp/human-resources/src/brands.ts) | Zod-branded entity IDs |
| [`src/error-codes.ts`](../../../packages/erp/human-resources/src/error-codes.ts) | Semantic HR error codes → `details.humanResourcesCode` |
| [`src/mutation-tables.ts`](../../../packages/erp/human-resources/src/mutation-tables.ts) | **106** sole-mutator tables |
| [`src/mutation-emission-registry.ts`](../../../packages/erp/human-resources/src/mutation-emission-registry.ts) | **88** command emission entries |
| [`src/effective-truth-adoption.ts`](../../../packages/erp/human-resources/src/effective-truth-adoption.ts) | Machine adoption matrix (**33** expected temporal tables) |
| [`src/privacy.ts`](../../../packages/erp/human-resources/src/privacy.ts) | Retention policies + `HumanResourcesPrivacyPort` |
| [`src/sensitive-operation-policies.ts`](../../../packages/erp/human-resources/src/sensitive-operation-policies.ts) | Prefix-based sensitive operation rules |
| [`src/shared/contextual-authorization.ts`](../../../packages/erp/human-resources/src/shared/contextual-authorization.ts) | Actor scopes, resource policies, field projection |
| [`src/shared/mutation-meta.ts`](../../../packages/erp/human-resources/src/shared/mutation-meta.ts) | Correlation, operation, idempotency meta |
| [`src/shared/effective-range.ts`](../../../packages/erp/human-resources/src/shared/effective-range.ts) | Shared range resolver |
| [`src/shared/effective-lineage.ts`](../../../packages/erp/human-resources/src/shared/effective-lineage.ts) | Shared lineage resolver |
| [`src/integrations/platform-facts.ts`](../../../packages/erp/human-resources/src/integrations/platform-facts.ts) | HR → platform fact projections |
| [`src/schemas/index.ts`](../../../packages/erp/human-resources/src/schemas/index.ts) | Zod schema barrel (14 domain shards) |
| [`src/store/index.ts`](../../../packages/erp/human-resources/src/store/index.ts) | `HumanResourcesStore` intersection (15 domain store types; org methods live under `core`) |
| [`src/adapters/drizzle/store.ts`](../../../packages/erp/human-resources/src/adapters/drizzle/store.ts) | Drizzle compose root (**16** slices incl. organization) |
| [`src/adapters/memory/store.ts`](../../../packages/erp/human-resources/src/adapters/memory/store.ts) | Memory compose root (mirrors Drizzle slices) |
| [`src/adapters/*/coverage.ts`](../../../packages/erp/human-resources/src/adapters/memory/coverage.ts) | Compile-time Memory/Drizzle completeness guards |
| [`scripts/*.mjs`](../../../packages/erp/human-resources/scripts) | Time shard maintenance (3 scripts + fragment txt) |

## Disk inventory — database

| Path | Role |
|---|---|
| [`packages/data-plane/db/src/schema/human-resources.ts`](../../../packages/data-plane/db/src/schema/human-resources.ts) | Drizzle HR schema |
| [`packages/data-plane/db/src/hard-tenant-roots.ts`](../../../packages/data-plane/db/src/hard-tenant-roots.ts) | **106** `hr_*` hard-tenant roots (179 total repo roots) |
| [`packages/data-plane/db/drizzle/0001_hr_work_calendar.sql`](../../../packages/data-plane/db/drizzle/0001_hr_work_calendar.sql) … `0008_hr_workforce_foundation.sql` | Baseline HR migration chain (later journals may exist on branch) |
| [`packages/data-plane/db/__tests__/hr-*`](../../../packages/data-plane/db/__tests__) | HR migration contract tests |

## Disk inventory — apps/web composition

| Path | Role |
|---|---|
| [`apps/web/lib/erp/human-resources-command-options.ts`](../../../apps/web/lib/erp/human-resources-command-options.ts) | Production command options wiring |
| [`apps/web/lib/erp/human-resources-*-port.ts`](../../../apps/web/lib/erp) | Authorization, identity, org dimensions, work calendar, leave, attendance, document ports |
| [`apps/web/app/actions/hr-time.ts`](../../../apps/web/app/actions/hr-time.ts) | Time Server Actions |
| [`apps/web/app/actions/hr-learning.ts`](../../../apps/web/app/actions/hr-learning.ts) | Learning Server Actions |
| [`apps/web/app/actions/hr-operations.ts`](../../../apps/web/app/actions/hr-operations.ts) | Operations Server Actions |
| [`apps/web/app/actions/hr-self-service.ts`](../../../apps/web/app/actions/hr-self-service.ts) | Self-service Server Actions |
| [`apps/web/app/actions/hr-mutation-context.ts`](../../../apps/web/app/actions/hr-mutation-context.ts) | Mutation context stamping |
| [`apps/web/features/human-resources/*`](../../../apps/web/features/human-resources) | Partial HR UI shell |
| [`apps/web/modules/platform/domain/human-resources-platform-events.ts`](../../../apps/web/modules/platform/domain/human-resources-platform-events.ts) | Platform event handlers |
| [`apps/web/modules/platform/domain/human-resources-search-projection.ts`](../../../apps/web/modules/platform/domain/human-resources-search-projection.ts) | Search projection |

## Disk inventory — tests and fixtures

| Path | Role |
|---|---|
| [`packages/erp/human-resources/__tests__/`](../../../packages/erp/human-resources/__tests__) | Unit + parity suites (~38 unit files cited in enterprise.md) |
| [`packages/erp/human-resources/__tests__/helpers/`](../../../packages/erp/human-resources/__tests__/helpers) | Parity harness, memory auth, drizzle org dims |
| [`packages/erp/human-resources/src/testing/`](../../../packages/erp/human-resources/src/testing) | Memory store + test port factories |
| Key cross-cut tests | `effective-truth-adoption.test.ts`, `memory-coverage.test.ts`, `drizzle-coverage.test.ts`, `contextual-authorization-privacy.test.ts`, `correlation-integrity.test.ts` |

## Governance registers (read-only references)

| Register | Path |
|---|---|
| Schema ownership | [`docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml`](../../modules/SCHEMA-OWNERSHIP-MANIFEST.yaml) |
| Generated table/command/query/permission registers | `docs-V2/modules/*-REGISTER*.yaml` |
| Module catalog | [`docs-V2/modules/MODULE-CATALOG.generated.yaml`](../../modules/MODULE-CATALOG.generated.yaml) |

## Count reconciliation (disk 2026-07-24 · Slice 0.3)

| Metric | Scratch pack + README | Disk | Match |
|---|---:|---:|---|
| `hr_*` mutation tables | 106 | 106 | Yes |
| Hard-tenant `hr_*` roots | 106 | 106 | Yes |
| Commands | 286 | 286 | Yes |
| Queries | 141 | 141 | Yes |
| Permissions | 99 | 99 | Yes |
| Emission registry entries | 88 | 88 | Yes |
| Effective-truth expected tables | 33 classified | 33 | Yes (scope narrower than 106 tables) |

| Residual hygiene | Notes |
|---|---|
| `docs-V2/_scratch/slice/enterprise.md` | Still cites 284 / 138 / 98 — **HR-XCUT-P1-003** only; does not reopen Phase 0 |
| Slice 0.1 closed IDs | Not active blockers — see [`41`](41-consolidated-conflict-register.md) · [`44`](44-next-repair-mission.md) |
| OPEN-DECISION-01…05, A1…A3, C1 | **RATIFIED** Slice 0.2 — implementation remains with owner missions |

## Domain-cluster audit routing

Cross-cutting baseline (**this mission**) feeds three cluster audits with identical contract ([`04-domain-cluster-audit-contract.md`](04-domain-cluster-audit-contract.md)):

| Cluster | Mission | Domains |
|---|---|---|
| A | HR-AUD-01 | workforce-foundation, core, organization, lifecycle, recruitment |
| B | HR-AUD-02 | time, leave |
| C | HR-AUD-03 | compensation-benefits, performance, learning, talent, compliance, employee-relations, workforce-planning |

## HR-AUD-05 — Architecture composition and dual scores (2026-07-24)

| Artifact | Role |
|---|---|
| [`45-architecture-composition-and-dual-scores.md`](45-architecture-composition-and-dual-scores.md) | Composed architecture, capability inventory, live verification, Product/Coding rollup |
| [`46-dual-score-matrix.tsv`](46-dual-score-matrix.tsv) | Machine-readable per-domain and cross-cut scores (/10) + priority queue |

**Rollup (live verify 2026-07-24):** Product **48/100 (F)** · Coding **74/100 (C)** — partially implemented; typecheck green since AUD-04 snapshot.

**Phase 0 (Slice 0.3):** Authority artifacts mutually consistent with Slice 0.1 CLOSED + Slice 0.2 RATIFIED; next vertical = calendar fixtures (not a reopening of closed IDs).
