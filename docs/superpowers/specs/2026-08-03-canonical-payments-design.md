# Canonical Payment Model — PRD / Design

- **Date**: 2026-08-03
- **Module**: `@afenda/payments` ([packages/erp/payments](../../../packages/erp/payments))
- **Status**: Approved design — implementation-ready, subject to the binding closure clarifications below
- **Compatibility target**: concept parity with ERPNext (Payment Entry, Mode of Payment, deductions, Payment Request) and Odoo (account.payment, payment method lines, payment.provider/transaction/token)

### Binding closure clarifications

1. The cutover includes schema migration and deterministic method seed/backfill; it does **not** include compatibility migration, dual-read, dual-write, or dual-published events (§10).
2. Payment amount, cash movement, deduction, and net application semantics are explicitly defined via per-line deduction effects (§6).
3. Functional-currency rounding residuals are emitted as separate economic facts and are never silently allocated (§5.4).
4. Event wire IDs and naming grammar are frozen through the canonical operation registry (§7.4).

## 1. Summary

Extend the existing feature-first payments module into a **canonical payment model**: one governed way to construct, post, and reverse any payment, expressive enough to represent everything ERPNext and Odoo payment models can represent. This is **concept parity, not integration** — ERPNext and Odoo serve as reference designs; no connectors or import mappers are in scope.

Delivered in two phases within this PRD:

- **Phase 1 (fully specified)**: payment methods & instruments, multi-currency & FX, deductions & write-offs — all as extensions of the existing Payment aggregate.
- **Phase 2 (requirements level)**: gateway/provider layer (PaymentProvider, PaymentTransaction, PaymentToken, pay-links). Detailed design deferred to its own spec.
- **Future direction (non-preclusion constraints only)**: treasury payment factory — centralized multi-entity payment processing (POBO, in-house banking). Not built now; Phase 1 must not preclude it (§8).

### Decisions of record

| Decision | Choice |
|---|---|
| Compatibility meaning | Concept parity (reference designs, no runtime interop) |
| "Payment factory" meaning | Canonical model now; treasury factory documented as future direction |
| Modeling approach | Extend Payment aggregate in place; deductions as typed child lines (ERPNext shape) |
| Breaking changes | Pre-production: reshape tables/contracts/event payloads freely, keep event IDs at v1 |
| Accounting boundary | Events-only; payments emits economic facts, never journal entries |

## 2. Current state

The module is promoted (not scaffold-band) with a feature-first kernel architecture:

- `kernel/` — domain contracts, money primitives, authorization, operation registry, mutation-table emissions
- `features/` — payment-accounts, payment-lifecycle (draft → posted → reversed), application-instructions (targeting receivables/payables documents), reconciliation
- `facade/` — public capabilities; `composition/` — store slices, drizzle adapter, module manifest
- Idempotency keys on every mutation; versioned `payments.*.v1` events; 6 test suites

Gaps closed by this PRD: no payment-method concept (only account kinds), single-currency only, no deduction/write-off representation, no gateway abstraction.

## 3. Architecture & module layout (Phase 1)

The feature-first structure stays. One new feature folder plus growth in existing ones:

```
src/features/
  payment-methods/          NEW: PaymentMethod entity (schema, store, memory, drizzle,
                            operations, operation-registry)
  payment-lifecycle/        grows: instrument value object, FX context, deduction lines,
                            fx-policy.ts, clearance operation
  application-instructions/ grows: cross-currency application, availability math
                            includes deductions
  reconciliation/           workflow unchanged; matching contract widens (§7.3)
src/kernel/
  contracts/domain.ts       new types: PaymentMethod, PaymentMethodSnapshot,
                            PaymentInstrument, PaymentFxContext, PaymentDeduction
  money.ts                  decimal arithmetic, currency precision, rounding primitives ONLY
  emissions/mutation-tables.ts  + payment_method (payment_deduction is aggregate-owned, §6)
```

**Placement rules (binding):**

1. `kernel/money.ts` holds only pure decimal/rounding primitives. Payment-specific FX interpretation (rate direction, conversion, validation, derived functional amounts) lives in `features/payment-lifecycle/fx-policy.ts`.
2. New capabilities take explicit **value objects** (`PaymentFxContext`, `PaymentInstrument`), never loose scalar fields widened onto operation inputs.
3. `payment_deduction` is **aggregate-owned**: mutated only through Payment operations, never an independently writable feature or standalone mutation surface.

Facade additions: `createPaymentMethod`, `updatePaymentMethod`, `deactivatePaymentMethod`, `listPaymentMethods`, `updateInstrumentClearance`. Existing create/post capabilities accept the new value objects. Store contract composes one new slice. No new package, no new external dependency.

## 4. Payment methods & instruments (Phase 1)

Three concepts, kept strictly separate:

- **PaymentMethod** — *how* payment occurs (org-scoped master record)
- **PaymentInstrument** — the *concrete evidence* used for one payment (payment-owned value object)
- **PaymentProvider** — *who* externally processed it (Phase 2 only, §9)

### 4.1 PaymentMethod entity

```ts
type PaymentMethodKind = "cash" | "check" | "wire" | "ach" | "card" | "gateway" | "other";
type InstrumentRequirement = "forbidden" | "optional" | "required";

interface PaymentMethod {
  id: string;
  organizationId: string;
  code: string;
  normalizedCode: string;
  name: string;
  kind: PaymentMethodKind;
  active: boolean;
  instrumentRequirement: InstrumentRequirement;
  allowedInstrumentKinds: readonly PaymentInstrumentKind[];
  allowedAccountKinds: readonly PaymentAccountKind[];
  createdAt: Date; createdBy: string; updatedAt: Date; updatedBy: string;
}
```

Validation at draft **and** post: the payment's account kind must be in `allowedAccountKinds`; instrument presence must satisfy `instrumentRequirement`; instrument kind must be in `allowedInstrumentKinds`. This prevents invalid combinations (e.g. cheque fields on a cash payment).

Reference mapping: ERPNext *Mode of Payment* → PaymentMethod; Odoo *payment method line* → PaymentMethod.

### 4.2 PaymentInstrument (discriminated union, payment-owned)

```ts
type PaymentInstrument =
  | { kind: "check"; number: string; issuedOn: string; clearanceDate?: string; bankReference?: string }
  | { kind: "bank-transfer"; bankReference: string; valueDate?: string }
  | { kind: "card"; authorizationReference?: string; settlementReference?: string }
  | { kind: "gateway"; providerReference: string }
  | { kind: "other"; reference?: string };
```

A tagged union — never a nullable-field block — so contradictory states are unrepresentable. ERPNext *reference no / reference date* maps into the relevant variant.

**Phase 1 scope of the `gateway` variant (binding):** Phase 1 permits `instrument.kind = "gateway"` only as a *passive external-reference representation* for imported or manually recorded gateway payments. It does not create provider configuration, transaction lifecycle, webhook ingestion, token handling, or any direct processor interaction — all of that is Phase 2 (§9). Implementers must not start Phase 2 inside Phase 1.

### 4.3 Clearance

Instrument clearance is distinct from payment lifecycle status and from reconciliation status:

```ts
type InstrumentClearanceStatus = "not-applicable" | "pending" | "cleared" | "rejected";
```

Stored on the payment alongside the instrument. Updated only through the dedicated `updateInstrumentClearance` post-posting operation (emits `payment.instrument_clearance_updated.v1`). This gives post-dated-cheque parity without a cheque-management subsystem. A `rejected` clearance does not auto-reverse the payment; reversal remains an explicit operation.

Clearance updates are **controlled amendments**:

```ts
type UpdateInstrumentClearanceInput = {
  paymentId: string;
  expectedVersion: number;
  status: InstrumentClearanceStatus;
  clearanceDate?: string;
  settlementReference?: string;
  reason?: string;
  idempotencyKey: string;
};
```

Invariants:

- only posted payments may enter `pending`, `cleared`, or `rejected`
- `clearanceDate` is required for `cleared` and forbidden for `pending`
- `not-applicable` cannot be used when the method requires a clearable instrument (e.g. check)
- transition from `cleared` back to `pending` requires controlled-correction authority
- every amendment is auditable, idempotent, and version-checked (`expectedVersion`)

### 4.4 Method snapshot (frozen semantics)

At posting, the payment freezes a snapshot so later edits to the master record never change historical interpretation:

```ts
type PaymentMethodSnapshot = { paymentMethodId: string; code: string; kind: PaymentMethodKind };
```

The snapshot is deliberately minimal. Do **not** snapshot `allowedAccountKinds`, `allowedInstrumentKinds`, `active`, display name, or audit fields — those are validation-time governance details, not historical economic facts.

### 4.5 Mandatory method, no hidden fallback

`paymentMethodId` is **required on every newly created payment**. To make that safe:

- Each organization is **seeded** with default methods (code → kind): `cash` → `cash`, `bank-transfer` → `wire`, `check` → `check`, `other` → `other`. The seed applies at organization provisioning and via a backfill for existing orgs/fixtures.
- Imported/legacy payments may use an explicit `other` method.
- There is **no implicit default**: creation without a method is a validation error, never a silent fallback.

### 4.6 Editability matrix (binding)

| Field | Draft | Posted | Reconciled |
|---|---|---|---|
| `paymentMethodId` | Editable | Immutable | Immutable |
| Instrument identifying fields | Editable | Immutable | Immutable |
| Clearance status/date | Editable | Editable via `updateInstrumentClearance` only | Controlled correction only |
| Bank/provider settlement reference | Optional | May be appended via clearance operation | Controlled correction only |
| Method snapshot | Derived | Frozen | Frozen |

No generic `updatePayment` operation may modify posted instrument data.

## 5. Multi-currency & FX (Phase 1)

**Terminology (used everywhere in contracts):** `transactionCurrency` — the payment's own currency; `functionalCurrency` — the organization's base currency.

### 5.1 PaymentFxContext

```ts
type PaymentFxContext = {
  transactionCurrency: string;   // ISO 4217
  functionalCurrency: string;
  exchangeRate: string;          // decimal string, transaction → functional
  rateDate: string;              // local date
  rateSource?: string;           // provenance only
};
```

Rules:

- **Presence invariant**: `fxContext` is required when `transactionCurrency ≠ functionalCurrency`, forbidden when equal. `functionalAmount` is always persisted (equal to `amount` in the same-currency case) so consumers never branch.
- **Rate authority**: the caller supplies the rate. `fx-policy.ts` validates (positive, precision bounds, rateDate sanity) but never fetches rates; rate sourcing is a master-data concern, out of scope.
- **Derivation**: `functionalAmount = roundHalfEven(amount × exchangeRate)` at functional-currency precision, computed by `fx-policy.ts`. Editable while draft; frozen at post.

### 5.2 Cross-currency application & realized FX

An application instruction carries an explicit FX context so rate direction is never ambiguous:

```ts
type ApplicationFxContext = {
  documentCurrency: string;
  appliedDocumentAmount: string;      // amount applied, in document currency
  documentBookedRate: string;         // document → functional
  appliedFunctionalAmount: string;    // caller-supplied functional value at document rate
};
```

The caller (the target module, which knows its document's booked rate) supplies the amounts; payments validates the arithmetic and computes the fact:

```text
paymentEquivalentFunctionalAmount = roundHalfEven(appliedTransactionAmount × payment.exchangeRate)
documentBookedFunctionalAmount    = roundHalfEven(appliedDocumentAmount × documentBookedRate)
realizedFx = paymentEquivalentFunctionalAmount − documentBookedFunctionalAmount
```

Emitted as a signed economic fact on `application_instruction.applied.v1` (with both rates). Payments computes and reports; accounting classifies and books.

**Phase 1 cross-currency rule (binding):** cross-currency application is supported only where the caller supplies the applied amount in payment transaction currency, the applied amount in document currency, and both corresponding functional-currency values or rates. Payments validates the arithmetic and emits the difference. Derivation of a missing transaction-currency equivalent (e.g. payment and document in two different foreign currencies with no supplied cross amount) is rejected, not inferred.

### 5.3 Availability

Availability math stays entirely in transaction currency — no FX in availability.

### 5.4 Rounding residuals

Each monetary component (payment, each deduction line, each application) is independently rounded at functional-currency precision:

```text
deduction.functionalAmount = roundHalfEven(deduction.amount × payment.exchangeRate)
```

Any residual caused solely by component rounding (e.g. component functional sums differing from `payment.functionalAmount` by sub-precision amounts) is emitted as a separate signed `roundingDifferenceFunctionalAmount` economic fact. It is **never** silently added to the final deduction or application line. This keeps event payloads reproducible and order-independent.

## 6. Deductions & write-offs (Phase 1)

`PaymentDeduction` — aggregate-owned typed child lines (ERPNext Payment Entry deductions shape):

```ts
type PaymentDeductionKind = "bank_charge" | "write_off" | "rounding" | "withholding" | "other";

type PaymentDeductionEffect =
  | "reduces_application_only"   // consumes gross settlement capacity; cash unaffected
  | "reduces_cash_movement"      // cash moved is less than gross; application capacity unaffected
  | "informational";             // affects neither; classification-only fact

interface PaymentDeduction {
  id: string;
  paymentId: string;
  lineNo: number;
  kind: PaymentDeductionKind;
  effect: PaymentDeductionEffect; // required per line; defaults per kind below
  amount: string;                 // transaction currency, strictly positive
  functionalAmount: string | null; // derived at post via the payment's fx context (§5.4)
  accountingPurposeCode: string;  // resolved to a GL account by accounting; payments never holds account IDs
  description: string | null;
  createdAt: Date; createdBy: string;
}
```

### 6.1 Amount semantics (binding)

`payment.amount` is the **gross settlement value** — the economic value the payment record represents. From it:

```text
deductionsTotal(effect)  = sum of deduction amounts with that effect
cashMovement             = payment.amount − deductionsTotal("reduces_cash_movement")
availableToApply         = payment.amount − refundedAmount − appliedAmount
                           − deductionsTotal("reduces_application_only")
```

`informational` deductions affect neither figure. The event contract carries each line's `effect` explicitly (§7.1) — accounting never infers cash treatment from the deduction kind.

**Default effect per kind** (caller may override where economically justified): `bank_charge` → `reduces_cash_movement`; `withholding` → `reduces_cash_movement`; `write_off` → `reduces_cash_movement`; `rounding` → `reduces_application_only`; `other` → no default, effect must be supplied.

### 6.2 Invariants

- Each deduction `amount` is strictly positive; per-effect totals must each be `≤ payment.amount`, and `cashMovement ≥ 0` and `availableToApply ≥ 0` at all times.
- Deductions are editable only in draft, only through Payment operations; frozen at post; reversed atomically with payment reversal (the reversed event re-emits them negated as economic facts).

## 7. Events & the accounting contract (Phase 1)

Accounting stays events-only. Payments emits **economic facts**, never journal entries. Event IDs stay at v1 (pre-production); payloads are reshaped now and specified as the posting contract.

### 7.1 Enriched payloads

`payments.payment.posted.v1` carries everything accounting needs to derive cash/bank movement, settled principal, deduction classifications, and both-currency values:

- method snapshot (§4.4)
- instrument summary: kind + identifying reference
- fx block: both currencies, rate, rateDate, transaction amount, functional amount
- deductions array: kind, **effect**, purpose code, transaction + functional amounts
- derived figures: gross amount, `cashMovement`, and any `roundingDifferenceFunctionalAmount` fact (§5.4)
- payment account reference

`payments.application_instruction.applied.v1` additionally carries the realized FX gain/loss fact (signed functional amount, payment rate, document rate).

`payments.payment.reversed.v1` re-emits deductions negated.

### 7.2 New events

- `payments.payment_method.created.v1` / `updated.v1` / `deactivated.v1`
- `payments.payment.instrument_clearance_updated.v1`

### 7.3 Reconciliation matching contract

The reconciliation workflow is unchanged, but its matching contract explicitly widens to: instrument reference, payment-method identity, transaction-currency amount, functional-currency amount, exchange-rate variance tolerance, deductions total (and `cashMovement`, which is what a bank line actually matches). Provider reference is reserved for Phase 2.

### 7.4 Event naming grammar (frozen)

One grammar: `payments.<aggregate>.<past_tense_fact>.v1`, where `<aggregate>` ∈ `payment`, `payment_method`, `application_instruction`, `refund`, `transfer`. The full Phase 1 set:

```text
payments.payment_method.created.v1
payments.payment_method.updated.v1
payments.payment_method.deactivated.v1
payments.payment.created.v1
payments.payment.posted.v1
payments.payment.reversed.v1
payments.payment.instrument_clearance_updated.v1
payments.refund.posted.v1
payments.transfer.posted.v1
payments.application_instruction.created.v1
payments.application_instruction.applied.v1
payments.application_instruction.rejected.v1
```

Wire IDs are frozen through the canonical operation registry (and surface in the generated EVENT-REGISTER). The names above are **binding wire contracts** — registry generation must produce exactly these IDs.

## 8. Treasury payment factory — non-preclusion constraints (binding on Phase 1)

The factory (centralized multi-entity payment processing: POBO, in-house banking, centralized approval, bank connectivity) is **not built now**. Phase 1 must satisfy:

1. **Intake seam** — all payment creation flows through facade capabilities; a future payment-instruction → factory → payment pipeline can sit in front of the facade as a new feature without touching the aggregate.
2. **Entity dimension** — payments stay organization-scoped. The factory's multi-entity dimension attaches to **PaymentAccount** (accounts later gain a legal-entity owner from corporate-administration), not to Payment. No reserved dead columns now.
3. **POBO / intercompany** — `linkedPaymentId` + `transferGroupId` are the sanctioned representation of mirrored intercompany pairs.
4. **Approval workflows** — the operation-registry pattern is the hook for centralized approval policies later; no approval fields land now.
5. **Bank connectivity** — ISO 20022 (pain.001) file generation and batch payment orders are explicitly out of scope, listed as factory-phase deliverables.

## 9. Phase 2 — gateway/provider layer (requirements only)

Detailed design deferred to its own spec. Requirements:

- **PaymentProvider** — org-scoped configuration of an external processor. Holds credential *references* only (never secrets in-table), supported method kinds, mode (test/live).
- **PaymentTransaction** — online-payment intent lifecycle: `draft → pending → authorized → captured | voided | failed`, plus provider-side refund. A captured transaction materializes a canonical Payment **through the existing facade** (never direct table writes), with `instrument.kind = "gateway"` carrying the provider reference. Odoo mapping: `payment.transaction`. Payment requests / pay-links are a presentation of a transaction in `pending`.
- **PaymentToken** — saved tokenized instrument: provider token reference only, no PAN, no credentials; repo server-only and secret-handling rules apply.
- **Cross-cutting**: idempotent webhook ingestion keyed on provider event IDs; transaction→payment linkage supports partial captures (one-to-many); all provider interaction behind a port interface — core never imports provider SDKs.

## 10. Testing & rollout

- Each touched feature folder keeps the existing pattern: operations tests against the memory store plus the shared drizzle-parity approach.
- New/updated suites:
  - payment-methods CRUD + account/instrument compatibility rules
  - `fx-policy` unit tests: rounding (half-even vectors), presence invariant, realized gain/loss math with known vectors
  - deduction invariants + widened availability math
  - instrument union validation; editability-matrix enforcement (posted-immutability tests); clearance operation
  - event payload snapshot tests for the economic-facts contract (§7)
- Governance artifacts regenerate: COMMAND/EVENT/PERMISSION registers, export-surface and registry-projection tests.
- **Rollout**: no *compatibility* migration or dual-read period is required. A one-time destructive schema cutover and deterministic PaymentMethod seed/backfill run for all existing organizations and test fixtures. Existing payment data may be rebuilt or transformed under pre-production cutover rules. The mandatory `paymentMethodId` (§4.5) holds with no hidden fallback because the seed lands in the same cutover.

  | Change | Required |
  |---|---|
  | Schema migration | Yes |
  | Existing organization method seed/backfill | Yes |
  | Existing payment transformation | Depends on retained data |
  | Dual-write or dual-read | No |
  | Backward-compatible API period | No |
  | Event dual-publish | No |

## 11. Out of scope

- Live integration or data import/export with ERPNext or Odoo instances
- Exchange-rate sourcing/services (master-data concern)
- Cheque-management subsystem beyond the clearance status/operation
- Bank statement import; ISO 20022 file generation; batch payment orders (factory phase)
- Direct GL posting from payments (accounting boundary stays events-only)
- Approval workflow engine (operation-registry hook noted, nothing built)
