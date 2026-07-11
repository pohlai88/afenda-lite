| **Doc type** | `SPEC` — Phase 2A build contract (**closed**) |
| **Agent entry** | [../RUNTIME.md](../RUNTIME.md) |

# PRD-V2 Phase 2 — Hot Sales Event Engine (build contract)

| Field | Value |
|-------|-------|
| **Status** | **Accepted** |
| **Accepted** | 2026-07-09 |
| **Date** | 2026-07-09 |
| **Phase 1 baseline** | commit `1bc1294` · tag `hot-sales-phase-1` · [./phase-1-prd.md](./phase-1-prd.md) |
| **Authoritative planning input** | [../archive/phase-2-feedback.md](../archive/phase-2-feedback.md) |
| **Candidate-list note** | [../archive/phase-2-scoping.md](../archive/phase-2-scoping.md) — sequencing / 7-role framing **superseded** |
| **Normative RBAC ADR** | [../adr/001-rbac.md](../adr/001-rbac.md) (**Accepted**) |
| **Phase 2A slice plan** | [./phase-2a-slices.md](./phase-2a-slices.md) (**closed**) |
| **Ops gate SSOT** | [../ops/gate-register.md](../ops/gate-register.md) (**closed**) |

**Vision archive:** [../archive/vision.md](../archive/vision.md)

### Implementation gate

ADR-001, this PRD, and [./phase-2a-slices.md](./phase-2a-slices.md) are **Accepted / Approved**. **Implementation is closed** (tag `hot-sales-phase-2a` → `8e650ff`).

**Ops rollout:** **closed** 2026-07-10 — [../ops/gate-register.md](../ops/gate-register.md). Do not start 2B–2D or reopen 2A product scope.

---

## 1. Phase 1 baseline

Phase 1 delivered a reusable Hot Sales engine under `/trade`:

- Generic events, products, custom columns, priority CSV, sales allowlist
- Sales order registration with server timestamp and deadline gate
- Priority → FCFS → `order_id` allocation with `hot_sales_allocation_run`
- Deposit/transfer **lite** (status only), audit, CSV export, vi/en
- GP2 piglet as **cloneable template data only**
- Open-event field locks; smoke e2e as Phase 1 gate

Rollback / bisect reference: tag `hot-sales-phase-1`.

---

## 2. Phase 2 objective

Expand Hot Sales toward multi-role operations, finance/ops workflows, productivity imports, notifications, and eventually ERP sync — **without** breaking Phase 1 compatibility or hardcoding piglet/org-chart specifics into schema or authorization code.

---

## 3. Release packaging (normative)

Do **not** ship Phase 2 as one release.

| Release | Scope | Purpose |
|---------|--------|---------|
| **Phase 2A** | SaaS-style configurable RBAC + dedicated `/admin/events/new` | Sustainable access + admin create UX |
| **Phase 2B** | Finance/deposit tables + Pickup/Ops module | Operational control |
| **Phase 2C** | Excel imports + notifications | Productivity + communication |
| **Phase 2D** | ERP sync | External integration after internal models stabilize |

---

## 4. Phase 2A — RBAC + admin create route

### 4.1 RBAC (normative: ADR-001)

```text
Fixed permission catalog
+ Client-customisable roles
+ Seeded role templates
+ Scoped assignments (own / team / event / BU / company / platform)
+ Audit
```

**Do not** hardcode job titles as fixed app role enums. Seed as **templates only**:

- Super Admin  
- Client Admin  
- Business Unit Manager  
- Sales Executive  
- Sales Supervisor  
- Sales Manager  
- Sales Operations  
- Account/Finance  
- Viewer  
- Commercial Operation & Governance  
- General Manager  

Authorization checks **permission codes**, never role display names. See ADR-001 for catalog examples and acceptance criteria.

### 4.2 Dedicated create route

```text
/trade/[locale]/admin/events/new
```

Flow: blank or clone template → name → open/close window → timezone → create **draft** → redirect to setup. Existing create-on-list may remain or redirect here.

### 4.3 In / out of 2A

| Include | Exclude |
|---------|---------|
| RBAC ADR + catalog + roles + templates + assignments + scopes + guards + role UI + audit | Finance tables |
| `/admin/events/new` | Pickup module |
| Phase 1 Admin/Sales compatibility path | ERP sync, notifications, Excel |

### 4.4 2A acceptance (draft)

```text
- Phase 1 Admin and Sales allowlist behavior still works through cutover
- Client Admin can create, rename, duplicate, disable roles
- Client Admin can assign users to roles with scope
- Sales Executive template sees own orders only (via permissions + scope)
- Viewer cannot mutate
- Sensitive permissions protected; role changes audited
- No code depends on role display names
- Admin can create blank or clone template via /admin/events/new → setup
```

---

## 5. Phase 2B — Finance / deposit + Pickup / Ops

### 5.1 Finance / deposit

**Decision (ADR-002 Accepted 2026-07-10):** Hot Sales deposit records are **operational only**; ERP/Finance remains official settlement SoT until ADR-004. No payment settlement engine inside Hot Sales in 2B.

Keep `hot_sales_order.deposit_status` as a **projection** from deposit records.

Suggested tables (planning):

```text
hot_sales_deposit
hot_sales_deposit_receipt
hot_sales_deposit_adjustment
hot_sales_finance_audit
```

Statuses (planning): `not_required | pending | paid | partially_paid | waived | forfeited | refunded | cancelled`

AC (draft): amounts/receipts/dates/actors recorded; non-refundable supported; waive/refund/forfeit require reason + audit; order projection updates; Phase 1 orders compatible.

### 5.2 Pickup / Ops

Move beyond bare `fulfilled_quantity` to ops workflow.

Suggested modules/tables (planning): pickup windows, assignments, fulfillment records, exceptions.

States (planning): `pending_schedule | scheduled | ready_for_pickup | partially_picked_up | picked_up | no_show | cancelled | exception`

Rules: final support from fulfilled qty; partial pickup + no-show; ops confirm with user + timestamp; post-complete changes need reason + audit.

Depends on 2A permissions (`pickup.view` / `pickup.manage`).

---

## 6. Phase 2C — Excel imports + notifications

### 6.1 Excel imports

Upgrade Phase 1 priority CSV to structured Excel with:

```text
upload → dry-run validation → error report → admin confirm → write → audit batch
```

Import priorities: customer priority & product/supply (high); bulk orders, deposits, pickup confirm (medium); custom field values (later).

Suggested: `hot_sales_import_batch`, `hot_sales_import_row`. Controls: templates, max rows, required columns, unknown customer warnings, duplicates, dry-run, error export, audit.

### 6.2 Notifications

Email only first. **ADR-003 Accepted** — dedicated Hot Sales mail lane; not declaration-portal or Neon Auth mail.

Triggers (planning): event open/closing/closed; order submitted; allocation results; transfer request/decision; deposit pending/confirmed; pickup scheduled/completed.

Design: templates + events + delivery log; enable/disable per event; vi/en; failed delivery must not break order/allocation transactions; no silent duplicate sends.

---

## 7. Phase 2D — ERP sync

**Last.** Requires stable event/order/allocation/deposit/pickup IDs and state machines.

**ADR-004 Accepted 2026-07-10.** Push-first async sync; ERP remains settlement SoT; adapter interface + noop default. See [../adr/004-erp-sync.md](../adr/004-erp-sync.md).

Controls: idempotency key, retry, DLQ, manual retry, external mapping, sync status, audit, staging ERP.

Suggested tables: `hot_sales_external_mapping`, `hot_sales_sync_job`, `hot_sales_sync_attempt`, `hot_sales_sync_error`.

AC (draft): idempotent outbound; no duplicate ERP orders; failures visible + manually retryable; local Hot Sales ops not blocked unless configured.

---

## 8. Data model changes (summary)

| Phase | Additive direction |
|-------|--------------------|
| 2A | Permission, role, role_permission, role_assignment, rbac_audit; migrate from sales allowlist |
| 2B | Deposit + finance audit; pickup window/assignment/fulfillment/exception; project `deposit_status` |
| 2C | Import batch/row; notification template/event/delivery_log |
| 2D | External mapping + sync job/attempt/error |

Prefer **additive** migrations: add → backfill → switch reads → switch writes → deprecate later. Avoid drop/rename of Phase 1 core fields in the first cut.

---

## 9. Permission model

Normative detail: [../adr/001-rbac.md](../adr/001-rbac.md).

Server-side checks required for: event create/edit/open-close; order create/view; allocation run/override; transfer approve; deposit update; pickup confirm; exports; role.manage.

---

## 10. Migration strategy

1. Preserve Phase 1 behavior under dual-read where needed  
2. Additive schema only in first pass  
3. Seed permission catalog + default role templates  
4. Map existing admins + allowlisted sales into assignments  
5. Cut over guards action-by-action  
6. Deprecate allowlist-only path only after acceptance  

---

## 11. Backward compatibility

```text
Phase 2 must not break existing Phase 1 events, orders, allocation, exports,
or the hot-sales-phase-1 rollback reference.
```

Piglet / GP2 / weight / month labels remain **template data only** — never schema or role logic.

---

## 12. Acceptance criteria (cross-phase)

Per-release AC in sections 4–7. Cross-cutting:

- [ ] Phase 1 baseline preserved  
- [ ] Additive migrations preferred  
- [ ] Piglet = template data only  
- [ ] Server-side permission checks  
- [ ] Sensitive changes audited (roles, rules, deadlines, qty, allocation override, deposit, pickup exception, ERP retry, notification resend)  
- [ ] Hot Sales Phase 2 commits stay separate from layout / declaration / playground WIP  

---

## 13. Explicit non-goals (until later approval)

- Phase 2 implementation before ADR-001 + this PRD + 2A slices are Accepted  
- Hardcoded job-title role enums  
- Live ERP sync before 2A–2C internal models are stable  
- In-app payment settlement as finance SoT (default planning stance)  
- Zalo / WhatsApp / Teams / SMS notifications in first notification slice  
- Coupling to `/playground` or declaration-domain refactors  

---

## 14. Rollback plan

| Layer | Action |
|-------|--------|
| Pre-code | Reject Proposed docs; no schema shipped |
| After 2A partial | Leave new RBAC tables unused; keep Phase 1 Admin + allowlist; tag `hot-sales-phase-1` |
| After later phases | Feature-flag modules; stop sync jobs; retain additive tables |

---

## Documents still required before coding

| Doc | Status |
|-----|--------|
| [../adr/001-rbac.md](../adr/001-rbac.md) | **Accepted** (2026-07-09) |
| This PRD | **Accepted** (2026-07-09) |
| [./phase-2a-slices.md](./phase-2a-slices.md) | **Approved** (2026-07-09) |
| [../adr/002-finance-deposit-pickup-ops.md](../adr/002-finance-deposit-pickup-ops.md) | **Accepted** (2026-07-10) |
| [../adr/003-imports-notifications.md](../adr/003-imports-notifications.md) | **Accepted** (2026-07-10) |
| [../adr/004-erp-sync.md](../adr/004-erp-sync.md) | **Accepted** (2026-07-10) |
| [./phase-2bcd-slices.md](./phase-2bcd-slices.md) | **Proposed** — approve per phase before code |

---

## Next step

**Implementation (2A-1 → 2A-9) is closed.** Active work is **operational rollout closed**.

1. **2A + ops closed** — [../ops/gate-register.md](../ops/gate-register.md)  
2. **2B–2D ADRs Accepted** — [../adr/002-finance-deposit-pickup-ops.md](../adr/002-finance-deposit-pickup-ops.md) · [003](../adr/003-imports-notifications.md) · [004](../adr/004-erp-sync.md)  
3. **Next for implementation:** approve [./phase-2bcd-slices.md](./phase-2bcd-slices.md) per phase (2B → 2C → 2D); explicit program reopen  
4. Do **not** reopen 2A product scope (permissions, UI, schema) without a new ADR
