import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	PURCHASING_ORDER_CANCELLED_EVENT,
	PURCHASING_ORDER_CLOSED_EVENT,
	PURCHASING_ORDER_CREATED_EVENT,
	PURCHASING_ORDER_LINE_ADDED_EVENT,
	PURCHASING_ORDER_POSTED_EVENT,
} from "@afenda/events/schemas";

import {
	PURCHASING_AGGREGATES,
	PURCHASING_MUTATION_TABLES,
} from "../kernel/emissions/mutation-tables";
import { PURCHASING_PERMISSION_CODES } from "../kernel/execution/permissions";
import {
	PURCHASING_COMMAND_AUTHORIZATION,
	PURCHASING_QUERY_AUTHORIZATION,
	PURCHASING_REGISTRY_COMMAND_IDS,
	PURCHASING_REGISTRY_QUERY_IDS,
} from "../kernel/operations/registry";

export const purchasingModuleManifest = {
	id: "purchasing",
	category: "commercial",
	packageName: "@afenda/purchasing",
	band: "R1-F",
	lifecycle: "active",
	activationMode: "organization_toggle",
	owns: {
		aggregates: [...PURCHASING_AGGREGATES],
		commandNamespace: "purchasing.order",
		commands: [...PURCHASING_REGISTRY_COMMAND_IDS],
		queryNamespace: "purchasing.order",
		queries: [...PURCHASING_REGISTRY_QUERY_IDS],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: [...PURCHASING_MUTATION_TABLES],
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
		commands: PURCHASING_COMMAND_AUTHORIZATION,
		queries: PURCHASING_QUERY_AUTHORIZATION,
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
