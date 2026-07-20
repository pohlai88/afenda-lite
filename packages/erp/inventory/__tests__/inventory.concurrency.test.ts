import { describe, expect, it } from "vitest";

import {
	INVENTORY_ERROR_IDEMPOTENCY_CONFLICT,
	INVENTORY_ERROR_INSUFFICIENT_AVAILABLE,
} from "../src/error-codes";
import { createMemoryInventoryStore } from "../src/memory-store";
import {
	addStockMovementLine,
	createStockMovement,
	getStockAvailability,
	postStockMovement,
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
const ORG = "org-a";
const ITEM = "20000000-0000-4000-8000-000000000001";
const WH_A = "40000000-0000-4000-8000-000000000001";
const WH_B = "40000000-0000-4000-8000-000000000002";
const UOM = "b1000000-0000-4000-8000-000000000001";

function concurrencyHarness() {
	const store = createMemoryInventoryStore();
	const ports = createMemoryMutationPorts();
	const masters = createMemoryMasterLookup({
		items: [seedItem(ORG, ITEM, "SKU-A", UOM, "active")],
		warehouses: [
			seedWarehouse(ORG, WH_A, "WH-A", "active"),
			seedWarehouse(ORG, WH_B, "WH-B", "active"),
		],
		uoms: [seedUom(UOM, "EA")],
	});
	return {
		store,
		ports,
		masters,
		authorization: createAllowAllInventoryAuthorization(),
	};
}

async function seedPostedReceipt(
	ctx: ReturnType<typeof concurrencyHarness>,
	code: string,
	quantity: number,
) {
	const created = await createStockMovement(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-${code}-create`,
			idempotencyKey: `${code}-create`,
			code,
			movementType: "receipt",
			source: "opening_balance",
			warehouseId: WH_A,
		},
		ctx,
	);
	expect(created.ok).toBe(true);
	if (!created.ok) {
		throw new Error(created.message);
	}

	const line = await addStockMovementLine(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-${code}-line`,
			idempotencyKey: `${code}-line`,
			movementId: created.data.id,
			itemId: ITEM,
			quantity,
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
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-${code}-post`,
			idempotencyKey: `${code}-post`,
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

describe("@afenda/inventory concurrency", () => {
	it("allows only one concurrent reservation when both exceed the same available stock", async () => {
		const ctx = concurrencyHarness();
		await seedPostedReceipt(ctx, "RCPT-CONC", 5);

		const [left, right] = await Promise.all([
			reserveStock(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-rsv-left",
					idempotencyKey: "reserve-left",
					code: "RSV-LEFT",
					warehouseId: WH_A,
					itemId: ITEM,
					quantity: 4,
				},
				ctx,
			),
			reserveStock(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: "corr-rsv-right",
					idempotencyKey: "reserve-right",
					code: "RSV-RIGHT",
					warehouseId: WH_A,
					itemId: ITEM,
					quantity: 4,
				},
				ctx,
			),
		]);

		const okResults = [left, right].filter((result) => result.ok);
		const failedResults = [left, right].filter((result) => !result.ok);
		expect(okResults).toHaveLength(1);
		expect(failedResults).toHaveLength(1);
		if (failedResults.length === 1 && !failedResults[0].ok) {
			expect(failedResults[0].details?.inventoryCode).toBe(
				INVENTORY_ERROR_INSUFFICIENT_AVAILABLE,
			);
		}

		const availability = await getStockAvailability(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-rsv-availability",
				warehouseId: WH_A,
				itemId: ITEM,
			},
			ctx,
		);
		expect(availability.ok).toBe(true);
		if (availability.ok) {
			expect(availability.data[0]?.reservedQuantity).toBe("4");
			expect(availability.data[0]?.availableQuantity).toBe("1");
		}
	});

	it("replays duplicate post requests that reuse the same idempotency key", async () => {
		const ctx = concurrencyHarness();
		const created = await createStockMovement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-post-create",
				idempotencyKey: "post-create",
				code: "RCPT-POST-REPLAY",
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
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-post-line",
				idempotencyKey: "post-line",
				movementId: created.data.id,
				itemId: ITEM,
				quantity: 2,
				expectedVersion: created.data.version,
			},
			ctx,
		);
		expect(line.ok).toBe(true);

		const first = await postStockMovement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-post-first",
				idempotencyKey: "shared-post-key",
				movementId: created.data.id,
				expectedVersion: created.data.version + 1,
			},
			ctx,
		);
		const replay = await postStockMovement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-post-replay",
				idempotencyKey: "shared-post-key",
				movementId: created.data.id,
				expectedVersion: created.data.version + 1,
			},
			ctx,
		);

		expect(first.ok).toBe(true);
		expect(replay.ok).toBe(true);
		if (first.ok && replay.ok) {
			expect(replay.data.id).toBe(first.data.id);
			expect(replay.data.version).toBe(first.data.version);
			expect(replay.data.postIdempotencyKey).toBe("shared-post-key");
		}
	});

	it("rejects a reused create idempotency key when the payload changes", async () => {
		const ctx = concurrencyHarness();
		const first = await createStockMovement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-idem-first",
				idempotencyKey: "shared-create-key",
				code: "RCPT-IDEM-1",
				movementType: "receipt",
				source: "opening_balance",
				warehouseId: WH_A,
			},
			ctx,
		);
		expect(first.ok).toBe(true);

		const conflict = await createStockMovement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-idem-second",
				idempotencyKey: "shared-create-key",
				code: "RCPT-IDEM-2",
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
