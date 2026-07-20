import { describe, expect, it } from "vitest";
import { createMemoryPurchasingStore } from "../src/memory-store";
import {
	addPurchaseOrderLine,
	cancelPurchaseOrder,
	createDraftPurchaseOrder,
	getPurchaseOrderById,
	listPurchaseOrders,
	postPurchaseOrder,
} from "../src/order";
import {
	PURCHASING_PERMISSION_MANAGE,
	PURCHASING_PERMISSION_READ,
} from "../src/permissions";
import { createGrantingPurchasingAuthorization } from "./helpers/memory-authorization";
import {
	createMemoryMasterLookup,
	seedItem,
	seedParty,
	seedPaymentTerm,
	seedUom,
	seedWarehouse,
} from "./helpers/memory-masters";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG_A = "org-a";
const ORG_B = "org-b";
const PARTY_A = "10000000-0000-4000-8000-000000000001";
const PARTY_B = "10000000-0000-4000-8000-000000000002";
const PARTY_NO_SUPPLIER = "10000000-0000-4000-8000-000000000003";
const ITEM_A = "20000000-0000-4000-8000-000000000001";
const ITEM_DRAFT = "20000000-0000-4000-8000-000000000002";
const TERM_A = "30000000-0000-4000-8000-000000000001";
const WH_A = "40000000-0000-4000-8000-000000000001";
const WH_DRAFT = "40000000-0000-4000-8000-000000000002";
const UOM_EA = "b1000000-0000-4000-8000-000000000001";

function harness(options?: {
	partyStatus?: "active" | "draft";
	itemStatus?: "active" | "draft";
	warehouseStatus?: "active" | "draft";
	includeSupplierRole?: boolean;
}) {
	const store = createMemoryPurchasingStore();
	const ports = createMemoryMutationPorts();
	const supplierPartyIds =
		options?.includeSupplierRole === false ? [] : [PARTY_A];
	const masters = createMemoryMasterLookup({
		parties: [
			seedParty(ORG_A, PARTY_A, "SUP-A", options?.partyStatus ?? "active"),
			seedParty(ORG_B, PARTY_B, "SUP-B", "active"),
			seedParty(ORG_A, PARTY_NO_SUPPLIER, "NOSUP", "active"),
		],
		items: [
			seedItem(ORG_A, ITEM_A, "SKU-A", UOM_EA, options?.itemStatus ?? "active"),
			seedItem(ORG_A, ITEM_DRAFT, "SKU-DRAFT", UOM_EA, "draft"),
		],
		paymentTerms: [seedPaymentTerm(ORG_A, TERM_A, "NET30", 30, "active")],
		warehouses: [
			seedWarehouse(ORG_A, WH_A, "WH-A", options?.warehouseStatus ?? "active"),
			seedWarehouse(ORG_A, WH_DRAFT, "WH-DRAFT", "draft"),
		],
		uoms: [seedUom(UOM_EA, "EA")],
		supplierPartyIds,
	});
	const authorization = createGrantingPurchasingAuthorization([
		PURCHASING_PERMISSION_READ,
		PURCHASING_PERMISSION_MANAGE,
	]);
	return { store, ports, masters, authorization };
}

describe("@afenda/purchasing domain", () => {
	it("binds list/get to organization and stamps party snapshots on create", async () => {
		const { store, ports, masters, authorization } = harness();
		const created = await createDraftPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-1",
				code: "PO-100",
				partyId: PARTY_A,
				paymentTermId: TERM_A,
				warehouseId: WH_A,
			},
			{ store, ports, masters, authorization },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.partyCode).toBe("SUP-A");
		expect(created.data.partyName).toBe("Party SUP-A");
		expect(created.data.paymentTermCode).toBe("NET30");
		expect(created.data.netDays).toBe(30);
		expect(created.data.warehouseCode).toBe("WH-A");
		expect(created.data.status).toBe("draft");

		const foreign = await getPurchaseOrderById(
			{ organizationId: ORG_B, actorUserId: "user-1", id: created.data.id },
			{ store, ports, masters, authorization },
		);
		expect(foreign.ok).toBe(true);
		if (foreign.ok) {
			expect(foreign.data).toBeNull();
		}

		const listed = await listPurchaseOrders(
			{ organizationId: ORG_A, actorUserId: "user-1", page: 1, pageSize: 50 },
			{ store, ports, masters, authorization },
		);
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data).toHaveLength(1);
			expect(listed.data[0]?.code).toBe("PO-100");
		}
	});

	it("rejects duplicate org-scoped order codes (natural-key conflict)", async () => {
		const ctx = harness();
		const first = await createDraftPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-dup-1",
				code: "po-dup",
				partyId: PARTY_A,
			},
			ctx,
		);
		expect(first.ok).toBe(true);

		const second = await createDraftPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-dup-2",
				code: "PO-DUP",
				partyId: PARTY_A,
			},
			ctx,
		);
		expect(second.ok).toBe(false);
		if (!second.ok) {
			expect(second.code).toBe("CONFLICT");
			expect(second.message).toMatch(/already exists/i);
		}
	});

	it("rejects cross-org party and item FK resolution", async () => {
		const { store, ports, masters, authorization } = harness();
		const crossParty = await createDraftPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-2",
				code: "PO-200",
				partyId: PARTY_B,
			},
			{ store, ports, masters, authorization },
		);
		expect(crossParty.ok).toBe(false);
		if (!crossParty.ok) {
			expect(crossParty.code).toBe("NOT_FOUND");
		}

		const created = await createDraftPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-3",
				code: "PO-201",
				partyId: PARTY_A,
			},
			{ store, ports, masters, authorization },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const crossItem = await addPurchaseOrderLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-4",
				orderId: created.data.id,
				itemId: "20000000-0000-4000-8000-000000000099",
				quantity: 2,
			},
			{ store, ports, masters, authorization },
		);
		expect(crossItem.ok).toBe(false);
		if (!crossItem.ok) {
			expect(crossItem.code).toBe("NOT_FOUND");
		}
	});

	it("requires an active supplier role on create", async () => {
		const noSupplier = harness({ includeSupplierRole: false });
		const blocked = await createDraftPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-5",
				code: "PO-300",
				partyId: PARTY_A,
			},
			noSupplier,
		);
		expect(blocked.ok).toBe(false);
		if (!blocked.ok) {
			expect(blocked.message).toMatch(/active supplier role/i);
		}

		const missingRole = harness();
		const missing = await createDraftPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-6",
				code: "PO-301",
				partyId: PARTY_NO_SUPPLIER,
			},
			missingRole,
		);
		expect(missing.ok).toBe(false);
		if (!missing.ok) {
			expect(missing.message).toMatch(/active supplier role/i);
		}
	});

	it("posts with frozen snapshots and rejects inactive masters / empty lines", async () => {
		const emptyHarness = harness();
		const emptyOrder = await createDraftPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-7",
				code: "PO-400",
				partyId: PARTY_A,
			},
			emptyHarness,
		);
		expect(emptyOrder.ok).toBe(true);
		if (!emptyOrder.ok) {
			return;
		}
		const emptyPost = await postPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-8",
				orderId: emptyOrder.data.id,
				expectedVersion: emptyOrder.data.version,
			},
			emptyHarness,
		);
		expect(emptyPost.ok).toBe(false);

		const ready = harness();
		const draft = await createDraftPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-9",
				code: "PO-401",
				partyId: PARTY_A,
				paymentTermId: TERM_A,
				warehouseId: WH_A,
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) {
			return;
		}
		const line = await addPurchaseOrderLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-10",
				orderId: draft.data.id,
				itemId: ITEM_A,
				quantity: "3.5",
			},
			ready,
		);
		expect(line.ok).toBe(true);
		if (!line.ok) {
			return;
		}
		expect(line.data.itemCode).toBe("SKU-A");
		expect(line.data.baseUomCode).toBe("EA");

		const current = await getPurchaseOrderById(
			{ organizationId: ORG_A, actorUserId: "user-1", id: draft.data.id },
			ready,
		);
		expect(current.ok).toBe(true);
		if (!current.ok || current.data === null) {
			return;
		}

		const posted = await postPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-11",
				orderId: draft.data.id,
				expectedVersion: current.data.version,
			},
			ready,
		);
		expect(posted.ok).toBe(true);
		if (!posted.ok) {
			return;
		}
		expect(posted.data.status).toBe("posted");
		expect(posted.data.partyCode).toBe("SUP-A");
		expect(posted.data.warehouseCode).toBe("WH-A");
		expect(posted.data.lines[0]?.itemCode).toBe("SKU-A");
		expect(
			ready.ports.outbox.calls.some(
				(c) => c.type === "purchasing.order.posted.v1",
			),
		).toBe(true);

		const inactiveParty = harness({ partyStatus: "draft" });
		const inactiveDraft = await createDraftPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-12",
				code: "PO-402",
				partyId: PARTY_A,
			},
			inactiveParty,
		);
		expect(inactiveDraft.ok).toBe(true);
		if (!inactiveDraft.ok) {
			return;
		}
		await addPurchaseOrderLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-13",
				orderId: inactiveDraft.data.id,
				itemId: ITEM_A,
				quantity: 1,
			},
			inactiveParty,
		);
		const blocked = await postPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-14",
				orderId: inactiveDraft.data.id,
				expectedVersion: 2,
			},
			inactiveParty,
		);
		expect(blocked.ok).toBe(false);
		if (!blocked.ok) {
			expect(blocked.message).toMatch(/party is active/i);
		}

		const inactiveItem = harness({ itemStatus: "draft" });
		const itemDraft = await createDraftPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-15",
				code: "PO-403",
				partyId: PARTY_A,
			},
			inactiveItem,
		);
		expect(itemDraft.ok).toBe(true);
		if (!itemDraft.ok) {
			return;
		}
		await addPurchaseOrderLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-16",
				orderId: itemDraft.data.id,
				itemId: ITEM_A,
				quantity: 1,
			},
			inactiveItem,
		);
		const itemBlocked = await postPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-17",
				orderId: itemDraft.data.id,
				expectedVersion: 2,
			},
			inactiveItem,
		);
		expect(itemBlocked.ok).toBe(false);

		const inactiveWarehouse = harness({ warehouseStatus: "draft" });
		const whDraft = await createDraftPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-18",
				code: "PO-404",
				partyId: PARTY_A,
				warehouseId: WH_DRAFT,
			},
			inactiveWarehouse,
		);
		expect(whDraft.ok).toBe(true);
		if (!whDraft.ok) {
			return;
		}
		await addPurchaseOrderLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-19",
				orderId: whDraft.data.id,
				itemId: ITEM_A,
				quantity: 1,
			},
			inactiveWarehouse,
		);
		const whBlocked = await postPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-20",
				orderId: whDraft.data.id,
				expectedVersion: 2,
			},
			inactiveWarehouse,
		);
		expect(whBlocked.ok).toBe(false);
		if (!whBlocked.ok) {
			expect(whBlocked.message).toMatch(/warehouse is active/i);
		}
	});

	it("cancels draft and posted orders and rejects duplicate cancel", async () => {
		const ctx = harness();
		const draft = await createDraftPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-21",
				code: "PO-500",
				partyId: PARTY_A,
			},
			ctx,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) {
			return;
		}

		const cancelledDraft = await cancelPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-22",
				orderId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			ctx,
		);
		expect(cancelledDraft.ok).toBe(true);
		if (!cancelledDraft.ok) {
			return;
		}
		expect(cancelledDraft.data.status).toBe("cancelled");
		expect(
			ctx.ports.outbox.calls.some(
				(c) => c.type === "purchasing.order.cancelled.v1",
			),
		).toBe(true);

		const duplicate = await cancelPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-23",
				orderId: draft.data.id,
				expectedVersion: cancelledDraft.data.version,
			},
			ctx,
		);
		expect(duplicate.ok).toBe(false);
		if (!duplicate.ok) {
			expect(duplicate.message).toMatch(/already cancelled/i);
		}

		const postedCtx = harness();
		const postedDraft = await createDraftPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-24",
				code: "PO-501",
				partyId: PARTY_A,
			},
			postedCtx,
		);
		expect(postedDraft.ok).toBe(true);
		if (!postedDraft.ok) {
			return;
		}
		await addPurchaseOrderLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-25",
				orderId: postedDraft.data.id,
				itemId: ITEM_A,
				quantity: 1,
			},
			postedCtx,
		);
		const posted = await postPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-26",
				orderId: postedDraft.data.id,
				expectedVersion: 2,
			},
			postedCtx,
		);
		expect(posted.ok).toBe(true);
		if (!posted.ok) {
			return;
		}
		const cancelledPosted = await cancelPurchaseOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-27",
				orderId: posted.data.id,
				expectedVersion: posted.data.version,
			},
			postedCtx,
		);
		expect(cancelledPosted.ok).toBe(true);
		if (cancelledPosted.ok) {
			expect(cancelledPosted.data.status).toBe("cancelled");
		}
	});

	it("rejects pageSize above 100", async () => {
		const { store, ports, masters, authorization } = harness();
		const listed = await listPurchaseOrders(
			{ organizationId: ORG_A, actorUserId: "user-1", page: 1, pageSize: 101 },
			{ store, ports, masters, authorization },
		);
		expect(listed.ok).toBe(false);
	});
});
