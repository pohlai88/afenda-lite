import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

/** Payments, allocations, reversals, and refunds. */
export const payment = pgTable(
	"payment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		/** receipt | disbursement | refund | transfer */
		direction: text("direction").notNull(),
		/** draft | posted | reversed */
		status: text("status").notNull().default("draft"),
		counterpartyId: uuid("counterparty_id"),
		originalPaymentId: uuid("original_payment_id"),
		currencyCode: text("currency_code").notNull(),
		amount: text("amount").notNull(),
		reference: text("reference"),
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
		index("payment_org_counterparty_idx").on(t.organizationId, t.counterpartyId),
		index("payment_org_original_idx").on(t.organizationId, t.originalPaymentId),
		uniqueIndex("payment_org_normalized_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
	],
);

export const paymentAllocation = pgTable(
	"payment_allocation",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		paymentId: uuid("payment_id")
			.notNull()
			.references(() => payment.id),
		/** receivable | payable */
		targetType: text("target_type").notNull(),
		targetId: uuid("target_id").notNull(),
		amount: text("amount").notNull(),
		createdBy: text("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
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
			t.targetType,
			t.targetId,
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
