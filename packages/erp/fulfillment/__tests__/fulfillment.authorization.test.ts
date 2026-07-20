import { describe, expect, it } from "vitest";

import {
	createDraftDelivery,
	getDeliveryById,
	listDeliveries,
} from "../src/delivery";
import { createMemoryFulfillmentStore } from "../src/memory-store";
import { FULFILLMENT_PERMISSION_READ } from "../src/permissions";
import { createGrantingFulfillmentAuthorization } from "./helpers/memory-authorization";
import {
	createMemoryMasterLookup,
	seedWarehouse,
} from "./helpers/memory-masters";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG = "org-a";
const WAREHOUSE = "40000000-0000-4000-8000-000000000001";

describe("@afenda/fulfillment authorization", () => {
	it("separates fulfillment.manage mutations from fulfillment.read queries", async () => {
		const store = createMemoryFulfillmentStore();
		const ports = createMemoryMutationPorts();
		const masters = createMemoryMasterLookup({
			warehouses: [seedWarehouse(ORG, WAREHOUSE, "WH-A")],
		});
		const readOnly = createGrantingFulfillmentAuthorization([
			FULFILLMENT_PERMISSION_READ,
		]);
		const none = createGrantingFulfillmentAuthorization([]);
		const deniedCreate = await createDraftDelivery(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-auth",
				code: "DLV-AUTH",
				warehouseId: WAREHOUSE,
			},
			{ store, ports, masters, authorization: readOnly },
		);
		expect(deniedCreate.ok).toBe(false);
		if (!deniedCreate.ok) expect(deniedCreate.code).toBe("FORBIDDEN");
		const deniedGet = await getDeliveryById(
			{ organizationId: ORG, actorUserId: "user-1", id: WAREHOUSE },
			{ store, ports, masters, authorization: none },
		);
		expect(deniedGet.ok).toBe(false);
		const deniedList = await listDeliveries(
			{ organizationId: ORG, actorUserId: "user-1" },
			{ store, ports, masters, authorization: none },
		);
		expect(deniedList.ok).toBe(false);
	});
});
