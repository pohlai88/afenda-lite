import { fail, ok, type Result } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import { createDraftDelivery, listDeliveries } from "../src/delivery";
import { createMemoryFulfillmentStore } from "../src/memory-store";
import {
	FULFILLMENT_PERMISSION_MANAGE,
	FULFILLMENT_PERMISSION_READ,
} from "../src/permissions";
import type { MutationPorts, OutboxFactInput } from "../src/ports";
import { createGrantingFulfillmentAuthorization } from "./helpers/memory-authorization";
import {
	createMemoryMasterLookup,
	seedWarehouse,
} from "./helpers/memory-masters";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG = "org-a";
const WAREHOUSE = "40000000-0000-4000-8000-000000000001";

describe("@afenda/fulfillment transactions", () => {
	it("rolls back delivery creation when the outbox append fails", async () => {
		const store = createMemoryFulfillmentStore();
		const masters = createMemoryMasterLookup({
			warehouses: [seedWarehouse(ORG, WAREHOUSE, "WH-A")],
		});
		const authorization = createGrantingFulfillmentAuthorization([
			FULFILLMENT_PERMISSION_READ,
			FULFILLMENT_PERMISSION_MANAGE,
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
			code: "DLV-TX",
			warehouseId: WAREHOUSE,
		};
		const failed = await createDraftDelivery(input, {
			store,
			ports,
			masters,
			authorization,
		});
		expect(failed.ok).toBe(false);
		const listed = await listDeliveries(
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
		const retry = await createDraftDelivery(input, {
			store,
			ports: createMemoryMutationPorts(),
			masters,
			authorization,
		});
		expect(retry.ok).toBe(true);
	});
});
