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
 * Fulfillment delivery documents own shipment execution records.
 * Sales sources are referenced by identity; warehouse, party, item, and UOM
 * values are snapshotted without writing Sales or Inventory tables.
 */
export const delivery = pgTable(
	"delivery",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		/** draft | picking | packed | posted | delivered | closed | cancelled */
		status: text("status").notNull().default("draft"),
		salesOrderId: uuid("sales_order_id"),
		warehouseId: uuid("warehouse_id")
			.notNull()
			.references(() => mdWarehouse.id),
		warehouseCode: text("warehouse_code").notNull(),
		warehouseName: text("warehouse_name").notNull(),
		shipToPartyId: uuid("ship_to_party_id"),
		shipToPartyCode: text("ship_to_party_code"),
		shipToPartyName: text("ship_to_party_name"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		postedAt: timestamp("posted_at", { withTimezone: true }),
		postedBy: text("posted_by"),
		deliveredAt: timestamp("delivered_at", { withTimezone: true }),
		deliveredBy: text("delivered_by"),
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
		index("delivery_org_id_idx").on(t.organizationId, t.id),
		index("delivery_org_status_idx").on(t.organizationId, t.status),
		index("delivery_org_sales_order_idx").on(t.organizationId, t.salesOrderId),
		index("delivery_org_warehouse_idx").on(t.organizationId, t.warehouseId),
		uniqueIndex("delivery_org_normalized_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
	],
);

export const deliveryLine = pgTable(
	"delivery_line",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		deliveryId: uuid("delivery_id")
			.notNull()
			.references(() => delivery.id),
		lineNo: integer("line_no").notNull(),
		itemId: uuid("item_id")
			.notNull()
			.references(() => mdItem.id),
		itemCode: text("item_code").notNull(),
		itemName: text("item_name").notNull(),
		baseUomId: uuid("base_uom_id").notNull(),
		baseUomCode: text("base_uom_code").notNull(),
		quantityOrdered: text("quantity_ordered"),
		quantityToDeliver: text("quantity_to_deliver").notNull(),
		salesOrderLineId: uuid("sales_order_line_id"),
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
		index("delivery_line_org_id_idx").on(t.organizationId, t.id),
		index("delivery_line_org_delivery_idx").on(t.organizationId, t.deliveryId),
		index("delivery_line_org_item_idx").on(t.organizationId, t.itemId),
		uniqueIndex("delivery_line_org_delivery_line_no_uidx").on(
			t.organizationId,
			t.deliveryId,
			t.lineNo,
		),
	],
);

export const deliveryPick = pgTable(
	"delivery_pick",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		deliveryId: uuid("delivery_id")
			.notNull()
			.references(() => delivery.id),
		deliveryLineId: uuid("delivery_line_id").references(() => deliveryLine.id),
		quantityPicked: text("quantity_picked").notNull(),
		pickedAt: timestamp("picked_at", { withTimezone: true }).notNull(),
		pickedBy: text("picked_by").notNull(),
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
		index("delivery_pick_org_delivery_idx").on(t.organizationId, t.deliveryId),
	],
);

export const deliveryPack = pgTable(
	"delivery_pack",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		deliveryId: uuid("delivery_id")
			.notNull()
			.references(() => delivery.id),
		packageCode: text("package_code"),
		notes: text("notes"),
		packedAt: timestamp("packed_at", { withTimezone: true }).notNull(),
		packedBy: text("packed_by").notNull(),
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
		index("delivery_pack_org_delivery_idx").on(t.organizationId, t.deliveryId),
	],
);

export const proofOfDelivery = pgTable(
	"proof_of_delivery",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		deliveryId: uuid("delivery_id")
			.notNull()
			.references(() => delivery.id),
		receivedByName: text("received_by_name").notNull(),
		notes: text("notes"),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedBy: text("recorded_by").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
	},
	(t) => [
		uniqueIndex("proof_of_delivery_org_delivery_uidx").on(
			t.organizationId,
			t.deliveryId,
		),
	],
);
