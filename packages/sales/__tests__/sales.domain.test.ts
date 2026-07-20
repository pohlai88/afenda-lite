import { describe, expect, it } from "vitest";
import { createMemorySalesStore } from "../src/memory-store";
import {
	addOrderLine,
	createDraftOrder,
	getOrderById,
	listOrders,
	postOrder,
} from "../src/order";
import {
	SALES_PERMISSION_MANAGE,
	SALES_PERMISSION_READ,
} from "../src/permissions";
import { createGrantingSalesAuthorization } from "./helpers/memory-authorization";
import {
	createMemoryMasterLookup,
	seedItem,
	seedParty,
	seedPaymentTerm,
	seedUom,
} from "./helpers/memory-masters";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG_A = "org-a";
const ORG_B = "org-b";
const PARTY_A = "10000000-0000-4000-8000-000000000001";
const PARTY_B = "10000000-0000-4000-8000-000000000002";
const ITEM_A = "20000000-0000-4000-8000-000000000001";
const ITEM_DRAFT = "20000000-0000-4000-8000-000000000002";
const TERM_A = "30000000-0000-4000-8000-000000000001";
const UOM_EA = "b1000000-0000-4000-8000-000000000001";

function harness(options?: {
	partyStatus?: "active" | "draft";
	itemStatus?: "active" | "draft";
}) {
	const store = createMemorySalesStore();
	const ports = createMemoryMutationPorts();
	const masters = createMemoryMasterLookup({
		parties: [
			seedParty(ORG_A, PARTY_A, "CUST-A", options?.partyStatus ?? "active"),
			seedParty(ORG_B, PARTY_B, "CUST-B", "active"),
		],
		items: [
			seedItem(ORG_A, ITEM_A, "SKU-A", UOM_EA, options?.itemStatus ?? "active"),
			seedItem(ORG_A, ITEM_DRAFT, "SKU-DRAFT", UOM_EA, "draft"),
		],
		paymentTerms: [seedPaymentTerm(ORG_A, TERM_A, "NET30", 30, "active")],
		uoms: [seedUom(UOM_EA, "EA")],
	});
	const authorization = createGrantingSalesAuthorization([
		SALES_PERMISSION_READ,
		SALES_PERMISSION_MANAGE,
	]);
	return { store, ports, masters, authorization };
}

describe("@afenda/sales domain", () => {
	it("binds list/get to organization and stamps party snapshots on create", async () => {
		const { store, ports, masters, authorization } = harness();
		const created = await createDraftOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-1",
				code: "SO-100",
				partyId: PARTY_A,
				paymentTermId: TERM_A,
			},
			{ store, ports, masters, authorization },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.partyCode).toBe("CUST-A");
		expect(created.data.partyName).toBe("Party CUST-A");
		expect(created.data.paymentTermCode).toBe("NET30");
		expect(created.data.netDays).toBe(30);
		expect(created.data.status).toBe("draft");

		const foreign = await getOrderById(
			{ organizationId: ORG_B, actorUserId: "user-1", id: created.data.id },
			{ store, ports, masters, authorization },
		);
		expect(foreign.ok).toBe(true);
		if (foreign.ok) {
			expect(foreign.data).toBeNull();
		}

		const listed = await listOrders(
			{ organizationId: ORG_A, actorUserId: "user-1", page: 1, pageSize: 50 },
			{ store, ports, masters, authorization },
		);
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data).toHaveLength(1);
			expect(listed.data[0]?.code).toBe("SO-100");
		}
	});

	it("rejects cross-org party and item FK resolution", async () => {
		const { store, ports, masters, authorization } = harness();
		const crossParty = await createDraftOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-2",
				code: "SO-200",
				partyId: PARTY_B,
			},
			{ store, ports, masters, authorization },
		);
		expect(crossParty.ok).toBe(false);
		if (!crossParty.ok) {
			expect(crossParty.code).toBe("NOT_FOUND");
		}

		const created = await createDraftOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-3",
				code: "SO-201",
				partyId: PARTY_A,
			},
			{ store, ports, masters, authorization },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const crossItem = await addOrderLine(
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

	it("posts with frozen snapshots and rejects inactive masters / empty lines", async () => {
		const emptyHarness = harness();
		const emptyOrder = await createDraftOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-5",
				code: "SO-300",
				partyId: PARTY_A,
			},
			emptyHarness,
		);
		expect(emptyOrder.ok).toBe(true);
		if (!emptyOrder.ok) {
			return;
		}
		const emptyPost = await postOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-6",
				orderId: emptyOrder.data.id,
				expectedVersion: emptyOrder.data.version,
			},
			emptyHarness,
		);
		expect(emptyPost.ok).toBe(false);

		const ready = harness();
		const draft = await createDraftOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-7",
				code: "SO-301",
				partyId: PARTY_A,
				paymentTermId: TERM_A,
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) {
			return;
		}
		const line = await addOrderLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-8",
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

		const current = await getOrderById(
			{ organizationId: ORG_A, actorUserId: "user-1", id: draft.data.id },
			ready,
		);
		expect(current.ok).toBe(true);
		if (!current.ok || current.data === null) {
			return;
		}

		const posted = await postOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-9",
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
		expect(posted.data.partyCode).toBe("CUST-A");
		expect(posted.data.lines[0]?.itemCode).toBe("SKU-A");
		expect(posted.data.lines[0]?.baseUomCode).toBe("EA");
		expect(
			ready.ports.outbox.calls.some((c) => c.type === "sales.order.posted.v1"),
		).toBe(true);

		const inactiveParty = harness({ partyStatus: "draft" });
		const inactiveDraft = await createDraftOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-10",
				code: "SO-302",
				partyId: PARTY_A,
			},
			inactiveParty,
		);
		expect(inactiveDraft.ok).toBe(true);
		if (!inactiveDraft.ok) {
			return;
		}
		await addOrderLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-11",
				orderId: inactiveDraft.data.id,
				itemId: ITEM_A,
				quantity: 1,
			},
			inactiveParty,
		);
		const blocked = await postOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-12",
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
		const itemDraft = await createDraftOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-13",
				code: "SO-303",
				partyId: PARTY_A,
			},
			inactiveItem,
		);
		expect(itemDraft.ok).toBe(true);
		if (!itemDraft.ok) {
			return;
		}
		await addOrderLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-14",
				orderId: itemDraft.data.id,
				itemId: ITEM_A,
				quantity: 1,
			},
			inactiveItem,
		);
		const itemBlocked = await postOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-15",
				orderId: itemDraft.data.id,
				expectedVersion: 2,
			},
			inactiveItem,
		);
		expect(itemBlocked.ok).toBe(false);
	});

	it("rejects pageSize above 100", async () => {
		const { store, ports, masters, authorization } = harness();
		const listed = await listOrders(
			{ organizationId: ORG_A, actorUserId: "user-1", page: 1, pageSize: 101 },
			{ store, ports, masters, authorization },
		);
		expect(listed.ok).toBe(false);
	});
});
