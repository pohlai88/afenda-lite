import { describe, expect, it } from "vitest";
import {
	itemGroupLifecyclePolicy,
	itemLifecyclePolicy,
	itemTemplateLifecyclePolicy,
	itemVariantLifecyclePolicy,
	partyLifecyclePolicy,
	paymentTermLifecyclePolicy,
	taxRegistrationLifecyclePolicy,
	warehouseLifecyclePolicy,
} from "../src/capabilities/lifecycle-governance";
import { masterDataModuleManifest } from "../src/module.manifest";
import {
	MASTER_COMMAND_ITEM_ACTIVATE,
	MASTER_COMMAND_ITEM_GROUP_RETIRE,
	MASTER_COMMAND_ITEM_RETIRE,
	MASTER_COMMAND_ITEM_TEMPLATE_INACTIVE,
	MASTER_COMMAND_ITEM_TEMPLATE_RETIRE,
	MASTER_COMMAND_PARTY_BLOCK,
	MASTER_COMMAND_PARTY_MERGE,
	MASTER_COMMAND_PARTY_RESTORE,
	MASTER_COMMAND_PARTY_RETIRE,
	MASTER_COMMAND_PAYMENT_TERM_RETIRE,
	MASTER_COMMAND_TAX_REGISTRATION_BLOCK,
	MASTER_COMMAND_TAX_REGISTRATION_RESTORE,
	MASTER_COMMAND_TAX_REGISTRATION_RETIRE,
	MASTER_COMMAND_WAREHOUSE_RETIRE,
} from "../src/module-ids";
import { MASTER_DATA_PERMISSION_CODES } from "../src/permissions";

const RECOMMENDED_LIFECYCLE_PERMISSIONS = [
	"master_data.party_activate",
	"master_data.party_inactivate",
	"master_data.party_block",
	"master_data.party_unblock",
	"master_data.party_archive",
	"master_data.party_merge",
	"master_data.item_activate",
	"master_data.item_inactivate",
	"master_data.item_block",
	"master_data.item_unblock",
	"master_data.item_retire",
	"master_data.item_archive",
	"master_data.item_group_activate",
	"master_data.item_group_inactivate",
	"master_data.item_group_archive",
	"master_data.warehouse_activate",
	"master_data.warehouse_inactivate",
	"master_data.warehouse_block",
	"master_data.warehouse_unblock",
	"master_data.warehouse_retire",
	"master_data.warehouse_archive",
	"master_data.payment_term_activate",
	"master_data.payment_term_inactivate",
	"master_data.payment_term_archive",
	"master_data.tax_registration_activate",
	"master_data.tax_registration_revoke",
	"master_data.tax_registration_archive",
	"master_data.item_template_activate",
	"master_data.item_template_retire",
	"master_data.item_variant_activate",
	"master_data.item_variant_inactivate",
	"master_data.item_variant_block",
	"master_data.item_variant_unblock",
	"master_data.item_variant_retire",
	"master_data.item_variant_archive",
] as const;

describe("lifecycle authorization policy", () => {
	it("publishes the recommended lifecycle permission catalog", () => {
		for (const permission of RECOMMENDED_LIFECYCLE_PERMISSIONS) {
			expect(MASTER_DATA_PERMISSION_CODES).toContain(permission);
			expect(masterDataModuleManifest.permissions.codes).toContain(permission);
		}
		expect(MASTER_DATA_PERMISSION_CODES).toContain("master_data.party_retire");
		expect(MASTER_DATA_PERMISSION_CODES).toContain(
			"master_data.tax_registration_restore",
		);
		expect(MASTER_DATA_PERMISSION_CODES).toContain(
			"master_data.item_template_inactivate",
		);
	});

	it("keeps lifecycle transition definitions inside the permission catalog", () => {
		const policies = [
			partyLifecyclePolicy,
			itemLifecyclePolicy,
			itemGroupLifecyclePolicy,
			warehouseLifecyclePolicy,
			paymentTermLifecyclePolicy,
			taxRegistrationLifecyclePolicy,
			itemTemplateLifecyclePolicy,
			itemVariantLifecyclePolicy,
		] as const;

		for (const policy of policies) {
			for (const transition of Object.values(policy.transitions)) {
				expect(MASTER_DATA_PERMISSION_CODES).toContain(
					transition.requiredPermission,
				);
			}
		}
	});

	it("maps root lifecycle commands to distinct lifecycle permissions", () => {
		const commands = masterDataModuleManifest.authorization.commands;

		expect(commands[MASTER_COMMAND_ITEM_ACTIVATE]).toBe(
			"master_data.item_activate",
		);
		expect(commands[MASTER_COMMAND_ITEM_RETIRE]).toBe(
			"master_data.item_archive",
		);
		expect(commands[MASTER_COMMAND_PARTY_BLOCK]).toBe(
			"master_data.party_suspend",
		);
		expect(commands[MASTER_COMMAND_PARTY_RESTORE]).toBe(
			"master_data.party_unblock",
		);
		expect(commands[MASTER_COMMAND_PARTY_RETIRE]).toBe(
			"master_data.party_archive",
		);
		expect(commands[MASTER_COMMAND_PARTY_MERGE]).toBe(
			"master_data.party_merge",
		);
		expect(commands[MASTER_COMMAND_ITEM_GROUP_RETIRE]).toBe(
			"master_data.item_extension_manage",
		);
		expect(commands[MASTER_COMMAND_WAREHOUSE_RETIRE]).toBe(
			"master_data.warehouse_manage",
		);
		expect(commands[MASTER_COMMAND_PAYMENT_TERM_RETIRE]).toBe(
			"master_data.payment_term_manage",
		);
		expect(commands[MASTER_COMMAND_TAX_REGISTRATION_BLOCK]).toBe(
			"master_data.tax_registration_manage",
		);
		expect(commands[MASTER_COMMAND_TAX_REGISTRATION_RESTORE]).toBe(
			"master_data.tax_registration_manage",
		);
		expect(commands[MASTER_COMMAND_TAX_REGISTRATION_RETIRE]).toBe(
			"master_data.tax_registration_manage",
		);
		expect(commands[MASTER_COMMAND_ITEM_TEMPLATE_INACTIVE]).toBe(
			"master_data.template_manage",
		);
		expect(commands[MASTER_COMMAND_ITEM_TEMPLATE_RETIRE]).toBe(
			"master_data.template_manage",
		);
	});
});
