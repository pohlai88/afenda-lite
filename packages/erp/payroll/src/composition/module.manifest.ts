import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import { PAYROLL_EMITTED_EVENTS } from "../kernel/emissions/emission-registry";
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
		emits: [...PAYROLL_EMITTED_EVENTS],
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
