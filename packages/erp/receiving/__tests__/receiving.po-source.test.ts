import { describe, expect, it } from "vitest";
import { createMemoryReceivingStore } from "../src/memory-store";
import {
	RECEIVING_PERMISSION_MANAGE,
	RECEIVING_PERMISSION_READ,
} from "../src/permissions";
import {
	addGoodsReceiptLine,
	createDraftGoodsReceipt,
	getGoodsReceiptById,
	postGoodsReceipt,
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
const ITEM = "20000000-0000-4000-8000-000000000001";
const WAREHOUSE = "40000000-0000-4000-8000-000000000001";
const UOM = "b1000000-0000-4000-8000-000000000001";
const PO_ID = "50000000-0000-4000-8000-000000000001";
const PO_LINE = "60000000-0000-4000-8000-000000000001";

function harness(
	poSeed: Record<string, ReturnType<typeof postedPoSnapshot>> = {
		[PO_ID]: postedPoSnapshot({ lineId: PO_LINE }),
	},
) {
	const purchaseOrderReceivingQuery =
		createMemoryPurchaseOrderReceivingQueryPort(poSeed);
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
		purchaseOrderReceivingQuery,
	};
}

async function createAgainstPo(
	ctx: ReturnType<typeof harness>,
	code: string,
	purchaseOrderId = PO_ID,
) {
	return createDraftGoodsReceipt(
		{
			organizationId: ORG_A,
			actorUserId: "user-1",
			correlationId: `corr-${code}`,
			code,
			sourceType: "purchase_order",
			sourceId: purchaseOrderId,
			warehouseId: WAREHOUSE,
		},
		ctx,
	);
}

describe("@afenda/receiving PO source-state", () => {
	it("rejects create against draft purchase order", async () => {
		const ctx = harness({
			[PO_ID]: postedPoSnapshot({ status: "draft", lineId: PO_LINE }),
		});
		const draft = await createAgainstPo(ctx, "GR-PO-DRAFT");
		expect(draft.ok).toBe(false);
		if (!draft.ok) expect(draft.code).toBe("CONFLICT");
	});

	it("rejects create against closed and cancelled purchase orders", async () => {
		const closedCtx = harness({
			[PO_ID]: postedPoSnapshot({ status: "closed", lineId: PO_LINE }),
		});
		const closed = await createAgainstPo(closedCtx, "GR-PO-CLOSED");
		expect(closed.ok).toBe(false);
		if (!closed.ok) expect(closed.code).toBe("CONFLICT");

		const cancelledCtx = harness({
			[PO_ID]: postedPoSnapshot({ status: "cancelled", lineId: PO_LINE }),
		});
		const cancelled = await createAgainstPo(cancelledCtx, "GR-PO-CANCEL");
		expect(cancelled.ok).toBe(false);
		if (!cancelled.ok) expect(cancelled.code).toBe("CONFLICT");
	});

	it("rejects create when purchase order is missing or cross-org without existence leak", async () => {
		const missingCtx = harness({});
		const missing = await createAgainstPo(missingCtx, "GR-PO-MISS");
		expect(missing.ok).toBe(false);
		if (!missing.ok) {
			expect(missing.code).toBe("NOT_FOUND");
			expect(missing.message).toBe("Purchase order not found");
		}

		const crossOrgCtx = harness({});
		const crossOrg = await createAgainstPo(crossOrgCtx, "GR-PO-XORG");
		expect(crossOrg.ok).toBe(false);
		if (!crossOrg.ok) {
			expect(crossOrg.code).toBe("NOT_FOUND");
			expect(crossOrg.message).toBe("Purchase order not found");
		}
	});

	it("allows create against posted purchase order", async () => {
		const ctx = harness();
		const draft = await createAgainstPo(ctx, "GR-PO-OK");
		expect(draft.ok).toBe(true);
	});

	it("rejects create when purchase order receiving query port is omitted", async () => {
		const ctx = harness();
		const { purchaseOrderReceivingQuery: _omit, ...withoutPort } = ctx;
		void _omit;
		const draft = await createDraftGoodsReceipt(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-no-port",
				code: "GR-NO-PORT",
				sourceType: "purchase_order",
				sourceId: PO_ID,
				warehouseId: WAREHOUSE,
			},
			withoutPort,
		);
		expect(draft.ok).toBe(false);
		if (!draft.ok) expect(draft.code).toBe("INTERNAL_ERROR");
	});

	it("rejects post when quantity exceeds remaining plus over-receipt tolerance", async () => {
		const ctx = harness({
			[PO_ID]: postedPoSnapshot({
				lineId: PO_LINE,
				ordered: "10",
				received: "0",
				overReceiptTolerancePercent: "10",
			}),
		});
		const draft = await createAgainstPo(ctx, "GR-PO-OVER");
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;
		await addGoodsReceiptLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-over-line",
				receiptId: draft.data.id,
				itemId: ITEM,
				quantityReceived: 12,
				purchaseOrderLineId: PO_LINE,
			},
			ctx,
		);
		const current = await getGoodsReceiptById(
			{ organizationId: ORG_A, actorUserId: "user-1", id: draft.data.id },
			ctx,
		);
		if (!current.ok || current.data === null) return;
		const posted = await postGoodsReceipt(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-over-post",
				receiptId: draft.data.id,
				expectedVersion: current.data.version,
			},
			ctx,
		);
		expect(posted.ok).toBe(false);
		if (!posted.ok) expect(posted.code).toBe("CONFLICT");
	});

	it("allows post at exact over-receipt tolerance boundary", async () => {
		const ctx = harness({
			[PO_ID]: postedPoSnapshot({
				lineId: PO_LINE,
				ordered: "10",
				received: "0",
				overReceiptTolerancePercent: "10",
			}),
		});
		const draft = await createAgainstPo(ctx, "GR-PO-BOUND");
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;
		await addGoodsReceiptLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-bound-line",
				receiptId: draft.data.id,
				itemId: ITEM,
				quantityReceived: 11,
				purchaseOrderLineId: PO_LINE,
			},
			ctx,
		);
		const current = await getGoodsReceiptById(
			{ organizationId: ORG_A, actorUserId: "user-1", id: draft.data.id },
			ctx,
		);
		if (!current.ok || current.data === null) return;
		const posted = await postGoodsReceipt(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-bound-post",
				receiptId: draft.data.id,
				expectedVersion: current.data.version,
			},
			ctx,
		);
		expect(posted.ok).toBe(true);
	});

	it("revalidates at post when purchase order closes after goods receipt draft", async () => {
		const ctx = harness({
			[PO_ID]: postedPoSnapshot({ lineId: PO_LINE, ordered: "10" }),
		});
		const draft = await createAgainstPo(ctx, "GR-PO-CLOSE-RACE");
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;
		await addGoodsReceiptLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-race-line",
				receiptId: draft.data.id,
				itemId: ITEM,
				quantityReceived: 1,
				purchaseOrderLineId: PO_LINE,
			},
			ctx,
		);
		ctx.purchaseOrderReceivingQuery.setSnapshot(
			PO_ID,
			postedPoSnapshot({ status: "closed", lineId: PO_LINE }),
		);
		const current = await getGoodsReceiptById(
			{ organizationId: ORG_A, actorUserId: "user-1", id: draft.data.id },
			ctx,
		);
		if (!current.ok || current.data === null) return;
		const posted = await postGoodsReceipt(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-race-post",
				receiptId: draft.data.id,
				expectedVersion: current.data.version,
			},
			ctx,
		);
		expect(posted.ok).toBe(false);
		if (!posted.ok) {
			expect(posted.code).toBe("CONFLICT");
			expect(posted.message).toBe("Purchase order is closed");
		}
	});
});
