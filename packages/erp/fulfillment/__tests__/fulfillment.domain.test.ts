import { describe, expect, it } from "vitest";

import {
	addDeliveryLine,
	cancelDelivery,
	confirmPack,
	confirmPick,
	createDraftDelivery,
	getDeliveryById,
	postDelivery,
	recordProofOfDelivery,
	startPicking,
} from "../src/delivery";
import { createMemoryFulfillmentStore } from "../src/memory-store";
import {
	FULFILLMENT_PERMISSION_MANAGE,
	FULFILLMENT_PERMISSION_READ,
} from "../src/permissions";
import { createGrantingFulfillmentAuthorization } from "./helpers/memory-authorization";
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
const SALES_ORDER = "50000000-0000-4000-8000-000000000001";

function harness() {
	return {
		store: createMemoryFulfillmentStore(),
		ports: createMemoryMutationPorts(),
		masters: createMemoryMasterLookup({
			items: [seedItem(ORG, ITEM, "SKU-A", UOM)],
			warehouses: [seedWarehouse(ORG, WAREHOUSE, "WH-A")],
			uoms: [seedUom(UOM, "EA")],
		}),
		authorization: createGrantingFulfillmentAuthorization([
			FULFILLMENT_PERMISSION_READ,
			FULFILLMENT_PERMISSION_MANAGE,
		]),
	};
}

async function create(ctx: ReturnType<typeof harness>, code = "DLV-100") {
	return createDraftDelivery(
		{
			organizationId: ORG,
			actorUserId: "user-1",
			correlationId: `corr-${code}`,
			code,
			salesOrderId: SALES_ORDER,
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
		const draft = await create(ctx);
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;
		const line = await addDeliveryLine(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-line",
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
				deliveryId: draft.data.id,
				deliveryLineId: line.data.id,
				quantityPicked: 2,
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
				deliveryId: draft.data.id,
				deliveryLineId: line.data.id,
				quantityPicked: 3,
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
				deliveryId: draft.data.id,
				expectedVersion: 6,
			},
			ctx,
		);
		expect(posted.ok).toBe(true);
		if (!posted.ok) return;
		const proof = await recordProofOfDelivery(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-pod",
				deliveryId: draft.data.id,
				expectedVersion: posted.data.version,
				receivedByName: "Alex Receiver",
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
			"fulfillment.delivery.posted.v1",
			"fulfillment.delivery.completed.v1",
		]);
	});

	it("enforces lines, picks, pick bounds, and optimistic versions", async () => {
		const ctx = harness();
		const draft = await create(ctx, "DLV-RULES");
		if (!draft.ok) return;
		const empty = await startPicking(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-empty",
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
				deliveryId: draft.data.id,
				deliveryLineId: line.data.id,
				quantityPicked: 3,
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
				deliveryId: draft.data.id,
				expectedVersion: 1,
			},
			draftCtx,
		);
		expect(cancelled.ok).toBe(true);

		const ctx = harness();
		const postedDraft = await create(ctx, "DLV-POSTED");
		if (!postedDraft.ok) return;
		const line = await addDeliveryLine(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-l",
				deliveryId: postedDraft.data.id,
				expectedVersion: 1,
				itemId: ITEM,
				quantityToDeliver: 1,
			},
			ctx,
		);
		if (!line.ok) return;
		await startPicking(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-s",
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
				deliveryId: postedDraft.data.id,
				deliveryLineId: line.data.id,
				quantityPicked: 1,
				expectedVersion: 3,
			},
			ctx,
		);
		await confirmPack(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-k",
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
				deliveryId: posted.data.id,
				expectedVersion: posted.data.version,
			},
			ctx,
		);
		expect(rejected.ok).toBe(false);
	});
});
