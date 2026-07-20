import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { mdItem, mdParty } from "./master-data";
import { salesOrder } from "./sales";

/**
 * Receivables documents and customer balance state.
 * Customer and item values are snapshotted at document time.
 */
export const salesInvoice = pgTable(
	"sales_invoice",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		/** draft | posted | cancelled | allocated */
		status: text("status").notNull().default("draft"),
		customerPartyId: uuid("customer_party_id")
			.notNull()
			.references(() => mdParty.id),
		customerPartyCode: text("customer_party_code").notNull(),
		customerPartyName: text("customer_party_name").notNull(),
		currencyCode: text("currency_code").notNull(),
		salesOrderId: uuid("sales_order_id").references(() => salesOrder.id),
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
		index("sales_invoice_org_id_idx").on(t.organizationId, t.id),
		index("sales_invoice_org_status_idx").on(t.organizationId, t.status),
		index("sales_invoice_org_customer_idx").on(
			t.organizationId,
			t.customerPartyId,
		),
		index("sales_invoice_org_sales_order_idx").on(
			t.organizationId,
			t.salesOrderId,
		),
		uniqueIndex("sales_invoice_org_normalized_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
	],
);

export const salesInvoiceLine = pgTable(
	"sales_invoice_line",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		invoiceId: uuid("invoice_id")
			.notNull()
			.references(() => salesInvoice.id),
		lineNo: integer("line_no").notNull(),
		itemId: uuid("item_id")
			.notNull()
			.references(() => mdItem.id),
		itemCode: text("item_code").notNull(),
		itemName: text("item_name").notNull(),
		quantity: text("quantity").notNull(),
		unitPrice: text("unit_price").notNull(),
		lineAmount: text("line_amount").notNull(),
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
		index("sales_invoice_line_org_id_idx").on(t.organizationId, t.id),
		index("sales_invoice_line_org_invoice_idx").on(
			t.organizationId,
			t.invoiceId,
		),
		index("sales_invoice_line_org_item_idx").on(t.organizationId, t.itemId),
		uniqueIndex("sales_invoice_line_org_invoice_line_no_uidx").on(
			t.organizationId,
			t.invoiceId,
			t.lineNo,
		),
	],
);

export const salesCreditNote = pgTable(
	"sales_credit_note",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		/** draft | posted | cancelled */
		status: text("status").notNull().default("draft"),
		customerPartyId: uuid("customer_party_id")
			.notNull()
			.references(() => mdParty.id),
		customerPartyCode: text("customer_party_code").notNull(),
		customerPartyName: text("customer_party_name").notNull(),
		salesInvoiceId: uuid("sales_invoice_id").references(() => salesInvoice.id),
		currencyCode: text("currency_code").notNull(),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		postedAt: timestamp("posted_at", { withTimezone: true }),
		postedBy: text("posted_by"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("sales_credit_note_org_id_idx").on(t.organizationId, t.id),
		index("sales_credit_note_org_status_idx").on(t.organizationId, t.status),
		index("sales_credit_note_org_customer_idx").on(
			t.organizationId,
			t.customerPartyId,
		),
		index("sales_credit_note_org_invoice_idx").on(
			t.organizationId,
			t.salesInvoiceId,
		),
		uniqueIndex("sales_credit_note_org_normalized_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
	],
);

export const customerAllocation = pgTable(
	"customer_allocation",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		customerPartyId: uuid("customer_party_id")
			.notNull()
			.references(() => mdParty.id),
		salesInvoiceId: uuid("sales_invoice_id")
			.notNull()
			.references(() => salesInvoice.id),
		paymentId: uuid("payment_id"),
		creditNoteId: uuid("credit_note_id").references(() => salesCreditNote.id),
		amount: text("amount").notNull(),
		allocatedAt: timestamp("allocated_at", { withTimezone: true }).notNull(),
		allocatedBy: text("allocated_by").notNull(),
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
		index("customer_allocation_org_id_idx").on(t.organizationId, t.id),
		index("customer_allocation_org_customer_idx").on(
			t.organizationId,
			t.customerPartyId,
		),
		index("customer_allocation_org_invoice_idx").on(
			t.organizationId,
			t.salesInvoiceId,
		),
		index("customer_allocation_org_credit_note_idx").on(
			t.organizationId,
			t.creditNoteId,
		),
	],
);

export const customerBalanceProjection = pgTable(
	"customer_balance_projection",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		customerPartyId: uuid("customer_party_id")
			.notNull()
			.references(() => mdParty.id),
		currencyCode: text("currency_code").notNull(),
		openBalance: text("open_balance").notNull().default("0"),
		version: integer("version").notNull().default(1),
		updatedBy: text("updated_by").notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdBy: text("created_by").notNull(),
	},
	(t) => [
		index("customer_balance_projection_org_id_idx").on(t.organizationId, t.id),
		uniqueIndex("customer_balance_projection_org_customer_currency_uidx").on(
			t.organizationId,
			t.customerPartyId,
			t.currencyCode,
		),
	],
);
