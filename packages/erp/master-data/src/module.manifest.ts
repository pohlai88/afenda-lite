import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import { MASTER_DATA_EVENT_IDS } from "@afenda/events/schemas";

import { MASTER_DATA_COMMAND_IDS, MASTER_DATA_QUERY_IDS } from "./module-ids";
import {
	MASTER_DATA_PERMISSION_APPROVE,
	MASTER_DATA_PERMISSION_CODES,
	MASTER_DATA_PERMISSION_IMPORT_APPROVE,
	MASTER_DATA_PERMISSION_MANAGE,
	MASTER_DATA_PERMISSION_READ,
} from "./permissions";

const MASTER_DATA_MUTATION_TABLES = [
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
	"md_change_request",
	"md_import_batch",
] as const;

function commandAuthorization(): Record<
	(typeof MASTER_DATA_COMMAND_IDS)[number],
	(typeof MASTER_DATA_PERMISSION_CODES)[number]
> {
	const map = {} as Record<
		(typeof MASTER_DATA_COMMAND_IDS)[number],
		(typeof MASTER_DATA_PERMISSION_CODES)[number]
	>;
	for (const command of MASTER_DATA_COMMAND_IDS) {
		if (
			command === "master_data.change_request.approve" ||
			command === "master_data.change_request.reject"
		) {
			map[command] = MASTER_DATA_PERMISSION_APPROVE;
			continue;
		}
		if (command === "master_data.import.validate_party_batch") {
			map[command] = MASTER_DATA_PERMISSION_MANAGE;
			continue;
		}
		if (command.startsWith("master_data.import.")) {
			map[command] = MASTER_DATA_PERMISSION_IMPORT_APPROVE;
			continue;
		}
		map[command] = MASTER_DATA_PERMISSION_MANAGE;
	}
	return map;
}

function queryAuthorization(): Record<
	(typeof MASTER_DATA_QUERY_IDS)[number],
	typeof MASTER_DATA_PERMISSION_READ
> {
	const map = {} as Record<
		(typeof MASTER_DATA_QUERY_IDS)[number],
		typeof MASTER_DATA_PERMISSION_READ
	>;
	for (const query of MASTER_DATA_QUERY_IDS) {
		map[query] = MASTER_DATA_PERMISSION_READ;
	}
	return map;
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
