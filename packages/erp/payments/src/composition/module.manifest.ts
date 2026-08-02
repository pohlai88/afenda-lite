import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	PAYMENTS_APPLICATION_INSTRUCTION_APPLIED_EVENT,
	PAYMENTS_APPLICATION_INSTRUCTION_CREATED_EVENT,
	PAYMENTS_APPLICATION_INSTRUCTION_REJECTED_EVENT,
	PAYMENTS_PAYMENT_CREATED_EVENT,
	PAYMENTS_PAYMENT_POSTED_EVENT,
	PAYMENTS_PAYMENT_REVERSED_EVENT,
	PAYMENTS_REFUND_POSTED_EVENT,
	PAYMENTS_TRANSFER_POSTED_EVENT,
} from "@afenda/events/schemas";

import {
	PAYMENTS_AGGREGATES,
	PAYMENTS_MUTATION_TABLES,
} from "../kernel/emissions/mutation-tables";
import { PAYMENTS_PERMISSION_CODES } from "../kernel/execution/permissions";
import {
	PAYMENTS_COMMAND_AUTHORIZATION,
	PAYMENTS_COMMAND_IDS,
	PAYMENTS_QUERY_AUTHORIZATION,
	PAYMENTS_QUERY_IDS,
} from "../kernel/operations/registry";

export const paymentsModuleManifest = {
	id: "payments",
	category: "commercial",
	packageName: "@afenda/payments",
	band: "R1-F",
	lifecycle: "active",
	activationMode: "organization_toggle",
	owns: {
		aggregates: [...PAYMENTS_AGGREGATES],
		commandNamespace: "payments",
		commands: [...PAYMENTS_COMMAND_IDS],
		queryNamespace: "payments",
		queries: [...PAYMENTS_QUERY_IDS],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: [...PAYMENTS_MUTATION_TABLES],
	},
	events: {
		namespace: "payments",
		emits: [
			PAYMENTS_PAYMENT_CREATED_EVENT,
			PAYMENTS_PAYMENT_POSTED_EVENT,
			PAYMENTS_PAYMENT_REVERSED_EVENT,
			PAYMENTS_REFUND_POSTED_EVENT,
			PAYMENTS_APPLICATION_INSTRUCTION_CREATED_EVENT,
			PAYMENTS_APPLICATION_INSTRUCTION_APPLIED_EVENT,
			PAYMENTS_APPLICATION_INSTRUCTION_REJECTED_EVENT,
			PAYMENTS_TRANSFER_POSTED_EVENT,
		],
		consumes: [],
	},
	permissions: {
		namespace: "payments",
		codes: [...PAYMENTS_PERMISSION_CODES],
	},
	authorization: {
		commands: PAYMENTS_COMMAND_AUTHORIZATION,
		queries: PAYMENTS_QUERY_AUTHORIZATION,
	},
	moduleDependencies: {
		required: [],
	},
	optionalIntegratesWith: [
		{ moduleId: "receivables", style: "events" },
		{ moduleId: "payables", style: "events" },
		{ moduleId: "accounting", style: "events" },
	],
} as const satisfies AfendaModuleManifest;
