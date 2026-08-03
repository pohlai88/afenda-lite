import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	CORPORATE_ADMINISTRATION_COMMAND_AUTHORIZATION,
	CORPORATE_ADMINISTRATION_COMMAND_IDS,
	CORPORATE_ADMINISTRATION_EMITTED_EVENT_IDS,
	CORPORATE_ADMINISTRATION_PERMISSION_CODES,
	CORPORATE_ADMINISTRATION_QUERY_AUTHORIZATION,
	CORPORATE_ADMINISTRATION_QUERY_IDS,
} from "../kernel";

export const corporateAdministrationModuleManifest = {
	id: "corporate-administration",
	category: "erp",
	packageName: "@afenda/corporate-administration",
	band: "R1-F",
	lifecycle: "scaffolded",
	activationMode: "organization_toggle",
	owns: {
		aggregates: ["establishment"],
		commandNamespace: "corporate-administration",
		commands: [...CORPORATE_ADMINISTRATION_COMMAND_IDS],
		queryNamespace: "corporate-administration",
		queries: [...CORPORATE_ADMINISTRATION_QUERY_IDS],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: [
			"ca_legal_establishment",
			"ca_establishment_status_history",
		],
	},
	events: {
		namespace: "corporate-administration",
		emits: [...CORPORATE_ADMINISTRATION_EMITTED_EVENT_IDS],
		consumes: [],
	},
	permissions: {
		namespace: "corporate-administration",
		codes: [...CORPORATE_ADMINISTRATION_PERMISSION_CODES],
	},
	authorization: {
		commands: CORPORATE_ADMINISTRATION_COMMAND_AUTHORIZATION,
		queries: CORPORATE_ADMINISTRATION_QUERY_AUTHORIZATION,
	},
	moduleDependencies: {
		required: [],
	},
	optionalIntegratesWith: [],
} as const satisfies AfendaModuleManifest;
