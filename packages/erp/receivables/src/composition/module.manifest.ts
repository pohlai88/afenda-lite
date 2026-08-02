import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	RECEIVABLES_ALLOCATION_POSTED_EVENT,
	RECEIVABLES_ALLOCATION_REVERSED_EVENT,
	RECEIVABLES_CREDIT_NOTE_POSTED_EVENT,
	RECEIVABLES_INVOICE_CANCELLED_EVENT,
	RECEIVABLES_INVOICE_CLOSED_EVENT,
	RECEIVABLES_INVOICE_CREATED_EVENT,
	RECEIVABLES_INVOICE_POSTED_EVENT,
} from "@afenda/events/schemas";

import {
	RECEIVABLES_AGGREGATES,
	RECEIVABLES_MUTATION_TABLES,
} from "../kernel/emissions/mutation-tables";
import { RECEIVABLES_PERMISSION_CODES } from "../kernel/execution/permissions";
import {
	RECEIVABLES_COMMAND_AUTHORIZATION,
	RECEIVABLES_QUERY_AUTHORIZATION,
	RECEIVABLES_REGISTRY_COMMAND_IDS,
	RECEIVABLES_REGISTRY_QUERY_IDS,
} from "../kernel/operations/registry";

export const receivablesModuleManifest = {
	id: "receivables",
	category: "commercial",
	packageName: "@afenda/receivables",
	band: "R1-F",
	lifecycle: "active",
	activationMode: "organization_toggle",
	owns: {
		aggregates: [...RECEIVABLES_AGGREGATES],
		commandNamespace: "receivables",
		commands: [...RECEIVABLES_REGISTRY_COMMAND_IDS],
		queryNamespace: "receivables",
		queries: [...RECEIVABLES_REGISTRY_QUERY_IDS],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: [...RECEIVABLES_MUTATION_TABLES],
	},
	events: {
		namespace: "receivables",
		emits: [
			RECEIVABLES_INVOICE_CREATED_EVENT,
			RECEIVABLES_INVOICE_POSTED_EVENT,
			RECEIVABLES_INVOICE_CANCELLED_EVENT,
			RECEIVABLES_INVOICE_CLOSED_EVENT,
			RECEIVABLES_CREDIT_NOTE_POSTED_EVENT,
			RECEIVABLES_ALLOCATION_POSTED_EVENT,
			RECEIVABLES_ALLOCATION_REVERSED_EVENT,
		],
		consumes: [],
	},
	permissions: {
		namespace: "receivables",
		codes: [...RECEIVABLES_PERMISSION_CODES],
	},
	authorization: {
		commands: RECEIVABLES_COMMAND_AUTHORIZATION,
		queries: RECEIVABLES_QUERY_AUTHORIZATION,
	},
	moduleDependencies: {
		required: ["master-data"],
	},
	optionalIntegratesWith: [
		{ moduleId: "sales", style: "ports" },
		{ moduleId: "fulfillment", style: "ports" },
		{ moduleId: "payments", style: "events" },
		{ moduleId: "accounting", style: "events" },
	],
} as const satisfies AfendaModuleManifest;
