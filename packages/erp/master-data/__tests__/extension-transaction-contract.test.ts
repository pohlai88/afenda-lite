import { describe, expect, it } from "vitest";

import {
	createExtensionEventPayload,
	EXTENSION_EVENT_TYPES,
	extensionEventClassification,
	partyRoleLifecycleEventType,
} from "../src/capabilities/extensions/extension-transaction-contract";

describe("extension transaction contract", () => {
	it("keeps all extension event names versioned", () => {
		for (const eventType of Object.values(EXTENSION_EVENT_TYPES)) {
			expect(eventType).toMatch(/^master_data\.[a-z0-9_]+\.[a-z0-9_]+\.v1$/);
		}
	});

	it("contains no duplicate extension event names", () => {
		const values = Object.values(EXTENSION_EVENT_TYPES);

		expect(new Set(values).size).toBe(values.length);
	});

	it.each([
		["activated", EXTENSION_EVENT_TYPES.partyRoleActivated],
		["deactivated", EXTENSION_EVENT_TYPES.partyRoleDeactivated],
		["retired", EXTENSION_EVENT_TYPES.partyRoleRetired],
		["archived", EXTENSION_EVENT_TYPES.partyRoleArchived],
	] as const)("maps party-role action %s", (action, expected) => {
		expect(partyRoleLifecycleEventType(action)).toBe(expected);
	});

	it("aligns template attribute option event names with extension kind", () => {
		expect(EXTENSION_EVENT_TYPES.itemTemplateAttributeOptionCreated).toBe(
			"master_data.item_template_attribute_option.created.v1",
		);
	});

	it("creates a non-sensitive classified event payload", () => {
		const payload = createExtensionEventPayload({
			organizationId: "org-1",
			entityType: "party_role",
			entityId: "role-1",
			parentEntityId: "party-1",
			classification: extensionEventClassification("party_role", "supplier"),
			version: 1,
			actorId: "user-1",
			correlationId: "corr-1",
		});

		expect(payload).toEqual({
			organizationId: "org-1",
			entityType: "party_role",
			entityId: "role-1",
			parentEntityId: "party-1",
			classification: { type: "role_code", code: "supplier" },
			version: 1,
			actorId: "user-1",
			correlationId: "corr-1",
		});
		expect(payload).not.toHaveProperty("code");
		expect(payload).not.toHaveProperty("reason");
	});

	it.each([
		0,
		-1,
		1.25,
		Number.MAX_SAFE_INTEGER + 1,
	])("rejects invalid version %s", (version) => {
		expect(() =>
			createExtensionEventPayload({
				organizationId: "org-1",
				entityType: "party_role",
				entityId: "role-1",
				version,
				actorId: "user-1",
				correlationId: "corr-1",
			}),
		).toThrow("positive safe integer");
	});
});
