import { fail, ok, type Result } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import { createMemoryInventoryStore } from "../src/memory-store";
import {
	addStockMovementLine,
	createStockMovement,
	getStockAvailability,
	getStockMovementById,
	postStockMovement,
	reserveStock,
} from "../src/movement";
import type { MutationPorts, OutboxFactInput } from "../src/ports";
import { createAllowAllInventoryAuthorization } from "./helpers/memory-authorization";
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
const ACTOR = "user-1";

function harness(ports?: MutationPorts) {
	const store = createMemoryInventoryStore();
	const masters = createMemoryMasterLookup({
		items: [seedItem(ORG, ITEM, "SKU-A", UOM, "active")],
		warehouses: [seedWarehouse(ORG, WH, "WH-A", "active")],
		uoms: [seedUom(UOM, "EA")],
	});
	const authorization = createAllowAllInventoryAuthorization();
	return {
		store,
		ports: ports ?? createMemoryMutationPorts(),
		masters,
		authorization,
	};
}

async function createDraftReceipt(ctx: ReturnType<typeof harness>, code: string) {
	const created = await createStockMovement(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-${code}-create`,
			idempotencyKey: `${code}-create`,
			code,
			movementType: "receipt",
			source: "opening_balance",
			warehouseId: WH,
		},
		ctx,
	);
	expect(created.ok).toBe(true);
	if (!created.ok) {
		throw new Error(created.message);
	}
	return created.data;
}

async function addReceiptLine(
	ctx: ReturnType<typeof harness>,
	movementId: string,
	expectedVersion: number,
	code: string,
	quantity: number,
) {
	const line = await addStockMovementLine(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-${code}-line`,
			idempotencyKey: `${code}-line`,
			movementId,
			itemId: ITEM,
			quantity,
			expectedVersion,
		},
		ctx,
	);
	expect(line.ok).toBe(true);
	if (!line.ok) {
		throw new Error(line.message);
	}
}

describe("@afenda/inventory transactions", () => {
	it("records audit and outbox facts for create, post, and reserve", async () => {
		const ctx = harness();
		const draft = await createDraftReceipt(ctx, "RCPT-TX-EVENTS");
		await addReceiptLine(ctx, draft.id, draft.version, "RCPT-TX-EVENTS", 3);

		const posted = await postStockMovement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-rcpt-events-post",
				idempotencyKey: "rcpt-events-post",
				movementId: draft.id,
				expectedVersion: draft.version + 1,
			},
			ctx,
		);
		expect(posted.ok).toBe(true);

		const reserved = await reserveStock(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-rsv-events-create",
				idempotencyKey: "rsv-events-create",
				code: "RSV-TX-1",
				warehouseId: WH,
				itemId: ITEM,
				quantity: 2,
			},
			ctx,
		);
		expect(reserved.ok).toBe(true);

		expect(ctx.ports.audit.calls.map((call) => call.entity)).toEqual([
			"stock_movement",
			"stock_movement_line",
			"stock_movement",
			"stock_reservation",
		]);
		expect(ctx.ports.outbox.calls.map((call) => call.type)).toEqual([
			"inventory.movement.created.v1",
			"inventory.movement.posted.v1",
			"inventory.stock.reserved.v1",
		]);
	});

	it("rolls back create when audit recording fails", async () => {
		const failingAudit: MutationPorts = {
			audit: {
				async record() {
					return fail("INTERNAL_ERROR", "forced audit failure");
				},
			},
			outbox: {
				async append(_input: OutboxFactInput): Promise<Result<{ id: string }>> {
					return ok({ id: "outbox-1" });
				},
			},
		};
		const ctx = harness(failingAudit);
		const created = await createStockMovement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-tx-audit-fail",
				idempotencyKey: "tx-audit-fail",
				code: "RCPT-TX-AUDIT",
				movementType: "receipt",
				source: "opening_balance",
				warehouseId: WH,
			},
			ctx,
		);
		expect(created.ok).toBe(false);

		const listed = await ctx.store.listMovements({
			organizationId: ORG,
			page: 1,
			pageSize: 10,
		});
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data).toEqual([]);
		}
	});

	it("rolls back post when outbox append fails", async () => {
		const base = harness();
		const draft = await createDraftReceipt(base, "RCPT-TX-POST");
		await addReceiptLine(base, draft.id, draft.version, "RCPT-TX-POST", 4);

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
		const posted = await postStockMovement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-tx-post-fail",
				idempotencyKey: "tx-post-fail",
				movementId: draft.id,
				expectedVersion: draft.version + 1,
			},
			{ ...base, ports: failingOutbox },
		);
		expect(posted.ok).toBe(false);

		const reloaded = await getStockMovementById(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-tx-post-check",
				id: draft.id,
			},
			base,
		);
		expect(reloaded.ok).toBe(true);
		if (reloaded.ok && reloaded.data !== null) {
			expect(reloaded.data.status).toBe("draft");
			expect(reloaded.data.postIdempotencyKey).toBeNull();
		}

		const availability = await getStockAvailability(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-tx-post-availability",
				warehouseId: WH,
				itemId: ITEM,
			},
			base,
		);
		expect(availability.ok).toBe(true);
		if (availability.ok) {
			expect(availability.data).toEqual([]);
		}
	});

	it("rolls back reserve when outbox append fails", async () => {
		const base = harness();
		const stocked = await createDraftReceipt(base, "RCPT-TX-RSV-2");
		await addReceiptLine(base, stocked.id, stocked.version, "RCPT-TX-RSV-2", 5);
		const posted = await postStockMovement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-rsv-stock-post",
				idempotencyKey: "rsv-stock-post",
				movementId: stocked.id,
				expectedVersion: stocked.version + 1,
			},
			base,
		);
		expect(posted.ok).toBe(true);

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
		const reserved = await reserveStock(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-rsv-fail",
				idempotencyKey: "rsv-fail",
				code: "RSV-TX-FAIL",
				warehouseId: WH,
				itemId: ITEM,
				quantity: 2,
			},
			{ ...base, ports: failingOutbox },
		);
		expect(reserved.ok).toBe(false);

		const availability = await getStockAvailability(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-rsv-fail-check",
				warehouseId: WH,
				itemId: ITEM,
			},
			base,
		);
		expect(availability.ok).toBe(true);
		if (availability.ok) {
			expect(availability.data[0]?.onHandQuantity).toBe("5");
			expect(availability.data[0]?.reservedQuantity).toBe("0");
			expect(availability.data[0]?.availableQuantity).toBe("5");
		}
	});
});
