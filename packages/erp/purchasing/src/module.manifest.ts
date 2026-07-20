import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	PURCHASING_ORDER_CANCELLED_EVENT,
	PURCHASING_ORDER_CLOSED_EVENT,
	PURCHASING_ORDER_CREATED_EVENT,
	PURCHASING_ORDER_LINE_ADDED_EVENT,
	PURCHASING_ORDER_POSTED_EVENT,
} from "@afenda/events/schemas";

import {
	PURCHASING_COMMAND_CANCEL,
	PURCHASING_COMMAND_CLOSE,
	PURCHASING_COMMAND_CREATE,
	PURCHASING_COMMAND_IDS,
	PURCHASING_COMMAND_LINE_ADD,
	PURCHASING_COMMAND_POST,
	PURCHASING_QUERY_GET,
	PURCHASING_QUERY_IDS,
	PURCHASING_QUERY_LIST,
} from "./module-ids";
import {
	PURCHASING_PERMISSION_CODES,
	PURCHASING_PERMISSION_ORDER_CANCEL,
	PURCHASING_PERMISSION_ORDER_CLOSE,
	PURCHASING_PERMISSION_ORDER_CREATE,
	PURCHASING_PERMISSION_ORDER_LIST,
	PURCHASING_PERMISSION_ORDER_POST,
	PURCHASING_PERMISSION_ORDER_READ,
	PURCHASING_PERMISSION_ORDER_UPDATE,
} from "./permissions";

export const purchasingModuleManifest = {
	id: "purchasing",
	category: "commercial",
	packageName: "@afenda/purchasing",
	band: "R1-F",
	lifecycle: "active",
	activationMode: "organization_toggle",
	owns: {
		aggregates: ["purchase_order"],
		commandNamespace: "purchasing.order",
		commands: [...PURCHASING_COMMAND_IDS],
		queryNamespace: "purchasing.order",
		queries: [...PURCHASING_QUERY_IDS],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: ["purchase_order", "purchase_order_line"],
	},
	events: {
		namespace: "purchasing.order",
		emits: [
			PURCHASING_ORDER_CREATED_EVENT,
			PURCHASING_ORDER_LINE_ADDED_EVENT,
			PURCHASING_ORDER_POSTED_EVENT,
			PURCHASING_ORDER_CANCELLED_EVENT,
			PURCHASING_ORDER_CLOSED_EVENT,
		],
		consumes: [],
	},
	permissions: {
		namespace: "purchasing",
		codes: [...PURCHASING_PERMISSION_CODES],
	},
	authorization: {
		commands: {
			[PURCHASING_COMMAND_CREATE]: PURCHASING_PERMISSION_ORDER_CREATE,
			[PURCHASING_COMMAND_LINE_ADD]: PURCHASING_PERMISSION_ORDER_UPDATE,
			[PURCHASING_COMMAND_POST]: PURCHASING_PERMISSION_ORDER_POST,
			[PURCHASING_COMMAND_CANCEL]: PURCHASING_PERMISSION_ORDER_CANCEL,
			[PURCHASING_COMMAND_CLOSE]: PURCHASING_PERMISSION_ORDER_CLOSE,
		},
		queries: {
			[PURCHASING_QUERY_GET]: PURCHASING_PERMISSION_ORDER_READ,
			[PURCHASING_QUERY_LIST]: PURCHASING_PERMISSION_ORDER_LIST,
		},
	},
	moduleDependencies: {
		required: ["master-data"],
	},
	optionalIntegratesWith: [
		{ moduleId: "receiving", style: "events" },
		{ moduleId: "payables", style: "events" },
		{ moduleId: "inventory", style: "events" },
	],
} as const satisfies AfendaModuleManifest;
