# Payments Gateway / Provider Layer — Phase 2 PRD / Design

- **Date**: 2026-08-03 (rev 2 — review amendments applied)
- **Module**: `@afenda/payments` ([packages/erp/payments](../../../packages/erp/payments))
- **Status**: Design rev 2 — review amendments applied; implementation-ready pending reviewer confirmation
- **Parent spec**: [Canonical Payment Model](./2026-08-03-canonical-payments-design.md) — this document is the detailed design its §9 deferred. Parent-spec constraints (server-only, events-only accounting boundary, Result pattern, event grammar §7.4, treasury non-preclusion §8) remain binding here.

## 1. Summary

Add the gateway/provider layer to the canonical payments module: **PaymentProvider** (who externally processes), **PaymentTransaction** (the online-payment intent lifecycle), **PaymentToken** (saved tokenized instrument reference), pay-link tokens, and idempotent webhook ingestion. All provider interaction sits behind a **port interface**; Phase 2 ships the port plus one deterministic in-repo **fake adapter** only. Real adapters (Stripe or others) land later as thin implementations of the port and are out of scope.

### Decisions of record

| Decision | Choice |
|---|---|
| Provider adapters | Port + deterministic fake adapter only; no real provider, no SDK dependency |
| Webhook boundary | Facade capability `ingestProviderWebhook`; organization scope derived from the provider record, never caller-supplied; HTTP route wiring in `apps/web` is out of scope |
| Pay-links | Opaque link token + expiry on the transaction; checkout rendering and link delivery out of scope |
| Tokens | Minimal PaymentToken (provider token reference + display hint); no vaulting logic |
| Capture → Payment | Auto-materialize: each capture creates-and-posts a canonical Payment via an internal transactional materialization capability (§5.3) — one commit boundary |
| Capture/refund identity | Provider-stable references, unique per transaction; API and webhook paths converge on idempotent fact operations (§5.2) |
| Authorization | Webhook-driven only; no explicit `authorize` operation or port method in Phase 2 |
| Structure | Three feature folders (`payment-providers`, `payment-transactions`, `payment-tokens`); ports in `kernel/contracts`; fake adapter in `src/testing/` |

## 2. Module layout

```
src/kernel/contracts/provider-port.ts   NEW: PaymentProviderPort + NormalizedProviderEvent
src/kernel/contracts/security-port.ts   NEW: PaymentSecurityPort (token generation/hashing/clock)
src/features/
  payment-providers/    NEW: provider master (schema, store, memory, drizzle, operations, registry)
  payment-transactions/ NEW: transaction lifecycle, capture/refund facts, pay-link token,
                             webhook ingestion, internal materialization seam
  payment-tokens/       NEW: saved token references
src/testing/fake-provider.ts  NEW: deterministic fake adapter implementing the provider port
src/testing/fake-security.ts  NEW: deterministic PaymentSecurityPort for tests
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
  /** Materialization config, frozen onto each transaction at initiation (§5.4). */
  paymentAccountId: string;
  /** Must reference a method whose kind is "gateway". Validated at create/update. */
  paymentMethodId: string;
  createdAt: Date; createdBy: string; updatedAt: Date; updatedBy: string;
}
```

**Credential projection (binding):** ordinary reads (get/list queries, facade results, events, logs, error messages) return a `PaymentProviderView` that replaces `credentialReference` with `hasCredentialReference: boolean`. Only internal operation dependencies (port invocation, webhook verification) receive the actual reference.

There is no `supportedMethodKinds` field: nothing in Phase 2 selects a checkout method (no checkout presentation, and the materialized Payment always uses the frozen gateway-kind method snapshot). A provider-domain checkout-method vocabulary lands with the phase that renders checkout.

Operations: `createPaymentProvider`, `updatePaymentProvider`, `deactivatePaymentProvider`, `listPaymentProviders`. Duplicate `normalizedCode` per organization is a CONFLICT. Odoo mapping: `payment.provider`.

### 3.2 PaymentTransaction

The online-payment intent. Status machine:

```
draft → pending → authorized ─┬─ partial capture ──→ partially_captured
                              ├─ full capture ─────→ captured
                              └─ void ─────────────→ voided
partially_captured ─┬─ additional partial capture → partially_captured
                    └─ final capture ─────────────→ captured
pending    ─→ failed (provider-confirmed) | voided
authorized ─→ failed (provider-confirmed, zero captures)
```

- `void` is allowed only from `pending`/`authorized` with zero captures. Never after any capture.
- `failed` means **provider-confirmed terminal failure** and is unreachable once any capture exists.
- Provider-side refund facts (§5.5) are recorded against `partially_captured`/`captured` transactions and do not change status.
- Status models the full intent lifecycle; `capturedTotal`/`refundedTotal` are derived aggregates over fact rows (§3.3), persisted for concurrency/query efficiency and parity-checked against the facts.

```ts
type PaymentTransactionStatus =
  | "draft" | "pending" | "authorized"
  | "partially_captured" | "captured" | "voided" | "failed";

interface PaymentMaterializationSnapshot {
  paymentAccountId: string;
  paymentMethodId: string;
  paymentMethodCode: string;
  paymentMethodKind: "gateway";
}

interface PaymentTransaction {
  id: string;
  organizationId: string;
  providerId: string;
  status: PaymentTransactionStatus;
  amount: string;                    // transaction currency, decimal string
  currencyCode: string;
  fxContext: PaymentFxContext | null; // passed through to materialized Payments
  providerTransactionReference: string | null; // set at initiation
  tokenId: string | null;            // optional saved-token reference
  /** Frozen at initiation from the provider's config (§5.4); null while draft. */
  materializationSnapshot: PaymentMaterializationSnapshot | null;
  payLinkTokenHash: string | null;   // hash of the opaque token; raw token returned once
  payLinkExpiresAt: Date | null;
  capturedTotal: string;             // derived from capture facts; parity-checked
  refundedTotal: string;             // derived from refund facts; parity-checked
  version: number;
  createdAt: Date; createdBy: string; updatedAt: Date; updatedBy: string;
}
```

### 3.3 Capture and refund facts (aggregate-owned)

Both API-driven and webhook-driven paths converge on these idempotent fact rows; provider-stable references are the dedup identity (§5.2).

```ts
interface PaymentTransactionCapture {
  id: string;
  organizationId: string;            // parity with the transaction's organization
  transactionId: string;
  paymentId: string;                 // the materialized canonical Payment
  amount: string;
  currencyCode: string;
  providerCaptureReference: string;  // provider-stable; required
  source: "api" | "webhook";
  createdAt: Date; createdBy: string;
}

interface PaymentTransactionRefund {
  id: string;
  organizationId: string;
  transactionId: string;
  amount: string;
  currencyCode: string;
  providerRefundReference: string;   // provider-stable; required
  source: "api" | "webhook";
  occurredAt: Date;                  // provider occurrence time
  createdAt: Date; createdBy: string;
}
```

Uniqueness (binding): `UNIQUE(transaction_id, provider_capture_reference)` and `UNIQUE(transaction_id, provider_refund_reference)`.

### 3.4 PaymentToken

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

Uniqueness: `UNIQUE(provider_id, provider_token_reference)` — the same external token is never stored twice.

**Token-use rules (binding):** a token used on a transaction must belong to the same organization AND the same provider as the transaction, be active, and — when the transaction declares a payer reference — match that payer reference. Tokens are implicitly mode-consistent (they belong to one provider, which has one mode). Tokens may be reused across transactions. An inactive provider blocks both token creation and token use.

Operations: `createPaymentToken`, `deactivatePaymentToken`, `listPaymentTokens`. No update of the token reference — deactivate and re-create. Odoo mapping: `payment.token`.

## 4. Ports

### 4.1 Provider port

`kernel/contracts/provider-port.ts` — the only surface through which provider behavior is reachable. Core never imports provider SDKs. Ports are resolved from a registry (`Map<string, PaymentProviderPort>`) supplied via operation deps, mirroring how stores are injected.

Normalized webhook events are a **discriminated union** — a captured event without an amount or capture identity is unrepresentable:

```ts
type NormalizedProviderEvent =
  | { providerEventId: string; kind: "authorized";
      transactionReference: string; occurredAt: string }
  | { providerEventId: string; kind: "captured";
      transactionReference: string; providerCaptureReference: string;
      amount: string; currencyCode: string; occurredAt: string }
  | { providerEventId: string; kind: "refunded";
      transactionReference: string; providerRefundReference: string;
      amount: string; currencyCode: string; occurredAt: string }
  | { providerEventId: string; kind: "voided" | "failed";
      transactionReference: string; occurredAt: string }
  | { providerEventId: string; kind: "unknown";
      transactionReference: string | null; occurredAt: string };

interface PaymentProviderPort {
  kind: string;                      // matches PaymentProvider.providerKind
  createIntent(input: {
    credentialReference: string; mode: PaymentProviderMode;
    /** Stable external idempotency key (the transaction id) — §5.6. */
    externalIdempotencyKey: string;
    amount: string; currencyCode: string;
    tokenReference: string | null;
  }): Promise<Result<{ providerTransactionReference: string }>>;
  capture(input: {
    credentialReference: string; mode: PaymentProviderMode;
    /** Stable external idempotency key (the capture command's idempotency key). */
    externalIdempotencyKey: string;
    providerTransactionReference: string; amount: string;
  }): Promise<Result<{ providerCaptureReference: string }>>;
  void(input: {
    credentialReference: string; mode: PaymentProviderMode;
    externalIdempotencyKey: string;
    providerTransactionReference: string;
  }): Promise<Result<void>>;
  refund(input: {
    credentialReference: string; mode: PaymentProviderMode;
    externalIdempotencyKey: string;
    providerTransactionReference: string; amount: string;
  }): Promise<Result<{ providerRefundReference: string }>>;
  verifyAndParseWebhook(input: {
    credentialReference: string; mode: PaymentProviderMode;
    rawBody: string;
    headers: Record<string, string>;
  }): Promise<Result<NormalizedProviderEvent>>; // signature verification lives HERE
}
```

There is **no `authorize` port method and no explicit `authorizePaymentTransaction` operation**: with HTTP checkout out of scope, authorization is a provider-observed fact that arrives via webhook. (Real-world provider models rarely expose a bare authorize call independent of payment-method collection.)

**Fake adapter** (`src/testing/fake-provider.ts`): deterministic — provider references derived from inputs; repeated calls with the same `externalIdempotencyKey` return the identical result (idempotency is enforced and testable); webhook "signature" is an HMAC-style digest of the raw body with the credential reference so verification failure is testable; capture results and matching webhook fixtures carry the **same** deterministic `providerCaptureReference`, so the API-then-webhook double-materialization race is exactly reproducible in tests. Exported from `src/testing` only — never from the public index.

### 4.2 Security port

`kernel/contracts/security-port.ts` — injectable so memory/drizzle parity tests are deterministic:

```ts
interface PaymentSecurityPort {
  generateOpaqueToken(byteLength: number): string; // base64url, no padding
  hashOpaqueToken(token: string): string;          // sha-256, hex
  now(): Date;
}
```

Production implementation uses cryptographic randomness; `src/testing/fake-security.ts` is deterministic.

## 5. Behavior

### 5.1 Transaction lifecycle operations

- `createPaymentTransaction` — draft; validates provider active, provider materialization config valid, currency, token rules (§3.4).
- `initiatePaymentTransaction` — calls `port.createIntent` with the transaction id as `externalIdempotencyKey`, stores `providerTransactionReference`, **freezes the materialization snapshot** from the provider's current config (§5.4), transitions to `pending`. Optionally (`generatePayLink: true`) mints the pay-link token (§5.7). Initiation is one-time; there is no token rotation operation in Phase 2.
- `capturePaymentTransaction`, `voidPaymentTransaction`, `refundPaymentTransaction` — explicit API-driven commands; each calls the corresponding port method (with a stable external idempotency key) and then applies the returned provider fact through the same internal transition functions used by webhook ingestion (§5.2) — one transition implementation, two entry sources.
- All mutations carry idempotency keys and `expectedVersion`; version mismatch is CONFLICT (Phase 1 pattern).

**Remote-call boundary (binding):** a provider call can never be rolled back by a DB transaction. Every provider-affecting command follows:

```
1. Validate command; record the local idempotency reservation.
2. Call the provider port with a stable external idempotency key.
3. Apply the returned provider fact in ONE local DB transaction (§5.3).
4. On local-commit uncertainty, retrying the command is safe: the provider call
   replays idempotently and the fact application is idempotent by reference.
   Webhooks independently converge any missing local state.
```

Remote calls occur strictly outside the DB transaction; only fact application is transactional.

### 5.2 Transition invariants and fact idempotency

- `capture` requires status `authorized` or `partially_captured`; amount strictly positive; `capturedTotal + amount ≤ transaction.amount`. Result state: `captured` when `capturedTotal === amount`, else `partially_captured`.
- `void` only from `pending`/`authorized` with zero captures.
- `refunded` facts require prior capture and `refundedTotal + amount ≤ capturedTotal`; currency must equal the transaction currency. Provider-side refunds do NOT reverse or refund the materialized Payment automatically — the money-side response (canonical refund via the existing facade) is an explicit operator follow-up. This keeps the accounting boundary explicit.
- Terminal statuses `voided`/`failed` accept no further transitions; late webhooks for them are recorded `ignored` (§5.6).

Both entry sources converge on idempotent internal fact operations:

```ts
applyCaptureFact({ transactionId, providerCaptureReference, amount, currencyCode, source });
applyRefundFact({ transactionId, providerRefundReference, amount, currencyCode, occurredAt, source });
```

If the provider reference already exists on the transaction, the operation returns the existing fact (and its Payment, for captures) **without creating anything** — this is what prevents API-capture-then-capture-webhook from double-materializing.

### 5.3 Capture → Payment materialization (internal transactional capability)

Materialization does NOT re-enter the public facade (which would resolve a second store/transaction) and does NOT write Payment tables directly (which would bypass canonical Payment authority). Instead the store composition layer exposes an **internal materialization capability** that runs canonical create-and-post logic inside the caller's already-open unit of work:

```
public payment facade ──────────────┐
                                    ▼
                     internal canonical payment operation
                                    ▲
                                    │
                  transaction capture fact application
```

`applyCaptureFact` executes ONE commit boundary containing all of:

1. Payment draft creation + posting (canonical logic, provider's frozen snapshot: `paymentAccountId`, `paymentMethodId`, gateway instrument `{ kind: "gateway", providerReference: providerTransactionReference }`, capture amount, transaction currency + `fxContext`, `deductions: []`);
2. `payments.payment.posted.v1` outbox emission;
3. the `payment_transaction_capture` fact row;
4. `capturedTotal` + status update, version bump;
5. `payments.payment_transaction.captured.v1` outbox emission;
6. the provider-event outcome update, when webhook-driven.

If any step fails, all state and all event emissions roll back together. The memory store implements the same single-boundary semantics so parity tests cover partial-failure behavior. Accounting keeps consuming `payment.posted.v1` as the economic fact; transaction events are operational. Provider fees arrive later via bank reconciliation or manual deductions; automatic fee deduction lines are out of scope.

### 5.4 Frozen materialization configuration

Provider config is validated at transaction creation and **frozen onto the transaction at initiation** as `materializationSnapshot`. All captures use the frozen snapshot — never the provider's current config — so two captures on one transaction can never materialize through different accounts or methods. Later provider edits affect only future transactions. (The materialized Payment additionally freezes its own method snapshot at posting, per Phase 1 §4.4; the transaction snapshot preserves *why* that account/method was selected.)

### 5.5 Refund facts

Each provider-side refund is an aggregate-owned `PaymentTransactionRefund` row (§3.3), deduplicated by `providerRefundReference`. `refundedTotal` is the sum of refund facts — persisted for concurrency/query efficiency and parity-checked against the rows. This mirrors the capture model: multiple partial refunds, API-then-webhook convergence, and duplicate refund webhooks are all handled by fact identity.

### 5.6 Webhook ingestion

Facade capability `ingestProviderWebhook({ providerId, rawBody, headers })`.

**Organization scope is derived, never supplied (binding):** the webhook endpoint resolves exactly one PaymentProvider; `organizationId` comes from that provider record and is not accepted as input. Every matched transaction must belong to the resolved provider's organization; a mismatch is a hard failure. The external request never independently controls both organization and provider.

Flow:

1. Resolve provider (active) and its port; `port.verifyAndParseWebhook` — signature failure is a VALIDATION failure, nothing recorded.
2. Upsert into `payment_provider_event` keyed `UNIQUE(provider_id, provider_event_id)`, storing a `payloadFingerprint` (hash of raw body). Rows are **never deleted** — the audit record is immutable; replays are tracked as attempts:
   - same event id + same fingerprint, status `processed`/`ignored` → return the stored outcome (idempotent no-op);
   - same event id + same fingerprint, status `failed` → controlled replay: increment `attemptCount`, retry processing;
   - same event id + **different** fingerprint → CONFLICT (potential forgery/corruption), recorded, not processed.
3. Match `transactionReference`; apply the transition per the matrix below. Outcome recorded on the event row: `processed`, `ignored`, or `failed` (with `lastErrorCode`/`lastErrorMessage`). No automatic retry machinery in Phase 2; re-delivery drives replay. A future `retryProviderEvent` operation can be added without schema change.

```ts
interface PaymentProviderEvent {
  id: string;
  organizationId: string;            // derived from the provider
  providerId: string;
  providerEventId: string;
  payloadFingerprint: string;
  kind: string;                      // normalized kind or "unknown"
  transactionId: string | null;
  status: "received" | "processed" | "ignored" | "failed";
  attemptCount: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  firstReceivedAt: Date;
  lastAttemptedAt: Date;
  processedAt: Date | null;
}
```

**Out-of-order matrix (binding).** Phase 2 policy: capture does NOT imply authorization (the fake adapter follows this; a future provider registry flag may relax it per provider).

| Incoming fact | Current state | Outcome |
|---|---|---|
| authorized | pending | process |
| authorized | authorized / partially_captured / captured | ignored (stale) |
| captured | pending | **failed** (replayable — authorization not yet observed) |
| captured | authorized / partially_captured | process |
| captured | known capture reference (any state) | idempotent stored result |
| voided | pending / authorized, zero captures | process |
| voided | partially_captured / captured | ignored (conflicting) |
| failed | pending / authorized, zero captures | process |
| failed | any captured amount | ignored (stale/conflicting) |
| refunded | capture facts cover the amount | process |
| refunded | insufficient captured amount | **failed** (replayable) |
| unknown / unmatched reference | any | ignored |

HTTP transport is out of scope: `apps/web` later adds a thin route handler passing raw body + headers straight through. The capability performs no permission check beyond provider resolution — the webhook signature is the authentication.

### 5.7 Pay-link mint & resolution

Minting (inside `initiatePaymentTransaction`, via the security port): 16 random bytes (128 bits), base64url without padding, returned **once** in the operation result; stored only as its hash with `payLinkExpiresAt` (caller-supplied, ≤ 30 days after initiation). `payLinkTokenHash` and `payLinkExpiresAt` are both null or both set. A unique index on `pay_link_token_hash` is binding.

`resolvePayLink({ token })` — public-safe query: hashes the token, looks up the transaction, returns only `{ status, amount, currencyCode, providerKind, expiresAt }`. The token is the capability: no organization permission check. Expired, consumed (transaction no longer `pending`), and unknown tokens all resolve NOT_FOUND indistinguishably; consumed links remain stored but unresolvable. Checkout rendering and link delivery (email/SMS) are out of scope.

## 6. Events

Grammar `payments.<aggregate>.<past_tense_fact>.v1` (parent spec §7.4), new aggregates `payment_provider`, `payment_transaction`, `payment_token`:

```text
payments.payment_provider.created.v1
payments.payment_provider.updated.v1
payments.payment_provider.deactivated.v1
payments.payment_transaction.created.v1
payments.payment_transaction.initiated.v1
payments.payment_transaction.authorized.v1
payments.payment_transaction.captured.v1
payments.payment_transaction.voided.v1
payments.payment_transaction.failed.v1
payments.payment_transaction.refunded.v1
payments.payment_token.created.v1
payments.payment_token.deactivated.v1
```

**Fact identities (binding).** `captured.v1` carries: `transactionId`, `providerId`, `providerTransactionReference`, `captureId`, `providerCaptureReference`, `paymentId`, `captureAmount`, `currencyCode`, `capturedTotal`, `transactionAmount`, `status`, `source`. `refunded.v1` carries: `transactionId`, `providerId`, `providerTransactionReference`, `refundId`, `providerRefundReference`, `refundAmount`, `currencyCode`, `refundedTotal`, `capturedTotal`, `source`. Consumers deduplicate on the fact identity.

**`failed.v1` semantics (binding):** emitted only for provider-confirmed terminal transaction failure. Local provider-call failures and operation errors return `Result` failures without emitting it; provider-event processing failures stay on `payment_provider_event`.

Payloads carry organizationId, entity ids, provider references, amounts, actorId, correlationId — never `credentialReference` or raw webhook bodies. Webhook ingestion itself emits no event; the resulting transition does.

## 7. Schema (`@afenda/db`)

New tables in `packages/data-plane/db/src/schema/payments.ts`:

- `payment_provider` — per §3.1; unique `(organization_id, normalized_code)`.
- `payment_transaction` — per §3.2; `fx_context`/`materialization_snapshot` JSON text; index `(organization_id, provider_id)`; unique `(provider_id, provider_transaction_reference)` where reference not null; unique index on `pay_link_token_hash`.
- `payment_transaction_capture` — per §3.3; unique `(transaction_id, provider_capture_reference)`; unique `(transaction_id, payment_id)`; index `(organization_id, transaction_id)`.
- `payment_transaction_refund` — per §3.3; unique `(transaction_id, provider_refund_reference)`; index `(organization_id, transaction_id)`.
- `payment_token` — per §3.4; unique `(provider_id, provider_token_reference)`; index `(organization_id, provider_id)`.
- `payment_provider_event` — per §5.6; unique `(provider_id, provider_event_id)`.

**Check constraints (binding — the repo already uses `check()` in payroll/platform/sales schemas):** transaction/capture/refund amounts strictly positive; `captured_total >= 0`, `refunded_total >= 0` (cross-column totals-vs-amount invariants are enforced at the application layer inside the single commit boundary); pay-link hash and expiry both null or both non-null; `mode`, `status`, `source` constrained to their known values.

**Registry classification:** all six tables are added to BOTH `PAYMENTS_AGGREGATES` and `PAYMENTS_MUTATION_TABLES`, matching the module's existing registry semantics — aggregate-owned children (`payment_allocation`, `payment_deduction`) already appear in both lists. Aggregate-only mutation is enforced the same way as Phase 1: `payment_transaction_capture`, `payment_transaction_refund`, and `payment_provider_event` expose no standalone mutation operations.

## 8. Permissions

```
payments.provider.manage    payments.provider.read
payments.transaction.manage payments.transaction.read
payments.token.manage       payments.token.read
```

`resolvePayLink` and `ingestProviderWebhook` are registered operations whose authorization is capability-based (pay-link token / webhook signature), documented as such in the registry.

## 9. Error handling & security

- `Result` everywhere; CONFLICT for version/duplicate-identity, VALIDATION for invariant breaches, NOT_FOUND for missing/foreign-org entities (Phase 1 conventions).
- No secret material at rest or in events; `credentialReference` is a pointer, surfaced only to internal operation dependencies (§3.1); raw webhook bodies are not persisted (only normalized fields + fingerprint).
- Pay-link tokens stored hashed; raw value surfaces once (§5.7).
- `server-only` import stance unchanged.

## 10. Testing

- Memory + drizzle parity per feature, per the module's established approach; deterministic fake provider + fake security ports.
- Suites:
  - provider CRUD, gateway-method validation, credential projection (reads never expose the reference);
  - transaction lifecycle: partial-capture state progression (`authorized → partially_captured → captured`), capture math, void-after-capture rejection, frozen materialization snapshot (provider edited between captures → same account/method);
  - capture idempotency: API capture followed by the matching capture webhook (same deterministic reference) materializes exactly ONE Payment; duplicate capture webhook with a new event id but known capture reference → stored result;
  - materialization atomicity: injected failure inside the commit boundary rolls back Payment, fact row, totals, and outbox emissions together;
  - refund facts: partial refunds, duplicate refund references, refund-before-capture → failed replayable event;
  - webhook ingestion: signature failure, duplicate delivery (same fingerprint), fingerprint mismatch → CONFLICT, full out-of-order matrix (§5.6), unmatched reference, unknown kind, org-scope mismatch hard failure;
  - external idempotency: retried commands reuse stable keys against the fake provider and converge without duplicate provider side effects;
  - token rules (org/provider/payer/active), pay-link mint/resolve/expiry/consumed indistinguishability.
- Governance: export-surface, registry-projection, anti-shadow expectations extended; `pnpm validate:modules:write` regenerates COMMAND/EVENT/PERMISSION/TABLE registers.

## 11. Out of scope

- Real provider adapters (Stripe or any other), provider SDKs, sandbox accounts
- HTTP route handlers in `apps/web` (thin wiring, later)
- Checkout page rendering; checkout-method vocabulary on providers; pay-link delivery (email/SMS); reminders
- Automatic provider-fee deduction lines; settlement file ingestion
- Automatic canonical refund on provider-side refund (explicit operator follow-up)
- Webhook retry machinery beyond attempt-tracked re-delivery (`retryProviderEvent` reserved as a later addition)
- Explicit authorize operation (webhook-driven authorization only)
- Token vaulting, PAN handling, PCI scope of any kind
