import {
	HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_MANAGE,
	HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_READ,
} from "../../kernel/authorization/permissions";
import {
	defineHumanResourcesOperationRegistry,
	projectHumanResourcesAuthorization,
	projectHumanResourcesOperationIds,
} from "../../kernel/operations/define-registry";

const STATUTORY_PROFILE_OWNER = "statutory-profile" as const;
const STATUTORY_PROFILE_POLICY = "hr.statutory-profile" as const;

const STATUTORY_PROFILE_COMMAND = {
	authorizationPolicy: STATUTORY_PROFILE_POLICY,
	kind: "command",
	owner: STATUTORY_PROFILE_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_MANAGE,
} as const;

const STATUTORY_PROFILE_QUERY = {
	authorizationPolicy: STATUTORY_PROFILE_POLICY,
	kind: "query",
	owner: STATUTORY_PROFILE_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_READ,
} as const;

export const HUMAN_RESOURCES_STATUTORY_PROFILE_COMMANDS =
	defineHumanResourcesOperationRegistry({
		upsertStatutoryProfile: {
			...STATUTORY_PROFILE_COMMAND,
			id: "human-resources.statutory-profile.upsert",
			publicName: "upsertStatutoryProfile",
		},
		recordPriorEmployerYtd: {
			...STATUTORY_PROFILE_COMMAND,
			id: "human-resources.prior-employer-ytd.record",
			publicName: "recordPriorEmployerYtd",
		},
	});

export const HUMAN_RESOURCES_STATUTORY_PROFILE_QUERIES =
	defineHumanResourcesOperationRegistry({
		getStatutoryProfile: {
			...STATUTORY_PROFILE_QUERY,
			id: "human-resources.statutory-profile.get",
			publicName: "getStatutoryProfile",
		},
		listStatutoryProfiles: {
			...STATUTORY_PROFILE_QUERY,
			id: "human-resources.statutory-profile.list",
			publicName: "listStatutoryProfiles",
		},
		listPriorEmployerYtd: {
			...STATUTORY_PROFILE_QUERY,
			id: "human-resources.prior-employer-ytd.list",
			publicName: "listPriorEmployerYtd",
		},
	});

export const {
	upsertStatutoryProfile: {
		id: HUMAN_RESOURCES_COMMAND_STATUTORY_PROFILE_UPSERT,
	},
	recordPriorEmployerYtd: {
		id: HUMAN_RESOURCES_COMMAND_PRIOR_EMPLOYER_YTD_RECORD,
	},
} = HUMAN_RESOURCES_STATUTORY_PROFILE_COMMANDS;

export const {
	getStatutoryProfile: { id: HUMAN_RESOURCES_QUERY_STATUTORY_PROFILE_GET },
	listStatutoryProfiles: { id: HUMAN_RESOURCES_QUERY_STATUTORY_PROFILE_LIST },
	listPriorEmployerYtd: { id: HUMAN_RESOURCES_QUERY_PRIOR_EMPLOYER_YTD_LIST },
} = HUMAN_RESOURCES_STATUTORY_PROFILE_QUERIES;

export const HUMAN_RESOURCES_STATUTORY_PROFILE_COMMAND_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_STATUTORY_PROFILE_COMMANDS);
export const HUMAN_RESOURCES_STATUTORY_PROFILE_QUERY_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_STATUTORY_PROFILE_QUERIES);
export const HUMAN_RESOURCES_STATUTORY_PROFILE_COMMAND_AUTHORIZATION =
	projectHumanResourcesAuthorization(
		HUMAN_RESOURCES_STATUTORY_PROFILE_COMMANDS,
	);
export const HUMAN_RESOURCES_STATUTORY_PROFILE_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_STATUTORY_PROFILE_QUERIES);
