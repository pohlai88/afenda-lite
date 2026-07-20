import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	INVENTORY_MOVEMENT_CREATED_EVENT,
	INVENTORY_MOVEMENT_POSTED_EVENT,
	INVENTORY_RESERVATION_RELEASED_EVENT,
	INVENTORY_STOCK_RESERVED_EVENT,
} from "@afenda/events/schemas";

import {
	INVENTORY_COMMAND_CREATE,
	INVENTORY_COMMAND_IDS,
	INVENTORY_COMMAND_LINE_ADD,
	INVENTORY_COMMAND_POST,
	INVENTORY_COMMAND_RELEASE,
	INVENTORY_COMMAND_RESERVE,
	INVENTORY_QUERY_AVAILABILITY,
	INVENTORY_QUERY_GET,
	INVENTORY_QUERY_IDS,
	INVENTORY_QUERY_LIST,
} from "./module-ids";
import {
	INVENTORY_PERMISSION_CODES,
	INVENTORY_PERMISSION_MANAGE,
	INVENTORY_PERMISSION_READ,
} from "./permissions";

export const inventoryModuleManifest = {
	id: "inventory",
	category: "supply-chain",
	packageName: "@afenda/inventory",
	band: "R1-F",
	lifecycle: "active",
	activationMode: "organization_toggle",
	owns: {
		aggregates: ["stock_movement"],
		commandNamespace: "inventory",
		commands: [...INVENTORY_COMMAND_IDS],
		queryNamespace: "inventory",
		queries: [...INVENTORY_QUERY_IDS],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: [
			"stock_movement",
			"stock_movement_line",
			"stock_balance",
			"stock_ledger_entry",
			"stock_reservation",
		],
	},
	events: {
		namespace: "inventory",
		emits: [
			INVENTORY_MOVEMENT_CREATED_EVENT,
			INVENTORY_MOVEMENT_POSTED_EVENT,
			INVENTORY_STOCK_RESERVED_EVENT,
			INVENTORY_RESERVATION_RELEASED_EVENT,
		],
		consumes: [],
	},
	permissions: {
		namespace: "inventory",
		codes: [...INVENTORY_PERMISSION_CODES],
	},
	authorization: {
		commands: {
			[INVENTORY_COMMAND_CREATE]: INVENTORY_PERMISSION_MANAGE,
			[INVENTORY_COMMAND_LINE_ADD]: INVENTORY_PERMISSION_MANAGE,
			[INVENTORY_COMMAND_POST]: INVENTORY_PERMISSION_MANAGE,
			[INVENTORY_COMMAND_RESERVE]: INVENTORY_PERMISSION_MANAGE,
			[INVENTORY_COMMAND_RELEASE]: INVENTORY_PERMISSION_MANAGE,
		},
		queries: {
			[INVENTORY_QUERY_GET]: INVENTORY_PERMISSION_READ,
			[INVENTORY_QUERY_LIST]: INVENTORY_PERMISSION_READ,
			[INVENTORY_QUERY_AVAILABILITY]: INVENTORY_PERMISSION_READ,
		},
	},
	moduleDependencies: {
		required: ["master-data"],
	},
	optionalIntegratesWith: [
		{ moduleId: "sales", style: "events" },
		{ moduleId: "purchasing", style: "events" },
		{ moduleId: "receiving", style: "events" },
		{ moduleId: "fulfillment", style: "events" },
	],
} as const satisfies AfendaModuleManifest;
