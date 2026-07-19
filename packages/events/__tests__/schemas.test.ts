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
			"platform.organization.deleted",
		]);
		expect(isKnownEventType("identity.org_role.assigned")).toBe(true);
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
				reactivated: true,
			},
		});
		expect(parsed.success).toBe(true);
	});
});
