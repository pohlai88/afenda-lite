# HR-AUD-04 — Five-axis domain scorecard

| Field | Value |
|---|---|
| Mission | **HR-AUD-04** |
| Type | Consolidation only |
| Axes | Contract · Correctness · Authz/Privacy · Parity · Evidence/Composition |
| Scale | **Pass** · **Partial** · **Gap** · **Fail** · **N/A** · **Unaudited** |
| Phase 0 | **Exit MET** — Slice 0.1 CLOSED · Slice 0.2 RATIFIED · Slice 0.3 DONE; Slice 1.1 calendar **CLOSED**; next vertical = leave emission ([`44`](44-next-repair-mission.md)) |

Inputs: [`10-workforce-foundation-cluster.md`](10-workforce-foundation-cluster.md) · [`20-workforce-operations-cluster.md`](20-workforce-operations-cluster.md) · [`30-governance-risk-planning-cluster.md`](30-governance-risk-planning-cluster.md)

---

## Axis definitions

| Axis | Pass | Partial | Gap/Fail |
|---|---|---|---|
| Contract completeness | Schema → command → store → adapter → DDL aligned | Minor drift or doc-only gaps | Type/DDL/Zod triple drift or missing surface |
| Correctness & invariants | Guards + transactions tested | Command-enforced only; missing DDL | Wrong semantics or red tests |
| Authorization & privacy | Unified sensitive policy + projection | Manifest guards; partial projection | ACL bypass or privacy port unwired |
| Persistence parity | Memory/Drizzle green for slice | One parity edge case | Typecheck fail or parity red |
| Evidence & composition | Unit + parity + product Actions | Unit or parity only | Blocked tests or zero product composition |

**Overall** = weakest blocking axis per domain row.

---

## Cluster A — workforce foundation

| Domain | Contract | Correctness | Authz/Privacy | Parity | Evidence | Overall |
|---|---|---|---|---|---|---|
| person | Pass | Pass | Partial | Pass | Pass | **Partial** |
| worker | Pass | Pass | Partial | Pass | Pass | **Partial** |
| employee | Pass | Pass | Partial | Pass | Pass | **Partial** |
| employment | Pass | Partial | Gap | Pass | Pass | **Partial** |
| employment contract | Pass | Partial | Gap | Pass | Pass | **Partial** |
| assignment | Pass | Partial | Gap | Pass | Pass | **Partial** |
| organization context | Pass | Pass | N/A | Pass | Partial | **Partial** |
| department / job / position / reporting | Pass | Partial | Gap | Pass | Pass | **Pass** |
| lifecycle (onboard→offboard) | Pass | Partial | Gap | Partial | Partial | **Partial** |
| recruitment (requisition→offer) | Partial | Partial | Gap | Partial | Partial | **Partial** |
| classification | N/A | Pass | N/A | N/A | Pass | **N/A** |

**Cluster A rollup:** recruitment consent drift no longer a Fail axis (HR-COREORG-P0-001 **closed**, Slice 0.1); remaining Partial/Gap axes are hire orchestration and product composition

---

## Cluster B — workforce operations

### Leave

| Capability | Contract | Correctness | Authz/Privacy | Parity | Evidence | Overall |
|---|---|---|---|---|---|---|
| policies / lineage / entitlements | Pass | Partial | Pass | Pass | Pass | **Partial** |
| balances / requests / approval / cancel | Pass | Partial | Pass | Pass | Pass | **Partial** |
| leave-aware time / handoff | Pass | Partial | Partial | Partial | Pass | **Partial** |
| leave emission registry | Pass | Pass | Gap | Pass | Gap | **Fail** |

### Time

| Capability | Contract | Correctness | Authz/Privacy | Parity | Evidence | Overall |
|---|---|---|---|---|---|---|
| calendars / scope resolution | Pass | Pass | Pass | Pass | Pass | **Pass** |
| shifts / scheduling / attendance | Pass | Pass | Pass | Pass | Pass | **Pass** |
| timesheets / generation | Pass | Pass | Pass | Pass | Pass | **Pass** |
| overtime | Pass | Partial | Pass | Pass | Pass | **Partial** |
| time emission registry | Pass | Pass | Pass | Pass | Pass | **Pass** |
| attendance connector (HR-ENT-14) | Pass | Pass | N/A | N/A | Partial | **Partial** |

**Cluster B rollup:** Strongest HR surface; calendar resolution **Pass** (Slice 1.1 CLOSED); blockers = leave emission (Fail), leave product Actions absent (Partial evidence)

---

## Cluster C — governance, risk, planning (Prompt 2C)

| Domain | Contract | Correctness | Authz/Privacy | Parity | Evidence | Overall |
|---|---|---|---|---|---|---|
| compliance | Pass | Partial | Partial | Pass | Partial | **Partial** |
| employee relations | Pass | Pass | Pass† | Pass | Partial‡ | **Partial** |
| talent | Pass | Pass | Partial | Pass§ | Fail | **Fail** |
| workforce planning | Pass | Partial | Partial | Partial | Partial | **Partial** |
| integration / governance ports | Pass | Partial | Fail | N/A | Partial | **Partial** |

† **Authz/Privacy Pass (Slice 0.1):** HR-GOV-P0-001 / HR-ENT-ER-CASE-LIST-ACL **closed**. List paths use `evaluateCaseReadAccess` + projection; unit matrix green.

‡ **Evidence Partial — ER DB parity residual only:** Employee Relations Memory/Drizzle list ACL database parity remains an **evidence residual**, not an active blocker reopen of the closed finding.

§ **Parity Pass (structure):** talent parity suites exist; DATABASE_URL not loaded in AUD-03 session — execution not verified.

---

## Unaudited domains (scope orphan)

| Domain | Contract | Correctness | Authz/Privacy | Parity | Evidence | Overall |
|---|---|---|---|---|---|---|
| compensation-benefits | Unaudited | Unaudited | Unaudited | Unaudited | Unaudited | **Unaudited** |
| performance | Unaudited | Unaudited | Unaudited | Unaudited | Unaudited | **Unaudited** |
| learning | Unaudited | Unaudited | Unaudited | Unaudited | Unaudited | **Unaudited** |

Authority: AUD-00 Cluster C listed these domains; AUD-02 Prompt 2B and AUD-03 Prompt 2C excluded each other — no dedicated pack.

---

## Package-wide cross-cut scorecard

| Surface | Contract | Correctness | Authz/Privacy | Parity | Evidence | Overall |
|---|---|---|---|---|---|---|
| Tenancy / mutation tables | Pass | Pass | Pass | N/A | Pass | **Pass** |
| Brands / Zod / error codes | Pass | Pass | N/A | N/A | Pass | **Pass** |
| Effective-truth matrix (33 tables) | Partial | Pass | N/A | Pass | Pass | **Partial** |
| Mutation emission registry | Partial | Partial | N/A | N/A | Fail | **Fail** |
| Authorization kernel | Partial | Pass | Fail | N/A | Partial | **Fail** |
| Privacy port | Pass (types) | N/A | Fail | N/A | Fail | **Fail** |
| Memory/Drizzle compose | Pass | Pass | N/A | Pass | Partial | **Partial** |
| Package typecheck / CI | Partial | N/A | N/A | N/A | Partial | **Partial** |
| Product composition (apps/web) | Partial | N/A | Partial | N/A | Gap | **Gap** |

---

## Executive rollup

| Cluster | Headline | Blocking axes |
|---|---|---|
| A | Strong person/worker/org kernel; recruitment consent **closed** (Slice 0.1) | Remaining Gap axes: hire orchestration / product composition — not consent drift |
| B | Strongest domain depth; overtime authority **closed**; calendar resolution **Pass** (Slice 1.1); time emission **Pass** | Leave emission Fail |
| C | Strong contracts; ER list ACL **closed**; thin product | Privacy Fail; talent evidence Fail; ER DB parity = evidence residual only |
| Cross-cut | Mature kernel; incomplete consumption | Emission registry Fail; privacy Fail; authz facade Fail |

**Consolidated module posture:** domain logic substantially exceeds product surface; Phase 0 exit MET (Slice 0.1–0.3); Slice 1.1 calendar **CLOSED**; next vertical = `HR-OPS-LEAVE-EMISSION-REGISTRY`; remaining package/product gaps still block enterprise-ready claims.

---

## Finding cross-reference (material Fail/Gap axes)

| Domain row | Primary finding IDs |
|---|---|
| recruitment | — (HR-COREORG-P0-001 **closed**); residual open: HR-COREORG-P1-005 hire orchestration |
| leave emission | HR-OPS-P0-001 → HR-XCUT-P0-003 |
| calendar resolution | — (HR-OPS-P1-005 **closed** Slice 1.1) |
| employee relations authz | — (HR-GOV-P0-001 **closed**); ER DB parity = evidence residual only |
| overtime approval authority | — (HR-OPS-P1-001 **closed**) |
| privacy | HR-XCUT-P0-004 |
| emission registry | HR-XCUT-P0-003 |
| package typecheck | — (HR-COREORG-P0-001 **closed**); remaining CI gaps tracked under HR-ENT-18 open findings |
| product surfaces | HR-OPS-P1-003, HR-GOV-P1-004 |
| effective truth scope | HR-XCUT-P0-002 |
