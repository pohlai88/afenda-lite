import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { mdItem, mdWarehouse } from "./master-data";

/**
 * Receiving transactional documents — FK masters in `@afenda/master-data`.
 * Source documents are referenced by identity while receipt-time values are snapshotted.
 */
export const goodsReceipt = pgTable(
	"goods_receipt",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		/** draft | posted | cancelled */
		status: text("status").notNull().default("draft"),
		/** purchase_order (v1) */
		sourceType: text("source_type").notNull(),
		sourceId: uuid("source_id"),
		warehouseId: uuid("warehouse_id")
			.notNull()
			.references(() => mdWarehouse.id),
		warehouseCode: text("warehouse_code").notNull(),
		warehouseName: text("warehouse_name").notNull(),
		notes: text("notes"),
		reversesReceiptId: uuid("reverses_receipt_id"),
		reversedByReceiptId: uuid("reversed_by_receipt_id"),
		reverseReason: text("reverse_reason"),
		/** not_applicable | pending | applied | failed */
		inventoryApplicationStatus: text("inventory_application_status")
			.notNull()
			.default("not_applicable"),
		inventoryMovementId: uuid("inventory_movement_id"),
		inventoryApplicationError: text("inventory_application_error"),
		createIdempotencyKey: text("create_idempotency_key"),
		postIdempotencyKey: text("post_idempotency_key"),
		cancelIdempotencyKey: text("cancel_idempotency_key"),
		reverseIdempotencyKey: text("reverse_idempotency_key"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		postedAt: timestamp("posted_at", { withTimezone: true }),
		postedBy: text("posted_by"),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
		cancelledBy: text("cancelled_by"),
		closedAt: timestamp("closed_at", { withTimezone: true }),
		closedBy: text("closed_by"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("goods_receipt_org_id_idx").on(t.organizationId, t.id),
		index("goods_receipt_org_status_idx").on(t.organizationId, t.status),
		index("goods_receipt_org_source_idx").on(
			t.organizationId,
			t.sourceType,
			t.sourceId,
		),
		index("goods_receipt_org_inventory_status_idx").on(
			t.organizationId,
			t.inventoryApplicationStatus,
		),
		uniqueIndex("goods_receipt_org_normalized_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
	],
);

export const goodsReceiptLine = pgTable(
	"goods_receipt_line",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		goodsReceiptId: uuid("goods_receipt_id")
			.notNull()
			.references(() => goodsReceipt.id),
		lineNo: integer("line_no").notNull(),
		itemId: uuid("item_id")
			.notNull()
			.references(() => mdItem.id),
		itemCode: text("item_code").notNull(),
		itemName: text("item_name").notNull(),
		baseUomId: uuid("base_uom_id").notNull(),
		baseUomCode: text("base_uom_code").notNull(),
		quantityOrdered: text("quantity_ordered"),
		quantityExpected: text("quantity_expected"),
		quantityReceived: text("quantity_received").notNull(),
		quantityAccepted: text("quantity_accepted").notNull(),
		quantityRejected: text("quantity_rejected").notNull().default("0"),
		quantityDamaged: text("quantity_damaged").notNull().default("0"),
		purchaseOrderLineId: uuid("purchase_order_line_id"),
		lineIdempotencyKey: text("line_idempotency_key"),
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
		index("goods_receipt_line_org_id_idx").on(t.organizationId, t.id),
		index("goods_receipt_line_org_receipt_idx").on(
			t.organizationId,
			t.goodsReceiptId,
		),
		index("goods_receipt_line_org_item_idx").on(t.organizationId, t.itemId),
		index("goods_receipt_line_org_po_line_idx").on(
			t.organizationId,
			t.purchaseOrderLineId,
		),
		uniqueIndex("goods_receipt_line_org_receipt_line_no_uidx").on(
			t.organizationId,
			t.goodsReceiptId,
			t.lineNo,
		),
	],
);

export const receivingDiscrepancy = pgTable(
	"receiving_discrepancy",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		goodsReceiptId: uuid("goods_receipt_id")
			.notNull()
			.references(() => goodsReceipt.id),
		goodsReceiptLineId: uuid("goods_receipt_line_id").references(
			() => goodsReceiptLine.id,
		),
		discrepancyType: text("discrepancy_type").notNull(),
		quantity: text("quantity").notNull(),
		notes: text("notes"),
		/** open | resolved */
		status: text("status").notNull().default("open"),
		resolution: text("resolution"),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
		resolvedBy: text("resolved_by"),
		recordIdempotencyKey: text("record_idempotency_key"),
		resolveIdempotencyKey: text("resolve_idempotency_key"),
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
		index("receiving_discrepancy_org_receipt_idx").on(
			t.organizationId,
			t.goodsReceiptId,
		),
	],
);
