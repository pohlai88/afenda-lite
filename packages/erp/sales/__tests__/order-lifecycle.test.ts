import { describe, expect, it } from "vitest";
import {
	addSalesOrderLine,
	approveSalesOrder,
	cancelSalesOrder,
	createDraftSalesOrder,
	getSalesOrderById,
	placeSalesOrderHold,
	postSalesOrder,
	resolveSalesOrderHold,
	submitSalesOrder,
} from "../src";
import {
	ACTOR_USER_ID,
	createHarness,
	ITEM_ID,
	mutationContext,
	OTHER_ORGANIZATION_ID,
	PARTY_ID,
} from "./helpers/harness";

async function draftWithLine() {
	const options = createHarness();
	const created = await createDraftSalesOrder(
		{
			...mutationContext("order-create"),
			code: "SO-001",
			partyId: PARTY_ID,
			currencyCode: "USD",
		},
		options,
	);
	if (!created.ok) throw new Error(created.message);
	const line = await addSalesOrderLine(
		{
			...mutationContext("order-line"),
			orderId: created.data.id,
			expectedVersion: created.data.version,
			itemId: ITEM_ID,
			quantity: "3",
			unitPrice: "19.995",
			discountAmount: "9.985",
		},
		options,
	);
	if (!line.ok) throw new Error(line.message);
	return { options, order: created.data, line: line.data };
}

describe("Sales order lifecycle", () => {
	it("is idempotent, snapshots masters, and isolates organizations", async () => {
		const options = createHarness();
		const input = {
			...mutationContext("same-command"),
			code: "SO-001",
			partyId: PARTY_ID,
			currencyCode: "USD",
		};
		const first = await createDraftSalesOrder(input, options);
		const replay = await createDraftSalesOrder(input, options);
		expect(first).toEqual(replay);
		expect(first.ok && first.data.customer.name).toBe("Acme Trading");
		if (!first.ok) return;
		const crossTenant = await getSalesOrderById(
			{
				organizationId: OTHER_ORGANIZATION_ID,
				actorUserId: ACTOR_USER_ID,
				correlationId: "test:cross-tenant",
				id: first.data.id,
			},
			options,
		);
		expect(crossTenant).toEqual({ ok: true, data: null });
	});

	it("enforces CAS and blocks release until every hold is resolved", async () => {
		const { options, order } = await draftWithLine();
		const stale = await cancelSalesOrder(
			{
				...mutationContext("stale"),
				orderId: order.id,
				expectedVersion: 1,
			},
			options,
		);
		expect(stale.ok).toBe(false);
		const submitted = await submitSalesOrder(
			{
				...mutationContext("submit"),
				orderId: order.id,
				expectedVersion: 2,
			},
			options,
		);
		if (!submitted.ok) throw new Error(submitted.message);
		const approved = await approveSalesOrder(
			{
				...mutationContext("approve"),
				orderId: order.id,
				expectedVersion: submitted.data.version,
			},
			options,
		);
		if (!approved.ok) throw new Error(approved.message);

		const hold = await placeSalesOrderHold(
			{
				...mutationContext("hold"),
				orderId: order.id,
				kind: "manual_review",
				reason: "Manager review required",
			},
			options,
		);
		if (!hold.ok) throw new Error(hold.message);
		const blocked = await postSalesOrder(
			{
				...mutationContext("post-blocked"),
				orderId: order.id,
				expectedVersion: approved.data.version,
			},
			options,
		);
		expect(blocked.ok).toBe(false);
		const resolved = await resolveSalesOrderHold(
			{ ...mutationContext("hold-resolve"), holdId: hold.data.id },
			options,
		);
		if (!resolved.ok) throw new Error(JSON.stringify(resolved));
		const released = await postSalesOrder(
			{
				...mutationContext("post"),
				orderId: order.id,
				expectedVersion: approved.data.version,
			},
			options,
		);
		if (!released.ok) throw new Error(JSON.stringify(released));
		expect(released.ok && released.data.status).toBe("released");
		expect(released.ok && released.data.documentTotal).toBe("50");
	});
});
