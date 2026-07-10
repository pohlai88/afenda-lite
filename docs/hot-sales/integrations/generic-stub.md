# Hot Sales ERP integration — generic stub

| Field | Value |
|-------|-------|
| **Status** | Stub — replace per customer deployment |
| **ADR** | [../adr/004-erp-sync.md](../adr/004-erp-sync.md) |
| **Adapter** | `lib/domain/trade/erp/generic-noop.ts` (default) |

## Purpose

Phase 2D ships the **sync framework** first. This document is the contract placeholder until a customer ERP endpoint is provisioned.

## Outbound entities (push)

| Hot Sales entity | Sync job type | Idempotency |
|------------------|---------------|-------------|
| Order | `order` | `sync:order:{orderId}:v1` |
| Deposit summary | `deposit_summary` | `sync:deposit_summary:{orderId}:v1` |
| Fulfillment summary | `fulfillment_summary` | `sync:fulfillment_summary:{orderId}:v1` |

## Customer pack checklist

Before enabling `HOT_SALES_ERP_SYNC_ENABLED` in production:

1. Document ERP base URL, auth scheme, and rate limits
2. Implement `ErpAdapter` under `lib/domain/trade/erp/<vendor>/` (reference: `http-rest/`)
3. Set `HOT_SALES_ERP_VENDOR=http-rest` (or customer id) and wire in `erp/registry.ts`
4. Verify duplicate push returns success (mapped external_id)
5. Run `processPendingSyncJobs` via ops cron or `scripts/process-erp-sync-jobs.mjs`

## Rollback

Set `HOT_SALES_ERP_SYNC_ENABLED=false`. Jobs remain in DB; local Hot Sales ops unaffected.
