# Canonical Payment Model — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 1 of [the canonical payment PRD](../specs/2026-08-03-canonical-payments-design.md): payment methods & instruments, multi-currency & FX, and deduction lines in `@afenda/payments`.

**Architecture:** Extend the existing feature-first payments module in place: one new `payment-methods` feature folder (cloned from the `payment-accounts` pattern), FX policy inside `payment-lifecycle`, deductions as aggregate-owned child rows mutated only through Payment operations, and enriched v1 event payloads (economic facts) toward accounting. Pre-production destructive cutover: contracts, tables, and event payloads reshape freely; event IDs stay v1.

**Tech Stack:** TypeScript (ESM, tabs, biome), Zod v4, Drizzle ORM (Postgres), Vitest, `@afenda/errors` `Result` pattern, pnpm workspace.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-03-canonical-payments-design.md`. Where this plan and the spec disagree, the spec wins.
- Code style: tabs, biome (`pnpm --filter @afenda/payments lint`), no new dependencies, `import "server-only"` stays first in `src/index.ts`.
- All operations return `Promise<Result<T>>` from `@afenda/errors`; failures via `errorResult.fail(code, { publicMessage })`.
- Amounts are decimal **strings**; arithmetic uses the bigint helpers in `kernel/money.ts` (6dp fixed point).
- Event wire IDs are binding (spec §7.4): grammar `payments.<aggregate>.<past_tense_fact>.v1`.
- `payment.amount` = **gross settlement value**; `cashMovement = amount − Σ deductions(effect=reduces_cash_movement)`; `availableToApply = amount − refunded − applied − Σ deductions(effect=reduces_application_only)` (spec §6.1).
- FX: rate direction is transaction → functional; `fxContext` required iff currencies differ, forbidden when equal; `functionalAmount` always persisted; round half-even; rounding residuals emitted as separate facts, never allocated (spec §5).
- Editability matrix (spec §4.6): posted payments freeze method, instrument identity, snapshot, fx, deductions; clearance changes only via the dedicated operation.
- Tests: `pnpm --filter @afenda/payments test` (vitest project `payments`). Full gate: `pnpm --filter @afenda/payments check`.
- Generated registers: after manifest/permission/event changes run `pnpm validate:modules:write` from the repo root and commit the regenerated `docs-V2/modules/*.generated.yaml`.
- Commit after every task (conventional commits, `feat(payments): …` / `test(payments): …`).

---

### Task 1: Kernel domain contracts + money rounding primitive

**Files:**
- Modify: `packages/erp/payments/src/kernel/contracts/domain.ts`
- Modify: `packages/erp/payments/src/kernel/money.ts`
- Test: `packages/erp/payments/__tests__/money.test.ts` (create)

**Interfaces:**
- Consumes: existing `domain.ts` types, `decimal`/`formatDecimal` in `money.ts`.
- Produces (later tasks rely on these exact names):
  - Types: `PaymentMethodKind`, `InstrumentRequirement`, `PaymentMethod`, `PaymentMethodSnapshot`, `PaymentInstrumentKind`, `PaymentInstrument`, `InstrumentClearanceStatus`, `PaymentFxContext`, `PaymentDeductionKind`, `PaymentDeductionEffect`, `PaymentDeduction`
  - Const arrays: `PAYMENT_METHOD_KINDS`, `INSTRUMENT_REQUIREMENTS`, `PAYMENT_INSTRUMENT_KINDS`, `INSTRUMENT_CLEARANCE_STATUSES`, `PAYMENT_DEDUCTION_KINDS`, `PAYMENT_DEDUCTION_EFFECTS`
  - Widened `Payment` interface fields (below)
  - `multiplyRoundHalfEven(amount: string, rate: string, decimals: number): string` in `money.ts`

- [ ] **Step 1: Write the failing test for the rounding primitive**

Create `packages/erp/payments/__tests__/money.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { multiplyRoundHalfEven } from "../src/kernel/money";

describe("multiplyRoundHalfEven", () => {
	it("multiplies and rounds half-even at the requested precision", () => {
		expect(multiplyRoundHalfEven("100", "1.1", 2)).toBe("110");
		expect(multiplyRoundHalfEven("100.005", "1", 2)).toBe("100"); // .005 → half-even → .00
		expect(multiplyRoundHalfEven("100.015", "1", 2)).toBe("100.02"); // half-even → .02
		expect(multiplyRoundHalfEven("33.333333", "3", 2)).toBe("100");
		expect(multiplyRoundHalfEven("10", "0.123456", 6)).toBe("1.23456");
	});

	it("rejects negative precision and non-decimal input", () => {
		expect(() => multiplyRoundHalfEven("abc", "1", 2)).toThrow();
		expect(() => multiplyRoundHalfEven("1", "1", -1)).toThrow();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @afenda/payments test -- money`
Expected: FAIL — `multiplyRoundHalfEven` is not exported.

- [ ] **Step 3: Implement the primitive in `kernel/money.ts`**

Append (keep existing `decimal`/`formatDecimal` untouched):

```ts
const DECIMAL_PATTERN = /^\d+(?:\.\d{1,6})?$/;

/**
 * amount × rate, rounded half-even at `decimals` places (0–6).
 * Pure primitive — payment-specific FX interpretation lives in fx-policy.
 */
export function multiplyRoundHalfEven(
	amount: string,
	rate: string,
	decimals: number,
): string {
	if (!DECIMAL_PATTERN.test(amount) || !DECIMAL_PATTERN.test(rate)) {
		throw new Error("multiplyRoundHalfEven requires plain decimal strings");
	}
	if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6) {
		throw new Error("multiplyRoundHalfEven precision must be 0–6");
	}
	// product has 12 fractional digits at bigint scale SCALE*SCALE
	const product = decimal(amount) * decimal(rate); // scale 1e12
	const targetScale = 10n ** BigInt(12 - decimals);
	const quotient = product / targetScale;
	const remainder = product % targetScale;
	const half = targetScale / 2n;
	let rounded = quotient;
	if (remainder > half || (remainder === half && quotient % 2n === 1n)) {
		rounded += 1n;
	}
	// bring back to the 6dp SCALE used by formatDecimal
	return formatDecimal(rounded * 10n ** BigInt(6 - decimals));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @afenda/payments test -- money`
Expected: PASS.

- [ ] **Step 5: Add the new domain types**

In `kernel/contracts/domain.ts`, add after `PAYMENT_ACCOUNT_KINDS`:

```ts
export const PAYMENT_METHOD_KINDS = [
	"cash",
	"check",
	"wire",
	"ach",
	"card",
	"gateway",
	"other",
] as const;
export type PaymentMethodKind = (typeof PAYMENT_METHOD_KINDS)[number];

export const INSTRUMENT_REQUIREMENTS = [
	"forbidden",
	"optional",
	"required",
] as const;
export type InstrumentRequirement = (typeof INSTRUMENT_REQUIREMENTS)[number];

export const PAYMENT_INSTRUMENT_KINDS = [
	"check",
	"bank-transfer",
	"card",
	"gateway",
	"other",
] as const;
export type PaymentInstrumentKind = (typeof PAYMENT_INSTRUMENT_KINDS)[number];

/**
 * Discriminated instrument value object (spec §4.2). Phase 1 permits the
 * `gateway` variant only as a passive external reference — no provider
 * machinery (spec Phase 2 boundary).
 */
export type PaymentInstrument =
	| {
			kind: "check";
			number: string;
			issuedOn: string;
			clearanceDate?: string;
			bankReference?: string;
	  }
	| { kind: "bank-transfer"; bankReference: string; valueDate?: string }
	| {
			kind: "card";
			authorizationReference?: string;
			settlementReference?: string;
	  }
	| { kind: "gateway"; providerReference: string }
	| { kind: "other"; reference?: string };

export const INSTRUMENT_CLEARANCE_STATUSES = [
	"not-applicable",
	"pending",
	"cleared",
	"rejected",
] as const;
export type InstrumentClearanceStatus =
	(typeof INSTRUMENT_CLEARANCE_STATUSES)[number];

export interface PaymentMethod {
	active: boolean;
	allowedAccountKinds: readonly PaymentAccountKind[];
	allowedInstrumentKinds: readonly PaymentInstrumentKind[];
	code: string;
	createdAt: Date;
	createdBy: string;
	id: string;
	instrumentRequirement: InstrumentRequirement;
	kind: PaymentMethodKind;
	name: string;
	normalizedCode: string;
	organizationId: string;
	updatedAt: Date;
	updatedBy: string;
}

/** Minimal snapshot frozen at posting (spec §4.4) — no governance fields. */
export interface PaymentMethodSnapshot {
	code: string;
	kind: PaymentMethodKind;
	paymentMethodId: string;
}

/** Rate direction: transaction → functional (spec §5.1). */
export interface PaymentFxContext {
	exchangeRate: string;
	functionalCurrency: string;
	rateDate: string;
	rateSource: string | null;
	transactionCurrency: string;
}

export const PAYMENT_DEDUCTION_KINDS = [
	"bank_charge",
	"write_off",
	"rounding",
	"withholding",
	"other",
] as const;
export type PaymentDeductionKind = (typeof PAYMENT_DEDUCTION_KINDS)[number];

export const PAYMENT_DEDUCTION_EFFECTS = [
	"reduces_application_only",
	"reduces_cash_movement",
	"informational",
] as const;
export type PaymentDeductionEffect =
	(typeof PAYMENT_DEDUCTION_EFFECTS)[number];

/** Aggregate-owned child line — mutated only through Payment operations. */
export interface PaymentDeduction {
	accountingPurposeCode: string;
	amount: string;
	createdAt: Date;
	createdBy: string;
	description: string | null;
	effect: PaymentDeductionEffect;
	functionalAmount: string | null;
	id: string;
	kind: PaymentDeductionKind;
	lineNo: number;
	paymentId: string;
}
```

Then widen the `Payment` interface — add these fields (keep alphabetical-ish placement consistent with the file):

```ts
	clearanceStatus: InstrumentClearanceStatus;
	deductions: PaymentDeduction[];
	functionalAmount: string;
	fxContext: PaymentFxContext | null;
	instrument: PaymentInstrument | null;
	methodSnapshot: PaymentMethodSnapshot | null; // frozen at post; null while draft
	paymentMethodId: string;
```

- [ ] **Step 6: Typecheck (expected to fail downstream — record the breakage list)**

Run: `pnpm --filter @afenda/payments typecheck`
Expected: FAILURES in stores/operations that construct `Payment` — this is the intended cutover surface; Tasks 4–7 repair it. Do NOT fix them here.

- [ ] **Step 7: Commit**

```bash
git add packages/erp/payments/src/kernel packages/erp/payments/__tests__/money.test.ts
git commit -m "feat(payments): add canonical method/instrument/fx/deduction domain contracts and half-even rounding primitive"
```

---

### Task 2: FX policy (`fx-policy.ts`)

**Files:**
- Create: `packages/erp/payments/src/features/payment-lifecycle/fx-policy.ts`
- Test: `packages/erp/payments/__tests__/fx-policy.test.ts` (create)

**Interfaces:**
- Consumes: `PaymentFxContext` (Task 1), `multiplyRoundHalfEven` (Task 1), `errorResult`/`Result` from `@afenda/errors`.
- Produces:
  - `FUNCTIONAL_PRECISION = 2`
  - `validateFxContext(input: { amount: string; currencyCode: string; fxContext: PaymentFxContext | null | undefined }): Result<PaymentFxContext | null>`
  - `deriveFunctionalAmount(amount: string, fxContext: PaymentFxContext | null): string`
  - `computeRealizedFx(input: { appliedTransactionAmount: string; paymentRate: string | null; appliedDocumentAmount: string; documentBookedRate: string; appliedFunctionalAmount: string }): Result<{ paymentEquivalentFunctionalAmount: string; documentBookedFunctionalAmount: string; realizedFx: string }>` — `realizedFx` is a **signed** decimal string (may start with `-`).

- [ ] **Step 1: Write the failing tests**

Create `packages/erp/payments/__tests__/fx-policy.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
	computeRealizedFx,
	deriveFunctionalAmount,
	validateFxContext,
} from "../src/features/payment-lifecycle/fx-policy";

const fx = {
	transactionCurrency: "EUR",
	functionalCurrency: "USD",
	exchangeRate: "1.1",
	rateDate: "2026-08-01",
	rateSource: null,
};

describe("validateFxContext", () => {
	it("requires fx context when currencies differ", () => {
		const result = validateFxContext({
			amount: "100",
			currencyCode: "EUR",
			fxContext: null,
		});
		expect(result.ok).toBe(false);
	});

	it("forbids fx context when transaction currency equals functional", () => {
		const result = validateFxContext({
			amount: "100",
			currencyCode: "USD",
			fxContext: { ...fx, transactionCurrency: "USD", functionalCurrency: "USD" },
		});
		expect(result.ok).toBe(false);
	});

	it("rejects a context whose transaction currency mismatches the payment", () => {
		const result = validateFxContext({
			amount: "100",
			currencyCode: "GBP",
			fxContext: fx,
		});
		expect(result.ok).toBe(false);
	});

	it("accepts a valid cross-currency context and a same-currency null", () => {
		expect(
			validateFxContext({ amount: "100", currencyCode: "EUR", fxContext: fx }).ok,
		).toBe(true);
		expect(
			validateFxContext({ amount: "100", currencyCode: "USD", fxContext: null })
				.ok,
		).toBe(true);
	});
});

describe("deriveFunctionalAmount", () => {
	it("equals the amount when no fx context (same currency)", () => {
		expect(deriveFunctionalAmount("123.45", null)).toBe("123.45");
	});

	it("converts and rounds half-even at functional precision", () => {
		expect(deriveFunctionalAmount("100", fx)).toBe("110");
		expect(deriveFunctionalAmount("100.05", { ...fx, exchangeRate: "1" })).toBe(
			"100.05",
		);
	});
});

describe("computeRealizedFx", () => {
	it("computes the signed difference between payment-rate and document-rate values", () => {
		const result = computeRealizedFx({
			appliedTransactionAmount: "100",
			paymentRate: "1.1",
			appliedDocumentAmount: "100",
			documentBookedRate: "1.05",
			appliedFunctionalAmount: "105",
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.paymentEquivalentFunctionalAmount).toBe("110");
			expect(result.data.documentBookedFunctionalAmount).toBe("105");
			expect(result.data.realizedFx).toBe("5");
		}
	});

	it("rejects when the caller-supplied functional amount fails arithmetic validation", () => {
		const result = computeRealizedFx({
			appliedTransactionAmount: "100",
			paymentRate: "1.1",
			appliedDocumentAmount: "100",
			documentBookedRate: "1.05",
			appliedFunctionalAmount: "999",
		});
		expect(result.ok).toBe(false);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @afenda/payments test -- fx-policy`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `fx-policy.ts`**

```ts
import { errorResult, type Result } from "@afenda/errors";

import type { PaymentFxContext } from "../../kernel/contracts/domain";
import { decimal, formatDecimal, multiplyRoundHalfEven } from "../../kernel/money";

/** Functional-currency precision for derived amounts (spec §5.1, §5.4). */
export const FUNCTIONAL_PRECISION = 2;

const RATE_PATTERN = /^\d+(?:\.\d{1,6})?$/;

/**
 * Presence invariant (spec §5.1): context required iff currencies differ.
 * Returns the normalized context (or null for same-currency payments).
 */
export function validateFxContext(input: {
	amount: string;
	currencyCode: string;
	fxContext: PaymentFxContext | null | undefined;
}): Result<PaymentFxContext | null> {
	const context = input.fxContext ?? null;
	if (context === null) {
		return errorResult.ok(null);
	}
	if (context.transactionCurrency === context.functionalCurrency) {
		return errorResult.fail("VALIDATION", {
			publicMessage:
				"FX context is forbidden when transaction and functional currencies are equal",
		});
	}
	if (context.transactionCurrency !== input.currencyCode) {
		return errorResult.fail("VALIDATION", {
			publicMessage: "FX context transaction currency must match the payment currency",
		});
	}
	if (!RATE_PATTERN.test(context.exchangeRate) || decimal(context.exchangeRate) <= 0n) {
		return errorResult.fail("VALIDATION", {
			publicMessage: "FX exchange rate must be a positive decimal",
		});
	}
	return errorResult.ok(context);
}

/**
 * Same-currency counterpart of the presence invariant: callers must invoke
 * this AFTER validateFxContext confirmed shape; a cross-currency payment
 * with a null context is rejected at the operation layer (see Task 6).
 */
export function deriveFunctionalAmount(
	amount: string,
	fxContext: PaymentFxContext | null,
): string {
	if (fxContext === null) {
		return amount;
	}
	return multiplyRoundHalfEven(
		amount,
		fxContext.exchangeRate,
		FUNCTIONAL_PRECISION,
	);
}

/** Signed decimal subtraction on the 6dp fixed-point scale. */
function subtract(a: string, b: string): string {
	const diff = decimal(a) - decimal(b);
	return diff < 0n ? `-${formatDecimal(-diff)}` : formatDecimal(diff);
}

/**
 * Realized FX at application time (spec §5.2). Validates the caller's
 * arithmetic (reject, never infer) and returns the signed fact.
 */
export function computeRealizedFx(input: {
	appliedTransactionAmount: string;
	paymentRate: string | null;
	appliedDocumentAmount: string;
	documentBookedRate: string;
	appliedFunctionalAmount: string;
}): Result<{
	paymentEquivalentFunctionalAmount: string;
	documentBookedFunctionalAmount: string;
	realizedFx: string;
}> {
	const paymentEquivalentFunctionalAmount = multiplyRoundHalfEven(
		input.appliedTransactionAmount,
		input.paymentRate ?? "1",
		FUNCTIONAL_PRECISION,
	);
	const documentBookedFunctionalAmount = multiplyRoundHalfEven(
		input.appliedDocumentAmount,
		input.documentBookedRate,
		FUNCTIONAL_PRECISION,
	);
	if (documentBookedFunctionalAmount !== input.appliedFunctionalAmount) {
		return errorResult.fail("VALIDATION", {
			publicMessage:
				"Applied functional amount does not match document rate arithmetic",
		});
	}
	return errorResult.ok({
		paymentEquivalentFunctionalAmount,
		documentBookedFunctionalAmount,
		realizedFx: subtract(
			paymentEquivalentFunctionalAmount,
			documentBookedFunctionalAmount,
		),
	});
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @afenda/payments test -- fx-policy`
Expected: PASS. (Check the exact `errorResult.fail` error-code union in `@afenda/errors` — if `"VALIDATION"` is not a member, use the code that `parse-input.ts` uses for schema failures.)

- [ ] **Step 5: Commit**

```bash
git add packages/erp/payments/src/features/payment-lifecycle/fx-policy.ts packages/erp/payments/__tests__/fx-policy.test.ts
git commit -m "feat(payments): add fx policy with presence invariant, functional derivation, realized fx"
```

---

### Task 3: Database schema cutover (`@afenda/db`)

**Files:**
- Modify: `packages/data-plane/db/src/schema/payments.ts`
- Modify: `packages/erp/payments/src/kernel/emissions/mutation-tables.ts`

**Interfaces:**
- Produces: drizzle tables `paymentMethod` (`payment_method`), `paymentDeduction` (`payment_deduction`); new `payment` columns. Tasks 5–7 drizzle stores consume these.

- [ ] **Step 1: Add the `payment_method` table**

In `packages/data-plane/db/src/schema/payments.ts`, after `paymentAccount`:

```ts
/** Org-scoped payment method master (spec §4.1) — how payment occurs. */
export const paymentMethod = pgTable(
	"payment_method",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		name: text("name").notNull(),
		/** cash | check | wire | ach | card | gateway | other */
		kind: text("kind").notNull(),
		/** forbidden | optional | required */
		instrumentRequirement: text("instrument_requirement").notNull(),
		/** JSON array of PaymentInstrumentKind */
		allowedInstrumentKinds: text("allowed_instrument_kinds").notNull(),
		/** JSON array of PaymentAccountKind */
		allowedAccountKinds: text("allowed_account_kinds").notNull(),
		active: boolean("active").notNull().default(true),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("payment_method_org_id_idx").on(t.organizationId, t.id),
		uniqueIndex("payment_method_org_normalized_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
	],
);
```

- [ ] **Step 2: Add columns to `payment` and the `payment_deduction` table**

Add to the `payment` table columns (after `paymentAccountId`):

```ts
		paymentMethodId: uuid("payment_method_id")
			.notNull()
			.references(() => paymentMethod.id),
		/** PaymentMethodSnapshot JSON — frozen at post, null while draft. */
		methodSnapshot: text("method_snapshot"),
		/** PaymentInstrument JSON (discriminated union) or null. */
		instrument: text("instrument"),
		/** not-applicable | pending | cleared | rejected */
		clearanceStatus: text("clearance_status").notNull().default("not-applicable"),
		/** PaymentFxContext JSON or null (same-currency). */
		fxContext: text("fx_context"),
		functionalAmount: text("functional_amount").notNull(),
```

After `paymentAllocation`, add:

```ts
/** Aggregate-owned deduction lines (spec §6) — written only via Payment ops. */
export const paymentDeduction = pgTable(
	"payment_deduction",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		paymentId: uuid("payment_id")
			.notNull()
			.references(() => payment.id),
		lineNo: integer("line_no").notNull(),
		/** bank_charge | write_off | rounding | withholding | other */
		kind: text("kind").notNull(),
		/** reduces_application_only | reduces_cash_movement | informational */
		effect: text("effect").notNull(),
		amount: text("amount").notNull(),
		functionalAmount: text("functional_amount"),
		accountingPurposeCode: text("accounting_purpose_code").notNull(),
		description: text("description"),
		createdBy: text("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("payment_deduction_org_payment_idx").on(t.organizationId, t.paymentId),
		uniqueIndex("payment_deduction_payment_line_uidx").on(t.paymentId, t.lineNo),
	],
);
```

- [ ] **Step 3: Declare table ownership**

In `packages/erp/payments/src/kernel/emissions/mutation-tables.ts`, add `"payment_method"` and `"payment_deduction"` to BOTH `PAYMENTS_AGGREGATES` and `PAYMENTS_MUTATION_TABLES` (precedent: `payment_allocation` — also an aggregate-owned child — is listed in both; ownership declaration is a manifest concern, aggregate-only mutation is enforced by exposing no standalone deduction operations).

- [ ] **Step 4: Generate the migration and typecheck the db package**

Run: `pnpm db:generate` then `pnpm --filter @afenda/db typecheck`
Expected: a new migration under `packages/data-plane/db/drizzle/`; typecheck PASS. (Pre-production destructive cutover — `payment_method_id NOT NULL` on an empty/rebuildable table is acceptable per spec §10.)

- [ ] **Step 5: Commit**

```bash
git add packages/data-plane/db packages/erp/payments/src/kernel/emissions/mutation-tables.ts
git commit -m "feat(db): add payment_method and payment_deduction tables, canonical payment columns"
```

---

### Task 4: `payment-methods` feature (schema, store, memory, operations, permissions, registry)

**Files:**
- Create: `packages/erp/payments/src/features/payment-methods/methods.schema.ts`
- Create: `packages/erp/payments/src/features/payment-methods/methods.store.ts`
- Create: `packages/erp/payments/src/features/payment-methods/methods.memory.ts`
- Create: `packages/erp/payments/src/features/payment-methods/methods.operations.ts`
- Create: `packages/erp/payments/src/features/payment-methods/operation-registry.ts`
- Modify: `packages/erp/payments/src/kernel/execution/permissions.ts`
- Modify: `packages/erp/payments/src/kernel/operations/types.ts` (add `"payment-methods"` to `PAYMENTS_OPERATION_OWNERS`)
- Test: `packages/erp/payments/__tests__/payment-methods.test.ts` (create)

**Interfaces:**
- Consumes: Task 1 types; `code`, `mutation`, `identity` from `kernel/validation/common.schema`; `parsePaymentsInput`, `normalizedCode`; `requirePaymentsPermission`.
- Produces:
  - `PaymentMethodsStore` with: `createPaymentMethod(record: Omit<PaymentMethod, "id" | "createdAt" | "updatedAt">): Promise<Result<PaymentMethod>>`, `updatePaymentMethod(record: { organizationId: string; id: string; name?: string; instrumentRequirement?: InstrumentRequirement; allowedInstrumentKinds?: readonly PaymentInstrumentKind[]; allowedAccountKinds?: readonly PaymentAccountKind[]; active?: boolean; updatedBy: string }): Promise<Result<PaymentMethod>>`, `getPaymentMethodById(organizationId: string, id: string): Promise<Result<PaymentMethod | null>>`, `listPaymentMethods(organizationId: string): Promise<Result<PaymentMethod[]>>`
  - Operations: `createPaymentMethodOperation`, `updatePaymentMethodOperation`, `deactivatePaymentMethodOperation`, `listPaymentMethodsOperation` (each `(input: unknown, deps: PaymentMethodsOperationDeps) => Promise<Result<…>>`, deps `{ authorization?; store: PaymentMethodsStore }`)
  - `seedDefaultPaymentMethods(input: unknown, deps: PaymentMethodsOperationDeps): Promise<Result<PaymentMethod[]>>` — idempotent (skips codes that already exist)
  - `createMemoryPaymentMethodMethods(state: { methods: Map<string, PaymentMethod> }): PaymentMethodsStore`
  - Permissions: `payments.method.manage`, `payments.method.read`
  - Registries: `PAYMENTS_METHOD_COMMANDS` (ids `payments.method.create`, `payments.method.update`, `payments.method.deactivate`, `payments.method.seed_defaults`), `PAYMENTS_METHOD_QUERIES` (id `payments.method.list`)

- [ ] **Step 1: Add the permissions**

In `kernel/execution/permissions.ts` add (and append both to `PAYMENTS_PERMISSION_CODES`):

```ts
export const PAYMENTS_PERMISSION_METHOD_MANAGE =
	"payments.method.manage" as const;
export const PAYMENTS_PERMISSION_METHOD_READ = "payments.method.read" as const;
```

In `kernel/operations/types.ts` add `"payment-methods"` to `PAYMENTS_OPERATION_OWNERS`.

- [ ] **Step 2: Write the failing tests**

Create `packages/erp/payments/__tests__/payment-methods.test.ts` — mirror the facade-test style of `payments.domain.test.ts` but drive the **operations directly** with the memory slice (facade wiring lands in Task 5):

```ts
import { describe, expect, it } from "vitest";

import { createMemoryPaymentMethodMethods } from "../src/features/payment-methods/methods.memory";
import {
	createPaymentMethodOperation,
	deactivatePaymentMethodOperation,
	listPaymentMethodsOperation,
	seedDefaultPaymentMethods,
	updatePaymentMethodOperation,
} from "../src/features/payment-methods/methods.operations";
import type { PaymentMethod } from "../src/kernel/contracts/domain";

const organizationId = "org-1";
const actorUserId = "user-1";
const authorization = {
	can() {
		return Promise.resolve(true);
	},
};

function makeDeps() {
	const state = { methods: new Map<string, PaymentMethod>() };
	return { authorization, store: createMemoryPaymentMethodMethods(state) };
}

const base = {
	organizationId,
	actorUserId,
	correlationId: "corr-1",
	idempotencyKey: "method-1",
};

describe("payment methods", () => {
	it("creates, updates, deactivates, and lists methods", async () => {
		const deps = makeDeps();
		const created = await createPaymentMethodOperation(
			{
				...base,
				code: "CHECK",
				name: "Check",
				kind: "check",
				instrumentRequirement: "required",
				allowedInstrumentKinds: ["check"],
				allowedAccountKinds: ["bank"],
			},
			deps,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const updated = await updatePaymentMethodOperation(
			{ ...base, idempotencyKey: "m-upd", id: created.data.id, name: "Cheque" },
			deps,
		);
		expect(updated.ok && updated.data.name === "Cheque").toBe(true);

		const deactivated = await deactivatePaymentMethodOperation(
			{ ...base, idempotencyKey: "m-off", id: created.data.id },
			deps,
		);
		expect(deactivated.ok && deactivated.data.active === false).toBe(true);

		const listed = await listPaymentMethodsOperation(
			{ organizationId, actorUserId },
			deps,
		);
		expect(listed.ok && listed.data.length === 1).toBe(true);
	});

	it("rejects duplicate codes per organization", async () => {
		const deps = makeDeps();
		const input = {
			...base,
			code: "CASH",
			name: "Cash",
			kind: "cash",
			instrumentRequirement: "forbidden",
			allowedInstrumentKinds: [],
			allowedAccountKinds: ["cash"],
		};
		expect((await createPaymentMethodOperation(input, deps)).ok).toBe(true);
		const dup = await createPaymentMethodOperation(
			{ ...input, idempotencyKey: "method-2" },
			deps,
		);
		expect(dup.ok).toBe(false);
	});

	it("seeds the four defaults idempotently (spec §4.5)", async () => {
		const deps = makeDeps();
		const first = await seedDefaultPaymentMethods({ ...base }, deps);
		expect(first.ok && first.data.length === 4).toBe(true);
		const again = await seedDefaultPaymentMethods(
			{ ...base, idempotencyKey: "seed-2" },
			deps,
		);
		expect(again.ok && again.data.length === 0).toBe(true);
		const listed = await listPaymentMethodsOperation(
			{ organizationId, actorUserId },
			deps,
		);
		expect(listed.ok && listed.data.map((m) => m.code).sort()).toEqual(
			["bank-transfer", "cash", "check", "other"],
		);
	});
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @afenda/payments test -- payment-methods`
Expected: FAIL — modules do not exist.

- [ ] **Step 4: Implement schema, store, memory, operations, registry**

`methods.schema.ts`:

```ts
import { z } from "zod";

import {
	INSTRUMENT_REQUIREMENTS,
	PAYMENT_ACCOUNT_KINDS,
	PAYMENT_INSTRUMENT_KINDS,
	PAYMENT_METHOD_KINDS,
} from "../../kernel/contracts/domain";
import { code, identity, mutation, uuid } from "../../kernel/validation/common.schema";

export const createPaymentMethodInputSchema = z.object({
	...mutation,
	code,
	name: z.string().trim().min(1).max(128),
	kind: z.enum(PAYMENT_METHOD_KINDS),
	instrumentRequirement: z.enum(INSTRUMENT_REQUIREMENTS),
	allowedInstrumentKinds: z.array(z.enum(PAYMENT_INSTRUMENT_KINDS)).default([]),
	allowedAccountKinds: z
		.array(z.enum(PAYMENT_ACCOUNT_KINDS))
		.min(1),
	active: z.boolean().optional(),
});

export const updatePaymentMethodInputSchema = z.object({
	...mutation,
	id: uuid,
	name: z.string().trim().min(1).max(128).optional(),
	instrumentRequirement: z.enum(INSTRUMENT_REQUIREMENTS).optional(),
	allowedInstrumentKinds: z.array(z.enum(PAYMENT_INSTRUMENT_KINDS)).optional(),
	allowedAccountKinds: z.array(z.enum(PAYMENT_ACCOUNT_KINDS)).min(1).optional(),
});

export const deactivatePaymentMethodInputSchema = z.object({
	...mutation,
	id: uuid,
});

export const seedDefaultPaymentMethodsInputSchema = z.object({ ...mutation });

export const listPaymentMethodsInputSchema = z.object({ ...identity });
```

`methods.store.ts` — exactly the `PaymentMethodsStore` interface from the Interfaces block above.

`methods.memory.ts` — clone the `accounts.memory.ts` pattern (same `resolveOperation` helper, CONFLICT on duplicate `organizationId`+`normalizedCode`, `randomUUID()`, `{ ...record }` copies). `updatePaymentMethod` returns `errorResult.fail("NOT_FOUND", { publicMessage: "Payment method not found" })` for a missing/foreign-org id and bumps `updatedAt`/`updatedBy`.

`methods.operations.ts` — clone the `accounts.operations.ts` pattern: `parsePaymentsInput` → `requirePaymentsPermission` (`payments.method.manage` for the three commands and seed, `payments.method.read` for list) → store call, with `normalizedCode(parsed.data.code)`. `deactivatePaymentMethodOperation` delegates to `store.updatePaymentMethod({ …, active: false })`. The seed constant (spec §4.5, code → kind):

```ts
const DEFAULT_PAYMENT_METHODS = [
	{ code: "cash", name: "Cash", kind: "cash", instrumentRequirement: "forbidden", allowedInstrumentKinds: [], allowedAccountKinds: ["cash"] },
	{ code: "bank-transfer", name: "Bank transfer", kind: "wire", instrumentRequirement: "optional", allowedInstrumentKinds: ["bank-transfer"], allowedAccountKinds: ["bank"] },
	{ code: "check", name: "Check", kind: "check", instrumentRequirement: "required", allowedInstrumentKinds: ["check"], allowedAccountKinds: ["bank"] },
	{ code: "other", name: "Other", kind: "other", instrumentRequirement: "optional", allowedInstrumentKinds: ["other"], allowedAccountKinds: ["bank", "cash", "gateway", "clearing"] },
] as const;
```

`seedDefaultPaymentMethods` lists existing methods, creates only missing codes, returns the newly created ones (empty array when all exist).

`operation-registry.ts` — clone `payment-accounts/operation-registry.ts` with `OWNER = "payment-methods"`, commands `createPaymentMethod`/`updatePaymentMethod`/`deactivatePaymentMethod`/`seedDefaultPaymentMethods` (ids `payments.method.create|update|deactivate|seed_defaults`, permission `PAYMENTS_PERMISSION_METHOD_MANAGE`), query `listPaymentMethods` (id `payments.method.list`, permission `PAYMENTS_PERMISSION_METHOD_READ`).

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @afenda/payments test -- payment-methods`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/erp/payments/src/features/payment-methods packages/erp/payments/src/kernel packages/erp/payments/__tests__/payment-methods.test.ts
git commit -m "feat(payments): add payment-methods feature with seeded defaults"
```

---

### Task 5: Wire payment-methods into composition, facade, drizzle, and exports

**Files:**
- Create: `packages/erp/payments/src/features/payment-methods/methods.drizzle.ts`
- Modify: `packages/erp/payments/src/composition/store/contract.ts`
- Modify: `packages/erp/payments/src/composition/adapters/drizzle.ts`
- Modify: `packages/erp/payments/src/testing/memory-store.ts`
- Modify: `packages/erp/payments/src/kernel/operations/registry.ts`
- Modify: `packages/erp/payments/src/facade/capabilities.ts`
- Modify: `packages/erp/payments/src/index.ts`

**Interfaces:**
- Consumes: Task 3 tables, Task 4 store/operations/registries.
- Produces: facade functions `createPaymentMethod`, `updatePaymentMethod`, `deactivatePaymentMethod`, `listPaymentMethods`, `seedDefaultPaymentMethods` — each `(input: unknown, options: PaymentsCommandOptions = {}) => Promise<Result<…>>`; `PaymentsStore` now includes `PaymentMethodsStore`.

- [ ] **Step 1: Composition + testing store**

- `contract.ts`: import and intersect `PaymentMethodsStore` into `PaymentsStore`; re-export the type.
- `testing/memory-store.ts`: add `methods: new Map<string, PaymentMethod>()` to state and compose `createMemoryPaymentMethodMethods(state)` into the slices.
- `kernel/operations/registry.ts`: compose `PAYMENTS_METHOD_COMMANDS` / `PAYMENTS_METHOD_QUERIES` into the command/query definitions (import from `../../features/payment-methods/operation-registry`).

- [ ] **Step 2: Drizzle slice**

`methods.drizzle.ts`: clone `accounts.drizzle.ts` structure against the `paymentMethod` table. JSON-encode `allowedInstrumentKinds`/`allowedAccountKinds` with `JSON.stringify` on write and `JSON.parse` on read (they are `text` columns). Register the slice in `composition/adapters/drizzle.ts` exactly where the accounts slice is composed.

- [ ] **Step 3: Facade + exports**

`facade/capabilities.ts`: add the five wrappers following the existing shape (`…Operation(input, { authorization: options.authorization, store: resolvePaymentsStore(options.store) })`). `src/index.ts`: export the five facade functions, `export * from "./features/payment-methods/methods.schema"`, and the new domain types (`PaymentMethod`, `PaymentMethodKind`, `PaymentMethodSnapshot`, `PaymentInstrument`, `PaymentInstrumentKind`, `InstrumentRequirement`, `InstrumentClearanceStatus`, `PaymentFxContext`, `PaymentDeduction`, `PaymentDeductionKind`, `PaymentDeductionEffect`).

- [ ] **Step 4: Update governance tests and verify**

Run: `pnpm --filter @afenda/payments test -- export-surface registry-projection anti-shadow`
Update `__tests__/export-surface.test.ts` and `__tests__/registry-projection.test.ts` expected lists to include the new facade names and operation ids (these tests enumerate the public surface — extend the expectations, do not weaken assertions).
Expected: PASS after updates. (`payments.domain.test.ts` and typecheck still fail on lifecycle fields — repaired in Task 6.)

- [ ] **Step 5: Commit**

```bash
git add packages/erp/payments
git commit -m "feat(payments): wire payment-methods through composition, facade, and drizzle"
```

---

### Task 6: Lifecycle cutover — method, instrument, FX, deductions on create/post/reverse

**Files:**
- Modify: `packages/erp/payments/src/features/payment-lifecycle/lifecycle.schema.ts`
- Modify: `packages/erp/payments/src/features/payment-lifecycle/lifecycle.operations.ts`
- Modify: `packages/erp/payments/src/features/payment-lifecycle/lifecycle.store.ts`
- Modify: `packages/erp/payments/src/features/payment-lifecycle/lifecycle.memory.ts`
- Modify: `packages/erp/payments/src/features/payment-lifecycle/lifecycle.drizzle.ts`
- Modify: `packages/erp/payments/__tests__/payments.domain.test.ts`, `packages/erp/payments/__tests__/payments.transactions.test.ts`, `packages/erp/payments/__tests__/payments.authorization.test.ts` (fixtures gain `paymentMethodId`)

**Interfaces:**
- Consumes: Tasks 1–5. `PaymentLifecycleOperationDeps` gains `methods: PaymentMethodsStore` (needed for method compatibility validation at draft/post).
- Produces: `PaymentCreateRecord` gains `paymentMethodId: string; instrument: PaymentInstrument | null; fxContext: PaymentFxContext | null; functionalAmount: string; deductions: Array<Omit<PaymentDeduction, "id" | "paymentId" | "createdAt" | "createdBy" | "functionalAmount">>`. Posted payments carry `methodSnapshot`, per-line `functionalAmount`, `clearanceStatus`.

- [ ] **Step 1: Extend the zod input schemas**

In `lifecycle.schema.ts` add reusable pieces and extend `createDraftPaymentInputSchema`:

```ts
export const paymentInstrumentSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("check"),
		number: z.string().trim().min(1).max(64),
		issuedOn: z.string().date(),
		clearanceDate: z.string().date().optional(),
		bankReference: z.string().trim().max(128).optional(),
	}),
	z.object({
		kind: z.literal("bank-transfer"),
		bankReference: z.string().trim().min(1).max(128),
		valueDate: z.string().date().optional(),
	}),
	z.object({
		kind: z.literal("card"),
		authorizationReference: z.string().trim().max(128).optional(),
		settlementReference: z.string().trim().max(128).optional(),
	}),
	z.object({
		kind: z.literal("gateway"),
		providerReference: z.string().trim().min(1).max(128),
	}),
	z.object({
		kind: z.literal("other"),
		reference: z.string().trim().max(128).optional(),
	}),
]);

export const fxContextSchema = z.object({
	transactionCurrency: currencyCode,
	functionalCurrency: currencyCode,
	exchangeRate: z
		.string()
		.trim()
		.regex(/^\d+(?:\.\d{1,6})?$/),
	rateDate: z.string().date(),
	rateSource: z.string().trim().max(128).nullable().default(null),
});

export const deductionLineSchema = z.object({
	kind: z.enum(PAYMENT_DEDUCTION_KINDS),
	effect: z.enum(PAYMENT_DEDUCTION_EFFECTS).optional(), // default per kind below
	amount: money,
	accountingPurposeCode: z.string().trim().min(1).max(64),
	description: z.string().trim().max(256).nullable().optional(),
});
```

Extend `createDraftPaymentInputSchema` (inside the existing `z.object`) with:

```ts
			paymentMethodId: uuid,
			instrument: paymentInstrumentSchema.nullable().optional(),
			fxContext: fxContextSchema.nullable().optional(),
			deductions: z.array(deductionLineSchema).max(20).default([]),
```

Add the same three optional fields (`paymentMethodId` required) to `createAndPostPaymentTransferInputSchema` and `postRefundInputSchema`. In a `superRefine` on `createDraftPaymentInputSchema`, enforce spec §6.1 defaults and totals:

```ts
// default effects per kind (spec §6.1); "other" must be explicit
const DEFAULT_DEDUCTION_EFFECTS: Record<string, PaymentDeductionEffect | null> = {
	bank_charge: "reduces_cash_movement",
	withholding: "reduces_cash_movement",
	write_off: "reduces_cash_movement",
	rounding: "reduces_application_only",
	other: null,
};
```

Reject `kind: "other"` without an explicit `effect`; reject when any per-effect deduction total exceeds `amount` (compare with `decimal()` from `kernel/money.ts`).

- [ ] **Step 2: Update the store contract**

In `lifecycle.store.ts`, extend `PaymentCreateRecord` with the fields in the Interfaces block (they are set by the operation, not the store). Add to `PaymentsLifecycleStore`:

```ts
	updateInstrumentClearance: (record: {
		organizationId: string;
		paymentId: string;
		expectedVersion: number;
		status: InstrumentClearanceStatus;
		clearanceDate: string | null;
		settlementReference: string | null;
		reason: string | null;
		actorUserId: string;
		correlationId: string;
		idempotencyKey: string;
	}) => Promise<Result<Payment>>;
```

(The operation itself lands in Task 7; declaring the contract here keeps one store cutover.)

- [ ] **Step 3: Update `createDraftPaymentOperation` with method validation and FX derivation**

In `lifecycle.operations.ts`, change `PaymentLifecycleOperationDeps` to `{ authorization?; store: PaymentsLifecycleStore; methods: PaymentMethodsStore }`. In `createDraftPaymentOperation`, after permission, add:

```ts
	const method = await deps.methods.getPaymentMethodById(
		data.organizationId,
		data.paymentMethodId,
	);
	if (!method.ok) {
		return method;
	}
	if (method.data === null || !method.data.active) {
		return errorResult.fail("VALIDATION", {
			publicMessage: "Payment method not found or inactive",
		});
	}
	const compat = validateMethodCompatibility(method.data, {
		accountKind: account.kind, // fetch via a new store lookup or pass-through; see note below
		instrument: data.instrument ?? null,
	});
	if (!compat.ok) {
		return compat;
	}
	const fx = validateFxContext({
		amount: data.amount,
		currencyCode: data.currencyCode,
		fxContext: data.fxContext ?? null,
	});
	if (!fx.ok) {
		return fx;
	}
	const functionalAmount = deriveFunctionalAmount(data.amount, fx.data);
```

**Note on account kind:** the account's kind is needed for `allowedAccountKinds` validation. Add `getPaymentAccountById(organizationId, id): Promise<Result<PaymentAccount | null>>` to `PaymentAccountsStore` (+ memory + drizzle implementations, following `getById` on lifecycle) and add `accounts: PaymentAccountsStore` to `PaymentLifecycleOperationDeps`. Facade wrappers pass the same resolved store object for `store`, `methods`, and `accounts` (it is the composite `PaymentsStore`).

**Cross-currency presence:** `validateFxContext` (Task 2) rejects a non-null context on same-currency payments, but the *missing-context-on-cross-currency* case needs the functional currency, which only the caller knows. Enforce it structurally: the payment's functional currency IS `fx.data?.functionalCurrency ?? data.currencyCode` — a cross-currency payment without a context is indistinguishable from same-currency by design, so the invariant holds by construction (spec §5.1: context required iff currencies differ — with no context, currencies are equal by definition). Document this with a comment in the operation.

Add `validateMethodCompatibility` as a small helper in `lifecycle.operations.ts`:

```ts
function validateMethodCompatibility(
	method: PaymentMethod,
	input: { accountKind: PaymentAccountKind; instrument: PaymentInstrument | null },
): Result<void> {
	if (!method.allowedAccountKinds.includes(input.accountKind)) {
		return errorResult.fail("VALIDATION", {
			publicMessage: "Payment account kind is not allowed for this method",
		});
	}
	if (method.instrumentRequirement === "required" && input.instrument === null) {
		return errorResult.fail("VALIDATION", {
			publicMessage: "This payment method requires instrument details",
		});
	}
	if (method.instrumentRequirement === "forbidden" && input.instrument !== null) {
		return errorResult.fail("VALIDATION", {
			publicMessage: "This payment method forbids instrument details",
		});
	}
	if (
		input.instrument !== null &&
		!method.allowedInstrumentKinds.includes(input.instrument.kind)
	) {
		return errorResult.fail("VALIDATION", {
			publicMessage: "Instrument kind is not allowed for this method",
		});
	}
	return errorResult.ok(undefined);
}
```

Pass through to `deps.store.createDraft({ …existing fields…, paymentMethodId: data.paymentMethodId, instrument: data.instrument ?? null, fxContext: fx.data, functionalAmount, deductions: resolvedDeductions })` where `resolvedDeductions` applies the per-kind default effects and assigns `lineNo` by array order (1-based). Apply the same validation to `createAndPostPaymentTransferOperation` and `postRefundOperation` (transfers/refunds may pass `deductions: []`).

- [ ] **Step 4: Update the memory store**

In `lifecycle.memory.ts` (read the whole file first — it holds draft/post/reverse/transfer/refund logic and the idempotency map):

- `createDraft`: persist the new fields; initialize `clearanceStatus` to `"not-applicable"` unless the instrument kind is `"check"` or `"bank-transfer"`, in which case `"pending"`; `methodSnapshot: null`; store deductions as `PaymentDeduction[]` with `functionalAmount: null`, `id: randomUUID()`, `createdAt`/`createdBy`.
- `post`: on transition to `posted`, freeze `methodSnapshot` from the method fields already on the record — the snapshot needs `code`/`kind`, so `PaymentCreateRecord` must ALSO carry `methodSnapshotSource: { code: string; kind: PaymentMethodKind }` captured by the operation from the validated method (add it to the record type in Step 2). Set each deduction's `functionalAmount = deriveFunctionalAmount(deduction.amount, payment.fxContext)` (import from `fx-policy.ts`) and freeze `functionalAmount` on the payment.
- `reverse`: unchanged flow; deductions ride along (negated emission is an event concern, Task 8).
- Transfers and refunds: same new fields; transfers use the caller-supplied `paymentMethodId` on both legs.

- [ ] **Step 5: Update the drizzle store to parity**

Mirror every memory change in `lifecycle.drizzle.ts`: new columns on insert/select/update (JSON-encode `instrument`, `fxContext`, `methodSnapshot`; deduction rows insert/select into `paymentDeduction` within the same transaction as the payment write; map rows back into `Payment.deductions` ordered by `lineNo`). Follow the file's existing transaction and idempotency-key patterns exactly.

- [ ] **Step 6: Repair fixtures and run the full suite**

Update `payments.domain.test.ts`, `payments.transactions.test.ts`, `payments.authorization.test.ts`: seed a method per test org (use `seedDefaultPaymentMethods` or `createPaymentMethod` with code `bank-transfer`) and add `paymentMethodId` to every `createDraftPayment` / transfer / refund fixture. Add one new domain-test case:

```ts
	it("freezes the method snapshot and functional amounts at post", async () => {
		// create draft with fxContext {EUR→USD, rate 1.1}, amount 100, one
		// bank_charge deduction of 2 → post → expect:
		// payment.functionalAmount === "110"
		// payment.methodSnapshot.kind === "wire"
		// deduction.functionalAmount === "2.2"
		// availability: availableToApply === "98"  (bank_charge defaults to
		// reduces_cash_movement, so it does NOT reduce application capacity —
		// availability math changes land in Task 8; assert "100" here and
		// update this assertion in Task 8 if needed per spec §6.1)
	});
```

Run: `pnpm --filter @afenda/payments check`
Expected: typecheck PASS, all suites PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/erp/payments
git commit -m "feat(payments): canonical lifecycle cutover with method, instrument, fx, and deductions"
```

---

### Task 7: Instrument clearance operation

**Files:**
- Modify: `packages/erp/payments/src/features/payment-lifecycle/lifecycle.schema.ts`
- Modify: `packages/erp/payments/src/features/payment-lifecycle/lifecycle.operations.ts`
- Modify: `packages/erp/payments/src/features/payment-lifecycle/lifecycle.memory.ts`
- Modify: `packages/erp/payments/src/features/payment-lifecycle/lifecycle.drizzle.ts`
- Modify: `packages/erp/payments/src/features/payment-lifecycle/operation-registry.ts`
- Modify: `packages/erp/payments/src/facade/capabilities.ts`, `packages/erp/payments/src/index.ts`
- Test: `packages/erp/payments/__tests__/payments.clearance.test.ts` (create)

**Interfaces:**
- Consumes: Task 6 store method `updateInstrumentClearance`.
- Produces: facade `updateInstrumentClearance(input, options)`; operation id `payments.payment.update_instrument_clearance` (permission `payments.payment.update` — already exists); event emission lands in Task 8.

- [ ] **Step 1: Write the failing tests**

`payments.clearance.test.ts` — through the facade with the memory store (Task 6 made facade+memory whole). Cases (spec §4.3 invariants):

```ts
// 1. posting a check payment leaves clearanceStatus "pending";
//    updateInstrumentClearance to "cleared" with clearanceDate succeeds
// 2. "cleared" without clearanceDate → fail
// 3. "pending" WITH clearanceDate → fail
// 4. draft payment → fail (only posted payments may transition)
// 5. wrong expectedVersion → fail (CONFLICT)
// 6. repeat call with same idempotencyKey → returns the already-updated
//    payment without a second version bump
```

Write them as real tests following `payments.domain.test.ts` seeding style (org, account, seeded `check` method, draft with check instrument, post, then clearance calls).

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @afenda/payments test -- clearance`
Expected: FAIL — facade function does not exist.

- [ ] **Step 3: Implement schema + operation + stores + registry + facade**

`lifecycle.schema.ts`:

```ts
export const updateInstrumentClearanceInputSchema = z
	.object({
		...mutation,
		paymentId: uuid,
		expectedVersion: z.number().int().positive(),
		status: z.enum(INSTRUMENT_CLEARANCE_STATUSES),
		clearanceDate: z.string().date().nullable().optional(),
		settlementReference: z.string().trim().max(128).nullable().optional(),
		reason: z.string().trim().max(512).nullable().optional(),
	})
	.superRefine((value, ctx) => {
		if (value.status === "cleared" && !value.clearanceDate) {
			ctx.addIssue({
				code: "custom",
				path: ["clearanceDate"],
				message: "clearanceDate is required when status is cleared",
			});
		}
		if (value.status === "pending" && value.clearanceDate) {
			ctx.addIssue({
				code: "custom",
				path: ["clearanceDate"],
				message: "clearanceDate is forbidden when status is pending",
			});
		}
	});
```

Operation `updateInstrumentClearanceOperation` follows the `postPaymentOperation` shape with permission `"payments.payment.update"`, then `deps.store.updateInstrumentClearance(...)`. Memory + drizzle implementations enforce: payment exists, `status === "posted"`, `expectedVersion` matches (else CONFLICT), method-required instruments cannot be set `"not-applicable"`, version bump + `updatedAt`/`updatedBy`, idempotency-key replay returns the stored result (mirror the existing post/reverse idempotency handling in the file). Register command id `payments.payment.update_instrument_clearance` (`publicName: "updateInstrumentClearance"`, owner `payment-lifecycle`) and export through facade + index. Extend `__tests__/export-surface.test.ts` / `registry-projection.test.ts` expectations.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @afenda/payments check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/erp/payments
git commit -m "feat(payments): instrument clearance as a controlled post-posting amendment"
```

---

### Task 8: Availability math, application FX, and enriched event contracts

**Files:**
- Modify: `packages/erp/payments/src/features/application-instructions/instructions.schema.ts`
- Modify: `packages/erp/payments/src/features/application-instructions/instructions.operations.ts`
- Modify: `packages/erp/payments/src/features/application-instructions/instructions.memory.ts`
- Modify: `packages/erp/payments/src/features/application-instructions/instructions.drizzle.ts`
- Modify: `packages/erp/payments/src/kernel/contracts/domain.ts` (availability + instruction fields)
- Modify: `packages/data-plane/events/src/schemas/payments.events.ts`
- Modify: `packages/erp/payments/src/kernel/contracts/effects.ts`
- Test: extend `packages/erp/payments/__tests__/payments.domain.test.ts`; modify `packages/data-plane/events/__tests__/schemas.test.ts`

**Interfaces:**
- Consumes: `computeRealizedFx` (Task 2), deduction fields (Task 6).
- Produces:
  - `PaymentApplicationAvailability` gains `deductionsTotal: string` and `cashMovement: string`
  - `PaymentApplicationInstruction` gains `fx: ApplicationFxContext | null` and `realizedFx: string | null` where `ApplicationFxContext = { documentCurrency: string; appliedDocumentAmount: string; documentBookedRate: string; appliedFunctionalAmount: string }` (exported from `domain.ts`)
  - Event payload schemas per spec §7.1–§7.2

- [ ] **Step 1: Write the failing availability test**

Extend `payments.domain.test.ts`:

```ts
	it("availability subtracts only reduces_application_only deductions (spec §6.1)", async () => {
		// amount 100, deductions: bank_charge 2 (reduces_cash_movement),
		// rounding 0.5 (reduces_application_only) → post →
		// availability: postedAmount "100", deductionsTotal "0.5",
		// availableToApply "99.5", cashMovement "98"
	});
```

Write it fully (seed org/account/method, draft with both deductions, post, `getPaymentApplicationAvailability`).

- [ ] **Step 2: Run to verify it fails, then implement availability**

Run: `pnpm --filter @afenda/payments test -- domain` → FAIL.
Implement in `domain.ts` (new fields), `instructions.memory.ts:250` and `instructions.drizzle.ts:367` (the two `availableToApply` computations): subtract the sum of `reduces_application_only` deduction amounts; expose `deductionsTotal` (that same sum) and `cashMovement` (`amount − Σ reduces_cash_movement`). Use `decimal`/`formatDecimal`.
Run again → PASS.

- [ ] **Step 3: Application FX input + realized FX fact**

- `instructions.schema.ts`: `addPaymentApplicationInstructionInputSchema` gains optional `fx: z.object({ documentCurrency: currencyCode, appliedDocumentAmount: money, documentBookedRate: z.string().trim().regex(/^\d+(?:\.\d{1,6})?$/), appliedFunctionalAmount: money }).nullable().optional()`.
- `instructions.operations.ts`: in `markApplicationInstructionAppliedOperation`, when the instruction carries `fx`, call `computeRealizedFx({ appliedTransactionAmount: appliedAmount, paymentRate: payment.fxContext?.exchangeRate ?? null, appliedDocumentAmount: fx.appliedDocumentAmount, documentBookedRate: fx.documentBookedRate, appliedFunctionalAmount: fx.appliedFunctionalAmount })`; reject on failure (spec §5.2 reject-don't-infer); persist `realizedFx` on the instruction. Cross-currency without full fx input → reject with `publicMessage: "Cross-currency application requires a complete fx context"` (detect: payment has `fxContext` but instruction `fx` is null and instruction currency differs from payment currency).
- Memory + drizzle: persist the two new instruction fields (JSON `fx` column `fx_context`, text `realized_fx` — add both columns to `paymentAllocation` in `packages/data-plane/db/src/schema/payments.ts`, rerun `pnpm db:generate`).

Add a domain test: EUR payment (rate 1.1) applied 100 against a USD-booked invoice at rate 1.05 → `realizedFx === "5"` on the applied instruction.

- [ ] **Step 4: Enrich the event schemas (economic-facts contract, spec §7)**

In `packages/data-plane/events/src/schemas/payments.events.ts`:

```ts
const signedMoney = z
	.string()
	.trim()
	.regex(/^-?\d+(?:\.\d{1,6})?$/);

const methodSnapshotSchema = z
	.object({
		paymentMethodId: z.string().uuid(),
		code: z.string().trim().min(1),
		kind: z.enum(["cash", "check", "wire", "ach", "card", "gateway", "other"]),
	})
	.strict();

const fxBlockSchema = z
	.object({
		transactionCurrency: z.string().trim().length(3),
		functionalCurrency: z.string().trim().length(3),
		exchangeRate: money,
		rateDate: z.string(),
		transactionAmount: money,
		functionalAmount: money,
	})
	.strict();

const deductionFactSchema = z
	.object({
		kind: z.enum(["bank_charge", "write_off", "rounding", "withholding", "other"]),
		effect: z.enum([
			"reduces_application_only",
			"reduces_cash_movement",
			"informational",
		]),
		accountingPurposeCode: z.string().trim().min(1),
		amount: signedMoney,
		functionalAmount: signedMoney.nullable(),
	})
	.strict();
```

Extend `paymentPayloadSchema` with:

```ts
		paymentMethodId: z.string().uuid(),
		methodSnapshot: methodSnapshotSchema.nullable(),
		instrument: z
			.object({ kind: z.string(), reference: z.string().nullable() })
			.strict()
			.nullable(),
		fx: fxBlockSchema.nullable(),
		functionalAmount: money,
		cashMovement: money,
		deductions: z.array(deductionFactSchema),
		roundingDifferenceFunctionalAmount: signedMoney.nullable(),
```

Extend the applied-instruction schema (`payments.application_instruction.applied.v1` only — use `.extend`) with:

```ts
		realizedFx: signedMoney.nullable(),
		paymentRate: money.nullable(),
		documentBookedRate: money.nullable(),
```

Add new event schemas + constants (grammar spec §7.4):

```ts
	"payments.payment_method.created.v1": paymentMethodPayloadSchema,
	"payments.payment_method.updated.v1": paymentMethodPayloadSchema,
	"payments.payment_method.deactivated.v1": paymentMethodPayloadSchema,
	"payments.payment.instrument_clearance_updated.v1": clearancePayloadSchema,
```

with:

```ts
const paymentMethodPayloadSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		paymentMethodId: z.string().uuid(),
		code: z.string().trim().min(1),
		kind: z.enum(["cash", "check", "wire", "ach", "card", "gateway", "other"]),
		active: z.boolean(),
		actorId: z.string().trim().min(1),
		correlationId: z.string().trim().min(1),
	})
	.strict();

const clearancePayloadSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		paymentId: z.string().uuid(),
		status: z.enum(["not-applicable", "pending", "cleared", "rejected"]),
		clearanceDate: z.string().nullable(),
		settlementReference: z.string().nullable(),
		reason: z.string().nullable(),
		actorId: z.string().trim().min(1),
		correlationId: z.string().trim().min(1),
	})
	.strict();
```

Export constants `PAYMENTS_PAYMENT_METHOD_CREATED_EVENT`, `…_UPDATED_EVENT`, `…_DEACTIVATED_EVENT`, `PAYMENTS_PAYMENT_INSTRUMENT_CLEARANCE_UPDATED_EVENT` and re-export from `schemas/index.ts`. `payments.payment.reversed.v1` re-emits deductions with negated `amount`/`functionalAmount` (`signedMoney` permits the sign). Update `packages/erp/payments/src/kernel/contracts/effects.ts` `PaymentsEventType` union to include the four new IDs. Update `packages/data-plane/events/__tests__/schemas.test.ts` fixtures for the widened payloads.

- [ ] **Step 5: Run both packages' suites**

Run: `pnpm --filter @afenda/payments check && pnpm --filter @afenda/events test && pnpm --filter @afenda/events typecheck`
Expected: PASS. (If payments' stores emit events with the old payload shape, extend the emission sites in memory/drizzle stores to include the new facts — the emit payload is `Record<string, unknown>`, so typecheck won't catch omissions: verify against the widened schemas via the events tests, and add one payments test asserting the posted-event payload parses with `PaymentsEventSchemas["payments.payment.posted.v1"]` if the module's tests capture emitted events; if no test harness captures emissions, note it and rely on the events-package schema tests.)

- [ ] **Step 6: Commit**

```bash
git add packages/erp/payments packages/data-plane/events packages/data-plane/db
git commit -m "feat(payments): deduction-aware availability, application fx, economic-facts event contracts"
```

---

### Task 9: Module manifest, generated registers, reconciliation contract, final gate

**Files:**
- Modify: `packages/erp/payments/src/composition/module.manifest.ts`
- Modify: `packages/erp/payments/src/features/reconciliation/reconcile.ts`
- Modify: `docs-V2/modules/*.generated.yaml` (regenerated, not hand-edited)

**Interfaces:**
- Consumes: everything above.
- Produces: a fully green repo gate.

- [ ] **Step 1: Manifest**

In `module.manifest.ts` add the four new event constants to `events.emits` (import from `@afenda/events/schemas`). Aggregates/mutation tables and command/query ids flow in automatically from Tasks 3–7 registries.

- [ ] **Step 2: Reconciliation matching contract (spec §7.3)**

Read `src/features/reconciliation/reconcile.ts`. Widen its matching record/candidate type to include: `instrumentReference: string | null` (the identifying reference from the instrument union), `paymentMethodId`, `functionalAmount`, `cashMovement`, `deductionsTotal`. Matching logic: bank lines match against `cashMovement` (not gross `amount`); keep existing amount matching as fallback when `cashMovement === amount`. Add/extend the reconciliation test in the existing suite covering: payment amount 100 with a 2 bank-charge deduction reconciles a 98 bank line.

- [ ] **Step 3: Regenerate registers**

Run: `pnpm validate:modules:write`
Expected: `docs-V2/modules/COMMAND-REGISTER.generated.yaml`, `EVENT-REGISTER.generated.yaml`, `PERMISSION-REGISTER.generated.yaml`, `TABLE-OWNERSHIP.generated.yaml` pick up the new operations, events, permissions, and tables. Then `pnpm validate:modules` → PASS.

- [ ] **Step 4: Full verification gate**

Run, in order, and confirm each passes (do not claim success without output):

```bash
pnpm --filter @afenda/payments check
pnpm --filter @afenda/db typecheck
pnpm --filter @afenda/events test
pnpm validate:modules
pnpm --filter @afenda/payments lint
```

- [ ] **Step 5: Commit**

```bash
git add packages/erp/payments docs-V2/modules
git commit -m "feat(payments): manifest, reconciliation contract, and register regeneration for canonical model"
```

---

## Spec-coverage map (self-review record)

| Spec section | Task |
|---|---|
| §3 layout & placement rules | 1, 2, 4 |
| §4.1 PaymentMethod entity | 3, 4 |
| §4.2 instrument union + gateway boundary | 1, 6 |
| §4.3 clearance + amendment contract | 6 (status init), 7 |
| §4.4 minimal snapshot | 1, 6 |
| §4.5 mandatory method + seed | 4 (seed), 6 (required input) |
| §4.6 editability matrix | 6 (frozen at post), 7 (clearance-only path) |
| §5.1 fx context + presence invariant | 2, 6 |
| §5.2 application fx + realized gain/loss | 2, 8 |
| §5.3 availability in transaction currency | 8 |
| §5.4 rounding residuals | 2 (rounding), 8 (event fact field) |
| §6 deduction effects + arithmetic | 1, 6, 8 |
| §7.1–7.2 event payloads + new events | 8 |
| §7.3 reconciliation contract | 9 |
| §7.4 event grammar | 8, 9 (register check) |
| §10 cutover + seed/backfill, test suites | 3, 4, 9 |

Out of scope confirmed: no provider entities, no rate fetching, no bank files, no approval engine (spec §11).
