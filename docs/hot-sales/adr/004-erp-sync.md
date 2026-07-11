| **Doc type** | `ADR` — Phase 2D ERP sync (**Accepted**) |
| **Agent entry** | [../RUNTIME.md](../RUNTIME.md) |

# ADR-004: Hot Sales Phase 2D — ERP / external finance sync

| Field | Value |
|-------|-------|
| **Status** | **Accepted** |
| **Accepted** | 2026-07-10 |
| **Date** | 2026-07-10 |
| **Owners** | Hot Sales / Trade · Integrations |
| **Scope** | Idempotent sync between Hot Sales domain and external ERP/finance system |
| **Out of scope** | Choosing a specific ERP vendor in code without integration spec; replacing 2B operational deposits |

**Related:** [002-finance-deposit-pickup-ops.md](./002-finance-deposit-pickup-ops.md) · [../spec/phase-2a-prd.md](../spec/phase-2a-prd.md) §7 · [./phase-2bcd-slices.md](../spec/phase-2bcd-slices.md)

**Gate:** **Last** in 2B→2C→2D sequence. Requires stable IDs/state machines from 2A–2C. No sync code until 2D slices Approved **and** integration endpoint contract documented per customer ERP.

---

## Context

Hot Sales will accumulate authoritative **operational** records (orders, allocation, deposits, pickup) while **official settlement** remains in ERP/Finance (ADR-002). Phase 2D bridges the gap without making Hot Sales the ledger.

Prerequisites:

- Stable `hot_sales_order.id`, event IDs, customer keys
- Deposit and fulfillment state machines from 2B
- Permission and audit patterns from 2A

---

## Decision

### 4.1 Sync philosophy

| Principle | Rule |
|-----------|------|
| **Hot Sales availability** | Sync failure must **not** block local order/allocation/pickup ops unless explicitly configured per entity type |
| **Idempotency** | Every outbound message has `idempotency_key`; ERP adapter dedupes |
| **Direction (default)** | **Push** Hot Sales → ERP for orders/fulfillment/deposit summaries; **pull** optional for customer/product masters (per integration pack) |
| **Finance SoT** | ERP remains settlement SoT; Hot Sales may receive **status callbacks** (e.g. deposit_settled) as read-only updates |
| **Staging** | No direct ERP write from HTTP request — async job queue |

### 4.2 Entity mapping

```text
hot_sales_external_mapping  — entity_type, local_id, external_system, external_id, last_synced_at
hot_sales_sync_job          — job_type, payload_ref, status, scheduled_at
hot_sales_sync_attempt      — job_id, attempt_no, started_at, finished_at, status
hot_sales_sync_error        — attempt_id, code, message, retryable, raw_payload_ref
```

**Mapped entity types (minimum):**

```text
customer | product | supply_line | order | order_line | deposit_summary | fulfillment_summary
```

External system identifier: `erp_system` enum (e.g. `generic`, `customer_acme_erp`) — **no hardcoded vendor SDK** in core domain; adapter interface in `lib/domain/trade/erp/`.

### 4.3 Job controls

1. Retry with exponential backoff; max attempts configurable
2. DLQ / dead state after max retries — visible in admin UI
3. Manual retry requires `export.finance` or dedicated `sync.retry` permission (add to catalog in 2D slice)
4. Full audit trail on mapping create/update and manual retry
5. Env flag `HOT_SALES_ERP_SYNC_ENABLED` (default false)

### 4.4 Conflict policy

| Scenario | Policy |
|----------|--------|
| Local order updated after successful ERP push | New sync job with version bump; idempotency key includes version |
| ERP rejects duplicate | Treat as success if external_id already mapped |
| ERP deposit status disagrees with Hot Sales ops deposit | **ERP callback wins** for settlement flag only; ops deposit record retained with `erp_status` field |
| Master data (customer) missing in ERP | Block order push; surface in sync_error |

### 4.5 Integration packaging

Per-deployment ERP adapter lives behind interface:

```text
lib/domain/trade/erp/types.ts      — ErpAdapter, PushResult, PullResult
lib/domain/trade/erp/generic-noop.ts — default no-op when sync disabled
lib/domain/trade/erp/<vendor>/     — optional vendor pack (not in initial 2D-1 slice)
```

**2D-1** ships framework + noop + manual mapping UI + job runner. **2D-2+** adds customer-specific ERP connector when contract exists.

---

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| ERP sync in 2B | Unstable domain; blocks finance tables on vendor |
| Bi-directional real-time without queue | Retry/audit complexity; brittle under ERP downtime |
| Hot Sales pulls settlement authority from ERP into order row only | Loses audit; ADR-002 projection model cleaner |
| Embedded ERP SDK in store.ts | Violates adapter boundary; untestable |

---

## Consequences

### Positive

- Operational continuity when ERP is down
- Clear extension point for customer ERP projects
- Aligns with ADR-002 operational vs settlement split

### Negative / costs

- Job infrastructure (cron/worker or Vercel cron + durable idempotency)
- Operational overhead (DLQ monitoring, manual retry UI)
- Per-customer adapter work outside core product slices

---

## Acceptance criteria (ADR)

```text
- [x] Accepted 2026-07-10
- [ ] 2D slices Approved; 2B+2C domain stable
- [ ] No synchronous ERP call in order/allocation request path
- [ ] idempotency_key on all outbound pushes
- [ ] sync errors visible + manually retryable
- [ ] HOT_SALES_ERP_SYNC_ENABLED default false
- [ ] Phase 1 rollback path unchanged (disable sync; core trade works)
```

---

## Rollback

Set `HOT_SALES_ERP_SYNC_ENABLED=false`; stop job runner. Mappings retained. Hot Sales continues as operational SoT per ADR-002.
