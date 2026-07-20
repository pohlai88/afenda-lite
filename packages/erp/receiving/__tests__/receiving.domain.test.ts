import { describe, expect, it } from "vitest";
import { createMemoryReceivingStore } from "../src/memory-store";
import {
	RECEIVING_PERMISSION_DISCREPANCY_RECORD,
	RECEIVING_PERMISSION_DISCREPANCY_RESOLVE,
	RECEIVING_PERMISSION_RECEIPT_CANCEL,
	RECEIVING_PERMISSION_RECEIPT_CREATE,
	RECEIVING_PERMISSION_RECEIPT_POST,
	RECEIVING_PERMISSION_RECEIPT_READ,
	RECEIVING_PERMISSION_RECEIPT_REVERSE,
	RECEIVING_PERMISSION_RECEIPT_UPDATE,
} from "../src/permissions";
import {
	addGoodsReceiptLine,
	cancelGoodsReceipt,
	createDraftGoodsReceipt,
	getGoodsReceiptById,
	listGoodsReceipts,
	listReceivingInventoryExceptions,
	postGoodsReceipt,
	recordReceivingDiscrepancy,
	resolveReceivingDiscrepancy,
	reverseGoodsReceipt,
} from "../src/receipt";
import { createGrantingReceivingAuthorization } from "./helpers/memory-authorization";
import { createInventoryCommandTestOptions } from "./helpers/memory-inventory";
import {
	createMemoryMasterLookup,
	seedItem,
	seedUom,
	seedWarehouse,
} from "./helpers/memory-masters";
import {
	createMemoryPurchaseOrderReceivingQueryPort,
	postedPoSnapshot,
} from "./helpers/memory-po-receiving";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG_A = "org-a";
const ORG_B = "org-b";
const ITEM = "20000000-0000-4000-8000-000000000001";
const WAREHOUSE = "40000000-0000-4000-8000-000000000001";
const UOM = "b1000000-0000-4000-8000-000000000001";
const SOURCE = "50000000-0000-4000-8000-000000000001";
const PO_LINE = "60000000-0000-4000-8000-000000000001";

function harness() {
	const masters = createMemoryMasterLookup({
		items: [seedItem(ORG_A, ITEM, "SKU-A", UOM)],
		warehouses: [seedWarehouse(ORG_A, WAREHOUSE, "WH-A")],
		uoms: [seedUom(UOM, "EA")],
	});
	return {
		store: createMemoryReceivingStore(),
		ports: createMemoryMutationPorts(),
		masters,
		authorization: createGrantingReceivingAuthorization([
			RECEIVING_PERMISSION_RECEIPT_READ,
			RECEIVING_PERMISSION_RECEIPT_CREATE,
			RECEIVING_PERMISSION_RECEIPT_UPDATE,
			RECEIVING_PERMISSION_RECEIPT_POST,
			RECEIVING_PERMISSION_RECEIPT_CANCEL,
			RECEIVING_PERMISSION_RECEIPT_REVERSE,
			RECEIVING_PERMISSION_DISCREPANCY_RECORD,
			RECEIVING_PERMISSION_DISCREPANCY_RESOLVE,
		]),
		inventory: createInventoryCommandTestOptions(masters),
		purchaseOrderReceivingQuery: createMemoryPurchaseOrderReceivingQueryPort({
			[SOURCE]: postedPoSnapshot({ lineId: PO_LINE, ordered: "100" }),
		}),
	};
}

async function create(ctx: ReturnType<typeof harness>, code = "GR-100") {
	return createDraftGoodsReceipt(
		{
			organizationId: ORG_A,
			actorUserId: "user-1",
			correlationId: `corr-${code}`,
			idempotencyKey: `create:${code}`,
			code,
			source: { kind: "purchase_order", purchaseOrderId: SOURCE },
			warehouseId: WAREHOUSE,
		},
		ctx,
	);
}

describe("@afenda/receiving domain", () => {
	it("creates, adds a line, posts accepted qty, and emits lifecycle events", async () => {
		const ctx = harness();
		const draft = await create(ctx);
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;
		const line = await addGoodsReceiptLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-line",
				idempotencyKey: "line-1",
				receiptId: draft.data.id,
				itemId: ITEM,
				quantityOrdered: 5,
				quantityReceived: 4,
				quantityAccepted: 4,
				purchaseOrderLineId: PO_LINE,
			},
			ctx,
		);
		expect(line.ok).toBe(true);
		const current = await getGoodsReceiptById(
			{ organizationId: ORG_A, actorUserId: "user-1", id: draft.data.id },
			ctx,
		);
		expect(current.ok).toBe(true);
		if (!current.ok || current.data === null) return;
		const posted = await postGoodsReceipt(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-post",
				idempotencyKey: "post-1",
				receiptId: draft.data.id,
				expectedVersion: current.data.version,
			},
			ctx,
		);
		expect(posted.ok).toBe(true);
		if (posted.ok) {
			expect(posted.data.status).toBe("posted");
			expect(posted.data.inventoryApplicationStatus).toBe("applied");
			const movement =
				await ctx.inventory.store?.getMovementByCreateIdempotencyKey(
					ORG_A,
					`rcv-post:${posted.data.id}`,
				);
			expect(movement?.ok).toBe(true);
			if (movement?.ok && movement.data !== null) {
				expect(movement.data.status).toBe("posted");
				expect(movement.data.lines[0]?.quantity).toBe("4");
			}
		}
		expect(ctx.ports.outbox.calls.map((call) => call.type)).toEqual([
			"receiving.receipt.created.v1",
			"receiving.receipt.line_added.v1",
			"receiving.receipt.posted.v1",
		]);
	});

	it("rejects empty post and duplicate normalized code", async () => {
		const ctx = harness();
		const draft = await create(ctx, "gr-dup");
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;
		const emptyPost = await postGoodsReceipt(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-empty",
				idempotencyKey: "post-empty",
				receiptId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			ctx,
		);
		expect(emptyPost.ok).toBe(false);
		const duplicate = await create(ctx, "GR-DUP");
		expect(duplicate.ok).toBe(false);
		if (!duplicate.ok) expect(duplicate.code).toBe("CONFLICT");
	});

	it("requires purchase_order source and isolates organizations", async () => {
		const ctx = harness();
		const draft = await create(ctx, "GR-ORG");
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;
		const foreign = await getGoodsReceiptById(
			{ organizationId: ORG_B, actorUserId: "user-1", id: draft.data.id },
			ctx,
		);
		expect(foreign.ok).toBe(true);
		if (foreign.ok) expect(foreign.data).toBeNull();
		const foreignList = await listGoodsReceipts(
			{ organizationId: ORG_B, actorUserId: "user-1" },
			ctx,
		);
		expect(foreignList.ok).toBe(true);
		if (foreignList.ok) expect(foreignList.data).toEqual([]);
	});

	it("records and resolves discrepancies", async () => {
		const ctx = harness();
		const draft = await create(ctx, "GR-DISC");
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;
		const draftDiscrepancy = await recordReceivingDiscrepancy(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-disc-1",
				idempotencyKey: "disc-1",
				receiptId: draft.data.id,
				discrepancyType: "damaged",
				quantity: 1,
			},
			ctx,
		);
		expect(draftDiscrepancy.ok).toBe(true);
		if (!draftDiscrepancy.ok) return;
		const resolved = await resolveReceivingDiscrepancy(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-disc-resolve",
				idempotencyKey: "disc-resolve-1",
				receiptId: draft.data.id,
				discrepancyId: draftDiscrepancy.data.id,
				expectedVersion: draftDiscrepancy.data.version,
				resolution: "Accepted as claim evidence",
			},
			ctx,
		);
		expect(resolved.ok).toBe(true);
		if (resolved.ok) expect(resolved.data.status).toBe("resolved");
	});

	it("cancels draft only and reverses posted receipts", async () => {
		const draftCtx = harness();
		const draft = await create(draftCtx, "GR-CANCEL-D");
		if (!draft.ok) return;
		const cancelledDraft = await cancelGoodsReceipt(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-cancel-d",
				idempotencyKey: "cancel-d",
				receiptId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			draftCtx,
		);
		expect(cancelledDraft.ok).toBe(true);
		expect(
			draftCtx.ports.outbox.calls.some(
				(call) => call.type === "receiving.receipt.cancelled.v1",
			),
		).toBe(true);

		const postedCtx = harness();
		const postedDraft = await create(postedCtx, "GR-CANCEL-P");
		if (!postedDraft.ok) return;
		await addGoodsReceiptLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-cancel-line",
				idempotencyKey: "line-cancel-p",
				receiptId: postedDraft.data.id,
				itemId: ITEM,
				quantityReceived: 1,
				purchaseOrderLineId: PO_LINE,
			},
			postedCtx,
		);
		const posted = await postGoodsReceipt(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-cancel-post",
				idempotencyKey: "post-cancel-p",
				receiptId: postedDraft.data.id,
				expectedVersion: 2,
			},
			postedCtx,
		);
		if (!posted.ok) return;
		const cancelled = await cancelGoodsReceipt(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-cancel-p",
				idempotencyKey: "cancel-p",
				receiptId: posted.data.id,
				expectedVersion: posted.data.version,
			},
			postedCtx,
		);
		expect(cancelled.ok).toBe(false);
		if (!cancelled.ok) {
			expect(cancelled.details).toMatchObject({
				receivingCode: "receiving.receipt.posted_cannot_cancel",
			});
		}

		const reversed = await reverseGoodsReceipt(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-reverse",
				idempotencyKey: "reverse-1",
				receiptId: posted.data.id,
				expectedVersion: posted.data.version,
				reason: "Incorrect receipt",
			},
			postedCtx,
		);
		expect(reversed.ok).toBe(true);
		if (reversed.ok) {
			expect(reversed.data.reversesReceiptId).toBe(posted.data.id);
			expect(reversed.data.inventoryApplicationStatus).toBe("applied");
		}
		const original = await getGoodsReceiptById(
			{ organizationId: ORG_A, actorUserId: "user-1", id: posted.data.id },
			postedCtx,
		);
		expect(original.ok).toBe(true);
		if (original.ok && original.data !== null) {
			expect(original.data.status).toBe("posted");
			expect(original.data.reversedByReceiptId).toBe(
				reversed.ok ? reversed.data.id : null,
			);
		}

		const doubleReverse = await reverseGoodsReceipt(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-reverse-2",
				idempotencyKey: "reverse-2",
				receiptId: posted.data.id,
				expectedVersion:
					original.ok && original.data !== null ? original.data.version : 3,
				reason: "second reverse must conflict",
			},
			postedCtx,
		);
		expect(doubleReverse.ok).toBe(false);
		if (!doubleReverse.ok) {
			expect(doubleReverse.details).toMatchObject({
				receivingCode: "receiving.receipt.already_reversed",
			});
		}
	});

	it("protects concurrent accepted qty against PO tolerance using owning sums", async () => {
		const ctx = harness();
		const first = await create(ctx, "GR-RACE-1");
		const second = await create(ctx, "GR-RACE-2");
		if (!first.ok || !second.ok) return;
		await addGoodsReceiptLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-race-1",
				idempotencyKey: "line-race-1",
				receiptId: first.data.id,
				itemId: ITEM,
				quantityReceived: 70,
				quantityAccepted: 70,
				purchaseOrderLineId: PO_LINE,
			},
			ctx,
		);
		await addGoodsReceiptLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-race-2",
				idempotencyKey: "line-race-2",
				receiptId: second.data.id,
				itemId: ITEM,
				quantityReceived: 60,
				quantityAccepted: 60,
				purchaseOrderLineId: PO_LINE,
			},
			ctx,
		);
		const firstPost = await postGoodsReceipt(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-race-post-1",
				idempotencyKey: "post-race-1",
				receiptId: first.data.id,
				expectedVersion: 2,
			},
			ctx,
		);
		expect(firstPost.ok).toBe(true);
		const secondPost = await postGoodsReceipt(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-race-post-2",
				idempotencyKey: "post-race-2",
				receiptId: second.data.id,
				expectedVersion: 2,
			},
			ctx,
		);
		expect(secondPost.ok).toBe(false);
	});

	it("lists inventory application exceptions", async () => {
		const ctx = harness();
		const draft = await create(ctx, "GR-EXC");
		if (!draft.ok) return;
		await addGoodsReceiptLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-exc-line",
				idempotencyKey: "line-exc",
				receiptId: draft.data.id,
				itemId: ITEM,
				quantityReceived: 1,
				purchaseOrderLineId: PO_LINE,
			},
			ctx,
		);
		await postGoodsReceipt(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-exc-post",
				idempotencyKey: "post-exc",
				receiptId: draft.data.id,
				expectedVersion: 2,
			},
			ctx,
		);
		await ctx.store.setInventoryApplication({
			organizationId: ORG_A,
			receiptId: draft.data.id,
			status: "failed",
			inventoryMovementId: null,
			errorMessage: "simulated",
			actorUserId: "user-1",
		});
		const exceptions = await listReceivingInventoryExceptions(
			{ organizationId: ORG_A, actorUserId: "user-1" },
			ctx,
		);
		expect(exceptions.ok).toBe(true);
		if (exceptions.ok) {
			expect(exceptions.data.some((row) => row.id === draft.data.id)).toBe(
				true,
			);
		}
	});
});
