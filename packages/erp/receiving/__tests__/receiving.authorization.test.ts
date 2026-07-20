import { describe, expect, it } from "vitest";
import { createMemoryReceivingStore } from "../src/memory-store";
import { RECEIVING_PERMISSION_RECEIPT_READ } from "../src/permissions";
import {
	createDraftGoodsReceipt,
	getGoodsReceiptById,
	listGoodsReceipts,
} from "../src/receipt";
import { createGrantingReceivingAuthorization } from "./helpers/memory-authorization";
import {
	createMemoryMasterLookup,
	seedWarehouse,
} from "./helpers/memory-masters";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG = "org-a";
const WAREHOUSE = "40000000-0000-4000-8000-000000000001";
const PO_ID = "50000000-0000-4000-8000-000000000001";

describe("@afenda/receiving authorization", () => {
	it("separates receipt mutations from receipt.read queries", async () => {
		const store = createMemoryReceivingStore();
		const ports = createMemoryMutationPorts();
		const masters = createMemoryMasterLookup({
			warehouses: [seedWarehouse(ORG, WAREHOUSE, "WH-A")],
		});
		const readOnly = createGrantingReceivingAuthorization([
			RECEIVING_PERMISSION_RECEIPT_READ,
		]);
		const none = createGrantingReceivingAuthorization([]);
		const deniedCreate = await createDraftGoodsReceipt(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-auth",
				idempotencyKey: "auth-create",
				code: "GR-AUTH",
				source: { kind: "purchase_order", purchaseOrderId: PO_ID },
				warehouseId: WAREHOUSE,
			},
			{ store, ports, masters, authorization: readOnly },
		);
		expect(deniedCreate.ok).toBe(false);
		if (!deniedCreate.ok) expect(deniedCreate.code).toBe("FORBIDDEN");
		const deniedGet = await getGoodsReceiptById(
			{ organizationId: ORG, actorUserId: "user-1", id: WAREHOUSE },
			{ store, ports, masters, authorization: none },
		);
		expect(deniedGet.ok).toBe(false);
		const deniedList = await listGoodsReceipts(
			{ organizationId: ORG, actorUserId: "user-1" },
			{ store, ports, masters, authorization: none },
		);
		expect(deniedList.ok).toBe(false);
	});
});
