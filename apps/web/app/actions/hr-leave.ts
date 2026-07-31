"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
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
	return await runOperatorPermissionAction({
		path: "createDraftLeaveRequestAction",
		permission: "human-resources.leave-request.own",
		safeMessage: "Could not create leave request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createDraftLeaveRequestActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid leave request.",
				});
			}
			const result = await createDraftLeaveRequest(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { request: mapped.data } };
		},
	});
}

export async function submitLeaveRequestAction(
	input: HrActionInput<typeof submitLeaveRequestInputSchema>,
): Promise<ActionResult<{ request: LeaveRequest }>> {
	return await runOperatorPermissionAction({
		path: "submitLeaveRequestAction",
		permission: "human-resources.leave-request.own",
		safeMessage: "Could not submit leave request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(submitLeaveRequestActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid leave submission.",
				});
			}
			const result = await submitLeaveRequest(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { request: mapped.data } };
		},
	});
}

export async function amendLeaveRequestAction(
	input: HrActionInput<typeof amendLeaveRequestInputSchema>,
): Promise<ActionResult<{ request: LeaveRequest }>> {
	return await runOperatorPermissionAction({
		path: "amendLeaveRequestAction",
		permission: "human-resources.leave-request.own",
		safeMessage: "Could not amend leave request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(amendLeaveRequestActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid leave amendment.",
				});
			}
			const result = await amendLeaveRequest(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { request: mapped.data } };
		},
	});
}

export async function withdrawLeaveRequestAction(
	input: HrActionInput<typeof withdrawLeaveRequestInputSchema>,
): Promise<ActionResult<{ request: LeaveRequest }>> {
	return await runOperatorPermissionAction({
		path: "withdrawLeaveRequestAction",
		permission: "human-resources.leave-request.own",
		safeMessage: "Could not withdraw leave request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(withdrawLeaveRequestActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid leave withdrawal.",
				});
			}
			const result = await withdrawLeaveRequest(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { request: mapped.data } };
		},
	});
}

export async function cancelApprovedLeaveRequestAction(
	input: HrActionInput<typeof cancelApprovedLeaveRequestInputSchema>,
): Promise<ActionResult<{ request: LeaveRequest }>> {
	return await runOperatorPermissionAction({
		path: "cancelApprovedLeaveRequestAction",
		permission: "human-resources.leave-request.approve-team",
		safeMessage: "Could not cancel approved leave request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(cancelApprovedLeaveRequestActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid leave cancellation.",
				});
			}
			const result = await cancelApprovedLeaveRequest(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { request: mapped.data } };
		},
	});
}

export async function getLeaveBalanceAction(
	input: HrActionInput<typeof getLeaveBalanceInputSchema>,
): Promise<ActionResult<{ balance: LeaveBalance | null }>> {
	return await runOperatorPermissionAction({
		path: "getLeaveBalanceAction",
		permission: "human-resources.leave-entitlement.read",
		safeMessage: "Could not get leave balance.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getLeaveBalanceActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid leave balance request.",
				});
			}
			const result = await getLeaveBalance(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { balance: mapped.data } };
		},
	});
}

export async function reconcileLeaveBalanceAction(
	input: HrActionInput<typeof getLeaveBalanceInputSchema>,
): Promise<
	ActionResult<{ reconciliation: LeaveBalanceReconciliation | null }>
> {
	return await runOperatorPermissionAction({
		path: "reconcileLeaveBalanceAction",
		permission: "human-resources.leave-entitlement.read",
		safeMessage: "Could not reconcile leave balance.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getLeaveBalanceActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid leave balance reconciliation request.",
				});
			}
			const result = await reconcileLeaveBalance(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { reconciliation: mapped.data } };
		},
	});
}

export async function getLeaveEntitlementAction(
	input: HrActionInput<typeof getLeaveEntitlementInputSchema>,
): Promise<ActionResult<{ entitlement: LeaveEntitlement | null }>> {
	return await runOperatorPermissionAction({
		path: "getLeaveEntitlementAction",
		permission: "human-resources.leave-entitlement.read",
		safeMessage: "Could not get leave entitlement.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getLeaveEntitlementActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid leave entitlement request.",
				});
			}
			const result = await getLeaveEntitlement(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { entitlement: mapped.data } };
		},
	});
}

export async function listLeaveEntitlementsAction(
	input: HrActionInput<typeof listLeaveEntitlementsInputSchema>,
): Promise<ActionResult<{ page: LeaveEntitlementListPage }>> {
	return await runOperatorPermissionAction({
		path: "listLeaveEntitlementsAction",
		permission: "human-resources.leave-entitlement.read",
		safeMessage: "Could not list leave entitlements.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listLeaveEntitlementsActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid leave entitlement filters.",
				});
			}
			const result = await listLeaveEntitlements(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

export async function approveLeaveRequestAction(
	input: HrActionInput<typeof approveLeaveRequestInputSchema>,
): Promise<ActionResult<{ request: LeaveRequest }>> {
	return await runOperatorPermissionAction({
		path: "approveLeaveRequestAction",
		permission: "human-resources.leave-request.approve-team",
		safeMessage: "Could not approve leave request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(approveLeaveRequestActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid leave approval.",
				});
			}
			const result = await approveLeaveRequest(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { request: mapped.data } };
		},
	});
}

export async function rejectLeaveRequestAction(
	input: HrActionInput<typeof rejectLeaveRequestInputSchema>,
): Promise<ActionResult<{ request: LeaveRequest }>> {
	return await runOperatorPermissionAction({
		path: "rejectLeaveRequestAction",
		permission: "human-resources.leave-request.approve-team",
		safeMessage: "Could not reject leave request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(rejectLeaveRequestActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid leave rejection.",
				});
			}
			const result = await rejectLeaveRequest(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { request: mapped.data } };
		},
	});
}

export async function returnLeaveRequestAction(
	input: HrActionInput<typeof returnLeaveRequestInputSchema>,
): Promise<ActionResult<{ request: LeaveRequest }>> {
	return await runOperatorPermissionAction({
		path: "returnLeaveRequestAction",
		permission: "human-resources.leave-request.approve-team",
		safeMessage: "Could not return leave request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(returnLeaveRequestActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid leave return.",
				});
			}
			const result = await returnLeaveRequest(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { request: mapped.data } };
		},
	});
}

export async function listPendingApprovalLeaveRequestsAction(
	input: HrActionInput<typeof listPendingApprovalLeaveRequestsInputSchema>,
): Promise<ActionResult<{ page: LeaveRequestListPage }>> {
	return await runOperatorPermissionAction({
		path: "listPendingApprovalLeaveRequestsAction",
		permission: "human-resources.leave-request.approve-team",
		safeMessage: "Could not list pending leave approvals.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				listPendingApprovalLeaveRequestsActionSchema,
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid pending approval filters.",
				});
			}
			const result = await listPendingApprovalLeaveRequests(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

export async function listTeamCalendarLeaveRequestsAction(
	input: HrActionInput<typeof listTeamCalendarLeaveRequestsInputSchema>,
): Promise<ActionResult<{ page: TeamCalendarLeavePage }>> {
	return await runOperatorPermissionAction({
		path: "listTeamCalendarLeaveRequestsAction",
		permission: "human-resources.leave-request.approve-team",
		safeMessage: "Could not list team leave calendar.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				listTeamCalendarLeaveRequestsActionSchema,
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid team calendar range.",
				});
			}
			const result = await listTeamCalendarLeaveRequests(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

export async function createLeavePolicyAction(
	input: HrActionInput<typeof createLeavePolicyInputSchema>,
): Promise<ActionResult<{ policy: LeavePolicy }>> {
	return await runOperatorPermissionAction({
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
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid leave policy.",
				});
			}
			const result = await createLeavePolicy(
				parsed.data,
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { policy: mapped.data } };
		},
	});
}

export async function updateLeavePolicyAction(
	input: HrActionInput<typeof updateLeavePolicyInputSchema>,
): Promise<ActionResult<{ policy: LeavePolicy }>> {
	return await runOperatorPermissionAction({
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
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid leave policy update.",
				});
			}
			const result = await updateLeavePolicy(
				parsed.data,
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { policy: mapped.data } };
		},
	});
}

export async function publishLeavePolicyAction(
	input: HrActionInput<typeof publishLeavePolicyInputSchema>,
): Promise<ActionResult<{ policy: LeavePolicy }>> {
	return await runOperatorPermissionAction({
		path: "publishLeavePolicyAction",
		permission: "human-resources.leave-policy.manage",
		safeMessage: "Could not publish leave policy.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(publishLeavePolicyActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid leave policy publish request.",
				});
			}
			const result = await publishLeavePolicy(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { policy: mapped.data } };
		},
	});
}

export async function supersedeLeavePolicyAction(
	input: HrActionInput<typeof supersedeLeavePolicyInputSchema>,
): Promise<ActionResult<{ policy: LeavePolicy }>> {
	return await runOperatorPermissionAction({
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
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid leave policy supersession.",
				});
			}
			const result = await supersedeLeavePolicy(
				parsed.data,
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { policy: mapped.data } };
		},
	});
}

export async function archiveLeavePolicyAction(
	input: HrActionInput<typeof archiveLeavePolicyInputSchema>,
): Promise<ActionResult<{ policy: LeavePolicy }>> {
	return await runOperatorPermissionAction({
		path: "archiveLeavePolicyAction",
		permission: "human-resources.leave-policy.manage",
		safeMessage: "Could not archive leave policy.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(archiveLeavePolicyActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid leave policy archive request.",
				});
			}
			const result = await archiveLeavePolicy(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { policy: mapped.data } };
		},
	});
}

export async function getLeavePolicyAction(
	input: HrActionInput<typeof getLeavePolicyInputSchema>,
): Promise<ActionResult<{ policy: LeavePolicy | null }>> {
	return await runOperatorPermissionAction({
		path: "getLeavePolicyAction",
		permission: "human-resources.leave-policy.read",
		safeMessage: "Could not get leave policy.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getLeavePolicyActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid leave policy request.",
				});
			}
			const result = await getLeavePolicy(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { policy: mapped.data } };
		},
	});
}

export async function listLeavePoliciesAction(
	input: HrActionInput<typeof listLeavePoliciesInputSchema>,
): Promise<ActionResult<{ page: LeavePolicyListPage }>> {
	return await runOperatorPermissionAction({
		path: "listLeavePoliciesAction",
		permission: "human-resources.leave-policy.read",
		safeMessage: "Could not list leave policies.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listLeavePoliciesActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid leave policy filters.",
				});
			}
			const result = await listLeavePolicies(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

export async function resolveApplicableLeavePolicyAction(
	input: HrActionInput<typeof resolveApplicableLeavePolicyInputSchema>,
): Promise<ActionResult<{ resolvedPolicy: ResolvedLeavePolicy | null }>> {
	return await runOperatorPermissionAction({
		path: "resolveApplicableLeavePolicyAction",
		permission: "human-resources.leave-policy.read",
		safeMessage: "Could not resolve applicable leave policy.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				resolveApplicableLeavePolicyActionSchema,
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid leave policy resolution request.",
				});
			}
			const result = await resolveApplicableLeavePolicy(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { resolvedPolicy: mapped.data } };
		},
	});
}

export async function getApprovedLeaveHandoffAction(
	input: HrActionInput<typeof getApprovedLeaveHandoffInputSchema>,
): Promise<ActionResult<{ handoff: ApprovedLeaveHandoff | null }>> {
	return await runOperatorPermissionAction({
		path: "getApprovedLeaveHandoffAction",
		permission: "human-resources.leave.handoff.read",
		safeMessage: "Could not get approved leave handoff.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getApprovedLeaveHandoffActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid leave handoff request.",
				});
			}
			const result = await getApprovedLeaveHandoff(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { handoff: mapped.data } };
		},
	});
}
