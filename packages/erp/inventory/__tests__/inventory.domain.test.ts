import { describe, expect, it } from "vitest";

import { INVENTORY_ERROR_IDEMPOTENCY_CONFLICT, INVENTORY_ERROR_INSUFFICIENT_AVAILABLE } from "../src/error-codes";
import { createMemoryInventoryStore } from "../src/memory-store";
import {
	addStockMovementLine,
	cancelStockMovement,
	createReversalMovement,
	createStockMovement,
	cancelReservation,
	expireReservation,
	getStockAvailability,
	getStockMovementById,
	listStockReservations,
	postStockMovement,
	releaseReservation,
	reserveStock,
} from "../src/movement";
import { createAllowAllInventoryAuthorization } from "./helpers/memory-authorization";
import {
	createMemoryMasterLookup,
	seedItem,
	seedUom,
	seedWarehouse,
} from "./helpers/memory-masters";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ACTOR = "user-1";
const ORG_A = "org-a";
const ORG_B = "org-b";
const ITEM_A = "20000000-0000-4000-8000-000000000001";
const WH_A = "40000000-0000-4000-8000-000000000001";
const WH_B = "40000000-0000-4000-8000-000000000002";
const UOM_EA = "b1000000-0000-4000-8000-000000000001";

function inventoryHarness() {
	const store = createMemoryInventoryStore();
	const ports = createMemoryMutationPorts();
	const masters = createMemoryMasterLookup({
		items: [seedItem(ORG_A, ITEM_A, "SKU-A", UOM_EA, "active")],
		warehouses: [
			seedWarehouse(ORG_A, WH_A, "WH-A", "active"),
			seedWarehouse(ORG_A, WH_B, "WH-B", "active"),
		],
		uoms: [seedUom(UOM_EA, "EA")],
	});
	return {
		store,
		ports,
		masters,
		authorization: createAllowAllInventoryAuthorization(),
	};
}

async function createOpeningReceipt(
	ctx: ReturnType<typeof inventoryHarness>,
	input: {
		code: string;
		warehouseId?: string;
		quantity: number;
		createKey?: string;
		lineKey?: string;
		postKey?: string;
	},
) {
	const created = await createStockMovement(
		{
			organizationId: ORG_A,
			actorUserId: ACTOR,
			correlationId: `corr-${input.code}-create`,
			idempotencyKey: input.createKey ?? `${input.code}-create`,
			code: input.code,
			movementType: "receipt",
			source: "opening_balance",
			warehouseId: input.warehouseId ?? WH_A,
		},
		ctx,
	);
	expect(created.ok).toBe(true);
	if (!created.ok) {
		throw new Error(created.message);
	}

	const line = await addStockMovementLine(
		{
			organizationId: ORG_A,
			actorUserId: ACTOR,
			correlationId: `corr-${input.code}-line`,
			idempotencyKey: input.lineKey ?? `${input.code}-line`,
			movementId: created.data.id,
			itemId: ITEM_A,
			quantity: input.quantity,
			expectedVersion: created.data.version,
		},
		ctx,
	);
	expect(line.ok).toBe(true);
	if (!line.ok) {
		throw new Error(line.message);
	}

	const posted = await postStockMovement(
		{
			organizationId: ORG_A,
			actorUserId: ACTOR,
			correlationId: `corr-${input.code}-post`,
			idempotencyKey: input.postKey ?? `${input.code}-post`,
			movementId: created.data.id,
			expectedVersion: created.data.version + 1,
		},
		ctx,
	);
	expect(posted.ok).toBe(true);
	if (!posted.ok) {
		throw new Error(posted.message);
	}
	return posted.data;
}

async function getAvailabilityRow(
	ctx: ReturnType<typeof inventoryHarness>,
	warehouseId: string,
) {
	const availability = await getStockAvailability(
		{
			organizationId: ORG_A,
			actorUserId: ACTOR,
			correlationId: `corr-availability-${warehouseId}`,
			warehouseId,
			itemId: ITEM_A,
		},
		ctx,
	);
	expect(availability.ok).toBe(true);
	if (!availability.ok) {
		throw new Error(availability.message);
	}
	expect(availability.data).toHaveLength(1);
	return availability.data[0];
}

describe("@afenda/inventory domain", () => {
	it("creates receipt from opening balance, adds a line, posts it, and updates availability", async () => {
		const ctx = inventoryHarness();

		const created = await createStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-rcpt-create",
				idempotencyKey: "rcpt-create",
				code: "RCPT-100",
				movementType: "receipt",
				source: "opening_balance",
				warehouseId: WH_A,
			},
			ctx,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.status).toBe("draft");
		expect(created.data.source).toBe("opening_balance");

		const line = await addStockMovementLine(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-rcpt-line",
				idempotencyKey: "rcpt-line",
				movementId: created.data.id,
				itemId: ITEM_A,
				quantity: 10,
				expectedVersion: created.data.version,
			},
			ctx,
		);
		expect(line.ok).toBe(true);
		if (!line.ok) {
			return;
		}
		expect(line.data.quantity).toBe("10");

		const posted = await postStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-rcpt-post",
				idempotencyKey: "rcpt-post",
				movementId: created.data.id,
				expectedVersion: created.data.version + 1,
			},
			ctx,
		);
		expect(posted.ok).toBe(true);
		if (!posted.ok) {
			return;
		}
		expect(posted.data.status).toBe("posted");

		const availability = await getAvailabilityRow(ctx, WH_A);
		expect(availability?.onHandQuantity).toBe("10");
		expect(availability?.reservedQuantity).toBe("0");
		expect(availability?.availableQuantity).toBe("10");
	});

	it("fails to issue stock when available quantity is insufficient", async () => {
		const ctx = inventoryHarness();
		const created = await createStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-issue-create",
				idempotencyKey: "issue-create",
				code: "ISS-100",
				movementType: "issue",
				source: "fulfillment",
				warehouseId: WH_A,
				sourceModule: "fulfillment",
				sourceAggregateId: "delivery-1",
				sourceEventId: "delivery-1:issue",
			},
			ctx,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const line = await addStockMovementLine(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-issue-line",
				idempotencyKey: "issue-line",
				movementId: created.data.id,
				itemId: ITEM_A,
				quantity: 5,
				expectedVersion: created.data.version,
			},
			ctx,
		);
		expect(line.ok).toBe(true);

		const posted = await postStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-issue-post",
				idempotencyKey: "issue-post",
				movementId: created.data.id,
				expectedVersion: created.data.version + 1,
			},
			ctx,
		);
		expect(posted.ok).toBe(false);
		if (!posted.ok) {
			expect(posted.code).toBe("CONFLICT");
			expect(posted.details?.inventoryCode).toBe(
				INVENTORY_ERROR_INSUFFICIENT_AVAILABLE,
			);
		}
	});

	it("reserves then releases stock and updates reserved and available quantities", async () => {
		const ctx = inventoryHarness();
		await createOpeningReceipt(ctx, {
			code: "RCPT-RSV",
			quantity: 20,
		});

		const reserved = await reserveStock(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-rsv-create",
				idempotencyKey: "reserve-key",
				code: "RSV-100",
				warehouseId: WH_A,
				itemId: ITEM_A,
				quantity: 7,
			},
			ctx,
		);
		expect(reserved.ok).toBe(true);
		if (!reserved.ok) {
			return;
		}
		expect(reserved.data.status).toBe("active");
		expect(reserved.data.quantity).toBe("7");

		const afterReserve = await getAvailabilityRow(ctx, WH_A);
		expect(afterReserve?.onHandQuantity).toBe("20");
		expect(afterReserve?.reservedQuantity).toBe("7");
		expect(afterReserve?.availableQuantity).toBe("13");

		const released = await releaseReservation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-rsv-release",
				idempotencyKey: "release-key",
				reservationId: reserved.data.id,
				expectedVersion: reserved.data.version,
			},
			ctx,
		);
		expect(released.ok).toBe(true);
		if (!released.ok) {
			return;
		}
		expect(released.data.status).toBe("released");

		const afterRelease = await getAvailabilityRow(ctx, WH_A);
		expect(afterRelease?.onHandQuantity).toBe("20");
		expect(afterRelease?.reservedQuantity).toBe("0");
		expect(afterRelease?.availableQuantity).toBe("20");
	});

	it("expires and cancels reservations freeing reserved quantity", async () => {
		const ctx = inventoryHarness();
		await createOpeningReceipt(ctx, {
			code: "RCPT-TERM",
			quantity: 30,
		});

		const toExpire = await reserveStock(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-expire-create",
				idempotencyKey: "expire-create",
				code: "RSV-EXPIRE",
				warehouseId: WH_A,
				itemId: ITEM_A,
				quantity: 4,
			},
			ctx,
		);
		expect(toExpire.ok).toBe(true);
		if (!toExpire.ok) return;

		const expired = await expireReservation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-expire",
				idempotencyKey: "expire-key",
				reservationId: toExpire.data.id,
				expectedVersion: toExpire.data.version,
			},
			ctx,
		);
		expect(expired.ok).toBe(true);
		if (!expired.ok) return;
		expect(expired.data.status).toBe("expired");

		const toCancel = await reserveStock(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cancel-create",
				idempotencyKey: "cancel-create",
				code: "RSV-CANCEL",
				warehouseId: WH_A,
				itemId: ITEM_A,
				quantity: 3,
			},
			ctx,
		);
		expect(toCancel.ok).toBe(true);
		if (!toCancel.ok) return;

		const cancelled = await cancelReservation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cancel-rsv",
				idempotencyKey: "cancel-rsv-key",
				reservationId: toCancel.data.id,
				expectedVersion: toCancel.data.version,
			},
			ctx,
		);
		expect(cancelled.ok).toBe(true);
		if (!cancelled.ok) return;
		expect(cancelled.data.status).toBe("cancelled");

		const availability = await getAvailabilityRow(ctx, WH_A);
		expect(availability?.onHandQuantity).toBe("30");
		expect(availability?.reservedQuantity).toBe("0");
		expect(availability?.availableQuantity).toBe("30");
	});

	it("lists reservations with org isolation and status filter", async () => {
		const ctx = inventoryHarness();
		await createOpeningReceipt(ctx, {
			code: "RCPT-LIST-RSV",
			quantity: 30,
		});

		const reserved = await reserveStock(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-list-rsv-create",
				idempotencyKey: "list-reserve-key",
				code: "RSV-LIST",
				warehouseId: WH_A,
				itemId: ITEM_A,
				quantity: 5,
			},
			ctx,
		);
		expect(reserved.ok).toBe(true);
		if (!reserved.ok) {
			return;
		}

		const listed = await listStockReservations(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				pageSize: 50,
				status: "active",
			},
			ctx,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) {
			return;
		}
		expect(listed.data).toHaveLength(1);
		expect(listed.data[0]?.id).toBe(reserved.data.id);

		const foreign = await listStockReservations(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				pageSize: 50,
			},
			ctx,
		);
		expect(foreign.ok).toBe(true);
		if (foreign.ok) {
			expect(foreign.data).toHaveLength(0);
		}

		const releasedOnly = await listStockReservations(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				pageSize: 50,
				status: "released",
			},
			ctx,
		);
		expect(releasedOnly.ok).toBe(true);
		if (releasedOnly.ok) {
			expect(releasedOnly.data).toHaveLength(0);
		}
	});

	it("transfers stock between warehouses", async () => {
		const ctx = inventoryHarness();
		await createOpeningReceipt(ctx, {
			code: "RCPT-XFER",
			quantity: 15,
		});

		const created = await createStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-xfer-create",
				idempotencyKey: "xfer-create",
				code: "XFER-100",
				movementType: "transfer",
				source: "transfer",
				fromWarehouseId: WH_A,
				toWarehouseId: WH_B,
			},
			ctx,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const line = await addStockMovementLine(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-xfer-line",
				idempotencyKey: "xfer-line",
				movementId: created.data.id,
				itemId: ITEM_A,
				quantity: 6,
				expectedVersion: created.data.version,
			},
			ctx,
		);
		expect(line.ok).toBe(true);

		const posted = await postStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-xfer-post",
				idempotencyKey: "xfer-post",
				movementId: created.data.id,
				expectedVersion: created.data.version + 1,
			},
			ctx,
		);
		expect(posted.ok).toBe(true);

		const fromWarehouse = await getAvailabilityRow(ctx, WH_A);
		const toWarehouse = await getAvailabilityRow(ctx, WH_B);
		expect(fromWarehouse?.onHandQuantity).toBe("9");
		expect(fromWarehouse?.availableQuantity).toBe("9");
		expect(toWarehouse?.onHandQuantity).toBe("6");
		expect(toWarehouse?.availableQuantity).toBe("6");
	});

	it("posts manual adjustments with an adjustment reason code", async () => {
		const ctx = inventoryHarness();
		await createOpeningReceipt(ctx, {
			code: "RCPT-ADJ",
			quantity: 10,
		});

		const created = await createStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-adj-create",
				idempotencyKey: "adj-create",
				code: "ADJ-100",
				movementType: "adjustment",
				source: "manual_adjustment",
				warehouseId: WH_A,
				adjustmentReasonCode: "COUNT_CORRECTION",
			},
			ctx,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.adjustmentReasonCode).toBe("COUNT_CORRECTION");

		const line = await addStockMovementLine(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-adj-line",
				idempotencyKey: "adj-line",
				movementId: created.data.id,
				itemId: ITEM_A,
				quantity: -3,
				expectedVersion: created.data.version,
			},
			ctx,
		);
		expect(line.ok).toBe(true);

		const posted = await postStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-adj-post",
				idempotencyKey: "adj-post",
				movementId: created.data.id,
				expectedVersion: created.data.version + 1,
			},
			ctx,
		);
		expect(posted.ok).toBe(true);
		if (!posted.ok) {
			return;
		}
		expect(posted.data.adjustmentReasonCode).toBe("COUNT_CORRECTION");

		const availability = await getAvailabilityRow(ctx, WH_A);
		expect(availability?.onHandQuantity).toBe("7");
		expect(availability?.availableQuantity).toBe("7");
	});

	it("cancels a draft movement", async () => {
		const ctx = inventoryHarness();
		const created = await createStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cancel-create",
				idempotencyKey: "cancel-create",
				code: "RCPT-CANCEL",
				movementType: "receipt",
				source: "opening_balance",
				warehouseId: WH_A,
			},
			ctx,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const line = await addStockMovementLine(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cancel-line",
				idempotencyKey: "cancel-line",
				movementId: created.data.id,
				itemId: ITEM_A,
				quantity: 2,
				expectedVersion: created.data.version,
			},
			ctx,
		);
		expect(line.ok).toBe(true);

		const cancelled = await cancelStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cancel-post",
				idempotencyKey: "cancel-key",
				movementId: created.data.id,
				expectedVersion: created.data.version + 1,
			},
			ctx,
		);
		expect(cancelled.ok).toBe(true);
		if (cancelled.ok) {
			expect(cancelled.data.status).toBe("cancelled");
		}
	});

	it("creates and posts a reversal movement for a posted movement", async () => {
		const ctx = inventoryHarness();
		const original = await createOpeningReceipt(ctx, {
			code: "RCPT-REV",
			quantity: 8,
		});

		const reversed = await createReversalMovement(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-reversal",
				idempotencyKey: "reversal-key",
				movementId: original.id,
				code: "REV-100",
				expectedVersion: original.version,
			},
			ctx,
		);
		expect(reversed.ok).toBe(true);
		if (!reversed.ok) {
			return;
		}
		expect(reversed.data.status).toBe("posted");
		expect(reversed.data.reversesMovementId).toBe(original.id);
		expect(reversed.data.movementType).toBe("issue");

		const availability = await getAvailabilityRow(ctx, WH_A);
		expect(availability?.onHandQuantity).toBe("0");
		expect(availability?.availableQuantity).toBe("0");
	});

	it("isolates get-by-id by organization", async () => {
		const ctx = inventoryHarness();
		const created = await createStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-iso-create",
				idempotencyKey: "iso-create",
				code: "RCPT-ISO",
				movementType: "receipt",
				source: "opening_balance",
				warehouseId: WH_A,
			},
			ctx,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const foreign = await getStockMovementById(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				correlationId: "corr-iso-get",
				id: created.data.id,
			},
			ctx,
		);
		expect(foreign.ok).toBe(true);
		if (foreign.ok) {
			expect(foreign.data).toBeNull();
		}
	});

	it("rejects reused create idempotency keys with different payloads", async () => {
		const ctx = inventoryHarness();
		const created = await createStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-idem-a",
				idempotencyKey: "shared-key",
				code: "RCPT-IDEM-A",
				movementType: "receipt",
				source: "opening_balance",
				warehouseId: WH_A,
			},
			ctx,
		);
		expect(created.ok).toBe(true);

		const conflict = await createStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-idem-b",
				idempotencyKey: "shared-key",
				code: "RCPT-IDEM-B",
				movementType: "receipt",
				source: "opening_balance",
				warehouseId: WH_B,
			},
			ctx,
		);
		expect(conflict.ok).toBe(false);
		if (!conflict.ok) {
			expect(conflict.code).toBe("CONFLICT");
			expect(conflict.details?.inventoryCode).toBe(
				INVENTORY_ERROR_IDEMPOTENCY_CONFLICT,
			);
		}
	});
});
