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

import { mdItem, mdParty, mdPaymentTerm, mdWarehouse } from "./master-data";

/**
 * Purchasing transactional documents — FK masters in `@afenda/master-data`.
 * Supplier = md_party with active supplier role (enforced in @afenda/purchasing).
 */
export const purchaseOrder = pgTable(
	"purchase_order",
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
		paymentTermId: uuid("payment_term_id").references(() => mdPaymentTerm.id),
		paymentTermCode: text("payment_term_code"),
		netDays: integer("net_days"),
		warehouseId: uuid("warehouse_id").references(() => mdWarehouse.id),
		warehouseCode: text("warehouse_code"),
		warehouseName: text("warehouse_name"),
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
		index("purchase_order_org_id_idx").on(t.organizationId, t.id),
		index("purchase_order_org_status_idx").on(t.organizationId, t.status),
		index("purchase_order_org_party_idx").on(t.organizationId, t.partyId),
		index("purchase_order_org_updated_at_idx").on(
			t.organizationId,
			t.updatedAt,
			t.id,
		),
		uniqueIndex("purchase_order_org_normalized_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
	],
);

export const purchaseOrderLine = pgTable(
	"purchase_order_line",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		orderId: uuid("order_id")
			.notNull()
			.references(() => purchaseOrder.id),
		lineNo: integer("line_no").notNull(),
		itemId: uuid("item_id")
			.notNull()
			.references(() => mdItem.id),
		itemCode: text("item_code").notNull(),
		itemName: text("item_name").notNull(),
		baseUomId: uuid("base_uom_id").notNull(),
		baseUomCode: text("base_uom_code").notNull(),
		quantity: numeric("quantity", { precision: 24, scale: 12 }).notNull(),
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
		index("purchase_order_line_org_id_idx").on(t.organizationId, t.id),
		index("purchase_order_line_org_order_idx").on(t.organizationId, t.orderId),
		index("purchase_order_line_org_item_idx").on(t.organizationId, t.itemId),
		uniqueIndex("purchase_order_line_org_order_line_no_uidx").on(
			t.organizationId,
			t.orderId,
			t.lineNo,
		),
	],
);
