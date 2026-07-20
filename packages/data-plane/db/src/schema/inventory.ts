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

import { mdItem, mdWarehouse } from "./master-data";

/**
 * Inventory transactional stock — FK masters in `@afenda/master-data`.
 * Sole mutation owner: `@afenda/inventory` (on_hand / available / reserved / ledger / movement).
 */
export const stockMovement = pgTable(
	"stock_movement",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		/** receipt | issue | transfer | adjustment | reservation | reservation_release */
		movementType: text("movement_type").notNull(),
		/** draft | posted */
		status: text("status").notNull().default("draft"),
		warehouseId: uuid("warehouse_id").references(() => mdWarehouse.id),
		warehouseCode: text("warehouse_code"),
		warehouseName: text("warehouse_name"),
		fromWarehouseId: uuid("from_warehouse_id").references(() => mdWarehouse.id),
		fromWarehouseCode: text("from_warehouse_code"),
		fromWarehouseName: text("from_warehouse_name"),
		toWarehouseId: uuid("to_warehouse_id").references(() => mdWarehouse.id),
		toWarehouseCode: text("to_warehouse_code"),
		toWarehouseName: text("to_warehouse_name"),
		/** For reservation_release movements — links to the reservation being released. */
		reservationId: uuid("reservation_id"),
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
		index("stock_movement_org_id_idx").on(t.organizationId, t.id),
		index("stock_movement_org_status_idx").on(t.organizationId, t.status),
		index("stock_movement_org_type_idx").on(t.organizationId, t.movementType),
		index("stock_movement_org_updated_at_idx").on(
			t.organizationId,
			t.updatedAt,
			t.id,
		),
		uniqueIndex("stock_movement_org_normalized_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
	],
);

export const stockMovementLine = pgTable(
	"stock_movement_line",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		movementId: uuid("movement_id")
			.notNull()
			.references(() => stockMovement.id),
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
		index("stock_movement_line_org_id_idx").on(t.organizationId, t.id),
		index("stock_movement_line_org_movement_idx").on(
			t.organizationId,
			t.movementId,
		),
		index("stock_movement_line_org_item_idx").on(t.organizationId, t.itemId),
		uniqueIndex("stock_movement_line_org_movement_line_no_uidx").on(
			t.organizationId,
			t.movementId,
			t.lineNo,
		),
	],
);

export const stockBalance = pgTable(
	"stock_balance",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		warehouseId: uuid("warehouse_id")
			.notNull()
			.references(() => mdWarehouse.id),
		warehouseCode: text("warehouse_code").notNull(),
		itemId: uuid("item_id")
			.notNull()
			.references(() => mdItem.id),
		itemCode: text("item_code").notNull(),
		onHand: numeric("on_hand", { precision: 24, scale: 12 }).notNull().default("0"),
		reserved: numeric("reserved", { precision: 24, scale: 12 })
			.notNull()
			.default("0"),
		available: numeric("available", { precision: 24, scale: 12 })
			.notNull()
			.default("0"),
		version: integer("version").notNull().default(1),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("stock_balance_org_id_idx").on(t.organizationId, t.id),
		index("stock_balance_org_warehouse_idx").on(
			t.organizationId,
			t.warehouseId,
		),
		index("stock_balance_org_item_idx").on(t.organizationId, t.itemId),
		uniqueIndex("stock_balance_org_warehouse_item_uidx").on(
			t.organizationId,
			t.warehouseId,
			t.itemId,
		),
	],
);

export const stockLedgerEntry = pgTable(
	"stock_ledger_entry",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		movementId: uuid("movement_id")
			.notNull()
			.references(() => stockMovement.id),
		movementLineId: uuid("movement_line_id").references(
			() => stockMovementLine.id,
		),
		movementCode: text("movement_code").notNull(),
		movementType: text("movement_type").notNull(),
		warehouseId: uuid("warehouse_id")
			.notNull()
			.references(() => mdWarehouse.id),
		warehouseCode: text("warehouse_code").notNull(),
		itemId: uuid("item_id")
			.notNull()
			.references(() => mdItem.id),
		itemCode: text("item_code").notNull(),
		quantityDelta: numeric("quantity_delta", {
			precision: 24,
			scale: 12,
		}).notNull(),
		onHandAfter: numeric("on_hand_after", {
			precision: 24,
			scale: 12,
		}).notNull(),
		reservedAfter: numeric("reserved_after", {
			precision: 24,
			scale: 12,
		}).notNull(),
		availableAfter: numeric("available_after", {
			precision: 24,
			scale: 12,
		}).notNull(),
		actorUserId: text("actor_user_id").notNull(),
		correlationId: text("correlation_id").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("stock_ledger_entry_org_id_idx").on(t.organizationId, t.id),
		index("stock_ledger_entry_org_movement_idx").on(
			t.organizationId,
			t.movementId,
		),
		index("stock_ledger_entry_org_warehouse_item_idx").on(
			t.organizationId,
			t.warehouseId,
			t.itemId,
		),
		index("stock_ledger_entry_org_created_at_idx").on(
			t.organizationId,
			t.createdAt,
			t.id,
		),
	],
);

export const stockReservation = pgTable(
	"stock_reservation",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		/** active | released */
		status: text("status").notNull().default("active"),
		warehouseId: uuid("warehouse_id")
			.notNull()
			.references(() => mdWarehouse.id),
		warehouseCode: text("warehouse_code").notNull(),
		warehouseName: text("warehouse_name").notNull(),
		itemId: uuid("item_id")
			.notNull()
			.references(() => mdItem.id),
		itemCode: text("item_code").notNull(),
		itemName: text("item_name").notNull(),
		baseUomId: uuid("base_uom_id").notNull(),
		baseUomCode: text("base_uom_code").notNull(),
		quantity: numeric("quantity", { precision: 24, scale: 12 }).notNull(),
		sourceMovementId: uuid("source_movement_id").references(
			() => stockMovement.id,
		),
		releaseMovementId: uuid("release_movement_id").references(
			() => stockMovement.id,
		),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		releasedAt: timestamp("released_at", { withTimezone: true }),
		releasedBy: text("released_by"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("stock_reservation_org_id_idx").on(t.organizationId, t.id),
		index("stock_reservation_org_status_idx").on(t.organizationId, t.status),
		index("stock_reservation_org_warehouse_item_idx").on(
			t.organizationId,
			t.warehouseId,
			t.itemId,
		),
		uniqueIndex("stock_reservation_org_normalized_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
	],
);
