"use server";

import {
	type ApprovedLeaveHandoff,
	amendLeaveRequest,
	approveLeaveRequest,
	archiveLeavePolicy,
	cancelApprovedLeaveRequest,
	createDraftLeaveRequest,
	createLeavePolicy,
	getApprovedLeaveHandoff,
	getLeaveBalance,
	getLeaveEntitlement,
	getLeavePolicy,
	type LeaveBalance,
	type LeaveBalanceReconciliation,
	type LeaveEntitlement,
	type LeaveEntitlementListPage,
	type LeavePolicy,
	type LeavePolicyListPage,
	type LeaveRequest,
	type LeaveRequestListPage,
	listLeaveEntitlements,
	listLeavePolicies,
	listPendingApprovalLeaveRequests,
	listTeamCalendarLeaveRequests,
	publishLeavePolicy,
	type ResolvedLeavePolicy,
	reconcileLeaveBalance,
	rejectLeaveRequest,
	resolveApplicableLeavePolicy,
	returnLeaveRequest,
	submitLeaveRequest,
	supersedeLeavePolicy,
	type TeamCalendarLeavePage,
	updateLeavePolicy,
	withdrawLeaveRequest,
} from "@afenda/human-resources";
import {
	amendLeaveRequestInputSchema,
	approveLeaveRequestInputSchema,
	archiveLeavePolicyInputSchema,
	cancelApprovedLeaveRequestInputSchema,
	createDraftLeaveRequestInputSchema,
	createLeavePolicyInputSchema,
	getApprovedLeaveHandoffInputSchema,
	getLeaveBalanceInputSchema,
	getLeaveEntitlementInputSchema,
	getLeavePolicyInputSchema,
	listLeaveEntitlementsInputSchema,
	listLeavePoliciesInputSchema,
	listPendingApprovalLeaveRequestsInputSchema,
	listTeamCalendarLeaveRequestsInputSchema,
	publishLeavePolicyInputSchema,
	rejectLeaveRequestInputSchema,
	resolveApplicableLeavePolicyInputSchema,
	returnLeaveRequestInputSchema,
	submitLeaveRequestInputSchema,
	supersedeLeavePolicyInputSchema,
	updateLeavePolicyInputSchema,
	withdrawLeaveRequestInputSchema,
} from "@afenda/human-resources/schemas";

import {
	type HrActionInput,
	hrActionSchema,
	parseHrStampedPackageInput,
	withHrSessionContext as withSessionContext,
} from "@/app/actions/hr-mutation-context";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runHrLeaveOperatorPermissionAction as runOperatorPermissionAction } from "@/app/actions/run-hr-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const createDraftLeaveRequestActionSchema = hrActionSchema(
	createDraftLeaveRequestInputSchema,
);
const submitLeaveRequestActionSchema = hrActionSchema(
	submitLeaveRequestInputSchema,
);
const amendLeaveRequestActionSchema = hrActionSchema(
	amendLeaveRequestInputSchema,
);
const withdrawLeaveRequestActionSchema = hrActionSchema(
	withdrawLeaveRequestInputSchema,
);
const cancelApprovedLeaveRequestActionSchema = hrActionSchema(
	cancelApprovedLeaveRequestInputSchema,
);
const getLeaveBalanceActionSchema = hrActionSchema(getLeaveBalanceInputSchema);
const getLeaveEntitlementActionSchema = hrActionSchema(
	getLeaveEntitlementInputSchema,
);
const listLeaveEntitlementsActionSchema = hrActionSchema(
	listLeaveEntitlementsInputSchema,
);
const approveLeaveRequestActionSchema = hrActionSchema(
	approveLeaveRequestInputSchema,
);
const rejectLeaveRequestActionSchema = hrActionSchema(
	rejectLeaveRequestInputSchema,
);
const returnLeaveRequestActionSchema = hrActionSchema(
	returnLeaveRequestInputSchema,
);
const listPendingApprovalLeaveRequestsActionSchema = hrActionSchema(
	listPendingApprovalLeaveRequestsInputSchema,
);
const listTeamCalendarLeaveRequestsActionSchema = hrActionSchema(
	listTeamCalendarLeaveRequestsInputSchema,
);
const publishLeavePolicyActionSchema = hrActionSchema(
	publishLeavePolicyInputSchema,
);
const archiveLeavePolicyActionSchema = hrActionSchema(
	archiveLeavePolicyInputSchema,
);
const getLeavePolicyActionSchema = hrActionSchema(getLeavePolicyInputSchema);
const listLeavePoliciesActionSchema = hrActionSchema(
	listLeavePoliciesInputSchema,
);
const resolveApplicableLeavePolicyActionSchema = hrActionSchema(
	resolveApplicableLeavePolicyInputSchema,
);
const getApprovedLeaveHandoffActionSchema = hrActionSchema(
	getApprovedLeaveHandoffInputSchema,
);

export async function createDraftLeaveRequestAction(
	input: HrActionInput<typeof createDraftLeaveRequestInputSchema>,
): Promise<ActionResult<{ request: LeaveRequest }>> {
	return runOperatorPermissionAction({
		path: "createDraftLeaveRequestAction",
		permission: "human-resources.leave-request.own",
		safeMessage: "Could not create leave request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createDraftLeaveRequestActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid leave request.",
					parsed.details,
				);
			}
			const result = await createDraftLeaveRequest(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { request: mapped.data } };
		},
	});
}

export async function submitLeaveRequestAction(
	input: HrActionInput<typeof submitLeaveRequestInputSchema>,
): Promise<ActionResult<{ request: LeaveRequest }>> {
	return runOperatorPermissionAction({
		path: "submitLeaveRequestAction",
		permission: "human-resources.leave-request.own",
		safeMessage: "Could not submit leave request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(submitLeaveRequestActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid leave submission.",
					parsed.details,
				);
			}
			const result = await submitLeaveRequest(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { request: mapped.data } };
		},
	});
}

export async function amendLeaveRequestAction(
	input: HrActionInput<typeof amendLeaveRequestInputSchema>,
): Promise<ActionResult<{ request: LeaveRequest }>> {
	return runOperatorPermissionAction({
		path: "amendLeaveRequestAction",
		permission: "human-resources.leave-request.own",
		safeMessage: "Could not amend leave request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(amendLeaveRequestActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid leave amendment.",
					parsed.details,
				);
			}
			const result = await amendLeaveRequest(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { request: mapped.data } };
		},
	});
}

export async function withdrawLeaveRequestAction(
	input: HrActionInput<typeof withdrawLeaveRequestInputSchema>,
): Promise<ActionResult<{ request: LeaveRequest }>> {
	return runOperatorPermissionAction({
		path: "withdrawLeaveRequestAction",
		permission: "human-resources.leave-request.own",
		safeMessage: "Could not withdraw leave request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(withdrawLeaveRequestActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid leave withdrawal.",
					parsed.details,
				);
			}
			const result = await withdrawLeaveRequest(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { request: mapped.data } };
		},
	});
}

export async function cancelApprovedLeaveRequestAction(
	input: HrActionInput<typeof cancelApprovedLeaveRequestInputSchema>,
): Promise<ActionResult<{ request: LeaveRequest }>> {
	return runOperatorPermissionAction({
		path: "cancelApprovedLeaveRequestAction",
		permission: "human-resources.leave-request.approve-team",
		safeMessage: "Could not cancel approved leave request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(cancelApprovedLeaveRequestActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid leave cancellation.",
					parsed.details,
				);
			}
			const result = await cancelApprovedLeaveRequest(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { request: mapped.data } };
		},
	});
}

export async function getLeaveBalanceAction(
	input: HrActionInput<typeof getLeaveBalanceInputSchema>,
): Promise<ActionResult<{ balance: LeaveBalance | null }>> {
	return runOperatorPermissionAction({
		path: "getLeaveBalanceAction",
		permission: "human-resources.leave-entitlement.read",
		safeMessage: "Could not get leave balance.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getLeaveBalanceActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid leave balance request.",
					parsed.details,
				);
			}
			const result = await getLeaveBalance(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { balance: mapped.data } };
		},
	});
}

export async function reconcileLeaveBalanceAction(
	input: HrActionInput<typeof getLeaveBalanceInputSchema>,
): Promise<
	ActionResult<{ reconciliation: LeaveBalanceReconciliation | null }>
> {
	return runOperatorPermissionAction({
		path: "reconcileLeaveBalanceAction",
		permission: "human-resources.leave-entitlement.read",
		safeMessage: "Could not reconcile leave balance.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getLeaveBalanceActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid leave balance reconciliation request.",
					parsed.details,
				);
			}
			const result = await reconcileLeaveBalance(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { reconciliation: mapped.data } };
		},
	});
}

export async function getLeaveEntitlementAction(
	input: HrActionInput<typeof getLeaveEntitlementInputSchema>,
): Promise<ActionResult<{ entitlement: LeaveEntitlement | null }>> {
	return runOperatorPermissionAction({
		path: "getLeaveEntitlementAction",
		permission: "human-resources.leave-entitlement.read",
		safeMessage: "Could not get leave entitlement.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getLeaveEntitlementActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid leave entitlement request.",
					parsed.details,
				);
			}
			const result = await getLeaveEntitlement(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { entitlement: mapped.data } };
		},
	});
}

export async function listLeaveEntitlementsAction(
	input: HrActionInput<typeof listLeaveEntitlementsInputSchema>,
): Promise<ActionResult<{ page: LeaveEntitlementListPage }>> {
	return runOperatorPermissionAction({
		path: "listLeaveEntitlementsAction",
		permission: "human-resources.leave-entitlement.read",
		safeMessage: "Could not list leave entitlements.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listLeaveEntitlementsActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid leave entitlement filters.",
					parsed.details,
				);
			}
			const result = await listLeaveEntitlements(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

export async function approveLeaveRequestAction(
	input: HrActionInput<typeof approveLeaveRequestInputSchema>,
): Promise<ActionResult<{ request: LeaveRequest }>> {
	return runOperatorPermissionAction({
		path: "approveLeaveRequestAction",
		permission: "human-resources.leave-request.approve-team",
		safeMessage: "Could not approve leave request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(approveLeaveRequestActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid leave approval.",
					parsed.details,
				);
			}
			const result = await approveLeaveRequest(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { request: mapped.data } };
		},
	});
}

export async function rejectLeaveRequestAction(
	input: HrActionInput<typeof rejectLeaveRequestInputSchema>,
): Promise<ActionResult<{ request: LeaveRequest }>> {
	return runOperatorPermissionAction({
		path: "rejectLeaveRequestAction",
		permission: "human-resources.leave-request.approve-team",
		safeMessage: "Could not reject leave request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(rejectLeaveRequestActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid leave rejection.",
					parsed.details,
				);
			}
			const result = await rejectLeaveRequest(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { request: mapped.data } };
		},
	});
}

export async function returnLeaveRequestAction(
	input: HrActionInput<typeof returnLeaveRequestInputSchema>,
): Promise<ActionResult<{ request: LeaveRequest }>> {
	return runOperatorPermissionAction({
		path: "returnLeaveRequestAction",
		permission: "human-resources.leave-request.approve-team",
		safeMessage: "Could not return leave request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(returnLeaveRequestActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid leave return.",
					parsed.details,
				);
			}
			const result = await returnLeaveRequest(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { request: mapped.data } };
		},
	});
}

export async function listPendingApprovalLeaveRequestsAction(
	input: HrActionInput<typeof listPendingApprovalLeaveRequestsInputSchema>,
): Promise<ActionResult<{ page: LeaveRequestListPage }>> {
	return runOperatorPermissionAction({
		path: "listPendingApprovalLeaveRequestsAction",
		permission: "human-resources.leave-request.approve-team",
		safeMessage: "Could not list pending leave approvals.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				listPendingApprovalLeaveRequestsActionSchema,
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid pending approval filters.",
					parsed.details,
				);
			}
			const result = await listPendingApprovalLeaveRequests(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

export async function listTeamCalendarLeaveRequestsAction(
	input: HrActionInput<typeof listTeamCalendarLeaveRequestsInputSchema>,
): Promise<ActionResult<{ page: TeamCalendarLeavePage }>> {
	return runOperatorPermissionAction({
		path: "listTeamCalendarLeaveRequestsAction",
		permission: "human-resources.leave-request.approve-team",
		safeMessage: "Could not list team leave calendar.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				listTeamCalendarLeaveRequestsActionSchema,
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid team calendar range.",
					parsed.details,
				);
			}
			const result = await listTeamCalendarLeaveRequests(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

export async function createLeavePolicyAction(
	input: HrActionInput<typeof createLeavePolicyInputSchema>,
): Promise<ActionResult<{ policy: LeavePolicy }>> {
	return runOperatorPermissionAction({
		path: "createLeavePolicyAction",
		permission: "human-resources.leave-policy.manage",
		safeMessage: "Could not create leave policy.",
		execute: async (session, correlationId) => {
			const parsed = parseHrStampedPackageInput(
				session,
				correlationId,
				createLeavePolicyInputSchema,
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid leave policy.",
					parsed.details,
				);
			}
			const result = await createLeavePolicy(
				parsed.data,
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { policy: mapped.data } };
		},
	});
}

export async function updateLeavePolicyAction(
	input: HrActionInput<typeof updateLeavePolicyInputSchema>,
): Promise<ActionResult<{ policy: LeavePolicy }>> {
	return runOperatorPermissionAction({
		path: "updateLeavePolicyAction",
		permission: "human-resources.leave-policy.manage",
		safeMessage: "Could not update leave policy.",
		execute: async (session, correlationId) => {
			const parsed = parseHrStampedPackageInput(
				session,
				correlationId,
				updateLeavePolicyInputSchema,
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid leave policy update.",
					parsed.details,
				);
			}
			const result = await updateLeavePolicy(
				parsed.data,
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { policy: mapped.data } };
		},
	});
}

export async function publishLeavePolicyAction(
	input: HrActionInput<typeof publishLeavePolicyInputSchema>,
): Promise<ActionResult<{ policy: LeavePolicy }>> {
	return runOperatorPermissionAction({
		path: "publishLeavePolicyAction",
		permission: "human-resources.leave-policy.manage",
		safeMessage: "Could not publish leave policy.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(publishLeavePolicyActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid leave policy publish request.",
					parsed.details,
				);
			}
			const result = await publishLeavePolicy(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { policy: mapped.data } };
		},
	});
}

export async function supersedeLeavePolicyAction(
	input: HrActionInput<typeof supersedeLeavePolicyInputSchema>,
): Promise<ActionResult<{ policy: LeavePolicy }>> {
	return runOperatorPermissionAction({
		path: "supersedeLeavePolicyAction",
		permission: "human-resources.leave-policy.manage",
		safeMessage: "Could not supersede leave policy.",
		execute: async (session, correlationId) => {
			const parsed = parseHrStampedPackageInput(
				session,
				correlationId,
				supersedeLeavePolicyInputSchema,
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid leave policy supersession.",
					parsed.details,
				);
			}
			const result = await supersedeLeavePolicy(
				parsed.data,
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { policy: mapped.data } };
		},
	});
}

export async function archiveLeavePolicyAction(
	input: HrActionInput<typeof archiveLeavePolicyInputSchema>,
): Promise<ActionResult<{ policy: LeavePolicy }>> {
	return runOperatorPermissionAction({
		path: "archiveLeavePolicyAction",
		permission: "human-resources.leave-policy.manage",
		safeMessage: "Could not archive leave policy.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(archiveLeavePolicyActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid leave policy archive request.",
					parsed.details,
				);
			}
			const result = await archiveLeavePolicy(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { policy: mapped.data } };
		},
	});
}

export async function getLeavePolicyAction(
	input: HrActionInput<typeof getLeavePolicyInputSchema>,
): Promise<ActionResult<{ policy: LeavePolicy | null }>> {
	return runOperatorPermissionAction({
		path: "getLeavePolicyAction",
		permission: "human-resources.leave-policy.read",
		safeMessage: "Could not get leave policy.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getLeavePolicyActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid leave policy request.",
					parsed.details,
				);
			}
			const result = await getLeavePolicy(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { policy: mapped.data } };
		},
	});
}

export async function listLeavePoliciesAction(
	input: HrActionInput<typeof listLeavePoliciesInputSchema>,
): Promise<ActionResult<{ page: LeavePolicyListPage }>> {
	return runOperatorPermissionAction({
		path: "listLeavePoliciesAction",
		permission: "human-resources.leave-policy.read",
		safeMessage: "Could not list leave policies.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listLeavePoliciesActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid leave policy filters.",
					parsed.details,
				);
			}
			const result = await listLeavePolicies(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

export async function resolveApplicableLeavePolicyAction(
	input: HrActionInput<typeof resolveApplicableLeavePolicyInputSchema>,
): Promise<ActionResult<{ resolvedPolicy: ResolvedLeavePolicy | null }>> {
	return runOperatorPermissionAction({
		path: "resolveApplicableLeavePolicyAction",
		permission: "human-resources.leave-policy.read",
		safeMessage: "Could not resolve applicable leave policy.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				resolveApplicableLeavePolicyActionSchema,
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid leave policy resolution request.",
					parsed.details,
				);
			}
			const result = await resolveApplicableLeavePolicy(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { resolvedPolicy: mapped.data } };
		},
	});
}

export async function getApprovedLeaveHandoffAction(
	input: HrActionInput<typeof getApprovedLeaveHandoffInputSchema>,
): Promise<ActionResult<{ handoff: ApprovedLeaveHandoff | null }>> {
	return runOperatorPermissionAction({
		path: "getApprovedLeaveHandoffAction",
		permission: "human-resources.leave.handoff.read",
		safeMessage: "Could not get approved leave handoff.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getApprovedLeaveHandoffActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid leave handoff request.",
					parsed.details,
				);
			}
			const result = await getApprovedLeaveHandoff(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { handoff: mapped.data } };
		},
	});
}
