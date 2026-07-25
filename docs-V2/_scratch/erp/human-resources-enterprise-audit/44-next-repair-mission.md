# HR-AUD-04 — Next repair mission

| Field | Value |
|---|---|
| Mission | **HR-AUD-04** (consolidation) |
| Selected next vertical repair | **HR-OPS-LEAVE-EMISSION-REGISTRY / PR 3.0** |
| Prior closed vertical | **HR-COREORG-DB-INVARIANTS** (**CLOSED** 2026-07-25) |
| Selection date | 2026-07-25 |
| Phase 0 | **Exit MET** — Slice 0.1 CLOSED · Slice 0.2 RATIFIED · Slice 0.3 DONE |
| Slice 1.1 | **DONE** — HR-OPS-TIME-CALENDAR-RESOLUTION-FIXTURES / HR-OPS-P1-005 **CLOSED** |
| Authority | [`00.hrm.md`](../../00.hrm.md) · [`43-repair-roadmap.md`](43-repair-roadmap.md) · [`41-consolidated-conflict-register.md`](41-consolidated-conflict-register.md) |

Related: [`43-repair-roadmap.md`](43-repair-roadmap.md) · [`41-consolidated-conflict-register.md`](41-consolidated-conflict-register.md) · [`00.hrm.md`](../../00.hrm.md)

---

## Active mission queue (sole entry)

**HR-OPS-LEAVE-EMISSION-REGISTRY / PR 3.0** — Phase 3 registry infrastructure + leave executor pilot per [`00-phase3.md`](../../00-phase3.md). HR-COREORG-DB-INVARIANTS gate **CLOSED**.

---

## Recently closed — HR-COREORG-DB-INVARIANTS (2026-07-25)

| Field | Value |
|---|---|
| **Mission ID** | HR-COREORG-DB-INVARIANTS |
| **Status** | **CLOSED** |
| **Migration** | `0018_hr_coreorg_db_invariants.sql` |
| **Constraints** | `hr_work_assignment_effective_range_ck` · `hr_employment_contract_effective_range_ck` · `hr_reporting_line_effective_range_ck` |
| **Tests** | `packages/data-plane/db/__tests__/hr-coreorg-db-invariants-migration.test.ts` |
| **Overlap disposition** | [`hr-coreorg-db-invariant-exclusion-register.json`](hr-coreorg-db-invariant-exclusion-register.json) |
| **Rollback** | Drop three `*_effective_range_ck` constraints (see register) |

**Verify (apply migration on target branch, then):**

```bash
pnpm --filter @afenda/db typecheck
pnpm --filter @afenda/db test -- hr-coreorg-db-invariants-migration
```

---

## Recently closed — HR-ENT-TALENT-SENSITIVE-ENFORCE (2026-07-25)

| Field | Value |
|---|---|
| **Mission ID** | HR-ENT-TALENT-SENSITIVE-ENFORCE |
| **Slice** | Phase 2 · Slice 2.3 |
| **Status** | **CLOSED** |
| **Outcome** | Talent sensitive reads through unified authorization facade + field projection; ad-hoc gates removed; employee-scoped lists via `runAuthorizedTalentSubjectListQuery`; load-then-authorize via `runAuthorizedTalentLoadedReadQuery` |
| **Finding tranche** | HR-GOV-P1-003 talent enforcement slice **closed** (WFP/compensation sensitive enforcement remain separate missions) |

**Verify (green):**

```bash
pnpm --filter @afenda/human-resources typecheck
# Exit 0

pnpm --filter @afenda/human-resources test -- \
  sensitive-domain-policies human-resources.talent end-to-end-authorization talent-authorization-enforcement
# Exit 0 — 4 files · 42 passed · 3 skipped

REQUIRE_DATABASE_TESTS=1 pnpm --filter @afenda/human-resources test -- human-resources.talent.parity
# Exit 0 — 1 file · 5 passed · 3 skipped
```

**Residual (out of scope):** `apps/web` talent Actions (Phase 11); `getSuccessionPlanById` projection N/A — `SuccessionPlan` has no nested candidate readiness (list candidates projects).

---

## Recently closed — HR-OPS-LEAVE-EMISSION-REGISTRY (2026-07-25)

| Field | Value |
|---|---|
| **Mission ID** | HR-OPS-LEAVE-EMISSION-REGISTRY |
| **Status** | **CLOSED** |
| **Evidence** | `HUMAN_RESOURCES_LEAVE_COMMAND_IDS` (18/18) in `mutation-emission-registry.ts`; `emission-registry-parity.test.ts` leave block; correlation sample (submit · approve · reject) in `correlation-integrity.test.ts` |
| **Finding tranche** | HR-OPS-P0-001 leave emission slice **closed** (HR-XCUT-P0-003 remains partially open for full registry) |

**Verify (green):**

```bash
pnpm --filter @afenda/human-resources test -- human-resources.leave correlation-integrity emission-registry-parity
```

---

## Prior active mission queue (historical)

---

## Slice 0.1 — Closed findings (not open/next blockers)

| ID | Status | Residual |
|---|---|---|
| HR-ENT-ER-CASE-LIST-ACL | **CLOSED** | Employee Relations Memory/Drizzle list ACL **database parity** = **evidence residual only** — does not reopen this mission or HR-GOV-P0-001 |
| HR-GOV-P0-001 | **CLOSED** | Same ER DB parity evidence residual only |
| HR-COREORG-CANDIDATE-CONSENT-ALIGN | **CLOSED** | Hire orchestration remains separate (HR-COREORG-HIRE-ORCHESTRATION) |
| HR-COREORG-P0-001 | **CLOSED** | Alias HR-COREORG-P1-001 stays merged — do not reopen |
| HR-OPS-OVERTIME-APPROVAL-AUTHORITY | **CLOSED** | Related open items (e.g. HR-OPS-P1-006) stay separate |
| HR-OPS-P1-001 | **CLOSED** | — |

Do **not** select any of the above as the next vertical repair.

---

## Slice 1.1 — Closed findings (not open/next blockers)

| ID | Status | Residual |
|---|---|---|
| HR-OPS-TIME-CALENDAR-RESOLUTION-FIXTURES | **CLOSED** | Evidence: `calendar-scope*` + `human-resources.time` unit + `REQUIRE_DATABASE_TESTS=1` parity green; typecheck green (2026-07-24) |
| HR-OPS-P1-005 | **CLOSED** | Same mission — do not reopen |

Do **not** select calendar fixtures as the next vertical repair.

---

## Slice 1.2 / 1.3 — Closed findings (not open/next blockers)

| ID | Status | Residual |
|---|---|---|
| HR-COREORG-LIFECYCLE-SERIALIZE-PARITY | **CLOSED** | Slice 1.2 — do not reopen |
| HR-COREORG-P2-002 | **CLOSED** | Same mission |
| HR-ENT-WFP-RESERVATION-CONSUME | **CLOSED** | Evidence: offer-accept consume + duplicate/released/cross-tenant reject unit green; typecheck green (2026-07-24) |
| HR-GOV-P2-004 | **CLOSED** | Same mission — do not reopen |

Do **not** select reservation consume or lifecycle serialize as the next vertical repair.

---

## Selection rationale (current next)

| Priority bucket | Candidate | Disposition |
|---|---|---|
| Closed (Slice 0.1) | HR-ENT-ER-CASE-LIST-ACL · HR-COREORG-CANDIDATE-CONSENT-ALIGN · HR-OPS-OVERTIME-APPROVAL-AUTHORITY | **Removed** from open/next queue |
| Closed (Slice 1.1) | HR-OPS-TIME-CALENDAR-RESOLUTION-FIXTURES / HR-OPS-P1-005 | **CLOSED** — evidence landed |
| Closed (Slice 1.2) | HR-COREORG-LIFECYCLE-SERIALIZE-PARITY / HR-COREORG-P2-002 | **CLOSED** — do not reopen |
| Closed (Slice 1.3) | HR-ENT-WFP-RESERVATION-CONSUME / HR-GOV-P2-004 | **CLOSED** — do not reopen |
| Phase 0 authority | Slice 0.2 decisions · Slice 0.3 artifact refresh | **DONE** — Phase 0 exit MET |
| 1 — Evidence chain / ops correctness | HR-OPS-LEAVE-EMISSION-REGISTRY / PR 3.0 (leave correlation) | **Selected** — sole active vertical |
| 2 — DB invariants | HR-COREORG-DB-INVARIANTS | **CLOSED** 2026-07-25 — not a blocker |
| Package-wide cleanup | HR-XCUT-EMISSION-REGISTRY | **Rejected** as next mission per selection rule |

**Phase 1 note:** Slice 1.1–1.3 **CLOSED** (2026-07-24). This file names the **next vertical repair** — leave emission registry.

---

## Closed mission record — HR-OPS-TIME-CALENDAR-RESOLUTION-FIXTURES

| Field | Value |
|---|---|
| **Mission ID** | HR-OPS-TIME-CALENDAR-RESOLUTION-FIXTURES |
| **Related HR-ENT** | HR-ENT-16 · HR-ENT-14 |
| **Primary finding** | HR-OPS-P1-005 → **CLOSED** |
| **Status** | **CLOSED** (Slice 1.1 · 2026-07-24) |

### Evidence

```bash
pnpm --filter @afenda/human-resources test -- calendar-scope human-resources.time
# Exit 0 — 10 files · 90 passed | 29 skipped

REQUIRE_DATABASE_TESTS=1 DATABASE_URL=<local> pnpm --filter @afenda/human-resources test -- human-resources.time calendar-scope
# Exit 0 — 10 files · 119 passed

pnpm --filter @afenda/human-resources typecheck
# Exit 0
```

### Residual findings (out of scope for Slice 1.1)

| ID | Owner mission |
|---|---|
| ER DB parity evidence residual | Retained only — **not** an active blocker |
| HR-XCUT-P0-001 / HR-XCUT-P0-004 | **CLOSED** Slice 2.10 — not a residual blocker |
| OPEN-DECISION-02 (**RATIFIED** Slice 0.2) | Implementation **CLOSED** Slice 2.10 |
| HR-OPS-P0-001 / HR-XCUT-P0-003 | HR-OPS-LEAVE-EMISSION-REGISTRY / HR-XCUT-EMISSION-REGISTRY |
| HR-COREORG-P2-002 | **CLOSED** Slice 1.2 — not a residual blocker |
| HR-GOV-P2-004 | **CLOSED** Slice 1.3 — not a residual blocker |
| HR-XCUT-P1-003 | enterprise.md count refresh |

---

## Closed mission record — HR-ENT-04-AUTH-PRIVACY (Slice 2.10)

| Field | Value |
|---|---|
| **Mission ID** | HR-ENT-04-AUTH-PRIVACY |
| **Related HR-ENT** | HR-ENT-06 · HR-ENT-07 |
| **Primary findings** | HR-XCUT-P0-001 · HR-XCUT-P0-004 → **CLOSED** |
| **Status** | **CLOSED** (Slice 2.10 · 2026-07-25) |

### Evidence

```bash
pnpm --filter @afenda/human-resources test -- \
  authorization-policy-registry contextual-authorization-privacy authorization-facade-boundary
# Exit 0 — 3 files · 28 passed

pnpm --filter @afenda/human-resources test -- \
  employee-relations-case-list-acl human-resources.employee-relations
# Exit 0 — 21 passed

REQUIRE_DATABASE_TESTS=1 \
pnpm --filter @afenda/human-resources test -- \
  human-resources.employee-relations.parity human-resources.privacy.parity
# Exit 0 — 5 passed

pnpm --filter @afenda/web test -- human-resources-privacy-port
# Exit 0 — 6 passed

pnpm --filter @afenda/human-resources typecheck
pnpm --filter @afenda/human-resources lint
pnpm --filter @afenda/human-resources test
# Exit 0 — 83 files · 698 passed · 1 skipped

pnpm validate:modules
# Exit 0
```

### Residual findings (out of scope for Slice 2.10)

| ID | Owner mission |
|---|---|
| HR-GOV-P1-003 · HR-GOV-P2-005 | Sensitive prefix policy coverage (HR-ENT-TALENT/WFP-SENSITIVE-POLICY) |
| ER DB parity evidence residual | Retained only — **not** an active blocker |

---

## Closed mission record — HR-ENT-TALENT-SENSITIVE-ENFORCE (Slice 2.3)

| Field | Value |
|---|---|
| **Mission ID** | HR-ENT-TALENT-SENSITIVE-ENFORCE |
| **Related HR-ENT** | HR-ENT-06 · HR-ENT-07 |
| **Primary findings** | HR-GOV-P1-003 (talent tranche) → **CLOSED** |
| **Status** | **CLOSED** (Slice 2.3 · 2026-07-25) |

### Evidence

```bash
pnpm --filter @afenda/human-resources typecheck
# Exit 0

pnpm --filter @afenda/human-resources test -- \
  sensitive-domain-policies human-resources.talent end-to-end-authorization talent-authorization-enforcement
# Exit 0 — 4 files · 42 passed · 3 skipped

REQUIRE_DATABASE_TESTS=1 pnpm --filter @afenda/human-resources test -- human-resources.talent.parity
# Exit 0 — 1 file · 5 passed · 3 skipped
```

### Residual findings (out of scope for Slice 2.3)

| ID | Owner mission |
|---|---|
| HR-ENT-WFP-SENSITIVE-ENFORCE | WFP runner parity shell removal |
| HR-ENT-COMP-SENSITIVE-ENFORCE | Compensation runner consolidation |
| Phase 11 talent Actions | `hr-talent.ts` product composition |

---

## Closed mission record — HR-ENT-WFP-RESERVATION-CONSUME

| Field | Value |
|---|---|
| **Mission ID** | HR-ENT-WFP-RESERVATION-CONSUME |
| **Related HR-ENT** | HR-ENT-16 · HR-ENT-18 |
| **Primary finding** | HR-GOV-P2-004 → **CLOSED** |
| **Status** | **CLOSED** (Slice 1.3 · 2026-07-24) |

### Evidence

```bash
pnpm --filter @afenda/human-resources test -- human-resources.workforce-planning
# Exit 0 — 2 files · 21 passed

pnpm --filter @afenda/human-resources typecheck
# Exit 0
```

### Residual findings (out of scope for Slice 1.3)

| ID | Owner mission |
|---|---|
| HR-ENT-WFP-VARIANCE-ACTUALS / HR-GOV-P1-002 | Employment-backed variance (OPEN-DECISION-C1) |
| HR-COREORG-HIRE-ORCHESTRATION | Full hire saga beyond reservation consume |
| HR-OPS-P0-001 | HR-OPS-LEAVE-EMISSION-REGISTRY |

---

## Mission sheet — HR-OPS-LEAVE-EMISSION-REGISTRY

| Field | Value |
|---|---|
| **Mission ID** | HR-OPS-LEAVE-EMISSION-REGISTRY |
| **Related HR-ENT** | HR-ENT-13 · HR-ENT-16 |
| **Vertical outcome** | All 18 leave mutations registered in `mutation-emission-registry.ts` with audit/domain_event mapping; correlation sample green |
| **Primary finding** | HR-OPS-P0-001 |

### Allowed paths

- `packages/erp/human-resources/src/mutation-emission-registry.ts`
- Leave command IDs / leave emission parity tests under `packages/erp/human-resources/**`

### Prohibited paths

- Full 286-command emission registry sweep
- Reopening Slice 0.1 / Slice 1.1 / Slice 1.2 / Slice 1.3 closed IDs
- apps/web product UI
- Unrelated calendar fixture rework

### Prerequisites

- Phase 0 exit MET
- Slice 1.1 calendar fixtures **CLOSED**
- Slice 1.2 lifecycle serialize parity **CLOSED**
- Slice 1.3 WFP reservation consume **CLOSED**

### Acceptance criteria

1. Leave registry 18/18 classified.
2. Correlation test covers sample leave commands.
3. Scratch trail: HR-OPS-P0-001 tranche closed when evidence lands.

### Required commands

```bash
pnpm --filter @afenda/human-resources test -- human-resources.leave correlation-integrity
pnpm --filter @afenda/human-resources typecheck
```

---

## Copy-paste prompt for new Agent chat

```text
Mission: HR-OPS-LEAVE-EMISSION-REGISTRY
Type: vertical repair
HR-ENT: HR-ENT-13, HR-ENT-16
Finding: HR-OPS-P0-001

Objective: Register all 18 leave mutations in mutation-emission-registry with audit/domain_event mapping; prove correlation sample.

Read first:
- docs-V2/_scratch/00.hrm.md (Phase 1 · Slice 1.1 CLOSED)
- docs-V2/_scratch/erp/human-resources-enterprise-audit/44-next-repair-mission.md
- docs-V2/_scratch/erp/human-resources-enterprise-audit/43-repair-roadmap.md

Slice 0.1 CLOSED (do not reopen): HR-ENT-ER-CASE-LIST-ACL, HR-COREORG-CANDIDATE-CONSENT-ALIGN, HR-OPS-OVERTIME-APPROVAL-AUTHORITY, HR-COREORG-P0-001, HR-OPS-P1-001.
Slice 1.1 CLOSED: HR-OPS-TIME-CALENDAR-RESOLUTION-FIXTURES / HR-OPS-P1-005.
Slice 1.2 CLOSED: HR-COREORG-LIFECYCLE-SERIALIZE-PARITY / HR-COREORG-P2-002.
Slice 1.3 CLOSED: HR-ENT-WFP-RESERVATION-CONSUME / HR-GOV-P2-004.
Slice 0.2 DONE: OPEN-DECISION-01…05, A1…A3, C1 ratified (do not re-litigate).

Verify:
pnpm --filter @afenda/human-resources test -- human-resources.leave correlation-integrity
pnpm --filter @afenda/human-resources typecheck
```

---

## Final verdict (HR-AUD-04)

### **partially implemented**

| Criterion | Evidence |
|---|---|
| Not enterprise-ready | Emission registry incomplete (leave 0/18); product Actions thin; sensitive-runner bypass open; `getHumanResourcesPrivacyCase` forward-recorded |
| Not scaffold-heavy | 289 commands, 142 queries, 106 mutation tables, deep leave/time transactional SQL, gov/ER/WFP package contracts exceed UI |
| Phase 0 exit | Slice 0.1–0.3 **MET** |
| Slice 1.1 | Calendar fixtures **CLOSED** — HR-OPS-P1-005 no longer an evidence blocker |
| Partially implemented | Strong kernels; remaining blockers concentrated in leave emission registry and product composition (authz/privacy facade **CLOSED** Slice 2.10) |

**Single-sentence verdict:** The HR package has substantial enterprise-grade domain depth; Phase 0 exit and Slice 1.1–2.6 calendar/auth/privacy evidence close removed completed verticals from the active queue, but leave emission, sensitive-runner enforcement, and product composition gaps still prevent an enterprise-ready claim — status remains **partially implemented**.

---

## Post-mission queue (after HR-OPS-LEAVE-EMISSION-REGISTRY)

1. **HR-COREORG-DB-INVARIANTS** — active queue (Phase 1 roadmap order)
2. **HR-XCUT-EMISSION-REGISTRY** — full cross-domain emission sweep (explicitly out of leave tranche scope)

**Closed out of post-queue:** HR-OPS-LEAVE-OVERLAP-GUARD / HR-OPS-P2-004 (Slice 4.7, 2026-07-25); HR-OPS-LEAVE-EMISSION-REGISTRY / HR-OPS-P0-001 leave tranche (2026-07-25); HR-ENT-TALENT-SENSITIVE-ENFORCE (Slice 2.3); HR-ENT-07-DSAR-DEPTH (Slice 2.7); HR-ENT-04-AUTH-PRIVACY / HR-XCUT-P0-001 / HR-XCUT-P0-004 (Slice 2.10); HR-OPS-TIME-CALENDAR-RESOLUTION-FIXTURES / HR-OPS-P1-005 (Slice 1.1); HR-COREORG-LIFECYCLE-SERIALIZE-PARITY / HR-COREORG-P2-002 (Slice 1.2); HR-ENT-WFP-RESERVATION-CONSUME / HR-GOV-P2-004 (Slice 1.3).

Full program: [`43-repair-roadmap.md`](43-repair-roadmap.md)
