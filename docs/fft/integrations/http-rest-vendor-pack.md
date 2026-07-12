# HTTP REST ERP vendor pack (reference)

| Field | Value |
|-------|-------|
| **Vendor id** | `http-rest` |
| **Adapter** | `modules/fft/domain/erp/http-rest/adapter.ts` |
| **Status** | Reference implementation — replace paths/auth per customer contract |

## Env

| Variable | Purpose |
|----------|---------|
| `FFT_ERP_SYNC_ENABLED` | `true` to enqueue/process jobs |
| `FFT_ERP_VENDOR` | Set to `http-rest` **by the tenant/ops** for this deployment |
| `FFT_ERP_BASE_URL` | ERP API base (no trailing slash) — tenant-owned |
| `FFT_ERP_API_KEY` | Optional bearer token (local secret / Vercel secret; not in canonical sync list) |

These vendor keys are `syncOptional`: unset is correct until this pack is enabled. `npm run sync:vercel` pushes them only when set locally; `validate:env-sync` requires them only when `FFT_ERP_SYNC_ENABLED=true`.

## Outbound contract

```http
POST {BASE_URL}/fft/sync/{jobType}
Idempotency-Key: sync:order:{orderId}:v1
Authorization: Bearer {API_KEY}

{ "entityId": "...", "jobType": "order", "idempotencyKey": "..." }
```

- HTTP **409** → treated as duplicate success
- Response JSON may include `externalId` or `id`

## Customer fork

Copy `http-rest/` to `modules/fft/domain/erp/<customer>/`, implement `ErpAdapter`, register in `erp/registry.ts`.
