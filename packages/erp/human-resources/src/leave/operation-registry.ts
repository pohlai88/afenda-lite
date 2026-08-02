import {
	defineHumanResourcesOperationRegistry,
	projectHumanResourcesAuthorization,
	projectHumanResourcesOperationIds,
} from "../operation-registry/define-registry";
import {
	HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_ADJUST,
	HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_GRANT,
	HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_READ,
	HUMAN_RESOURCES_PERMISSION_LEAVE_HANDOFF_READ,
	HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE,
	HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_READ,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
	type HumanResourcesPermission,
} from "../permissions";

const LEAVE_OWNER = "leave-time" as const;
const LEAVE_POLICY = "hr.leave" as const;

function command(permission: HumanResourcesPermission) {
	return {
		authorizationPolicy: LEAVE_POLICY,
		kind: "command" as const,
		owner: LEAVE_OWNER,
		permission,
	};
}

function query(permission: HumanResourcesPermission) {
	return {
		authorizationPolicy: LEAVE_POLICY,
		kind: "query" as const,
		owner: LEAVE_OWNER,
		permission,
	};
}

export const HUMAN_RESOURCES_LEAVE_COMMANDS =
	defineHumanResourcesOperationRegistry({
		createLeavePolicy: {
			sensitivity: null,
			...command(HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE),
			id: "human-resources.leave-policy.create",
			publicName: "createLeavePolicy",
		},
		updateLeavePolicy: {
			sensitivity: null,
			...command(HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE),
			id: "human-resources.leave-policy.update",
			publicName: "updateLeavePolicy",
		},
		publishLeavePolicy: {
			sensitivity: null,
			...command(HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE),
			id: "human-resources.leave-policy.publish",
			publicName: "publishLeavePolicy",
		},
		supersedeLeavePolicy: {
			sensitivity: null,
			...command(HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE),
			id: "human-resources.leave-policy.supersede",
			publicName: "supersedeLeavePolicy",
		},
		archiveLeavePolicy: {
			sensitivity: null,
			...command(HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_MANAGE),
			id: "human-resources.leave-policy.archive",
			publicName: "archiveLeavePolicy",
		},
		grantLeaveEntitlement: {
			...command(HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_GRANT),
			id: "human-resources.leave-entitlement.grant",
			publicName: "grantLeaveEntitlement",
		},
		accrueLeaveEntitlement: {
			...command(HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_ADJUST),
			id: "human-resources.leave-entitlement.accrue",
			publicName: "accrueLeaveEntitlement",
		},
		carryForwardLeaveEntitlement: {
			...command(HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_GRANT),
			id: "human-resources.leave-entitlement.carry-forward",
			publicName: "carryForwardLeaveEntitlement",
		},
		expireLeaveEntitlement: {
			...command(HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_GRANT),
			id: "human-resources.leave-entitlement.expire",
			publicName: "expireLeaveEntitlement",
		},
		adjustLeaveEntitlement: {
			...command(HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_ADJUST),
			id: "human-resources.leave-entitlement.adjust",
			publicName: "adjustLeaveEntitlement",
		},
		createDraftLeaveRequest: {
			...command(HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN),
			id: "human-resources.leave-request.create-draft",
			publicName: "createDraftLeaveRequest",
		},
		submitLeaveRequest: {
			...command(HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN),
			id: "human-resources.leave-request.submit",
			publicName: "submitLeaveRequest",
		},
		approveLeaveRequest: {
			...command(HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM),
			id: "human-resources.leave-request.approve",
			publicName: "approveLeaveRequest",
		},
		rejectLeaveRequest: {
			...command(HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM),
			id: "human-resources.leave-request.reject",
			publicName: "rejectLeaveRequest",
		},
		returnLeaveRequest: {
			...command(HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM),
			id: "human-resources.leave-request.return",
			publicName: "returnLeaveRequest",
		},
		withdrawLeaveRequest: {
			...command(HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN),
			id: "human-resources.leave-request.withdraw",
			publicName: "withdrawLeaveRequest",
		},
		cancelApprovedLeaveRequest: {
			...command(HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM),
			id: "human-resources.leave-request.cancel-approved",
			publicName: "cancelApprovedLeaveRequest",
		},
		amendLeaveRequest: {
			...command(HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN),
			id: "human-resources.leave-request.amend",
			publicName: "amendLeaveRequest",
		},
	});

export const HUMAN_RESOURCES_LEAVE_QUERIES =
	defineHumanResourcesOperationRegistry({
		getLeavePolicy: {
			sensitivity: null,
			...query(HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_READ),
			id: "human-resources.leave-policy.get",
			publicName: "getLeavePolicy",
		},
		listLeavePolicies: {
			sensitivity: null,
			...query(HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_READ),
			id: "human-resources.leave-policy.list",
			publicName: "listLeavePolicies",
		},
		getLeaveEntitlement: {
			...query(HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_READ),
			id: "human-resources.leave-entitlement.get",
			publicName: "getLeaveEntitlement",
		},
		listLeaveEntitlements: {
			...query(HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_READ),
			id: "human-resources.leave-entitlement.list",
			publicName: "listLeaveEntitlements",
		},
		getLeaveBalance: {
			...query(HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_READ),
			id: "human-resources.leave-balance.get",
			publicName: "getLeaveBalance",
		},
		reconcileLeaveBalance: {
			...query(HUMAN_RESOURCES_PERMISSION_LEAVE_ENTITLEMENT_READ),
			id: "human-resources.leave-balance.reconcile",
			publicName: "reconcileLeaveBalance",
		},
		getLeaveRequest: {
			...query(HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN),
			id: "human-resources.leave-request.get",
			publicName: "getLeaveRequest",
		},
		listLeaveRequests: {
			...query(HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN),
			id: "human-resources.leave-request.list",
			publicName: "listLeaveRequests",
		},
		listPendingApprovalLeaveRequests: {
			...query(HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM),
			id: "human-resources.leave-request.list-pending-approval",
			publicName: "listPendingApprovalLeaveRequests",
		},
		listTeamCalendarLeaveRequests: {
			...query(HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM),
			id: "human-resources.leave-request.team-calendar",
			publicName: "listTeamCalendarLeaveRequests",
		},
		getApprovedLeaveHandoff: {
			sensitivity: null,
			...query(HUMAN_RESOURCES_PERMISSION_LEAVE_HANDOFF_READ),
			id: "human-resources.approved-leave-handoff.get",
			publicName: "getApprovedLeaveHandoff",
		},
		resolveApplicableLeavePolicy: {
			sensitivity: null,
			...query(HUMAN_RESOURCES_PERMISSION_LEAVE_POLICY_READ),
			id: "human-resources.leave-policy.resolve-applicable",
			publicName: "resolveApplicableLeavePolicy",
		},
	});

export const HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE =
	HUMAN_RESOURCES_LEAVE_COMMANDS.createLeavePolicy.id;
export const HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_UPDATE =
	HUMAN_RESOURCES_LEAVE_COMMANDS.updateLeavePolicy.id;
export const HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_PUBLISH =
	HUMAN_RESOURCES_LEAVE_COMMANDS.publishLeavePolicy.id;
export const HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_SUPERSEDE =
	HUMAN_RESOURCES_LEAVE_COMMANDS.supersedeLeavePolicy.id;
export const HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_ARCHIVE =
	HUMAN_RESOURCES_LEAVE_COMMANDS.archiveLeavePolicy.id;
export const HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_GRANT =
	HUMAN_RESOURCES_LEAVE_COMMANDS.grantLeaveEntitlement.id;
export const HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ACCRUE =
	HUMAN_RESOURCES_LEAVE_COMMANDS.accrueLeaveEntitlement.id;
export const HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_CARRY_FORWARD =
	HUMAN_RESOURCES_LEAVE_COMMANDS.carryForwardLeaveEntitlement.id;
export const HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_EXPIRE =
	HUMAN_RESOURCES_LEAVE_COMMANDS.expireLeaveEntitlement.id;
export const HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST =
	HUMAN_RESOURCES_LEAVE_COMMANDS.adjustLeaveEntitlement.id;
export const HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT =
	HUMAN_RESOURCES_LEAVE_COMMANDS.createDraftLeaveRequest.id;
export const HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT =
	HUMAN_RESOURCES_LEAVE_COMMANDS.submitLeaveRequest.id;
export const HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_APPROVE =
	HUMAN_RESOURCES_LEAVE_COMMANDS.approveLeaveRequest.id;
export const HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_REJECT =
	HUMAN_RESOURCES_LEAVE_COMMANDS.rejectLeaveRequest.id;
export const HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_RETURN =
	HUMAN_RESOURCES_LEAVE_COMMANDS.returnLeaveRequest.id;
export const HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_WITHDRAW =
	HUMAN_RESOURCES_LEAVE_COMMANDS.withdrawLeaveRequest.id;
export const HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CANCEL_APPROVED =
	HUMAN_RESOURCES_LEAVE_COMMANDS.cancelApprovedLeaveRequest.id;
export const HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_AMEND =
	HUMAN_RESOURCES_LEAVE_COMMANDS.amendLeaveRequest.id;

export const HUMAN_RESOURCES_QUERY_LEAVE_POLICY_GET =
	HUMAN_RESOURCES_LEAVE_QUERIES.getLeavePolicy.id;
export const HUMAN_RESOURCES_QUERY_LEAVE_POLICY_LIST =
	HUMAN_RESOURCES_LEAVE_QUERIES.listLeavePolicies.id;
export const HUMAN_RESOURCES_QUERY_LEAVE_ENTITLEMENT_GET =
	HUMAN_RESOURCES_LEAVE_QUERIES.getLeaveEntitlement.id;
export const HUMAN_RESOURCES_QUERY_LEAVE_ENTITLEMENT_LIST =
	HUMAN_RESOURCES_LEAVE_QUERIES.listLeaveEntitlements.id;
export const HUMAN_RESOURCES_QUERY_LEAVE_BALANCE_GET =
	HUMAN_RESOURCES_LEAVE_QUERIES.getLeaveBalance.id;
export const HUMAN_RESOURCES_QUERY_LEAVE_BALANCE_RECONCILE =
	HUMAN_RESOURCES_LEAVE_QUERIES.reconcileLeaveBalance.id;
export const HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_GET =
	HUMAN_RESOURCES_LEAVE_QUERIES.getLeaveRequest.id;
export const HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_LIST =
	HUMAN_RESOURCES_LEAVE_QUERIES.listLeaveRequests.id;
export const HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_LIST_PENDING_APPROVAL =
	HUMAN_RESOURCES_LEAVE_QUERIES.listPendingApprovalLeaveRequests.id;
export const HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_TEAM_CALENDAR =
	HUMAN_RESOURCES_LEAVE_QUERIES.listTeamCalendarLeaveRequests.id;
export const HUMAN_RESOURCES_QUERY_APPROVED_LEAVE_HANDOFF_GET =
	HUMAN_RESOURCES_LEAVE_QUERIES.getApprovedLeaveHandoff.id;
export const HUMAN_RESOURCES_QUERY_LEAVE_POLICY_RESOLVE_APPLICABLE =
	HUMAN_RESOURCES_LEAVE_QUERIES.resolveApplicableLeavePolicy.id;

export const HUMAN_RESOURCES_LEAVE_COMMAND_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_LEAVE_COMMANDS);
export const HUMAN_RESOURCES_LEAVE_QUERY_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_LEAVE_QUERIES);
export const HUMAN_RESOURCES_LEAVE_COMMAND_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_LEAVE_COMMANDS);
export const HUMAN_RESOURCES_LEAVE_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_LEAVE_QUERIES);
