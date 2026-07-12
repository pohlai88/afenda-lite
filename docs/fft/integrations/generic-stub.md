# Feed Farm Trade ERP integration — generic stub

| Field | Value |
|-------|-------|
| **Status** | Stub — replace per customer deployment |
| **ADR** | [../adr/004-erp-sync.md](../adr/004-erp-sync.md) |
| **Adapter** | `modules/fft/domain/erp/generic-noop.ts` (default) |

## Purpose

Phase 2D ships the **sync framework** first. This document is the contract placeholder until a customer ERP endpoint is provisioned.

## Outbound entities (push)

| Feed Farm Trade entity | Sync job type | Idempotency |
|------------------|---------------|-------------|
| Order | `order` | `sync:order:{orderId}:v1` |
| Deposit summary | `deposit_summary` | `sync:deposit_summary:{orderId}:v1` |
| Fulfillment summary | `fulfillment_summary` | `sync:fulfillment_summary:{orderId}:v1` |

## Customer pack checklist

Before enabling `FFT_ERP_SYNC_ENABLED` in production:

1. Document ERP base URL, auth scheme, and rate limits **for that tenant / deployment**
2. Implement `ErpAdapter` under `modules/fft/domain/erp/<vendor>/` (reference: `http-rest/`) — FFT module only, not platform-wide
3. Set `FFT_ERP_VENDOR=http-rest` (or customer id) and `FFT_ERP_BASE_URL` on that deployment (Vercel env or local `env.config`); wire in `erp/registry.ts`
4. Verify duplicate push returns success (mapped external_id)
5. Run `processPendingSyncJobs` via ops cron or `scripts/process-erp-sync-jobs.mjs`

Until then, leave `FFT_ERP_VENDOR` / `FFT_ERP_BASE_URL` **unset**. They are `syncOptional` in the env manifest — do not add fake placeholders for `validate:env-sync`.

## Rollback

Set `FFT_ERP_SYNC_ENABLED=false`. Jobs remain in DB; local Feed Farm Trade ops unaffected.
