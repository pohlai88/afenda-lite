# FFT-MOD-007 API and Adapters

| Field             | Value                |
| ----------------- | -------------------- |
| **ID**            | FFT-MOD-007          |
| **Category**      | Module               |
| **Version**       | 1.3.0 |
| **Status**        | Living               |
| **Control State** | Closed             |
| **Owner**         | Feed Farm Trade      |
| **Updated**       | 2026-07-14           |
| **Spine**         | MOD-007 API and Adapters |


---

# 1. Purpose

Define Feed Farm Trade adapter surfaces: Server Actions, Route Handlers, result types, and module-local ERP ports.

**Audience:** backend / BFF engineers wiring FFT mutations or integrations.
**Action enabled:** choose Action vs RH correctly and keep contracts aligned with platform API docs.

---

# 2. Scope

## 2.1 In Scope

- Server Actions entry for trade UI
- When Route Handlers are allowed
- Trade result / error helpers vs API-002
- ERP ports under `modules/fft/domain/erp/`

## 2.2 Out of Scope

- Platform-wide envelope / OpenAPI → [API-001](../../api/API-001-api-boundaries.md) · [ARCH-029](../../architecture/ARCH-029-interface-api-architecture.md)
- Human REST path catalogue detail → [REST-001](../../api/REST-001-rest-resources.md) · Draft [FFT-REST-001](FFT-REST-001-feed-farm-trade-resource-index.md)
- Promoting FFT HTTP for web UI lists (rejected — RSC → domain)

---

# 3. API and Adapters

## 3.1 Server Actions map

| Entry | Role |
|-------|------|
| `app/actions/fft.ts` | Primary mutation surface for trade UI |

Validate with module Zod schemas → call `modules/fft/domain/*`. Prefer lifting reads to Server Components over client self-fetch of `/api/*` ([ARCH-013](../../architecture/ARCH-013-bff-and-data-flow.md)).

## 3.2 Route Handlers

Use `app/api/**` only for webhooks, health, auth proxy, autosave XHR, or external REST consumers. Cross-cutting contract: [API-001](../../api/API-001-api-boundaries.md) · [API-002](../../api/API-002-error-contract.md) · [REST-001](../../api/REST-001-rest-resources.md).

FFT HTTP paths are locale-free (`/api/fft/...`). Contract-only until a real consumer needs them — see Draft [FFT-REST-001](FFT-REST-001-feed-farm-trade-resource-index.md).

## 3.3 Result / error types

Trade actions use module result helpers (`TradeActionResult` / trade action error contract under `modules/fft/domain/`). Unit coverage: `modules/fft/domain/trade-action-result`, `trade-action-error-contract`. Do not invent a parallel error envelope that fights API-002.

## 3.4 Ports / adapters

| Port | Location | Notes |
|------|----------|-------|
| ERP vendor adapter | `modules/fft/domain/erp/` | Module-local — not a product-wide Afenda ERP client |
| ERP sync store | `modules/fft/domain/erp-sync-store.ts` | Async push when flag on |
| Generic / HTTP packs | `modules/fft/domain/erp/` | Documented here — no separate `integrations/` doc tree |

## 3.5 What stays in `docs/api`

Adapter vocabulary, `{ data }` envelope, OpenAPI — platform-wide. Module docs link; they do not fork a second contract.

## 3.6 Enterprise requirements

Single-owner ACs for this role. Evidence: [FFT-MOD-009](FFT-MOD-009-verification.md). Standard: [MOD-002](../MOD-002-modules-index.md).

| AC-ID | Profile | Quality Dimension | Applicability | Criterion |
| --- | --- | --- | --- | --- |
| FFT-AC-007-01 | Enterprise Core | CORE-INTEGRATION | Core | Action/error contract conformance: trade UI mutations enter `app/actions/fft.ts`; results/errors align with API-001/002; no same-origin dashboard list GET under `/api` as substitute. |
| FFT-AC-007-02 | Enterprise Core | CORE-INTEGRATION | Core | Idempotency and safe adapters: duplicate submits / retries do not double-apply material trade writes; ERP/adapters remain under `modules/fft/domain/erp/`. |
| FFT-AC-007-03 | Enterprise Core | CORE-INTEGRATION | Conditional | When HTTP/ERP outbound is Enabled, timeout/retry contracts are explicit; when Disabled/Uncontracted, fail-closed behavior is evidenced on FFT-MOD-009. |
| FFT-AC-007-04 | ERP | ERP-CLEAN-CORE-INTEGRATION | Core | ERP extensions use stable owned interfaces, classify customization, isolate vendor adapters, reconcile exchanges, and preserve upgradeability without modifying platform core. |

---

# 4. References

| ID | Title | Relationship |
| -- | ----- | ------------ |
| DOC-001 | Documentation Control Standard | Governance |
| MOD-002 | Modules Index | Module Enterprise Readiness standard |
| ARCH-013 | BFF and Data Flow | Adapter choice |
| ARCH-029 | Interface and API Architecture | Parent architecture |
| API-001 | API Boundaries | Pipeline / envelope |
| API-002 | Error Contract | Wire errors |
| REST-001 | REST Standards and Resource Index | Path standards |
| FFT-REST-001 | Feed Farm Trade Resource Index | Module REST (Draft) |
| FFT-MOD-008 | Ops Runtime | ERP flag gates |
| FFT-MOD-009 | Verification | Evidence ledger |

---

# 5. Change Log

| Version | Date       | Summary |
| ------- | ---------- | ------- |
| 1.3.0 | 2026-07-14 | Executable quality contract: profile/dimension mapping and owned ERP benchmark criteria. |
| 1.2.0   | 2026-07-14 | Wave C: enterprise requirements FFT-AC-007-01…03 (contracts/idempotency/conditional retry). |
| 1.1.0   | 2026-07-14 | DOC-003 six-section retrofit; compact adapter map; cite ARCH-029 / API-001. |
| 1.0.1   | 2026-07-14 | Added mandatory Control State header field (Closed). |
| 1.0.0   | 2026-07-13 | Initial spine |

---

# 6. Notes

**Spine role:** MOD-007 API and Adapters — Actions/RH/ports only. Do not treat Draft FFT-REST-001 as Living SSOT.
