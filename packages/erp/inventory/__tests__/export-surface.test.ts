import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const srcRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../src",
);

/** Feature-first root allowlist (ERP-SCAFFOLDING §3). */
const ALLOWED_ROOTS = [
	"composition",
	"facade",
	"features",
	"index.ts",
	"kernel",
	"testing",
];

/** Frozen public runtime exports of "@afenda/inventory". */
const PUBLIC_RUNTIME_EXPORTS = [
	"INVENTORY_MOVEMENT_SOURCES",
	"INVENTORY_PERMISSION_ADJUSTMENT_POST",
	"INVENTORY_PERMISSION_AVAILABILITY_READ",
	"INVENTORY_PERMISSION_CODES",
	"INVENTORY_PERMISSION_MOVEMENT_CANCEL",
	"INVENTORY_PERMISSION_MOVEMENT_CREATE",
	"INVENTORY_PERMISSION_MOVEMENT_POST",
	"INVENTORY_PERMISSION_MOVEMENT_READ",
	"INVENTORY_PERMISSION_RESERVATION_CREATE",
	"INVENTORY_PERMISSION_RESERVATION_RELEASE",
	"STOCK_MOVEMENT_STATUSES",
	"STOCK_MOVEMENT_TYPES",
	"STOCK_RESERVATION_STATUSES",
	"addStockMovementLine",
	"addStockMovementLineInputSchema",
	"cancelReservation",
	"cancelReservationInputSchema",
	"cancelStockMovement",
	"cancelStockMovementInputSchema",
	"createMasterDataLookupPort",
	"createReversalMovement",
	"createReversalMovementInputSchema",
	"createStockMovement",
	"createStockMovementInputSchema",
	"expireReservation",
	"expireReservationInputSchema",
	"getStockAvailability",
	"getStockAvailabilityInputSchema",
	"getStockMovementById",
	"getStockMovementByIdInputSchema",
	"listStockMovements",
	"listStockMovementsInputSchema",
	"listStockReservations",
	"listStockReservationsInputSchema",
	"postStockMovement",
	"postStockMovementInputSchema",
	"reconcileInventory",
	"releaseReservation",
	"releaseReservationInputSchema",
	"reservationTerminalEventType",
	"reserveStock",
	"reserveStockInputSchema",
	"stockBalanceIdSchema",
	"stockMovementIdSchema",
	"stockMovementLineIdSchema",
	"stockReservationIdSchema",
];

describe("inventory export surface", () => {
	it("keeps src/ root on the feature-first allowlist", () => {
		const entries = readdirSync(srcRoot).sort();
		expect(entries).toEqual([...ALLOWED_ROOTS].sort());
	});

	it("keeps every frozen public runtime export available", {
		timeout: 30_000,
	}, async () => {
		const module = await import("../src/index");
		const actual = Object.keys(module).sort();
		const missing = PUBLIC_RUNTIME_EXPORTS.filter(
			(name) => !actual.includes(name),
		);
		expect(missing).toEqual([]);
	});
});
