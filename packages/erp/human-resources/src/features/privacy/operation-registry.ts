import {
	HUMAN_RESOURCES_PERMISSION_PRIVACY_ANONYMIZE_EVALUATE,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_ANONYMIZE_EXECUTE,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_EXPORT,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_LEGAL_HOLD_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_RETENTION_EVALUATE,
	type HumanResourcesPermission,
} from "../../kernel/authorization/permissions";
import {
	defineHumanResourcesOperationRegistry,
	projectHumanResourcesAuthorization,
	projectHumanResourcesOperationIds,
} from "../../kernel/operations/define-registry";

const OWNER = "privacy" as const;
const AUTHORIZATION_POLICY = "hr.privacy" as const;

function definition(
	kind: "command" | "query",
	permission: HumanResourcesPermission,
) {
	return {
		authorizationPolicy: AUTHORIZATION_POLICY,
		kind,
		owner: OWNER,
		permission,
	};
}

export const HUMAN_RESOURCES_PRIVACY_COMMANDS =
	defineHumanResourcesOperationRegistry({
		placeHumanResourcesLegalHold: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PRIVACY_LEGAL_HOLD_MANAGE,
			),
			id: "human-resources.privacy.legal-hold.place",
			publicName: "placeHumanResourcesLegalHold",
		},
		releaseHumanResourcesLegalHold: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PRIVACY_LEGAL_HOLD_MANAGE,
			),
			id: "human-resources.privacy.legal-hold.release",
			publicName: "releaseHumanResourcesLegalHold",
		},
		// Restriction reuses legal-hold.manage (A3/C7): both are audited
		// place/release pairs on privacy_subject; the permission catalog does
		// not grow for this slice.
		restrictEmployeeData: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PRIVACY_LEGAL_HOLD_MANAGE,
			),
			id: "human-resources.privacy.restriction.place",
			publicName: "restrictEmployeeData",
		},
		liftEmployeeDataRestriction: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PRIVACY_LEGAL_HOLD_MANAGE,
			),
			id: "human-resources.privacy.restriction.lift",
			publicName: "liftEmployeeDataRestriction",
		},
		anonymizeHumanResourcesSubject: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PRIVACY_ANONYMIZE_EXECUTE,
			),
			id: "human-resources.privacy.subject.anonymize",
			publicName: "anonymizeHumanResourcesSubject",
		},
	});

export const HUMAN_RESOURCES_PRIVACY_QUERIES =
	defineHumanResourcesOperationRegistry({
		exportHumanResourcesSubjectData: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_PRIVACY_EXPORT),
			id: "human-resources.privacy.subject-export",
			publicName: "exportHumanResourcesSubjectData",
		},
		getHumanResourcesPrivacyCase: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_PRIVACY_EXPORT),
			id: "human-resources.privacy.case.get",
			publicName: "getHumanResourcesPrivacyCase",
		},
		evaluateHumanResourcesAnonymization: {
			...definition(
				"query",
				HUMAN_RESOURCES_PERMISSION_PRIVACY_ANONYMIZE_EVALUATE,
			),
			id: "human-resources.privacy.anonymization.evaluate",
			publicName: "evaluateHumanResourcesAnonymization",
		},
		evaluateHumanResourcesRetention: {
			...definition(
				"query",
				HUMAN_RESOURCES_PERMISSION_PRIVACY_RETENTION_EVALUATE,
			),
			id: "human-resources.privacy.retention.evaluate",
			publicName: "evaluateHumanResourcesRetention",
		},
	});

export const HUMAN_RESOURCES_PRIVACY_COMMAND_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_PRIVACY_COMMANDS);
export const HUMAN_RESOURCES_PRIVACY_QUERY_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_PRIVACY_QUERIES);
export const HUMAN_RESOURCES_PRIVACY_COMMAND_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_PRIVACY_COMMANDS);
export const HUMAN_RESOURCES_PRIVACY_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_PRIVACY_QUERIES);

export const {
	placeHumanResourcesLegalHold: {
		id: HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_PLACE,
	},
	releaseHumanResourcesLegalHold: {
		id: HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_RELEASE,
	},
	restrictEmployeeData: {
		id: HUMAN_RESOURCES_COMMAND_PRIVACY_RESTRICTION_PLACE,
	},
	liftEmployeeDataRestriction: {
		id: HUMAN_RESOURCES_COMMAND_PRIVACY_RESTRICTION_LIFT,
	},
	anonymizeHumanResourcesSubject: {
		id: HUMAN_RESOURCES_COMMAND_PRIVACY_SUBJECT_ANONYMIZE,
	},
} = HUMAN_RESOURCES_PRIVACY_COMMANDS;

export const {
	exportHumanResourcesSubjectData: {
		id: HUMAN_RESOURCES_QUERY_PRIVACY_SUBJECT_EXPORT,
	},
	getHumanResourcesPrivacyCase: { id: HUMAN_RESOURCES_QUERY_PRIVACY_CASE_GET },
	evaluateHumanResourcesAnonymization: {
		id: HUMAN_RESOURCES_QUERY_PRIVACY_ANONYMIZATION_EVALUATE,
	},
	evaluateHumanResourcesRetention: {
		id: HUMAN_RESOURCES_QUERY_PRIVACY_RETENTION_EVALUATE,
	},
} = HUMAN_RESOURCES_PRIVACY_QUERIES;
