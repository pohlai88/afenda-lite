# HTTP REST ERP vendor pack (reference)

| Field | Value |
|-------|-------|
| **Vendor id** | `http-rest` |
| **Adapter** | `lib/domain/trade/erp/http-rest/adapter.ts` |
| **Status** | Reference implementation — replace paths/auth per customer contract |

## Env

| Variable | Purpose |
|----------|---------|
| `HOT_SALES_ERP_SYNC_ENABLED` | `true` to enqueue/process jobs |
| `HOT_SALES_ERP_VENDOR` | Set to `http-rest` |
| `HOT_SALES_ERP_BASE_URL` | ERP API base (no trailing slash) |
| `HOT_SALES_ERP_API_KEY` | Optional bearer token |

## Outbound contract

```http
POST {BASE_URL}/hot-sales/sync/{jobType}
Idempotency-Key: sync:order:{orderId}:v1
Authorization: Bearer {API_KEY}

{ "entityId": "...", "jobType": "order", "idempotencyKey": "..." }
```

- HTTP **409** → treated as duplicate success
- Response JSON may include `externalId` or `id`

## Customer fork

Copy `http-rest/` to `lib/domain/trade/erp/<customer>/`, implement `ErpAdapter`, register in `erp/registry.ts`.
