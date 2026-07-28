"use server";

import {
	endAssignment,
	getAssignment,
	getEmployment,
	hireEmployment,
	openProbation,
	proposeTermination,
	reactivateEmployment,
	rehireEmployment,
	resolveEmployeeOrgContextAsOf,
	startOffboarding,
	startOnboarding,
	suspendEmployment,
	terminateEmployment,
	transferAssignment,
} from "@afenda/human-resources";
import {
	humanResourcesAssignmentIdSchema,
	humanResourcesEmployeeIdSchema,
	humanResourcesEmploymentIdSchema,
	humanResourcesPositionIdSchema,
} from "@afenda/human-resources/brands";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runHrWorkforceOperatorPermissionAction as runOperatorPermissionAction } from "@/app/actions/run-hr-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const isoDateSchema = z.string().date();
const expectedVersionSchema = z.coerce.number().int().positive();

export type HrAdminJourneyActionData = {
	employeeId: string;
	operation: string;
	recordId: string;
	version: number;
};

export type HrAdminJourneyActionState =
	ActionResult<HrAdminJourneyActionData> | null;

const employmentJourneySchema = z.discriminatedUnion("intent", [
	z.object({
		intent: z.enum(["hire", "rehire"]),
		employeeId: humanResourcesEmployeeIdSchema,
		effectiveOn: isoDateSchema,
	}),
	z.object({
		intent: z.enum(["suspend", "reactivate", "terminate"]),
		employeeId: humanResourcesEmployeeIdSchema,
		employmentId: humanResourcesEmploymentIdSchema,
		effectiveOn: isoDateSchema,
		expectedVersion: expectedVersionSchema,
	}),
]);

const assignmentJourneySchema = z.discriminatedUnion("intent", [
	z.object({
		intent: z.literal("transfer"),
		employeeId: humanResourcesEmployeeIdSchema,
		employmentId: humanResourcesEmploymentIdSchema,
		toPositionId: humanResourcesPositionIdSchema,
		effectiveOn: isoDateSchema,
		reason: z.string().trim().min(1).max(500),
	}),
	z.object({
		intent: z.literal("end"),
		employeeId: humanResourcesEmployeeIdSchema,
		employmentId: humanResourcesEmploymentIdSchema,
		assignmentId: humanResourcesAssignmentIdSchema,
		effectiveOn: isoDateSchema,
		expectedVersion: expectedVersionSchema,
	}),
]);

const employmentLifecycleJourneySchema = z.discriminatedUnion("intent", [
	z.object({
		intent: z.literal("open_probation"),
		employeeId: humanResourcesEmployeeIdSchema,
		employmentId: humanResourcesEmploymentIdSchema,
		startsOn: isoDateSchema,
		endsOn: isoDateSchema,
	}),
	z.object({
		intent: z.literal("propose_termination"),
		employeeId: humanResourcesEmployeeIdSchema,
		employmentId: humanResourcesEmploymentIdSchema,
		effectiveOn: isoDateSchema,
		reasonCode: z.string().trim().min(1).max(64),
		reasonDetail: z.string().trim().min(1).max(2000),
		rehireEligible: z.boolean(),
	}),
]);

const caseStartJourneySchema = z.object({
	employeeId: humanResourcesEmployeeIdSchema,
	employmentId: humanResourcesEmploymentIdSchema,
});

function employeePath(employeeId: string): string {
	return `/admin/human-resources/employees/${employeeId}`;
}

function revalidateEmployee(employeeId: string): void {
	revalidatePath("/admin/human-resources");
	revalidatePath(employeePath(employeeId));
}

async function loadOwnedEmployment(input: {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	employeeId: string;
	employmentId: string;
}) {
	const result = await getEmployment(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
			employmentId: input.employmentId,
		},
		createHumanResourcesCommandOptions(),
	);
	const mapped = mapPackageResult(result);
	if (!mapped.ok) return mapped;
	if (mapped.data.employeeId !== input.employeeId) {
		return actionFail("NOT_FOUND", "Employment record not found.");
	}
	return mapped;
}

function success(input: {
	employeeId: string;
	operation: string;
	record: { id: string; version: number };
}): ActionResult<HrAdminJourneyActionData> {
	return {
		ok: true,
		data: {
			employeeId: input.employeeId,
			operation: input.operation,
			recordId: input.record.id,
			version: input.record.version,
		},
	};
}

export async function runEmploymentJourneyAction(
	_prev: HrAdminJourneyActionState,
	formData: FormData,
): Promise<HrAdminJourneyActionState> {
	return runOperatorPermissionAction({
		path: "runEmploymentJourneyAction",
		permission: "human-resources.employment.manage",
		safeMessage:
			"Could not update employment. Try again or contact HR support.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(employmentJourneySchema, {
				intent: formData.get("intent"),
				employeeId: formData.get("employeeId"),
				employmentId: formData.get("employmentId") || undefined,
				effectiveOn: formData.get("effectiveOn"),
				expectedVersion: formData.get("expectedVersion") || undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment transition.",
					parsed.details,
				);
			}

			const options = createHumanResourcesCommandOptions();
			if (!("employmentId" in parsed.data)) {
				const command =
					parsed.data.intent === "hire" ? hireEmployment : rehireEmployment;
				const result = await command(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						employeeId: parsed.data.employeeId,
						startsOn: parsed.data.effectiveOn,
						endsOn: null,
					},
					options,
				);
				const mapped = mapPackageResult(result);
				if (!mapped.ok) return mapped;
				revalidateEmployee(parsed.data.employeeId);
				return success({
					employeeId: parsed.data.employeeId,
					operation: parsed.data.intent,
					record: mapped.data,
				});
			}

			const owned = await loadOwnedEmployment({
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				employeeId: parsed.data.employeeId,
				employmentId: parsed.data.employmentId,
			});
			if (!owned.ok) return owned;
			const command = {
				suspend: suspendEmployment,
				reactivate: reactivateEmployment,
				terminate: terminateEmployment,
			}[parsed.data.intent];
			const result = await command(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					employmentId: parsed.data.employmentId,
					effectiveOn: parsed.data.effectiveOn,
					expectedVersion: parsed.data.expectedVersion,
				},
				options,
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			revalidateEmployee(parsed.data.employeeId);
			return success({
				employeeId: parsed.data.employeeId,
				operation: parsed.data.intent,
				record: mapped.data,
			});
		},
	});
}

export async function runAssignmentJourneyAction(
	_prev: HrAdminJourneyActionState,
	formData: FormData,
): Promise<HrAdminJourneyActionState> {
	return runOperatorPermissionAction({
		path: "runAssignmentJourneyAction",
		permission: "human-resources.employment.manage",
		safeMessage:
			"Could not update the assignment. Try again or contact HR support.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(assignmentJourneySchema, {
				intent: formData.get("intent"),
				employeeId: formData.get("employeeId"),
				employmentId: formData.get("employmentId"),
				assignmentId: formData.get("assignmentId") || undefined,
				toPositionId: formData.get("toPositionId") || undefined,
				effectiveOn: formData.get("effectiveOn"),
				reason: formData.get("reason") || undefined,
				expectedVersion: formData.get("expectedVersion") || undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid assignment transition.",
					parsed.details,
				);
			}

			const owned = await loadOwnedEmployment({
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				employeeId: parsed.data.employeeId,
				employmentId: parsed.data.employmentId,
			});
			if (!owned.ok) return owned;
			const options = createHumanResourcesCommandOptions();

			if (parsed.data.intent === "end") {
				const assignmentResult = await getAssignment(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						assignmentId: parsed.data.assignmentId,
					},
					options,
				);
				const assignment = mapPackageResult(assignmentResult);
				if (!assignment.ok) return assignment;
				if (
					assignment.data.employeeId !== parsed.data.employeeId ||
					assignment.data.employmentId !== parsed.data.employmentId
				) {
					return actionFail("NOT_FOUND", "Assignment record not found.");
				}
				const result = await endAssignment(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						assignmentId: parsed.data.assignmentId,
						endsOn: parsed.data.effectiveOn,
						expectedVersion: parsed.data.expectedVersion,
					},
					options,
				);
				const mapped = mapPackageResult(result);
				if (!mapped.ok) return mapped;
				revalidateEmployee(parsed.data.employeeId);
				return success({
					employeeId: parsed.data.employeeId,
					operation: "end_assignment",
					record: mapped.data,
				});
			}

			const contextResult = await resolveEmployeeOrgContextAsOf(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					employeeId: parsed.data.employeeId,
					asOf: parsed.data.effectiveOn,
				},
				options,
			);
			const context = mapPackageResult(contextResult);
			if (!context.ok) return context;
			const result = await transferAssignment(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `admin-transfer:${parsed.data.employmentId}:${parsed.data.effectiveOn}:${parsed.data.toPositionId}`,
					employmentId: parsed.data.employmentId,
					toPositionId: parsed.data.toPositionId,
					legalEntityKey: context.data.legalEntityKey,
					businessUnitKey: context.data.businessUnitKey,
					locationKey: context.data.locationKey,
					costCentreKey: context.data.costCentreKey,
					projectKey: context.data.projectKey,
					effectiveOn: parsed.data.effectiveOn,
					reason: parsed.data.reason,
				},
				options,
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			revalidateEmployee(parsed.data.employeeId);
			return success({
				employeeId: parsed.data.employeeId,
				operation: "transfer_assignment",
				record: mapped.data,
			});
		},
	});
}

export async function runEmploymentLifecycleJourneyAction(
	_prev: HrAdminJourneyActionState,
	formData: FormData,
): Promise<HrAdminJourneyActionState> {
	return runOperatorPermissionAction({
		path: "runEmploymentLifecycleJourneyAction",
		permission: "human-resources.employment.manage",
		safeMessage:
			"Could not update the employee lifecycle. Try again or contact HR support.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(employmentLifecycleJourneySchema, {
				intent: formData.get("intent"),
				employeeId: formData.get("employeeId"),
				employmentId: formData.get("employmentId"),
				startsOn: formData.get("startsOn") || undefined,
				endsOn: formData.get("endsOn") || undefined,
				effectiveOn: formData.get("effectiveOn") || undefined,
				reasonCode: formData.get("reasonCode") || undefined,
				reasonDetail: formData.get("reasonDetail") || undefined,
				rehireEligible: formData.get("rehireEligible") === "on",
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid lifecycle details.",
					parsed.details,
				);
			}
			const owned = await loadOwnedEmployment({
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				employeeId: parsed.data.employeeId,
				employmentId: parsed.data.employmentId,
			});
			if (!owned.ok) return owned;
			const options = createHumanResourcesCommandOptions();
			if (parsed.data.intent === "open_probation") {
				const result = await openProbation(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						idempotencyKey: `admin-probation:${parsed.data.employmentId}:${parsed.data.startsOn}`,
						employmentId: parsed.data.employmentId,
						startsOn: parsed.data.startsOn,
						endsOn: parsed.data.endsOn,
					},
					options,
				);
				const mapped = mapPackageResult(result);
				if (!mapped.ok) return mapped;
				revalidateEmployee(parsed.data.employeeId);
				return success({
					employeeId: parsed.data.employeeId,
					operation: "open_probation",
					record: mapped.data,
				});
			}
			const result = await proposeTermination(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `admin-termination:${parsed.data.employmentId}:${parsed.data.effectiveOn}`,
					employmentId: parsed.data.employmentId,
					reasonCode: parsed.data.reasonCode,
					reasonDetail: parsed.data.reasonDetail,
					effectiveOn: parsed.data.effectiveOn,
					rehireEligible: parsed.data.rehireEligible,
				},
				options,
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			revalidateEmployee(parsed.data.employeeId);
			return success({
				employeeId: parsed.data.employeeId,
				operation: "propose_termination",
				record: mapped.data,
			});
		},
	});
}

const onboardingTasks = [
	{
		code: "identity",
		title: "Verify identity and employment records",
		mandatory: true,
	},
	{ code: "access", title: "Provision required access", mandatory: true },
	{
		code: "orientation",
		title: "Complete employee orientation",
		mandatory: true,
	},
] as const;

const offboardingTasks = [
	{ code: "access", title: "Revoke employee access", mandatory: true },
	{ code: "assets", title: "Complete asset clearance", mandatory: true },
	{ code: "payroll", title: "Complete payroll handoff", mandatory: true },
] as const;

export async function startOnboardingJourneyAction(
	_prev: HrAdminJourneyActionState,
	formData: FormData,
): Promise<HrAdminJourneyActionState> {
	return runOperatorPermissionAction({
		path: "startOnboardingJourneyAction",
		permission: "human-resources.onboarding.manage",
		safeMessage: "Could not start onboarding. Try again or contact HR support.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(caseStartJourneySchema, {
				employeeId: formData.get("employeeId"),
				employmentId: formData.get("employmentId"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Select a valid employment.",
					parsed.details,
				);
			}
			const owned = await loadOwnedEmployment({
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				...parsed.data,
			});
			if (!owned.ok) return owned;
			const result = await startOnboarding(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `admin-onboarding:${parsed.data.employmentId}`,
					employmentId: parsed.data.employmentId,
					sourceOfferId: null,
					tasks: onboardingTasks.map((task) => ({ ...task })),
				},
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			revalidateEmployee(parsed.data.employeeId);
			return success({
				employeeId: parsed.data.employeeId,
				operation: "start_onboarding",
				record: mapped.data,
			});
		},
	});
}

export async function startOffboardingJourneyAction(
	_prev: HrAdminJourneyActionState,
	formData: FormData,
): Promise<HrAdminJourneyActionState> {
	return runOperatorPermissionAction({
		path: "startOffboardingJourneyAction",
		permission: "human-resources.offboarding.manage",
		safeMessage:
			"Could not start offboarding. Try again or contact HR support.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(caseStartJourneySchema, {
				employeeId: formData.get("employeeId"),
				employmentId: formData.get("employmentId"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Select a valid employment.",
					parsed.details,
				);
			}
			const owned = await loadOwnedEmployment({
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				...parsed.data,
			});
			if (!owned.ok) return owned;
			const result = await startOffboarding(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `admin-offboarding:${parsed.data.employmentId}`,
					employmentId: parsed.data.employmentId,
					terminationId: null,
					tasks: offboardingTasks.map((task) => ({ ...task })),
				},
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			revalidateEmployee(parsed.data.employeeId);
			return success({
				employeeId: parsed.data.employeeId,
				operation: "start_offboarding",
				record: mapped.data,
			});
		},
	});
}
