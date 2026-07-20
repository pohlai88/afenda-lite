import { describe, expect, it } from "vitest";

import {
	AllEventSchemas,
	isKnownEventType,
	publishEventCommandSchema,
} from "../src/schemas";

describe("@afenda/events schemas", () => {
	it("registers living catalog types only", () => {
		expect(Object.keys(AllEventSchemas).toSorted()).toEqual([
			"identity.org_role.assigned",
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
			"platform.organization.deleted",
			"purchasing.order.cancelled.v1",
			"purchasing.order.created.v1",
			"purchasing.order.line_added.v1",
			"purchasing.order.posted.v1",
			"sales.order.created.v1",
			"sales.order.line_added.v1",
			"sales.order.posted.v1",
		]);
		expect(isKnownEventType("identity.org_role.assigned")).toBe(true);
		expect(isKnownEventType("master_data.party.created.v1")).toBe(true);
		expect(isKnownEventType("master_data.payment_term.created.v1")).toBe(true);
		expect(isKnownEventType("purchasing.order.created.v1")).toBe(true);
		expect(isKnownEventType("sales.order.created.v1")).toBe(true);
		expect(isKnownEventType("crm.deal.won")).toBe(false);
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
});
