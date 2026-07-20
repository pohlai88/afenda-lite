import { describe, expect, it } from "vitest";
import { createMemoryReceivingStore } from "../src/memory-store";
import {
	RECEIVING_PERMISSION_MANAGE,
	RECEIVING_PERMISSION_READ,
} from "../src/permissions";
import {
	addGoodsReceiptLine,
	cancelGoodsReceipt,
	createDraftGoodsReceipt,
	getGoodsReceiptById,
	listGoodsReceipts,
	postGoodsReceipt,
	recordReceivingDiscrepancy,
} from "../src/receipt";
import { createGrantingReceivingAuthorization } from "./helpers/memory-authorization";
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
	return {
		store: createMemoryReceivingStore(),
		ports: createMemoryMutationPorts(),
		masters: createMemoryMasterLookup({
			items: [seedItem(ORG_A, ITEM, "SKU-A", UOM)],
			warehouses: [seedWarehouse(ORG_A, WAREHOUSE, "WH-A")],
			uoms: [seedUom(UOM, "EA")],
		}),
		authorization: createGrantingReceivingAuthorization([
			RECEIVING_PERMISSION_READ,
			RECEIVING_PERMISSION_MANAGE,
		]),
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
			code,
			sourceType: "purchase_order",
			sourceId: SOURCE,
			warehouseId: WAREHOUSE,
		},
		ctx,
	);
}

describe("@afenda/receiving domain", () => {
	it("creates, adds a line, posts, and emits only receiving lifecycle events", async () => {
		const ctx = harness();
		const draft = await create(ctx);
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;
		const line = await addGoodsReceiptLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-line",
				receiptId: draft.data.id,
				itemId: ITEM,
				quantityOrdered: 5,
				quantityReceived: 4,
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
				receiptId: draft.data.id,
				expectedVersion: current.data.version,
			},
			ctx,
		);
		expect(posted.ok).toBe(true);
		if (posted.ok) expect(posted.data.status).toBe("posted");
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

	it("requires sourceId for purchase_order and isolates organizations", async () => {
		const ctx = harness();
		const invalid = await createDraftGoodsReceipt(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-source",
				code: "GR-SOURCE",
				sourceType: "purchase_order",
				warehouseId: WAREHOUSE,
			},
			ctx,
		);
		expect(invalid.ok).toBe(false);
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

	it("records discrepancies on draft and posted receipts", async () => {
		const ctx = harness();
		const draft = await create(ctx, "GR-DISC");
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;
		const draftDiscrepancy = await recordReceivingDiscrepancy(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-disc-1",
				receiptId: draft.data.id,
				discrepancyType: "damage",
				quantity: 1,
			},
			ctx,
		);
		expect(draftDiscrepancy.ok).toBe(true);
		await addGoodsReceiptLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-disc-line",
				receiptId: draft.data.id,
				itemId: ITEM,
				quantityReceived: 2,
				purchaseOrderLineId: PO_LINE,
			},
			ctx,
		);
		const beforePost = await getGoodsReceiptById(
			{ organizationId: ORG_A, actorUserId: "user-1", id: draft.data.id },
			ctx,
		);
		if (!beforePost.ok || beforePost.data === null) return;
		const posted = await postGoodsReceipt(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-disc-post",
				receiptId: draft.data.id,
				expectedVersion: beforePost.data.version,
			},
			ctx,
		);
		expect(posted.ok).toBe(true);
		const postedDiscrepancy = await recordReceivingDiscrepancy(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-disc-2",
				receiptId: draft.data.id,
				discrepancyType: "shortfall",
				quantity: 1,
			},
			ctx,
		);
		expect(postedDiscrepancy.ok).toBe(true);
		expect(
			ctx.ports.outbox.calls.filter(
				(call) => call.type === "receiving.discrepancy.recorded.v1",
			),
		).toHaveLength(2);
	});

	it("cancels draft and posted receipts with optimistic versions", async () => {
		const draftCtx = harness();
		const draft = await create(draftCtx, "GR-CANCEL-D");
		if (!draft.ok) return;
		const cancelledDraft = await cancelGoodsReceipt(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-cancel-d",
				receiptId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			draftCtx,
		);
		expect(cancelledDraft.ok).toBe(true);

		const postedCtx = harness();
		const postedDraft = await create(postedCtx, "GR-CANCEL-P");
		if (!postedDraft.ok) return;
		await addGoodsReceiptLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-cancel-line",
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
				receiptId: posted.data.id,
				expectedVersion: posted.data.version,
			},
			postedCtx,
		);
		expect(cancelled.ok).toBe(true);
		if (cancelled.ok) expect(cancelled.data.status).toBe("cancelled");
	});
});
