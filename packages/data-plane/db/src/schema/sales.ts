import { sql } from "drizzle-orm";
import {
	check,
	foreignKey,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { mdItem, mdParty, mdPaymentTerm } from "./master-data";

const auditColumns = {
	version: integer("version").notNull().default(1),
	createdBy: text("created_by").notNull(),
	updatedBy: text("updated_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
};

export const salesPriceBook = pgTable(
	"sales_price_book",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		name: text("name").notNull(),
		currencyCode: text("currency_code").notNull(),
		validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
		validTo: timestamp("valid_to", { withTimezone: true }),
		priority: integer("priority").notNull().default(100),
		status: text("status").notNull().default("draft"),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		...auditColumns,
	},
	(t) => [
		uniqueIndex("sales_price_book_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("sales_price_book_org_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
		uniqueIndex("sales_price_book_org_idem_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		index("sales_price_book_org_status_dates_idx").on(
			t.organizationId,
			t.status,
			t.validFrom,
			t.validTo,
		),
		check("sales_price_book_version_ck", sql`${t.version} > 0`),
		check(
			"sales_price_book_dates_ck",
			sql`${t.validTo} IS NULL OR ${t.validTo} >= ${t.validFrom}`,
		),
		check(
			"sales_price_book_status_ck",
			sql`${t.status} IN ('draft','active','inactive','archived')`,
		),
	],
);

export const salesPriceBookEntry = pgTable(
	"sales_price_book_entry",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		priceBookId: uuid("price_book_id").notNull(),
		itemId: uuid("item_id").notNull(),
		uomId: uuid("uom_id").notNull(),
		minimumQuantity: numeric("minimum_quantity", {
			precision: 24,
			scale: 6,
		}).notNull(),
		unitPrice: numeric("unit_price", { precision: 24, scale: 6 }).notNull(),
		discountPercent: numeric("discount_percent", { precision: 9, scale: 6 })
			.notNull()
			.default("0"),
		validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
		validTo: timestamp("valid_to", { withTimezone: true }),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		...auditColumns,
	},
	(t) => [
		uniqueIndex("sales_price_book_entry_org_id_uidx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex("sales_price_book_entry_org_idem_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		index("sales_price_book_entry_lookup_idx").on(
			t.organizationId,
			t.itemId,
			t.uomId,
			t.minimumQuantity,
		),
		foreignKey({
			columns: [t.organizationId, t.priceBookId],
			foreignColumns: [salesPriceBook.organizationId, salesPriceBook.id],
			name: "sales_price_book_entry_book_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.itemId],
			foreignColumns: [mdItem.organizationId, mdItem.id],
			name: "sales_price_book_entry_item_fk",
		}),
		check(
			"sales_price_book_entry_values_ck",
			sql`${t.minimumQuantity} > 0 AND ${t.unitPrice} >= 0 AND ${t.discountPercent} >= 0 AND ${t.discountPercent} <= 100`,
		),
		check(
			"sales_price_book_entry_dates_ck",
			sql`${t.validTo} IS NULL OR ${t.validTo} >= ${t.validFrom}`,
		),
		check("sales_price_book_entry_version_ck", sql`${t.version} > 0`),
	],
);

export const salesQuotation = pgTable(
	"sales_quotation",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		revision: integer("revision").notNull().default(1),
		status: text("status").notNull().default("draft"),
		partyId: uuid("party_id").notNull(),
		paymentTermId: uuid("payment_term_id"),
		customerSnapshot: jsonb("customer_snapshot").notNull(),
		currencyCode: text("currency_code").notNull(),
		validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
		subtotalAmount: numeric("subtotal_amount", { precision: 24, scale: 6 })
			.notNull()
			.default("0"),
		discountTotal: numeric("discount_total", { precision: 24, scale: 6 })
			.notNull()
			.default("0"),
		taxTotal: numeric("tax_total", { precision: 24, scale: 6 })
			.notNull()
			.default("0"),
		documentTotal: numeric("document_total", { precision: 24, scale: 6 })
			.notNull()
			.default("0"),
		convertedOrderId: uuid("converted_order_id"),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		...auditColumns,
	},
	(t) => [
		uniqueIndex("sales_quotation_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("sales_quotation_org_code_revision_uidx").on(
			t.organizationId,
			t.normalizedCode,
			t.revision,
		),
		uniqueIndex("sales_quotation_org_idem_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		index("sales_quotation_org_status_idx").on(
			t.organizationId,
			t.status,
			t.updatedAt,
		),
		foreignKey({
			columns: [t.organizationId, t.partyId],
			foreignColumns: [mdParty.organizationId, mdParty.id],
			name: "sales_quotation_party_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.paymentTermId],
			foreignColumns: [mdPaymentTerm.organizationId, mdPaymentTerm.id],
			name: "sales_quotation_payment_term_fk",
		}),
		check(
			"sales_quotation_status_ck",
			sql`${t.status} IN ('draft','submitted','approved','sent','accepted','expired','rejected','cancelled','converted')`,
		),
		check(
			"sales_quotation_amounts_ck",
			sql`${t.subtotalAmount} >= 0 AND ${t.discountTotal} >= 0 AND ${t.taxTotal} >= 0 AND ${t.documentTotal} >= 0`,
		),
		check("sales_quotation_version_ck", sql`${t.version} > 0`),
	],
);

export const salesQuotationLine = pgTable(
	"sales_quotation_line",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		quotationId: uuid("quotation_id").notNull(),
		lineNo: integer("line_no").notNull(),
		itemId: uuid("item_id").notNull(),
		itemSnapshot: jsonb("item_snapshot").notNull(),
		quantity: numeric("quantity", { precision: 24, scale: 6 }).notNull(),
		unitPrice: numeric("unit_price", { precision: 24, scale: 6 }).notNull(),
		discountAmount: numeric("discount_amount", { precision: 24, scale: 6 })
			.notNull()
			.default("0"),
		taxAmount: numeric("tax_amount", { precision: 24, scale: 6 })
			.notNull()
			.default("0"),
		lineAmount: numeric("line_amount", { precision: 24, scale: 6 }).notNull(),
		pricingTrace: jsonb("pricing_trace"),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		...auditColumns,
	},
	(t) => [
		uniqueIndex("sales_quotation_line_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("sales_quotation_line_org_no_uidx").on(
			t.organizationId,
			t.quotationId,
			t.lineNo,
		),
		uniqueIndex("sales_quotation_line_org_idem_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		foreignKey({
			columns: [t.organizationId, t.quotationId],
			foreignColumns: [salesQuotation.organizationId, salesQuotation.id],
			name: "sales_quotation_line_parent_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.itemId],
			foreignColumns: [mdItem.organizationId, mdItem.id],
			name: "sales_quotation_line_item_fk",
		}),
		check(
			"sales_quotation_line_values_ck",
			sql`${t.quantity} > 0 AND ${t.unitPrice} >= 0 AND ${t.discountAmount} >= 0 AND ${t.taxAmount} >= 0 AND ${t.lineAmount} >= 0`,
		),
		check("sales_quotation_line_version_ck", sql`${t.version} > 0`),
	],
);

export const salesOrder = pgTable(
	"sales_order",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		status: text("status").notNull().default("draft"),
		partyId: uuid("party_id").notNull(),
		paymentTermId: uuid("payment_term_id"),
		customerSnapshot: jsonb("customer_snapshot").notNull(),
		currencyCode: text("currency_code").notNull(),
		exchangeRate: numeric("exchange_rate", { precision: 24, scale: 12 }),
		subtotalAmount: numeric("subtotal_amount", { precision: 24, scale: 6 })
			.notNull()
			.default("0"),
		discountTotal: numeric("discount_total", { precision: 24, scale: 6 })
			.notNull()
			.default("0"),
		taxTotal: numeric("tax_total", { precision: 24, scale: 6 })
			.notNull()
			.default("0"),
		documentTotal: numeric("document_total", { precision: 24, scale: 6 })
			.notNull()
			.default("0"),
		sourceQuotationId: uuid("source_quotation_id"),
		creditCheckReference: text("credit_check_reference"),
		availabilityReference: text("availability_reference"),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
		releasedAt: timestamp("released_at", { withTimezone: true }),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
		closedAt: timestamp("closed_at", { withTimezone: true }),
		...auditColumns,
	},
	(t) => [
		uniqueIndex("sales_order_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("sales_order_org_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
		uniqueIndex("sales_order_org_idem_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		index("sales_order_org_status_idx").on(
			t.organizationId,
			t.status,
			t.updatedAt,
		),
		index("sales_order_org_party_idx").on(t.organizationId, t.partyId),
		foreignKey({
			columns: [t.organizationId, t.partyId],
			foreignColumns: [mdParty.organizationId, mdParty.id],
			name: "sales_order_party_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.paymentTermId],
			foreignColumns: [mdPaymentTerm.organizationId, mdPaymentTerm.id],
			name: "sales_order_payment_term_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.sourceQuotationId],
			foreignColumns: [salesQuotation.organizationId, salesQuotation.id],
			name: "sales_order_source_quotation_fk",
		}),
		check(
			"sales_order_status_ck",
			sql`${t.status} IN ('draft','submitted','approved','confirmed','released','partially_fulfilled','fulfilled','cancelled','closed')`,
		),
		check(
			"sales_order_amounts_ck",
			sql`${t.subtotalAmount} >= 0 AND ${t.discountTotal} >= 0 AND ${t.taxTotal} >= 0 AND ${t.documentTotal} >= 0`,
		),
		check("sales_order_version_ck", sql`${t.version} > 0`),
	],
);

export const salesOrderLine = pgTable(
	"sales_order_line",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		orderId: uuid("order_id").notNull(),
		lineNo: integer("line_no").notNull(),
		itemId: uuid("item_id").notNull(),
		itemSnapshot: jsonb("item_snapshot").notNull(),
		quantity: numeric("quantity", { precision: 24, scale: 6 }).notNull(),
		fulfilledQuantity: numeric("fulfilled_quantity", {
			precision: 24,
			scale: 6,
		})
			.notNull()
			.default("0"),
		unitPrice: numeric("unit_price", { precision: 24, scale: 6 }).notNull(),
		discountAmount: numeric("discount_amount", { precision: 24, scale: 6 })
			.notNull()
			.default("0"),
		taxAmount: numeric("tax_amount", { precision: 24, scale: 6 })
			.notNull()
			.default("0"),
		lineAmount: numeric("line_amount", { precision: 24, scale: 6 }).notNull(),
		pricingTrace: jsonb("pricing_trace"),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		...auditColumns,
	},
	(t) => [
		uniqueIndex("sales_order_line_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("sales_order_line_org_no_uidx").on(
			t.organizationId,
			t.orderId,
			t.lineNo,
		),
		uniqueIndex("sales_order_line_org_idem_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		index("sales_order_line_org_item_idx").on(t.organizationId, t.itemId),
		foreignKey({
			columns: [t.organizationId, t.orderId],
			foreignColumns: [salesOrder.organizationId, salesOrder.id],
			name: "sales_order_line_parent_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.itemId],
			foreignColumns: [mdItem.organizationId, mdItem.id],
			name: "sales_order_line_item_fk",
		}),
		check(
			"sales_order_line_values_ck",
			sql`${t.quantity} > 0 AND ${t.fulfilledQuantity} >= 0 AND ${t.fulfilledQuantity} <= ${t.quantity} AND ${t.unitPrice} >= 0 AND ${t.discountAmount} >= 0 AND ${t.taxAmount} >= 0 AND ${t.lineAmount} >= 0`,
		),
		check("sales_order_line_version_ck", sql`${t.version} > 0`),
	],
);

export const salesOrderSchedule = pgTable(
	"sales_order_schedule",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		orderId: uuid("order_id").notNull(),
		orderLineId: uuid("order_line_id").notNull(),
		requestedDate: timestamp("requested_date", {
			withTimezone: true,
		}).notNull(),
		promisedDate: timestamp("promised_date", { withTimezone: true }),
		quantity: numeric("quantity", { precision: 24, scale: 6 }).notNull(),
		releasedQuantity: numeric("released_quantity", { precision: 24, scale: 6 })
			.notNull()
			.default("0"),
		fulfilledQuantity: numeric("fulfilled_quantity", {
			precision: 24,
			scale: 6,
		})
			.notNull()
			.default("0"),
		...auditColumns,
	},
	(t) => [
		uniqueIndex("sales_order_schedule_org_id_uidx").on(t.organizationId, t.id),
		index("sales_order_schedule_org_order_idx").on(
			t.organizationId,
			t.orderId,
			t.requestedDate,
		),
		foreignKey({
			columns: [t.organizationId, t.orderId],
			foreignColumns: [salesOrder.organizationId, salesOrder.id],
			name: "sales_order_schedule_order_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.orderLineId],
			foreignColumns: [salesOrderLine.organizationId, salesOrderLine.id],
			name: "sales_order_schedule_line_fk",
		}),
		check(
			"sales_order_schedule_values_ck",
			sql`${t.quantity} > 0 AND ${t.releasedQuantity} >= 0 AND ${t.releasedQuantity} <= ${t.quantity} AND ${t.fulfilledQuantity} >= 0 AND ${t.fulfilledQuantity} <= ${t.quantity}`,
		),
		check("sales_order_schedule_version_ck", sql`${t.version} > 0`),
	],
);

export const salesOrderHold = pgTable(
	"sales_order_hold",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		orderId: uuid("order_id").notNull(),
		kind: text("kind").notNull(),
		reason: text("reason").notNull(),
		status: text("status").notNull().default("open"),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
		resolvedBy: text("resolved_by"),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		...auditColumns,
	},
	(t) => [
		uniqueIndex("sales_order_hold_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("sales_order_hold_org_idem_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		index("sales_order_hold_org_order_status_idx").on(
			t.organizationId,
			t.orderId,
			t.status,
		),
		foreignKey({
			columns: [t.organizationId, t.orderId],
			foreignColumns: [salesOrder.organizationId, salesOrder.id],
			name: "sales_order_hold_order_fk",
		}),
		check(
			"sales_order_hold_kind_ck",
			sql`${t.kind} IN ('credit','availability','pricing_margin','compliance','manual_review')`,
		),
		check(
			"sales_order_hold_status_ck",
			sql`${t.status} IN ('open','resolved')`,
		),
		check("sales_order_hold_version_ck", sql`${t.version} > 0`),
	],
);

export const salesReturnAuthorization = pgTable(
	"sales_return_authorization",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		orderId: uuid("order_id").notNull(),
		status: text("status").notNull().default("draft"),
		reason: text("reason").notNull(),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		...auditColumns,
	},
	(t) => [
		uniqueIndex("sales_return_authorization_org_id_uidx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex("sales_return_authorization_org_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
		uniqueIndex("sales_return_authorization_org_idem_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		index("sales_return_authorization_org_status_idx").on(
			t.organizationId,
			t.status,
			t.updatedAt,
		),
		foreignKey({
			columns: [t.organizationId, t.orderId],
			foreignColumns: [salesOrder.organizationId, salesOrder.id],
			name: "sales_return_authorization_order_fk",
		}),
		check(
			"sales_return_authorization_status_ck",
			sql`${t.status} IN ('draft','submitted','approved','rejected','cancelled','closed')`,
		),
		check("sales_return_authorization_version_ck", sql`${t.version} > 0`),
	],
);

export const salesReturnAuthorizationLine = pgTable(
	"sales_return_authorization_line",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		returnAuthorizationId: uuid("return_authorization_id").notNull(),
		orderLineId: uuid("order_line_id").notNull(),
		quantity: numeric("quantity", { precision: 24, scale: 6 }).notNull(),
		reason: text("reason").notNull(),
		requestedDisposition: text("requested_disposition").notNull(),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		...auditColumns,
	},
	(t) => [
		uniqueIndex("sales_return_authorization_line_org_id_uidx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex("sales_return_authorization_line_org_idem_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		index("sales_return_authorization_line_parent_idx").on(
			t.organizationId,
			t.returnAuthorizationId,
		),
		foreignKey({
			columns: [t.organizationId, t.returnAuthorizationId],
			foreignColumns: [
				salesReturnAuthorization.organizationId,
				salesReturnAuthorization.id,
			],
			name: "sales_return_authorization_line_parent_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.orderLineId],
			foreignColumns: [salesOrderLine.organizationId, salesOrderLine.id],
			name: "sales_return_authorization_line_order_line_fk",
		}),
		check(
			"sales_return_authorization_line_quantity_ck",
			sql`${t.quantity} > 0`,
		),
		check(
			"sales_return_authorization_line_disposition_ck",
			sql`${t.requestedDisposition} IN ('refund','replacement','repair','reject')`,
		),
		check("sales_return_authorization_line_version_ck", sql`${t.version} > 0`),
	],
);
