import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

/** Cash / bank / gateway / clearing account that owns money movement. */
export const paymentAccount = pgTable(
	"payment_account",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		name: text("name").notNull(),
		/** bank | cash | gateway | clearing */
		kind: text("kind").notNull().default("cash"),
		currencyCode: text("currency_code").notNull(),
		active: boolean("active").notNull().default(true),
		createdBy: text("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("payment_account_org_id_idx").on(t.organizationId, t.id),
		uniqueIndex("payment_account_org_normalized_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
	],
);

/** Payments, application instructions, reversals, and refunds. */
export const payment = pgTable(
	"payment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		paymentAccountId: uuid("payment_account_id")
			.notNull()
			.references(() => paymentAccount.id),
		/** receipt | disbursement | refund — transfers are paired payments. */
		direction: text("direction").notNull(),
		purpose: text("purpose").notNull(),
		/** draft | posted | reversed — posted ≡ settled. */
		status: text("status").notNull().default("draft"),
		counterpartyId: uuid("counterparty_id"),
		counterpartySnapshot: text("counterparty_snapshot"),
		transferGroupId: uuid("transfer_group_id"),
		linkedPaymentId: uuid("linked_payment_id"),
		originalPaymentId: uuid("original_payment_id"),
		refundSource: text("refund_source"),
		currencyCode: text("currency_code").notNull(),
		amount: text("amount").notNull(),
		reference: text("reference"),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		postIdempotencyKey: text("post_idempotency_key"),
		reverseIdempotencyKey: text("reverse_idempotency_key"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		postedAt: timestamp("posted_at", { withTimezone: true }),
		postedBy: text("posted_by"),
		reversedAt: timestamp("reversed_at", { withTimezone: true }),
		reversedBy: text("reversed_by"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("payment_org_id_idx").on(t.organizationId, t.id),
		index("payment_org_status_idx").on(t.organizationId, t.status),
		index("payment_org_direction_idx").on(t.organizationId, t.direction),
		index("payment_org_counterparty_idx").on(
			t.organizationId,
			t.counterpartyId,
		),
		index("payment_org_account_idx").on(t.organizationId, t.paymentAccountId),
		index("payment_org_transfer_group_idx").on(
			t.organizationId,
			t.transferGroupId,
		),
		index("payment_org_original_idx").on(t.organizationId, t.originalPaymentId),
		uniqueIndex("payment_org_normalized_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
		uniqueIndex("payment_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

/** PaymentApplicationInstruction rows (table name retained). */
export const paymentAllocation = pgTable(
	"payment_allocation",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		paymentId: uuid("payment_id")
			.notNull()
			.references(() => payment.id),
		targetModule: text("target_module").notNull(),
		targetDocumentType: text("target_document_type").notNull(),
		targetDocumentId: uuid("target_document_id").notNull(),
		intendedAmount: text("intended_amount").notNull(),
		appliedAmount: text("applied_amount").notNull().default("0"),
		currencyCode: text("currency_code").notNull(),
		status: text("status").notNull().default("pending"),
		rejectionCode: text("rejection_code"),
		createdBy: text("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("payment_allocation_org_id_idx").on(t.organizationId, t.id),
		index("payment_allocation_org_payment_idx").on(
			t.organizationId,
			t.paymentId,
		),
		index("payment_allocation_org_target_idx").on(
			t.organizationId,
			t.targetModule,
			t.targetDocumentId,
		),
	],
);

export const paymentReversal = pgTable(
	"payment_reversal",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		paymentId: uuid("payment_id")
			.notNull()
			.references(() => payment.id),
		reason: text("reason").notNull(),
		reversedBy: text("reversed_by").notNull(),
		reversedAt: timestamp("reversed_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("payment_reversal_org_id_idx").on(t.organizationId, t.id),
		uniqueIndex("payment_reversal_org_payment_uidx").on(
			t.organizationId,
			t.paymentId,
		),
	],
);
