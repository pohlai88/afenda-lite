import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	RECEIVING_DISCREPANCY_RECORDED_EVENT,
	RECEIVING_DISCREPANCY_RESOLVED_EVENT,
	RECEIVING_RECEIPT_CANCELLED_EVENT,
	RECEIVING_RECEIPT_CREATED_EVENT,
	RECEIVING_RECEIPT_LINE_ADDED_EVENT,
	RECEIVING_RECEIPT_POSTED_EVENT,
	RECEIVING_RECEIPT_REVERSED_EVENT,
} from "@afenda/events/schemas";

import {
	RECEIVING_AGGREGATES,
	RECEIVING_MUTATION_TABLES,
} from "../kernel/emissions/mutation-tables";
import { RECEIVING_PERMISSION_CODES } from "../kernel/execution/permissions";
import {
	RECEIVING_COMMAND_AUTHORIZATION,
	RECEIVING_QUERY_AUTHORIZATION,
	RECEIVING_REGISTRY_COMMAND_IDS,
	RECEIVING_REGISTRY_QUERY_IDS,
} from "../kernel/operations/registry";

export const receivingModuleManifest = {
	id: "receiving",
	category: "supply-chain",
	packageName: "@afenda/receiving",
	band: "R1-F",
	lifecycle: "active",
	activationMode: "organization_toggle",
	owns: {
		aggregates: [...RECEIVING_AGGREGATES],
		commandNamespace: "receiving.receipt",
		commands: [...RECEIVING_REGISTRY_COMMAND_IDS],
		queryNamespace: "receiving.receipt",
		queries: [...RECEIVING_REGISTRY_QUERY_IDS],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: [...RECEIVING_MUTATION_TABLES],
	},
	events: {
		namespace: "receiving",
		emits: [
			RECEIVING_RECEIPT_CREATED_EVENT,
			RECEIVING_RECEIPT_LINE_ADDED_EVENT,
			RECEIVING_RECEIPT_POSTED_EVENT,
			RECEIVING_RECEIPT_CANCELLED_EVENT,
			RECEIVING_RECEIPT_REVERSED_EVENT,
			RECEIVING_DISCREPANCY_RECORDED_EVENT,
			RECEIVING_DISCREPANCY_RESOLVED_EVENT,
		],
		consumes: [],
	},
	permissions: {
		namespace: "receiving",
		codes: [...RECEIVING_PERMISSION_CODES],
	},
	authorization: {
		commands: RECEIVING_COMMAND_AUTHORIZATION,
		queries: RECEIVING_QUERY_AUTHORIZATION,
	},
	moduleDependencies: { required: ["master-data"] },
	optionalIntegratesWith: [
		{ moduleId: "purchasing", style: "ports" },
		{ moduleId: "inventory", style: "events" },
		{ moduleId: "payables", style: "events" },
	],
} as const satisfies AfendaModuleManifest;
