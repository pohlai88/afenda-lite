import { describe, expect, it } from "vitest";
import { createMemoryPurchasingStore } from "../src/memory-store";
import {
	createDraftPurchaseOrder,
	getPurchaseOrderById,
	listPurchaseOrders,
} from "../src/order";
import { PURCHASING_PERMISSION_READ } from "../src/permissions";
import { createGrantingPurchasingAuthorization } from "./helpers/memory-authorization";
import {
	createMemoryMasterLookup,
	seedParty,
	seedUom,
} from "./helpers/memory-masters";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG = "org-a";
const PARTY = "10000000-0000-4000-8000-000000000001";
const UOM = "b1000000-0000-4000-8000-000000000001";

describe("@afenda/purchasing authorization", () => {
	it("denies mutations without purchasing.manage and queries without purchasing.read", async () => {
		const store = createMemoryPurchasingStore();
		const ports = createMemoryMutationPorts();
		const masters = createMemoryMasterLookup({
			parties: [seedParty(ORG, PARTY, "SUP-A", "active")],
			uoms: [seedUom(UOM, "EA")],
			supplierPartyIds: [PARTY],
		});
		const readOnly = createGrantingPurchasingAuthorization([
			PURCHASING_PERMISSION_READ,
		]);
		const none = createGrantingPurchasingAuthorization([]);

		const createDenied = await createDraftPurchaseOrder(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-auth-1",
				code: "PO-AUTH-1",
				partyId: PARTY,
			},
			{ store, ports, masters, authorization: readOnly },
		);
		expect(createDenied.ok).toBe(false);
		if (!createDenied.ok) {
			expect(createDenied.code).toBe("FORBIDDEN");
		}

		const missingPort = await createDraftPurchaseOrder(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-auth-2",
				code: "PO-AUTH-2",
				partyId: PARTY,
			},
			{ store, ports, masters },
		);
		expect(missingPort.ok).toBe(false);
		if (!missingPort.ok) {
			expect(missingPort.code).toBe("UNAUTHORIZED");
		}

		const getDenied = await getPurchaseOrderById(
			{ organizationId: ORG, actorUserId: "user-1", id: PARTY },
			{ store, ports, masters, authorization: none },
		);
		expect(getDenied.ok).toBe(false);
		if (!getDenied.ok) {
			expect(getDenied.code).toBe("FORBIDDEN");
		}

		const listDenied = await listPurchaseOrders(
			{ organizationId: ORG, actorUserId: "user-1", page: 1, pageSize: 10 },
			{ store, ports, masters, authorization: none },
		);
		expect(listDenied.ok).toBe(false);
		if (!listDenied.ok) {
			expect(listDenied.code).toBe("FORBIDDEN");
		}
	});
});
