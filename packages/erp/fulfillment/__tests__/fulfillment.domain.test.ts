import { describe, expect, it } from "vitest";

import {
	addDeliveryLine,
	cancelDelivery,
	closeDelivery,
	confirmPack,
	confirmPick,
	createDraftDelivery,
	getDeliveryById,
	postDelivery,
	recordProofOfDelivery,
	startPicking,
} from "../src/delivery";
import { createMemoryFulfillmentStore } from "../src/memory-store";
import { FULFILLMENT_PERMISSION_CODES } from "../src/permissions";
import { createGrantingFulfillmentAuthorization } from "./helpers/memory-authorization";
import {
	createInventoryCommandTestOptions,
	seedInventoryOnHand,
	seedReservation,
} from "./helpers/memory-inventory";
import {
	createMemoryMasterLookup,
	seedItem,
	seedUom,
	seedWarehouse,
} from "./helpers/memory-masters";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG = "org-a";
const ITEM = "20000000-0000-4000-8000-000000000001";
const WAREHOUSE = "40000000-0000-4000-8000-000000000001";
const UOM = "b1000000-0000-4000-8000-000000000001";
const _SALES_ORDER = "50000000-0000-4000-8000-000000000001";

function harness() {
	const masters = createMemoryMasterLookup({
		items: [seedItem(ORG, ITEM, "SKU-A", UOM)],
		warehouses: [seedWarehouse(ORG, WAREHOUSE, "WH-A")],
		uoms: [seedUom(UOM, "EA")],
	});
	return {
		store: createMemoryFulfillmentStore(),
		ports: createMemoryMutationPorts(),
		masters,
		authorization: createGrantingFulfillmentAuthorization([
			...FULFILLMENT_PERMISSION_CODES,
		]),
		inventory: createInventoryCommandTestOptions(masters),
	};
}

async function create(ctx: ReturnType<typeof harness>, code = "DLV-100") {
	return createDraftDelivery(
		{
			organizationId: ORG,
			actorUserId: "user-1",
			correlationId: `corr-${code}`,
			idempotencyKey: `idem-${code}`,
			code,
			warehouseId: WAREHOUSE,
		},
		ctx,
	);
}

async function load(ctx: ReturnType<typeof harness>, id: string) {
	return getDeliveryById(
		{ organizationId: ORG, actorUserId: "user-1", id },
		ctx,
	);
}

describe("@afenda/fulfillment domain", () => {
	it("executes draft through delivered and emits only integration events", async () => {
		const ctx = harness();
		await seedInventoryOnHand(ctx.inventory, {
			organizationId: ORG,
			actorUserId: "user-1",
			correlationId: "corr-seed",
			code: "OPEN-100",
			warehouseId: WAREHOUSE,
			itemId: ITEM,
			quantity: 10,
		});
		const reservationId = await seedReservation(ctx.inventory, {
			organizationId: ORG,
			actorUserId: "user-1",
			correlationId: "corr-reserve",
			code: "RSV-100",
			warehouseId: WAREHOUSE,
			itemId: ITEM,
			quantity: 5,
		});
		const draft = await create(ctx);
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;
		const line = await addDeliveryLine(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-line",
				idempotencyKey: "idem-line",
				deliveryId: draft.data.id,
				expectedVersion: draft.data.version,
				itemId: ITEM,
				quantityOrdered: 5,
				quantityToDeliver: 5,
			},
			ctx,
		);
		expect(line.ok).toBe(true);
		const picking = await startPicking(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-start",
				idempotencyKey: "idem-start",
				deliveryId: draft.data.id,
				expectedVersion: 2,
			},
			ctx,
		);
		expect(picking.ok).toBe(true);
		if (!picking.ok || !line.ok) return;
		const firstPick = await confirmPick(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-pick-1",
				idempotencyKey: "idem-pick-1",
				deliveryId: draft.data.id,
				deliveryLineId: line.data.id,
				quantityPicked: 2,
				reservationId,
				expectedVersion: picking.data.version,
			},
			ctx,
		);
		expect(firstPick.ok).toBe(true);
		const secondPick = await confirmPick(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-pick-2",
				idempotencyKey: "idem-pick-2",
				deliveryId: draft.data.id,
				deliveryLineId: line.data.id,
				quantityPicked: 3,
				reservationId,
				expectedVersion: 4,
			},
			ctx,
		);
		expect(secondPick.ok).toBe(true);
		const packed = await confirmPack(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-pack",
				idempotencyKey: "idem-pack",
				deliveryId: draft.data.id,
				expectedVersion: 5,
				packageCode: "PKG-1",
			},
			ctx,
		);
		expect(packed.ok).toBe(true);
		const posted = await postDelivery(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-post",
				idempotencyKey: "idem-post",
				deliveryId: draft.data.id,
				expectedVersion: 6,
			},
			ctx,
		);
		expect(posted.ok).toBe(true);
		if (!posted.ok) return;
		const movement =
			await ctx.inventory.store?.getMovementByCreateIdempotencyKey(
				ORG,
				`ful-post:${posted.data.id}`,
			);
		expect(movement?.ok).toBe(true);
		if (movement?.ok && movement.data !== null) {
			expect(movement.data.status).toBe("posted");
			expect(movement.data.movementType).toBe("issue");
			expect(movement.data.source).toBe("fulfillment");
			expect(movement.data.lines).toHaveLength(1);
			expect(movement.data.lines[0]?.quantity).toBe("5");
		}
		const proof = await recordProofOfDelivery(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-pod",
				idempotencyKey: "idem-pod",
				deliveryId: draft.data.id,
				expectedVersion: posted.data.version,
				receivedByName: "Alex Receiver",
				outcome: "delivered",
			},
			ctx,
		);
		expect(proof.ok).toBe(true);
		const delivered = await load(ctx, draft.data.id);
		expect(delivered.ok).toBe(true);
		if (delivered.ok && delivered.data !== null) {
			expect(delivered.data.status).toBe("delivered");
			expect(delivered.data.picks).toHaveLength(2);
			expect(delivered.data.proofOfDelivery?.receivedByName).toBe(
				"Alex Receiver",
			);
		}
		expect(ctx.ports.outbox.calls.map((call) => call.type)).toEqual([
			"fulfillment.delivery.created.v1",
			"fulfillment.pick.confirmed.v1",
			"fulfillment.pick.confirmed.v1",
			"fulfillment.pack.confirmed.v1",
			"fulfillment.delivery.posted.v1",
			"fulfillment.pod.recorded.v1",
			"fulfillment.delivery.completed.v1",
		]);
	});

	it("auto-reserves via Inventory reserveStock when pick omits reservationId", async () => {
		const ctx = harness();
		await seedInventoryOnHand(ctx.inventory, {
			organizationId: ORG,
			actorUserId: "user-1",
			correlationId: "corr-seed-auto",
			code: "OPEN-AUTO",
			warehouseId: WAREHOUSE,
			itemId: ITEM,
			quantity: 10,
		});
		const draft = await create(ctx, "DLV-AUTO");
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;
		const line = await addDeliveryLine(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-line-auto",
				idempotencyKey: "idem-line-auto",
				deliveryId: draft.data.id,
				expectedVersion: draft.data.version,
				itemId: ITEM,
				quantityOrdered: 4,
				quantityToDeliver: 4,
			},
			ctx,
		);
		expect(line.ok).toBe(true);
		if (!line.ok) return;
		const picking = await startPicking(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-start-auto",
				idempotencyKey: "idem-start-auto",
				deliveryId: draft.data.id,
				expectedVersion: 2,
			},
			ctx,
		);
		expect(picking.ok).toBe(true);
		if (!picking.ok) return;
		const pick = await confirmPick(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-pick-auto",
				idempotencyKey: "idem-pick-auto",
				deliveryId: draft.data.id,
				deliveryLineId: line.data.id,
				quantityPicked: 4,
				expectedVersion: picking.data.version,
			},
			ctx,
		);
		expect(pick.ok).toBe(true);
		if (!pick.ok) return;
		const reservationId = pick.data.reservationId;
		expect(reservationId).toBeTruthy();
		if (reservationId === null) return;
		const reservation = await ctx.inventory.store?.getReservationById(
			ORG,
			reservationId,
		);
		expect(reservation?.ok).toBe(true);
		if (reservation?.ok && reservation.data !== null) {
			expect(reservation.data.quantity).toBe("4");
			expect(reservation.data.status).toBe("active");
		}
	});

	it("enforces lines, picks, pick bounds, and optimistic versions", async () => {
		const ctx = harness();
		await seedInventoryOnHand(ctx.inventory, {
			organizationId: ORG,
			actorUserId: "user-1",
			correlationId: "corr-seed-rules",
			code: "OPEN-RULES",
			warehouseId: WAREHOUSE,
			itemId: ITEM,
			quantity: 10,
		});
		const reservationId = await seedReservation(ctx.inventory, {
			organizationId: ORG,
			actorUserId: "user-1",
			correlationId: "corr-reserve-rules",
			code: "RSV-RULES",
			warehouseId: WAREHOUSE,
			itemId: ITEM,
			quantity: 5,
		});
		const draft = await create(ctx, "DLV-RULES");
		if (!draft.ok) return;
		const empty = await startPicking(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-empty",
				idempotencyKey: "idem-empty",
				deliveryId: draft.data.id,
				expectedVersion: 1,
			},
			ctx,
		);
		expect(empty.ok).toBe(false);
		const line = await addDeliveryLine(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-line",
				idempotencyKey: "idem-line-rules",
				deliveryId: draft.data.id,
				expectedVersion: 1,
				itemId: ITEM,
				quantityToDeliver: 2,
			},
			ctx,
		);
		if (!line.ok) return;
		const stale = await startPicking(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-stale",
				idempotencyKey: "idem-stale",
				deliveryId: draft.data.id,
				expectedVersion: 1,
			},
			ctx,
		);
		expect(stale.ok).toBe(false);
		await startPicking(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-start",
				idempotencyKey: "idem-start-rules",
				deliveryId: draft.data.id,
				expectedVersion: 2,
			},
			ctx,
		);
		const noPickPack = await confirmPack(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-pack",
				idempotencyKey: "idem-pack-nopick",
				deliveryId: draft.data.id,
				expectedVersion: 3,
			},
			ctx,
		);
		expect(noPickPack.ok).toBe(false);
		const excessive = await confirmPick(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-excess",
				idempotencyKey: "idem-excess",
				deliveryId: draft.data.id,
				deliveryLineId: line.data.id,
				quantityPicked: 3,
				reservationId,
				expectedVersion: 3,
			},
			ctx,
		);
		expect(excessive.ok).toBe(false);
	});

	it("allows cancellation before posting and rejects it after posting", async () => {
		const draftCtx = harness();
		const draft = await create(draftCtx, "DLV-CANCEL");
		if (!draft.ok) return;
		const cancelled = await cancelDelivery(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-cancel",
				idempotencyKey: "idem-cancel",
				deliveryId: draft.data.id,
				expectedVersion: 1,
			},
			draftCtx,
		);
		expect(cancelled.ok).toBe(true);

		const ctx = harness();
		await seedInventoryOnHand(ctx.inventory, {
			organizationId: ORG,
			actorUserId: "user-1",
			correlationId: "corr-seed-posted",
			code: "OPEN-CANCEL",
			warehouseId: WAREHOUSE,
			itemId: ITEM,
			quantity: 2,
		});
		const postedDraft = await create(ctx, "DLV-POSTED");
		if (!postedDraft.ok) return;
		const line = await addDeliveryLine(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-l",
				idempotencyKey: "idem-l",
				deliveryId: postedDraft.data.id,
				expectedVersion: 1,
				itemId: ITEM,
				quantityToDeliver: 1,
			},
			ctx,
		);
		if (!line.ok) return;
		const reservationId = await seedReservation(ctx.inventory, {
			organizationId: ORG,
			actorUserId: "user-1",
			correlationId: "corr-reserve-posted",
			code: "RSV-POSTED",
			warehouseId: WAREHOUSE,
			itemId: ITEM,
			quantity: 1,
		});
		await startPicking(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-s",
				idempotencyKey: "idem-s",
				deliveryId: postedDraft.data.id,
				expectedVersion: 2,
			},
			ctx,
		);
		await confirmPick(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-p",
				idempotencyKey: "idem-p",
				deliveryId: postedDraft.data.id,
				deliveryLineId: line.data.id,
				quantityPicked: 1,
				reservationId,
				expectedVersion: 3,
			},
			ctx,
		);
		await confirmPack(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-k",
				idempotencyKey: "idem-k",
				deliveryId: postedDraft.data.id,
				expectedVersion: 4,
			},
			ctx,
		);
		const posted = await postDelivery(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-o",
				idempotencyKey: "idem-o",
				deliveryId: postedDraft.data.id,
				expectedVersion: 5,
			},
			ctx,
		);
		if (!posted.ok) return;
		const rejected = await cancelDelivery(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-reject",
				idempotencyKey: "idem-reject",
				deliveryId: posted.data.id,
				expectedVersion: posted.data.version,
			},
			ctx,
		);
		expect(rejected.ok).toBe(false);
	});

	it("closes delivered deliveries and rejects close before delivered", async () => {
		const ctx = harness();
		await seedInventoryOnHand(ctx.inventory, {
			organizationId: ORG,
			actorUserId: "user-1",
			correlationId: "corr-seed-close",
			code: "OPEN-CLOSE",
			warehouseId: WAREHOUSE,
			itemId: ITEM,
			quantity: 2,
		});
		const draft = await create(ctx, "DLV-CLOSE");
		if (!draft.ok) return;
		const early = await closeDelivery(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-close-early",
				idempotencyKey: "idem-close-early",
				deliveryId: draft.data.id,
				expectedVersion: 1,
			},
			ctx,
		);
		expect(early.ok).toBe(false);
		const line = await addDeliveryLine(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-close-line",
				idempotencyKey: "idem-close-line",
				deliveryId: draft.data.id,
				expectedVersion: 1,
				itemId: ITEM,
				quantityToDeliver: 1,
			},
			ctx,
		);
		if (!line.ok) return;
		const reservationId2 = await seedReservation(ctx.inventory, {
			organizationId: ORG,
			actorUserId: "user-1",
			correlationId: "corr-reserve-close",
			code: "RSV-CLOSE",
			warehouseId: WAREHOUSE,
			itemId: ITEM,
			quantity: 1,
		});
		await startPicking(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-close-start",
				idempotencyKey: "idem-close-start",
				deliveryId: draft.data.id,
				expectedVersion: 2,
			},
			ctx,
		);
		await confirmPick(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-close-pick",
				idempotencyKey: "idem-close-pick",
				deliveryId: draft.data.id,
				deliveryLineId: line.data.id,
				quantityPicked: 1,
				reservationId: reservationId2,
				expectedVersion: 3,
			},
			ctx,
		);
		await confirmPack(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-close-pack",
				idempotencyKey: "idem-close-pack",
				deliveryId: draft.data.id,
				expectedVersion: 4,
			},
			ctx,
		);
		const posted = await postDelivery(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-close-post",
				idempotencyKey: "idem-close-post",
				deliveryId: draft.data.id,
				expectedVersion: 5,
			},
			ctx,
		);
		if (!posted.ok) return;
		const proof = await recordProofOfDelivery(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-close-pod",
				idempotencyKey: "idem-close-pod",
				deliveryId: draft.data.id,
				expectedVersion: posted.data.version,
				receivedByName: "Closer",
				outcome: "delivered",
			},
			ctx,
		);
		if (!proof.ok) return;
		const delivered = await load(ctx, draft.data.id);
		if (!delivered.ok || delivered.data === null) return;
		const closed = await closeDelivery(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-close",
				idempotencyKey: "idem-close",
				deliveryId: draft.data.id,
				expectedVersion: delivered.data.version,
			},
			ctx,
		);
		expect(closed.ok).toBe(true);
		if (!closed.ok) return;
		expect(closed.data.status).toBe("closed");
		expect(closed.data.closedBy).toBe("user-1");
	});
});
