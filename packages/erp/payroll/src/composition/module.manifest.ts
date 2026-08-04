import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT,
	PAYROLL_PAYMENT_REQUESTED_EVENT,
	PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT,
	PAYROLL_POSTING_REQUESTED_EVENT,
	PAYROLL_RUN_CALCULATED_EVENT,
	PAYROLL_RUN_FINALIZED_EVENT,
	PAYROLL_RUN_REVERSED_EVENT,
	PAYROLL_RUN_STARTED_EVENT,
} from "@afenda/events/schemas";
import {
	PAYROLL_AGGREGATES,
	PAYROLL_MUTATION_TABLES,
} from "../kernel/emissions/mutation-tables";
import { PAYROLL_PERMISSION_CODES } from "../kernel/execution/permissions";
import {
	PAYROLL_COMMAND_IDS,
	PAYROLL_QUERY_IDS,
} from "../kernel/operations/module-ids";
import {
	PAYROLL_COMMAND_AUTHORIZATION,
	PAYROLL_QUERY_AUTHORIZATION,
} from "../kernel/operations/registry";

export const payrollModuleManifest = {
	id: "payroll",
	category: "erp",
	packageName: "@afenda/payroll",
	band: "R1-F",
	lifecycle: "scaffolded",
	activationMode: "organization_toggle",
	owns: {
		aggregates: [...PAYROLL_AGGREGATES],
		commandNamespace: "payroll",
		commands: [...PAYROLL_COMMAND_IDS],
		queryNamespace: "payroll",
		queries: [...PAYROLL_QUERY_IDS],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: [...PAYROLL_MUTATION_TABLES],
	},
	events: {
		namespace: "payroll",
		emits: [
			PAYROLL_RUN_STARTED_EVENT,
			PAYROLL_RUN_CALCULATED_EVENT,
			PAYROLL_RUN_FINALIZED_EVENT,
			PAYROLL_RUN_REVERSED_EVENT,
			PAYROLL_PAYMENT_REQUESTED_EVENT,
			PAYROLL_POSTING_REQUESTED_EVENT,
			PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT,
			PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT,
		],
		consumes: [],
	},
	permissions: {
		namespace: "payroll",
		codes: [...PAYROLL_PERMISSION_CODES],
	},
	authorization: {
		commands: PAYROLL_COMMAND_AUTHORIZATION,
		queries: PAYROLL_QUERY_AUTHORIZATION,
	},
	moduleDependencies: {
		required: ["human-resources"],
	},
	optionalIntegratesWith: [
		{ moduleId: "payments", style: "events" },
		{ moduleId: "accounting", style: "events" },
		{ moduleId: "payables", style: "events" },
	],
} as const satisfies AfendaModuleManifest;
