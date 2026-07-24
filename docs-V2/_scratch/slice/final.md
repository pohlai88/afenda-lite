# HR Enterprise Readiness — assessment index + Wave 0 mission

| Field | Value |
| ----- | ----- |
| Surface | `docs-V2/_scratch/slice/final.md` |
| Mode | Scratch ops — enterprise readiness index + Wave 0 mission |
| Primary mode | `internal-guide` (technical-writing) |
| Audience | Engineers and Agent implementers |
| Mission ID | `HR-ENTERPRISE-READINESS-00` |
| Priority | P0 — program control before enterprise production claims |
| Package | `packages/erp/human-resources` |
| Wave missions | **This file** — Wave 1 foundation/effective truth · `HR-ENT-05-PLATFORM-*` Wave 2 boundaries |
| Parent roadmap | [human-resources-roadmap.md](../erp/human-resources-roadmap.md) |
| Time control state | [time-remaining.md](../erp/time-remaining.md) |
| Baseline snapshot | 2026-07-24 |
| Lifecycle | **Open** — Wave 0 complete; Wave 2 shared-platform boundary mission complete; module remains `scaffolded` |

**Action this doc enables:** Paste the **Wave 0 compile block** (or wave-routing table row) into a **new** Agent chat. Implementing agent emits project PREFLIGHT; compile blocks do **not** include PREFLIGHT or skill dumps.

**Problem (one line):** `@afenda/human-resources` has a strong domain kernel and mature Time slice, but breadth without shared workflow, privacy, integration, reporting, and operational foundations blocks an enterprise production claim.

---

## Executive verdict

`@afenda/human-resources` is a **well-engineered modular HR backend**: typed commands and queries, Zod contracts, authorization ports, memory and Drizzle adapters, domain events, concurrency controls, failure-injection tests, tenant guards, and broad sub-domain coverage — with **Time** as the reference implementation bar.

It is **not** yet evidence of a complete enterprise HR product. Several domains remain functionally thin; cross-cutting platform capabilities (workflow, reporting, notifications, privacy rights, integration management, HR service delivery) are missing or external-only. Structural duplication and control-plane doc drift must be reconciled before formal readiness promotion.

**Bottom line:** Do not add isolated HR tables as the next move. Build the **enterprise HR foundation** (worker/org history, privacy and contextual authorization, workflow/tasks, document and integration boundaries, reporting projections), then deepen each domain using the same migration, tenancy, audit, failure-injection, and memory/Drizzle parity standard Time already demonstrates.

---

## Validated control-plane facts (2026-07-24)

### Tenancy SSOT

| Metric | Count | Authority |
| ------ | ----- | --------- |
| Total hard-tenant roots | **179** (post Wave 1A Phase 1) | `packages/data-plane/db/src/hard-tenant-roots.ts` → `HARD_TENANT_ROOT_TABLE_NAMES` |
| `hr_*` subset | **106** (post Wave 1A Phase 1: +`hr_person`, +`hr_worker`) | Same array, entries `hr_employee` … `hr_worker` |
| Null-org audit | **PASS-03** — registry and configured DB aligned: **179 audited, 0 skipped** after `0008_hr_workforce_foundation.sql` | `pnpm audit:tenancy-nulls` — see [time-remaining.md](../erp/time-remaining.md) PASS-03 |

**Slice A aligned (2026-07-24):** SSOT, audit mirror, [AGENTS.md](../../../AGENTS.md), and [README](../../../packages/erp/human-resources/README.md) report **179** total hard-tenant roots and **106 `hr_*`**. The configured production branch now audits **179 / 179** after the separately authorized `0008_hr_workforce_foundation.sql` operator migration.

### Slice closeout — Slice B (test hygiene)

**Classification:** Complete with follow-up architectural alignment required (closed in **Slice B2**).

| Outcome | Status |
| ------- | ------ |
| Test import path fixed (`time-parity-shared.ts`) | Done |
| Knip unresolved import / unlisted `@afenda/testing` on HR | Done |
| HR typecheck · lint · 540 tests | Done |
| PASS-03 evidence (registry vs DB) | Done — current registry and DB **179 audited, 0 skipped**; Slice B originally closed at 177/2 before `0008` |
| Unauthorized `db:migrate` | Not run |
| `packages/foundation/testing` bridge (upward re-export) | **Conditional in B — resolved in B2** |

**Slice B2 (2026-07-24):** `@afenda/testing` is canonical — `require-database-for-ci` lives in `packages/foundation/testing/src/`; Vitest/tsconfig resolve via workspace exports; governance catalog registered; repo-root `testing/` retains runner config and e2e helpers only.

### Slice closeout — HR-ENT-00-STABILIZE

**Classification:** Complete on the 2026-07-24 working-tree revision. This
closeout changed no module lifecycle and did not itself authorize the
then-pending `0008` database migration.

| Acceptance evidence | Exact result |
| ------------------- | ------------ |
| Biome stabilization | 9 import/export ordering failures corrected mechanically; no behavior changes |
| `pnpm check:hr` | **PASS** — lint checked 330 files; typecheck passed; unit project passed 38 files / 397 tests with 2 skipped |
| Database-enforced `pnpm test:hr:parity` | **PASS** with `DATABASE_URL` loaded from `.env.local` and `REQUIRE_DATABASE_TESTS=1` — 25 files / 178 tests passed with 1 skipped |
| `pnpm validate:modules` | **PASS** — 12 manifests; 7 generated registers matched; all 21 negative fixtures proven |
| `pnpm governance:packages` | **PASS** — catalog-to-disk, workspace edges, dependency DAG, schema write-owner, deep-import, and ERP-manifest governance |
| `pnpm check:editor-biome` | **PASS** |

Governance stabilization added the missing canonical schema-symbol mappings for
`hr_person` and `hr_worker`, then regenerated the seven manifest-derived
registers through `pnpm validate:modules --write`. The subsequent non-writing
validation and package-governance gates both passed.

### Slice closeout — HR-ENT-01-WORKFORCE-CLOSE

**Classification:** Complete on 2026-07-24 against the configured protected
production Neon branch. Module lifecycle remains `scaffolded`.

| Acceptance evidence | Exact result |
| ------------------- | ------------ |
| Branch and guard preflight | **PASS** — `.neon` and `.env.local` agree on protected production branch `br-tiny-hill-ao82jp6f`; `db:check` journal valid |
| Guarded migration | **PASS** — `AFENDA_ALLOW_DB_MIGRATE=1 pnpm --filter @afenda/db db:migrate`; no baseline or destructive override |
| Migration ledger | **PASS** — 9 journal entries / 9 DB ledger rows; applied through `0008_hr_workforce_foundation`; pending forward 0 |
| Tenancy audit | **PASS** — 179 hard-tenant roots audited, 0 skipped; `hr_person` and `hr_worker` each report `null_count=0` |
| DB package tests | **PASS** — 20 files / 80 tests |
| Database-enforced workforce parity | **PASS** — `human-resources.foundation.parity.test.ts`: 1 file / 2 tests with `REQUIRE_DATABASE_TESTS=1` |

### Deferred follow-on slices (not B2)

| Slice | Scope | Operator / doc action |
| ----- | ----- | --------------------- |
| **C — Tenancy migration** | Apply `0008_hr_workforce_foundation.sql` on approved branch | **Done 2026-07-24** — ledger 9/9; **179 audited, 0 skipped, PASS** |
| **D — `time-remaining.md` PASS-03 history** | Align historical **177** evidence vs current **179** registry | **Done 2026-07-24** — dated M01/C01-A evidence retained; post-`0008` evidence added |

### Manifest and Time maturity

| Fact | Disk | Rule |
| ---- | ---- | ---- |
| `lifecycle: scaffolded` | `packages/erp/human-resources/src/module.manifest.ts` | Do **not** bump to `active` without HR16 / module-readiness gate ([human-resources-roadmap.md](../erp/human-resources-roadmap.md)) |
| Time spine | [time-remaining.md](../erp/time-remaining.md) | Most P0 Time gaps closed; parity and scoped calendar evidence green post-`0006`/`0007`; connector swap is later |
| Attendance connector | `src/production-attendance-source.ts` | Fail-closed at composition root (TIME-G12); inline import still supported |

---

## Document map

| Section | Use | Compile when |
| ------- | --- | ------------ |
| Master compile block | First Wave 0 chat | Readiness truth + structural control |
| Wave routing | Pick next mission | After Wave 0 or between waves |
| Capability ledger | Platform vs HR ownership | Planning Wave 2+ slices |
| Domain gap matrix | Domain depth backlog | Wave 3 prioritization |
| Structural cleanup | Wave 0 acceptance rows | Same as Wave 0 |
| Enterprise definition of done | Per-domain exit bar | Any domain closure chat |
| Completion report template | Phase exit | End of Wave 0 |

**Format SSOT:** This file — all wave compile blocks, phase tables, and acceptance live inline (no external slice files).

---

## Master compile block (Wave 0 — paste into new Agent chat)

```text
MISSION: HR-ENTERPRISE-READINESS-00 Wave 0 — readiness truth and structural control
SCOPE: packages/erp/human-resources · AGENTS.md · docs-V2/_scratch/erp · docs-V2/_scratch/slice
ATTACH: /using-afenda-elite-skills · /afenda-elite-module-readiness
KNOWN CONTEXT:
- docs-V2/_scratch/slice/final.md
- packages/data-plane/db/src/hard-tenant-roots.ts
- packages/erp/human-resources/README.md
- packages/erp/human-resources/src/module.manifest.ts
- docs-V2/_scratch/erp/time-remaining.md
CONSTRAINTS:
- Enterprise production only — no MVP / shim / stub product paths
- Do not change module.manifest lifecycle without formal readiness gate
- Extend existing architecture — no rewrite of working Time domain
- One wave mission per chat; Wave 0 is audit + doc/structure control only
- Cite disk paths as evidence; no Living docs/ recreation
- Align tenancy SSOT: 179 total roots, 106 hr_* — audit mirror and docs match hard-tenant-roots.ts
ACCEPTANCE:
- Capability/evidence ledger draft for all HR domains (scaffolded | partial | production-candidate)
- Structural cleanup checklist completed or owned with paths (§ Structural cleanup)
- Doc touchpoints synced: AGENTS.md tenancy line, README clarifier, roadmap link to final.md
- Fail-closed production port inventory documented
RESPONSE:
- § Completion report template filled + next wave routing recommendation
```

---

## Rules

- **One wave per Agent chat** — Wave 0 audit; Wave 1A/1B phases inline below; Waves 2–4 via routing table.
- **Time is the engineering bar** — parity, tenancy, audit, failure-injection, effective history — not a license to skip other domains.
- **Platform stays outside HR** — workflow engine, document storage, IAM, search, warehouse remain separate owners (§ Capability ledger).
- **No destructive history** — effective dating and lineage per § Wave 1B; worker/org foundation per § Wave 1A.
- **Fail-closed unwired ports** — correct engineering; product must not claim enabled capabilities.

## Goals

1. Single readiness index routing all HR enterprise work with validated control-plane facts.
2. Wave 0 closes doc drift, structural ambiguity, and evidence-ledger gaps before foundation slices.
3. Wave 1 executes inline via `HR-WAVE1-FOUNDATION` and `HR-WAVE1-EFFECTIVE-TRUTH` phase tables (§ Wave 1).
4. Waves 2–4 tracked via capability and domain matrices.

## Non-goals

- Implementing Wave 1–4 domain code in the Wave 0 chat
- Merging Wave 1 into external slice files
- Living `docs/` or MOD readiness claims (Docs-lane dormant)
- Payroll calculation, UI routes, or server actions in this index
- Inventing slice3+ file bodies — ledger and inline phases only

## Hard stops

| Stop | Rule |
| ---- | ---- |
| No shims | Real store + Drizzle + memory parity |
| No false readiness | `lifecycle: scaffolded` until HR16 / module-readiness evidence |
| Tenancy | Hard `organization_id`; cross-org references rejected |
| No platform monolith | HR stores references and facts — not generic infra |
| No parking | Finish Wave 0 acceptance or stop with BLOCKED report |

---

## Wave routing

| Wave | Theme | Execute via |
| ---- | ----- | ----------- |
| **0** | Readiness truth + structural control | **This file** — Master compile block above |
| **1A** | Worker/org foundation | **This file** — `HR-WAVE1-FOUNDATION` Phases 1–6 (§ Wave 1A) |
| **1B** | Cross-domain effective history | **This file** — `HR-WAVE1-EFFECTIVE-TRUTH` Phases 1–6 (§ Wave 1B; after 1A Phase 3) |
| **2** | Shared platform boundaries | **Complete 2026-07-24** — capability ledger rows 5–9; evidence in [enterprise.md](./enterprise.md#phase-5-implementation-record--2026-07-24) |
| **3** | Domain completeness | Domain gap matrix + [human-resources-roadmap.md](../erp/human-resources-roadmap.md) HR phases |
| **4** | Product + operational readiness | ESS/MSS/HR admin surfaces, connectors, ops, formal lifecycle promotion |

**Wave 1A Phase 1 compile block:**

```text
MISSION: HR-WAVE1-FOUNDATION Phase 1 — Person/Worker DDL + tenancy registration
SCOPE: packages/data-plane/db · packages/erp/human-resources mutation registry
ATTACH: /using-afenda-elite-skills · /afenda-elite-backend-modules
KNOWN CONTEXT: docs-V2/_scratch/slice/final.md § Wave 1A Phase 1
CONSTRAINTS: +2 hr_* roots; lifecycle stays scaffolded; no employee rewrite
ACCEPTANCE: migration applied; roots registered; tenancy audit green
VERIFY: pnpm audit:tenancy-nulls · pnpm --filter @afenda/db test · pnpm --filter @afenda/human-resources typecheck
```

**Wave 1B Phase 1 compile block:**

```text
MISSION: HR-WAVE1-EFFECTIVE-TRUTH Phase 1 — Lineage adoption matrix
SCOPE: docs-V2/_scratch/slice/final.md · packages/erp/human-resources adapters
ATTACH: /using-afenda-elite-skills · /afenda-elite-backend-modules
PREREQUISITE: HR-WAVE1-FOUNDATION Phase 3 complete
KNOWN CONTEXT: docs-V2/_scratch/slice/final.md § Wave 1B
ACCEPTANCE: adoption matrix documented; Time remains reference bar
```

---

## Capability ledger (platform + foundation)

| # | Capability | Gap summary | Wave | Platform owner | Evidence gate | Mission |
| - | ---------- | ----------- | ---- | -------------- | ------------- | ------- |
| 1 | Worker and org foundation | Person/worker/employee model, directory ports, canonical `asOf` org context | 1A | HR + `@afenda/master-data` | Wave 1A Phase 6 + historical scenario | § Wave 1A |
| 2 | Effective dating and historical truth | Package-wide lineage, corrections, policy binding | 1B | HR | Wave 1B Phase 6 + dispute scenario | § Wave 1B |
| 3 | Field-level HR authorization | Row/field scope, SoD, break-glass, sensitive fields | 2 | HR auth maps + platform RBAC | Auth boundary tests per domain | Future slice |
| 4 | Privacy, retention, legal hold | Classification, export, rectification, holds — not delete-only | 2 | Platform privacy + HR metadata | Retention workflow tests | Future slice |
| 5 | Workflow, tasks, approvals | HR owns transition/task state; platform owns durable outcome facts | 2 | `@afenda/events` + app platform handlers | Policy snapshot/outcome publication; retry/replay/tenant tests | `HR-ENT-05-PLATFORM-01` complete |
| 6 | Document and e-signature boundary | HR persists canonical immutable refs only | 2 | Document/e-sign platform | Vault tenant/kind/version/resolver failure tests | `HR-ENT-05-PLATFORM-02` complete |
| 7 | Notifications and identity provisioning | Event intents plus joiner/mover/leaver facts | 2 | `@afenda/notifications` + IAM events | Handler failure, dedupe, replay, tenant evidence | `HR-ENT-05-PLATFORM-03/04` complete |
| 8 | Integration and bulk data | Dry-run, row results, idempotency, reconciliation | 2 | Platform integration + HR attendance boundary | No-write dry-run and deterministic reconciliation tests | `HR-ENT-05-PLATFORM-05` complete |
| 9 | Reporting and analytics | Permission-aware stable facts and search projections | 2 | `@afenda/events` + `@afenda/search` | Fact version/permission and cross-tenant projection tests | `HR-ENT-05-PLATFORM-06` complete |
| 10 | HR product surfaces | ESS, MSS, HR admin, candidate experience | 4 | `apps/web` features | UI compose + action coverage matrix | Product lane |
| 11 | Production operations | Logging, metrics, outbox lag, runbooks/load/recovery | 4 | Platform ops | SLO dashboards + drill evidence | Ops lane |

**Production requirement (capability 1):** Query `resolveEmployeeOrgContextAsOf({ organizationId, employeeId, asOf })` returns exactly one record with `employmentId`, `positionId`, `departmentId`, `managerEmployeeId`, `locationKey`, `legalEntityKey`, `costCentreKey`, `workCalendarId` — or a typed fail-closed error when ambiguous or absent. See § Wave 1A Phase 4.

**Database-level defence (capability 3):** `organization_id NOT NULL` is necessary; also require tenant-scoped uniques, composite FK isolation, cross-tenant denial tests, and RLS or documented equivalent.

---

## Domain gap matrix (Wave 3 depth)

| Domain | Maturity (baseline) | Highest-priority gaps | Wave |
| ------ | ------------------- | --------------------- | ---- |
| Core + organization | Partial | Person/worker abstraction, contacts, dependants, contingent workers, directory ports, position occupancy, merge governance | 3 (after Wave 1) |
| Leave | Partial | Accrual, carryover, partial-day, calendar interaction, policy versioning, reconciliation | 3 |
| Compensation + benefits | Partial | Effective comp history, merit workflows, OE/life events, confidential access, payroll handoff facts only | 3 |
| Recruitment | Partial | Consent/retention, dedupe, scheduling, screening, offer versioning, e-sign, conversion handoff | 3 |
| Lifecycle | Partial | Shared task templates, provisioning coordination, termination clearance, no false completion | 3 |
| Time | Strong | Legal-entity Drizzle coverage, production attendance connector scope, operator workflows, exit docs | 3 parallel |
| Performance | Thin | Templates, calibration, locked ratings, acknowledgement, dispute | 3 |
| Learning | Thin | Programs, prerequisites, LMS integration, mandatory campaigns, renewal | 3 |
| Compliance + ER | Thin | Applicability rules, acknowledgement campaigns, confidential ER chain of custody | 3 |
| Talent + WFP | Thin | Review cycles, succession slates, plan versions/scenarios/approval/reconciliation | 3 |

### Phase 6 domain-depth execution ledger

| Mission | Domain | State | Implemented evidence | Open gate |
| ------- | ------ | ----- | -------------------- | --------- |
| `HR-ENT-06-DOMAIN-CORE-ORG-OCCUPANCY` | Core + organization | Source implemented and focused verification passed; live database parity blocked | Permission-mapped `human-resources.position.occupancy-as-of` query; deterministic vacant/occupied replay; tenant-safe memory adapter; Drizzle adapter fails closed on ambiguous occupancy; focused unit 2/2, memory parity 1/1, manifest 5/5, scoped Biome, and full HR typecheck pass | Apply reviewed `0009_hr_organization_dimensions.sql` with explicit operator authorization, then rerun Drizzle parity. Core remains open: contacts/dependants and merge governance lack an accepted aggregate contract; contact-point ownership must be reconciled with the Master Data party aggregate before adding HR mutation tables. |
| `HR-ENT-06-DOMAIN-LEAVE-ACCRUAL` | Leave + lifecycle | Source implemented and focused verification passed; live database parity blocked | Governed `human-resources.leave-entitlement.accrue` command; strict positive quantity and bounded accrual period; immutable `accrual` adjustment; period-bearing idempotency fingerprint; exactly-once replay in memory and Drizzle adapters; sensitive-operation policy; transactional adjustment event parity; leave suite 19/19, manifest 5/5, migration contracts 12/12, scoped Biome, HR and DB typechecks pass | Apply the reviewed migration chain through `0014_hr_leave_accrual_kind.sql` with explicit operator authorization, then run Drizzle parity. Leave still requires full policy/calendar/reconciliation evidence before domain closure. |

These rows do not close Core + organization, Leave + lifecycle, or Phase 6.
The remaining domain gaps and enterprise aggregate definition of done continue
to apply. Production database migrations were not authorized or applied.

Time remaining work: [time-remaining.md](../erp/time-remaining.md). Do not claim module enterprise readiness until MOD packs reopen.

---

## Structural cleanup (Wave 0 acceptance)

| # | Item | Paths / action |
| - | ---- | -------------- |
| 1 | Tenancy doc SSOT | **Resolved (Slice A):** [AGENTS.md](../../../AGENTS.md), README, and audit mirror aligned to **179** total / **106 `hr_*`** |
| 2 | Manifest lifecycle | Keep `scaffolded` until HR16 gate; document promotion process in evidence ledger |
| 3 | Work-calendar ownership | `src/work-calendar.ts`, `src/time/work-calendar.ts`, empty `src/work-calendar/` — pick canonical owner |
| 4 | Vault document adapters | Verify root vs compliance-specific adapters intentional |
| 5 | Facade duplication | `store.ts` vs `store/`, `schemas.ts` vs `schemas/` — document canonical ownership |
| 6 | One-off rewrite scripts | Remove or document after migration purpose ends |
| 7 | Fail-closed ports | Inventory (e.g. `createProductionAttendanceSource`) — product must not imply enabled |
| 8 | Subpath exports | Add domain subpaths if root barrel too broad |

Retain export-parity and coverage tests while simplifying layout.

---

## Cross-cutting ownership (remain outside HR package)

| Capability | Recommended owner | HR responsibility |
| ---------- | ----------------- | ------------------- |
| Document storage | Document platform | Governed references + HR metadata |
| E-signature | Integration/platform | Initiate and consume signed-result events |
| Workflow engine | Platform workflow | HR transition rules and resulting facts |
| Notifications | Platform communications | Domain events and notification intent |
| Identity provisioning | IAM platform | Joiner/mover/leaver facts |
| Search | Platform search | Permission-aware projections |
| Analytics warehouse | Data platform | Stable HR facts and metric definitions |
| Legal entity/location master | Master data | Effective-dated assignment references |
| Background checks | External integration | Status, consent, evidence refs |
| LMS content delivery | Learning platform | Assignments, completions, HR records |

---

## Enterprise definition of done (per domain)

A domain is **production-ready** only when every material aggregate has:

| Requirement | Evidence command (typical) |
| ----------- | -------------------------- |
| Authoritative DDL and reviewed migration | `@afenda/db` migration + schema review |
| Tenant-safe constraints and references | `pnpm audit:tenancy-nulls` |
| Typed schemas and branded identifiers | `pnpm --filter @afenda/human-resources typecheck` |
| Command and query contracts | Manifest + OpenAPI/register parity |
| Authorization and subject-scope rules | Security boundary + auth parity tests |
| Effective-date and historical behavior | Wave 1B scenario tests where applicable |
| Optimistic concurrency | Concurrency / failure-injection tests |
| Idempotency where retry is possible | Command replay tests |
| Audit and domain events | Emission registry + correlation tests |
| Outbox or transactional publication | Event schema tests |
| Memory and Drizzle parity | `human-resources.*.parity.test.ts` |
| Cross-tenant denial tests | `security-boundary.test.ts` |
| Failure-injection tests | Domain-specific failure suites |
| Production composition | App command-options wiring |
| Operational metrics | Ops lane evidence |
| Data-retention classification | Privacy lane evidence |
| User-facing or integration entry points | Actions/API when in scope |
| Accurate documentation | README + Scratch sync |

---

## Implementer workflow (per phase)

Adapted from command conventions — doc-only shape for each wave chat:

| Step | Agent duty |
| ---- | ---------- |
| **Preflight** | Emit project PREFLIGHT; confirm wave/mission ID and prerequisites |
| **Plan** | List files to read, mutations planned, verify commands — flag DDL impact |
| **Commands** | Implement or audit per wave scope |
| **Verification** | Run verify commands; paste evidence; do not claim pass without output |
| **Summary** | Verdict: success \| partial \| blocked; update ledger rows |
| **Next steps** | Name next compile block or OPEN QUESTION |

---

## Acceptance criteria (Wave 0 complete)

### Control plane

- [ ] Tenancy SSOT table in this doc matches `hard-tenant-roots.ts` (**179** / **106 `hr_*`**)
- [ ] [AGENTS.md](../../../AGENTS.md) tenancy audit line updated to match SSOT
- [ ] [README](../../../packages/erp/human-resources/README.md) clarifies `hr_*` subset vs total roots (if needed)
- [ ] [human-resources-roadmap.md](../erp/human-resources-roadmap.md) links this file as readiness index

### Evidence and structure

- [ ] Capability/evidence ledger draft for all domains (scaffolded \| partial \| production-candidate)
- [ ] Structural cleanup items 1–8 owned with paths or resolved
- [ ] Fail-closed production port inventory documented
- [ ] No `lifecycle: active` change without documented gate

### Engineering (Wave 0 — no domain DDL required)

- [ ] `pnpm check:docs-trunk-ban` green if docs touched
- [ ] Completion report emitted (§ below)

---

## Completion report template (Wave 0)

```markdown
# HR-ENTERPRISE-READINESS-00 Completion Report

## Verdict
COMPLETE | PARTIAL | BLOCKED

## Control-plane corrections
- Tenancy SSOT: ...
- AGENTS.md / README / roadmap: ...

## Capability/evidence ledger
| Domain | State | Notes |
| ------ | ----- | ----- |
| core | | |
| time | | |
| ... | | |

## Structural cleanup status
| # | Item | Status |
| - | ---- | ------ |
| 1 | Tenancy docs | |
| ... | | |

## Fail-closed ports
- ...

## Validation evidence
| Gate | Command | Result |
| ---- | ------- | ------ |
| Docs trunk ban | pnpm check:docs-trunk-ban | |

## Recommended next mission
- final.md § Wave 1A Phase N | § Wave 1B Phase N | Wave 2 (TBD)

## Enterprise-production assessment
Scaffolded | Partially implemented | Production candidate | Enterprise production ready
```

Do not claim **enterprise production ready** for the package until Wave 4 and module-readiness evidence pass.

---

## Documentation touchpoints (Wave 0 sync)

| File | Change |
| ---- | ------ |
| [AGENTS.md](../../../AGENTS.md) | Testing table: **179** hard-tenant roots, **106 `hr_*`** |
| [packages/erp/human-resources/README.md](../../../packages/erp/human-resources/README.md) | Tenancy line: **106 `hr_*` of 179 total roots** |
| [human-resources-roadmap.md](../erp/human-resources-roadmap.md) | Link `docs-V2/_scratch/slice/final.md` as readiness index |
| [time-remaining.md](../erp/time-remaining.md) | Keep PASS-03 counts aligned when roots change |

---

## Open questions (resolve in Wave 0)

| # | Question | Options |
| - | -------- | ------- |
| 1 | Canonical work-calendar module | A) `src/time/work-calendar.ts` B) `src/work-calendar.ts` C) merge + remove empty dir |
| 2 | Evidence ledger storage | A) Rows in this file B) New Scratch ledger YAML — prefer A for Wave 0 |

Remove resolved rows from the implementing agent's Wave 0 response.

---

## Wave 1A — `HR-WAVE1-FOUNDATION` (worker/org)

**Problem:** Person/worker types and store contracts exist but lack DDL, adapters, commands, and a canonical asOf org-context query. Time's `EmployeeAssignmentContext` is a calendar subset with memory/Drizzle parity drift.

**Prerequisite:** Wave 0 complete.

| Phase | Theme | Deliverables | Status (2026-07-24) | Current evidence | Verify |
| ----- | ----- | ------------ | ------------------- | ---------------- | ------ |
| **1** | Person/Worker DDL | `hr_person`, `hr_worker` in `@afenda/db`; migration `0008`; `hard-tenant-roots.ts`; `mutation-tables.ts`; SCHEMA-OWNERSHIP | **Complete** | Protected production branch ledger is 9/9 through `0008`; tenancy audit is 179 audited / 0 skipped; DB package is 20 files / 80 tests | `pnpm audit:tenancy-nulls` · migration test |
| **2** | Memory adapter | `adapters/memory/workforce-foundation.ts` | **Complete** | Memory composition is wired; targeted workforce foundation and command suite is 2 files / 18 tests | unit tests |
| **3** | Drizzle + commands | Drizzle adapter; store composition; `createPerson`, `createWorker`, …; module-ids; permissions; manifest auth maps | **Complete** | Drizzle composition, commands, IDs, permissions, and manifest authorization maps are present; database-enforced foundation parity is 1 file / 2 tests | `pnpm --filter @afenda/human-resources test` |
| **4** | Canonical org context | `resolveEmployeeOrgContextAsOf` query + DTO | **Partial** | Query and DTO exist, but `legalEntityKey` still maps calendar `jurisdiction` and `costCentreKey` remains constant `null`; close in `HR-ENT-02-ORG-CONTEXT` | typecheck |
| **5** | Assignment asOf parity | `findAssignmentByEmploymentAsOf`; align store assignment-context with Drizzle | **Complete** | Memory and Drizzle implement employment/assignment `asOf` selection and primary-manager resolution; database-enforced parity passes | parity tests |
| **6** | Historical scenario | Restructure + transfer → deterministic past-date org context; memory/Drizzle parity | **Partial** | The shared memory/Drizzle scenario proves deterministic history before and after a transfer; a distinct restructure scenario remains in `HR-ENT-02-ORG-CONTEXT` | `human-resources.foundation.parity.test.ts` |

**Phase 1 reconciliation:** `HR-ENT-01-WORKFORCE-CLOSE` is complete: the
workforce DDL is applied and its database, tenancy, migration-contract, and
parity evidence is green. Within the broader Wave 1A plan, Phases 1–3 and 5 are
complete; Phases 4 and 6 remain partial and are explicitly owned by
`HR-ENT-02-ORG-CONTEXT`. Module lifecycle remains `scaffolded`.

### Canonical org-context contract (Phase 4)

```typescript
type EmployeeOrgContextAsOf = {
  employmentId: string;
  employeeId: string;
  positionId: string | null;
  departmentId: string | null;
  managerEmployeeId: string | null;
  locationKey: string | null;
  legalEntityKey: string | null;
  costCentreKey: string | null;
  workCalendarId: string | null;
};
```

Fail-closed on: no employment, ambiguous employment, ambiguous assignment, ambiguous manager.

---

## Wave 1B — `HR-WAVE1-EFFECTIVE-TRUTH` (cross-domain lineage)

**Problem:** `selectEffectiveLineageRecord` and `previousIsoDate` are Time-only. Other domains with effective ranges need the same bar.

**Prerequisite:** Wave 1A Phase 3 complete.

| Phase | Theme | Deliverables | Status | Verify |
| ----- | ----- | ------------ | ------ | ------ |
| **1** | Adoption matrix | Every mutable definition/assignment classified below; Time remains the reference | **Complete** | Matrix review + focused tests |
| **2** | Store asOf standards | Core employment/assignment and organization manager reads use the shared fail-closed range resolver | **Complete** | Core/foundation/organization tests |
| **3** | Leave lineage | Published and superseded policy rows resolve through one continuous lineage | **Complete** | `leave-policy-lineage.test.ts` + leave suites |
| **4** | Compensation lineage | Compensation `asOf` uses the shared effective-range resolver; salary-band successor ranges remain closed | **Complete** | Compensation suites |
| **5** | Remaining domains | Time lineages plus talent/compliance/WFP successor histories are classified with existing command/parity evidence | **Complete** | Domain suites named below |
| **6** | Cross-domain evidence | Typed malformed-truth reasons, memory/Drizzle parity, and historical dispute scenarios | **Blocked** | Focused 4-file gate: 24/24 green; package/parity close blocked by concurrent Phase 2/4 work |

### Lineage adoption matrix (Phase 1)

| Domain | Mutable definition / assignment | Classification | Canonical selection / evidence |
| ------ | ------------------------------- | -------------- | ------------------------------ |
| Workforce foundation | worker classification | Versioned current state; effective change provenance is audit/outbox-backed, while employment/assignment rows own historical organization decisions | `workforce-foundation` commands + foundation parity |
| Core | employment | Effective range | `findEmploymentByEmployeeAsOf` → `resolveUniqueEffectiveRangeRecord` |
| Core | employment contract | Effective range; contract-code history is retained as separate rows | Core store/adapters + contract tests |
| Core | work assignment | Effective range | `findAssignmentByEmploymentAsOf` → shared range resolver |
| Organization | reporting line | Effective range | `resolvePrimaryManager` → shared range resolver |
| Organization | department, job, position | Versioned current definitions; historical decisions bind through assignment/reporting rows | Organization unit/parity suites |
| Leave | leave policy | Successor lineage + effective range | `resolvePublishedLeavePolicyByCodeLineageAsOf` → `selectEffectiveLineageRecord`; both `published` and `superseded` history retained |
| Compensation | salary band | Closed effective-range successor keyed by grade/currency | Salary-band supersede unit/parity evidence |
| Compensation | employee compensation | Effective range | `findEmployeeCompensationByEmploymentAsOf` → shared range resolver |
| Compensation | benefit enrollment | Effective range + explicit end/cancel state | Compensation unit/parity evidence |
| Time | work calendar, time policy, shift | Successor lineage + effective range | `supersedes*` → `selectEffectiveLineageRecord`; `successor-lineage.parity.test.ts` |
| Time | employment calendar, calendar scope, time policy, approval authority, shift assignments | Effective range | Memory/Drizzle Time parity |
| Time | timesheet correction | Immutable successor history | `supersedesTimesheetId`; Time correction parity |
| Talent | competency assessment | Immutable successor history | `supersedesAssessmentId`; talent adapter tests |
| Compliance | policy acknowledgement requirement | Immutable successor history | `supersedesAcknowledgementId`; compliance unit/parity tests |
| Workforce planning | headcount plan | Immutable successor history | `supersedesPlanId`; workforce-planning unit/parity tests |
| Other domain definitions | requisition, learning, performance, benefit-plan, talent-pool, succession, compliance-document, and employee-relations definitions/workflows | Versioned current state or immutable workflow/fact; no domain-validity range is encoded, so `asOf` selection is not applicable | Owning domain command/parity suites; optimistic concurrency and audit/outbox remain mandatory |

No mutable definition/assignment is left unclassified. Transaction facts such
as attendance events, leave requests, case events, approvals, and adjustments
are immutable or versioned workflow history rather than effective-dated
definitions; they therefore do not introduce a competing `asOf` algorithm.

Shared helpers:
`src/shared/effective-dates.ts`,
`src/shared/effective-range.ts`, and
`src/shared/effective-lineage.ts`. The resolvers now return typed fail-closed
reasons for duplicate IDs, invalid ranges, ambiguity, overlap, gaps, missing
predecessors, cycles, and branches. Compatibility selectors continue returning
`null` at public read boundaries. The executable inventory is
`src/effective-truth-adoption.ts`; `effective-truth-adoption.test.ts` rejects
duplicate aggregates/tables, unknown mutation tables, missing evidence, and
lineage rows without branch rejection.

### Phase 3 verification status

| Gate | Status | Evidence |
| ---- | ------ | -------- |
| Focused effective-truth unit gate | **Pass** | 4 files, 24 tests |
| Scoped Biome | **Pass** | Phase 3 implementation and test files |
| Full `test:hr:unit` | **Blocked outside Phase 3** | 36 files / 378 tests pass; 7 files / 44 tests fail in concurrent Phase 2 organization-dimension and Phase 4 authorization work |
| Core memory/Drizzle parity | **Blocked outside Phase 3** | 16 tests pass; 2 tests and cleanup fail because the configured Neon database lacks `md_organization_dimension` (`42P01`) |
| HR typecheck | **Inconclusive** | Repeated runs timed out while concurrent HR typecheck processes were active; no Phase 3 type error was emitted |

Drizzle core and organization reads now load the complete scoped aggregate
history before invoking the shared resolver, so an overlap outside the
requested `asOf` window cannot be hidden by SQL prefiltering. Database parity
cannot close until the separately owned Phase 2 master-data migration is
authorized and applied; Wave 1B Phase 6 therefore remains blocked.

---

## Capability / evidence ledger (draft)

| Domain | State | Notes |
| ------ | ----- | ----- |
| core | partial | Employee/org shipped; person/worker Wave 1A |
| organization | partial | Dept/position/reporting; canonical context Wave 1A Phase 4 |
| time | production-candidate | Reference bar; connector fail-closed |
| leave | partial | Commands exist; lineage Wave 1B Phase 3 |
| compensation-benefits | partial | Lineage Wave 1B Phase 4 |
| recruitment | partial | |
| lifecycle | partial | |
| performance | scaffolded | |
| learning | partial | |
| talent | thin | |
| compliance | thin | |
| employee-relations | thin | |
| workforce-planning | partial | |

---

## Fail-closed production ports

| Factory | Path | Behavior |
| ------- | ---- | -------- |
| `createProductionAttendanceSource` | `src/production-attendance-source.ts` | Returns CONFLICT — use inline import or wire connector |
| `createProductionAssignmentContextQuery` | `src/production-assignment-context-query.ts` | Defaults to Drizzle; inject test double in harness |
| Master-data lookups (cost centre, legal entity) | Unwired until Phase 4 | Nullable keys until port injected |
