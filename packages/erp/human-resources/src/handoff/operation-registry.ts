import {
	defineHumanResourcesOperationRegistry,
	projectHumanResourcesAuthorization,
	projectHumanResourcesOperationIds,
} from "../operation-registry/define-registry";
import {
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
	type HumanResourcesPermission,
} from "../permissions";
import { HUMAN_RESOURCES_COMPENSATION_PAYROLL_HANDOFF_POLICY_ID } from "../shared/authorization-policy-ids";

const OWNER = "reporting-bulk-reliability" as const;

function definition(
	kind: "command" | "query",
	permission: HumanResourcesPermission,
) {
	return {
		authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_PAYROLL_HANDOFF_POLICY_ID,
		kind,
		owner: OWNER,
		permission,
		resourceKind: "compensation" as const,
	};
}

export const HUMAN_RESOURCES_PAYROLL_HANDOFF_QUERIES =
	defineHumanResourcesOperationRegistry({
		assembleApprovedPayrollHandoff: {
			sensitivity: null,
			...definition("query", HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ),
			id: "human-resources.approved-payroll-handoff.get",
			observabilityArea: "payroll_delivery",
			publicName: "assembleApprovedPayrollHandoff",
		},
	});

export const HUMAN_RESOURCES_PAYROLL_HANDOFF_QUERY_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_PAYROLL_HANDOFF_QUERIES);
export const HUMAN_RESOURCES_PAYROLL_HANDOFF_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_PAYROLL_HANDOFF_QUERIES);

export const {
	assembleApprovedPayrollHandoff: {
		id: HUMAN_RESOURCES_QUERY_APPROVED_PAYROLL_HANDOFF_GET,
	},
} = HUMAN_RESOURCES_PAYROLL_HANDOFF_QUERIES;
