# API-007 API Observability and Correlation Contract

| Field        | Value      |
| ------------ | ---------- |
| **ID**       | API-007    |
| **Category** | API        |
| **Version**  | 1.0.0      |
| **Status**   | Living     |
| **Control State** | Closed     |
| **Owner**    | Backend    |
| **Updated**  | 2026-07-17 |

---

# 1. Purpose

Define how Server Actions, the edge session gate, and privileged audit writes share a **correlation identity** so operators can diagnose material failures without leaking secrets to clients.

**Parent:** [ARCH-029](../architecture/ARCH-029-interface-api-architecture.md) §3.11. **Audience:** backend and platform maintainers. **Action enabled:** generate, propagate, log, and safely surface a correlation id on critical paths.

---

# 2. Scope

## 2.1 In Scope

- Correlation ID generation and propagation on critical product paths
- Structured product logs (stdout JSON) with required safe fields
- Safe client correlation references on unexpected Action failures
- Correlation on `platform_rbac_audit` rows for privileged mutations
- Edge session-gate correlation header stamping
- Redaction rules (no secrets, tokens, SQL, connection strings, PII beyond org/actor ids already required for ops)

## 2.2 Out of Scope

- Vendor APM product selection (Sentry, Datadog, OpenTelemetry exporters, etc.)
- Full platform audit-store redesign beyond the correlation column
- Product analytics event schemas
- App-path alerting (5xx / auth spikes) — add only when real alert signals exist; each alert must link [RB-007](runbooks/RB-007-api-incident-response.md) or [RB-001](../runbooks/RB-001-multi-org-ops.md)

---

# 3. API Observability and Correlation Contract

## 3.1 Correlation identity

| Rule | Requirement |
| ---- | ----------- |
| Format | UUID string (`crypto.randomUUID()` or equivalent) |
| Name | `correlationId` in code, logs, and Action `details`; wire header `x-correlation-id` |
| Generate | At the start of each material Server Action invocation, or accept a valid inbound `x-correlation-id` when present |
| Edge | `apps/web/proxy.ts` stamps `x-correlation-id` on continue/redirect responses (reuse inbound when valid UUID) |
| Never omit | Critical-path unexpected failures and privileged audit writes always carry a correlation id |

**Critical paths (I5.3 floor):** invite · role assign/revoke (+ `platform_rbac_audit`) · declaration draft load/save · declaration submit · edge session gate (`proxy.ts`) · N4 Neon performance monitor run identity (workflow/run URL — not app APM).

## 3.2 Structured product logs

Emit one JSON line per material event to stdout via the platform `logProductEvent` helper (not a vendor SDK).

| Field | Required | Notes |
| ----- | -------- | ----- |
| `ts` | yes | ISO-8601 |
| `level` | yes | `info` · `warn` · `error` |
| `event` | yes | Stable snake/dot name (e.g. `action.internal_error`) |
| `correlationId` | yes | §3.1 |
| `orgId` | when known | Session org — never invent |
| `actorUserId` | when known | Session user — never invent |
| `path` | when known | Route or Action name |
| `code` | when relevant | API-002 machine code |

Expected validation / authorization failures are **not** logged as system defects ([ARCH-029](../architecture/ARCH-029-interface-api-architecture.md) §3.11). Unexpected failures log at `error` with correlation id and safe code only.

**Forbidden in logs:** passwords, session cookies, bearer tokens, connection strings, raw SQL, stack traces, full request bodies, email contents beyond already-audited target ids where the audit contract requires them.

## 3.3 Safe client correlation reference

Unexpected Server Action failures (`INTERNAL_ERROR`) return API-002 `ActionResult` with:

```typescript
{ ok: false, code: "INTERNAL_ERROR", message: "<safe copy>", details: { correlationId } }
```

Do not put stacks, env, or SQL in `message` or `details`. Expected failures may omit `correlationId` in the client body; they still generate one for internal logs when the Action entered the critical path.

## 3.4 Audit relationship

Privileged mutations that write `platform_rbac_audit` **must** stamp `correlation_id` (nullable column for historical rows; **required** on new writes from I5.3+ adapters). Investigators join logs ↔ audit ↔ safe client reference by the same `correlationId`.

## 3.5 Alerts → runbooks

When a product alert exists, its body or recovery comment must embed the owning runbook pointer. Current product alert: N4 Neon DB performance monitor → [RB-001](../runbooks/RB-001-multi-org-ops.md) §3.7b. App-path alerts remain N/A until signals exist.

## 3.6 Non-goals (explicit)

- Do not invent OTel / Sentry / Datadog / Pino dependencies for this contract
- Do not reopen Closed Living [API-002](API-002-error-contract.md) for a top-level `correlationId` field — use additive `details.correlationId`
- Do not claim distributed tracing across Neon Auth third-party hops beyond our audit + log boundary

---

# 4. References

| ID       | Title                          | Relationship              |
| -------- | ------------------------------ | ------------------------- |
| DOC-001  | Documentation Control Standard | Governance                |
| ARCH-029 | Interface and API Architecture | Parent architecture       |
| API-001  | API Boundaries                 | Adapter logging boundary  |
| API-002  | Error Contract                 | Safe client error shapes  |
| API-003  | API Types                      | Brands (no parallel invent) |
| GUIDE-017 | Enterprise Quality Evidence   | Observability dimension   |
| GUIDE-018 | Full-Stack E2E Integration    | I5.3 sequencing           |
| RB-001   | Multi-org ops                  | N4 alert runbook          |
| RB-007   | API incident response          | Future app-path alerts    |

---

# 5. Change Log

| Version | Date       | Summary                                      |
| ------- | ---------- | -------------------------------------------- |
| 1.0.0 | 2026-07-17 | Living: correlation ID, structured stdout logs, safe client details, audit column, alert→runbook; GUIDE-018 I5.3 repair. |
| 0.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 0.1.0   | 2026-07-13 | Draft placeholder registered (ARCH-029 gap). |

---

# 6. Notes

**Priority:** High. Sink may later swap to a selected APM without changing correlation identity rules.
