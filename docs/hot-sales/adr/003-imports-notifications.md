| **Doc type** | `ADR` — Phase 2C Imports + Notifications (**Accepted**) |
| **Agent entry** | [../RUNTIME.md](../RUNTIME.md) |

# ADR-003: Hot Sales Phase 2C — Excel imports + notification provider

| Field | Value |
|-------|-------|
| **Status** | **Accepted** |
| **Accepted** | 2026-07-10 |
| **Date** | 2026-07-10 |
| **Owners** | Hot Sales / Trade |
| **Scope** | Structured Excel import pipeline + Hot Sales transactional email |
| **Out of scope** | Declaration-portal mail, Neon Auth mail, Zalo/WhatsApp/SMS/Teams (defer) |

**Related:** [../spec/phase-2a-prd.md](../spec/phase-2a-prd.md) §6 · [001-rbac.md](./001-rbac.md) · [002-finance-deposit-pickup-ops.md](./002-finance-deposit-pickup-ops.md) · [./phase-2bcd-slices.md](../spec/phase-2bcd-slices.md)

**Gate:** No implementation until 2C slices approved. **Depends on 2B** for deposit/pickup import types.

---

## Context

Phase 1 supports priority CSV upload. Operators need Excel templates, dry-run validation, and row-level error reports before commit.

Separately, Hot Sales needs event/order notifications (allocation, transfer, deposit, pickup) without coupling to:

- Neon Auth shared mail (`auth@mail.myneon.app`) — portal identity/onboarding only per AGENTS.md
- Declaration-portal client invite flows

---

## Decision

### 3.1 Excel import pipeline

**Flow (mandatory):**

```text
upload → parse → dry-run validate → error report → admin confirm → write → audit batch
```

**Tables:**

```text
hot_sales_import_batch   — type, filename, status, actor, counts, committed_at
hot_sales_import_row     — row_number, payload_json, validation_errors, write_status
```

**Import types (priority order):**

| Type | Phase | Permission |
|------|-------|------------|
| Customer priority | 2C-1 | `priority.manage` |
| Product/supply | 2C-1 | `supply.manage` |
| Bulk orders | 2C-2 | `order.create` + scope |
| Deposit records | 2C-2 | `deposit.manage` (requires 2B) |
| Pickup confirmation | 2C-2 | `pickup.manage` (requires 2B) |
| Custom field values | Later | `custom_field.manage` |

**Controls:**

- Downloadable `.xlsx` template per import type
- Max row limit (configurable per type)
- Required column validation; unknown customer → warning or block (per type policy)
- Duplicate detection in dry-run
- Failed rows never silently dropped — remain in `import_row` with errors
- `export.orders` / domain permissions gate commit

**Tech:** Server-side parse (e.g. `xlsx` / `exceljs`); no client-only trust of parsed data.

### 3.2 Notification provider — bounded context

**Decision:** Hot Sales notifications use a **dedicated transactional email lane**, isolated from portal mail.

| Concern | Choice |
|---------|--------|
| Provider | App-owned API key via env (`HOT_SALES_EMAIL_*` or shared `RESEND_API_KEY` with distinct from-address) |
| From address | Product-controlled (e.g. `hot-sales@<APP_DOMAIN>` or verified sender) — **not** `auth@mail.myneon.app` |
| Neon Auth | **Do not use** for Hot Sales business events |
| Declaration invites | Unchanged — Neon org invitations only |

**Tables:**

```text
hot_sales_notification_template  — event_key, locale, subject, body_markdown
hot_sales_notification_event     — enable flag per event_key + channel
hot_sales_notification_delivery  — idempotency_key, status, provider_id, error, sent_at
```

**Triggers (email first):**

```text
event.opened | event.closing_soon | event.closed
order.submitted | allocation.completed | allocation.partial | order.rejected
transfer.requested | transfer.approved | transfer.rejected
deposit.pending | deposit.confirmed
pickup.scheduled | pickup.completed
```

**Rules:**

1. **Idempotency key** per (event_key, entity_id, recipient, version) — no silent duplicate sends.
2. Failed delivery **must not roll back** order/allocation/deposit transactions (async side effect).
3. Enable/disable per `notification_event` without deploy.
4. vi/en templates required for user-facing mail.
5. Env flag `HOT_SALES_NOTIFICATIONS_ENABLED` (default false until 2C slice acceptance).

### 3.3 Channel deferrals

Zalo, WhatsApp, Teams, Telegram, SMS — **explicitly out of scope** for first 2C ship. Table design may include `channel` column for future use.

---

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Reuse Neon Auth mail for Hot Sales | Violates portal auth boundary; wrong sender trust model |
| Reuse client invite email stack | Couples trade to declaration domain |
| Direct import without dry-run | Data corruption risk; no audit trail |
| In-app notifications only | Operators expect email for allocation/deposit events |

---

## Consequences

### Positive

- Clear separation from Backlog-01 / Neon Auth mail
- Import safety via dry-run + batch audit
- Notification failures isolated from core trade transactions

### Negative / costs

- Additional env keys + sender domain verification
- Template maintenance (vi/en)
- Import UI complexity (error report, confirm step)

---

## Acceptance criteria (ADR)

```text
- [x] Accepted 2026-07-10
- [ ] 2C slices Approved before code
- [ ] No Neon Auth provider for Hot Sales notifications
- [ ] Import dry-run mandatory; commit requires explicit admin confirm
- [ ] delivery_log + idempotency; failed send does not fail trade txn
- [ ] HOT_SALES_NOTIFICATIONS_ENABLED gates outbound mail
```

---

## Rollback

Disable `HOT_SALES_NOTIFICATIONS_ENABLED`; imports can remain read-only/dry-run off. Retain tables; stop scheduler/worker if added later.
