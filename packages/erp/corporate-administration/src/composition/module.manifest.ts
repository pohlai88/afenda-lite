import type { AfendaModuleManifest } from "@afenda/db/module-manifest";

import {
	CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS,
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
} from "../kernel/authorization/authorization";
import { CORPORATE_ADMINISTRATION_PERMISSION_CODES } from "../kernel/authorization/permissions";
import { CORPORATE_ADMINISTRATION_EVENT_TYPES } from "../kernel/emissions/event-types";
import { CORPORATE_ADMINISTRATION_MUTATION_TABLES } from "../kernel/emissions/mutation-tables";
import {
	CORPORATE_ADMINISTRATION_COMMAND_IDS,
	CORPORATE_ADMINISTRATION_MODULE_ID,
	CORPORATE_ADMINISTRATION_PACKAGE_NAME,
	CORPORATE_ADMINISTRATION_QUERY_IDS,
} from "../kernel/operations/module-ids";

/**
 * Corporate Administration module manifest.
 *
 * Operation identity, authorization, and emitted-event projections are derived
 * from the domain-owned operation registry. The manifest is a consumer of that
 * semantic owner, not a second catalog.
 */
export const corporateAdministrationModuleManifest = {
	id: CORPORATE_ADMINISTRATION_MODULE_ID,
	category: "erp",
	packageName: CORPORATE_ADMINISTRATION_PACKAGE_NAME,
	band: "R1-F",
	lifecycle: "scaffolded",
	activationMode: "organization_toggle",
	owns: {
		aggregates: [
			"legal_company",
			"legal_establishment",
			"premise",
			"governance_body",
			"governance_membership",
			"statutory_office",
			"officer_appointment",
			"officer_qualification",
			"officer_declaration",
			"officer_disqualification",
			"conflict_disclosure",
			"governance_meeting",
			"meeting_notice",
			"meeting_participant",
			"meeting_quorum_result",
			"meeting_vote",
			"resolution",
			"resolution_action",
		],
		commandNamespace: "corporate-administration",
		commands: [...CORPORATE_ADMINISTRATION_COMMAND_IDS],
		queryNamespace: "corporate-administration",
		queries: [...CORPORATE_ADMINISTRATION_QUERY_IDS],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: [...CORPORATE_ADMINISTRATION_MUTATION_TABLES],
	},
	events: {
		namespace: "corporate_administration",
		emits: [...CORPORATE_ADMINISTRATION_EVENT_TYPES],
		consumes: [],
	},
	permissions: {
		namespace: "corporate_administration",
		codes: [...CORPORATE_ADMINISTRATION_PERMISSION_CODES],
	},
	authorization: {
		commands: { ...CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS },
		queries: { ...CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS },
	},
	moduleDependencies: {
		required: [],
	},
	optionalIntegratesWith: [],
} as const satisfies AfendaModuleManifest;
