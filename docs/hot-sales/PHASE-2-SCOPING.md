# Hot Sales — Phase 2 scoping note

**Status:** Scoping only — not approved for implementation  
**Phase 1 contract (closed):** [PRD-V2.md](./PRD-V2.md)  
**Vision archive:** [PRD.md](./PRD.md)

Do **not** start Phase 2 coding until this note is reviewed and a Phase 2 build contract is approved.

---

## Intent

Phase 1 shipped a reusable Hot Sales event engine under `/trade` (admin + sales allowlist, allocation, deposit/transfer **lite**, CSV export, vi/en). Phase 2 expands toward the full PRD vision without breaking the Phase 1 engine contract (generic events, piglet = template data only).

---

## Candidate workstreams

### 1. 7-role RBAC

| Topic | Notes |
|-------|-------|
| Problem | Phase 1 is Admin (`isAdminSession`) + Sales allowlist only |
| Scope sketch | Map PRD roles (e.g. Client Admin, Sales, Finance, Ops/Pickup, Viewer, …) onto Neon Auth org roles or a `hot_sales_role` assignment table |
| Open questions | Which roles are org-wide vs event-scoped? How do they interact with portal operator admin? |
| Depends on | Auth model decision before schema |

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

## Suggested sequencing (draft)

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

- No Phase 2 schema migrations in the Phase 1 closure commit
- No piglet-specific hardcoding in schema
- No coupling Hot Sales Phase 2 to `/playground` or declaration domain refactors

---

## Next step

Review this note → pick workstream order → write `PRD-V2-Phase2.md` (or extend PRD-V2) as the build contract → then implement.
