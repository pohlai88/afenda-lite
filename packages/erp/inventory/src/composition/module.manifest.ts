import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	INVENTORY_COMMAND_AUTHORIZATION,
	INVENTORY_COMMAND_IDS,
	INVENTORY_EMITTED_EVENT_IDS,
	INVENTORY_QUERY_AUTHORIZATION,
	INVENTORY_QUERY_IDS,
} from "../operation-registry";
import { INVENTORY_PERMISSION_CODES } from "../permissions";

export const inventoryModuleManifest = {
	id: "inventory",
	category: "supply-chain",
	packageName: "@afenda/inventory",
	band: "R1-F",
	lifecycle: "active",
	activationMode: "organization_toggle",
	owns: {
		aggregates: ["stock_movement", "stock_reservation"],
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
		emits: [...INVENTORY_EMITTED_EVENT_IDS],
		consumes: [],
	},
	permissions: {
		namespace: "inventory",
		codes: [...INVENTORY_PERMISSION_CODES],
	},
	authorization: {
		commands: INVENTORY_COMMAND_AUTHORIZATION,
		queries: INVENTORY_QUERY_AUTHORIZATION,
	},
	moduleDependencies: {
		required: ["master-data"],
	},
	optionalIntegratesWith: [],
} as const satisfies AfendaModuleManifest;
