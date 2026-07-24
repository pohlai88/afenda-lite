# HR Time remaining-gap closure plan

**Control state:** In implementation  
**Authority:** [`time.md`](time.md) + disk contracts + generated governance registers  
**Scope:** Close every P0 gap identified by the audit; retain the explicitly classified P1 workforce-management capabilities as observations, not false P0 claims.  
**Completion rule:** This plan closes only when every `TIME-G*` row is `Closed`, its evidence command is green, and the Scratch roadmaps match disk.

The Time P0 spine is substantially implemented, but it is not ready to be declared complete. The original audit found two failing repository gates and nine material implementation/evidence gaps. This file now records closure progress as of 2026-07-24; `Implemented` is not treated as `Verified` without the evidence commands recorded under **Authorization M01** and **Authorization C01-A**.

## Gap matrix

| ID | Requirement | Planned | Implemented | Verified / evidence | Finding | Severity | Required action |
|---|---|---:|---:|---|---|---|---|
| PASS-01 | P0 calendars → payroll handoff | Yes | Yes | Memory Time suite — **52 passed** on 2026-07-23; the production-backed parity run remains blocked by absent Time policy/approval and successor-lineage schema | Core Time spine exists; database verification is migration-blocked | Pass | Apply the reviewed migration only with explicit production-branch authorization, then rerun parity |
| PASS-02 | Audit/outbox/event contracts | Yes | Yes | Emission/correlation **14 passed**; `@afenda/events` **26 passed** | Event schemas and mutation registry are operational | Pass | None |
| PASS-03 | Tenant isolation | Yes | **Closed post-HR-ENT-01** | **M01 (2026-07-24):** **176** roots PASS after `0006`. **C01-A:** **177** roots PASS after `0007`. **HR-ENT-01:** **179** roots PASS after `0008_hr_workforce_foundation` (`hr_person` and `hr_worker` live; 0 skipped) | Hard-tenant inventory and configured DB align at 179 roots while dated migration history remains explicit | Pass | Retain in exit gate |
| PASS-04 | Web permission adapters | Yes | Yes | HR web tests **16 passed**; web and HR typechecks pass | All 26 exported Actions are permission-gated and session-stamped. Policy create/activate/supersede/assign, approval-authority assign/end and break-waiver approval are now exposed; their denial and representative validation boundaries are proven | Pass | Expand only with later product flows |
| TIME-G01 | Generated governance registers match manifest | Yes | **Closed** | `pnpm validate:modules --write` — **PASS** on 2026-07-23; 7 registers written and all 21 negative fixtures proven | Command/event/schema-ownership governance matches the implementation | Pass | Retain non-write validation in the exit gate |
| TIME-G02 | Time code passes coding-quality gate | Yes | **Closed for Time scope** | Targeted Biome check — **30 Time files clean**; forbidden non-null assertions removed; HR typecheck passes | The audited Time surface is clean; unrelated package-wide legacy findings are outside this gap | Pass | Full package lint remains an exit-gate observation |
| TIME-G03 | Timesheet-entry DDL and public model agree | Yes | **Closed** | Six dimensions now flow through type, Zod schema, store, memory, Drizzle and parity assertions | DDL/runtime drift removed | Pass | Rerun Drizzle parity after migration |
| TIME-G04 | Split-shift assignment segments are operational | Yes | **Closed** | Branded segment identity, validation, default normalization, persistence, list query and memory/Drizzle assertions implemented | Split shifts retain their segment facts | Pass | Rerun Drizzle parity after migration |
| TIME-G05 | Validate active employment and assignment facts | Yes | **Closed post-C01-A** | **C01-A (2026-07-24):** `0007_hr_work_calendar_scope` applied; `AssignmentContextQueryPort`, scoped store commands, `resolveEmployeeWorkCalendar`, work-calendar lookup; `calendar-scope-resolution.test.ts` **6/6**, `calendar-scope-assignment.test.ts` **3/3**, `calendar-scope.parity.test.ts` **18/18** (9 memory + 9 Drizzle under `REQUIRE_DATABASE_TESTS=1`). Employment validity enforced elsewhere | Scoped precedence and assignment-context resolution verified memory/Drizzle | Pass | Retain in exit gate |
| TIME-G06 | Preserve published schedules and effective-dated calendars | Yes | Implemented; DB verification blocked | Assignment mutation conflicts once attendance exists. Calendar and active-shift rule changes create effective-dated successors with optimistic concurrency, explicit predecessor lineage, historical resolution, inherited future holidays/breaks, audit compensation and permission-gated server actions. Shared negative contracts prove unrelated same-code records cannot enter an assigned lineage; six pure contracts fail closed for cycles, dangling predecessors, branches, effective-date gaps and overlaps. Memory success/failure tests pass; both adapters typecheck | Historical facts remain stable and active definitions no longer mutate in place; production-backed execution awaits migration | **Major** | Apply `0006_hr_time_policy.sql` with explicit authorization, then run the shared Drizzle successor scenario |
| TIME-G07 | Detect the complete exception set | Partial | Implemented; DB verification blocked | Detector covers all 12 declared types, including policy-driven insufficient rest. One shared public-workflow contract proves the complete set through calendar, scheduling, attendance, policy and timesheet generation, with compile-time inventory exhaustiveness, per-scenario causality, severity, linkage and repeat-detection idempotence | The shared memory contract passes. Its Drizzle counterpart is registered behind the explicit `REQUIRE_DATABASE_TESTS=1` gate; an attempted run against the configured unmigrated branch reached the expected missing Time-policy schema boundary | **Major** | Apply `0006_hr_time_policy.sql` with explicit authorization, then rerun shared parity |
| TIME-G08 | Timezone and cross-midnight legal classification | Yes | Partial | **C02-A:** break intervals in session provenance; `legal-minute-allocation.ts` splits worked minutes by IANA civil date; timesheet generation emits per-date attendance entry plans; travelling rule unit-tested | Legal-minute allocator memory-green; **M01:** shared Drizzle parity **20/20 PASS** (2026-07-24) | **Major** | Retain in exit gate |
| TIME-G09 | Identical memory/Drizzle contract suite | Yes | **Verified post-M01 + C01-A** | **M01 (2026-07-24):** `human-resources.time.parity.test.ts` **40/40 PASS** (20 memory + 20 Drizzle) with `0006` applied. **C01-A (2026-07-24):** scoped suite **`calendar-scope.parity.test.ts` 18/18 PASS** (9 memory + 9 Drizzle) with `0007` applied | Core + scoped shared contracts green on configured branch | Pass | Retain in exit gate |
| TIME-G10 | Break, policy and approval depth | Complete-boundary requirement | **Verified post-M01** | Policy/authority/waiver depth implemented; **M01:** shared Drizzle parity **20/20 PASS** (2026-07-24) | HR10 / MOD readiness **not claimable** | **Major** | Retain in exit gate |
| TIME-G11 | Scratch roadmap reflects disk | Yes | **Closed** | Time roadmap reports 52 focused memory passes, 20/20 memory shared contracts and 20 explicitly gated Drizzle counterparts; HR roadmap links this ledger and no longer lists successor records as open | Scratch planning evidence matches the current disk/control state | Pass | Keep counts synchronized with later closure runs |
| TIME-G12 | Production `AttendanceSourcePort` wired | Yes | **Closed (composition)** | `createProductionAttendanceSource()` fail-closed when connector absent; `createHumanResourcesAttendanceSourcePort()` wired in command options; inline import still supported | Port exists at composition root; connector swap is a later integration slice | Pass | Replace fail-closed body when external connector lands |
| TIME-G13 | §5 core hours / compressed week | P1 defer | No | Flexible/fixed/split shift kinds cover clock-window model; compressed week not modeled | OBS — not P0 | Observation | Do not treat as P0 blocker |
| TIME-G14 | §14 travelling timezone policy | Yes | **Closed (policy)** | Event `sourceTimezone` determines civil date for import/allocation; assignment/session timezone remains schedule comparison axis; parity in `legal-minute-allocation.test.ts` | Documented rule + unit evidence | Pass | Extend parity harness row after migration |
| TIME-G15 | Drizzle concurrency on policy/authority overlap | Yes | **Closed post-M01** | **`time-policy-concurrency.test.ts`** (2026-07-24): concurrent overlapping `assignTimePolicy` / `assignTimeApprovalAuthority` on Drizzle — exactly one success under `REQUIRE_DATABASE_TESTS=1` | Calendar-scope tie rejection covered separately in pure + memory assignment tests | Pass | Retain in exit gate |
| TIME-G16 | §18 sensitive attendance metadata redaction | OBS defer | Partial | `deviceMetadata` retained on import rows; outbox emission does not expand sensitive fields in this slice | OBS-03 policy defer | Observation | Redact at emission boundary when security lane opens |
| TIME-G17 | Web-minimal vs full P0 surface | Yes | **Closed (actions)** | 35 server actions including return/reject/reopen/lock/supersede/import/correct/void/resolve session; shared `hr-mutation-context` DRY helper | Permission-gated ActionResult adapters | Pass | UI routes consume actions in product lane |
| OBS-03 | Accepted naming divergences | — | Documented | `work_week_json`, `archiveWorkCalendar`, batch publish vs single publish, permission prefix `human-resources.time.*` | See [time-slices-roadmap.md](./time-slices-roadmap.md) | Observation | Do not re-implement retired names |
| OBS-04 | Doc `hr.time.*` vs disk `human-resources.time.*` | — | Documented | Disk permission catalog uses `human-resources.time.*`; doc shorthand only | See time.md §17 note | Observation | Docs-lane reopen sync |
| OBS-01 | Advanced workforce management | P1 | No | Explicitly excluded in [time.md](/C:/JackProject/afenda-bolt/afenda-lite/docs-V2/_scratch/erp/time.md:1207) | Shift patterns, batch publication, swapping, open shifts, roster optimization, geofencing and device connectors are intentional P1 | Observation | Do not treat as P0 blockers |
| OBS-02 | Module Enterprise Readiness claim | Later | Unevaluated | Living MOD packs are absent by design | Readiness cannot be claimed on this checkout | Observation | Keep Not Claimable; Docs-lane reopen is required for MOD evidence |

## Check coverage

```text
Closed:                         G01, G02, G03, G04, G05, G11, G12, G14, G15, G17
Verified post-M01 (0006):      G09 core (40/40), G10, PASS-03 (176 roots at M01)
Verified post-C01-A (0007):    G09 scoped (18/18), PASS-03 (177 roots)
Verified post-HR-ENT-01 (0008): PASS-03 (179 roots, 0 skipped)
Partially closed:              G08 (C02 allocator)
Documentation / OBS:           G13, G16, OBS-01, OBS-02, OBS-03, OBS-04
Still open (implementation):   G06, G07 Drizzle successor/exception parity on configured branch

Coverage Status: Incomplete — HR10 and Time remain not claimable until T-C01–T-C07 are green
```

## `time.md` §23 shared-contract convergence

| Acceptance area | Shared evidence | Remaining shared gap |
|---|---|---|
| Calendar | Assigned calendar; normal, holiday, half-day and replacement-workday resolution; calendar successor history | Drizzle execution after migration |
| Scoped calendar precedence | employment > employee > location > department > legal entity > organization default; same-scope tie rejection; effective dating; cross-organization isolation | None — **`calendar-scope.parity.test.ts`** (9 memory + 9 Drizzle under `REQUIRE_DATABASE_TESTS=1` post-**0007**) |
| Shift | Fixed day, fixed overnight, flexible clock windows, split-shift ordered breaks and persisted assignment segments, shift successor history | Drizzle execution after migration |
| Schedule | Assignment, publish, overlap rejection, controlled published-assignment amendment and post-attendance immutability | Drizzle execution after migration |
| Attendance | Clock-in/out, breaks, missing events, canonical manual provenance, external replay idempotency and mixed partial-import failure equivalence | Drizzle execution after migration |
| Session | Complete/incomplete and assignment-local overnight sessions; scheduled breaks total 45 minutes while two actual breaks total 30 and yield 450 worked minutes without false exceptions | Drizzle execution after migration |
| Exceptions | All 12 declared types, severity/linkage, causality and re-detection idempotence | Drizzle execution after migration |
| Correction | Immutable captured timestamp/notes; original event identity; ordered append-only adjustment chain with event-version adjacency, previous/new timestamps and notes, reason, evidence, actor and correlation provenance; audit/outbox failure rollback and compensation; uncommitted-state invisibility; serialized competing correction after rollback; tenant-isolated mutation/query; query authorization denial | Drizzle execution after migration |
| Timesheet | Generate/add, draft entry edit/remove, submit, return, reopen, ordered approval, controlled approved-timesheet supersession into a distinct correction draft, rejection of repeated terminal supersession, stale-lock rejection, successful lock and denial of repeated lock plus locked add/update/remove/regenerate/submit/return/reopen/supersede mutations | Drizzle execution after migration |
| Overtime | Requested → approved maximum → actual → payroll-approved minutes remain distinct; approved handoff classifications | Drizzle execution after migration |
| Timezone | IANA inputs throughout shared workflows; Asia/Singapore calendar and America/Los_Angeles assignment/session remain distinct; America/New_York spring-forward resolves by absolute elapsed time | Travelling-event policy remains outside this contract; C02 still governs legal-date allocation |
| Integration | Approved leave emits one idempotent 480-minute leave row, suppresses false absence on the leave date, preserves exactly one calendar-derived 480-minute absence on the no-leave control date across regeneration, and contributes 480 paid / 0 unpaid leave minutes to approved handoff | Drizzle execution after migration |
| Payroll | Approved handoff facts, ordered approval provenance, explicit pre-approval null response and deterministic post-lock handoff carrying the incremented locked timesheet version | Drizzle execution after migration |
| Security | Self-approval denied despite an active authority grant | Drizzle execution after migration |
| Isolation | Cross-organization calendar/timesheet reads return no fact; attendance-correction mutation returns canonical not-found and adjustment-history query returns no fact; representative foreign assignment, timesheet-entry and overtime mutations return canonical not-found and preserve the owning aggregate | Drizzle execution after migration |
| Concurrency | Stale timesheet submission rejected; a deferred failed attendance correction remains invisible and a competing same-version correction succeeds only after rollback | Drizzle transaction races for overlapping policy/authority assignments |
| Idempotency | Calendar replay/fingerprint conflict, external attendance replay, mixed import-batch replay and source-reference conflict without extra persistence | Drizzle execution after migration |
| Persistence | Same 20 core contracts registered for memory and Drizzle; scoped calendar suite adds 9 memory + 9 Drizzle counterparts | Authorized **0006**/**0007**/**0008** migrations; core + scoped Drizzle passes; current **179-root** null audit |

## Decisions and external authorization required

1. **Production-backed migration:** the configured local database is the production Neon branch. **`0006_hr_time_policy.sql`**, **`0007_hr_work_calendar_scope.sql`**, and **`0008_hr_workforce_foundation.sql`** are applied on the configured branch (see **Authorization M01**, **Authorization C01-A**, and **Authorization HR-ENT-01**). Further schema changes still require explicit authorization before mutation.
2. **Calendar-scope precedence:** resolved under **Decision C01 Option A** and closed by **C01-A** (`calendar-scope.parity.test.ts`).
3. **Cross-midnight breaks:** accurate legal-date classification needs timestamped break intervals. The current session aggregate retains only total break minutes, so allocation across midnight would be fabricated without a model change.

### Decision C01 — calendar scope

The current `Employment` contract does not carry location or legal-entity assignment facts, so this decision includes the boundary that supplies those facts.

| Option | Rule | Trade-off |
|---|---|---|
| **A — deterministic specificity (recommended)** | Resolve an effective assignment context through a read port, then apply `employment/employee > location > department > legal entity > organization default`; reject ties at the same scope and effective date | Predictable and conventional; requires a new assignment-context port and scoped calendar-assignment columns |
| B — mutually exclusive scope | Permit only one applicable scoped assignment for an employee/date and reject all overlap across scopes | Simpler resolution, but prevents legitimate legal-entity defaults plus employee exceptions |
| C — explicit numeric priority | Persist priority on every scoped assignment and choose the highest priority, rejecting ties | Most configurable, but adds policy administration and makes outcomes less self-explanatory |

No location/department/legal-entity implementation should start until one option is accepted.

**Accepted this closure run:** **Option A** for both C01 and C02 (deterministic specificity precedence; exact legal-minute allocation with break intervals in session provenance).

### Decision C02 — cross-midnight allocation

| Option | Rule | Trade-off |
|---|---|---|
| **A — exact legal-minute allocation (recommended)** | Keep shift-start date as operational work date; persist actual break intervals; allocate worked minutes by IANA civil date; classify each date through its resolved calendar; place an automatic deduction at its effective policy threshold | Meets the stated legal-boundary requirement and is deterministic; expands session provenance and timesheet generation |
| B — operational-date allocation | Assign all worked and break minutes to the shift-start date | Simple, but does not satisfy public-holiday or legal-midnight splitting |
| C — jurisdiction strategy | Select the allocation algorithm from a legal-entity/jurisdiction strategy | Broadest compliance model, but requires a jurisdiction rules engine outside the current Time boundary |

Option A is the narrowest choice that satisfies `time.md` §15 without inventing a broader legal rules engine.

### Authorization M01 — production schema (`0006`)

**Status (2026-07-24):** `0006_hr_time_policy.sql` applied through configured branch (`0006_hr_time_policy`, pending forward **0**). Applying `0006` mutated the configured production-backed Neon branch. The migration intentionally returns any pre-migration submitted timesheet without a policy snapshot so it can be resubmitted through the governed approval path; it does not fabricate approval provenance.

| Date | Command | Result |
|---|---|---|
| 2026-07-24 | `pnpm --filter @afenda/db db:check` | PASS |
| 2026-07-24 | `REQUIRE_DATABASE_TESTS=1 pnpm --filter @afenda/human-resources test -- human-resources.time.parity` | **40/40 PASS** (20 memory + 20 Drizzle) |
| 2026-07-24 | `pnpm audit:tenancy-nulls` | **176** hard-tenant roots PASS |
| 2026-07-24 | `REQUIRE_DATABASE_TESTS=1 pnpm --filter @afenda/human-resources test -- time-policy-concurrency` | PASS |

### Authorization C01-A — calendar scope (`0007`)

**Status (2026-07-24):** `0007_hr_work_calendar_scope.sql` applied through configured branch (`hr_work_calendar_scope_assignment` live). Closes **G05**, scoped **G09**, and **PASS-03** at **177** roots.

| Date | Command | Result |
|---|---|---|
| 2026-07-24 | `pnpm --filter @afenda/db test -- hr-work-calendar-scope-migration` | **3/3 PASS** |
| 2026-07-24 | `pnpm --filter @afenda/human-resources test -- calendar-scope-resolution` | **6/6 PASS** |
| 2026-07-24 | `pnpm --filter @afenda/human-resources test -- calendar-scope-assignment` | **3/3 PASS** |
| 2026-07-24 | `REQUIRE_DATABASE_TESTS=1 pnpm --filter @afenda/human-resources test -- calendar-scope.parity` | **18/18 PASS** (9 memory + 9 Drizzle) |
| 2026-07-24 | `pnpm audit:tenancy-nulls` | **177** hard-tenant roots PASS |

### Authorization HR-ENT-01 — workforce foundation (`0008`)

**Status (2026-07-24):** `0008_hr_workforce_foundation.sql` applied through the
guarded migrator on the configured protected production branch. The migration
ledger is 9/9 with pending forward 0; `hr_person` and `hr_worker` are live.

| Date | Command | Result |
|---|---|---|
| 2026-07-24 | `pnpm --filter @afenda/db db:check` | **PASS** |
| 2026-07-24 | `AFENDA_ALLOW_DB_MIGRATE=1 pnpm --filter @afenda/db db:migrate` | **PASS** — no baseline/destructive override |
| 2026-07-24 | `pnpm --filter @afenda/db db:migration-status` | **9/9**, applied through `0008`, pending 0 |
| 2026-07-24 | `pnpm audit:tenancy-nulls` | **179** hard-tenant roots PASS; 0 skipped |
| 2026-07-24 | `pnpm --filter @afenda/db test` | **20 files / 80 tests PASS** |
| 2026-07-24 | `REQUIRE_DATABASE_TESTS=1` targeted workforce foundation parity | **1 file / 2 tests PASS** |

## Implementation slices

| Slice | Gaps | Deliverables | Prove-It evidence |
|---|---|---|---|
| T-C01 — governance and hygiene | G01, G02 | Regenerated command/event registers; Time-scoped imports/formatting clean; all forbidden non-null assertions removed without weakening invariants | `pnpm validate:modules`; Time-scoped `pnpm exec biome check ...`; HR lint/typecheck |
| T-C02 — model parity | G03, G04 | Six timesheet dimensions flow through schema → type → store → memory/Drizzle; assignment segments gain branded identity, schemas, store operations, public commands/queries, exports, and tests | schema/type contract tests; adapter parity; HR typecheck |
| T-C03 — assignment validity and history | G05, G06 | Scheduling, attendance, and overtime validate active employment/effective assignment; published facts become immutable once attendance exists; definition amendments create effective-dated successors. **G05 closed (C01-A):** calendar scope resolution across employment/location/department/legal entity | negative validity tests; post-attendance mutation conflict tests; successor success/rollback tests; scoped calendar parity (`calendar-scope.parity.test.ts`) |
| T-C04 — legal time calculation | G07, G08 | Central IANA timezone validator; complete exception detection; deterministic cross-midnight allocation across work date, holiday/rest-day, break, and overtime boundaries | invalid-zone tests; DST/overnight tests; one test per exception type; adapter parity |
| T-C05 — policy and approval | G10 | Effective-dated time-policy and assignment aggregates; break deduction and waiver evidence; approval-chain resolution and authorization for submit/reopen/approve/lock | policy-version tests; break evidence tests; multi-step approval tests; memory/Drizzle parity |
| T-C06 — contract convergence | G09 | One parameterized acceptance contract runs the same behavioral matrix against memory and Drizzle stores; dialect-only mechanics remain in adapter-specific tests | shared suite green for both adapters |
| T-C07 — evidence reconciliation | G11 | `time-slices-roadmap.md` and `human-resources-roadmap.md` reflect disk and exact test counts; no unsupported readiness claim | documentation diff review; full exit gates |

## Slice acceptance rules

- Each write remains organization-scoped and uses the existing HR store/port boundary.
- IDs use owning brands; inputs derive from owning Zod schemas.
- Published or payroll-handed-off facts are append-only or superseded, never silently rewritten.
- Memory and Drizzle adapters return the same result code and state transition for the same scenario.
- Expected failures return the existing `Result`/`ActionResult` vocabulary; no throw-based business control flow.
- Tests live in `packages/erp/human-resources/__tests__/` and run at L0 unless a browser-only claim is introduced.
- Generated registers are machine-written and reviewed; no manual register drift.

## Exit gates

```text
pnpm validate:modules
pnpm governance:packages
pnpm --filter @afenda/human-resources lint
pnpm --filter @afenda/human-resources typecheck
pnpm --filter @afenda/human-resources test -- human-resources.time
pnpm --filter @afenda/human-resources test -- emission-registry correlation-integrity
pnpm --filter @afenda/events test
pnpm --filter @afenda/web test -- hr-time-actions
pnpm --filter @afenda/web typecheck
pnpm audit:tenancy-nulls
pnpm check:docs-trunk-ban
```

Current verdict: **Implementation in progress. HR10 and Time remain not claimable until T-C01–T-C07 are green.**
