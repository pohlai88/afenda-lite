import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	PAYROLL_PAYMENT_REQUESTED_EVENT,
	PAYROLL_PAYSLIP_PUBLISHED_EVENT,
	PAYROLL_POSTING_REQUESTED_EVENT,
	PAYROLL_RUN_CALCULATED_EVENT,
	PAYROLL_RUN_FINALIZED_EVENT,
	PAYROLL_RUN_REVERSED_EVENT,
	PAYROLL_RUN_STARTED_EVENT,
} from "@afenda/events/schemas";

import { PAYROLL_COMMAND_IDS, PAYROLL_QUERY_IDS } from "./module-ids";
import { PAYROLL_AGGREGATES, PAYROLL_MUTATION_TABLES } from "./mutation-tables";
import { PAYROLL_PERMISSION_CODES } from "./permissions";

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
			PAYROLL_PAYSLIP_PUBLISHED_EVENT,
		],
		consumes: [],
	},
	permissions: {
		namespace: "payroll",
		codes: [...PAYROLL_PERMISSION_CODES],
	},
	authorization: {
		commands: {},
		queries: {},
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
