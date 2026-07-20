import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	FULFILLMENT_DELIVERY_COMPLETED_EVENT,
	FULFILLMENT_DELIVERY_CREATED_EVENT,
	FULFILLMENT_DELIVERY_POSTED_EVENT,
	FULFILLMENT_PICK_CONFIRMED_EVENT,
} from "@afenda/events/schemas";

import {
	FULFILLMENT_COMMAND_CANCEL,
	FULFILLMENT_COMMAND_CREATE,
	FULFILLMENT_COMMAND_IDS,
	FULFILLMENT_COMMAND_LINE_ADD,
	FULFILLMENT_COMMAND_PACK_CONFIRM,
	FULFILLMENT_COMMAND_PICK_CONFIRM,
	FULFILLMENT_COMMAND_PICK_START,
	FULFILLMENT_COMMAND_POD_RECORD,
	FULFILLMENT_COMMAND_POST,
	FULFILLMENT_QUERY_GET,
	FULFILLMENT_QUERY_IDS,
	FULFILLMENT_QUERY_LIST,
} from "./module-ids";
import {
	FULFILLMENT_PERMISSION_CODES,
	FULFILLMENT_PERMISSION_MANAGE,
	FULFILLMENT_PERMISSION_READ,
} from "./permissions";

export const fulfillmentModuleManifest = {
	id: "fulfillment",
	category: "supply-chain",
	packageName: "@afenda/fulfillment",
	band: "R1-F",
	lifecycle: "active",
	activationMode: "organization_toggle",
	owns: {
		aggregates: ["delivery"],
		commandNamespace: "fulfillment.delivery",
		commands: [...FULFILLMENT_COMMAND_IDS],
		queryNamespace: "fulfillment.delivery",
		queries: [...FULFILLMENT_QUERY_IDS],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: [
			"delivery",
			"delivery_line",
			"delivery_pick",
			"delivery_pack",
			"proof_of_delivery",
		],
	},
	events: {
		namespace: "fulfillment",
		emits: [
			FULFILLMENT_DELIVERY_CREATED_EVENT,
			FULFILLMENT_PICK_CONFIRMED_EVENT,
			FULFILLMENT_DELIVERY_POSTED_EVENT,
			FULFILLMENT_DELIVERY_COMPLETED_EVENT,
		],
		consumes: [],
	},
	permissions: {
		namespace: "fulfillment",
		codes: [...FULFILLMENT_PERMISSION_CODES],
	},
	authorization: {
		commands: {
			[FULFILLMENT_COMMAND_CREATE]: FULFILLMENT_PERMISSION_MANAGE,
			[FULFILLMENT_COMMAND_LINE_ADD]: FULFILLMENT_PERMISSION_MANAGE,
			[FULFILLMENT_COMMAND_PICK_START]: FULFILLMENT_PERMISSION_MANAGE,
			[FULFILLMENT_COMMAND_PICK_CONFIRM]: FULFILLMENT_PERMISSION_MANAGE,
			[FULFILLMENT_COMMAND_PACK_CONFIRM]: FULFILLMENT_PERMISSION_MANAGE,
			[FULFILLMENT_COMMAND_POST]: FULFILLMENT_PERMISSION_MANAGE,
			[FULFILLMENT_COMMAND_POD_RECORD]: FULFILLMENT_PERMISSION_MANAGE,
			[FULFILLMENT_COMMAND_CANCEL]: FULFILLMENT_PERMISSION_MANAGE,
		},
		queries: {
			[FULFILLMENT_QUERY_GET]: FULFILLMENT_PERMISSION_READ,
			[FULFILLMENT_QUERY_LIST]: FULFILLMENT_PERMISSION_READ,
		},
	},
	moduleDependencies: { required: ["master-data"] },
	optionalIntegratesWith: [
		{ moduleId: "sales", style: "events" },
		{ moduleId: "inventory", style: "events" },
	],
} as const satisfies AfendaModuleManifest;
