import type { AfendaModuleManifest } from "@afenda/db/module-manifest";

import {
	CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS,
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
} from "./authorization";
import {
	CORPORATE_ADMINISTRATION_COMMAND_IDS,
	CORPORATE_ADMINISTRATION_QUERY_IDS,
} from "./module-ids";
import { CORPORATE_ADMINISTRATION_PERMISSION_CODES } from "./permissions";

export const corporateAdministrationModuleManifest = {
	id: "corporate-administration",
	category: "erp",
	packageName: "@afenda/corporate-administration",
	band: "R1-F",
	lifecycle: "scaffolded",
	activationMode: "organization_toggle",
	owns: {
		aggregates: [],
		commandNamespace: "corporate-administration",
		commands: [...CORPORATE_ADMINISTRATION_COMMAND_IDS],
		queryNamespace: "corporate-administration",
		queries: [...CORPORATE_ADMINISTRATION_QUERY_IDS],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: [],
	},
	events: {
		namespace: "corporate_administration",
		emits: [],
		consumes: [],
	},
	permissions: {
		namespace: "corporate_administration",
		codes: [...CORPORATE_ADMINISTRATION_PERMISSION_CODES],
	},
	authorization: {
		commands: CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS,
		queries: CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	},
	moduleDependencies: {
		required: ["master-data"],
	},
	optionalIntegratesWith: [
		{ moduleId: "accounting", style: "ports" },
		{ moduleId: "payments", style: "ports" },
		{ moduleId: "human-resources", style: "events" },
	],
} as const satisfies AfendaModuleManifest;
