import { describe, expect, it } from "vitest";
import { createMemoryInventoryStore } from "../src/memory-store";
import {
	createStockMovement,
	getStockAvailability,
	getStockMovementById,
	listStockMovements,
} from "../src/movement";
import { INVENTORY_PERMISSION_READ } from "../src/permissions";
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

describe("@afenda/inventory authorization", () => {
	it("denies mutations without inventory.manage and queries without inventory.read", async () => {
		const store = createMemoryInventoryStore();
		const ports = createMemoryMutationPorts();
		const masters = createMemoryMasterLookup({
			items: [seedItem(ORG, ITEM, "SKU-A", UOM, "active")],
			warehouses: [seedWarehouse(ORG, WH, "WH-A", "active")],
			uoms: [seedUom(UOM, "EA")],
		});
		const readOnly = createGrantingInventoryAuthorization([
			INVENTORY_PERMISSION_READ,
		]);
		const none = createGrantingInventoryAuthorization([]);

		const createDenied = await createStockMovement(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-auth-1",
				code: "RCPT-AUTH-1",
				movementType: "receipt",
				warehouseId: WH,
			},
			{ store, ports, masters, authorization: readOnly },
		);
		expect(createDenied.ok).toBe(false);
		if (!createDenied.ok) {
			expect(createDenied.code).toBe("FORBIDDEN");
		}

		const missingPort = await createStockMovement(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-auth-2",
				code: "RCPT-AUTH-2",
				movementType: "receipt",
				warehouseId: WH,
			},
			{ store, ports, masters },
		);
		expect(missingPort.ok).toBe(false);
		if (!missingPort.ok) {
			expect(missingPort.code).toBe("UNAUTHORIZED");
		}

		const getDenied = await getStockMovementById(
			{ organizationId: ORG, actorUserId: "user-1", id: ITEM },
			{ store, ports, masters, authorization: none },
		);
		expect(getDenied.ok).toBe(false);
		if (!getDenied.ok) {
			expect(getDenied.code).toBe("FORBIDDEN");
		}

		const listDenied = await listStockMovements(
			{ organizationId: ORG, actorUserId: "user-1", page: 1, pageSize: 10 },
			{ store, ports, masters, authorization: none },
		);
		expect(listDenied.ok).toBe(false);
		if (!listDenied.ok) {
			expect(listDenied.code).toBe("FORBIDDEN");
		}

		const availabilityDenied = await getStockAvailability(
			{ organizationId: ORG, actorUserId: "user-1" },
			{ store, ports, masters, authorization: none },
		);
		expect(availabilityDenied.ok).toBe(false);
		if (!availabilityDenied.ok) {
			expect(availabilityDenied.code).toBe("FORBIDDEN");
		}
	});
});
