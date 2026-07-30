"use server";

import {
	acknowledgePolicy,
	cancelApprovedLeaveRequest,
	createDraftLeaveRequest,
	type HumanResourcesEmployeeId,
	humanResourcesLeaveEntitlementIdSchema,
	humanResourcesLeaveRequestIdSchema,
	humanResourcesPolicyAcknowledgementIdSchema,
	humanResourcesTimesheetIdSchema,
	submitLeaveRequest,
	submitTimesheet,
	withdrawLeaveRequest,
} from "@afenda/human-resources";
import { resolveHumanResourcesStore } from "@afenda/human-resources/resolve-store";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runMemberPermissionAction } from "@/app/actions/run-member-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import { createHumanResourcesIdentityResolverPort } from "@/lib/erp/human-resources-identity-resolver-port";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const HR_SELF_SERVICE_PATH = "/client/human-resources";

const leaveDraftSchema = z
	.object({
		entitlementId: humanResourcesLeaveEntitlementIdSchema,
		startDate: z.string().date(),
		endDate: z.string().date(),
		requestedQuantity: z
			.string()
			.trim()
			.regex(/^\d+(\.\d+)?$/)
			.refine((value) => Number(value) > 0),
	})
	.refine((value) => value.endDate >= value.startDate, {
		message: "End date must not precede start date.",
		path: ["endDate"],
	});

const leaveTransitionSchema = z.object({
	requestId: humanResourcesLeaveRequestIdSchema,
	expectedVersion: z.coerce.number().int().positive(),
	intent: z.enum(["submit", "withdraw"]),
});

const cancelLeaveSchema = z.object({
	requestId: humanResourcesLeaveRequestIdSchema,
	expectedVersion: z.coerce.number().int().positive(),
	note: z.string().trim().max(2000).optional(),
});

const timesheetSchema = z.object({
	timesheetId: humanResourcesTimesheetIdSchema,
	expectedVersion: z.coerce.number().int().positive(),
});

const acknowledgementSchema = z.object({
	acknowledgementId: humanResourcesPolicyAcknowledgementIdSchema,
	expectedVersion: z.coerce.number().int().positive(),
});

async function resolveOwnEmployee(input: {
	organizationId: string;
	actorUserId: string;
}): Promise<ActionResult<{ employeeId: HumanResourcesEmployeeId }>> {
	const identity =
		await createHumanResourcesIdentityResolverPort().resolveEmployeeForActor(
			input,
		);
	if (!identity.ok || identity.data === null) {
		return actionFail(
			"FORBIDDEN",
			"Your account is not linked to an active employee record.",
		);
	}
	return { ok: true, data: { employeeId: identity.data.employeeId } };
}

function changed<T extends { id: string; status?: string }>(
	result: T,
): ActionResult<{ id: string; status: string }> {
	return {
		ok: true,
		data: { id: result.id, status: result.status ?? "updated" },
	};
}

export async function createOwnLeaveDraftAction(
	_previous: ActionResult<{ id: string; status: string }> | null,
	formData: FormData,
): Promise<ActionResult<{ id: string; status: string }>> {
	return await runMemberPermissionAction({
		path: "createOwnLeaveDraftAction",
		permission: "human-resources.leave-request.own",
		safeMessage: "Could not create the leave draft. Retry or contact HR.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(leaveDraftSchema, {
				entitlementId: formData.get("entitlementId"),
				startDate: formData.get("startDate"),
				endDate: formData.get("endDate"),
				requestedQuantity: formData.get("requestedQuantity"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid entitlement, date range, and quantity.",
					parsed.details,
				);
			}

			const employee = await resolveOwnEmployee({
				organizationId: session.orgId,
				actorUserId: session.userId,
			});
			if (!employee.ok) {
				return employee;
			}

			const entitlement =
				await resolveHumanResourcesStore().getLeaveEntitlementById({
					organizationId: session.orgId,
					entitlementId: parsed.data.entitlementId,
				});
			if (!entitlement.ok) {
				return mapPackageResult(entitlement);
			}
			if (
				entitlement.data === null ||
				entitlement.data.employeeId !== employee.data.employeeId
			) {
				return actionFail(
					"FORBIDDEN",
					"That leave entitlement is not available.",
				);
			}

			const result = await createDraftLeaveRequest(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: crypto.randomUUID(),
					employeeId: employee.data.employeeId,
					entitlementId: parsed.data.entitlementId,
					startDate: parsed.data.startDate,
					endDate: parsed.data.endDate,
					requestedQuantity: parsed.data.requestedQuantity,
					dayPortion: "full",
					isBackdated:
						parsed.data.startDate < new Date().toISOString().slice(0, 10),
				},
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath(HR_SELF_SERVICE_PATH);
			return changed(mapped.data);
		},
	});
}

export async function changeOwnLeaveRequestAction(
	_previous: ActionResult<{ id: string; status: string }> | null,
	formData: FormData,
): Promise<ActionResult<{ id: string; status: string }>> {
	return await runMemberPermissionAction({
		path: "changeOwnLeaveRequestAction",
		permission: "human-resources.leave-request.own",
		safeMessage: "Could not update the leave request. Retry or contact HR.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(leaveTransitionSchema, {
				requestId: formData.get("requestId"),
				expectedVersion: formData.get("expectedVersion"),
				intent: formData.get("intent"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"The leave request could not be updated.",
					parsed.details,
				);
			}

			const employee = await resolveOwnEmployee({
				organizationId: session.orgId,
				actorUserId: session.userId,
			});
			if (!employee.ok) {
				return employee;
			}
			const request = await resolveHumanResourcesStore().getLeaveRequestById({
				organizationId: session.orgId,
				requestId: parsed.data.requestId,
			});
			if (!request.ok) {
				return mapPackageResult(request);
			}
			if (
				request.data === null ||
				request.data.employeeId !== employee.data.employeeId
			) {
				return actionFail("FORBIDDEN", "That leave request is not available.");
			}

			const execute =
				parsed.data.intent === "submit"
					? submitLeaveRequest
					: withdrawLeaveRequest;
			const result = await execute(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					requestId: parsed.data.requestId,
					expectedVersion: parsed.data.expectedVersion,
				},
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath(HR_SELF_SERVICE_PATH);
			return changed(mapped.data);
		},
	});
}

export async function cancelOwnApprovedLeaveAction(
	_previous: ActionResult<{ id: string; status: string }> | null,
	formData: FormData,
): Promise<ActionResult<{ id: string; status: string }>> {
	return await runMemberPermissionAction({
		path: "cancelOwnApprovedLeaveAction",
		permission: "human-resources.leave-request.approve-team",
		safeMessage: "Could not cancel the approved leave. Retry or contact HR.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(cancelLeaveSchema, {
				requestId: formData.get("requestId"),
				expectedVersion: formData.get("expectedVersion"),
				note: formData.get("note") || undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"The approved leave could not be cancelled.",
					parsed.details,
				);
			}
			const employee = await resolveOwnEmployee({
				organizationId: session.orgId,
				actorUserId: session.userId,
			});
			if (!employee.ok) {
				return employee;
			}
			const request = await resolveHumanResourcesStore().getLeaveRequestById({
				organizationId: session.orgId,
				requestId: parsed.data.requestId,
			});
			if (!request.ok) {
				return mapPackageResult(request);
			}
			if (
				request.data === null ||
				request.data.employeeId !== employee.data.employeeId ||
				request.data.status !== "approved"
			) {
				return actionFail(
					"FORBIDDEN",
					"That approved leave is not cancellable.",
				);
			}

			const result = await cancelApprovedLeaveRequest(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					requestId: parsed.data.requestId,
					expectedVersion: parsed.data.expectedVersion,
					note: parsed.data.note || null,
				},
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath(HR_SELF_SERVICE_PATH);
			return changed(mapped.data);
		},
	});
}

export async function submitOwnTimesheetAction(
	_previous: ActionResult<{ id: string; status: string }> | null,
	formData: FormData,
): Promise<ActionResult<{ id: string; status: string }>> {
	return await runMemberPermissionAction({
		path: "submitOwnTimesheetAction",
		permission: "human-resources.time.timesheet.submit",
		safeMessage: "Could not submit the timesheet. Retry or contact HR.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(timesheetSchema, {
				timesheetId: formData.get("timesheetId"),
				expectedVersion: formData.get("expectedVersion"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"The timesheet could not be submitted.",
					parsed.details,
				);
			}
			const employee = await resolveOwnEmployee({
				organizationId: session.orgId,
				actorUserId: session.userId,
			});
			if (!employee.ok) {
				return employee;
			}
			const timesheet = await resolveHumanResourcesStore().getTimesheet({
				organizationId: session.orgId,
				timesheetId: parsed.data.timesheetId,
			});
			if (!timesheet.ok) {
				return mapPackageResult(timesheet);
			}
			if (
				timesheet.data === null ||
				timesheet.data.employeeId !== employee.data.employeeId
			) {
				return actionFail("FORBIDDEN", "That timesheet is not available.");
			}

			const result = await submitTimesheet(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					timesheetId: parsed.data.timesheetId,
					expectedVersion: parsed.data.expectedVersion,
				},
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath(HR_SELF_SERVICE_PATH);
			return changed(mapped.data);
		},
	});
}

export async function acknowledgeOwnPolicyAction(
	_previous: ActionResult<{ id: string; status: string }> | null,
	formData: FormData,
): Promise<ActionResult<{ id: string; status: string }>> {
	return await runMemberPermissionAction({
		path: "acknowledgeOwnPolicyAction",
		permission: "human-resources.policy-acknowledgement.administer",
		safeMessage: "Could not record the acknowledgement. Retry or contact HR.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(acknowledgementSchema, {
				acknowledgementId: formData.get("acknowledgementId"),
				expectedVersion: formData.get("expectedVersion"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"The policy acknowledgement could not be recorded.",
					parsed.details,
				);
			}
			const employee = await resolveOwnEmployee({
				organizationId: session.orgId,
				actorUserId: session.userId,
			});
			if (!employee.ok) {
				return employee;
			}
			const acknowledgement =
				await resolveHumanResourcesStore().getPolicyAcknowledgementById({
					organizationId: session.orgId,
					acknowledgementId: parsed.data.acknowledgementId,
				});
			if (!acknowledgement.ok) {
				return mapPackageResult(acknowledgement);
			}
			if (
				acknowledgement.data === null ||
				acknowledgement.data.employeeId !== employee.data.employeeId ||
				acknowledgement.data.requirementStatus !== "outstanding"
			) {
				return actionFail(
					"FORBIDDEN",
					"That policy acknowledgement is not outstanding.",
				);
			}

			const result = await acknowledgePolicy(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					acknowledgementId: parsed.data.acknowledgementId,
					expectedVersion: parsed.data.expectedVersion,
				},
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath(HR_SELF_SERVICE_PATH);
			return changed({
				id: mapped.data.id,
				status: mapped.data.requirementStatus,
			});
		},
	});
}
