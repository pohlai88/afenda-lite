import { describe, expect, it } from "vitest";

import { createMemoryInventoryStore } from "../src/memory-store";
import {
	createStockMovement,
	getStockAvailability,
	getStockMovementById,
} from "../src/movement";
import {
	INVENTORY_PERMISSION_AVAILABILITY_READ,
	INVENTORY_PERMISSION_MOVEMENT_CREATE,
	INVENTORY_PERMISSION_MOVEMENT_READ,
} from "../src/permissions";
import { createGrantingInventoryAuthorization } from "./helpers/memory-authorization";
import {
	createMemoryMasterLookup,
	seedItem,
	seedUom,
	seedWarehouse,
} from "./helpers/memory-masters";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG = "org-a";
const ITEM = "20000000-0000-4000-8000-000000000001";
const WH = "40000000-0000-4000-8000-000000000001";
const UOM = "b1000000-0000-4000-8000-000000000001";

function authHarness() {
	const store = createMemoryInventoryStore();
	const ports = createMemoryMutationPorts();
	const masters = createMemoryMasterLookup({
		items: [seedItem(ORG, ITEM, "SKU-A", UOM, "active")],
		warehouses: [seedWarehouse(ORG, WH, "WH-A", "active")],
		uoms: [seedUom(UOM, "EA")],
	});
	return { store, ports, masters };
}

describe("@afenda/inventory authorization", () => {
	it("denies mutation commands without the required inventory permission", async () => {
		const ctx = authHarness();
		const createDenied = await createStockMovement(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-auth-1",
				idempotencyKey: "auth-create-1",
				code: "RCPT-AUTH-1",
				movementType: "receipt",
				source: "opening_balance",
				warehouseId: WH,
			},
			{
				...ctx,
				authorization: createGrantingInventoryAuthorization([
					INVENTORY_PERMISSION_MOVEMENT_READ,
				]),
			},
		);
		expect(createDenied.ok).toBe(false);
		if (!createDenied.ok) {
			expect(createDenied.code).toBe("FORBIDDEN");
		}
	});

	it("denies when no inventory authorization port is provided", async () => {
		const ctx = authHarness();
		const missingPort = await createStockMovement(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-auth-2",
				idempotencyKey: "auth-create-2",
				code: "RCPT-AUTH-2",
				movementType: "receipt",
				source: "opening_balance",
				warehouseId: WH,
			},
			ctx,
		);
		expect(missingPort.ok).toBe(false);
		if (!missingPort.ok) {
			expect(missingPort.code).toBe("UNAUTHORIZED");
		}
	});

	it("denies queries without the corresponding read permissions", async () => {
		const ctx = authHarness();
		const none = createGrantingInventoryAuthorization([]);
		const getDenied = await getStockMovementById(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-auth-3",
				id: ITEM,
			},
			{ ...ctx, authorization: none },
		);
		expect(getDenied.ok).toBe(false);
		if (!getDenied.ok) {
			expect(getDenied.code).toBe("FORBIDDEN");
		}

		const availabilityDenied = await getStockAvailability(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-auth-4",
			},
			{ ...ctx, authorization: none },
		);
		expect(availabilityDenied.ok).toBe(false);
		if (!availabilityDenied.ok) {
			expect(availabilityDenied.code).toBe("FORBIDDEN");
		}
	});

	it("denies manual adjustments when adjustment permission is missing", async () => {
		const ctx = authHarness();
		const missingAdjustmentGrant = createGrantingInventoryAuthorization([
			INVENTORY_PERMISSION_MOVEMENT_CREATE,
			INVENTORY_PERMISSION_MOVEMENT_READ,
			INVENTORY_PERMISSION_AVAILABILITY_READ,
		]);

		const denied = await createStockMovement(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-auth-5",
				idempotencyKey: "auth-adjustment",
				code: "ADJ-AUTH-1",
				movementType: "adjustment",
				source: "manual_adjustment",
				warehouseId: WH,
				adjustmentReasonCode: "COUNT_CORRECTION",
			},
			{ ...ctx, authorization: missingAdjustmentGrant },
		);
		expect(denied.ok).toBe(false);
		if (!denied.ok) {
			expect(denied.code).toBe("FORBIDDEN");
		}
	});
});
