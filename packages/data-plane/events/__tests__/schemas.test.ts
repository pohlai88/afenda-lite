import { describe, expect, it } from "vitest";

import {
	AllEventSchemas,
	isKnownEventType,
	publishEventCommandSchema,
} from "../src/schemas";
import { EVENT_SOURCE_MODULES } from "../src/types";

describe("@afenda/events schemas", () => {
	it("registers living catalog types only", () => {
		expect(Object.keys(AllEventSchemas).toSorted()).toEqual([
			"accounting.journal.created.v1",
			"accounting.journal.posted.v1",
			"accounting.journal.reversed.v1",
			"accounting.period.closed.v1",
			"fulfillment.delivery.cancelled.v1",
			"fulfillment.delivery.closed.v1",
			"fulfillment.delivery.completed.v1",
			"fulfillment.delivery.created.v1",
			"fulfillment.delivery.posted.v1",
			"fulfillment.pack.confirmed.v1",
			"fulfillment.pick.confirmed.v1",
			"fulfillment.pod.recorded.v1",
			"identity.org_role.assigned",
			"inventory.movement.cancelled.v1",
			"inventory.movement.created.v1",
			"inventory.movement.posted.v1",
			"inventory.reservation.released.v1",
			"inventory.stock.reserved.v1",
			"master_data.change_request.applied.v1",
			"master_data.change_request.approved.v1",
			"master_data.change_request.rejected.v1",
			"master_data.change_request.submitted.v1",
			"master_data.item.activated.v1",
			"master_data.item.created.v1",
			"master_data.item.inactive.v1",
			"master_data.item.retired.v1",
			"master_data.item.updated.v1",
			"master_data.item_alias.created.v1",
			"master_data.item_barcode.created.v1",
			"master_data.item_external_id.created.v1",
			"master_data.item_group.activated.v1",
			"master_data.item_group.created.v1",
			"master_data.item_group.inactive.v1",
			"master_data.item_group.retired.v1",
			"master_data.item_group.updated.v1",
			"master_data.item_template.activated.v1",
			"master_data.item_template.created.v1",
			"master_data.item_template.inactive.v1",
			"master_data.item_template.retired.v1",
			"master_data.item_template.updated.v1",
			"master_data.item_template_attribute.created.v1",
			"master_data.item_template_attribute_option.created.v1",
			"master_data.item_uom.created.v1",
			"master_data.item_variant.created.v1",
			"master_data.item_variant.retired.v1",
			"master_data.party.activated.v1",
			"master_data.party.blocked.v1",
			"master_data.party.created.v1",
			"master_data.party.inactive.v1",
			"master_data.party.merged.v1",
			"master_data.party.restored.v1",
			"master_data.party.retired.v1",
			"master_data.party.updated.v1",
			"master_data.party_address.created.v1",
			"master_data.party_address.updated.v1",
			"master_data.party_contact.created.v1",
			"master_data.party_contact.updated.v1",
			"master_data.party_external_id.created.v1",
			"master_data.party_relationship.created.v1",
			"master_data.party_role.activated.v1",
			"master_data.party_role.created.v1",
			"master_data.party_role.retired.v1",
			"master_data.party_role.updated.v1",
			"master_data.payment_term.activated.v1",
			"master_data.payment_term.created.v1",
			"master_data.payment_term.inactive.v1",
			"master_data.payment_term.retired.v1",
			"master_data.payment_term.updated.v1",
			"master_data.tax_registration.activated.v1",
			"master_data.tax_registration.blocked.v1",
			"master_data.tax_registration.created.v1",
			"master_data.tax_registration.restored.v1",
			"master_data.tax_registration.retired.v1",
			"master_data.tax_registration.updated.v1",
			"master_data.warehouse.activated.v1",
			"master_data.warehouse.created.v1",
			"master_data.warehouse.inactive.v1",
			"master_data.warehouse.moved.v1",
			"master_data.warehouse.retired.v1",
			"master_data.warehouse.updated.v1",
			"master_data.warehouse_external_id.created.v1",
			"payables.allocation.posted.v1",
			"payables.allocation.reversed.v1",
			"payables.credit_note.posted.v1",
			"payables.invoice.created.v1",
			"payables.invoice.matched.v1",
			"payables.invoice.posted.v1",
			"payments.application_instruction.applied.v1",
			"payments.application_instruction.created.v1",
			"payments.application_instruction.rejected.v1",
			"payments.payment.created.v1",
			"payments.payment.posted.v1",
			"payments.payment.reversed.v1",
			"payments.refund.posted.v1",
			"payments.transfer.posted.v1",
			"platform.organization.deleted",
			"purchasing.order.cancelled.v1",
			"purchasing.order.closed.v1",
			"purchasing.order.created.v1",
			"purchasing.order.line_added.v1",
			"purchasing.order.posted.v1",
			"receivables.allocation.posted.v1",
			"receivables.allocation.reversed.v1",
			"receivables.credit_note.posted.v1",
			"receivables.invoice.cancelled.v1",
			"receivables.invoice.closed.v1",
			"receivables.invoice.created.v1",
			"receivables.invoice.posted.v1",
			"receivables.receipt_application.posted.v1",
			"receivables.receipt_application.reversed.v1",
			"receiving.discrepancy.recorded.v1",
			"receiving.discrepancy.resolved.v1",
			"receiving.receipt.cancelled.v1",
			"receiving.receipt.created.v1",
			"receiving.receipt.line_added.v1",
			"receiving.receipt.posted.v1",
			"receiving.receipt.reversed.v1",
			"sales.order.cancelled.v1",
			"sales.order.created.v1",
			"sales.order.line_added.v1",
			"sales.order.posted.v1",
		]);
		expect(isKnownEventType("identity.org_role.assigned")).toBe(true);
		expect(isKnownEventType("accounting.journal.posted.v1")).toBe(true);
		expect(isKnownEventType("master_data.party.created.v1")).toBe(true);
		expect(isKnownEventType("master_data.payment_term.created.v1")).toBe(true);
		expect(isKnownEventType("payables.invoice.matched.v1")).toBe(true);
		expect(isKnownEventType("payments.payment.reversed.v1")).toBe(true);
		expect(isKnownEventType("purchasing.order.created.v1")).toBe(true);
		expect(isKnownEventType("inventory.movement.created.v1")).toBe(true);
		expect(isKnownEventType("receiving.receipt.created.v1")).toBe(true);
		expect(isKnownEventType("fulfillment.delivery.created.v1")).toBe(true);
		expect(isKnownEventType("receivables.invoice.created.v1")).toBe(true);
		expect(isKnownEventType("sales.order.created.v1")).toBe(true);
		expect(isKnownEventType("crm.deal.won")).toBe(false);
	});

	it("registers payables as an event source module", () => {
		expect(EVENT_SOURCE_MODULES).toContain("payables");
	});

	it("registers payments as an event source module", () => {
		expect(EVENT_SOURCE_MODULES).toContain("payments");
	});

	it("registers accounting as an event source module", () => {
		expect(EVENT_SOURCE_MODULES).toContain("accounting");
	});

	it("accepts a valid publish command", () => {
		const parsed = publishEventCommandSchema.safeParse({
			type: "identity.org_role.assigned",
			sourceModule: "identity",
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-1",
			payload: {
				roleId: "role-1",
				assignmentId: "assign-1",
				recipientUserId: "user-2",
				reactivated: false,
			},
		});
		expect(parsed.success).toBe(true);
	});

	it("accepts a receivables publish command", () => {
		const parsed = publishEventCommandSchema.safeParse({
			type: "receivables.invoice.created.v1",
			sourceModule: "receivables",
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-1",
			payload: {
				organizationId: "org-1",
				entityId: "00000000-0000-4000-8000-000000000001",
				customerId: "00000000-0000-4000-8000-000000000002",
				amount: "125.50",
				currencyCode: "USD",
				actorId: "user-1",
				correlationId: "corr-1",
			},
		});
		expect(parsed.success).toBe(true);
	});

	it("accepts a payables publish command", () => {
		const parsed = publishEventCommandSchema.safeParse({
			type: "payables.invoice.matched.v1",
			sourceModule: "payables",
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-1",
			payload: {
				organizationId: "org-1",
				entityId: "00000000-0000-4000-8000-000000000001",
				supplierId: "00000000-0000-4000-8000-000000000002",
				amount: "125.50",
				currencyCode: "USD",
				actorId: "user-1",
				correlationId: "corr-1",
			},
		});
		expect(parsed.success).toBe(true);
	});

	it("accepts a payments publish command", () => {
		const parsed = publishEventCommandSchema.safeParse({
			type: "payments.payment.posted.v1",
			sourceModule: "payments",
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-1",
			payload: {
				organizationId: "org-1",
				paymentId: "00000000-0000-4000-8000-000000000001",
				paymentAccountId: "00000000-0000-4000-8000-000000000002",
				direction: "receipt",
				purpose: "customer_receipt",
				status: "posted",
				amount: "125.50",
				currencyCode: "USD",
				transferGroupId: null,
				linkedPaymentId: null,
				originalPaymentId: null,
				actorId: "user-1",
				correlationId: "corr-1",
			},
		});
		expect(parsed.success).toBe(true);
	});

	it("accepts an accounting publish command", () => {
		const parsed = publishEventCommandSchema.safeParse({
			type: "accounting.period.closed.v1",
			sourceModule: "accounting",
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-1",
			payload: {
				organizationId: "org-1",
				entityId: "00000000-0000-4000-8000-000000000001",
				actorId: "user-1",
				correlationId: "corr-1",
			},
		});
		expect(parsed.success).toBe(true);
	});
});
