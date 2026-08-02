import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	PAYABLES_ALLOCATION_POSTED_EVENT,
	PAYABLES_CREDIT_NOTE_POSTED_EVENT,
	PAYABLES_INVOICE_CANCELLED_EVENT,
	PAYABLES_INVOICE_CREATED_EVENT,
	PAYABLES_INVOICE_MATCHED_EVENT,
	PAYABLES_INVOICE_POSTED_EVENT,
	PAYABLES_PAYMENT_APPLICATION_REVERSED_EVENT,
} from "@afenda/events/schemas";

import {
	PAYABLES_AGGREGATES,
	PAYABLES_MUTATION_TABLES,
} from "../kernel/emissions/mutation-tables";
import {
	PAYABLES_COMMAND_AUTHORIZATION,
	PAYABLES_COMMAND_IDS,
	PAYABLES_QUERY_AUTHORIZATION,
	PAYABLES_QUERY_IDS,
} from "../kernel/operations/registry";

export const payablesModuleManifest = {
	activationMode: "organization_toggle",
	authorization: {
		commands: PAYABLES_COMMAND_AUTHORIZATION,
		queries: PAYABLES_QUERY_AUTHORIZATION,
	},
	band: "R1-F",
	category: "commercial",
	events: {
		consumes: [],
		emits: [
			PAYABLES_INVOICE_CREATED_EVENT,
			PAYABLES_INVOICE_MATCHED_EVENT,
			PAYABLES_INVOICE_POSTED_EVENT,
			PAYABLES_CREDIT_NOTE_POSTED_EVENT,
			PAYABLES_ALLOCATION_POSTED_EVENT,
			PAYABLES_INVOICE_CANCELLED_EVENT,
			PAYABLES_PAYMENT_APPLICATION_REVERSED_EVENT,
		],
		namespace: "payables",
	},
	id: "payables",
	lifecycle: "active",
	moduleDependencies: {
		required: ["master-data"],
	},
	optionalIntegratesWith: [
		{ moduleId: "purchasing", style: "ports" },
		{ moduleId: "receiving", style: "ports" },
		{ moduleId: "payments", style: "ports" },
		{ moduleId: "accounting", style: "events" },
	],
	owns: {
		aggregates: [...PAYABLES_AGGREGATES],
		commandNamespace: "payables",
		commands: [...PAYABLES_COMMAND_IDS],
		queries: [...PAYABLES_QUERY_IDS],
		queryNamespace: "payables",
	},
	packageName: "@afenda/payables",
	permissions: {
		codes: ["payables.read", "payables.manage"],
		namespace: "payables",
	},
	persistence: {
		mutationTables: [...PAYABLES_MUTATION_TABLES],
		schemaOwner: "@afenda/db",
	},
} as const satisfies AfendaModuleManifest;
