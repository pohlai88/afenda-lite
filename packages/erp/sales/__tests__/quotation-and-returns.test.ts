import { describe, expect, it } from "vitest";
import {
	acceptSalesQuotation,
	addReturnAuthorizationLine,
	addSalesOrderLine,
	addSalesQuotationLine,
	approveReturnAuthorization,
	approveSalesOrder,
	approveSalesQuotation,
	createDraftSalesOrder,
	createDraftSalesQuotation,
	createReturnAuthorization,
	getReturnAuthorization,
	getSalesQuotation,
	listReturnAuthorizations,
	listSalesQuotations,
	postSalesOrder,
	recordSalesOrderFulfillment,
	sendSalesQuotation,
	submitReturnAuthorization,
	submitSalesOrder,
	submitSalesQuotation,
} from "../src";
import {
	ACTOR_USER_ID,
	createHarness,
	ITEM_ID,
	mutationContext,
	ORGANIZATION_ID,
	PARTY_ID,
} from "./helpers/harness";

describe("quotation and return lifecycles", () => {
	it("enforces the quotation approval and acceptance sequence", async () => {
		const options = createHarness();
		const quotation = await createDraftSalesQuotation(
			{
				...mutationContext("quote"),
				code: "SQ-001",
				partyId: PARTY_ID,
				currencyCode: "USD",
				validUntil: new Date("2026-08-31"),
			},
			options,
		);
		if (!quotation.ok) throw new Error(quotation.message);
		const fetched = await getSalesQuotation(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: ACTOR_USER_ID,
				correlationId: "test:quote-get",
				id: quotation.data.id,
			},
			options,
		);
		expect(fetched.ok && fetched.data?.id).toBe(quotation.data.id);
		const listed = await listSalesQuotations(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: ACTOR_USER_ID,
				correlationId: "test:quote-list",
				pageSize: 1,
			},
			options,
		);
		expect(listed.ok && listed.data.items).toHaveLength(1);
		const line = await addSalesQuotationLine(
			{
				...mutationContext("quote-line"),
				quotationId: quotation.data.id,
				expectedVersion: quotation.data.version,
				itemId: ITEM_ID,
				quantity: "2",
				unitPrice: "50",
			},
			options,
		);
		expect(line.ok).toBe(true);
		const submitted = await submitSalesQuotation(
			{
				...mutationContext("quote-submit"),
				quotationId: quotation.data.id,
				expectedVersion: 2,
			},
			options,
		);
		if (!submitted.ok) throw new Error(submitted.message);
		const approved = await approveSalesQuotation(
			{
				...mutationContext("quote-approve"),
				quotationId: quotation.data.id,
				expectedVersion: submitted.data.version,
			},
			options,
		);
		if (!approved.ok) throw new Error(approved.message);
		const sent = await sendSalesQuotation(
			{
				...mutationContext("quote-send"),
				quotationId: quotation.data.id,
				expectedVersion: approved.data.version,
			},
			options,
		);
		if (!sent.ok) throw new Error(sent.message);
		const accepted = await acceptSalesQuotation(
			{
				...mutationContext("quote-accept"),
				quotationId: quotation.data.id,
				expectedVersion: sent.data.version,
			},
			options,
		);
		expect(accepted.ok && accepted.data.status).toBe("accepted");
	});

	it("authorizes a return only against fulfilled quantity", async () => {
		const options = createHarness();
		const order = await createDraftSalesOrder(
			{
				...mutationContext("return-order"),
				code: "SO-RETURN",
				partyId: PARTY_ID,
				currencyCode: "USD",
			},
			options,
		);
		if (!order.ok) throw new Error(order.message);
		const line = await addSalesOrderLine(
			{
				...mutationContext("return-order-line"),
				orderId: order.data.id,
				expectedVersion: order.data.version,
				itemId: ITEM_ID,
				quantity: "2",
				unitPrice: "10",
			},
			options,
		);
		if (!line.ok) throw new Error(line.message);
		const submittedOrder = await submitSalesOrder(
			{
				...mutationContext("return-order-submit"),
				orderId: order.data.id,
				expectedVersion: 2,
			},
			options,
		);
		if (!submittedOrder.ok) throw new Error(submittedOrder.message);
		const approvedOrder = await approveSalesOrder(
			{
				...mutationContext("return-order-approve"),
				orderId: order.data.id,
				expectedVersion: submittedOrder.data.version,
			},
			options,
		);
		if (!approvedOrder.ok) throw new Error(approvedOrder.message);
		const released = await postSalesOrder(
			{
				...mutationContext("return-order-post"),
				orderId: order.data.id,
				expectedVersion: approvedOrder.data.version,
			},
			options,
		);
		if (!released.ok) throw new Error(released.message);
		const fulfilled = await recordSalesOrderFulfillment(
			{
				...mutationContext("return-order-fulfill"),
				orderId: order.data.id,
				lineId: line.data.id,
				expectedVersion: released.data.version,
				fulfilledQuantity: "2",
			},
			options,
		);
		expect(fulfilled.ok && fulfilled.data.status).toBe("fulfilled");
		const authorization = await createReturnAuthorization(
			{
				...mutationContext("return"),
				code: "RA-001",
				orderId: order.data.id,
				reason: "Goods damaged in transit",
			},
			options,
		);
		if (!authorization.ok) throw new Error(authorization.message);
		const fetched = await getReturnAuthorization(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: ACTOR_USER_ID,
				correlationId: "test:return-get",
				id: authorization.data.id,
			},
			options,
		);
		expect(fetched.ok && fetched.data?.id).toBe(authorization.data.id);
		const listed = await listReturnAuthorizations(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: ACTOR_USER_ID,
				correlationId: "test:return-list",
				pageSize: 1,
			},
			options,
		);
		expect(listed.ok && listed.data.items).toHaveLength(1);
		const returnLine = await addReturnAuthorizationLine(
			{
				...mutationContext("return-line"),
				returnAuthorizationId: authorization.data.id,
				expectedVersion: authorization.data.version,
				orderLineId: line.data.id,
				quantity: "1",
				reason: "Outer casing is cracked",
				requestedDisposition: "replacement",
			},
			options,
		);
		expect(returnLine.ok).toBe(true);
		const submitted = await submitReturnAuthorization(
			{
				...mutationContext("return-submit"),
				returnAuthorizationId: authorization.data.id,
				expectedVersion: 2,
			},
			options,
		);
		if (!submitted.ok) throw new Error(submitted.message);
		const approved = await approveReturnAuthorization(
			{
				...mutationContext("return-approve"),
				returnAuthorizationId: authorization.data.id,
				expectedVersion: submitted.data.version,
			},
			options,
		);
		expect(approved.ok && approved.data.status).toBe("approved");
	});
});
