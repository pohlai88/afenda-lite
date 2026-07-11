# Hot Sales — Phase 2 scoping note

**Status:** Historical candidate-list note — **not** the Phase 2 build contract  
**Phase 1 accepted baseline:** commit `1bc1294` · tag `hot-sales-phase-1` · [../spec/phase-1-prd.md](../spec/phase-1-prd.md)  
**Vision archive:** [../archive/vision.md](../archive/vision.md)  
**Authoritative Phase 2 planning direction:** [./phase-2-feedback.md](./phase-2-feedback.md) (adopted 2026-07-09)  
**Build contract draft:** [../spec/phase-2a-prd.md](../spec/phase-2a-prd.md) (**Accepted**)  
**RBAC ADR draft:** [../adr/001-rbac.md](../adr/001-rbac.md) (**Accepted**)  
**Phase 2A slice plan:** [../spec/phase-2a-slices.md](../spec/phase-2a-slices.md) (**closed**)  
**Ops gate SSOT:** [../ops/gate-register.md](../ops/gate-register.md) (**closed**)

Phase 2A **implementation is closed** (tag `hot-sales-phase-2a` → `8e650ff`). **operational rollout closed** — follow the gate register. Do **not** start 2B–2D from this file.

This file remains as the original **candidate list**. It is **superseded for Phase 2 planning** by [./phase-2-feedback.md](./phase-2-feedback.md) and the Accepted PRD/ADR above. Its **sequencing** and **“7-role RBAC” framing** must not be used as the build contract.

---

## Adopted Phase 2 packaging (from feedback)

```text
2A — SaaS-style configurable RBAC + dedicated /admin/events/new
2B — Finance/deposit tables + Pickup/Ops module
2C — Excel imports + notifications
2D — ERP sync
```

---

## Intent

Phase 1 shipped a reusable Hot Sales event engine under `/trade` (admin + sales allowlist, allocation, deposit/transfer **lite**, CSV export, vi/en). Phase 2 expands toward the full PRD vision without breaking the Phase 1 engine contract (generic events, piglet = template data only).

---

## Candidate workstreams (historical)

### 1. 7-role RBAC — **SUPERSEDED**

| Topic | Notes |
|-------|-------|
| Problem | Phase 1 is Admin (`isAdminSession`) + Sales allowlist only |
| Original sketch | Map fixed PRD job titles onto Neon Auth / `hot_sales_role` |
| **Superseded by** | Fixed permission catalog + client-customisable roles + default templates + scoped assignments + audit — see [./phase-2-feedback.md](./phase-2-feedback.md) Phase 2A |
| Depends on | ADR-001 + PRD-V2-Phase2 approval before any schema |

### 2. Finance / deposit tables

| Topic | Notes |
|-------|-------|
| Problem | Phase 1 deposit is **status tracking only** (`deposit_status` on order) |
| Scope sketch | Dedicated deposit/payment records, amounts, receipts, refund/waive workflows, finance audit |
| Open questions | Settlement in-app vs external ERP as source of truth? |
| Depends on | ERP sync direction; keep Phase 1 status field as projection or migrate |

### 3. Pickup / ops module

| Topic | Notes |
|-------|-------|
| Problem | Phase 1 has `fulfilled_quantity` + complete action; no ops workspace |
| Scope sketch | Pickup windows, locations, ops queue, fulfillment confirmation UI, exception handling |
| Open questions | Same `/trade` surface vs `/trade/.../ops`? Mobile-first? |
| Depends on | Role model (ops role) |

### 4. ERP sync

| Topic | Notes |
|-------|-------|
| Problem | Phase 1 is ERP-ready shape only — no live sync |
| Scope sketch | Outbound order/allocation payloads; inbound supply/customer master; idempotent job runner |
| Open questions | Which ERP? Push vs pull? Retry/DLQ? |
| Depends on | Stable Phase 1 order/allocation IDs (already present) |

### 5. Notifications

| Topic | Notes |
|-------|-------|
| Problem | No event/order notifications in Phase 1 |
| Scope sketch | Open/close reminders, allocation results, transfer approvals, deposit due — email first (Neon shared provider or app mailer policy TBD) |
| Open questions | Prefer Neon Auth mail vs app transactional provider? |
| Depends on | Product copy + locale; do not break declaration-portal mail rules without ADR |

### 6. Excel imports

| Topic | Notes |
|-------|-------|
| Problem | Phase 1 has priority **CSV** only |
| Scope sketch | Excel for priority, products, bulk orders; validation report; dry-run |
| Open questions | Library choice; max row limits; template download UX |
| Depends on | Field-def stability while event is open (locks already exist) |

### 7. Dedicated admin creation route

| Topic | Notes |
|-------|-------|
| Problem | PRD-V2 listed `/admin/events/new`; Phase 1 creates on `/admin/events` |
| Scope sketch | Thin wizard route: name → window → clone-or-blank → redirect to setup |
| Open questions | Worth extracting before other Phase 2 modules? Likely **small polish**, can ship early in Phase 2 or as a Phase 1.1 patch |
| Depends on | None |

---

## Suggested sequencing (draft) — **SUPERSEDED**

The linear list below is retained for history only. **Use 2A → 2B → 2C → 2D** from [./phase-2-feedback.md](./phase-2-feedback.md).

```text
1. RBAC model ADR          → unlocks finance/ops UI safely
2. Dedicated /events/new   → low-risk UX polish (optional early)
3. Finance tables          → before ERP settlement claims
4. Pickup/ops module       → after roles
5. Excel imports           → parallelizable with ops
6. Notifications           → after core state machines stable
7. ERP sync                → last; needs stable contracts + staging ERP
```

---

## Explicit non-goals until approved

- No Phase 2 schema migrations or application code
- No piglet-specific hardcoding in schema
- No coupling Hot Sales Phase 2 to `/playground`, declaration domain, or layout/repo-migration WIP
- No treating fixed job titles (Sales Manager, GM, …) as hardcoded app role enums

---

## Next step

1. Follow [../ops/gate-register.md](../ops/gate-register.md) — **Gate 4B** sales allowlist is active  
2. Keep 2B–2D blocked until separate ADR/slice approval
