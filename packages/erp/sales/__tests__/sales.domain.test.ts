import { describe, expect, it } from "vitest";
import { createMemorySalesStore } from "../src/memory-store";
import {
	addSalesOrderLine,
	cancelSalesOrder,
	createDraftSalesOrder,
	getSalesOrderById,
	listSalesOrders,
	postSalesOrder,
} from "../src/order";
import { SALES_PERMISSION_CODES } from "../src/permissions";
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
	customerRole?: boolean;
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
		customerRoles: {
			[PARTY_A]: options?.customerRole ?? true,
			[PARTY_B]: true,
		},
	});
	const authorization = createGrantingSalesAuthorization([
		...SALES_PERMISSION_CODES,
	]);
	return { store, ports, masters, authorization };
}

describe("@afenda/sales domain", () => {
	it("binds list/get to organization and stamps party snapshots on create", async () => {
		const { store, ports, masters, authorization } = harness();
		const created = await createDraftSalesOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-1",
				idempotencyKey: "create-1",
				code: "SO-100",
				partyId: PARTY_A,
				paymentTermId: TERM_A,
				currencyCode: "USD",
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
		expect(created.data.paymentTermName).toBe("Term NET30");
		expect(created.data.netDays).toBe(30);
		expect(created.data.currencyCode).toBe("USD");
		expect(created.data.status).toBe("draft");

		const foreign = await getSalesOrderById(
			{
				organizationId: ORG_B,
				actorUserId: "user-1",
				correlationId: "corr-1b",
				id: created.data.id,
			},
			{ store, ports, masters, authorization },
		);
		expect(foreign.ok).toBe(true);
		if (foreign.ok) {
			expect(foreign.data).toBeNull();
		}

		const listed = await listSalesOrders(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-1c",
				page: 1,
				pageSize: 50,
			},
			{ store, ports, masters, authorization },
		);
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data).toHaveLength(1);
			expect(listed.data[0]?.code).toBe("SO-100");
		}

		await createDraftSalesOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-1d",
				idempotencyKey: "create-1b",
				code: "SO-050",
				partyId: PARTY_A,
				currencyCode: "USD",
			},
			{ store, ports, masters, authorization },
		);
		const sorted = await listSalesOrders(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-1e",
				page: 1,
				pageSize: 50,
				sort: "code:asc",
			},
			{ store, ports, masters, authorization },
		);
		expect(sorted.ok).toBe(true);
		if (sorted.ok) {
			expect(sorted.data.map((row) => row.code)).toEqual(["SO-050", "SO-100"]);
		}
	});

	it("rejects parties without an active customer role", async () => {
		const { store, ports, masters, authorization } = harness({
			customerRole: false,
		});
		const created = await createDraftSalesOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-role",
				idempotencyKey: "create-role",
				code: "SO-ROLE",
				partyId: PARTY_A,
				currencyCode: "USD",
			},
			{ store, ports, masters, authorization },
		);
		expect(created.ok).toBe(false);
		if (!created.ok) {
			const details = created.details as { salesCode?: string } | undefined;
			expect(details?.salesCode).toBe("sales.customer.not_eligible");
		}
	});

	it("replays create and post under the same idempotency key", async () => {
		const ready = harness();
		const first = await createDraftSalesOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-id-1",
				idempotencyKey: "idem-create",
				code: "SO-IDEM",
				partyId: PARTY_A,
				currencyCode: "USD",
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}
		const second = await createDraftSalesOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-id-2",
				idempotencyKey: "idem-create",
				code: "SO-IDEM",
				partyId: PARTY_A,
				currencyCode: "USD",
			},
			ready,
		);
		expect(second.ok).toBe(true);
		if (second.ok) {
			expect(second.data.id).toBe(first.data.id);
		}

		await addSalesOrderLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-id-3",
				idempotencyKey: "idem-line",
				orderId: first.data.id,
				expectedVersion: 1,
				itemId: ITEM_A,
				quantity: 1,
				unitPrice: "10",
			},
			ready,
		);
		const posted = await postSalesOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-id-4",
				idempotencyKey: "idem-post",
				orderId: first.data.id,
				expectedVersion: 2,
			},
			ready,
		);
		expect(posted.ok).toBe(true);
		const replayPost = await postSalesOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-id-5",
				idempotencyKey: "idem-post",
				orderId: first.data.id,
				expectedVersion: 99,
			},
			ready,
		);
		expect(replayPost.ok).toBe(true);
		if (replayPost.ok) {
			expect(replayPost.data.status).toBe("posted");
		}
	});

	it("rejects cross-org party and item FK resolution", async () => {
		const { store, ports, masters, authorization } = harness();
		const crossParty = await createDraftSalesOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-2",
				idempotencyKey: "create-2",
				code: "SO-200",
				partyId: PARTY_B,
				currencyCode: "USD",
			},
			{ store, ports, masters, authorization },
		);
		expect(crossParty.ok).toBe(false);
		if (!crossParty.ok) {
			expect(crossParty.code).toBe("NOT_FOUND");
		}

		const created = await createDraftSalesOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-3",
				idempotencyKey: "create-3",
				code: "SO-201",
				partyId: PARTY_A,
				currencyCode: "USD",
			},
			{ store, ports, masters, authorization },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const crossItem = await addSalesOrderLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-4",
				idempotencyKey: "line-4",
				orderId: created.data.id,
				expectedVersion: 1,
				itemId: "20000000-0000-4000-8000-000000000099",
				quantity: 2,
				unitPrice: "10",
			},
			{ store, ports, masters, authorization },
		);
		expect(crossItem.ok).toBe(false);
		if (!crossItem.ok) {
			expect(crossItem.code).toBe("NOT_FOUND");
		}
	});

	it("posts with frozen snapshots, cancels, and rejects inactive masters / empty lines", async () => {
		const emptyHarness = harness();
		const emptyOrder = await createDraftSalesOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-5",
				idempotencyKey: "create-5",
				code: "SO-300",
				partyId: PARTY_A,
				currencyCode: "USD",
			},
			emptyHarness,
		);
		expect(emptyOrder.ok).toBe(true);
		if (!emptyOrder.ok) {
			return;
		}
		const emptyPost = await postSalesOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-6",
				idempotencyKey: "post-6",
				orderId: emptyOrder.data.id,
				expectedVersion: emptyOrder.data.version,
			},
			emptyHarness,
		);
		expect(emptyPost.ok).toBe(false);

		const ready = harness();
		const draft = await createDraftSalesOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-7",
				idempotencyKey: "create-7",
				code: "SO-301",
				partyId: PARTY_A,
				paymentTermId: TERM_A,
				currencyCode: "USD",
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) {
			return;
		}
		const line = await addSalesOrderLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-8",
				idempotencyKey: "line-8",
				orderId: draft.data.id,
				expectedVersion: 1,
				itemId: ITEM_A,
				quantity: "3.5",
				unitPrice: "10",
				discountAmount: "5",
			},
			ready,
		);
		expect(line.ok).toBe(true);
		if (!line.ok) {
			return;
		}
		expect(line.data.itemCode).toBe("SKU-A");
		expect(line.data.baseUomCode).toBe("EA");
		expect(line.data.unitPrice).toBe("10");
		expect(line.data.discountAmount).toBe("5");
		expect(line.data.lineAmount).toBe("30");

		const current = await getSalesOrderById(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-8b",
				id: draft.data.id,
			},
			ready,
		);
		expect(current.ok).toBe(true);
		if (!current.ok || current.data === null) {
			return;
		}

		const posted = await postSalesOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-9",
				idempotencyKey: "post-9",
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
		expect(posted.data.paymentTermName).toBe("Term NET30");
		expect(posted.data.subtotalAmount).toBe("30");
		expect(posted.data.discountTotal).toBe("5");
		expect(posted.data.taxTotal).toBe("0");
		expect(posted.data.documentTotal).toBe("30");
		expect(posted.data.lines[0]?.itemCode).toBe("SKU-A");
		expect(posted.data.lines[0]?.baseUomCode).toBe("EA");
		expect(posted.data.lines[0]?.lineAmount).toBe("30");
		expect(
			ready.ports.outbox.calls.some((c) => c.type === "sales.order.posted.v1"),
		).toBe(true);

		const cancelled = await cancelSalesOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-9c",
				idempotencyKey: "cancel-9",
				orderId: draft.data.id,
				expectedVersion: posted.data.version,
			},
			ready,
		);
		expect(cancelled.ok).toBe(true);
		if (cancelled.ok) {
			expect(cancelled.data.status).toBe("cancelled");
		}
		expect(
			ready.ports.outbox.calls.some(
				(c) => c.type === "sales.order.cancelled.v1",
			),
		).toBe(true);

		const inactiveParty = harness({ partyStatus: "draft" });
		const inactiveDraft = await createDraftSalesOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-10",
				idempotencyKey: "create-10",
				code: "SO-302",
				partyId: PARTY_A,
				currencyCode: "USD",
			},
			inactiveParty,
		);
		expect(inactiveDraft.ok).toBe(false);
		if (!inactiveDraft.ok) {
			expect(inactiveDraft.message).toMatch(/party must be active/i);
			const details = inactiveDraft.details as
				| { salesCode?: string }
				| undefined;
			expect(details?.salesCode).toBe("sales.party.inactive");
		}

		const inactiveItem = harness({ itemStatus: "draft" });
		const itemDraft = await createDraftSalesOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-13",
				idempotencyKey: "create-13",
				code: "SO-303",
				partyId: PARTY_A,
				currencyCode: "USD",
			},
			inactiveItem,
		);
		expect(itemDraft.ok).toBe(true);
		if (!itemDraft.ok) {
			return;
		}
		const inactiveLine = await addSalesOrderLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-14",
				idempotencyKey: "line-14",
				orderId: itemDraft.data.id,
				expectedVersion: 1,
				itemId: ITEM_A,
				quantity: 1,
				unitPrice: "10",
			},
			inactiveItem,
		);
		expect(inactiveLine.ok).toBe(false);
	});

	it("rejects add-line when expectedVersion does not match", async () => {
		const ready = harness();
		const draft = await createDraftSalesOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-occ-1",
				idempotencyKey: "create-occ-1",
				code: "SO-OCC",
				partyId: PARTY_A,
				currencyCode: "USD",
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) {
			return;
		}
		expect(draft.data.version).toBe(1);
		const conflict = await addSalesOrderLine(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-occ-2",
				idempotencyKey: "line-occ-2",
				orderId: draft.data.id,
				expectedVersion: 99,
				itemId: ITEM_A,
				quantity: 1,
				unitPrice: "10",
			},
			ready,
		);
		expect(conflict.ok).toBe(false);
		if (!conflict.ok) {
			expect(conflict.code).toBe("CONFLICT");
			const details = conflict.details as { salesCode?: string } | undefined;
			expect(details?.salesCode).toBe("sales.order.version_conflict");
		}
	});

	it("rejects pageSize above 100", async () => {
		const { store, ports, masters, authorization } = harness();
		const listed = await listSalesOrders(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-list",
				page: 1,
				pageSize: 101,
			},
			{ store, ports, masters, authorization },
		);
		expect(listed.ok).toBe(false);
	});

	it("applies deterministic tie-breaker with id when sorting by updatedAt", async () => {
		const { store, ports, masters, authorization } = harness();
		const order1 = await createDraftSalesOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-tie-1",
				idempotencyKey: "create-tie-1",
				code: "SO-TIE-1",
				partyId: PARTY_A,
				currencyCode: "USD",
			},
			{ store, ports, masters, authorization },
		);
		expect(order1.ok).toBe(true);
		if (!order1.ok) {
			return;
		}

		const order2 = await createDraftSalesOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-tie-2",
				idempotencyKey: "create-tie-2",
				code: "SO-TIE-2",
				partyId: PARTY_A,
				currencyCode: "USD",
			},
			{ store, ports, masters, authorization },
		);
		expect(order2.ok).toBe(true);
		if (!order2.ok) {
			return;
		}

		const order3 = await createDraftSalesOrder(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-tie-3",
				idempotencyKey: "create-tie-3",
				code: "SO-TIE-3",
				partyId: PARTY_A,
				currencyCode: "USD",
			},
			{ store, ports, masters, authorization },
		);
		expect(order3.ok).toBe(true);
		if (!order3.ok) {
			return;
		}

		const freezeTime = new Date("2025-01-01T12:00:00Z");
		for (const order of [order1.data, order2.data, order3.data]) {
			const inStore = await store.getOrderById(order.organizationId, order.id);
			if (inStore.ok && inStore.data) {
				inStore.data.updatedAt = freezeTime;
			}
		}

		const page1 = await listSalesOrders(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-tie-page1",
				page: 1,
				pageSize: 2,
				sort: "updatedAt:desc",
			},
			{ store, ports, masters, authorization },
		);
		expect(page1.ok).toBe(true);
		if (!page1.ok) {
			return;
		}
		expect(page1.data).toHaveLength(2);
		const ids1 = page1.data.map((o) => o.id);

		const page2 = await listSalesOrders(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-tie-page2",
				page: 2,
				pageSize: 2,
				sort: "updatedAt:desc",
			},
			{ store, ports, masters, authorization },
		);
		expect(page2.ok).toBe(true);
		if (!page2.ok) {
			return;
		}
		expect(page2.data).toHaveLength(1);
		const ids2 = page2.data.map((o) => o.id);

		const allIds = [...ids1, ...ids2];
		expect(new Set(allIds).size).toBe(3);
		expect(allIds).toContain(order1.data.id);
		expect(allIds).toContain(order2.data.id);
		expect(allIds).toContain(order3.data.id);
	});
});
