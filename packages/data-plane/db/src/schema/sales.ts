import {
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { mdItem, mdParty, mdPaymentTerm } from "./master-data";

/**
 * Sales transactional documents — FK masters in `@afenda/master-data`.
 * ARCH-006 consumer: party/item/payment-term FKs + commercial snapshots.
 */
export const salesOrder = pgTable(
	"sales_order",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		/** draft | posted | cancelled */
		status: text("status").notNull().default("draft"),
		partyId: uuid("party_id")
			.notNull()
			.references(() => mdParty.id),
		partyCode: text("party_code").notNull(),
		partyName: text("party_name").notNull(),
		billToAddressSnapshot: text("bill_to_address_snapshot"),
		shipToAddressSnapshot: text("ship_to_address_snapshot"),
		paymentTermId: uuid("payment_term_id").references(() => mdPaymentTerm.id),
		paymentTermCode: text("payment_term_code"),
		paymentTermName: text("payment_term_name"),
		netDays: integer("net_days"),
		currencyCode: text("currency_code").notNull(),
		exchangeRate: text("exchange_rate"),
		subtotalAmount: text("subtotal_amount"),
		discountTotal: text("discount_total"),
		taxTotal: text("tax_total"),
		documentTotal: text("document_total"),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		postIdempotencyKey: text("post_idempotency_key"),
		cancelIdempotencyKey: text("cancel_idempotency_key"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		postedAt: timestamp("posted_at", { withTimezone: true }),
		postedBy: text("posted_by"),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
		cancelledBy: text("cancelled_by"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("sales_order_org_id_idx").on(t.organizationId, t.id),
		index("sales_order_org_status_idx").on(t.organizationId, t.status),
		index("sales_order_org_party_idx").on(t.organizationId, t.partyId),
		index("sales_order_org_updated_at_idx").on(
			t.organizationId,
			t.updatedAt,
			t.id,
		),
		uniqueIndex("sales_order_org_normalized_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
		uniqueIndex("sales_order_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const salesOrderLine = pgTable(
	"sales_order_line",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		orderId: uuid("order_id")
			.notNull()
			.references(() => salesOrder.id),
		lineNo: integer("line_no").notNull(),
		itemId: uuid("item_id")
			.notNull()
			.references(() => mdItem.id),
		itemCode: text("item_code").notNull(),
		itemName: text("item_name").notNull(),
		baseUomId: uuid("base_uom_id").notNull(),
		baseUomCode: text("base_uom_code").notNull(),
		quantity: numeric("quantity", { precision: 24, scale: 12 }).notNull(),
		unitPrice: text("unit_price").notNull(),
		discountAmount: text("discount_amount").notNull().default("0"),
		taxClassification: text("tax_classification"),
		lineAmount: text("line_amount").notNull(),
		lineIdempotencyKey: text("line_idempotency_key").notNull(),
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
		index("sales_order_line_org_id_idx").on(t.organizationId, t.id),
		index("sales_order_line_org_order_idx").on(t.organizationId, t.orderId),
		index("sales_order_line_org_item_idx").on(t.organizationId, t.itemId),
		uniqueIndex("sales_order_line_org_order_line_no_uidx").on(
			t.organizationId,
			t.orderId,
			t.lineNo,
		),
		uniqueIndex("sales_order_line_org_order_idempotency_uidx").on(
			t.organizationId,
			t.orderId,
			t.lineIdempotencyKey,
		),
	],
);
