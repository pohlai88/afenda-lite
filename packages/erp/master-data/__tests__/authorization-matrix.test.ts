import { describe, expect, it } from "vitest";
import { masterDataModuleManifest } from "../src/module.manifest";
import {
	MASTER_COMMAND_CHANGE_REQUEST_APPROVE,
	MASTER_COMMAND_CHANGE_REQUEST_SUBMIT,
	MASTER_COMMAND_IMPORT_UPSERT_PARTIES,
	MASTER_COMMAND_IMPORT_VALIDATE_PARTY_BATCH,
	MASTER_COMMAND_ITEM_ALIAS_CREATE,
	MASTER_COMMAND_ITEM_CREATE,
	MASTER_COMMAND_ITEM_RETIRE,
	MASTER_COMMAND_ITEM_TEMPLATE_ATTRIBUTE_CREATE,
	MASTER_COMMAND_ITEM_VARIANT_CREATE,
	MASTER_COMMAND_ORGANIZATION_DIMENSION_CREATE,
	MASTER_COMMAND_ORGANIZATION_DIMENSION_UPDATE,
	MASTER_COMMAND_PARTY_BLOCK,
	MASTER_COMMAND_PARTY_CREATE,
	MASTER_COMMAND_PARTY_EXTERNAL_ID_CREATE,
	MASTER_COMMAND_PARTY_MERGE,
	MASTER_COMMAND_PARTY_RETIRE,
	MASTER_COMMAND_PAYMENT_TERM_UPDATE,
	MASTER_COMMAND_SEARCH_REBUILD,
	MASTER_COMMAND_TAX_REGISTRATION_UPDATE,
	MASTER_COMMAND_WAREHOUSE_UPDATE,
	MASTER_QUERY_CHANGE_REQUEST_LIST,
	MASTER_QUERY_ITEM_GET_BY_CODE,
	MASTER_QUERY_ORGANIZATION_DIMENSION_LIST,
	MASTER_QUERY_PARTY_CONTACT_LIST,
	MASTER_QUERY_PARTY_CONTACT_LIST_SENSITIVE,
	MASTER_QUERY_PARTY_FIND_DUPLICATES,
	MASTER_QUERY_PARTY_GET_BY_CODE,
	MASTER_QUERY_PAYMENT_TERM_LIST,
	MASTER_QUERY_REF_CURRENCY_GET_BY_CODE,
	MASTER_QUERY_SEARCH_QUERY,
	MASTER_QUERY_TAX_REGISTRATION_GET,
	MASTER_QUERY_TAX_REGISTRATION_GET_SENSITIVE,
	MASTER_QUERY_WAREHOUSE_LIST,
} from "../src/module-ids";
import {
	MASTER_DATA_CORE_PERMISSION_CODES,
	MASTER_DATA_PERMISSION_CODES,
	MASTER_DATA_SENSITIVE_READ_PERMISSION_CODES,
} from "../src/permissions";

const EXPECTED_CORE_PERMISSION_CODES = [
	"master_data.reference_read",
	"master_data.dimension_read",
	"master_data.dimension_create",
	"master_data.dimension_update",
	"master_data.dimension_activate",
	"master_data.dimension_archive",
	"master_data.party_read",
	"master_data.party_create",
	"master_data.party_update",
	"master_data.party_activate",
	"master_data.party_suspend",
	"master_data.party_archive",
	"master_data.party_merge",
	"master_data.party_role_manage",
	"master_data.party_address_manage",
	"master_data.party_contact_read",
	"master_data.party_contact_manage",
	"master_data.party_external_id_manage",
	"master_data.party_relationship_manage",
	"master_data.item_read",
	"master_data.item_create",
	"master_data.item_update",
	"master_data.item_activate",
	"master_data.item_suspend",
	"master_data.item_archive",
	"master_data.item_extension_manage",
	"master_data.warehouse_read",
	"master_data.warehouse_manage",
	"master_data.payment_term_read",
	"master_data.payment_term_manage",
	"master_data.tax_registration_read",
	"master_data.tax_registration_manage",
	"master_data.template_manage",
	"master_data.variant_manage",
	"master_data.change_request_read",
	"master_data.change_request_create",
	"master_data.change_request_submit",
	"master_data.change_request_approve",
	"master_data.change_request_apply",
	"master_data.import_create",
	"master_data.import_validate",
	"master_data.import_approve",
	"master_data.import_apply",
	"master_data.search_read",
	"master_data.search_rebuild",
	"master_data.duplicate_review",
] as const;

describe("master-data authorization matrix", () => {
	it("publishes the explicit core permission catalog", () => {
		expect(MASTER_DATA_CORE_PERMISSION_CODES).toEqual(
			EXPECTED_CORE_PERMISSION_CODES,
		);
		for (const permission of EXPECTED_CORE_PERMISSION_CODES) {
			expect(MASTER_DATA_PERMISSION_CODES).toContain(permission);
			expect(masterDataModuleManifest.permissions.codes).toContain(permission);
		}
	});

	it("publishes explicit sensitive projection permissions", () => {
		expect(MASTER_DATA_SENSITIVE_READ_PERMISSION_CODES).toEqual([
			"master_data.tax_registration_sensitive_read",
			"master_data.party_contact_sensitive_read",
			"master_data.sensitive_external_id_read",
		]);
	});

	it("does not republish retired broad permissions", () => {
		for (const suffix of ["read", "manage", "approve"] as const) {
			expect(MASTER_DATA_PERMISSION_CODES).not.toContain(
				`master_data.${suffix}`,
			);
		}
	});

	it("maps representative commands to the matrix permissions", () => {
		const { commands } = masterDataModuleManifest.authorization;

		expect(commands[MASTER_COMMAND_ORGANIZATION_DIMENSION_CREATE]).toBe(
			"master_data.dimension_create",
		);
		expect(commands[MASTER_COMMAND_ORGANIZATION_DIMENSION_UPDATE]).toBe(
			"master_data.dimension_update",
		);
		expect(commands[MASTER_COMMAND_PARTY_CREATE]).toBe(
			"master_data.party_create",
		);
		expect(commands[MASTER_COMMAND_PARTY_BLOCK]).toBe(
			"master_data.party_suspend",
		);
		expect(commands[MASTER_COMMAND_PARTY_RETIRE]).toBe(
			"master_data.party_archive",
		);
		expect(commands[MASTER_COMMAND_PARTY_MERGE]).toBe(
			"master_data.party_merge",
		);
		expect(commands[MASTER_COMMAND_PARTY_EXTERNAL_ID_CREATE]).toBe(
			"master_data.party_external_id_manage",
		);
		expect(commands[MASTER_COMMAND_ITEM_CREATE]).toBe(
			"master_data.item_create",
		);
		expect(commands[MASTER_COMMAND_ITEM_RETIRE]).toBe(
			"master_data.item_archive",
		);
		expect(commands[MASTER_COMMAND_ITEM_ALIAS_CREATE]).toBe(
			"master_data.item_extension_manage",
		);
		expect(commands[MASTER_COMMAND_WAREHOUSE_UPDATE]).toBe(
			"master_data.warehouse_manage",
		);
		expect(commands[MASTER_COMMAND_PAYMENT_TERM_UPDATE]).toBe(
			"master_data.payment_term_manage",
		);
		expect(commands[MASTER_COMMAND_TAX_REGISTRATION_UPDATE]).toBe(
			"master_data.tax_registration_manage",
		);
		expect(commands[MASTER_COMMAND_ITEM_TEMPLATE_ATTRIBUTE_CREATE]).toBe(
			"master_data.template_manage",
		);
		expect(commands[MASTER_COMMAND_ITEM_VARIANT_CREATE]).toBe(
			"master_data.variant_manage",
		);
		expect(commands[MASTER_COMMAND_CHANGE_REQUEST_SUBMIT]).toBe(
			"master_data.change_request_submit",
		);
		expect(commands[MASTER_COMMAND_CHANGE_REQUEST_APPROVE]).toBe(
			"master_data.change_request_approve",
		);
		expect(commands[MASTER_COMMAND_IMPORT_VALIDATE_PARTY_BATCH]).toBe(
			"master_data.import_validate",
		);
		expect(commands[MASTER_COMMAND_IMPORT_UPSERT_PARTIES]).toBe(
			"master_data.import_apply",
		);
		expect(commands[MASTER_COMMAND_SEARCH_REBUILD]).toBe(
			"master_data.search_rebuild",
		);
	});

	it("maps representative queries to explicit read and review permissions", () => {
		const { queries } = masterDataModuleManifest.authorization;

		expect(queries[MASTER_QUERY_REF_CURRENCY_GET_BY_CODE]).toBe(
			"master_data.reference_read",
		);
		expect(queries[MASTER_QUERY_ORGANIZATION_DIMENSION_LIST]).toBe(
			"master_data.dimension_read",
		);
		expect(queries[MASTER_QUERY_PARTY_GET_BY_CODE]).toBe(
			"master_data.party_read",
		);
		expect(queries[MASTER_QUERY_ITEM_GET_BY_CODE]).toBe(
			"master_data.item_read",
		);
		expect(queries[MASTER_QUERY_WAREHOUSE_LIST]).toBe(
			"master_data.warehouse_read",
		);
		expect(queries[MASTER_QUERY_PAYMENT_TERM_LIST]).toBe(
			"master_data.payment_term_read",
		);
		expect(queries[MASTER_QUERY_CHANGE_REQUEST_LIST]).toBe(
			"master_data.change_request_read",
		);
		expect(queries[MASTER_QUERY_SEARCH_QUERY]).toBe("master_data.search_read");
		expect(queries[MASTER_QUERY_PARTY_FIND_DUPLICATES]).toBe(
			"master_data.duplicate_review",
		);
		expect(queries[MASTER_QUERY_TAX_REGISTRATION_GET]).toBe(
			"master_data.tax_registration_read",
		);
		expect(queries[MASTER_QUERY_TAX_REGISTRATION_GET_SENSITIVE]).toBe(
			"master_data.tax_registration_sensitive_read",
		);
		expect(queries[MASTER_QUERY_PARTY_CONTACT_LIST]).toBe(
			"master_data.party_contact_read",
		);
		expect(queries[MASTER_QUERY_PARTY_CONTACT_LIST_SENSITIVE]).toBe(
			"master_data.party_contact_sensitive_read",
		);
	});
});
