# FFT-MOD-007 API and Adapters

| Field | Value |
|-------|-------|
| ID | FFT-MOD-007 |
| Category | Module |
| Version | 1.0.0 |
| Status | Living |
| Owner | Feed Farm Trade |
| Updated | 2026-07-13 |
| Spine | MOD-007 API and Adapters |

## Server Actions map

| Entry | Role |
|-------|------|
| `app/actions/fft.ts` | Primary mutation surface for trade UI |

Validate with module Zod schemas → call `modules/fft/domain/*`. Prefer lifting reads to Server Components over client self-fetch of `/api/*` ([ARCH-013](../../architecture/frontend/ARCH-013-bff-and-data-flow.md)).

## Route Handlers

Use `app/api/**` only for webhooks, health, auth proxy, autosave XHR, or external REST consumers. Cross-cutting contract: [API-001](../../api/API-001-api-boundaries.md) · [API-002](../../api/API-002-error-contract.md) · [REST-001](../../api/REST-001-rest-resources.md).

## Result / error types

Trade actions use module result helpers (`TradeActionResult` / trade action error contract under `modules/fft/domain/`). Unit coverage: `modules/fft/domain/trade-action-result`, `trade-action-error-contract`. Do not invent a parallel error envelope that fights API-002.

## Ports / adapters

| Port | Location | Notes |
|------|----------|-------|
| ERP vendor adapter | `modules/fft/domain/erp/` | Module-local — not a product-wide Afenda ERP client |
| ERP sync store | `modules/fft/domain/erp-sync-store.ts` | Async push when flag on |
| Generic / HTTP packs | `modules/fft/domain/erp/` | Documented here — no separate `integrations/` doc tree |

## What stays in `docs/api`

Adapter vocabulary, `{ data }` envelope, OpenAPI — platform-wide. Module docs link; they do not fork a second contract.
