# Human Resources development roadmap

| Field | Value |
| ----- | ----- |
| Surface | `docs-V2/_scratch/erp/human-resources-roadmap.md` |
| Mode | Scratch ops — agent sequencing |
| Bounded context | `@afenda/human-resources` only |
| Architecture authority | [human-resource.md](./human-resource.md) |
| Scaffold authority | [SCAFFOLDING.md](../../packages/erp/SCAFFOLDING.md) |
| Reference implementation | `packages/erp/sales/src/` |
| Baseline snapshot | 2026-07-21 — `lifecycle: scaffolded` |

**Why a separate file:** [human-resource.md](./human-resource.md) is bounded-context architecture (what/why). This document is **how/when** — phased slices, verify commands, and Path to 100%. Do not duplicate the architecture body here.

---

## Executive summary

`@afenda/human-resources` is **governance-complete at scaffold** (43 mutation tables, 16 events, 20 permissions, folder markers) but **behavior-empty** (zero commands/queries, empty store, empty authorization map, minimal DDL columns). Payroll remains a **downstream consumer** via events and app-injected ports — never peer-imported from HR.

Phases **HR0–HR16** walk scaffolded → enterprise production compliance. Phases **HR9 (GATE-TL)** and **HR12–HR13** resolve the deliberate gap: `src/time/`, `leave/`, `performance/`, `talent/` exist on disk and aggregates are listed in `mutation-tables.ts`, but **no `hr_*` DDL** for those domains appears in scratch §2–§5 or the 43-table manifest.

**`lifecycle: active` flip** happens only in **HR16** after SCAFFOLDING §3 non-negotiables are met (manifest command/query ids, authorization maps, `Result<T>` public API, domain tests, app composition root). Until then the catalog stays `scaffolded`.

---

## Hard stops (every phase)

| Stop | Rule |
| ---- | ---- |
| Peer ERP imports | No `@afenda/payroll`, `@afenda/payments`, `@afenda/accounting` in `packages/erp/human-resources` |
| Payroll boundary | No gross-to-net, no `payroll_*` writes, no payslip calculation in HR |
| Finance boundary | No `payment`, `journal`, `journal_line` writes from HR |
| Shims | No throw-TODO commands, no empty store pretending to persist |
| Master data | Reference `md_party` / masters via lookup port — no shadow employee vendor tables |
| Integration | Cross-module effects via `OutboxPort` + `apps/web` saga — not package imports |

---

## Gap matrix — scaffold vs scratch vs SCAFFOLDING

| Dimension | On disk today | Scratch target | SCAFFOLDING § expectation | Gap |
| --------- | ------------- | -------------- | ------------------------- | --- |
| **Package folder** | `packages/erp/human-resources/` | Same | Minimal transactional layout | ✅ Present |
| **Manifest** | `lifecycle: scaffolded`; 43 tables; 16 emits; auth maps `{}` | `lifecycle: active` when ready | Commands/queries + auth maps required for `active` | ❌ Commands/queries/auth |
| **Mutation tables** | 43 `hr_*` (core → C&B) | Same 43 in scratch §2–§5 | Parity with SCHEMA-OWNERSHIP-MANIFEST | ✅ Registered |
| **Time / leave / perf / talent DDL** | Folder markers only; aggregates in manifest list | Folders in §1 structure; **no table list in §2–§5** | Sole-mutator tables in manifest + DDL | ⚠️ **GATE-TL** — design before implement |
| **DDL columns** | `createErpScaffoldTable` (id, org, timestamps) | Full domain columns per aggregate | Real columns before production commands | ❌ All 43 tables |
| **Store** | Empty `HumanResourcesStore` | `store.ts` + memory + drizzle | Persistence abstraction | ❌ |
| **Commands / queries** | `module-ids.ts` → `[]` | Full capability per domain | `Result<T>` public API | ❌ |
| **Events** | 16 ids in `@afenda/events` + manifest | §9 event list | Append on mutation TX | ✅ Catalog; ❌ emitters |
| **Permissions** | 20 codes in package + PERMISSION-REGISTER | §10 permission list | Manifest auth map per cmd/qry | ✅ Codes; ❌ maps |
| **Tenancy audit** | 43 roots in ownership manifest | Hard `organization_id` | `hard-tenant-roots.ts` + `audit:tenancy-nulls` | ✅ HR1 DONE — 43/43 registered |
| **App wiring** | `human-resources-authorization-port.ts` only | Actions + features per domain | `*-command-options.ts` + Actions | ❌ No command-options / Actions / features |
| **Payroll consumer** | `optionalIntegratesWith: payroll (events)` | `PayrollEmployeeQueryPort` owned by payroll | App adapter from HR queries | ❌ Port + adapter (payroll package) |
| **Module readiness** | No Living `*-MOD-009/010` | Enterprise evidence | `afenda-elite-module-readiness` | **BLOCKED** — Docs-lane dormant |

### GATE-TL authority citation (time / leave / performance / talent)

| Source | What it says |
| ------ | ------------ |
| [human-resource.md §1 structure](./human-resource.md) | Physical folders `time/`, `leave/`, `performance/`, `talent/` are **in scope** as nested capabilities |
| [human-resource.md §2–§5](./human-resource.md) | **Suggested mutation tables** cover core, recruitment, lifecycle, learning, C&B only — **43 tables** |
| `mutation-tables.ts` | Lists time/leave/perf/talent **aggregates** but **not** matching `hr_*` table names |
| [human-resource.md §9–§10](./human-resource.md) | Events `leave.approved`, `timesheet.approved` + permissions `leave.*`, `attendance.*`, `timesheet.*`, `performance.manage` imply **future** capability without DDL |
| **Roadmap rule** | **HR9** must amend scratch with explicit table list + manifest expansion **before** HR10–HR13 write DDL or commands |

**Defer option (explicit):** HR12–HR13 may remain `DEFERRED` on MODULE-ROADMAP until product prioritizes perf/talent; HR10–HR11 (time/leave) are **required** before payroll input consumption is credible.

---

## Phase dependency graph

```text
HR0 (baseline)
  └─► HR1 (tenancy audit)
        └─► HR2 (core/org DDL)
              └─► HR3 (core employee commands) ──► HR4 (organization commands)
                    └─► HR5 (recruitment)
                          └─► HR6 (lifecycle)
                                └─► HR7 (compensation-benefits)
                                      └─► HR8 (learning)
                                            └─► HR9 GATE-TL (DDL design)
                                                  ├─► HR10 (time)
                                                  ├─► HR11 (leave)
                                                  ├─► HR12 (performance) [defer ok]
                                                  └─► HR13 (talent) [defer ok]
                                                        └─► HR14 (payroll read port / app adapter)
                                                              └─► HR15 (apps/web wiring)
                                                                    └─► HR16 (lifecycle active + Path 100%)
```

---

## Phases HR0–HR16

Each phase = **one Agent chat**. Pattern per slice (sales reference): **DDL (if needed) → store methods → commands/queries → `__tests__` → manifest ids + auth map → optional Action**.

### HR0 — Scaffold baseline verification

| | |
| --- | --- |
| **Depends on** | — |
| **In scope** | Read-only audit of package, scratch, registers; confirm no peer payroll imports |
| **Out of scope** | Code changes |
| **Deliverable** | This roadmap file; gap matrix accepted |
| **Verify** | `pnpm --filter @afenda/human-resources test` · `pnpm governance:packages` |
| **Done when** | Manifest test green; 43 tables = ownership manifest; `lifecycle: scaffolded` |

---

### HR1 — Tenancy hardening — **DONE** (2026-07-21)

| | |
| --- | --- |
| **Depends on** | HR0 |
| **In scope** | Register all 43 `hr_*` roots in `packages/data-plane/db/src/hard-tenant-roots.ts` |
| **Out of scope** | Column DDL; commands |
| **Reference** | SCAFFOLDING §6 Tenancy |
| **Verify** | `pnpm audit:tenancy-nulls` · `pnpm governance:packages` |
| **Done when** | All 43 tables appear in audit script; null-org probe passes |
| **Evidence** | Journaled `0034_hr_employee` + applied `0035_hr_scaffold_tables` (42 CREATE); Neon `hr_%` = **43**; `HARD_TENANT_ROOT_TABLE_NAMES` = **116** (43 `hr_*`); opaque org id (no Neon Auth FK); HR-01 store remains org-scoped; lifecycle stays `scaffolded` |

---

### HR2 — Core workforce DDL — **DONE** (2026-07-21)

| | |
| --- | --- |
| **Depends on** | HR1 |
| **In scope** | Domain columns for `hr_employment`, `hr_employment_contract`, `hr_position`, `hr_work_assignment` + employee list indexes (`0036_hr_core_workforce_ddl`) |
| **Out of scope** | Commands; `hr_department` / `hr_job` / `hr_reporting_line` / `hr_employment_movement` remain scaffold; no `md_party` |
| **Locks** | Q4 omit party; Q5 `status` ∈ `active\|notice\|terminated` |
| **Evidence** | Migration applied; `db:check` OK; FKs employee→employment→contract/assignment; position status CHECK |

---

### HR3 — Core employee / employment / contract commands — **DONE** (2026-07-21)

| | |
| --- | --- |
| **Depends on** | HR2 |
| **In scope** | `employee.update` / `.list`; `employment.create` / `.amend` / `.get`; `employment-contract.create` / `.get`; memory + drizzle; events `employment.started.v1` / `employment.changed.v1` |
| **Out of scope** | Recruitment; auto-create employment on employee create |
| **Verify** | `pnpm --filter @afenda/human-resources check` · `pnpm governance:packages` |
| **Evidence** | Package tests include create/update/list + employment/contract matrix; manifest auth maps shipped |
| **Mission alias** | Part of chat mission **HR-02** (core workforce vertical slice) |

---

### HR4 — Position / assignment commands — **DONE** (2026-07-21) (partial vs original org tree)

| | |
| --- | --- |
| **Depends on** | HR3 |
| **In scope** | `position.create` / `.get` / `.list`; `assignment.create` / `.end` / `.get` (writes via `employment.manage`) |
| **Still open** | ~~Department, job, reporting-line~~ → closed by HR-03 below |
| **Out of scope** | Recruitment; lifecycle |
| **Verify** | `pnpm --filter @afenda/human-resources check` |
| **Done when** | Position + assignment mutable under tenant; org-scoped lookups |
| **Mission alias** | Part of chat mission **HR-02** (core workforce vertical slice) |

---

### HR4.1 / mission HR-03 — Organization structure + reporting-line — **DONE** (2026-07-22)

| | |
| --- | --- |
| **Depends on** | HR4 |
| **In scope** | Domain DDL `0037` for `hr_department` / `hr_job` / `hr_reporting_line` + position `department_id`/`job_id` + status `active\|frozen\|closed`; department/job/position/reporting commands + bounded `organization.tree`; permissions `organization.read` / `organization.manage` |
| **Out of scope** | Headcount budgets; recruitment; `lifecycle: active` |
| **Verify** | `pnpm --filter @afenda/human-resources check` · `pnpm validate:modules` · `pnpm governance:packages` |
| **Done when** | Hierarchy + reporting invariants tested (memory + Neon parity); manifest registers only shipped ids; lifecycle stays `scaffolded` |
| **Mission alias** | Chat mission **HR-03** |

---

### HR5 / mission HR-04 — Recruitment slice — **DONE** (2026-07-22)

| | |
| --- | --- |
| **Depends on** | HR4 |
| **In scope** | DDL `0038_hr_recruitment_ddl` for `hr_job_requisition` … `hr_employment_offer`; pipeline commands through offer accept; emit `requisition.approved.v1`, `offer.accepted.v1`; typed `OfferAcceptanceHandoff` |
| **Out of scope** | Auto-create employee (hand off to HR6) |
| **Reference** | Scratch §2 recruitment lifecycle diagram |
| **Verify** | `pnpm --filter @afenda/human-resources check` · `pnpm validate:modules` · `pnpm governance:packages` |
| **Done when** | Offer accept is idempotent; interview/evaluation tables writable |
| **Evidence** | Domain statuses + FKs/uniques on six recruitment tables; memory + drizzle stores; recruitment test matrix; lifecycle stays `scaffolded` |
| **Mission alias** | Chat mission **HR-04** |

---

### HR6 — Lifecycle slice (onboarding → offboarding)

| | |
| --- | --- |
| **Depends on** | HR5 |
| **In scope** | DDL for lifecycle tables (`hr_onboarding_case` … `hr_clearance`); probation, confirmation, transfer, termination, offboarding commands; emits through `offboarding.completed.v1` |
| **Out of scope** | Admin auth revoke (app saga); payroll final pay |
| **Reference** | Scratch §2 onboarding/offboarding; termination → event → saga diagram |
| **Verify** | `pnpm --filter @afenda/human-resources test` |
| **Done when** | Happy path: offer accepted → employee created → onboarding complete → termination → offboarding complete with events |

---

### HR7 — Compensation & benefits agreements

| | |
| --- | --- |
| **Depends on** | HR6 |
| **In scope** | DDL for C&B tables (grades through `hr_compensation_review`); agreement commands only — **no gross-to-net** |
| **Out of scope** | Payroll calculation; payment execution |
| **Reference** | Scratch §4 HR-owned terms vs payroll-owned outcomes |
| **Verify** | `pnpm --filter @afenda/human-resources test` |
| **Done when** | `compensation.changed.v1` + `benefit-enrollment.changed.v1` on approved changes; amounts are agreement facts not calculated pay |

---

### HR8 — Learning & development slice

| | |
| --- | --- |
| **Depends on** | HR7 |
| **In scope** | DDL for `hr_learning_*`, `hr_employee_certification`, `hr_development_plan`; course → assignment → completion; `certification.expiring.v1` hook |
| **Out of scope** | External LMS / SCORM (scratch §3 extraction criteria) |
| **Verify** | `pnpm --filter @afenda/human-resources test` |
| **Done when** | Learning completion recorded; certification expiry queryable |

---

### HR9 — GATE-TL: Time / leave / performance / talent DDL design

| | |
| --- | --- |
| **Depends on** | HR8 |
| **In scope** | **Scratch amendment only:** propose `hr_*` table names, FK graph, manifest `mutationTables` expansion, aggregate list trim/align; decision record for defer of perf/talent |
| **Out of scope** | Implementation migrations; commands |
| **Authority** | See GATE-TL citation table above |
| **Proposed tables (draft for review)** | |

```text
Time:     hr_shift, hr_attendance_event, hr_attendance_record, hr_timesheet,
          hr_attendance_exception
Leave:    hr_leave_policy, hr_leave_entitlement, hr_leave_request, hr_leave_adjustment
Performance (defer ok): hr_performance_cycle, hr_goal, hr_review, hr_improvement_plan
Talent (defer ok):      hr_competency, hr_talent_profile, hr_talent_pool,
          hr_succession_plan, hr_career_plan
```

| **Verify** | Human review of scratch PR; `pnpm governance:packages` after manifest table list updated |
| **Done when** | [human-resource.md](./human-resource.md) contains § for time/leave/(perf/talent); `mutation-tables.ts` matches; SCHEMA-OWNERSHIP-MANIFEST rows approved |

---

### HR10 — Time & attendance

| | |
| --- | --- |
| **Depends on** | HR9 (time tables approved) |
| **In scope** | DDL migration + store + attendance/timesheet commands; emit `timesheet.approved.v1` |
| **Out of scope** | Payroll overtime **calculation** (payroll inputs only consume approved facts) |
| **Verify** | `pnpm --filter @afenda/human-resources test` · `pnpm audit:tenancy-nulls` |
| **Done when** | Approved timesheet is immutable; attendance links to employment |

---

### HR11 — Leave management

| | |
| --- | --- |
| **Depends on** | HR10 |
| **In scope** | Leave policy, entitlement, request, adjustment commands; emit `leave.approved.v1` |
| **Out of scope** | Payroll leave balance calculation |
| **Verify** | `pnpm --filter @afenda/human-resources test` |
| **Done when** | Leave approve reduces entitlement; payroll can consume approved leave via port/event only |

---

### HR12 — Performance management `[DEFER ok]`

| | |
| --- | --- |
| **Depends on** | HR9 (perf tables approved; skip if deferred) |
| **In scope** | Cycles, goals, reviews, improvement plans |
| **Defer authority** | Scratch §1 lists capability; no payroll dependency — defer if MODULE-ROADMAP prioritizes payroll first |
| **Verify** | `pnpm --filter @afenda/human-resources test` |
| **Done when** | Review cycle close emits audit; no journal side effects |

---

### HR13 — Talent management `[DEFER ok]`

| | |
| --- | --- |
| **Depends on** | HR9 (talent tables approved; skip if deferred) |
| **In scope** | Competency, profiles, pools, succession, career plans |
| **Defer authority** | Same as HR12 |
| **Verify** | `pnpm --filter @afenda/human-resources test` |
| **Done when** | Talent data stays HR-scoped; no separate `@afenda/learning` package |

---

### HR14 — Payroll consumer surface (HR side complete)

| | |
| --- | --- |
| **Depends on** | HR7 + HR11 (compensation agreements + leave approvals) |
| **In scope** | HR **query** commands needed by `PayrollEmployeeQueryPort` (scratch §7); document event payloads for payroll |
| **Out of scope** | Implementing `@afenda/payroll` package |
| **Reference** | Scratch §7 `PayrollEmployeeQueryPort` — interface lives in **payroll** package when built |
| **Verify** | Contract test in HR package asserting stable read DTO for payroll adapter |
| **Done when** | App can implement payroll adapter without HR source imports |

---

### HR15 — App composition root + first Actions

| | |
| --- | --- |
| **Depends on** | HR6 minimum (lifecycle path); ideally HR11 |
| **In scope** | `apps/web/lib/erp/human-resources-command-options.ts`; Actions for core lifecycle path; optional `features/human-resources/` shell |
| **Out of scope** | Full UI for every aggregate |
| **Reference** | `apps/web/lib/erp/sales-command-options.ts` · `apps/web/app/actions/create-sales-order.ts` |
| **Verify** | `pnpm --filter @afenda/web typecheck` · targeted `pnpm test -- apps/web/__tests__/*human-resources*` |
| **Done when** | ≥1 Server Action calls HR package with `ActionResult`; permission strings match catalog |

---

### HR16 — `lifecycle: active` + Path to 100%

| | |
| --- | --- |
| **Depends on** | HR15 + all non-deferred domain phases |
| **In scope** | Flip `lifecycle: active` in manifest + `validate:modules --write`; complete authorization maps for **all** shipped command/query ids; README consume section lists real commands |
| **Out of scope** | Living MOD-009/010 bodies (Docs-lane) |
| **Verify** | Full gate block below |
| **Done when** | See **Lifecycle active — definition of done** |

---

## Lifecycle active — definition of done

Per [SCAFFOLDING.md §3](../../packages/erp/SCAFFOLDING.md) and §9 checklist:

| Criterion | Evidence |
| --------- | -------- |
| `lifecycle: active` in manifest + MODULE-CATALOG | `pnpm validate:modules --write` |
| Every shipped command/query in manifest `owns` | `module-ids.ts` parity test |
| Every shipped id in `authorization.commands` / `queries` | manifest test |
| Public API returns `Result<T>` | package tests |
| No peer ERP imports | `manifest.test.ts` + `pnpm governance:packages` |
| Tenancy | `pnpm audit:tenancy-nulls` |
| Governance | `pnpm governance:packages` |
| Package quality | `pnpm --filter @afenda/human-resources lint typecheck test` |
| App wiring | `pnpm --filter @afenda/web typecheck` + Action tests |
| Anti-goals honored | No `payroll_*` / `payment` / `journal` writes in HR package grep |

**Not required for `active`:** HR12–HR13 if explicitly deferred in HR9 with scratch note. **Required for payroll credibility:** HR7, HR10, HR11, HR14.

---

## Path to 100% — SCAFFOLDING §9 mapping

| §9 Step | Artifact | HR phase | Status @ baseline |
| ------- | -------- | -------- | ----------------- |
| 1 | MODULE-ROADMAP.yaml row | HR0 | **Gap** — add row when implementing HR1 |
| 2 | `packages/erp/human-resources/` + package.json | HR0 | ✅ |
| 3 | `module.manifest.ts` complete | HR16 | ⚠️ scaffolded |
| 4 | Schema + migration in `@afenda/db` | HR2–HR11 | ⚠️ scaffold columns only |
| 5 | WORKSPACE-EDGE-REGISTER edges | HR0 | ✅ (`@afenda/db`, events, audit, master-data) |
| 6 | CATALOG_EXPECTED_PACKAGES / validate-modules | HR16 | ⚠️ lifecycle mismatch |
| 7 | Permission catalog seeds + auth map | HR3+ per slice | ⚠️ codes only |
| 8 | Domain tests + Action wiring | HR3–HR15 | ❌ |
| 9 | Package README | HR16 | ⚠️ consume section TBD |
| 10 | `pnpm governance:packages` + lint/typecheck/test | Every phase | ✅ baseline passes |

### Module readiness evidence (MOD-002)

| Evidence row | Status | Notes |
| ------------ | ------ | ----- |
| Living `human-resources-MOD-009` | **BLOCKED** | Docs-lane dormant — record BLOCKED in scratch until reopen |
| Living `human-resources-MOD-010` claim | **BLOCKED** | No `PASS` without Living packs |
| `pnpm check:module-quality` | **BLOCKED** | Same |
| Independent enterprise claim | After HR16 + Docs-lane | Use `afenda-elite-module-readiness` |

---

## Verify command templates (all phases)

```bash
# Package gate (every implementation phase)
pnpm --filter @afenda/human-resources lint typecheck test

# Monorepo governance (manifest, edges, registers)
pnpm governance:packages

# After manifest or table ownership edits
pnpm validate:modules --write

# After new tenant roots or DDL
pnpm audit:tenancy-nulls

# After permission code changes
pnpm --filter @afenda/db db:ensure-permission-catalog

# After app Actions (HR15+)
pnpm --filter @afenda/web typecheck
pnpm test -- apps/web/__tests__/*human-resources*
```

---

## Sales pattern quick map

| Sales artifact | HR target |
| -------------- | --------- |
| `module.manifest.ts` `lifecycle: active` | HR16 |
| `module-ids.ts` | Per-phase command constants |
| `order.ts` | `core/employee.ts`, `lifecycle/*.ts`, etc. |
| `memory-store.ts` / `drizzle-store.ts` | Extend `HumanResourcesStore` per slice |
| `schemas.ts` + `parse-input.ts` | Tenant context + per-command Zod |
| `authorization.ts` + manifest maps | HR3 onward per shipped id |
| `production-ports.ts` | Already wired — use in mutations |
| `apps/web/lib/erp/sales-command-options.ts` | `human-resources-command-options.ts` (HR15) |
| `apps/web/app/actions/create-sales-order.ts` | `create-employee.ts`, etc. (HR15) |

---

## Related documents

- Architecture: [human-resource.md](./human-resource.md)
- ERP scaffold theory: [packages/erp/SCAFFOLDING.md](../../packages/erp/SCAFFOLDING.md)
- Package README: [packages/erp/human-resources/README.md](../../packages/erp/human-resources/README.md)
