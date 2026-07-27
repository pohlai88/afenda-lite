import { describe, expect, it } from "vitest";

import {
	EXTENSION_COMMAND_PERMISSION,
	extensionPermissionForCommand,
	isControlRelationshipType,
	isRegulatoryExternalIdType,
} from "../src/capabilities/extensions";
import {
	MASTER_COMMAND_ITEM_CREATE,
	MASTER_COMMAND_ITEM_VARIANT_CREATE,
	MASTER_COMMAND_PARTY_EXTERNAL_ID_CREATE_REGULATORY,
	MASTER_COMMAND_PARTY_RELATIONSHIP_CREATE_CONTROL,
} from "../src/module-ids";
import {
	MASTER_DATA_PERMISSION_ITEM_VARIANT_ATTRIBUTE_MANAGE,
	MASTER_DATA_PERMISSION_PARTY_EXTERNAL_ID_REGULATORY_MANAGE,
	MASTER_DATA_PERMISSION_PARTY_RELATIONSHIP_CONTROL_MANAGE,
} from "../src/permissions";

describe("extension authorization policy", () => {
	it("maps extension commands without treating outside commands as permission-free", () => {
		expect(
			extensionPermissionForCommand(
				MASTER_COMMAND_PARTY_EXTERNAL_ID_CREATE_REGULATORY,
			),
		).toBe(MASTER_DATA_PERMISSION_PARTY_EXTERNAL_ID_REGULATORY_MANAGE);
		expect(
			extensionPermissionForCommand(
				MASTER_COMMAND_PARTY_RELATIONSHIP_CREATE_CONTROL,
			),
		).toBe(MASTER_DATA_PERMISSION_PARTY_RELATIONSHIP_CONTROL_MANAGE);
		expect(
			extensionPermissionForCommand(MASTER_COMMAND_ITEM_VARIANT_CREATE),
		).toBe(MASTER_DATA_PERMISSION_ITEM_VARIANT_ATTRIBUTE_MANAGE);
		expect(EXTENSION_COMMAND_PERMISSION).toHaveProperty(
			MASTER_COMMAND_ITEM_VARIANT_CREATE,
		);

		expect(
			extensionPermissionForCommand(MASTER_COMMAND_ITEM_CREATE),
		).toBeNull();
	});

	it("classifies regulatory external-id fallback tokens conservatively", () => {
		for (const externalIdType of [
			"tax id",
			"tax/id",
			"taxId",
			"vatNumber",
			"company_registration_number",
			"government.registration",
		]) {
			expect(isRegulatoryExternalIdType(externalIdType)).toBe(true);
		}

		expect(isRegulatoryExternalIdType("legal-name-reference")).toBe(false);
		expect(isRegulatoryExternalIdType("")).toBe(false);
	});

	it("classifies only explicit corporate-control relationship types", () => {
		expect(isControlRelationshipType("parent_of")).toBe(true);
		expect(isControlRelationshipType("subsidiary_of")).toBe(true);
		expect(isControlRelationshipType("owned_by")).toBe(true);
		expect(isControlRelationshipType("related_party")).toBe(false);
		expect(isControlRelationshipType("franchisee_of")).toBe(false);
	});
});
