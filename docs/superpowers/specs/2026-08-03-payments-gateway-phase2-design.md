# Payments Gateway / Provider Layer — Phase 2 PRD / Design

- **Date**: 2026-08-03
- **Module**: `@afenda/payments` ([packages/erp/payments](../../../packages/erp/payments))
- **Status**: Approved design — implementation-ready
- **Parent spec**: [Canonical Payment Model](./2026-08-03-canonical-payments-design.md) — this document is the detailed design its §9 deferred. Parent-spec constraints (server-only, events-only accounting boundary, Result pattern, event grammar §7.4, treasury non-preclusion §8) remain binding here.

## 1. Summary

Add the gateway/provider layer to the canonical payments module: **PaymentProvider** (who externally processes), **PaymentTransaction** (the online-payment intent lifecycle), **PaymentToken** (saved tokenized instrument reference), pay-link tokens, and idempotent webhook ingestion. All provider interaction sits behind a **port interface**; Phase 2 ships the port plus one deterministic in-repo **fake adapter** only. Real adapters (Stripe or others) land later as thin implementations of the port and are out of scope.

### Decisions of record

| Decision | Choice |
|---|---|
| Provider adapters | Port + deterministic fake adapter only; no real provider, no SDK dependency |
| Webhook boundary | Facade capability `ingestProviderWebhook`; HTTP route wiring in `apps/web` is out of scope |
| Pay-links | Opaque link token + expiry on the transaction; checkout rendering and link delivery out of scope |
| Tokens | Minimal PaymentToken (provider token reference + display hint); no vaulting logic |
| Capture → Payment | Auto-materialize: each capture creates-and-posts a canonical Payment through the existing facade |
| Structure | Three feature folders (`payment-providers`, `payment-transactions`, `payment-tokens`); port in `kernel/contracts/provider-port.ts`; fake adapter in `src/testing/` |

## 2. Module layout

```
src/kernel/contracts/provider-port.ts   NEW: PaymentProviderPort + NormalizedProviderEvent
src/features/
  payment-providers/    NEW: provider master (schema, store, memory, drizzle, operations, registry)
  payment-transactions/ NEW: transaction lifecycle, captures, pay-link token, webhook ingestion
  payment-tokens/       NEW: saved token references
src/testing/fake-provider.ts  NEW: deterministic fake adapter implementing the port
```

Each feature folder follows the Phase 1 pattern exactly: zod schema, store contract, memory slice, drizzle slice, operations, operation-registry; composed through `composition/store/contract.ts`, the drizzle adapter, the kernel operation registry, the facade, and `src/index.ts`. No new package, no new external dependency.

## 3. Entities

### 3.1 PaymentProvider

Org-scoped configuration of an external processor.

```ts
type PaymentProviderMode = "test" | "live";

interface PaymentProvider {
  id: string;
  organizationId: string;
  code: string;
  normalizedCode: string;
  name: string;
  /** Port registry key; Phase 2 ships only "fake". Unknown kinds are a validation error. */
  providerKind: string;
  mode: PaymentProviderMode;
  active: boolean;
  /** Opaque pointer into a secret store — NEVER secret material (parent spec §9). */
  credentialReference: string;
  supportedMethodKinds: readonly PaymentMethodKind[];
  /** Materialization config for the capture seam (§5.3). */
  paymentAccountId: string;
  /** Must reference a method whose kind is "gateway". Validated at create/update. */
  paymentMethodId: string;
  createdAt: Date; createdBy: string; updatedAt: Date; updatedBy: string;
}
```

Operations: `createPaymentProvider`, `updatePaymentProvider`, `deactivatePaymentProvider`, `listPaymentProviders`. Duplicate `normalizedCode` per organization is a CONFLICT. Odoo mapping: `payment.provider`.

### 3.2 PaymentTransaction

The online-payment intent. Status machine:

```
draft → pending → authorized → captured | voided | failed
                       └────────→ voided | failed
pending ──────────────────────→ failed
captured ── provider-side refund events recorded as refund facts (§5.4)
```

```ts
type PaymentTransactionStatus =
  | "draft" | "pending" | "authorized" | "captured" | "voided" | "failed";

interface PaymentTransaction {
  id: string;
  organizationId: string;
  providerId: string;
  status: PaymentTransactionStatus;
  amount: string;                    // transaction currency, decimal string
  currencyCode: string;
  fxContext: PaymentFxContext | null; // passed through to materialized Payments
  providerTransactionReference: string | null; // set by port.createIntent
  tokenId: string | null;            // optional saved-token reference
  payLinkTokenHash: string | null;   // sha-256 of the opaque token; raw token returned once
  payLinkExpiresAt: Date | null;
  capturedTotal: string;             // sum of capture amounts, transaction currency
  refundedTotal: string;             // sum of provider-side refund facts
  version: number;
  createdAt: Date; createdBy: string; updatedAt: Date; updatedBy: string;
}
```

Partial captures are one-to-many via the aggregate-owned link row:

```ts
interface PaymentTransactionCapture {
  id: string;
  organizationId: string;
  transactionId: string;
  paymentId: string;                 // the materialized canonical Payment
  amount: string;
  providerCaptureReference: string | null;
  createdAt: Date; createdBy: string;
}
```

### 3.3 PaymentToken

```ts
interface PaymentToken {
  id: string;
  organizationId: string;
  providerId: string;
  providerTokenReference: string;    // provider-side token id only — no PAN, no credentials
  displayHint: string;               // masked, e.g. "••4242"
  payerReference: string;            // caller-defined payer identity (customer id, contact id)
  active: boolean;
  createdAt: Date; createdBy: string; updatedAt: Date; updatedBy: string;
}
```

Operations: `createPaymentToken`, `deactivatePaymentToken`, `listPaymentTokens`. No update of the token reference — deactivate and re-create. Odoo mapping: `payment.token`.

## 4. Provider port

`kernel/contracts/provider-port.ts` — the only surface through which provider behavior is reachable. Core never imports provider SDKs.

```ts
type NormalizedProviderEventKind =
  | "authorized" | "captured" | "voided" | "failed" | "refunded";

interface NormalizedProviderEvent {
  providerEventId: string;           // provider-unique; idempotency key (§5.5)
  kind: NormalizedProviderEventKind | "unknown";
  transactionReference: string;      // matches providerTransactionReference
  amount: string | null;             // for captured/refunded partial amounts
  occurredAt: string;                // provider timestamp, ISO
}

interface PaymentProviderPort {
  kind: string;                      // matches PaymentProvider.providerKind
  createIntent(input: {
    credentialReference: string;
    mode: PaymentProviderMode;
    amount: string;
    currencyCode: string;
    tokenReference: string | null;
  }): Promise<Result<{ providerTransactionReference: string }>>;
  capture(input: {
    credentialReference: string; mode: PaymentProviderMode;
    providerTransactionReference: string; amount: string;
  }): Promise<Result<{ providerCaptureReference: string | null }>>;
  void(input: {
    credentialReference: string; mode: PaymentProviderMode;
    providerTransactionReference: string;
  }): Promise<Result<void>>;
  refund(input: {
    credentialReference: string; mode: PaymentProviderMode;
    providerTransactionReference: string; amount: string;
  }): Promise<Result<void>>;
  verifyAndParseWebhook(input: {
    credentialReference: string; mode: PaymentProviderMode;
    rawBody: string;
    headers: Record<string, string>;
  }): Promise<Result<NormalizedProviderEvent>>; // signature verification lives HERE
}
```

Ports are resolved from a registry (`Map<string, PaymentProviderPort>`) supplied via operation deps, mirroring how stores are injected. The **fake adapter** (`src/testing/fake-provider.ts`) implements the port deterministically: references derived from inputs, webhook "signature" a simple HMAC-style digest of the raw body with the credential reference, so verification failure is testable. It is exported from `src/testing` only — never from the public index.

## 5. Behavior

### 5.1 Transaction lifecycle operations

- `createPaymentTransaction` — draft; validates provider active, currency, optional token belongs to the same provider and is active.
- `initiatePaymentTransaction` — calls `port.createIntent`, stores `providerTransactionReference`, transitions to `pending`. Optionally (`generatePayLink: true`) mints the pay-link token: 128-bit random opaque token, returned **once** in the operation result, stored as a sha-256 hash with `payLinkExpiresAt` (caller-supplied, bounded ≤ 30 days).
- `authorizePaymentTransaction`, `capturePaymentTransaction`, `voidPaymentTransaction`, `refundPaymentTransaction` — explicit API-driven transitions; each calls the corresponding port method and then applies the same internal transition function used by webhook ingestion (one transition implementation, two entry sources).
- All mutations carry idempotency keys and `expectedVersion`; version mismatch is CONFLICT (Phase 1 pattern).

### 5.2 Transition invariants

- `capture` requires status `authorized`; capture amount strictly positive and `capturedTotal + amount ≤ transaction.amount`.
- Transaction becomes `captured` when `capturedTotal === amount`; a partial capture leaves it `authorized`.
- `void` only from `pending`/`authorized` with `capturedTotal === "0"`.
- `refunded` facts require prior capture and `refundedTotal + amount ≤ capturedTotal`. Provider-side refunds do NOT reverse or refund the materialized Payment automatically — they are recorded on the transaction and emitted as facts; the money-side response (canonical refund via the existing facade) is an explicit follow-up decision by the operator. This keeps the accounting boundary explicit.
- Terminal statuses `voided`/`failed` accept no further transitions; late webhooks for them are recorded as `ignored` (§5.5).

### 5.3 Capture → Payment materialization (the seam)

On each successful capture, inside the same store transaction:

1. Create-and-post a canonical Payment **through the existing facade capability** (never direct table writes), with: the provider's configured `paymentAccountId` + `paymentMethodId` (gateway-kind), `amount` = capture amount, the transaction's `currencyCode` and `fxContext`, `instrument: { kind: "gateway", providerReference: providerTransactionReference }`, `deductions: []`.
2. Insert the `payment_transaction_capture` link row.
3. Update `capturedTotal`/status, bump version.

The materialized Payment emits `payments.payment.posted.v1` exactly as any other payment — accounting consumes that as the economic fact. Transaction events (§6) are operational, not accounting facts. Provider fees arrive later via bank reconciliation or manual deductions; automatic fee deduction lines are out of scope.

### 5.4 Pay-link resolution

`resolvePayLink({ token })` — public-safe query: hashes the token, looks up the transaction, and returns only `{ status, amount, currencyCode, providerKind, expiresAt }`. The token is the capability: no organization permission check. Expired, consumed (transaction no longer `pending`), and unknown tokens all resolve NOT_FOUND indistinguishably. Rendering a checkout page and delivering the link (email/SMS) are out of scope.

### 5.5 Webhook ingestion

Facade capability `ingestProviderWebhook({ organizationId, providerId, rawBody, headers })`:

1. Resolve provider (active) and its port; `port.verifyAndParseWebhook` — signature failure is a VALIDATION failure, nothing recorded.
2. Insert into `payment_provider_event` with unique `(provider_id, provider_event_id)`. A duplicate is an **idempotent no-op success** returning the original outcome.
3. Match `transactionReference` to a transaction; apply the transition. Outcomes recorded on the event row: `processed`, `ignored` (unknown kind, terminal-status late event, unmatched reference), or `failed` (processing error, replayable by re-delivery with the same event id after the row is cleared by ops tooling — no automatic retry machinery in Phase 2).

```ts
interface PaymentProviderEvent {
  id: string;
  organizationId: string;
  providerId: string;
  providerEventId: string;
  kind: string;                       // normalized kind or "unknown"
  transactionId: string | null;
  status: "processed" | "ignored" | "failed";
  error: string | null;
  receivedAt: Date;
}
```

HTTP transport is out of scope: `apps/web` later adds a thin route handler that passes raw body + headers straight through. The facade capability performs no authorization check beyond provider resolution — the webhook signature is the authentication.

## 6. Events

Grammar `payments.<aggregate>.<past_tense_fact>.v1` (parent spec §7.4), new aggregates `payment_provider`, `payment_transaction`, `payment_token`:

```text
payments.payment_provider.created.v1
payments.payment_provider.updated.v1
payments.payment_provider.deactivated.v1
payments.payment_transaction.created.v1
payments.payment_transaction.initiated.v1
payments.payment_transaction.authorized.v1
payments.payment_transaction.captured.v1     (carries paymentId, capture amount, capturedTotal)
payments.payment_transaction.voided.v1
payments.payment_transaction.failed.v1
payments.payment_transaction.refunded.v1     (provider-side refund fact; carries refundedTotal)
payments.payment_token.created.v1
payments.payment_token.deactivated.v1
```

Payloads carry organizationId, entity ids, provider references, amounts, actorId, correlationId — never credential references or raw webhook bodies. Webhook ingestion itself emits no event; the resulting transition does.

## 7. Schema (`@afenda/db`)

New tables, all in `packages/data-plane/db/src/schema/payments.ts`:

- `payment_provider` — columns per §3.1; unique `(organization_id, normalized_code)`; `supported_method_kinds` JSON text.
- `payment_transaction` — columns per §3.2; `fx_context` JSON text; index `(organization_id, provider_id)`; unique partial-safe index on `(provider_id, provider_transaction_reference)` where reference not null; index on `pay_link_token_hash`.
- `payment_transaction_capture` — per §3.2; unique `(transaction_id, payment_id)`; index `(organization_id, transaction_id)`.
- `payment_token` — per §3.3; index `(organization_id, provider_id)`.
- `payment_provider_event` — per §5.5; unique `(provider_id, provider_event_id)`.

Mutation-table ownership: all five added to `PAYMENTS_AGGREGATES` and `PAYMENTS_MUTATION_TABLES`. `payment_transaction_capture` and `payment_provider_event` are aggregate-owned — no standalone mutation operations exist for them.

## 8. Permissions

```
payments.provider.manage   payments.provider.read
payments.transaction.manage payments.transaction.read
payments.token.manage      payments.token.read
```

`resolvePayLink` and `ingestProviderWebhook` are registered operations whose authorization is capability-based (token / webhook signature), documented as such in the registry.

## 9. Error handling & security

- `Result` everywhere; CONFLICT for version/duplicate-code, VALIDATION for invariant breaches, NOT_FOUND for missing/foreign-org entities (Phase 1 conventions).
- No secret material at rest or in events: `credentialReference` is a pointer; raw webhook bodies are not persisted (only normalized fields).
- Pay-link tokens stored hashed; raw value surfaces once.
- `server-only` import stance unchanged.

## 10. Testing

- Memory + drizzle parity per feature, per the module's established approach.
- Suites: provider CRUD + gateway-method validation; transaction lifecycle including partial-capture math, capture→Payment materialization asserted through the payments facade (Payment exists, posted, gateway instrument), void/refund invariants; webhook ingestion — duplicate delivery, out-of-order events, unknown kinds, signature failure, unmatched reference; token CRUD; pay-link mint/resolve/expiry/consumed indistinguishability.
- Governance: export-surface, registry-projection, anti-shadow expectations extended; `pnpm validate:modules:write` regenerates COMMAND/EVENT/PERMISSION/TABLE registers.

## 11. Out of scope

- Real provider adapters (Stripe or any other), provider SDKs, sandbox accounts
- HTTP route handlers in `apps/web` (thin wiring, later)
- Checkout page rendering; pay-link delivery (email/SMS); reminders
- Automatic provider-fee deduction lines; settlement file ingestion
- Automatic canonical refund on provider-side refund (explicit operator follow-up)
- Webhook retry/replay machinery beyond the idempotent event log
- Token vaulting, PAN handling, PCI scope of any kind
