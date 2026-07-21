# Human Resources — HR-00 implementation audit

| Field | Value |
| ----- | ----- |
| Surface | `docs-V2/_scratch/erp/human-resources-implementation-audit.md` |
| Mode | Scratch ops — evidence lock before domain commands |
| Mission | **HR-00** — Evidence and ownership lock |
| Package | `@afenda/human-resources` |
| Snapshot date | 2026-07-21 |
| Architecture authority | [human-resource.md](./human-resource.md) |
| Phase sequencing | [human-resources-roadmap.md](./human-resources-roadmap.md) |
| Schema ownership | [SCHEMA-OWNERSHIP-MANIFEST.yaml](../../modules/SCHEMA-OWNERSHIP-MANIFEST.yaml) |
| Drizzle schema | `packages/data-plane/db/src/schema/human-resources.ts` |
| Mutation list | `packages/erp/human-resources/src/mutation-tables.ts` |

**Rule:** Do not invent columns, tables, statuses, or commands unsupported by disk authority. Every claim below cites a living file.

---

## 1. Executive summary

| Fact | Evidence |
| ---- | -------- |
| **`hr_*` mutation table count** | **43** — `HUMAN_RESOURCES_MUTATION_TABLES`, SCHEMA-OWNERSHIP-MANIFEST, TABLE-OWNERSHIP.generated.yaml, Drizzle exports |
| **Domain DDL columns** | **1** table (`hr_employee`) — remainder use `createErpScaffoldTable` |
| **Hard-tenant audit roots** | **43** / 43 `hr_*` in `hard-tenant-roots.ts` (SSOT total roots **116**) — HR1 DONE |
| **Shipped commands / queries** | **2** — `human-resources.employee.create`, `human-resources.employee.get` |
| **Manifest lifecycle** | `scaffolded` |
| **Ownership drift (manifest ↔ package)** | **None** — sole writeOwner `@afenda/human-resources` for all 43 |
| **GATE-TL folders** | `time/`, `leave/`, `performance/`, `talent/` — folder markers + aggregate names, **zero** `hr_*` tables |

```text
Evidentiated today          Scaffold-only TS            GATE-TL (no tables)
─────────────────          ────────────────            ───────────────────
hr_employee domain DDL     42 × createErpScaffoldTable  time / leave /
employee.create / .get     (id, org, timestamps)        performance / talent
43-table sole ownership
```

---

## 2. Column profile templates

### ScaffoldStandard (42 tables)

Source: `packages/data-plane/db/src/schema/scaffold-table.ts` via `createErpScaffoldTable`.

| Field class | Present? | Detail |
| ----------- | -------- | ------ |
| Primary key | Yes | `id` uuid PK, `defaultRandom()` |
| Organization ownership | Yes | `organization_id` text NOT NULL |
| Foreign keys | **No** | None declared |
| Unique constraints | **No** | Only index `{table}_org_id_idx` on `(organization_id, id)` |
| Status fields | **No** | — |
| Effective-date fields | **No** | — |
| Version / concurrency | **No** | — |
| Created / updated actors | **No** | — |
| Created / updated timestamps | Yes | `created_at`, `updated_at` timestamptz NOT NULL default now() |
| Soft-delete / archival | **No** | — |

### hr_employee (domain DDL)

Sources: `packages/data-plane/db/src/schema/human-resources.ts` · `packages/data-plane/db/drizzle/0034_hr_employee.sql`.

| Field class | Present? | Detail |
| ----------- | -------- | ------ |
| Primary key | Yes | `id` uuid PK |
| Organization ownership | Yes | `organization_id` text NOT NULL |
| Foreign keys | **No** | No FK to `md_party` or other tables |
| Unique constraints | Yes | `(organization_id, normalized_employee_number)`; `(organization_id, create_idempotency_key)` |
| Indexes | Yes | `hr_employee_org_id_idx` on `(organization_id, id)` |
| Status fields | **No** | No employment/lifecycle status column |
| Effective-date fields | **No** | — |
| Version / concurrency | Yes | `version` integer NOT NULL default 1 |
| Created / updated actors | Yes | `created_by`, `updated_by` text NOT NULL |
| Created / updated timestamps | Yes | `created_at`, `updated_at` |
| Domain columns | Yes | `employee_number`, `normalized_employee_number`, `legal_name`, `create_idempotency_key`, `create_request_fingerprint` |
| Soft-delete / archival | **No** | — |

**Migration journal (HR1 closed):** `0034_hr_employee` and `0035_hr_scaffold_tables` are journaled and applied on `br-tiny-hill-ao82jp6f` (`drizzle.__drizzle_migrations` count **36**).

---

## 3. Table-to-aggregate matrix (43 rows)

Every table maps to **exactly one** aggregate folder. Write owner for all rows: `@afenda/human-resources` (SCHEMA-OWNERSHIP-MANIFEST). Schema owner: `@afenda/db`.

### 3.1 core (4)

| Table | Aggregate folder | PK | org_id | FKs | Uniques | Status | Effective dates | Version | Actors | Soft-delete | Profile |
| ----- | ---------------- | -- | ------ | --- | ------- | ------ | --------------- | ------- | ------ | ----------- | ------- |
| `hr_employee` | core | `id` | yes | none | org+normalized_number; org+idempotency | none | none | yes | created_by, updated_by | none | **Domain** |
| `hr_employment` | core | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_employment_contract` | core | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_work_assignment` | core | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |

### 3.2 organization (4)

| Table | Aggregate folder | PK | org_id | FKs | Uniques | Status | Effective dates | Version | Actors | Soft-delete | Profile |
| ----- | ---------------- | -- | ------ | --- | ------- | ------ | --------------- | ------- | ------ | ----------- | ------- |
| `hr_department` | organization | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_job` | organization | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_position` | organization | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_reporting_line` | organization | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |

### 3.3 recruitment (6)

| Table | Aggregate folder | PK | org_id | FKs | Uniques | Status | Effective dates | Version | Actors | Soft-delete | Profile |
| ----- | ---------------- | -- | ------ | --- | ------- | ------ | --------------- | ------- | ------ | ----------- | ------- |
| `hr_job_requisition` | recruitment | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_candidate` | recruitment | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_candidate_application` | recruitment | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_interview` | recruitment | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_interview_evaluation` | recruitment | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_employment_offer` | recruitment | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |

### 3.4 lifecycle (10)

| Table | Aggregate folder | PK | org_id | FKs | Uniques | Status | Effective dates | Version | Actors | Soft-delete | Profile |
| ----- | ---------------- | -- | ------ | --- | ------- | ------ | --------------- | ------- | ------ | ----------- | ------- |
| `hr_employment_movement` | lifecycle | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_onboarding_case` | lifecycle | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_onboarding_task` | lifecycle | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_probation_review` | lifecycle | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_employment_confirmation` | lifecycle | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_termination` | lifecycle | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_offboarding_case` | lifecycle | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_offboarding_task` | lifecycle | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_exit_interview` | lifecycle | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_clearance` | lifecycle | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |

Note: transfer is represented by aggregate name `transfer` in `HUMAN_RESOURCES_AGGREGATES` and folder `src/lifecycle/transfer.ts`; persistence for movements is `hr_employment_movement` (no separate `hr_transfer` table).

### 3.5 learning (9)

| Table | Aggregate folder | PK | org_id | FKs | Uniques | Status | Effective dates | Version | Actors | Soft-delete | Profile |
| ----- | ---------------- | -- | ------ | --- | ------- | ------ | --------------- | ------- | ------ | ----------- | ------- |
| `hr_learning_course` | learning | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_learning_program` | learning | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_learning_session` | learning | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_learning_assignment` | learning | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_learning_attendance` | learning | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_learning_assessment` | learning | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_learning_completion` | learning | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_employee_certification` | learning | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_development_plan` | learning | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |

### 3.6 compensation-benefits (10)

| Table | Aggregate folder | PK | org_id | FKs | Uniques | Status | Effective dates | Version | Actors | Soft-delete | Profile |
| ----- | ---------------- | -- | ------ | --- | ------- | ------ | --------------- | ------- | ------ | ----------- | ------- |
| `hr_compensation_grade` | compensation-benefits | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_salary_band` | compensation-benefits | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_employee_compensation` | compensation-benefits | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_allowance_entitlement` | compensation-benefits | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_bonus_eligibility` | compensation-benefits | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_benefit_plan` | compensation-benefits | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_benefit_eligibility` | compensation-benefits | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_benefit_enrollment` | compensation-benefits | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_compensation_review_cycle` | compensation-benefits | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |
| `hr_compensation_review` | compensation-benefits | `id` | yes | none | none | none | none | none | none | none | ScaffoldStandard |

### Aggregate count check

| Aggregate | Table count |
| --------- | ----------- |
| core | 4 |
| organization | 4 |
| recruitment | 6 |
| lifecycle | 10 |
| learning | 9 |
| compensation-benefits | 10 |
| **Total** | **43** |

---

## 4. Unsupported-folder gate (GATE-TL)

Authority: [human-resource.md](./human-resource.md) §1 lists folders; §2–§5 list **43** suggested mutation tables only. Roadmap **HR9** must amend scratch with table names before DDL/commands.

| Folder | Aggregates in `HUMAN_RESOURCES_AGGREGATES` | Matching `hr_*` mutation tables | Gate |
| ------ | ------------------------------------------ | ------------------------------- | ---- |
| `src/time/` | `shift`, `attendance_event`, `attendance_record`, `timesheet`, `attendance_exception` | **0** | **BLOCKED** until HR9 |
| `src/leave/` | `leave_policy`, `entitlement`, `leave_request`, `leave_adjustment` | **0** | **BLOCKED** until HR9 |
| `src/performance/` | `performance_cycle`, `goal`, `review`, `improvement_plan` | **0** | **BLOCKED** until HR9 (defer ok per roadmap) |
| `src/talent/` | `competency`, `talent_profile`, `talent_pool`, `succession_plan`, `career_plan` | **0** | **BLOCKED** until HR9 (defer ok per roadmap) |

**Catalog-only (no DDL — do not implement emitters/commands yet):**

| Surface | IDs | Why blocked |
| ------- | --- | ----------- |
| Events | `human-resources.leave.approved.v1`, `human-resources.timesheet.approved.v1` | No leave/time tables |
| Permissions | `human-resources.leave.request`, `human-resources.leave.approve`, `human-resources.attendance.manage`, `human-resources.timesheet.approve`, `human-resources.performance.manage` | No matching mutation tables |

Folder markers under those paths are **aggregate boundary constants only** — not production command surfaces.

**Proposed GATE-TL table names (draft — not approved; HR9 only):** see [human-resources-roadmap.md](./human-resources-roadmap.md) HR9 block (`hr_shift` … `hr_career_plan`). Do **not** add to `mutation-tables.ts` or SCHEMA-OWNERSHIP-MANIFEST until HR9 accepts them.

---

## 5. Ownership / drift analysis

### 5.1 Parity — mutation list vs ownership registers

| Source | Count | Owner |
| ------ | ----- | ----- |
| `packages/erp/human-resources/src/mutation-tables.ts` | 43 | package sole-mutator list |
| `docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml` (`hr_*`) | 43 | `writeOwner: "@afenda/human-resources"` |
| `docs-V2/modules/TABLE-OWNERSHIP.generated.yaml` (`hr_*`) | 43 | generated from manifest |
| Drizzle `human-resources.ts` exports | 43 | schema host `@afenda/db` |

**Result:** No missing ownership, no duplicate ownership, no cross-package write claims for `hr_*`. **No mutation-table / SCHEMA-OWNERSHIP-MANIFEST correction required in HR-00.**

**Evidenced register drift (corrected in HR-00):** `module.manifest.ts` already owned `human-resources.employee.create` / `human-resources.employee.get`, but `COMMAND-REGISTER.generated.yaml` and `QUERY-REGISTER.generated.yaml` omitted them. Regenerated via `pnpm validate:modules:write` — fully evidenced from living manifest, not invented ids.

### 5.2 Schema gaps (not ownership drift)

| Gap | Detail | Owner phase |
| --- | ------ | ----------- |
| 42 scaffold tables | Physical CREATE applied in `0035_hr_scaffold_tables.sql`; domain columns still scaffold-only | HR2+ |
| Domain FKs / status / effective dates | Absent on all tables except employee operational fields | HR2+ |

### 5.3 Naming mismatches

| Claim | Disk truth |
| ----- | ---------- |
| Scratch aggregate “Work assignment” | Table `hr_work_assignment` (not `hr_assignment`) |
| Manifest aggregate `assignment` | Maps to `hr_work_assignment` |
| Manifest aggregate `transfer` | No `hr_transfer` table — use `hr_employment_movement` |
| Scratch “Hiring decision” | No dedicated table — outcome is offer accept → employee/employment |
| README “commands empty” | **Stale** — `employee.create` / `employee.get` shipped (corrected in package README this mission) |

### 5.4 Cross-package write surface

| Check | Result |
| ----- | ------ |
| Peer ERP writes to `hr_*` in SCHEMA-OWNERSHIP-MANIFEST | None |
| HR package dependency on `@afenda/payroll` | Absent (`manifest.test.ts`) |
| Approved edges (`WORKSPACE-EDGE-REGISTER.yaml`) | `@afenda/db`, `@afenda/errors`, `@afenda/audit`, `@afenda/events`, `@afenda/master-data` |
| `MasterLookupPort` in HR package | **Not present** — edge to master-data approved; port wiring follows sales pattern in HR2+ when FKs land |

### 5.5 Unsupported README claims (pre-HR-00)

| Claim | Correction |
| ----- | ---------- |
| Root barrel does not export commands/queries; lists empty | Exports `createEmployee`, `getEmployeeById`; command/query ids non-empty |
| Implication of empty store | `HumanResourcesStore` implements employee create/get/idempotency (memory + drizzle); other aggregates remain boundary markers |

---

## 6. Proposed command / query inventory

**Rule:** Only Tier A is schema-evidenced and shipped. Tier B lists **roadmap-aligned** ids that share existing permission / event catalog entries — still **BLOCKED** until domain DDL columns exist. Tier C is GATE-TL.

### Tier A — shipped (disk truth)

| Operation id | Kind | Permission | Mutation table | Event |
| ------------ | ---- | ---------- | -------------- | ----- |
| `human-resources.employee.create` | command | `human-resources.employee.create` | `hr_employee` | `human-resources.employee.created.v1` |
| `human-resources.employee.get` | query | `human-resources.employee.read` | `hr_employee` (read) | — |

Sources: `module-ids.ts`, `core/employee.ts`, `module.manifest.ts` authorization maps, `drizzle-store.ts` / `memory-store.ts`.

### Tier B — next batches (BLOCKED: awaiting domain DDL)

Permissions and events already exist in catalog / `@afenda/events`. Do **not** invent new status enums until columns land.

| Batch | Roadmap | Capability (permission-backed) | Tables | Events when approved |
| ----- | ------- | ------------------------------ | ------ | -------------------- |
| Core + org structure | HR2–HR4 | `employment.manage`; org structure under employee/employment permissions as designed in slice | core + organization (9 tables) | `employment.started.v1`, `employment.changed.v1`, `employee.transferred.v1` |
| Recruitment | HR5 | `requisition.create`, `candidate.manage`, `interview.record`, `offer.approve` | recruitment (6) | `requisition.approved.v1`, `offer.accepted.v1` |
| Lifecycle | HR6 | `onboarding.manage`, `offboarding.manage` | lifecycle (10) | onboarding/offboarding started/completed; `employee.terminated.v1` |
| Compensation-benefits | HR7 | `compensation.read`, `compensation.manage`, `benefits.manage` | C&B (10) | `compensation.changed.v1`, `benefit-enrollment.changed.v1` |
| Learning | HR8 | `learning.manage`, `certification.manage` | learning (9) | `certification.expiring.v1` |

Exact command/query id strings for Tier B are **not** invented here — register them in `module-ids.ts` only when the owning slice implements `Result<T>` handlers against real columns.

### Tier C — GATE-TL (BLOCKED until HR9)

No commands or queries for time, leave, performance, or talent until mutation tables are designed, owned in SCHEMA-OWNERSHIP-MANIFEST, and migrated.

---

## 7. Transition-state inventory

Label: **SCHEMA_UNCONFIRMED** unless a column exists on disk. No guessed state machines.

| Domain | Authority signal | Schema status | Implement? |
| ------ | ---------------- | ------------- | ---------- |
| Employee create idempotency | `hr_employee` unique indexes + store conflict handling | **Confirmed** | Yes (shipped) |
| Employee optimistic concurrency | `hr_employee.version` | Column present; no update command yet | Update path later |
| Recruitment funnel (requisition → offer accepted) | [human-resource.md](./human-resource.md) §2 diagram | Conceptual — no `status` columns | **BLOCKED** — HR5 DDL |
| Lifecycle (onboard → terminate → offboard) | Scratch §2 + event names | No status enums in DDL | **BLOCKED** — HR6 DDL |
| Employment status for payroll (`active` \| `notice` \| `terminated`) | Scratch §7 `PayrollEmployeeQueryPort` DTO | **Not a column** — design in HR2 `hr_employment` | **BLOCKED** — open question |
| Leave / timesheet approval | Event + permission catalog | No tables | **BLOCKED** — GATE-TL |

---

## 8. Required foreign lookup ports

Propose only — **do not implement in HR-00**.

| Port | Owner / consumer | When needed | Pattern |
| ---- | ---------------- | ----------- | ------- |
| `MasterLookupPort` (party, item, payment term, UOM as required by FKs) | Injected into HR commands; reads `@afenda/master-data` | HR2+ when FKs to `md_*` land | Mirror `packages/erp/sales/src/master-lookup.ts` |
| `PayrollEmployeeQueryPort` | **Owned by `@afenda/payroll`** | HR14 | Scratch §7 — app composition root supplies HR-backed adapter |

HR must not dual-write `md_*`. Edge `human-resources → master-data` is approved in WORKSPACE-EDGE-REGISTER.

---

## 9. Required event contracts

Source: `packages/data-plane/events/src/schemas/human-resources.events.ts`.

All 16 events share `humanResourcesEntityPayloadSchema`:

```text
organizationId, entityType, entityId, actorId, correlationId [, causationId?]
```

| Event id | Emitter status |
| -------- | -------------- |
| `human-resources.employee.created.v1` | **Live** — memory + drizzle store on create |
| `human-resources.employment.started.v1` | Catalog only — blocked until employment mutations |
| `human-resources.employment.changed.v1` | Catalog only |
| `human-resources.employee.transferred.v1` | Catalog only |
| `human-resources.employee.terminated.v1` | Catalog only |
| `human-resources.requisition.approved.v1` | Catalog only |
| `human-resources.offer.accepted.v1` | Catalog only |
| `human-resources.onboarding.started.v1` | Catalog only |
| `human-resources.onboarding.completed.v1` | Catalog only |
| `human-resources.offboarding.started.v1` | Catalog only |
| `human-resources.offboarding.completed.v1` | Catalog only |
| `human-resources.compensation.changed.v1` | Catalog only |
| `human-resources.benefit-enrollment.changed.v1` | Catalog only |
| `human-resources.leave.approved.v1` | Catalog only — **GATE-TL** |
| `human-resources.timesheet.approved.v1` | Catalog only — **GATE-TL** |
| `human-resources.certification.expiring.v1` | Catalog only |

Payload enrichment beyond the entity base schema is **out of scope** until the emitting slice defines fields with DDL evidence.

---

## 10. Blocked capabilities

| Capability | Blocker |
| ---------- | ------- |
| Mutations on 42 scaffold tables | No domain columns; migrations incomplete / absent |
| Time / leave / performance / talent commands | GATE-TL — no `hr_*` tables |
| Lifecycle / recruitment / C&B / learning status transitions | SCHEMA_UNCONFIRMED — no status columns |
| Payroll gross-to-net; writes to `payroll_*`, `payment`, `journal` | Permanent anti-goal (scratch §4–§6) |
| `0034` apply via Drizzle migrate | Journal entry missing |
| Living MOD-009 / MOD-010 enterprise claim | Docs-lane dormant |
| Peer import of `@afenda/payroll` from HR | Forbidden |

---

## 11. Exact batch sequence

Aligned with [human-resources-roadmap.md](./human-resources-roadmap.md):

```text
HR-00 (this audit + README lock)
  └─► HR1 tenancy (register 42 hard-tenant roots + resolve 0034 journal)
        └─► HR2 core/org DDL (replace ScaffoldStandard columns)
              └─► HR3 core commands (employee slice partially done)
                    └─► HR4 organization commands
                          └─► HR5 recruitment
                                └─► HR6 lifecycle
                                      └─► HR7 compensation-benefits
                                            └─► HR8 learning
                                                  └─► HR9 GATE-TL design (scratch + manifest)
                                                        ├─► HR10 time
                                                        ├─► HR11 leave
                                                        ├─► HR12 performance [defer ok]
                                                        └─► HR13 talent [defer ok]
                                                              └─► HR14 payroll read surface
                                                                    └─► HR15 apps/web wiring
                                                                          └─► HR16 lifecycle: active
```

---

## 12. Open questions that genuinely prevent implementation

1. **Journal:** ~~Register `0034_hr_employee.sql`~~ — **CLOSED (HR1):** journaled + applied with `0035_hr_scaffold_tables`.
2. **Scaffold DDL strategy:** ~~bulk vs per-slice~~ — **CLOSED (HR1):** bulk ScaffoldStandard in `0035`; domain columns via per-slice migrations from HR2.
3. **GATE-TL:** Approve roadmap HR9 draft table names in scratch before any leave/time work?
4. **`md_party`:** **LOCKED (HR2 mission):** omit `md_party` FK and any `party_id` column. Employment references `hr_employee` only. Future party linkage = additive migration after Master Data ownership approved. No `MasterLookupPort` this mission.
5. **`employmentStatus`:** **LOCKED (HR2 mission):** store `hr_employment.status text NOT NULL` with `active | notice | terminated` (+ CHECK, typed transitions). Not derived.

Q3 remains open for leave/time work.

---

## 13. HR-00 acceptance gate / HR-01 readiness

| Gate | Result |
| ---- | ------ |
| Every current `hr_*` mutation table has exactly one owner | **PASS** |
| Unsupported folders explicitly gated | **PASS** (GATE-TL section) |
| Aggregate statuses confirmed from schema or authority | **FAIL** for domain statuses — no status columns on disk (employee has version/actors only) |
| No guessed field or lifecycle transition remains | **PASS** — all non-employee transitions marked SCHEMA_UNCONFIRMED |

### Verdict

| Next mission | Readiness |
| ------------ | --------- |
| **HR1** (tenancy hardening) | **DONE / CLOSED** |
| **HR2** (core workforce DDL) | **DONE** — `0036_hr_core_workforce_ddl` applied |
| **HR3** (employee/employment/contract commands) | **DONE** |
| **HR4** (position/assignment commands) | **DONE** for position/assignment; dept/job/reporting-line remain scaffold |
| **Next** | Org structure remainder (dept/job/reporting-line) or recruitment HR5 |

---

## 14. Verify commands (HR-00)

```bash
pnpm --filter @afenda/human-resources lint
pnpm --filter @afenda/human-resources typecheck
pnpm --filter @afenda/human-resources test
pnpm validate:modules
pnpm governance:packages
```

---

## Authority citation index

| Artifact | Path |
| -------- | ---- |
| Package README | `packages/erp/human-resources/README.md` |
| Mutation tables | `packages/erp/human-resources/src/mutation-tables.ts` |
| Module manifest | `packages/erp/human-resources/src/module.manifest.ts` |
| Module ids | `packages/erp/human-resources/src/module-ids.ts` |
| Employee command | `packages/erp/human-resources/src/core/employee.ts` |
| Drizzle schema | `packages/data-plane/db/src/schema/human-resources.ts` |
| Scaffold helper | `packages/data-plane/db/src/schema/scaffold-table.ts` |
| Employee migration | `packages/data-plane/db/drizzle/0034_hr_employee.sql` |
| Journal | `packages/data-plane/db/drizzle/meta/_journal.json` |
| Hard tenant roots | `packages/data-plane/db/src/hard-tenant-roots.ts` |
| Event schemas | `packages/data-plane/events/src/schemas/human-resources.events.ts` |
| Ownership manifest | `docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml` |
| Generated ownership | `docs-V2/modules/TABLE-OWNERSHIP.generated.yaml` |
| Workspace edges | `docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml` |
| Scratch architecture | `docs-V2/_scratch/erp/human-resource.md` |
| Roadmap | `docs-V2/_scratch/erp/human-resources-roadmap.md` |
