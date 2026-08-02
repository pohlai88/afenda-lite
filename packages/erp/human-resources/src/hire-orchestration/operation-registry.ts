import {
	defineHumanResourcesOperationRegistry,
	projectHumanResourcesAuthorization,
	projectHumanResourcesOperationIds,
} from "../operation-registry/define-registry";
import { HUMAN_RESOURCES_PERMISSION_HIRE_ORCHESTRATE } from "../permissions";

export const HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMANDS =
	defineHumanResourcesOperationRegistry({
		hireFromAcceptedOffer: {
			sensitivity: null,
			authorizationPolicy: "hr.recruitment",
			id: "human-resources.hire.from-accepted-offer",
			kind: "command",
			owner: "recruitment",
			permission: HUMAN_RESOURCES_PERMISSION_HIRE_ORCHESTRATE,
			publicName: "hireFromAcceptedOffer",
		},
	});

export const HUMAN_RESOURCES_COMMAND_HIRE_FROM_ACCEPTED_OFFER =
	HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMANDS.hireFromAcceptedOffer.id;
export const HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMAND_IDS =
	projectHumanResourcesOperationIds(
		HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMANDS,
	);
export const HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMAND_AUTHORIZATION =
	projectHumanResourcesAuthorization(
		HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMANDS,
	);
