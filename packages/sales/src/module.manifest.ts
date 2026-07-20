import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	SALES_ORDER_CREATED_EVENT,
	SALES_ORDER_LINE_ADDED_EVENT,
	SALES_ORDER_POSTED_EVENT,
} from "@afenda/events/schemas";

import {
	SALES_COMMAND_CREATE,
	SALES_COMMAND_IDS,
	SALES_COMMAND_LINE_ADD,
	SALES_COMMAND_POST,
	SALES_QUERY_GET,
	SALES_QUERY_IDS,
	SALES_QUERY_LIST,
} from "./module-ids";
import {
	SALES_PERMISSION_CODES,
	SALES_PERMISSION_MANAGE,
	SALES_PERMISSION_READ,
} from "./permissions";

export const salesModuleManifest = {
	id: "sales",
	category: "commercial",
	packageName: "@afenda/sales",
	band: "R1-F",
	lifecycle: "active",
	activationMode: "organization_toggle",
	owns: {
		aggregates: ["sales_order"],
		commandNamespace: "sales.order",
		commands: [...SALES_COMMAND_IDS],
		queryNamespace: "sales.order",
		queries: [...SALES_QUERY_IDS],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: ["sales_order", "sales_order_line"],
	},
	events: {
		namespace: "sales.order",
		emits: [
			SALES_ORDER_CREATED_EVENT,
			SALES_ORDER_LINE_ADDED_EVENT,
			SALES_ORDER_POSTED_EVENT,
		],
		consumes: [],
	},
	permissions: {
		namespace: "sales",
		codes: [...SALES_PERMISSION_CODES],
	},
	authorization: {
		commands: {
			[SALES_COMMAND_CREATE]: SALES_PERMISSION_MANAGE,
			[SALES_COMMAND_LINE_ADD]: SALES_PERMISSION_MANAGE,
			[SALES_COMMAND_POST]: SALES_PERMISSION_MANAGE,
		},
		queries: {
			[SALES_QUERY_GET]: SALES_PERMISSION_READ,
			[SALES_QUERY_LIST]: SALES_PERMISSION_READ,
		},
	},
	moduleDependencies: {
		required: ["master-data"],
	},
	optionalIntegratesWith: [
		{ moduleId: "inventory", style: "events" },
		{ moduleId: "fulfillment", style: "events" },
		{ moduleId: "receivables", style: "events" },
	],
} as const satisfies AfendaModuleManifest;
