# Payments Gateway / Provider Layer (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved Phase 2 spec: PaymentProvider, PaymentTransaction with capture/refund facts and auto-materialized canonical Payments, PaymentToken, pay-link tokens, and idempotent webhook ingestion in `@afenda/payments`.

**Architecture:** Three new feature folders (`payment-providers`, `payment-transactions`, `payment-tokens`) following the Phase 1 feature-first pattern exactly; provider behavior behind `PaymentProviderPort` (registry-injected, fake adapter only); capture→Payment materialization through an internal store-level seam sharing one commit boundary; provider-stable capture/refund references as idempotency identity.

**Tech Stack:** TypeScript (ESM, tabs, biome), Zod v4, Drizzle ORM (Postgres), Vitest, `@afenda/errors` `Result`, pnpm workspace.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-03-payments-gateway-phase2-design.md`. Where this plan and the spec disagree, the spec wins.
- Code style: tabs, biome (`pnpm --filter @afenda/payments lint`), no new dependencies, `import "server-only"` stays first in `src/index.ts`.
- All operations return `Promise<Result<T>>`; failures via `errorResult.fail(code, { publicMessage })` with codes `VALIDATION`, `CONFLICT`, `NOT_FOUND` (Phase 1 conventions).
- Amounts are decimal strings; arithmetic via `decimal`/`formatDecimal` in `kernel/money.ts`.
- Event wire IDs binding (spec §6): `payments.payment_provider.{created,updated,deactivated}.v1`, `payments.payment_transaction.{created,initiated,authorized,captured,voided,failed,refunded}.v1`, `payments.payment_token.{created,deactivated}.v1`.
- Event emission is contract-level, matching Phase 1 precedent: schemas in `@afenda/events` + manifest `emits`; there are NO `effects.emit` call sites anywhere in the module today — do not invent an outbox subsystem. The binding commit boundary (spec §5.3) applies to state + fact rows.
- Webhook actor (binding): `system:payment-provider-webhook` for all webhook-driven `createdBy`/actor fields.
- No `authorize` port method or operation; authorization arrives via webhook only.
- `credentialReference` never appears in query/list results, facade outputs, events, logs, or error messages.
- Tests: `pnpm --filter @afenda/payments test` (vitest project `payments`). Full gate: `pnpm --filter @afenda/payments check`.
- After manifest/permission/event changes: `pnpm validate:modules:write` from repo root, commit regenerated `docs-V2/modules/*.generated.yaml`.
- Commit after every task (conventional commits).

---

### Task 1: Kernel contracts — domain types, provider port, security port, permissions, owners

**Files:**
- Modify: `packages/erp/payments/src/kernel/contracts/domain.ts`
- Create: `packages/erp/payments/src/kernel/contracts/provider-port.ts`
- Create: `packages/erp/payments/src/kernel/contracts/security-port.ts`
- Modify: `packages/erp/payments/src/kernel/execution/permissions.ts`
- Modify: `packages/erp/payments/src/kernel/operations/types.ts`

**Interfaces:**
- Consumes: existing `PaymentFxContext`, `Result` from `@afenda/errors`.
- Produces (later tasks rely on these exact names): types `PaymentProviderMode`, `PaymentProvider`, `PaymentProviderView`, `PaymentTransactionStatus`, `PaymentMaterializationSnapshot`, `PaymentTransaction`, `PaymentTransactionCapture`, `PaymentTransactionRefund`, `PaymentToken`, `PaymentProviderEvent`, `PaymentProviderEventStatus`, `ProviderFactSource`; const arrays `PAYMENT_PROVIDER_MODES`, `PAYMENT_TRANSACTION_STATUSES`, `PAYMENT_PROVIDER_EVENT_STATUSES`, `PROVIDER_FACT_SOURCES`; port types `PaymentProviderPort`, `NormalizedProviderEvent`, `PaymentSecurityPort`; constant `PAYMENTS_WEBHOOK_ACTOR`; permissions `payments.provider.manage/read`, `payments.transaction.manage/read`, `payments.token.manage/read`; owners `"payment-providers" | "payment-transactions" | "payment-tokens"`.

- [ ] **Step 1: Add domain types to `kernel/contracts/domain.ts`** (append after the Phase 1 deduction types):

```ts
export const PAYMENT_PROVIDER_MODES = ["test", "live"] as const;
export type PaymentProviderMode = (typeof PAYMENT_PROVIDER_MODES)[number];

/** Org-scoped external processor configuration (Phase 2 spec §3.1). */
export interface PaymentProvider {
	active: boolean;
	code: string;
	createdAt: Date;
	createdBy: string;
	/** Opaque secret-store pointer — never secret material, never surfaced in views. */
	credentialReference: string;
	id: string;
	mode: PaymentProviderMode;
	name: string;
	normalizedCode: string;
	organizationId: string;
	/** Materialization config, frozen onto transactions at initiation. */
	paymentAccountId: string;
	/** Must reference a method whose kind is "gateway". */
	paymentMethodId: string;
	/** Port registry key; Phase 2 ships only "fake". */
	providerKind: string;
	updatedAt: Date;
	updatedBy: string;
}

/** Public projection: credentialReference replaced by a presence flag. */
export type PaymentProviderView = Omit<PaymentProvider, "credentialReference"> & {
	hasCredentialReference: boolean;
};

export const PAYMENT_TRANSACTION_STATUSES = [
	"draft",
	"pending",
	"authorized",
	"partially_captured",
	"captured",
	"voided",
	"failed",
] as const;
export type PaymentTransactionStatus =
	(typeof PAYMENT_TRANSACTION_STATUSES)[number];

/** Frozen at initiation from the provider's config (spec §5.4). */
export interface PaymentMaterializationSnapshot {
	paymentAccountId: string;
	paymentMethodCode: string;
	paymentMethodId: string;
	paymentMethodKind: "gateway";
}

export interface PaymentTransaction {
	amount: string;
	capturedTotal: string;
	createdAt: Date;
	createdBy: string;
	currencyCode: string;
	fxContext: PaymentFxContext | null;
	id: string;
	materializationSnapshot: PaymentMaterializationSnapshot | null;
	organizationId: string;
	payLinkExpiresAt: Date | null;
	payLinkTokenHash: string | null;
	providerId: string;
	providerTransactionReference: string | null;
	refundedTotal: string;
	status: PaymentTransactionStatus;
	tokenId: string | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export const PROVIDER_FACT_SOURCES = ["api", "webhook"] as const;
export type ProviderFactSource = (typeof PROVIDER_FACT_SOURCES)[number];

/** Aggregate-owned capture fact — written only through transaction workflow. */
export interface PaymentTransactionCapture {
	amount: string;
	createdAt: Date;
	createdBy: string;
	currencyCode: string;
	id: string;
	organizationId: string;
	paymentId: string;
	providerCaptureReference: string;
	source: ProviderFactSource;
	transactionId: string;
}

/** Aggregate-owned refund fact — written only through transaction workflow. */
export interface PaymentTransactionRefund {
	amount: string;
	createdAt: Date;
	createdBy: string;
	currencyCode: string;
	id: string;
	occurredAt: Date;
	organizationId: string;
	providerRefundReference: string;
	source: ProviderFactSource;
	transactionId: string;
}

export interface PaymentToken {
	active: boolean;
	createdAt: Date;
	createdBy: string;
	displayHint: string;
	id: string;
	organizationId: string;
	payerReference: string;
	providerId: string;
	/** Provider-side token id only — no PAN, no credentials. */
	providerTokenReference: string;
	updatedAt: Date;
	updatedBy: string;
}

export const PAYMENT_PROVIDER_EVENT_STATUSES = [
	"received",
	"processed",
	"ignored",
	"failed",
] as const;
export type PaymentProviderEventStatus =
	(typeof PAYMENT_PROVIDER_EVENT_STATUSES)[number];

/** Immutable webhook audit row — never deleted; replays tracked as attempts. */
export interface PaymentProviderEvent {
	attemptCount: number;
	firstReceivedAt: Date;
	id: string;
	kind: string;
	lastAttemptedAt: Date;
	lastErrorCode: string | null;
	lastErrorMessage: string | null;
	organizationId: string;
	payloadFingerprint: string;
	processedAt: Date | null;
	providerEventId: string;
	providerId: string;
	status: PaymentProviderEventStatus;
	transactionId: string | null;
}
```

- [ ] **Step 2: Create `kernel/contracts/provider-port.ts`**

```ts
import type { Result } from "@afenda/errors";

import type { PaymentProviderMode } from "./domain";

/** Canonical system actor for webhook-driven facts (spec §5.2). */
export const PAYMENTS_WEBHOOK_ACTOR = "system:payment-provider-webhook" as const;

/**
 * Discriminated normalized webhook facts (spec §4.1) — a captured event
 * without amount/currency/capture identity is unrepresentable.
 */
export type NormalizedProviderEvent =
	| {
			providerEventId: string;
			kind: "authorized";
			transactionReference: string;
			occurredAt: string;
	  }
	| {
			providerEventId: string;
			kind: "captured";
			transactionReference: string;
			providerCaptureReference: string;
			amount: string;
			currencyCode: string;
			occurredAt: string;
	  }
	| {
			providerEventId: string;
			kind: "refunded";
			transactionReference: string;
			providerRefundReference: string;
			amount: string;
			currencyCode: string;
			occurredAt: string;
	  }
	| {
			providerEventId: string;
			kind: "voided" | "failed";
			transactionReference: string;
			occurredAt: string;
	  }
	| {
			providerEventId: string;
			kind: "unknown";
			transactionReference: string | null;
			occurredAt: string;
	  };

/**
 * The only surface through which provider behavior is reachable. Core never
 * imports provider SDKs. Remote calls happen OUTSIDE db transactions; every
 * call carries a stable externalIdempotencyKey (spec §5.1).
 */
export interface PaymentProviderPort {
	kind: string;
	createIntent(input: {
		credentialReference: string;
		mode: PaymentProviderMode;
		externalIdempotencyKey: string;
		amount: string;
		currencyCode: string;
		tokenReference: string | null;
	}): Promise<Result<{ providerTransactionReference: string }>>;
	capture(input: {
		credentialReference: string;
		mode: PaymentProviderMode;
		externalIdempotencyKey: string;
		providerTransactionReference: string;
		amount: string;
	}): Promise<Result<{ providerCaptureReference: string }>>;
	void(input: {
		credentialReference: string;
		mode: PaymentProviderMode;
		externalIdempotencyKey: string;
		providerTransactionReference: string;
	}): Promise<Result<void>>;
	refund(input: {
		credentialReference: string;
		mode: PaymentProviderMode;
		externalIdempotencyKey: string;
		providerTransactionReference: string;
		amount: string;
	}): Promise<Result<{ providerRefundReference: string }>>;
	verifyAndParseWebhook(input: {
		credentialReference: string;
		mode: PaymentProviderMode;
		rawBody: string;
		headers: Record<string, string>;
	}): Promise<Result<NormalizedProviderEvent>>;
}

export type PaymentProviderPortRegistry = ReadonlyMap<
	string,
	PaymentProviderPort
>;
```

- [ ] **Step 3: Create `kernel/contracts/security-port.ts`**

```ts
/** Injectable randomness/hash/clock so parity tests are deterministic (spec §4.2). */
export interface PaymentSecurityPort {
	/** base64url without padding. */
	generateOpaqueToken(byteLength: number): string;
	/** sha-256, hex. */
	hashOpaqueToken(token: string): string;
	now(): Date;
}
```

- [ ] **Step 4: Permissions and owners**

In `kernel/execution/permissions.ts` add (and append all six to `PAYMENTS_PERMISSION_CODES`):

```ts
export const PAYMENTS_PERMISSION_PROVIDER_MANAGE =
	"payments.provider.manage" as const;
export const PAYMENTS_PERMISSION_PROVIDER_READ =
	"payments.provider.read" as const;
export const PAYMENTS_PERMISSION_TRANSACTION_MANAGE =
	"payments.transaction.manage" as const;
export const PAYMENTS_PERMISSION_TRANSACTION_READ =
	"payments.transaction.read" as const;
export const PAYMENTS_PERMISSION_TOKEN_MANAGE = "payments.token.manage" as const;
export const PAYMENTS_PERMISSION_TOKEN_READ = "payments.token.read" as const;
```

In `kernel/operations/types.ts` add `"payment-providers"`, `"payment-transactions"`, `"payment-tokens"` to `PAYMENTS_OPERATION_OWNERS`.

- [ ] **Step 5: Typecheck and commit**

Run: `pnpm --filter @afenda/payments typecheck`
Expected: PASS (pure additions).

```bash
git add packages/erp/payments/src/kernel
git commit -m "feat(payments): gateway kernel contracts — provider port, security port, domain types, permissions"
```

---

### Task 2: Deterministic fakes — fake provider adapter and fake security port

**Files:**
- Create: `packages/erp/payments/src/testing/fake-provider.ts`
- Create: `packages/erp/payments/src/testing/fake-security.ts`
- Modify: `packages/erp/payments/src/testing/index.ts` (export both)
- Test: `packages/erp/payments/__tests__/fake-provider.test.ts` (create)

**Interfaces:**
- Consumes: `PaymentProviderPort`, `NormalizedProviderEvent`, `PaymentSecurityPort` (Task 1).
- Produces: `createFakeProviderPort(): PaymentProviderPort & { buildWebhook(event: NormalizedProviderEvent, credentialReference: string): { rawBody: string; headers: Record<string, string> } }`; `captureReferenceFor(externalIdempotencyKey: string): string`; `createFakeSecurityPort(seed?: string): PaymentSecurityPort`.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/fake-provider.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
	captureReferenceFor,
	createFakeProviderPort,
	createFakeSecurityPort,
} from "../src/testing";

const base = {
	credentialReference: "cred-1",
	mode: "test" as const,
};

describe("fake provider port", () => {
	it("is deterministic and idempotent per externalIdempotencyKey", async () => {
		const port = createFakeProviderPort();
		const a = await port.createIntent({
			...base,
			externalIdempotencyKey: "txn-1",
			amount: "100",
			currencyCode: "USD",
			tokenReference: null,
		});
		const b = await port.createIntent({
			...base,
			externalIdempotencyKey: "txn-1",
			amount: "100",
			currencyCode: "USD",
			tokenReference: null,
		});
		expect(a.ok && b.ok).toBe(true);
		if (a.ok && b.ok) {
			expect(a.data.providerTransactionReference).toBe(
				b.data.providerTransactionReference,
			);
		}
	});

	it("capture returns the same deterministic reference the webhook fixture carries", async () => {
		const port = createFakeProviderPort();
		const captured = await port.capture({
			...base,
			externalIdempotencyKey: "cap-1",
			providerTransactionReference: "fake-txn-txn-1",
			amount: "40",
		});
		expect(captured.ok).toBe(true);
		if (!captured.ok) return;
		expect(captured.data.providerCaptureReference).toBe(
			captureReferenceFor("cap-1"),
		);
	});

	it("verifies its own webhook signatures and rejects tampered bodies", async () => {
		const port = createFakeProviderPort();
		const event = {
			providerEventId: "evt-1",
			kind: "authorized",
			transactionReference: "fake-txn-txn-1",
			occurredAt: "2026-08-03T00:00:00.000Z",
		} as const;
		const webhook = port.buildWebhook(event, base.credentialReference);
		const ok = await port.verifyAndParseWebhook({ ...base, ...webhook });
		expect(ok.ok).toBe(true);
		if (ok.ok) expect(ok.data).toEqual(event);
		const tampered = await port.verifyAndParseWebhook({
			...base,
			rawBody: `${webhook.rawBody} `,
			headers: webhook.headers,
		});
		expect(tampered.ok).toBe(false);
	});
});

describe("fake security port", () => {
	it("generates deterministic tokens and stable hashes", () => {
		const security = createFakeSecurityPort("seed");
		const t1 = security.generateOpaqueToken(16);
		const t2 = security.generateOpaqueToken(16);
		expect(t1).not.toBe(t2); // sequence advances
		expect(createFakeSecurityPort("seed").generateOpaqueToken(16)).toBe(t1);
		expect(security.hashOpaqueToken("abc")).toBe(
			security.hashOpaqueToken("abc"),
		);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @afenda/payments test -- fake-provider`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Implement `fake-provider.ts`**

```ts
import { createHmac } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import type {
	NormalizedProviderEvent,
	PaymentProviderPort,
} from "../kernel/contracts/provider-port";

const SIGNATURE_HEADER = "x-fake-signature";

function sign(rawBody: string, credentialReference: string): string {
	return createHmac("sha256", credentialReference).update(rawBody).digest("hex");
}

/** Deterministic reference the capture result AND webhook fixtures share. */
export function captureReferenceFor(externalIdempotencyKey: string): string {
	return `fake-cap-${externalIdempotencyKey}`;
}

export function refundReferenceFor(externalIdempotencyKey: string): string {
	return `fake-ref-${externalIdempotencyKey}`;
}

export interface FakeProviderPort extends PaymentProviderPort {
	buildWebhook(
		event: NormalizedProviderEvent,
		credentialReference: string,
	): { rawBody: string; headers: Record<string, string> };
}

export function createFakeProviderPort(): FakeProviderPort {
	return {
		kind: "fake",
		createIntent(input) {
			return Promise.resolve(
				errorResult.ok({
					providerTransactionReference: `fake-txn-${input.externalIdempotencyKey}`,
				}),
			);
		},
		capture(input) {
			return Promise.resolve(
				errorResult.ok({
					providerCaptureReference: captureReferenceFor(
						input.externalIdempotencyKey,
					),
				}),
			);
		},
		void() {
			return Promise.resolve(errorResult.ok(undefined));
		},
		refund(input) {
			return Promise.resolve(
				errorResult.ok({
					providerRefundReference: refundReferenceFor(
						input.externalIdempotencyKey,
					),
				}),
			);
		},
		verifyAndParseWebhook(input): Promise<Result<NormalizedProviderEvent>> {
			const expected = sign(input.rawBody, input.credentialReference);
			if (input.headers[SIGNATURE_HEADER] !== expected) {
				return Promise.resolve(
					errorResult.fail("VALIDATION", {
						publicMessage: "Webhook signature verification failed",
					}),
				);
			}
			return Promise.resolve(
				errorResult.ok(JSON.parse(input.rawBody) as NormalizedProviderEvent),
			);
		},
		buildWebhook(event, credentialReference) {
			const rawBody = JSON.stringify(event);
			return {
				rawBody,
				headers: { [SIGNATURE_HEADER]: sign(rawBody, credentialReference) },
			};
		},
	};
}
```

- [ ] **Step 4: Implement `fake-security.ts`**

```ts
import { createHash } from "node:crypto";

import type { PaymentSecurityPort } from "../kernel/contracts/security-port";

/** Deterministic security port: seeded token sequence, real sha-256, fixed clock. */
export function createFakeSecurityPort(seed = "fake-seed"): PaymentSecurityPort {
	let counter = 0;
	return {
		generateOpaqueToken(byteLength: number): string {
			counter += 1;
			return createHash("sha256")
				.update(`${seed}:${counter}`)
				.digest()
				.subarray(0, byteLength)
				.toString("base64url");
		},
		hashOpaqueToken(token: string): string {
			return createHash("sha256").update(token).digest("hex");
		},
		now(): Date {
			return new Date("2026-08-03T12:00:00.000Z");
		},
	};
}
```

Export both from `src/testing/index.ts` (alongside `createMemoryPaymentsStore`). Do NOT export from the public `src/index.ts`.

- [ ] **Step 5: Run tests, commit**

Run: `pnpm --filter @afenda/payments test -- fake-provider`
Expected: PASS.

```bash
git add packages/erp/payments/src/testing packages/erp/payments/__tests__/fake-provider.test.ts
git commit -m "feat(payments): deterministic fake provider and security ports"
```

---

### Task 3: Database schema — six gateway tables, constraints, mutation ownership

**Files:**
- Modify: `packages/data-plane/db/src/schema/payments.ts`
- Modify: `packages/erp/payments/src/kernel/emissions/mutation-tables.ts`

**Interfaces:**
- Produces: drizzle tables `paymentProvider` (`payment_provider`), `paymentTransaction` (`payment_transaction`), `paymentTransactionCapture` (`payment_transaction_capture`), `paymentTransactionRefund` (`payment_transaction_refund`), `paymentToken` (`payment_token`), `paymentProviderEvent` (`payment_provider_event`). Task 10 drizzle slices consume these.

- [ ] **Step 1: Add the tables** (after `paymentReversal`; import `check` and `sql` from drizzle if not present — `check()` is already used in payroll/platform/sales schemas):

```ts
/** Org-scoped external processor config (gateway spec §3.1). */
export const paymentProvider = pgTable(
	"payment_provider",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		name: text("name").notNull(),
		providerKind: text("provider_kind").notNull(),
		/** test | live */
		mode: text("mode").notNull(),
		active: boolean("active").notNull().default(true),
		/** Opaque secret-store pointer — never secret material. */
		credentialReference: text("credential_reference").notNull(),
		paymentAccountId: uuid("payment_account_id")
			.notNull()
			.references(() => paymentAccount.id),
		paymentMethodId: uuid("payment_method_id")
			.notNull()
			.references(() => paymentMethod.id),
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
		index("payment_provider_org_id_idx").on(t.organizationId, t.id),
		uniqueIndex("payment_provider_org_normalized_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
		check("payment_provider_mode_check", sql`${t.mode} IN ('test', 'live')`),
	],
);

/** Online-payment intent (gateway spec §3.2). */
export const paymentTransaction = pgTable(
	"payment_transaction",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		providerId: uuid("provider_id")
			.notNull()
			.references(() => paymentProvider.id),
		/** draft | pending | authorized | partially_captured | captured | voided | failed */
		status: text("status").notNull().default("draft"),
		amount: text("amount").notNull(),
		currencyCode: text("currency_code").notNull(),
		/** PaymentFxContext JSON or null. */
		fxContext: text("fx_context"),
		providerTransactionReference: text("provider_transaction_reference"),
		tokenId: uuid("token_id").references(() => paymentToken.id),
		/** PaymentMaterializationSnapshot JSON — frozen at initiation; null while draft. */
		materializationSnapshot: text("materialization_snapshot"),
		payLinkTokenHash: text("pay_link_token_hash"),
		payLinkExpiresAt: timestamp("pay_link_expires_at", { withTimezone: true }),
		capturedTotal: text("captured_total").notNull().default("0"),
		refundedTotal: text("refunded_total").notNull().default("0"),
		version: integer("version").notNull().default(1),
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
		index("payment_transaction_org_provider_idx").on(
			t.organizationId,
			t.providerId,
		),
		uniqueIndex("payment_transaction_provider_reference_uidx")
			.on(t.providerId, t.providerTransactionReference)
			.where(sql`${t.providerTransactionReference} IS NOT NULL`),
		uniqueIndex("payment_transaction_pay_link_hash_uidx")
			.on(t.payLinkTokenHash)
			.where(sql`${t.payLinkTokenHash} IS NOT NULL`),
		check(
			"payment_transaction_status_check",
			sql`${t.status} IN ('draft', 'pending', 'authorized', 'partially_captured', 'captured', 'voided', 'failed')`,
		),
		check(
			"payment_transaction_pay_link_pair_check",
			sql`(${t.payLinkTokenHash} IS NULL) = (${t.payLinkExpiresAt} IS NULL)`,
		),
	],
);

/** Aggregate-owned capture fact (gateway spec §3.3) — no standalone operations. */
export const paymentTransactionCapture = pgTable(
	"payment_transaction_capture",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		transactionId: uuid("transaction_id")
			.notNull()
			.references(() => paymentTransaction.id),
		paymentId: uuid("payment_id")
			.notNull()
			.references(() => payment.id),
		amount: text("amount").notNull(),
		currencyCode: text("currency_code").notNull(),
		providerCaptureReference: text("provider_capture_reference").notNull(),
		/** api | webhook */
		source: text("source").notNull(),
		createdBy: text("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("payment_transaction_capture_org_txn_idx").on(
			t.organizationId,
			t.transactionId,
		),
		uniqueIndex("payment_transaction_capture_reference_uidx").on(
			t.transactionId,
			t.providerCaptureReference,
		),
		uniqueIndex("payment_transaction_capture_payment_uidx").on(
			t.transactionId,
			t.paymentId,
		),
		check(
			"payment_transaction_capture_source_check",
			sql`${t.source} IN ('api', 'webhook')`,
		),
	],
);

/** Aggregate-owned refund fact (gateway spec §3.3) — no standalone operations. */
export const paymentTransactionRefund = pgTable(
	"payment_transaction_refund",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		transactionId: uuid("transaction_id")
			.notNull()
			.references(() => paymentTransaction.id),
		amount: text("amount").notNull(),
		currencyCode: text("currency_code").notNull(),
		providerRefundReference: text("provider_refund_reference").notNull(),
		/** api | webhook */
		source: text("source").notNull(),
		occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
		createdBy: text("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("payment_transaction_refund_org_txn_idx").on(
			t.organizationId,
			t.transactionId,
		),
		uniqueIndex("payment_transaction_refund_reference_uidx").on(
			t.transactionId,
			t.providerRefundReference,
		),
		check(
			"payment_transaction_refund_source_check",
			sql`${t.source} IN ('api', 'webhook')`,
		),
	],
);

/** Saved tokenized instrument reference (gateway spec §3.4) — never PAN/credentials. */
export const paymentToken = pgTable(
	"payment_token",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		providerId: uuid("provider_id")
			.notNull()
			.references(() => paymentProvider.id),
		providerTokenReference: text("provider_token_reference").notNull(),
		displayHint: text("display_hint").notNull(),
		payerReference: text("payer_reference").notNull(),
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
		index("payment_token_org_provider_idx").on(t.organizationId, t.providerId),
		uniqueIndex("payment_token_provider_reference_uidx").on(
			t.providerId,
			t.providerTokenReference,
		),
	],
);

/** Immutable webhook audit row (gateway spec §5.6) — never deleted. */
export const paymentProviderEvent = pgTable(
	"payment_provider_event",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		providerId: uuid("provider_id")
			.notNull()
			.references(() => paymentProvider.id),
		providerEventId: text("provider_event_id").notNull(),
		payloadFingerprint: text("payload_fingerprint").notNull(),
		kind: text("kind").notNull(),
		transactionId: uuid("transaction_id").references(() => paymentTransaction.id),
		/** received | processed | ignored | failed */
		status: text("status").notNull().default("received"),
		attemptCount: integer("attempt_count").notNull().default(1),
		lastErrorCode: text("last_error_code"),
		lastErrorMessage: text("last_error_message"),
		firstReceivedAt: timestamp("first_received_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		lastAttemptedAt: timestamp("last_attempted_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		processedAt: timestamp("processed_at", { withTimezone: true }),
	},
	(t) => [
		index("payment_provider_event_org_provider_idx").on(
			t.organizationId,
			t.providerId,
		),
		uniqueIndex("payment_provider_event_provider_event_uidx").on(
			t.providerId,
			t.providerEventId,
		),
		check(
			"payment_provider_event_status_check",
			sql`${t.status} IN ('received', 'processed', 'ignored', 'failed')`,
		),
	],
);
```

Note: `paymentToken` must be declared BEFORE `paymentTransaction` in the file (the transaction references it). Order: `paymentProvider`, `paymentToken`, `paymentTransaction`, `paymentTransactionCapture`, `paymentTransactionRefund`, `paymentProviderEvent`.

- [ ] **Step 2: Declare table ownership**

In `packages/erp/payments/src/kernel/emissions/mutation-tables.ts`, add `"payment_provider"`, `"payment_transaction"`, `"payment_transaction_capture"`, `"payment_transaction_refund"`, `"payment_token"`, `"payment_provider_event"` to BOTH `PAYMENTS_AGGREGATES` and `PAYMENTS_MUTATION_TABLES` (module precedent: aggregate-owned children like `payment_allocation`/`payment_deduction` appear in both; aggregate-only mutation is enforced by exposing no standalone operations).

- [ ] **Step 3: Generate the migration and typecheck**

Run: `pnpm db:generate` then `pnpm --filter @afenda/db typecheck`
Expected: new migration under `packages/data-plane/db/drizzle/`; typecheck PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/data-plane/db packages/erp/payments/src/kernel/emissions/mutation-tables.ts
git commit -m "feat(db): gateway tables — provider, transaction, capture/refund facts, token, provider event"
```

---

### Task 4: `payment-providers` feature (schema, store, memory, operations, registry)

**Files:**
- Create: `packages/erp/payments/src/features/payment-providers/providers.schema.ts`
- Create: `packages/erp/payments/src/features/payment-providers/providers.store.ts`
- Create: `packages/erp/payments/src/features/payment-providers/providers.memory.ts`
- Create: `packages/erp/payments/src/features/payment-providers/providers.operations.ts`
- Create: `packages/erp/payments/src/features/payment-providers/operation-registry.ts`
- Test: `packages/erp/payments/__tests__/payment-providers.test.ts` (create)

**Interfaces:**
- Consumes: Task 1 types; `code`, `mutation`, `identity`, `uuid` from `kernel/validation/common.schema`; `parsePaymentsInput`, `normalizedCode`; `requirePaymentsPermission`; `PaymentMethodsStore.getPaymentMethodById`; `PaymentAccountsStore.getPaymentAccountById`.
- Produces:
  - `PaymentProvidersStore`: `createPaymentProvider(record: Omit<PaymentProvider, "id" | "createdAt" | "updatedAt">): Promise<Result<PaymentProvider>>`; `updatePaymentProvider(record: { organizationId: string; id: string; name?: string; credentialReference?: string; paymentAccountId?: string; paymentMethodId?: string; active?: boolean; updatedBy: string }): Promise<Result<PaymentProvider>>`; `getPaymentProviderById(organizationId: string, id: string): Promise<Result<PaymentProvider | null>>`; `getPaymentProviderForWebhook(id: string): Promise<Result<PaymentProvider | null>>` (no org filter — webhook derives org FROM the provider); `listPaymentProviders(organizationId: string): Promise<Result<PaymentProvider[]>>`
  - `toPaymentProviderView(provider: PaymentProvider): PaymentProviderView` — strips `credentialReference`, adds `hasCredentialReference`
  - Operations returning **views**: `createPaymentProviderOperation`, `updatePaymentProviderOperation`, `deactivatePaymentProviderOperation`, `listPaymentProvidersOperation` — deps `PaymentProvidersOperationDeps = { authorization?; store: PaymentProvidersStore & PaymentMethodsStore & PaymentAccountsStore; ports: PaymentProviderPortRegistry }`
  - Registries: `PAYMENTS_PROVIDER_COMMANDS` (ids `payments.provider.create|update|deactivate`), `PAYMENTS_PROVIDER_QUERIES` (id `payments.provider.list`)

- [ ] **Step 1: Write the failing tests**

Create `__tests__/payment-providers.test.ts`. Seed pattern: memory store (`createMemoryPaymentsStore()` — extended in Task 8's composition step; until then construct the provider memory slice directly the way `payment-methods.test.ts` drives its slice):

```ts
import { describe, expect, it } from "vitest";

import type {
	PaymentAccount,
	PaymentMethod,
	PaymentProvider,
} from "../src/kernel/contracts/domain";
import { createMemoryPaymentAccountMethods } from "../src/features/payment-accounts/accounts.memory";
import { createMemoryPaymentMethodMethods } from "../src/features/payment-methods/methods.memory";
import { createMemoryPaymentProviderMethods } from "../src/features/payment-providers/providers.memory";
import {
	createPaymentProviderOperation,
	deactivatePaymentProviderOperation,
	listPaymentProvidersOperation,
	updatePaymentProviderOperation,
} from "../src/features/payment-providers/providers.operations";
import { createFakeProviderPort } from "../src/testing";

const organizationId = "org-1";
const actorUserId = "user-1";
const authorization = {
	can() {
		return Promise.resolve(true);
	},
};

async function makeDeps() {
	const state = {
		accounts: new Map<string, PaymentAccount>(),
		methods: new Map<string, PaymentMethod>(),
		providers: new Map<string, PaymentProvider>(),
	};
	const accounts = createMemoryPaymentAccountMethods(state);
	const methods = createMemoryPaymentMethodMethods(state);
	const providers = createMemoryPaymentProviderMethods(state);
	const store = { ...accounts, ...methods, ...providers };
	const account = await accounts.createPaymentAccount({
		organizationId,
		code: "GW",
		normalizedCode: "gw",
		name: "Gateway account",
		kind: "gateway",
		currencyCode: "USD",
		active: true,
		createdBy: actorUserId,
		updatedBy: actorUserId,
	});
	if (!account.ok) throw new Error("account seed failed");
	const method = await methods.createPaymentMethod({
		organizationId,
		code: "gateway",
		normalizedCode: "gateway",
		name: "Gateway",
		kind: "gateway",
		instrumentRequirement: "optional",
		allowedInstrumentKinds: ["gateway"],
		allowedAccountKinds: ["gateway"],
		active: true,
		createdBy: actorUserId,
		updatedBy: actorUserId,
	});
	if (!method.ok) throw new Error("method seed failed");
	return {
		deps: {
			authorization,
			store,
			ports: new Map([["fake", createFakeProviderPort()]]),
		},
		accountId: account.data.id,
		methodId: method.data.id,
	};
}

const base = {
	organizationId,
	actorUserId,
	correlationId: "corr-1",
	idempotencyKey: "prov-1",
};

describe("payment providers", () => {
	it("creates, updates, deactivates, lists — and never exposes credentialReference", async () => {
		const { deps, accountId, methodId } = await makeDeps();
		const created = await createPaymentProviderOperation(
			{
				...base,
				code: "FAKE",
				name: "Fake provider",
				providerKind: "fake",
				mode: "test",
				credentialReference: "secret-ref://fake/1",
				paymentAccountId: accountId,
				paymentMethodId: methodId,
			},
			deps,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;
		expect("credentialReference" in created.data).toBe(false);
		expect(created.data.hasCredentialReference).toBe(true);

		const updated = await updatePaymentProviderOperation(
			{ ...base, idempotencyKey: "prov-upd", id: created.data.id, name: "Fake 2" },
			deps,
		);
		expect(updated.ok && updated.data.name === "Fake 2").toBe(true);

		const listed = await listPaymentProvidersOperation(
			{ organizationId, actorUserId },
			deps,
		);
		expect(listed.ok && listed.data.length === 1).toBe(true);
		if (listed.ok) {
			expect("credentialReference" in listed.data[0]).toBe(false);
		}

		const off = await deactivatePaymentProviderOperation(
			{ ...base, idempotencyKey: "prov-off", id: created.data.id },
			deps,
		);
		expect(off.ok && off.data.active === false).toBe(true);
	});

	it("rejects unknown provider kinds and non-gateway payment methods", async () => {
		const { deps, accountId, methodId } = await makeDeps();
		const unknownKind = await createPaymentProviderOperation(
			{
				...base,
				code: "X",
				name: "X",
				providerKind: "stripe",
				mode: "test",
				credentialReference: "ref",
				paymentAccountId: accountId,
				paymentMethodId: methodId,
			},
			deps,
		);
		expect(unknownKind.ok).toBe(false);

		const wire = await deps.store.createPaymentMethod({
			organizationId,
			code: "wire",
			normalizedCode: "wire",
			name: "Wire",
			kind: "wire",
			instrumentRequirement: "optional",
			allowedInstrumentKinds: ["bank-transfer"],
			allowedAccountKinds: ["bank"],
			active: true,
			createdBy: actorUserId,
			updatedBy: actorUserId,
		});
		if (!wire.ok) throw new Error("seed failed");
		const nonGateway = await createPaymentProviderOperation(
			{
				...base,
				idempotencyKey: "prov-2",
				code: "Y",
				name: "Y",
				providerKind: "fake",
				mode: "test",
				credentialReference: "ref",
				paymentAccountId: accountId,
				paymentMethodId: wire.data.id,
			},
			deps,
		);
		expect(nonGateway.ok).toBe(false);
	});

	it("rejects duplicate codes per organization", async () => {
		const { deps, accountId, methodId } = await makeDeps();
		const input = {
			...base,
			code: "FAKE",
			name: "Fake",
			providerKind: "fake",
			mode: "test",
			credentialReference: "ref",
			paymentAccountId: accountId,
			paymentMethodId: methodId,
		};
		expect((await createPaymentProviderOperation(input, deps)).ok).toBe(true);
		const dup = await createPaymentProviderOperation(
			{ ...input, idempotencyKey: "prov-2" },
			deps,
		);
		expect(dup.ok).toBe(false);
	});
});
```

Note: `getPaymentAccountById` exists on `PaymentAccountsStore` since Phase 1 Task 6. `createPaymentAccount` store-record shape: mirror the fields used in `accounts.memory.ts` (read it before writing the test; adjust the seed literal to the actual `Omit<PaymentAccount, ...>` shape).

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @afenda/payments test -- payment-providers`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Implement the feature**

`providers.schema.ts`:

```ts
import { z } from "zod";

import { PAYMENT_PROVIDER_MODES } from "../../kernel/contracts/domain";
import {
	code,
	identity,
	mutation,
	uuid,
} from "../../kernel/validation/common.schema";

export const createPaymentProviderInputSchema = z.object({
	...mutation,
	code,
	name: z.string().trim().min(1).max(128),
	providerKind: z.string().trim().min(1).max(64),
	mode: z.enum(PAYMENT_PROVIDER_MODES),
	credentialReference: z.string().trim().min(1).max(256),
	paymentAccountId: uuid,
	paymentMethodId: uuid,
	active: z.boolean().optional(),
});

export const updatePaymentProviderInputSchema = z.object({
	...mutation,
	id: uuid,
	name: z.string().trim().min(1).max(128).optional(),
	credentialReference: z.string().trim().min(1).max(256).optional(),
	paymentAccountId: uuid.optional(),
	paymentMethodId: uuid.optional(),
});

export const deactivatePaymentProviderInputSchema = z.object({
	...mutation,
	id: uuid,
});

export const listPaymentProvidersInputSchema = z.object({ ...identity });
```

`providers.store.ts` — exactly the `PaymentProvidersStore` interface from the Interfaces block.

`providers.memory.ts` — clone `methods.memory.ts` exactly (same `resolveOperation`, CONFLICT on duplicate `organizationId`+`normalizedCode`, `randomUUID()`, `{ ...record }` copies, NOT_FOUND on missing/foreign-org update). State interface `PaymentProvidersMemoryState { providers: Map<string, PaymentProvider> }`. `getPaymentProviderForWebhook(id)` returns the provider by id with NO organization filter (or null).

`providers.operations.ts` — clone `methods.operations.ts` shape. `PaymentProvidersOperationDeps = { authorization?: PaymentsAuthorizationPort | undefined; store: PaymentProvidersStore & PaymentMethodsStore & PaymentAccountsStore; ports: PaymentProviderPortRegistry }`. Validation in `createPaymentProviderOperation` (and for changed fields in update), after permission `payments.provider.manage`:

```ts
	if (!deps.ports.has(data.providerKind)) {
		return errorResult.fail("VALIDATION", {
			publicMessage: "Unknown payment provider kind",
		});
	}
	const method = await deps.store.getPaymentMethodById(
		data.organizationId,
		data.paymentMethodId,
	);
	if (!method.ok) {
		return method;
	}
	if (method.data === null || method.data.kind !== "gateway") {
		return errorResult.fail("VALIDATION", {
			publicMessage: "Provider payment method must be an active gateway-kind method",
		});
	}
	const account = await deps.store.getPaymentAccountById(
		data.organizationId,
		data.paymentAccountId,
	);
	if (!account.ok) {
		return account;
	}
	if (account.data === null) {
		return errorResult.fail("VALIDATION", {
			publicMessage: "Provider payment account not found",
		});
	}
```

All four operations map store results through `toPaymentProviderView` before returning (define the helper in `providers.operations.ts` and export it):

```ts
export function toPaymentProviderView(
	provider: PaymentProvider,
): PaymentProviderView {
	const { credentialReference, ...rest } = provider;
	return { ...rest, hasCredentialReference: credentialReference.length > 0 };
}
```

`operation-registry.ts` — clone `payment-methods/operation-registry.ts` with `OWNER = "payment-providers"`, commands `createPaymentProvider`/`updatePaymentProvider`/`deactivatePaymentProvider` (ids `payments.provider.create|update|deactivate`, permission `PAYMENTS_PERMISSION_PROVIDER_MANAGE`), query `listPaymentProviders` (id `payments.provider.list`, permission `PAYMENTS_PERMISSION_PROVIDER_READ`).

- [ ] **Step 4: Run tests, commit**

Run: `pnpm --filter @afenda/payments test -- payment-providers`
Expected: PASS.

```bash
git add packages/erp/payments/src/features/payment-providers packages/erp/payments/__tests__/payment-providers.test.ts
git commit -m "feat(payments): payment-providers feature with credential projection"
```

---

### Task 5: `payment-tokens` feature

**Files:**
- Create: `packages/erp/payments/src/features/payment-tokens/tokens.schema.ts`
- Create: `packages/erp/payments/src/features/payment-tokens/tokens.store.ts`
- Create: `packages/erp/payments/src/features/payment-tokens/tokens.memory.ts`
- Create: `packages/erp/payments/src/features/payment-tokens/tokens.operations.ts`
- Create: `packages/erp/payments/src/features/payment-tokens/operation-registry.ts`
- Test: `packages/erp/payments/__tests__/payment-tokens.test.ts` (create)

**Interfaces:**
- Consumes: Task 1 `PaymentToken`; Task 4 `PaymentProvidersStore.getPaymentProviderById`.
- Produces:
  - `PaymentTokensStore`: `createPaymentToken(record: Omit<PaymentToken, "id" | "createdAt" | "updatedAt">): Promise<Result<PaymentToken>>` (CONFLICT on duplicate `providerId`+`providerTokenReference`); `updatePaymentToken(record: { organizationId: string; id: string; active?: boolean; updatedBy: string }): Promise<Result<PaymentToken>>`; `getPaymentTokenById(organizationId: string, id: string): Promise<Result<PaymentToken | null>>`; `listPaymentTokens(organizationId: string, providerId?: string): Promise<Result<PaymentToken[]>>`
  - Operations: `createPaymentTokenOperation`, `deactivatePaymentTokenOperation`, `listPaymentTokensOperation` — deps `{ authorization?; store: PaymentTokensStore & PaymentProvidersStore }`
  - Registries: `PAYMENTS_TOKEN_COMMANDS` (ids `payments.token.create|deactivate`, permission `PAYMENTS_PERMISSION_TOKEN_MANAGE`), `PAYMENTS_TOKEN_QUERIES` (id `payments.token.list`, permission `PAYMENTS_PERMISSION_TOKEN_READ`)

- [ ] **Step 1: Write the failing tests** — mirror the payment-providers test structure. Cases:
  1. create + list + deactivate round-trip;
  2. create rejects an inactive or missing provider (`store.getPaymentProviderById` → null / `active === false` → VALIDATION);
  3. duplicate `(providerId, providerTokenReference)` → CONFLICT;
  4. `displayHint` max length 32, `payerReference` required (schema rejection).

Schema fields for create: `{ ...mutation, providerId: uuid, providerTokenReference: z.string().trim().min(1).max(256), displayHint: z.string().trim().min(1).max(32), payerReference: z.string().trim().min(1).max(128) }`; deactivate `{ ...mutation, id: uuid }`; list `{ ...identity, providerId: uuid.optional() }`.

- [ ] **Step 2: Run to verify FAIL** (`pnpm --filter @afenda/payments test -- payment-tokens`), **Step 3: implement** (clone the providers feature exactly — memory slice state `{ tokens: Map<string, PaymentToken> }`), **Step 4: run to verify PASS**.

- [ ] **Step 5: Commit**

```bash
git add packages/erp/payments/src/features/payment-tokens packages/erp/payments/__tests__/payment-tokens.test.ts
git commit -m "feat(payments): payment-tokens feature with provider-scoped uniqueness"
```

---

### Task 6: `payment-transactions` — contracts, schema, memory store with fact idempotency and materialization seam

**Files:**
- Create: `packages/erp/payments/src/features/payment-transactions/transactions.schema.ts`
- Create: `packages/erp/payments/src/features/payment-transactions/transactions.store.ts`
- Create: `packages/erp/payments/src/features/payment-transactions/transactions.memory.ts`
- Test: `packages/erp/payments/__tests__/payment-transactions.store.test.ts` (create)

**Interfaces:**
- Consumes: Task 1 types; `PaymentsLifecycleStore` (`createDraft`, `post`), `PaymentMethodsStore`, `PaymentAccountsStore`; `decimal`/`formatDecimal` from `kernel/money.ts`.
- Produces (`transactions.store.ts`):

```ts
export interface CaptureFactRecord {
	actorUserId: string;
	amount: string;
	correlationId: string;
	currencyCode: string;
	idempotencyKey: string;
	organizationId: string;
	providerCaptureReference: string;
	/** When webhook-driven: the payment_provider_event row to mark processed atomically. */
	providerEventRowId: string | null;
	source: ProviderFactSource;
	transactionId: string;
}

export interface RefundFactRecord {
	actorUserId: string;
	amount: string;
	correlationId: string;
	currencyCode: string;
	idempotencyKey: string;
	occurredAt: Date;
	organizationId: string;
	providerEventRowId: string | null;
	providerRefundReference: string;
	source: ProviderFactSource;
	transactionId: string;
}

export interface PaymentTransactionsStore {
	applyAuthorizedFact(record: {
		organizationId: string; transactionId: string;
		actorUserId: string; correlationId: string; idempotencyKey: string;
		providerEventRowId: string | null;
	}): Promise<Result<PaymentTransaction>>;
	applyCaptureFact(record: CaptureFactRecord): Promise<
		Result<{
			capture: PaymentTransactionCapture;
			payment: Payment;
			replayed: boolean;
			transaction: PaymentTransaction;
		}>
	>;
	applyFailedFact(record: {
		organizationId: string; transactionId: string;
		actorUserId: string; correlationId: string; idempotencyKey: string;
		providerEventRowId: string | null;
	}): Promise<Result<PaymentTransaction>>;
	applyRefundFact(record: RefundFactRecord): Promise<
		Result<{
			refund: PaymentTransactionRefund;
			replayed: boolean;
			transaction: PaymentTransaction;
		}>
	>;
	applyVoidedFact(record: {
		organizationId: string; transactionId: string;
		actorUserId: string; correlationId: string; idempotencyKey: string;
		providerEventRowId: string | null;
	}): Promise<Result<PaymentTransaction>>;
	createTransaction(record: {
		organizationId: string; providerId: string; amount: string;
		currencyCode: string; fxContext: PaymentFxContext | null;
		tokenId: string | null; actorUserId: string; correlationId: string;
		idempotencyKey: string;
	}): Promise<Result<PaymentTransaction>>;
	getProviderEvent(
		providerId: string,
		providerEventId: string,
	): Promise<Result<PaymentProviderEvent | null>>;
	getTransactionById(
		organizationId: string,
		id: string,
	): Promise<Result<PaymentTransaction | null>>;
	getTransactionByProviderReference(
		providerId: string,
		providerTransactionReference: string,
	): Promise<Result<PaymentTransaction | null>>;
	initiateTransaction(record: {
		organizationId: string; transactionId: string; expectedVersion: number;
		providerTransactionReference: string;
		materializationSnapshot: PaymentMaterializationSnapshot;
		payLinkTokenHash: string | null; payLinkExpiresAt: Date | null;
		actorUserId: string; correlationId: string; idempotencyKey: string;
	}): Promise<Result<PaymentTransaction>>;
	listTransactions(filter: {
		organizationId: string;
		providerId?: string | undefined;
		status?: PaymentTransactionStatus | undefined;
	}): Promise<Result<PaymentTransaction[]>>;
	recordProviderEvent(record: {
		organizationId: string; providerId: string; providerEventId: string;
		payloadFingerprint: string; kind: string; receivedAt: Date;
	}): Promise<Result<{ event: PaymentProviderEvent; duplicate: boolean }>>;
	resolvePayLinkByHash(tokenHash: string, now: Date): Promise<
		Result<{
			amount: string; currencyCode: string; expiresAt: Date;
			providerKind: string; status: PaymentTransactionStatus;
		} | null>
	>;
	updateProviderEventOutcome(record: {
		id: string; status: "processed" | "ignored" | "failed";
		transactionId: string | null; lastErrorCode: string | null;
		lastErrorMessage: string | null; attemptedAt: Date;
	}): Promise<Result<PaymentProviderEvent>>;
}
```

- Memory factory: `createMemoryPaymentTransactionMethods(state, lifecycle: PaymentsLifecycleStore): PaymentTransactionsStore` — the lifecycle slice is passed in so `applyCaptureFact` materializes the Payment through canonical create+post logic, not raw map writes. Memory state adds: `providers: Map<string, PaymentProvider>`, `transactions: Map<string, PaymentTransaction>`, `transactionCaptures: Map<string, PaymentTransactionCapture>`, `transactionRefunds: Map<string, PaymentTransactionRefund>`, `tokens: Map<string, PaymentToken>`, `providerEvents: Map<string, PaymentProviderEvent>`.

- [ ] **Step 1: Write the failing store tests**

`__tests__/payment-transactions.store.test.ts` — drive the memory store directly (operations land in Task 7). Build a helper that seeds org + gateway account + gateway method + provider + a pending transaction (create then initiate with snapshot `{ paymentAccountId, paymentMethodId, paymentMethodCode: "gateway", paymentMethodKind: "gateway" }`, then `applyAuthorizedFact`). Assert:

```ts
	it("applyCaptureFact materializes exactly one posted Payment and is idempotent by reference", async () => {
		// capture 40 of 100 → status "partially_captured", capturedTotal "40",
		// result.payment.status === "posted",
		// result.payment.instrument === { kind: "gateway", providerReference: <txn ref> },
		// result.payment.methodSnapshot.kind === "gateway", replayed === false
		// replay same providerCaptureReference (source "webhook", new idempotencyKey):
		//   replayed === true, same payment id, capturedTotal STILL "40",
		//   transaction.version unchanged from first capture
		// capture remaining 60 with a new reference → status "captured", capturedTotal "100"
	});

	it("rejects over-capture, wrong currency, and capture on non-authorized states", async () => {
		// capture 120 of 100 → VALIDATION; currency "EUR" on USD txn → VALIDATION;
		// capture while status "pending" → CONFLICT
	});

	it("void only before any capture; failed unreachable after capture", async () => {
		// authorized + zero captures → applyVoidedFact ok → status "voided"
		// after a capture: applyVoidedFact → CONFLICT, applyFailedFact → CONFLICT
	});

	it("applyRefundFact requires captured cover and is idempotent by reference", async () => {
		// refund 30 after capturing 40 → ok, refundedTotal "30", status unchanged
		// replay same providerRefundReference → replayed === true, refundedTotal "30"
		// refund 20 more (only 10 capturable remains) → VALIDATION
	});

	it("recordProviderEvent dedupes by (providerId, providerEventId)", async () => {
		// first insert → duplicate === false, status "received", attemptCount 1
		// second identical insert → duplicate === true, same row id
	});
```

Write these as full tests with real literals, mirroring the seeding style above.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter @afenda/payments test -- payment-transactions.store`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Implement `transactions.memory.ts`**

Follow `lifecycle.memory.ts` conventions (`resolveOperation`, `find`-style org-scoped lookup, `{ ...record }` copies, mutationKeys idempotency map keyed `` `txn:${idempotencyKey}` `` → resource id). Rules:

- `createTransaction`: status `draft`, totals `"0"`, version 1.
- `initiateTransaction`: requires status `draft` and matching `expectedVersion` (else CONFLICT); sets reference, snapshot, optional pay-link fields; status `pending`; version +1.
- `applyAuthorizedFact`: requires `pending` (else caller decides ignore/stale — the STORE returns CONFLICT with `publicMessage: "Transaction is not pending"`; the webhook operation maps stale cases to `ignored`, Task 8); status `authorized`; version +1.
- `applyCaptureFact` — validate-then-mutate so any failure leaves state untouched (memory is synchronous; do ALL validation before the first map write):
  1. find transaction (org-scoped) else NOT_FOUND;
  2. existing capture with same `(transactionId, providerCaptureReference)` → return `{ replayed: true, capture, payment, transaction }` reading the payment via `lifecycle.getById` — NO mutation, NO version bump;
  3. status must be `authorized` or `partially_captured` else CONFLICT; currency must equal transaction currency and amount strictly positive and `decimal(capturedTotal) + decimal(amount) <= decimal(transaction.amount)` else VALIDATION; `materializationSnapshot` must be non-null else CONFLICT;
  4. materialize: `lifecycle.createDraft({...})` with `paymentAccountId`/`paymentMethodId` from the snapshot, `direction: "outgoing" → NO:` use the transaction's economic direction — a captured customer payment is money IN: `direction: "incoming"`, `purpose: "settlement"` (check `PaymentCreateRecord` required fields in `lifecycle.store.ts` and fill each: `code`/`normalizedCode` derive as `` `txn-${transaction.id}-cap-${providerCaptureReference}` `` normalized, `counterpartyId: null`, `counterpartySnapshot: null`, `transferGroupId: null`, `linkedPaymentId: null`, `originalPaymentId: null`, `refundSource: null`, `reference: providerCaptureReference`, `instrument: { kind: "gateway", providerReference: transaction.providerTransactionReference }`, `fxContext: transaction.fxContext`, `functionalAmount` via `deriveFunctionalAmount(amount, transaction.fxContext)`, `deductions: []`, `methodSnapshot: null`, amount = capture amount, currency = transaction currency, actor/correlation from the record, `idempotencyKey: `${record.idempotencyKey}:payment``); then `lifecycle.post({...})` with `methodSnapshot: { paymentMethodId: snapshot.paymentMethodId, code: snapshot.paymentMethodCode, kind: "gateway" }` and the draft's version;
  5. write the capture row, update `capturedTotal`, set status `captured` when totals equal else `partially_captured`, version +1;
  6. when `providerEventRowId` non-null: set that event row `status: "processed"`, `transactionId`, `processedAt` — same synchronous section.
  If `PaymentCreateRecord` field names differ from the list above, read `lifecycle.store.ts` and `domain.ts` and match exactly — do not guess.
- `applyRefundFact`: replay check by `(transactionId, providerRefundReference)`; requires status `partially_captured` or `captured`; `decimal(refundedTotal) + decimal(amount) <= decimal(capturedTotal)` else VALIDATION; writes refund row + `refundedTotal`; status unchanged; version +1; event-row handling as above.
- `applyVoidedFact` / `applyFailedFact`: require status `pending` or `authorized` AND `capturedTotal === "0"` else CONFLICT; set terminal status; version +1.
- `resolvePayLinkByHash`: match hash; return null when no match, expired (`expiresAt < now`), or status !== `pending` — indistinguishable.
- `recordProviderEvent` / `getProviderEvent` / `updateProviderEventOutcome`: straightforward map ops; `updateProviderEventOutcome` bumps `attemptCount` only when transitioning from `failed` back through a retry (set `attemptCount + 1` when the row already existed with status `failed`); `lastAttemptedAt` always updated.

`transactions.schema.ts` — zod input schemas used by Task 7 (write now, exports only):

```ts
import { z } from "zod";

import {
	currencyCode,
	identity,
	money,
	mutation,
	uuid,
} from "../../kernel/validation/common.schema";
import { fxContextSchema } from "../payment-lifecycle/lifecycle.schema";

export const createPaymentTransactionInputSchema = z.object({
	...mutation,
	providerId: uuid,
	amount: money,
	currencyCode,
	fxContext: fxContextSchema.nullable().optional(),
	tokenId: uuid.nullable().optional(),
});

export const initiatePaymentTransactionInputSchema = z.object({
	...mutation,
	transactionId: uuid,
	expectedVersion: z.number().int().positive(),
	generatePayLink: z.boolean().optional(),
	/** Days until expiry, 1–30 (spec §5.7); default 7. */
	payLinkExpiryDays: z.number().int().min(1).max(30).optional(),
});

export const capturePaymentTransactionInputSchema = z.object({
	...mutation,
	transactionId: uuid,
	amount: money,
});

export const voidPaymentTransactionInputSchema = z.object({
	...mutation,
	transactionId: uuid,
});

export const refundPaymentTransactionInputSchema = z.object({
	...mutation,
	transactionId: uuid,
	amount: money,
});

export const getPaymentTransactionInputSchema = z.object({
	...identity,
	transactionId: uuid,
});

export const listPaymentTransactionsInputSchema = z.object({
	...identity,
	providerId: uuid.optional(),
	status: z
		.enum([
			"draft",
			"pending",
			"authorized",
			"partially_captured",
			"captured",
			"voided",
			"failed",
		])
		.optional(),
});

export const ingestProviderWebhookInputSchema = z.object({
	providerId: uuid,
	rawBody: z.string().min(1),
	headers: z.record(z.string(), z.string()),
});

export const resolvePayLinkInputSchema = z.object({
	token: z.string().trim().min(1).max(128),
});
```

(Verify `fxContextSchema` is exported from `lifecycle.schema.ts`; Phase 1 Task 6 defined it there. If unexported, export it.)

- [ ] **Step 4: Run tests, commit**

Run: `pnpm --filter @afenda/payments test -- payment-transactions.store`
Expected: PASS.

```bash
git add packages/erp/payments/src/features/payment-transactions packages/erp/payments/__tests__/payment-transactions.store.test.ts
git commit -m "feat(payments): transaction store with capture/refund fact idempotency and payment materialization seam"
```

---

### Task 7: Transaction operations — create, initiate, API capture/void/refund, queries

**Files:**
- Create: `packages/erp/payments/src/features/payment-transactions/transactions.operations.ts`
- Create: `packages/erp/payments/src/features/payment-transactions/operation-registry.ts`
- Test: `packages/erp/payments/__tests__/payment-transactions.operations.test.ts` (create)

**Interfaces:**
- Consumes: Task 6 store + schemas; Task 4 providers store; Task 5 tokens store; Task 1 ports; `PAYMENTS_WEBHOOK_ACTOR` not needed here (API path uses command actor).
- Produces: `PaymentTransactionsOperationDeps = { authorization?: PaymentsAuthorizationPort | undefined; store: PaymentTransactionsStore & PaymentProvidersStore & PaymentTokensStore & PaymentMethodsStore & PaymentAccountsStore & PaymentsLifecycleStore; ports: PaymentProviderPortRegistry; security: PaymentSecurityPort }`; operations `createPaymentTransactionOperation`, `initiatePaymentTransactionOperation` (returns `Result<{ transaction: PaymentTransaction; payLinkToken: string | null }>` — the raw token surfaces ONCE here), `capturePaymentTransactionOperation`, `voidPaymentTransactionOperation`, `refundPaymentTransactionOperation`, `getPaymentTransactionByIdOperation`, `listPaymentTransactionsOperation`; registries `PAYMENTS_TRANSACTION_COMMANDS` (ids `payments.transaction.create|initiate|capture|void|refund`, permission `PAYMENTS_PERMISSION_TRANSACTION_MANAGE`), `PAYMENTS_TRANSACTION_QUERIES` (ids `payments.transaction.get|list`, permission `PAYMENTS_PERMISSION_TRANSACTION_READ`).

- [ ] **Step 1: Write the failing tests** — full operation-level flows with memory slices + fake ports + fake security. Cases:
  1. create (validates provider active; token same org/provider/active/payer — token rejection cases: foreign provider token, inactive token);
  2. initiate freezes the snapshot from provider config, then MUTATE the provider (`updatePaymentProvider` to a different account) and verify a later capture still materializes through the frozen account (assert `payment.paymentAccountId` equals the ORIGINAL account id);
  3. initiate with `generatePayLink: true` returns a raw token once and stores only its hash (assert `transaction.payLinkTokenHash === security.hashOpaqueToken(payLinkToken)`, expiry = `security.now()` + 7 days);
  4. API capture: authorization must first arrive (drive `applyAuthorizedFact` via a webhook in Task 8; here call the store's `applyAuthorizedFact` directly to arrange) → capture succeeds → the SAME fake capture reference replayed via a second `capturePaymentTransactionOperation` call with a **new** command idempotencyKey but same amount produces `replayed` result and no second Payment (fake port returns the same reference for the same `externalIdempotencyKey` — pass the command idempotencyKey as `externalIdempotencyKey`, so an exact command retry converges; a different idempotencyKey is a NEW capture by design);
  5. void/refund happy paths + guard rejections (void after capture → CONFLICT).

- [ ] **Step 2: Run to verify FAIL** (`pnpm --filter @afenda/payments test -- payment-transactions.operations`).

- [ ] **Step 3: Implement operations.** Pattern per operation: `parsePaymentsInput` → `requirePaymentsPermission(deps.authorization, { ..., permission: "payments.transaction.manage" })` → guards → store/port calls. Key sequences:

`createPaymentTransactionOperation`: resolve provider (org-scoped, active else VALIDATION); when `tokenId` present resolve token and enforce spec §3.4 rules (same org implied by org-scoped lookup; `token.providerId === provider.id`; `token.active`; payer matching is deferred — transactions carry no payer field in Phase 2, so the payer rule reduces to provider/org/active) — then `store.createTransaction`.

`initiatePaymentTransactionOperation`:

```ts
	const provider = await deps.store.getPaymentProviderById(
		data.organizationId,
		transaction.providerId,
	);
	// re-validate provider active + method still gateway-kind, build snapshot:
	const method = await deps.store.getPaymentMethodById(
		data.organizationId,
		provider.data.paymentMethodId,
	);
	const snapshot: PaymentMaterializationSnapshot = {
		paymentAccountId: provider.data.paymentAccountId,
		paymentMethodId: provider.data.paymentMethodId,
		paymentMethodCode: method.data.code,
		paymentMethodKind: "gateway",
	};
	const port = deps.ports.get(provider.data.providerKind);
	// port undefined → VALIDATION "Unknown payment provider kind"
	const intent = await port.createIntent({
		credentialReference: provider.data.credentialReference,
		mode: provider.data.mode,
		externalIdempotencyKey: transaction.id, // stable across retries (spec §5.1)
		amount: transaction.amount,
		currencyCode: transaction.currencyCode,
		tokenReference: token?.providerTokenReference ?? null,
	});
	// then mint pay-link when requested:
	const rawToken = data.generatePayLink === true
		? deps.security.generateOpaqueToken(16)
		: null;
	const payLinkTokenHash =
		rawToken === null ? null : deps.security.hashOpaqueToken(rawToken);
	const payLinkExpiresAt =
		rawToken === null
			? null
			: new Date(
					deps.security.now().getTime() +
						(data.payLinkExpiryDays ?? 7) * 24 * 60 * 60 * 1000,
				);
	// store.initiateTransaction({ ...record, providerTransactionReference: intent.data.providerTransactionReference, materializationSnapshot: snapshot, payLinkTokenHash, payLinkExpiresAt })
	// return errorResult.ok({ transaction: initiated.data, payLinkToken: rawToken })
```

`capturePaymentTransactionOperation`: resolve transaction + provider + port; call `port.capture({ ..., externalIdempotencyKey: data.idempotencyKey, providerTransactionReference: transaction.providerTransactionReference, amount: data.amount })` (remote call OUTSIDE any store transaction); then `store.applyCaptureFact({ transactionId, providerCaptureReference: captured.data.providerCaptureReference, amount: data.amount, currencyCode: transaction.currencyCode, source: "api", providerEventRowId: null, actorUserId, correlationId, idempotencyKey })`. `voidPaymentTransactionOperation` / `refundPaymentTransactionOperation` follow the same call-port-then-apply-fact shape (`applyVoidedFact` / `applyRefundFact` with `occurredAt: deps.security.now()`).

`operation-registry.ts` — clone the registry pattern with `OWNER = "payment-transactions"` and the ids in the Interfaces block.

- [ ] **Step 4: Run tests, commit**

Run: `pnpm --filter @afenda/payments test -- payment-transactions.operations`
Expected: PASS.

```bash
git add packages/erp/payments/src/features/payment-transactions packages/erp/payments/__tests__/payment-transactions.operations.test.ts
git commit -m "feat(payments): transaction lifecycle operations with frozen snapshot and external idempotency"
```

---

### Task 8: Webhook ingestion and the out-of-order matrix

**Files:**
- Modify: `packages/erp/payments/src/features/payment-transactions/transactions.operations.ts` (add `ingestProviderWebhookOperation`)
- Modify: `packages/erp/payments/src/features/payment-transactions/operation-registry.ts` (add command `payments.transaction.ingest_webhook`, `publicName: "ingestProviderWebhook"`, permission `PAYMENTS_PERMISSION_TRANSACTION_MANAGE` — registry projection needs a permission; the operation itself skips `requirePaymentsPermission`, authentication is the webhook signature, documented in a code comment)
- Test: `packages/erp/payments/__tests__/payments.webhooks.test.ts` (create)

**Interfaces:**
- Consumes: Tasks 6–7; `PAYMENTS_WEBHOOK_ACTOR`; fake port `buildWebhook`.
- Produces: `ingestProviderWebhookOperation(input: unknown, deps: PaymentTransactionsOperationDeps): Promise<Result<{ outcome: "processed" | "ignored" | "failed"; eventId: string }>>` (fact replays and exact duplicates both resolve to `processed`/`ignored` per the stored outcome).

- [ ] **Step 1: Write the failing tests** — the heart of Phase 2. Fixture helper: seed provider + authorized transaction; `port.buildWebhook(event, credentialReference)` to build deliveries. Cases (write each as a full test):
  1. `authorized` webhook on pending → processed, transaction authorized, actor on updated row is `system:payment-provider-webhook`;
  2. `captured` webhook on authorized → processed, ONE Payment materialized with `createdBy === "system:payment-provider-webhook"`, event row `processed` with `transactionId` set;
  3. API capture then the provider's matching capture webhook (same `providerCaptureReference` via `captureReferenceFor`, NEW `providerEventId`) → outcome `replayed`... no: outcome is `processed` (the event row is processed, referencing the existing fact) — assert NO second Payment, `capturedTotal` unchanged, event row `processed`;
  4. duplicate delivery (same `providerEventId`, same body) → returns stored outcome, no state change, attemptCount unchanged;
  5. same `providerEventId`, DIFFERENT body → CONFLICT result, event row untouched;
  6. tampered signature → VALIDATION, `getProviderEvent` returns null (nothing recorded);
  7. out-of-order: `captured` while pending → outcome `failed`, event row `failed` with error, transaction still pending; re-delivery after an `authorized` webhook → processed (attemptCount 2);
  8. `authorized` after capture → `ignored`; `voided` after capture → `ignored`; `failed` after capture → `ignored`; `refunded` before sufficient capture → `failed` (replayable); `unknown` kind → `ignored`; unmatched `transactionReference` → `ignored`;
  9. organization derivation: no `organizationId` in input; a transaction belonging to a DIFFERENT provider is never matched (build two providers, reference from provider B sent to provider A's endpoint → `ignored`).

- [ ] **Step 2: Run to verify FAIL** (`pnpm --filter @afenda/payments test -- webhooks`).

- [ ] **Step 3: Implement `ingestProviderWebhookOperation`**

```ts
export async function ingestProviderWebhookOperation(
	input: unknown,
	deps: PaymentTransactionsOperationDeps,
): Promise<Result<{ outcome: WebhookOutcome; eventId: string }>> {
	const parsed = parsePaymentsInput(ingestProviderWebhookInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	// Authentication IS the webhook signature — no requirePaymentsPermission here
	// (spec §5.6). Organization scope derives from the provider record.
	const provider = await deps.store.getPaymentProviderForWebhook(
		parsed.data.providerId,
	);
	if (!provider.ok) {
		return provider;
	}
	if (provider.data === null || !provider.data.active) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Payment provider not found",
		});
	}
	const port = deps.ports.get(provider.data.providerKind);
	if (port === undefined) {
		return errorResult.fail("VALIDATION", {
			publicMessage: "Unknown payment provider kind",
		});
	}
	const verified = await port.verifyAndParseWebhook({
		credentialReference: provider.data.credentialReference,
		mode: provider.data.mode,
		rawBody: parsed.data.rawBody,
		headers: parsed.data.headers,
	});
	if (!verified.ok) {
		return verified; // signature failure: nothing recorded
	}
	const fingerprint = deps.security.hashOpaqueToken(parsed.data.rawBody);
	const existing = await deps.store.getProviderEvent(
		provider.data.id,
		verified.data.providerEventId,
	);
	if (!existing.ok) {
		return existing;
	}
	if (existing.data !== null) {
		if (existing.data.payloadFingerprint !== fingerprint) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Provider event id replayed with a different payload",
			});
		}
		if (existing.data.status !== "failed") {
			return errorResult.ok({
				outcome: existing.data.status === "processed" ? "processed" : "ignored",
				eventId: existing.data.id,
			});
		}
		// failed + same fingerprint: controlled replay — fall through to processing
	}
	const recorded =
		existing.data ??
		(await unwrapOrReturn(
			deps.store.recordProviderEvent({
				organizationId: provider.data.organizationId,
				providerId: provider.data.id,
				providerEventId: verified.data.providerEventId,
				payloadFingerprint: fingerprint,
				kind: verified.data.kind,
				receivedAt: deps.security.now(),
			}),
		)).event;
	return processProviderEvent(deps, provider.data, recorded, verified.data);
}
```

(`unwrapOrReturn` is illustrative — inline the Result checks in the real code following the file's existing style.) `processProviderEvent` implements the matrix: look up the transaction by `getTransactionByProviderReference(provider.id, event.transactionReference)`; verify `transaction.organizationId === provider.organizationId` (mismatch → hard CONFLICT failure); then switch on `event.kind` × `transaction.status` exactly per the spec §5.6 table, calling `applyAuthorizedFact`/`applyCaptureFact`/`applyRefundFact`/`applyVoidedFact`/`applyFailedFact` with `actorUserId: PAYMENTS_WEBHOOK_ACTOR`, `correlationId: recorded.id`, `idempotencyKey: `wh:${recorded.id}``, `providerEventRowId: recorded.id`, `source: "webhook"` — the store marks the event row `processed` inside the fact's boundary. For `ignored` outcomes call `updateProviderEventOutcome({ status: "ignored", ... })` standalone; for processing failures call it with `status: "failed"`, `lastErrorCode`/`lastErrorMessage` from the failed Result, and return outcome `failed` (as an OK result carrying the outcome — HTTP 200 semantics; the provider should not retry storms on domain rejections).

- [ ] **Step 4: Run tests, commit**

Run: `pnpm --filter @afenda/payments test -- webhooks`
Expected: PASS.

```bash
git add packages/erp/payments/src/features/payment-transactions packages/erp/payments/__tests__/payments.webhooks.test.ts
git commit -m "feat(payments): webhook ingestion with retained audit rows and out-of-order matrix"
```

---

### Task 9: Pay-link resolution query

**Files:**
- Modify: `packages/erp/payments/src/features/payment-transactions/transactions.operations.ts` (add `resolvePayLinkOperation`)
- Modify: `packages/erp/payments/src/features/payment-transactions/operation-registry.ts` (query `payments.transaction.resolve_pay_link`, `publicName: "resolvePayLink"`, permission `PAYMENTS_PERMISSION_TRANSACTION_READ` — projection only; the operation skips the permission check, the token is the capability)
- Test: `packages/erp/payments/__tests__/payments.pay-link.test.ts` (create)

**Interfaces:**
- Produces: `resolvePayLinkOperation(input: unknown, deps: PaymentTransactionsOperationDeps): Promise<Result<{ amount: string; currencyCode: string; expiresAt: Date; providerKind: string; status: PaymentTransactionStatus } | null>>`.

- [ ] **Step 1: Failing tests**: mint via initiate (`generatePayLink: true`), then
  1. resolve with the raw token → the public-safe view, no organization/id fields (`expect(Object.keys(view).sort()).toEqual(["amount", "currencyCode", "expiresAt", "providerKind", "status"])`);
  2. wrong token → `null`; expired (advance a fake security clock variant whose `now()` returns +31 days) → `null`; consumed (capture the transaction fully first) → `null` — all three indistinguishable;
  3. no permission/authorization required (pass `authorization: undefined` and no identity fields).

- [ ] **Step 2: FAIL run** (`pnpm --filter @afenda/payments test -- pay-link`). **Step 3: implement** — hash via `deps.security.hashOpaqueToken(token)`, delegate to `store.resolvePayLinkByHash(hash, deps.security.now())`, join `providerKind` from the provider record. **Step 4: PASS run.**

- [ ] **Step 5: Commit**

```bash
git add packages/erp/payments
git commit -m "feat(payments): capability-based pay-link resolution"
```

---

### Task 10: Drizzle slices for providers, tokens, transactions (parity)

**Files:**
- Create: `packages/erp/payments/src/features/payment-providers/providers.drizzle.ts`
- Create: `packages/erp/payments/src/features/payment-tokens/tokens.drizzle.ts`
- Create: `packages/erp/payments/src/features/payment-transactions/transactions.drizzle.ts`
- Modify: `packages/erp/payments/src/features/payment-lifecycle/lifecycle.drizzle.ts` (extract internal tx-scoped materialization helper)
- Modify: `packages/erp/payments/src/composition/adapters/drizzle.ts`

**Interfaces:**
- Consumes: Task 3 tables; store contracts from Tasks 4–6.
- Produces: `createDrizzlePaymentProviderMethods(db)`, `createDrizzlePaymentTokenMethods(db)`, `createDrizzlePaymentTransactionMethods(db)` mirroring the memory slices; internal export `materializeCapturedPaymentTx(tx, record)` from `lifecycle.drizzle.ts`.

- [ ] **Step 1: Providers + tokens slices** — clone `methods.drizzle.ts` structure against `paymentProvider`/`paymentToken` (plain scalar columns, no JSON). Same duplicate-code/reference CONFLICT mapping from unique-index violations that the existing slices use.

- [ ] **Step 2: Lifecycle refactor** — in `lifecycle.drizzle.ts`, extract the existing createDraft-then-post logic into an internal helper `materializeCapturedPaymentTx(tx, record)` that runs against a passed-in drizzle transaction handle instead of opening its own, and re-express the public `createDraft`/`post` in terms of the same internals (behavior identical; existing lifecycle tests must stay green — run `pnpm --filter @afenda/payments test -- domain transactions clearance` after this step).

- [ ] **Step 3: Transactions slice** — `createDrizzlePaymentTransactionMethods(db)` implementing `PaymentTransactionsStore`. `applyCaptureFact` runs a single `db.transaction(async (tx) => { ... })` containing: replay check (select capture by unique reference — on hit, return replayed result), guards, `materializeCapturedPaymentTx(tx, ...)`, capture insert, transaction row update (guard `WHERE version = expected` pattern the file's siblings use), event-row update when `providerEventRowId` non-null. JSON-encode `fxContext`/`materializationSnapshot` on write, parse on read. All other methods follow the memory slice's semantics 1:1.

- [ ] **Step 4: Register the three slices in `composition/adapters/drizzle.ts`** exactly where the existing slices compose.

- [ ] **Step 5: Verify and commit**

Run: `pnpm --filter @afenda/payments check`
Expected: typecheck PASS; all existing suites PASS (drizzle slices are compile-verified; runtime parity follows the module's established approach — memory-driven suites + shared contracts).

```bash
git add packages/erp/payments
git commit -m "feat(payments): drizzle slices for gateway features with transactional materialization"
```

---

### Task 11: Composition, facade, public exports, governance tests

**Files:**
- Modify: `packages/erp/payments/src/composition/store/contract.ts`
- Modify: `packages/erp/payments/src/testing/memory-store.ts`
- Modify: `packages/erp/payments/src/kernel/operations/registry.ts`
- Modify: `packages/erp/payments/src/facade/contracts.ts`
- Modify: `packages/erp/payments/src/facade/capabilities.ts`
- Modify: `packages/erp/payments/src/index.ts`
- Modify: `packages/erp/payments/__tests__/export-surface.test.ts`, `packages/erp/payments/__tests__/registry-projection.test.ts`

**Interfaces:**
- Produces: `PaymentsStore` intersects `PaymentProvidersStore & PaymentTokensStore & PaymentTransactionsStore`; `PaymentsCommandOptions` gains `providerPorts?: PaymentProviderPortRegistry; security?: PaymentSecurityPort`; facade functions `createPaymentProvider`, `updatePaymentProvider`, `deactivatePaymentProvider`, `listPaymentProviders`, `createPaymentToken`, `deactivatePaymentToken`, `listPaymentTokens`, `createPaymentTransaction`, `initiatePaymentTransaction`, `capturePaymentTransaction`, `voidPaymentTransaction`, `refundPaymentTransaction`, `getPaymentTransactionById`, `listPaymentTransactions`, `ingestProviderWebhook`, `resolvePayLink`.

- [ ] **Step 1: Composition** — intersect the three new store types into `PaymentsStore` (+ re-export); extend the memory state + compose the three memory slices in `testing/memory-store.ts` (transactions slice receives the lifecycle slice: create lifecycle first, pass it into `createMemoryPaymentTransactionMethods(state, lifecycle)`); compose `PAYMENTS_PROVIDER_COMMANDS/QUERIES`, `PAYMENTS_TOKEN_COMMANDS/QUERIES`, `PAYMENTS_TRANSACTION_COMMANDS/QUERIES` into `kernel/operations/registry.ts`.

- [ ] **Step 2: Facade** — `facade/contracts.ts` adds the two optional deps. Add a default production security port in `facade/capabilities.ts`:

```ts
import { randomBytes, createHash } from "node:crypto";

const productionSecurityPort: PaymentSecurityPort = {
	generateOpaqueToken: (byteLength) =>
		randomBytes(byteLength).toString("base64url"),
	hashOpaqueToken: (token) =>
		createHash("sha256").update(token).digest("hex"),
	now: () => new Date(),
};

function gatewayDeps(options: PaymentsCommandOptions) {
	const store = resolvePaymentsStore(options.store);
	return {
		authorization: options.authorization,
		store,
		ports: options.providerPorts ?? new Map(),
		security: options.security ?? productionSecurityPort,
	};
}
```

Each of the sixteen facade wrappers follows the existing one-liner shape via `gatewayDeps` (provider/token wrappers only need `authorization`/`store`/`ports` — passing the full deps object is fine since deps are structural). `src/index.ts` exports the sixteen functions, `export * from "./features/payment-transactions/transactions.schema"`, `export * from "./features/payment-providers/providers.schema"`, `export * from "./features/payment-tokens/tokens.schema"`, the new domain types from Task 1, and types `PaymentProviderPort`, `NormalizedProviderEvent`, `PaymentProviderPortRegistry`, `PaymentSecurityPort`, `PAYMENTS_WEBHOOK_ACTOR`. Fakes stay in `./testing` only.

- [ ] **Step 3: Governance tests** — extend the expected-name lists in `export-surface.test.ts` and expected ids in `registry-projection.test.ts` (extend expectations, never weaken assertions).

- [ ] **Step 4: Verify and commit**

Run: `pnpm --filter @afenda/payments check`
Expected: PASS.

```bash
git add packages/erp/payments
git commit -m "feat(payments): wire gateway features through composition, facade, and public surface"
```

---

### Task 12: Event contracts, manifest, registers, final gate

**Files:**
- Modify: `packages/data-plane/events/src/schemas/payments.events.ts` (+ re-exports in `schemas/index.ts`)
- Modify: `packages/data-plane/events/__tests__/schemas.test.ts`
- Modify: `packages/erp/payments/src/kernel/contracts/effects.ts`
- Modify: `packages/erp/payments/src/composition/module.manifest.ts`
- Modify: `docs-V2/modules/*.generated.yaml` (regenerated)

- [ ] **Step 1: Event schemas.** Add to `payments.events.ts` (follow the file's existing `money`/`signedMoney` helpers and `.strict()` style):

```ts
const providerPayloadSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		providerId: z.string().uuid(),
		code: z.string().trim().min(1),
		providerKind: z.string().trim().min(1),
		mode: z.enum(["test", "live"]),
		active: z.boolean(),
		actorId: z.string().trim().min(1),
		correlationId: z.string().trim().min(1),
	})
	.strict();

const transactionBasePayload = {
	organizationId: z.string().trim().min(1),
	transactionId: z.string().uuid(),
	providerId: z.string().uuid(),
	providerTransactionReference: z.string().nullable(),
	status: z.enum([
		"draft",
		"pending",
		"authorized",
		"partially_captured",
		"captured",
		"voided",
		"failed",
	]),
	amount: money,
	currencyCode: z.string().trim().length(3),
	actorId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
};

const transactionPayloadSchema = z.object(transactionBasePayload).strict();

const transactionCapturedPayloadSchema = z
	.object({
		...transactionBasePayload,
		captureId: z.string().uuid(),
		providerCaptureReference: z.string().trim().min(1),
		paymentId: z.string().uuid(),
		captureAmount: money,
		capturedTotal: money,
		transactionAmount: money,
		source: z.enum(["api", "webhook"]),
	})
	.strict();

const transactionRefundedPayloadSchema = z
	.object({
		...transactionBasePayload,
		refundId: z.string().uuid(),
		providerRefundReference: z.string().trim().min(1),
		refundAmount: money,
		refundedTotal: money,
		capturedTotal: money,
		source: z.enum(["api", "webhook"]),
	})
	.strict();

const tokenPayloadSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		tokenId: z.string().uuid(),
		providerId: z.string().uuid(),
		displayHint: z.string().trim().min(1),
		active: z.boolean(),
		actorId: z.string().trim().min(1),
		correlationId: z.string().trim().min(1),
	})
	.strict();
```

Register the twelve event ids (Global Constraints) mapping created/updated/deactivated → `providerPayloadSchema`; created/initiated/authorized/voided/failed → `transactionPayloadSchema`; captured → `transactionCapturedPayloadSchema`; refunded → `transactionRefundedPayloadSchema`; token created/deactivated → `tokenPayloadSchema`. Export constants `PAYMENTS_PAYMENT_PROVIDER_CREATED_EVENT`, `…_UPDATED_EVENT`, `…_DEACTIVATED_EVENT`, `PAYMENTS_PAYMENT_TRANSACTION_CREATED_EVENT`, `…_INITIATED_EVENT`, `…_AUTHORIZED_EVENT`, `…_CAPTURED_EVENT`, `…_VOIDED_EVENT`, `…_FAILED_EVENT`, `…_REFUNDED_EVENT`, `PAYMENTS_PAYMENT_TOKEN_CREATED_EVENT`, `…_DEACTIVATED_EVENT`; re-export from `schemas/index.ts`. No payload ever contains `credentialReference`, raw bodies, or pay-link tokens. Extend `schemas.test.ts` fixtures with one valid + one invalid parse per new schema.

- [ ] **Step 2: Effects union + manifest.** Add the twelve ids to `PaymentsEventType` in `kernel/contracts/effects.ts`. Add the twelve constants to `module.manifest.ts` `events.emits`.

- [ ] **Step 3: Regenerate registers.** Run `pnpm validate:modules:write` from repo root, then `pnpm validate:modules`. Note: the working tree currently carries unrelated payroll/inventory register drift from another effort — if `validate:modules` still fails ONLY on those pre-existing findings (`payroll_accepted_handoff` etc.), record that in the commit message and do not attempt to fix the other effort's drift; the payments-related entries must be clean.

- [ ] **Step 4: Full verification gate** (do not claim success without output):

```bash
pnpm --filter @afenda/payments check
pnpm --filter @afenda/db typecheck
pnpm --filter @afenda/events test
pnpm --filter @afenda/payments lint
```

- [ ] **Step 5: Commit**

```bash
git add packages/erp/payments packages/data-plane/events docs-V2/modules
git commit -m "feat(payments): gateway event contracts, manifest, and register regeneration"
```

---

## Spec-coverage map (self-review record)

| Spec section | Task |
|---|---|
| §2 layout | 1, 2, 4–6 |
| §3.1 provider + credential projection | 1, 4 |
| §3.2 transaction + statuses + snapshot | 1, 6 |
| §3.3 capture/refund facts + uniqueness | 1, 3, 6 |
| §3.4 token + use rules | 1, 5, 7 |
| §4.1 provider port + discriminated events + fake | 1, 2 |
| §4.2 security port | 1, 2 |
| §5.1 lifecycle ops + remote-call boundary | 7 |
| §5.2 invariants + fact idempotency + replay criterion + actor | 6, 7, 8 |
| §5.3 materialization seam + commit boundary | 6 (memory), 10 (drizzle) |
| §5.4 frozen snapshot | 6, 7 |
| §5.5 refund facts | 6 |
| §5.6 webhook ingestion + matrix + event-row transactionality | 8 |
| §5.7 pay-link mint/resolve | 7, 9 |
| §6 events + fact identities + failed semantics | 12 |
| §7 schema + constraints + registry classification | 3 |
| §8 permissions | 1, 4, 5, 7 |
| §9 error/security | 4 (projection), 7 (token once), 8 (no raw persistence) |
| §10 testing | every task; atomicity + convergence in 6–8 |
| §11 out of scope | no real adapters, no HTTP, no authorize — confirmed absent |

Notes recorded during self-review: event emission remains contract-level (schemas + manifest) matching Phase 1 — there are no `effects.emit` call sites in the module; the spec's outbox language binds state + fact rows (Global Constraints note).
