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
import { purchaseOrder } from "./purchasing";
import { goodsReceipt } from "./receiving";

/** Payables documents, three-way matching, and supplier balance state. */
export const supplierInvoice = pgTable(
	"supplier_invoice",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		/** draft | matched | posted | cancelled */
		status: text("status").notNull().default("draft"),
		supplierPartyId: uuid("supplier_party_id")
			.notNull()
			.references(() => mdParty.id),
		supplierPartyCode: text("supplier_party_code").notNull(),
		supplierPartyName: text("supplier_party_name").notNull(),
		currencyCode: text("currency_code").notNull(),
		purchaseOrderId: uuid("purchase_order_id").references(
			() => purchaseOrder.id,
		),
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
		index("supplier_invoice_org_id_idx").on(t.organizationId, t.id),
		index("supplier_invoice_org_status_idx").on(t.organizationId, t.status),
		index("supplier_invoice_org_supplier_idx").on(
			t.organizationId,
			t.supplierPartyId,
		),
		index("supplier_invoice_org_purchase_order_idx").on(
			t.organizationId,
			t.purchaseOrderId,
		),
		uniqueIndex("supplier_invoice_org_normalized_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
	],
);

export const supplierInvoiceLine = pgTable(
	"supplier_invoice_line",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		invoiceId: uuid("invoice_id")
			.notNull()
			.references(() => supplierInvoice.id),
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
		index("supplier_invoice_line_org_id_idx").on(t.organizationId, t.id),
		index("supplier_invoice_line_org_invoice_idx").on(
			t.organizationId,
			t.invoiceId,
		),
		index("supplier_invoice_line_org_item_idx").on(t.organizationId, t.itemId),
		uniqueIndex("supplier_invoice_line_org_invoice_line_no_uidx").on(
			t.organizationId,
			t.invoiceId,
			t.lineNo,
		),
	],
);

export const supplierCreditNote = pgTable(
	"supplier_credit_note",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		/** draft | posted | cancelled */
		status: text("status").notNull().default("draft"),
		supplierPartyId: uuid("supplier_party_id")
			.notNull()
			.references(() => mdParty.id),
		supplierPartyCode: text("supplier_party_code").notNull(),
		supplierPartyName: text("supplier_party_name").notNull(),
		supplierInvoiceId: uuid("supplier_invoice_id").references(
			() => supplierInvoice.id,
		),
		currencyCode: text("currency_code").notNull(),
		amount: text("amount").notNull().default("0"),
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
		index("supplier_credit_note_org_id_idx").on(t.organizationId, t.id),
		index("supplier_credit_note_org_status_idx").on(t.organizationId, t.status),
		index("supplier_credit_note_org_supplier_idx").on(
			t.organizationId,
			t.supplierPartyId,
		),
		index("supplier_credit_note_org_invoice_idx").on(
			t.organizationId,
			t.supplierInvoiceId,
		),
		uniqueIndex("supplier_credit_note_org_normalized_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
	],
);

export const supplierCreditNoteLine = pgTable(
	"supplier_credit_note_line",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		creditNoteId: uuid("credit_note_id")
			.notNull()
			.references(() => supplierCreditNote.id),
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
		index("supplier_credit_note_line_org_id_idx").on(t.organizationId, t.id),
		index("supplier_credit_note_line_org_credit_note_idx").on(
			t.organizationId,
			t.creditNoteId,
		),
		uniqueIndex("supplier_credit_note_line_org_credit_note_line_no_uidx").on(
			t.organizationId,
			t.creditNoteId,
			t.lineNo,
		),
	],
);

export const supplierAllocation = pgTable(
	"supplier_allocation",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		supplierPartyId: uuid("supplier_party_id")
			.notNull()
			.references(() => mdParty.id),
		supplierInvoiceId: uuid("supplier_invoice_id")
			.notNull()
			.references(() => supplierInvoice.id),
		paymentId: uuid("payment_id"),
		paymentApplicationInstructionId: uuid(
			"payment_application_instruction_id",
		),
		creditNoteId: uuid("credit_note_id").references(
			() => supplierCreditNote.id,
		),
		/** active | reversed */
		status: text("status").notNull().default("active"),
		amount: text("amount").notNull(),
		allocatedAt: timestamp("allocated_at", { withTimezone: true }).notNull(),
		allocatedBy: text("allocated_by").notNull(),
		applyIdempotencyKey: text("apply_idempotency_key"),
		reversedAt: timestamp("reversed_at", { withTimezone: true }),
		reversedBy: text("reversed_by"),
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
		index("supplier_allocation_org_id_idx").on(t.organizationId, t.id),
		index("supplier_allocation_org_supplier_idx").on(
			t.organizationId,
			t.supplierPartyId,
		),
		index("supplier_allocation_org_invoice_idx").on(
			t.organizationId,
			t.supplierInvoiceId,
		),
		index("supplier_allocation_org_credit_note_idx").on(
			t.organizationId,
			t.creditNoteId,
		),
	],
);

export const threeWayMatchResult = pgTable(
	"three_way_match_result",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		supplierInvoiceId: uuid("supplier_invoice_id")
			.notNull()
			.references(() => supplierInvoice.id),
		purchaseOrderId: uuid("purchase_order_id").references(
			() => purchaseOrder.id,
		),
		goodsReceiptId: uuid("goods_receipt_id").references(() => goodsReceipt.id),
		/** pending | matched | matched_with_tolerance | exception */
		matchStatus: text("match_status").notNull(),
		notes: text("notes"),
		evidenceJson: text("evidence_json"),
		poEvidenceVersion: integer("po_evidence_version"),
		grEvidenceVersion: integer("gr_evidence_version"),
		matchedAt: timestamp("matched_at", { withTimezone: true }),
		matchedBy: text("matched_by"),
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
		index("three_way_match_result_org_id_idx").on(t.organizationId, t.id),
		index("three_way_match_result_org_invoice_idx").on(
			t.organizationId,
			t.supplierInvoiceId,
		),
		index("three_way_match_result_org_purchase_order_idx").on(
			t.organizationId,
			t.purchaseOrderId,
		),
		index("three_way_match_result_org_goods_receipt_idx").on(
			t.organizationId,
			t.goodsReceiptId,
		),
	],
);

export const supplierBalanceProjection = pgTable(
	"supplier_balance_projection",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		supplierPartyId: uuid("supplier_party_id")
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
		index("supplier_balance_projection_org_id_idx").on(t.organizationId, t.id),
		uniqueIndex("supplier_balance_projection_org_supplier_currency_uidx").on(
			t.organizationId,
			t.supplierPartyId,
			t.currencyCode,
		),
	],
);
