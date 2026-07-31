import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import { MASTER_DATA_EVENT_IDS } from "@afenda/events/schemas";

import { extensionPermissionForCommand } from "./capabilities/extensions/extension-authorization-policy";
import {
	MASTER_COMMAND_ITEM_ACTIVATE,
	MASTER_COMMAND_ITEM_GROUP_ACTIVATE,
	MASTER_COMMAND_ITEM_GROUP_INACTIVE,
	MASTER_COMMAND_ITEM_GROUP_RETIRE,
	MASTER_COMMAND_ITEM_INACTIVE,
	MASTER_COMMAND_ITEM_RESTORE,
	MASTER_COMMAND_ITEM_RETIRE,
	MASTER_COMMAND_ITEM_TEMPLATE_ACTIVATE,
	MASTER_COMMAND_ITEM_TEMPLATE_INACTIVE,
	MASTER_COMMAND_ITEM_TEMPLATE_RETIRE,
	MASTER_COMMAND_ITEM_VARIANT_RETIRE,
	MASTER_COMMAND_PARTY_ACTIVATE,
	MASTER_COMMAND_PARTY_BLOCK,
	MASTER_COMMAND_PARTY_INACTIVE,
	MASTER_COMMAND_PARTY_MERGE,
	MASTER_COMMAND_PARTY_RESTORE,
	MASTER_COMMAND_PARTY_RETIRE,
	MASTER_COMMAND_PAYMENT_TERM_ACTIVATE,
	MASTER_COMMAND_PAYMENT_TERM_INACTIVE,
	MASTER_COMMAND_PAYMENT_TERM_RETIRE,
	MASTER_COMMAND_TAX_REGISTRATION_ACTIVATE,
	MASTER_COMMAND_TAX_REGISTRATION_BLOCK,
	MASTER_COMMAND_TAX_REGISTRATION_RESTORE,
	MASTER_COMMAND_TAX_REGISTRATION_RETIRE,
	MASTER_COMMAND_WAREHOUSE_ACTIVATE,
	MASTER_COMMAND_WAREHOUSE_INACTIVE,
	MASTER_COMMAND_WAREHOUSE_RETIRE,
	MASTER_DATA_COMMAND_IDS,
	MASTER_DATA_QUERY_IDS,
	type MasterCommandId,
} from "./module-ids";
import {
	MASTER_DATA_PERMISSION_CHANGE_REQUEST_APPROVE,
	MASTER_DATA_PERMISSION_CHANGE_REQUEST_READ,
	MASTER_DATA_PERMISSION_CHANGE_REQUEST_SUBMIT,
	MASTER_DATA_PERMISSION_CODES,
	MASTER_DATA_PERMISSION_DIMENSION_ACTIVATE,
	MASTER_DATA_PERMISSION_DIMENSION_ARCHIVE,
	MASTER_DATA_PERMISSION_DIMENSION_CREATE,
	MASTER_DATA_PERMISSION_DIMENSION_READ,
	MASTER_DATA_PERMISSION_DIMENSION_UPDATE,
	MASTER_DATA_PERMISSION_DUPLICATE_REVIEW,
	MASTER_DATA_PERMISSION_IMPORT_APPLY,
	MASTER_DATA_PERMISSION_IMPORT_VALIDATE,
	MASTER_DATA_PERMISSION_ITEM_ACTIVATE,
	MASTER_DATA_PERMISSION_ITEM_ARCHIVE,
	MASTER_DATA_PERMISSION_ITEM_CREATE,
	MASTER_DATA_PERMISSION_ITEM_EXTENSION_MANAGE,
	MASTER_DATA_PERMISSION_ITEM_READ,
	MASTER_DATA_PERMISSION_ITEM_SUSPEND,
	MASTER_DATA_PERMISSION_ITEM_UNBLOCK,
	MASTER_DATA_PERMISSION_ITEM_UPDATE,
	MASTER_DATA_PERMISSION_PARTY_ACTIVATE,
	MASTER_DATA_PERMISSION_PARTY_ARCHIVE,
	MASTER_DATA_PERMISSION_PARTY_CONTACT_READ,
	MASTER_DATA_PERMISSION_PARTY_CONTACT_SENSITIVE_READ,
	MASTER_DATA_PERMISSION_PARTY_CREATE,
	MASTER_DATA_PERMISSION_PARTY_MERGE,
	MASTER_DATA_PERMISSION_PARTY_READ,
	MASTER_DATA_PERMISSION_PARTY_SUSPEND,
	MASTER_DATA_PERMISSION_PARTY_UNBLOCK,
	MASTER_DATA_PERMISSION_PARTY_UPDATE,
	MASTER_DATA_PERMISSION_PAYMENT_TERM_MANAGE,
	MASTER_DATA_PERMISSION_PAYMENT_TERM_READ,
	MASTER_DATA_PERMISSION_REFERENCE_READ,
	MASTER_DATA_PERMISSION_SEARCH_READ,
	MASTER_DATA_PERMISSION_SEARCH_REBUILD,
	MASTER_DATA_PERMISSION_TAX_REGISTRATION_MANAGE,
	MASTER_DATA_PERMISSION_TAX_REGISTRATION_READ,
	MASTER_DATA_PERMISSION_TAX_REGISTRATION_SENSITIVE_READ,
	MASTER_DATA_PERMISSION_TEMPLATE_MANAGE,
	MASTER_DATA_PERMISSION_VARIANT_MANAGE,
	MASTER_DATA_PERMISSION_WAREHOUSE_MANAGE,
	MASTER_DATA_PERMISSION_WAREHOUSE_READ,
} from "./permissions";

const MASTER_DATA_MUTATION_TABLES = [
	"md_organization_dimension",
	"md_party",
	"md_item_group",
	"md_item",
	"md_warehouse",
	"md_payment_term",
	"md_tax_registration",
	"md_party_role",
	"md_party_address",
	"md_party_contact",
	"md_party_external_id",
	"md_party_relationship",
	"md_item_uom",
	"md_item_barcode",
	"md_item_external_id",
	"md_item_alias",
	"md_warehouse_external_id",
	"md_item_template",
	"md_item_template_attribute",
	"md_item_template_attribute_option",
	"md_item_variant",
	"md_item_variant_attribute_value",
	"md_item_variant_attribute_value_option",
	"md_change_request",
	"md_import_batch",
] as const;

const ROOT_LIFECYCLE_COMMAND_PERMISSION: Partial<
	Record<MasterCommandId, (typeof MASTER_DATA_PERMISSION_CODES)[number]>
> = {
	[MASTER_COMMAND_PARTY_ACTIVATE]: MASTER_DATA_PERMISSION_PARTY_ACTIVATE,
	[MASTER_COMMAND_PARTY_INACTIVE]: MASTER_DATA_PERMISSION_PARTY_SUSPEND,
	[MASTER_COMMAND_PARTY_BLOCK]: MASTER_DATA_PERMISSION_PARTY_SUSPEND,
	[MASTER_COMMAND_PARTY_RESTORE]: MASTER_DATA_PERMISSION_PARTY_UNBLOCK,
	[MASTER_COMMAND_PARTY_RETIRE]: MASTER_DATA_PERMISSION_PARTY_ARCHIVE,
	[MASTER_COMMAND_PARTY_MERGE]: MASTER_DATA_PERMISSION_PARTY_MERGE,
	[MASTER_COMMAND_ITEM_ACTIVATE]: MASTER_DATA_PERMISSION_ITEM_ACTIVATE,
	[MASTER_COMMAND_ITEM_INACTIVE]: MASTER_DATA_PERMISSION_ITEM_SUSPEND,
	[MASTER_COMMAND_ITEM_RESTORE]: MASTER_DATA_PERMISSION_ITEM_UNBLOCK,
	[MASTER_COMMAND_ITEM_RETIRE]: MASTER_DATA_PERMISSION_ITEM_ARCHIVE,
	[MASTER_COMMAND_ITEM_GROUP_ACTIVATE]:
		MASTER_DATA_PERMISSION_ITEM_EXTENSION_MANAGE,
	[MASTER_COMMAND_ITEM_GROUP_INACTIVE]:
		MASTER_DATA_PERMISSION_ITEM_EXTENSION_MANAGE,
	[MASTER_COMMAND_ITEM_GROUP_RETIRE]:
		MASTER_DATA_PERMISSION_ITEM_EXTENSION_MANAGE,
	[MASTER_COMMAND_WAREHOUSE_ACTIVATE]: MASTER_DATA_PERMISSION_WAREHOUSE_MANAGE,
	[MASTER_COMMAND_WAREHOUSE_INACTIVE]: MASTER_DATA_PERMISSION_WAREHOUSE_MANAGE,
	[MASTER_COMMAND_WAREHOUSE_RETIRE]: MASTER_DATA_PERMISSION_WAREHOUSE_MANAGE,
	[MASTER_COMMAND_PAYMENT_TERM_ACTIVATE]:
		MASTER_DATA_PERMISSION_PAYMENT_TERM_MANAGE,
	[MASTER_COMMAND_PAYMENT_TERM_INACTIVE]:
		MASTER_DATA_PERMISSION_PAYMENT_TERM_MANAGE,
	[MASTER_COMMAND_PAYMENT_TERM_RETIRE]:
		MASTER_DATA_PERMISSION_PAYMENT_TERM_MANAGE,
	[MASTER_COMMAND_TAX_REGISTRATION_ACTIVATE]:
		MASTER_DATA_PERMISSION_TAX_REGISTRATION_MANAGE,
	[MASTER_COMMAND_TAX_REGISTRATION_BLOCK]:
		MASTER_DATA_PERMISSION_TAX_REGISTRATION_MANAGE,
	[MASTER_COMMAND_TAX_REGISTRATION_RESTORE]:
		MASTER_DATA_PERMISSION_TAX_REGISTRATION_MANAGE,
	[MASTER_COMMAND_TAX_REGISTRATION_RETIRE]:
		MASTER_DATA_PERMISSION_TAX_REGISTRATION_MANAGE,
	[MASTER_COMMAND_ITEM_TEMPLATE_ACTIVATE]:
		MASTER_DATA_PERMISSION_TEMPLATE_MANAGE,
	[MASTER_COMMAND_ITEM_TEMPLATE_INACTIVE]:
		MASTER_DATA_PERMISSION_TEMPLATE_MANAGE,
	[MASTER_COMMAND_ITEM_TEMPLATE_RETIRE]: MASTER_DATA_PERMISSION_TEMPLATE_MANAGE,
	[MASTER_COMMAND_ITEM_VARIANT_RETIRE]: MASTER_DATA_PERMISSION_VARIANT_MANAGE,
};

function commandAuthorization(): Record<
	(typeof MASTER_DATA_COMMAND_IDS)[number],
	(typeof MASTER_DATA_PERMISSION_CODES)[number]
> {
	const map = {} as Record<
		(typeof MASTER_DATA_COMMAND_IDS)[number],
		(typeof MASTER_DATA_PERMISSION_CODES)[number]
	>;
	for (const command of MASTER_DATA_COMMAND_IDS) {
		const extensionPermission = extensionPermissionForCommand(command);
		if (extensionPermission !== null) {
			map[command] = extensionPermission;
			continue;
		}
		const lifecyclePermission = ROOT_LIFECYCLE_COMMAND_PERMISSION[command];
		if (lifecyclePermission !== undefined) {
			map[command] = lifecyclePermission;
			continue;
		}
		if (
			command === "master_data.change_request.approve" ||
			command === "master_data.change_request.reject"
		) {
			map[command] = MASTER_DATA_PERMISSION_CHANGE_REQUEST_APPROVE;
			continue;
		}
		if (command === "master_data.change_request.submit") {
			map[command] = MASTER_DATA_PERMISSION_CHANGE_REQUEST_SUBMIT;
			continue;
		}
		if (command === "master_data.import.validate_party_batch") {
			map[command] = MASTER_DATA_PERMISSION_IMPORT_VALIDATE;
			continue;
		}
		if (command.startsWith("master_data.import.")) {
			map[command] = MASTER_DATA_PERMISSION_IMPORT_APPLY;
			continue;
		}
		map[command] = coreCommandPermission(command);
	}
	return map;
}

function queryAuthorization(): Record<
	(typeof MASTER_DATA_QUERY_IDS)[number],
	(typeof MASTER_DATA_PERMISSION_CODES)[number]
> {
	const map = {} as Record<
		(typeof MASTER_DATA_QUERY_IDS)[number],
		(typeof MASTER_DATA_PERMISSION_CODES)[number]
	>;
	for (const query of MASTER_DATA_QUERY_IDS) {
		map[query] = coreQueryPermission(query);
	}
	return map;
}

function coreCommandPermission(
	command: MasterCommandId,
): (typeof MASTER_DATA_PERMISSION_CODES)[number] {
	if (command.startsWith("master_data.organization_dimension.")) {
		if (command.endsWith(".create")) {
			return MASTER_DATA_PERMISSION_DIMENSION_CREATE;
		}
		if (command.endsWith(".update")) {
			return MASTER_DATA_PERMISSION_DIMENSION_UPDATE;
		}
		if (command.endsWith(".activate")) {
			return MASTER_DATA_PERMISSION_DIMENSION_ACTIVATE;
		}
		return MASTER_DATA_PERMISSION_DIMENSION_ARCHIVE;
	}
	if (command === "master_data.party.create") {
		return MASTER_DATA_PERMISSION_PARTY_CREATE;
	}
	if (command === "master_data.party.update") {
		return MASTER_DATA_PERMISSION_PARTY_UPDATE;
	}
	if (command === "master_data.item.create") {
		return MASTER_DATA_PERMISSION_ITEM_CREATE;
	}
	if (command === "master_data.item.update") {
		return MASTER_DATA_PERMISSION_ITEM_UPDATE;
	}
	if (command.startsWith("master_data.item_group.")) {
		return MASTER_DATA_PERMISSION_ITEM_EXTENSION_MANAGE;
	}
	if (command.startsWith("master_data.warehouse.")) {
		return MASTER_DATA_PERMISSION_WAREHOUSE_MANAGE;
	}
	if (command.startsWith("master_data.payment_term.")) {
		return MASTER_DATA_PERMISSION_PAYMENT_TERM_MANAGE;
	}
	if (command.startsWith("master_data.tax_registration.")) {
		return MASTER_DATA_PERMISSION_TAX_REGISTRATION_MANAGE;
	}
	if (command.startsWith("master_data.item_template.")) {
		return MASTER_DATA_PERMISSION_TEMPLATE_MANAGE;
	}
	if (command.startsWith("master_data.item_variant.")) {
		return MASTER_DATA_PERMISSION_VARIANT_MANAGE;
	}
	if (command === "master_data.search.rebuild") {
		return MASTER_DATA_PERMISSION_SEARCH_REBUILD;
	}
	throw new Error(`Unmapped master-data command permission: ${command}`);
}

function coreQueryPermission(
	query: (typeof MASTER_DATA_QUERY_IDS)[number],
): (typeof MASTER_DATA_PERMISSION_CODES)[number] {
	if (query.startsWith("master_data.ref.")) {
		return MASTER_DATA_PERMISSION_REFERENCE_READ;
	}
	if (query.startsWith("master_data.organization_dimension.")) {
		return MASTER_DATA_PERMISSION_DIMENSION_READ;
	}
	if (query === "master_data.party.find_duplicates") {
		return MASTER_DATA_PERMISSION_DUPLICATE_REVIEW;
	}
	if (
		query === "master_data.tax_registration.get_sensitive" ||
		query === "master_data.tax_registration.list_sensitive" ||
		query === "master_data.tax_registration.find_sensitive_by_party"
	) {
		return MASTER_DATA_PERMISSION_TAX_REGISTRATION_SENSITIVE_READ;
	}
	if (query.startsWith("master_data.tax_registration.")) {
		return MASTER_DATA_PERMISSION_TAX_REGISTRATION_READ;
	}
	if (
		query === "master_data.party_contact.list_sensitive" ||
		query === "master_data.party_contact.get_sensitive_primary"
	) {
		return MASTER_DATA_PERMISSION_PARTY_CONTACT_SENSITIVE_READ;
	}
	if (query.startsWith("master_data.party_contact.")) {
		return MASTER_DATA_PERMISSION_PARTY_CONTACT_READ;
	}
	if (
		query.startsWith("master_data.party.") ||
		query.startsWith("master_data.party_role.") ||
		query.startsWith("master_data.party_address.") ||
		query.startsWith("master_data.party_relationship.")
	) {
		return MASTER_DATA_PERMISSION_PARTY_READ;
	}
	if (
		query.startsWith("master_data.item.") ||
		query.startsWith("master_data.item_group.") ||
		query.startsWith("master_data.item_uom.") ||
		query.startsWith("master_data.item_alias.") ||
		query.startsWith("master_data.item_template.") ||
		query.startsWith("master_data.item_template_attribute.") ||
		query.startsWith("master_data.item_template_attribute_option.") ||
		query.startsWith("master_data.item_variant.") ||
		query.startsWith("master_data.item_variant_attribute_value.")
	) {
		return MASTER_DATA_PERMISSION_ITEM_READ;
	}
	if (query.startsWith("master_data.warehouse.")) {
		return MASTER_DATA_PERMISSION_WAREHOUSE_READ;
	}
	if (query.startsWith("master_data.payment_term.")) {
		return MASTER_DATA_PERMISSION_PAYMENT_TERM_READ;
	}
	if (query.startsWith("master_data.change_request.")) {
		return MASTER_DATA_PERMISSION_CHANGE_REQUEST_READ;
	}
	if (query === "master_data.search.query") {
		return MASTER_DATA_PERMISSION_SEARCH_READ;
	}
	throw new Error(`Unmapped master-data query permission: ${query}`);
}

export const masterDataModuleManifest = {
	id: "master-data",
	category: "master-data",
	packageName: "@afenda/master-data",
	band: "R1-F",
	lifecycle: "active",
	activationMode: "core",
	owns: {
		aggregates: [
			"organization_dimension",
			"party",
			"item",
			"item_group",
			"warehouse",
			"payment_term",
			"tax_registration",
			"item_template",
			"item_variant",
			"change_request",
		],
		commandNamespace: "master_data",
		commands: [...MASTER_DATA_COMMAND_IDS],
		queryNamespace: "master_data",
		queries: [...MASTER_DATA_QUERY_IDS],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: [...MASTER_DATA_MUTATION_TABLES],
	},
	events: {
		namespace: "master_data",
		emits: [...MASTER_DATA_EVENT_IDS],
		consumes: [],
	},
	permissions: {
		namespace: "master_data",
		codes: [...MASTER_DATA_PERMISSION_CODES],
	},
	authorization: {
		commands: commandAuthorization(),
		queries: queryAuthorization(),
	},
	moduleDependencies: {
		required: [],
	},
	optionalIntegratesWith: [
		{ moduleId: "sales", style: "events" },
		{ moduleId: "purchasing", style: "events" },
		{ moduleId: "inventory", style: "events" },
	],
} as const satisfies AfendaModuleManifest;
