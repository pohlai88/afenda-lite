import { describe, expect, it } from "vitest";
import { createMemoryInventoryStore } from "../src/memory-store";
import {
	addStockMovementLine,
	createStockMovement,
	getStockAvailability,
	getStockMovementById,
	listStockMovements,
	postStockMovement,
	releaseReservation,
	reserveStock,
} from "../src/movement";
import {
	INVENTORY_PERMISSION_MANAGE,
	INVENTORY_PERMISSION_READ,
} from "../src/permissions";
import { createGrantingInventoryAuthorization } from "./helpers/memory-authorization";
import {
	createMemoryMasterLookup,
	seedItem,
	seedUom,
	seedWarehouse,
} from "./helpers/memory-masters";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG_A = "org-a";
const ORG_B = "org-b";
const ITEM_A = "20000000-0000-4000-8000-000000000001";
const WH_A = "40000000-0000-4000-8000-000000000001";
const WH_B = "40000000-0000-4000-8000-000000000002";
const UOM_EA = "b1000000-0000-4000-8000-000000000001";

function harness() {
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
	const authorization = createGrantingInventoryAuthorization([
		INVENTORY_PERMISSION_READ,
		INVENTORY_PERMISSION_MANAGE,
	]);
	return { store, ports, masters, authorization };
}

async function receiveStock(
	ctx: ReturnType<typeof harness>,
	code: string,
	quantity: number,
	warehouseId = WH_A,
) {
	const created = await createStockMovement(
		{
			organizationId: ORG_A,
			actorUserId: "user-1",
			correlationId: `corr-${code}-create`,
			code,
			movementType: "receipt",
			warehouseId,
		},
		ctx,
	);
	if (!created.ok) {
		return created;
	}
	await addStockMovementLine(
		{
			organizationId: ORG_A,
			actorUserId: "user-1",
			correlationId: `corr-${code}-line`,
			movementId: created.data.id,
			itemId: ITEM_A,
			quantity,
		},
		ctx,
	);
	return postStockMovement(
		{
			organizationId: ORG_A,
			actorUserId: "user-1",
			correlationId: `corr-${code}-post`,
			movementId: created.data.id,
			expectedVersion: 2,
		},
		ctx,
	);
}

describe("@afenda/inventory domain", () => {
	it("create/add/post receipt updates availability and stamps audit/outbox", async () => {
		const ctx = harness();
		const created = await createStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-rcpt-1",
				code: "RCPT-100",
				movementType: "receipt",
				warehouseId: WH_A,
			},
			ctx,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.status).toBe("draft");
		expect(created.data.warehouseCode).toBe("WH-A");
		expect(ctx.ports.audit.calls).toHaveLength(1);
		expect(ctx.ports.outbox.calls[0]?.type).toBe(
			"inventory.movement.created.v1",
		);

		const line = await addStockMovementLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-rcpt-2",
				movementId: created.data.id,
				itemId: ITEM_A,
				quantity: 10,
			},
			ctx,
		);
		expect(line.ok).toBe(true);

		const posted = await postStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-rcpt-3",
				movementId: created.data.id,
				expectedVersion: 2,
			},
			ctx,
		);
		expect(posted.ok).toBe(true);
		if (!posted.ok) {
			return;
		}
		expect(posted.data.status).toBe("posted");
		expect(
			ctx.ports.outbox.calls.some(
				(call) => call.type === "inventory.movement.posted.v1",
			),
		).toBe(true);

		const availability = await getStockAvailability(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				warehouseId: WH_A,
				itemId: ITEM_A,
			},
			ctx,
		);
		expect(availability.ok).toBe(true);
		if (availability.ok) {
			expect(availability.data).toHaveLength(1);
			expect(availability.data[0]?.onHand).toBe("10");
			expect(availability.data[0]?.available).toBe("10");
			expect(availability.data[0]?.reserved).toBe("0");
		}
	});

	it("issue fails without available stock", async () => {
		const ctx = harness();
		const created = await createStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-issue-1",
				code: "ISS-100",
				movementType: "issue",
				warehouseId: WH_A,
			},
			ctx,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		await addStockMovementLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-issue-2",
				movementId: created.data.id,
				itemId: ITEM_A,
				quantity: 5,
			},
			ctx,
		);
		const posted = await postStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-issue-3",
				movementId: created.data.id,
				expectedVersion: 2,
			},
			ctx,
		);
		expect(posted.ok).toBe(false);
		if (!posted.ok) {
			expect(posted.code).toBe("CONFLICT");
			expect(posted.message).toMatch(/available/i);
		}
	});

	it("reserve + release round trip restores availability", async () => {
		const ctx = harness();
		const receipt = await createStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-rsv-1",
				code: "RCPT-RSV",
				movementType: "receipt",
				warehouseId: WH_A,
			},
			ctx,
		);
		expect(receipt.ok).toBe(true);
		if (!receipt.ok) {
			return;
		}
		await addStockMovementLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-rsv-2",
				movementId: receipt.data.id,
				itemId: ITEM_A,
				quantity: 20,
			},
			ctx,
		);
		await postStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-rsv-3",
				movementId: receipt.data.id,
				expectedVersion: 2,
			},
			ctx,
		);

		const reserved = await reserveStock(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-rsv-4",
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
		expect(reserved.data.status).toBe("posted");
		expect(reserved.data.movementType).toBe("reservation");
		expect(reserved.data.reservationId).not.toBeNull();
		expect(
			ctx.ports.outbox.calls.some(
				(call) => call.type === "inventory.stock.reserved.v1",
			),
		).toBe(true);

		const afterReserve = await getStockAvailability(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				warehouseId: WH_A,
				itemId: ITEM_A,
			},
			ctx,
		);
		expect(afterReserve.ok).toBe(true);
		if (afterReserve.ok) {
			expect(afterReserve.data[0]?.onHand).toBe("20");
			expect(afterReserve.data[0]?.reserved).toBe("7");
			expect(afterReserve.data[0]?.available).toBe("13");
		}

		const reservationId = reserved.data.reservationId;
		expect(reservationId).not.toBeNull();
		if (reservationId === null) {
			return;
		}
		const reservation = await ctx.store.getReservationById(
			ORG_A,
			reservationId,
		);
		expect(reservation.ok).toBe(true);
		if (!reservation.ok || reservation.data === null) {
			return;
		}

		const released = await releaseReservation(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-rsv-5",
				code: "REL-100",
				reservationId,
				expectedVersion: reservation.data.version,
			},
			ctx,
		);
		expect(released.ok).toBe(true);
		if (!released.ok) {
			return;
		}
		expect(released.data.movementType).toBe("reservation_release");
		expect(
			ctx.ports.outbox.calls.some(
				(call) => call.type === "inventory.reservation.released.v1",
			),
		).toBe(true);

		const afterRelease = await getStockAvailability(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				warehouseId: WH_A,
				itemId: ITEM_A,
			},
			ctx,
		);
		expect(afterRelease.ok).toBe(true);
		if (afterRelease.ok) {
			expect(afterRelease.data[0]?.onHand).toBe("20");
			expect(afterRelease.data[0]?.reserved).toBe("0");
			expect(afterRelease.data[0]?.available).toBe("20");
		}
	});

	it("transfer moves availability between warehouses", async () => {
		const ctx = harness();
		const stocked = await receiveStock(ctx, "RCPT-XFER", 15);
		expect(stocked.ok).toBe(true);

		const created = await createStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-xfer-1",
				code: "XFER-100",
				movementType: "transfer",
				fromWarehouseId: WH_A,
				toWarehouseId: WH_B,
			},
			ctx,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		await addStockMovementLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-xfer-2",
				movementId: created.data.id,
				itemId: ITEM_A,
				quantity: 6,
			},
			ctx,
		);
		const posted = await postStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-xfer-3",
				movementId: created.data.id,
				expectedVersion: 2,
			},
			ctx,
		);
		expect(posted.ok).toBe(true);

		const fromWh = await getStockAvailability(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				warehouseId: WH_A,
				itemId: ITEM_A,
			},
			ctx,
		);
		const toWh = await getStockAvailability(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				warehouseId: WH_B,
				itemId: ITEM_A,
			},
			ctx,
		);
		expect(fromWh.ok).toBe(true);
		expect(toWh.ok).toBe(true);
		if (fromWh.ok && toWh.ok) {
			expect(fromWh.data[0]?.available).toBe("9");
			expect(toWh.data[0]?.available).toBe("6");
		}
	});

	it("adjustment applies signed quantity to on_hand and available", async () => {
		const ctx = harness();
		const stocked = await receiveStock(ctx, "RCPT-ADJ", 10);
		expect(stocked.ok).toBe(true);

		const created = await createStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-adj-1",
				code: "ADJ-100",
				movementType: "adjustment",
				warehouseId: WH_A,
			},
			ctx,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		await addStockMovementLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-adj-2",
				movementId: created.data.id,
				itemId: ITEM_A,
				quantity: -3,
			},
			ctx,
		);
		const posted = await postStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-adj-3",
				movementId: created.data.id,
				expectedVersion: 2,
			},
			ctx,
		);
		expect(posted.ok).toBe(true);

		const availability = await getStockAvailability(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				warehouseId: WH_A,
				itemId: ITEM_A,
			},
			ctx,
		);
		expect(availability.ok).toBe(true);
		if (availability.ok) {
			expect(availability.data[0]?.onHand).toBe("7");
			expect(availability.data[0]?.available).toBe("7");
		}
	});

	it("binds get to organization (cross-tenant isolation)", async () => {
		const ctx = harness();
		const created = await createStockMovement(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-iso-1",
				code: "RCPT-ISO",
				movementType: "receipt",
				warehouseId: WH_A,
			},
			ctx,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const foreign = await getStockMovementById(
			{ organizationId: ORG_B, actorUserId: "user-1", id: created.data.id },
			ctx,
		);
		expect(foreign.ok).toBe(true);
		if (foreign.ok) {
			expect(foreign.data).toBeNull();
		}

		const listed = await listStockMovements(
			{ organizationId: ORG_A, actorUserId: "user-1", page: 1, pageSize: 50 },
			ctx,
		);
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data).toHaveLength(1);
		}
	});
});
