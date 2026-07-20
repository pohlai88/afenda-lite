import { fail, ok, type Result } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";
import { createMemoryReceivingStore } from "../src/memory-store";
import {
	RECEIVING_PERMISSION_MANAGE,
	RECEIVING_PERMISSION_READ,
} from "../src/permissions";
import type { MutationPorts, OutboxFactInput } from "../src/ports";
import { createDraftGoodsReceipt, listGoodsReceipts } from "../src/receipt";
import { createGrantingReceivingAuthorization } from "./helpers/memory-authorization";
import {
	createMemoryMasterLookup,
	seedWarehouse,
} from "./helpers/memory-masters";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG = "org-a";
const WAREHOUSE = "40000000-0000-4000-8000-000000000001";

describe("@afenda/receiving transactions", () => {
	it("rolls back the receipt when outbox append fails", async () => {
		const store = createMemoryReceivingStore();
		const masters = createMemoryMasterLookup({
			warehouses: [seedWarehouse(ORG, WAREHOUSE, "WH-A")],
		});
		const authorization = createGrantingReceivingAuthorization([
			RECEIVING_PERMISSION_READ,
			RECEIVING_PERMISSION_MANAGE,
		]);
		const ports: MutationPorts = {
			audit: {
				async record() {
					return ok({ id: "audit-1" });
				},
			},
			outbox: {
				async append(_input: OutboxFactInput): Promise<Result<{ id: string }>> {
					return fail("INTERNAL_ERROR", "forced outbox failure");
				},
			},
		};
		const input = {
			organizationId: ORG,
			actorUserId: "user-1",
			correlationId: "corr-tx",
			code: "GR-TX",
			sourceType: "unplanned",
			warehouseId: WAREHOUSE,
		};
		const failed = await createDraftGoodsReceipt(input, {
			store,
			ports,
			masters,
			authorization,
		});
		expect(failed.ok).toBe(false);
		const listed = await listGoodsReceipts(
			{ organizationId: ORG, actorUserId: "user-1" },
			{
				store,
				ports: createMemoryMutationPorts(),
				masters,
				authorization,
			},
		);
		expect(listed.ok).toBe(true);
		if (listed.ok) expect(listed.data).toEqual([]);
		const retry = await createDraftGoodsReceipt(input, {
			store,
			ports: createMemoryMutationPorts(),
			masters,
			authorization,
		});
		expect(retry.ok).toBe(true);
	});
});
