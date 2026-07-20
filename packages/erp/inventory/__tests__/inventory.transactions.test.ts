import { fail, ok, type Result } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";
import { createMemoryInventoryStore } from "../src/memory-store";
import {
	addStockMovementLine,
	createStockMovement,
	listStockMovements,
	postStockMovement,
} from "../src/movement";
import {
	INVENTORY_PERMISSION_MANAGE,
	INVENTORY_PERMISSION_READ,
} from "../src/permissions";
import type { MutationPorts, OutboxFactInput } from "../src/ports";
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

function harness(ports?: MutationPorts) {
	const store = createMemoryInventoryStore();
	const masters = createMemoryMasterLookup({
		items: [seedItem(ORG, ITEM, "SKU-A", UOM, "active")],
		warehouses: [seedWarehouse(ORG, WH, "WH-A", "active")],
		uoms: [seedUom(UOM, "EA")],
	});
	const authorization = createGrantingInventoryAuthorization([
		INVENTORY_PERMISSION_READ,
		INVENTORY_PERMISSION_MANAGE,
	]);
	return {
		store,
		ports: ports ?? createMemoryMutationPorts(),
		masters,
		authorization,
	};
}

describe("@afenda/inventory transactions", () => {
	it("rolls back entity write when outbox append fails", async () => {
		const failingOutbox: MutationPorts = {
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
		const ctx = harness(failingOutbox);
		const created = await createStockMovement(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-tx-1",
				code: "RCPT-TX-1",
				movementType: "receipt",
				warehouseId: WH,
			},
			ctx,
		);
		expect(created.ok).toBe(false);

		const empty = await listStockMovements(
			{ organizationId: ORG, actorUserId: "user-1", page: 1, pageSize: 50 },
			{ ...ctx, ports: createMemoryMutationPorts() },
		);
		expect(empty.ok).toBe(true);
		if (empty.ok) {
			expect(empty.data).toHaveLength(0);
		}

		const retry = await createStockMovement(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-tx-2",
				code: "RCPT-TX-1",
				movementType: "receipt",
				warehouseId: WH,
			},
			{ ...ctx, ports: createMemoryMutationPorts() },
		);
		expect(retry.ok).toBe(true);
	});

	it("rejects post when expectedVersion does not match", async () => {
		const ctx = harness();
		const draft = await createStockMovement(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-tx-3",
				code: "RCPT-TX-2",
				movementType: "receipt",
				warehouseId: WH,
			},
			ctx,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) {
			return;
		}
		await addStockMovementLine(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-tx-4",
				movementId: draft.data.id,
				itemId: ITEM,
				quantity: 1,
			},
			ctx,
		);
		const conflict = await postStockMovement(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-tx-5",
				movementId: draft.data.id,
				expectedVersion: 1,
			},
			ctx,
		);
		expect(conflict.ok).toBe(false);
		if (!conflict.ok) {
			expect(conflict.code).toBe("CONFLICT");
			expect(conflict.message).toMatch(/version/i);
		}
	});
});
