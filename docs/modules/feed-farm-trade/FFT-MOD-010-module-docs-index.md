# FFT-MOD-010 Module Docs Index + Roadmap

| Field             | Value                      |
| ----------------- | -------------------------- |
| **ID**            | FFT-MOD-010                |
| **Category**      | Module                     |
| **Version**       | 2.5.0 |
| **Status**        | Living                     |
| **Control State** | Closed                     |
| **Owner**         | Feed Farm Trade            |
| **Updated**       | 2026-07-17                 |
| **Spine**         | MOD-010 Module Docs Index |

---

# 1. Purpose

Module docs index, agent read order, roadmap/gap register, and **Module Enterprise Readiness** claim aggregation for Feed Farm Trade.

**Audience:** engineers and agents joining FFT work.
**Action enabled:** navigate the spine; distinguish program roadmap from Module Enterprise Readiness; never claim readiness without [FFT-MOD-009](FFT-MOD-009-verification.md) evidence.

**Architecture / locks:** [FFT-MOD-001](FFT-MOD-001-module-architecture.md)  
**Runtime:** [FFT-MOD-008](FFT-MOD-008-ops-runtime.md)  
**Evidence ledger:** [FFT-MOD-009](FFT-MOD-009-verification.md)  
**Category standard:** [MOD-002](../MOD-002-modules-index.md)  
**Skill:** [`.cursor/skills/feed-farm-trade`](../../../.cursor/skills/feed-farm-trade/SKILL.md)

---

# 2. Scope

## 2.1 In Scope

- Agent read order and spine catalog
- Module Enterprise Readiness aggregation (Applicability · Activation · Evidence)
- Program roadmap / gap register (P0–P3) — historical and planning context
- Builder rules and frozen boundaries
- Directory layout (flat pack only)

## 2.2 Out of Scope

- Product locks detail → [FFT-MOD-001](FFT-MOD-001-module-architecture.md)
- Production allow/forbid → [FFT-MOD-008](FFT-MOD-008-ops-runtime.md)
- Evidence rows → [FFT-MOD-009](FFT-MOD-009-verification.md)
- Recreating `adr/` / `ops/` / `spec/` under this module
- Afenda-Elite / product / release certification from this module alone

---

# 3. Module Docs Index and Roadmap

## 3.1 Agent read order

1. **[FFT-MOD-008](FFT-MOD-008-ops-runtime.md)** — production state, allowed/forbidden, verify
2. **[FFT-MOD-001](FFT-MOD-001-module-architecture.md)** — locks + structure
3. **[FFT-MOD-009](FFT-MOD-009-verification.md)** — structured evidence
4. **This file** — readiness claim + roadmap/gaps
5. Other spine docs as needed (auth → [005](FFT-MOD-005-auth-tenancy-rbac.md), surfaces → [006](FFT-MOD-006-surfaces-and-routes.md), adapters → [007](FFT-MOD-007-api-and-adapters.md), REST index → [FFT-REST-001](FFT-REST-001-feed-farm-trade-resource-index.md) Draft)

Also: [AGENTS.md](../../../AGENTS.md) · [deprecation register](../../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md) · [MOD-002](../MOD-002-modules-index.md)

```text
DO NOT: FftShell, /fft/[locale], customer portal, invent permission codes, rename FFT_*
TRUSTED (Target): apps/web/modules/fft/** · apps/web/features/fft/** · apps/web/app/(operator)/fft/**
READINESS: reconstruct from FFT-MOD-009 — never inherit PASS from historical program prose or ON DISK presence
```

## 3.2 Spine catalog (MOD-001…009)

| Spine | Doc |
|-------|-----|
| MOD-001 Architecture | [FFT-MOD-001](FFT-MOD-001-module-architecture.md) |
| MOD-002 Domain | [FFT-MOD-002](FFT-MOD-002-domain-and-ownership.md) |
| MOD-003 Tech stack | [FFT-MOD-003](FFT-MOD-003-tech-stack.md) |
| MOD-004 Data model | [FFT-MOD-004](FFT-MOD-004-data-model.md) |
| MOD-005 Auth / RBAC | [FFT-MOD-005](FFT-MOD-005-auth-tenancy-rbac.md) |
| MOD-006 Surfaces | [FFT-MOD-006](FFT-MOD-006-surfaces-and-routes.md) |
| MOD-007 API / adapters | [FFT-MOD-007](FFT-MOD-007-api-and-adapters.md) |
| MOD-008 Ops runtime | [FFT-MOD-008](FFT-MOD-008-ops-runtime.md) |
| MOD-009 Verification | [FFT-MOD-009](FFT-MOD-009-verification.md) |

**Depth folders:** removed. Do not recreate `adr/`, `ops/`, `spec/`, etc. under this module.

## 3.3 Module Enterprise Readiness

Authority: [MOD-002](../MOD-002-modules-index.md) §3.3. Evidence SSOT: [FFT-MOD-009](FFT-MOD-009-verification.md) §3.5.

**Quality profiles:** Enterprise Core, ERP

**Module Enterprise Readiness claim:** Not claimable

| Dimension | Aggregation (from FFT-MOD-009 §3.5 @ fc16109) |
| --------- | ------------------------------ |
| Profiles | Enterprise Core and ERP active |
| Applicability | Core and Conditional ACs registered; Out of Scope none |
| Quality dimensions | All active Core/ERP dimensions have owned ACs; result states remain in FFT-MOD-009 |
| Activation | Core rows Enabled; Conditional rows Disabled |
| Evidence | Phase 2A shell: four Core rows `PASS` (001-01 · 001-02 · 003-02 · 004-01); remaining Core/ops/ERP = `NOT EVIDENCED`; Conditional Disabled = `NOT EVIDENCED` (no fail-closed NOT ENABLED yet) |

| Gate | Result |
| ---- | ------ |
| Every Core = Enabled + PASS | Fail (majority `NOT EVIDENCED`) |
| Enabled Conditional = PASS | N/A (no Enabled Conditional rows) |
| Disabled/Uncontracted Conditional = NOT ENABLED with fail-closed evidence | Fail (`NOT EVIDENCED`) |
| Mandatory FAIL / BLOCKED / NOT EVIDENCED | Blocks claim |

Claim marker left **Not claimable** — not hand-promoted. Target Phase 2A shell evidence does **not** satisfy Enterprise Core + ERP claim rules. Do not promote from GUIDE-018 I3.3 program-DONE or path presence alone.

This claim does **not** certify Afenda-Elite, the Afenda product, or a release.

## 3.4 Program roadmap — production slice outcome (not the readiness claim)

Historical program goal: P0 + P1 working cycle (not a documentation binder). Quality bar remains enterprise production ([MOD-002](../MOD-002-modules-index.md)).

**Operator outcome:** Entitled sales/ops can run: setup event (products, supply, custom fields, customer priority) → open window → take orders → transfer → allocate → complete → audit/export. Thin AdminCN pages OK. Full polish = P2. Deposits/pickup/ERP = P3. **Living checkout:** Phase 2A list-only shell only; 2B–2D frozen ([FFT-MOD-008](FFT-MOD-008-ops-runtime.md)).

| Program label | Required | Relationship to readiness |
|---------------|----------|---------------------------|
| Program P0+P1 cycle (incl. G1–G6) | Roadmap target + observable AC | Necessary input to evidence rows — **not** automatic Claimable |
| UI polish | P2 — complete 2026-07-11 | Outside Core readiness unless promoted to AC |
| Ops handoff | P3 — flags + FFT-MOD-008 | Conditional ACs when enabled |
| Customer portal / locale URLs / `FFT_*` rename | Later | Out of Scope / Later |

```mermaid
flowchart LR
  Locks[FFT-MOD-001 locks] --> Arch[FFT-MOD-001 structure]
  Arch --> P0[P0 Shell]
  P0 --> P1[P1 Core cycle]
  P1 --> Evidence[FFT-MOD-009 ledger]
  Evidence --> Claim[Module Enterprise Readiness]
```

**Program status note (historical 2026-07-11):** P0 done; P1 engine+FE wired; P2 polish done; P3 flag-gated. That history is **vacated as a readiness PASS**. See [FFT-MOD-009](FFT-MOD-009-verification.md); skill [completeness.md](../../../.cursor/skills/feed-farm-trade/completeness.md) remains program completeness, not MOD-002 claim authority.

## 3.5 Critical gap register

### G0 — Ops docs — resolved (spine-only home)

Living SSOT: [FFT-MOD-008](FFT-MOD-008-ops-runtime.md). Flag promotion still requires MOD-008 checklist.

### Promote into P1 (wired)

| ID | Capability | Why required for P1 cycle |
|----|------------|---------|
| **G1** | Customer priority | Allocation is priority-ranked |
| **G2** | Supply caps | Allocation without supply is unconstrained |
| **G3** | Order transfer | Default sales_executive includes `transfer.request` |
| **G4** | Order complete | Cycle must close after allocate |
| **G5** | Custom field defs | Template-driven farm programs |
| **G6** | Audit view | Minimum enterprise governance |

### Fix as AC (partly named)

| ID | Issue |
|----|--------|
| **G7** | Clone / template / schedule activate — AC under F-EVT |
| **G8** | Exports (`export.orders`) — AC under F-ADM |
| **G9** | Manual allocation override — AC under F-ALC (sensitive) |

### Keep out of P0–P1 cycle

Offline booth · barcode · floor plans · full feed ERP · VFD · customer portal · mobile-native · deposits/pickup/imports/ERP sync (→ **P3**) · notification polish (→ P3/Later)

## 3.6 P0 — Shell

**Status:** Done (program). Readiness still requires FFT-MOD-009 PASS rows.

Must hold: `requireFftAccess` · FFT nav only when entitled · AdminCN on `/fft/*` · no session → sign-in · locale-free `/fft`.

## 3.7 P1 — Core cycle (program roadmap)

**Status:** Wired 2026-07-11 (program history). Living checkout is Phase 2A list-only; do not treat as Module Enterprise Readiness Claimable until §3.3 opens.

Surfaces: events, setup, order, my-orders, allocation, rbac. P3 surfaces under `/fft/admin/.../deposits|pickup|imports`, `/erp-sync` — flag-gated.

**DoD highlights:** Mutations via `app/actions/fft.ts` + Zod + session/permission; domain only in `modules/fft`; no FftShell / locale tree; REST locale-free ([REST-001](../../api/REST-001-rest-resources.md)).

## 3.8 P2 — UI reopen (not Core readiness)

**Complete 2026-07-11**. Further polish only with named P2-AC + Plan for visual.

## 3.9 P3 — Ops flags (Conditional)

Deposits / pickup / imports / ERP only when `FFT_*` on **and** [FFT-MOD-008](FFT-MOD-008-ops-runtime.md) allows. Evidence for fail-closed-when-disabled lives in FFT-MOD-009 Conditional rows.

| AC | Pass when |
|----|-----------|
| AC-OPS-01 | Flags off → ops writes blocked; P1 still works |
| AC-OPS-02 | Flag on + MOD-008 → F-OPS-* honor permissions |

## 3.10 Later

Customer portal · locale URLs · ERP vendor packs (2D-3) · renaming `FFT_*` / `/fft` · offline/mobile/trade-show · VFD / full mill ERP.

## 3.11 Builder rules

1. Prefer FFT-MOD-001 + this file over locale trees / FftShell.
2. Do not mark Module Enterprise Readiness Claimable without FFT-MOD-009 satisfying MOD-002 claim rules.
3. No customer-portal bleed into FFT PRs.
4. P3 needs MOD-008 checklist — not FE invention.
5. Do not pull industry booth/ERP/VFD into P1 because peers have them.
6. Update [completeness.md](../../../.cursor/skills/feed-farm-trade/completeness.md) when wire status changes — and refresh FFT-MOD-009 before any claim change.
7. Do not reopen FFT 2B–2D product code via documentation migration.

## 3.12 Frozen boundaries

| Item | Value |
|------|-------|
| Phase 1 tag | `fft-phase-1` → `1bc1294` |
| Phase 2A tag | `fft-phase-2a` → `8e650ff` |
| Production RBAC | `FFT_RBAC_ENABLED=true` |
| Production DB | `br-tiny-hill-ao82jp6f` |

## 3.13 Directory layout

```text
docs/modules/feed-farm-trade/
  README.md
  FFT-MOD-001 … FFT-MOD-010
  FFT-REST-001 (Draft)
```

---

# 4. References

| ID | Title | Relationship |
| -- | ----- | ------------ |
| DOC-001 | Documentation Control Standard | Governance |
| MOD-002 | Modules Index | Module Enterprise Readiness standard |
| FFT-MOD-001 | Module Architecture | Locks |
| FFT-MOD-008 | Ops Runtime | Runtime entry |
| FFT-MOD-009 | Verification | Evidence ledger |
| FFT-REST-001 | Feed Farm Trade Resource Index | REST index (Draft) |
| REST-001 | REST Standards and Resource Index | Locale-free FFT HTTP |

---

# 5. Change Log

| Version | Date       | Summary |
| ------- | ---------- | ------- |
| 2.5.0 | 2026-07-17 | **I6.1**: Re-aggregated from FFT-MOD-009 2.1.0 `@fc16109` (four Phase 2A PASS rows; claim stays Not claimable); Target path trust notes; program-roadmap wording aligned to enterprise production bar. |
| 2.4.0 | 2026-07-14 | Activated Enterprise Core + ERP profiles and aggregated the contract ledger; readiness remains Not claimable. |
| 2.3.0   | 2026-07-14 | Re-aggregated from FFT-MOD-009 1.3.0 reconstruction (`BLOCKED`/`NOT EVIDENCED`); claim remains Not claimable (not hand-promoted). |
| 2.2.0   | 2026-07-14 | Wave B: Module Enterprise Readiness aggregation; vacated inherited claimable PASS; claim marker Not claimable. |
| 2.1.1   | 2026-07-14 | Linked Draft GUIDE-016 for enterprise acceptance. |
| 2.1.0   | 2026-07-14 | DOC-003 six-section retrofit; fixed MVP heading; compact index/roadmap. |
| 2.0.1   | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 2.0.0   | 2026-07-13 | Roadmap + gap register recorded in this spine |
| 1.1.0   | 2026-07-13 | Depth folders removed |
| 1.0.0   | 2026-07-13 | Initial index |

---

# 6. Notes

**Spine role:** MOD-010 readiness summary, gaps, roadmap, and claims only. Do not copy evidence rows from MOD-009. Document Living status remains independent of Claimable.
