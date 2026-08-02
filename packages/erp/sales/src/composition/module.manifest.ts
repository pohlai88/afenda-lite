import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import { SALES_EVENT_IDS } from "@afenda/events/schemas";
import {
	SALES_COMMAND_PERMISSION,
	SALES_QUERY_PERMISSION,
} from "../authorization";
import { SALES_COMMAND_IDS, SALES_QUERY_IDS } from "../module-ids";
import { SALES_PERMISSION_CODES } from "../permissions";

export const salesModuleManifest = {
	id: "sales",
	category: "commercial",
	packageName: "@afenda/sales",
	band: "R1-F",
	lifecycle: "active",
	activationMode: "organization_toggle",
	owns: {
		aggregates: [
			"sales_price_book",
			"sales_quotation",
			"sales_order",
			"sales_return_authorization",
		],
		commandNamespace: "sales",
		commands: [...SALES_COMMAND_IDS],
		queryNamespace: "sales",
		queries: [...SALES_QUERY_IDS],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: [
			"sales_price_book",
			"sales_price_book_entry",
			"sales_quotation",
			"sales_quotation_line",
			"sales_order",
			"sales_order_line",
			"sales_order_schedule",
			"sales_order_hold",
			"sales_return_authorization",
			"sales_return_authorization_line",
		],
	},
	events: { namespace: "sales", emits: [...SALES_EVENT_IDS], consumes: [] },
	permissions: { namespace: "sales", codes: [...SALES_PERMISSION_CODES] },
	authorization: {
		commands: SALES_COMMAND_PERMISSION,
		queries: SALES_QUERY_PERMISSION,
	},
	moduleDependencies: { required: ["master-data"] },
	optionalIntegratesWith: [
		{ moduleId: "inventory", style: "ports" },
		{ moduleId: "fulfillment", style: "ports" },
		{ moduleId: "receivables", style: "ports" },
		{ moduleId: "accounting", style: "events" },
	],
} as const satisfies AfendaModuleManifest;
