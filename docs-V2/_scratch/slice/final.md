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
| Wave missions | **This file** — `HR-WAVE1-FOUNDATION` · `HR-WAVE1-EFFECTIVE-TRUTH` (§ Wave 1) |
| Parent roadmap | [human-resources-roadmap.md](../erp/human-resources-roadmap.md) |
| Time control state | [time-remaining.md](../erp/time-remaining.md) |
| Baseline snapshot | 2026-07-24 |
| Lifecycle | **Open** — Wave 0 complete; Wave 1 executing inline (§ Wave 1) |

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
| Null-org audit | **177 audited, 0 skipped** | `pnpm audit:tenancy-nulls` — see [time-remaining.md](../erp/time-remaining.md) PASS-03 |

**Not a contradiction:** README cites **104 `hr_*`** roots; the audit counts **177** roots repo-wide (platform, master-data, ERP modules, and HR). Stale elsewhere: [AGENTS.md](../../../AGENTS.md) still lists **116** total / **43 `hr_*`** — Wave 0 acceptance includes aligning that line.

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
- Align tenancy SSOT: 177 total roots, 104 hr_* — not a README/audit conflict
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
| **2** | Shared platform boundaries | Capability ledger rows 3–8 |
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
| 5 | Workflow, tasks, approvals | Shared orchestration; HR owns transitions and snapshots | 2 | Platform workflow | Time approval pattern generalized | Future slice |
| 6 | Document and e-signature boundary | Vault refs only; scan, version, ACL, signing external | 2 | Document platform | Vault reference validator + integration events | Future slice |
| 7 | Integration and bulk data | Webhooks, idempotency, import/export, reconciliation | 2 | Platform integration | Attendance connector or explicit API-only scope | Future slice |
| 8 | Reporting and analytics | Permission-aware read models, `asOf`, projections | 2 | Data platform / search | Metric reproducibility tests | Future slice |
| 9 | HR product surfaces | ESS, MSS, HR admin, candidate experience | 4 | `apps/web` features | UI compose + action coverage matrix | Product lane |
| 10 | Production operations | Logging, metrics, outbox lag, runbooks, load/recovery | 4 | Platform ops | SLO dashboards + drill evidence | Ops lane |

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

Time remaining work: [time-remaining.md](../erp/time-remaining.md). Do not claim module enterprise readiness until MOD packs reopen.

---

## Structural cleanup (Wave 0 acceptance)

| # | Item | Paths / action |
| - | ---- | -------------- |
| 1 | Tenancy doc SSOT | Align [AGENTS.md](../../../AGENTS.md) audit line to **177** total / **104 `hr_*`**; optional README clarifier |
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

- [ ] Tenancy SSOT table in this doc matches `hard-tenant-roots.ts` (**177** / **104 `hr_*`**)
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
| [AGENTS.md](../../../AGENTS.md) | Testing table: **177** hard-tenant roots, **104 `hr_*`** |
| [packages/erp/human-resources/README.md](../../../packages/erp/human-resources/README.md) | Tenancy line: optional “104 `hr_*` of 177 total roots” |
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

| Phase | Theme | Deliverables | Verify |
| ----- | ----- | ------------ | ------ |
| **1** | Person/Worker DDL | `hr_person`, `hr_worker` in `@afenda/db`; migration `0008`; `hard-tenant-roots.ts`; `mutation-tables.ts`; SCHEMA-OWNERSHIP | `pnpm audit:tenancy-nulls` · migration test |
| **2** | Memory adapter | `adapters/memory/workforce-foundation.ts` | unit tests |
| **3** | Drizzle + commands | Drizzle adapter; store composition; `createPerson`, `createWorker`, …; module-ids; permissions; manifest auth maps | `pnpm --filter @afenda/human-resources test` |
| **4** | Canonical org context | `resolveEmployeeOrgContextAsOf` query + DTO | typecheck |
| **5** | Assignment asOf parity | `findAssignmentByEmploymentAsOf`; align store assignment-context with Drizzle | parity tests |
| **6** | Historical scenario | Restructure + transfer → deterministic past-date org context; memory/Drizzle parity | `human-resources.foundation.parity.test.ts` |

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

| Phase | Theme | Deliverables | Verify |
| ----- | ----- | ------------ | ------ |
| **1** | Adoption matrix | Table of aggregates using `supersedes*` / effective ranges (Time = reference) | doc in this section |
| **2** | Store asOf standards | `findAssignmentByEmploymentAsOf` on core store (shared with 1A Phase 5) | core tests |
| **3** | Leave lineage | Adopt `selectEffectiveLineageRecord` in leave adapters for policy resolution | leave parity |
| **4** | Compensation lineage | Same for compensation effective records | comp parity |
| **5** | Remaining domains | Org/talent/compliance/WFP supersede fields where present | adapter tests |
| **6** | Cross-domain evidence | Parity + historical dispute scenarios | domain test suites |

### Lineage adoption matrix (Phase 1)

| Domain | Aggregate | Mechanism | Adapter path |
| ------ | --------- | --------- | ------------ |
| Time | work calendar, shift, time policy | `supersedes*` + `selectEffectiveLineageRecord` | `adapters/{memory,drizzle}/time.ts` |
| Leave | leave policy | effective range + eligibility | `adapters/{memory,drizzle}/leave.ts` |
| Compensation | employee compensation | effective range | `adapters/{memory,drizzle}/compensation-benefits.ts` |
| Core/org | work assignment, reporting line | date-bounded rows + asOf queries | `adapters/{memory,drizzle}/{core,organization}.ts` |

Shared helpers: `src/shared/effective-dates.ts`, `src/shared/effective-lineage.ts`.

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
