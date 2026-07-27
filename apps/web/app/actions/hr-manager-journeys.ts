"use server";

import type { Result } from "@afenda/errors/result";
import {
	approveLeaveRequest,
	approvePerformanceGoal,
	approveSuccessionCandidate,
	approveTimesheet,
	assessSuccessionReadiness,
	confirmEmployment,
	excuseAttendanceException,
	finalizePerformanceReview,
	getAttendanceException,
	getLeaveRequest,
	getPerformanceGoalById,
	getPerformanceReviewById,
	getProbationReview,
	getTalentProfileByEmployee,
	getTimesheet,
	listSuccessionCandidates,
	recordProbationAssessment,
	recordProbationOutcome,
	recordTalentProfileAssessment,
	rejectAttendanceException,
	rejectLeaveRequest,
	rejectPerformanceGoal,
	rejectTimesheet,
	resolveAttendanceException,
	returnLeaveRequest,
	returnPerformanceReviewForCorrection,
	returnTimesheet,
	reviewAttendanceException,
	submitManagerAssessment,
} from "@afenda/human-resources";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runMemberPermissionAction } from "@/app/actions/run-member-permission-action";
import {
	isEmployeeInManagerScope,
	resolveManagerScope,
} from "@/features/human-resources/manager/manager-scope";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import type { ProductPermissionCode } from "@/modules/identity/domain/session-permission";
import {
	type ActionResult,
	actionFail,
	actionOk,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type ManagerJourneyActionState = ActionResult<{
	message: string;
}> | null;

type ManagerSession = {
	orgId: string;
	userId: string;
};

const targetSchema = z.object({
	targetId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

const leaveDecisionSchema = targetSchema
	.extend({
		operation: z.enum(["approve", "reject", "return"]),
		note: z.string().trim().max(2000),
	})
	.superRefine((value, context) => {
		if (value.operation !== "approve" && value.note.length === 0) {
			context.addIssue({
				code: "custom",
				path: ["note"],
				message: "Enter a reason for this decision.",
			});
		}
	});

const timesheetDecisionSchema = targetSchema
	.extend({
		operation: z.enum(["approve", "return", "reject"]),
		note: z.string().trim().max(1000),
	})
	.superRefine((value, context) => {
		if (value.operation !== "approve" && value.note.length === 0) {
			context.addIssue({
				code: "custom",
				path: ["note"],
				message: "Enter a reason for this decision.",
			});
		}
	});

const attendanceDecisionSchema = targetSchema
	.extend({
		operation: z.enum(["review", "excuse", "reject", "resolve"]),
		note: z.string().trim().max(1000),
		evidenceReference: z.string().trim().max(200),
	})
	.superRefine((value, context) => {
		if (value.operation !== "review" && value.note.length === 0) {
			context.addIssue({
				code: "custom",
				path: ["note"],
				message: "Enter the review resolution.",
			});
		}
	});

const probationDecisionSchema = targetSchema.extend({
	operation: z.enum(["assess", "pass", "fail", "confirm"]),
	employmentId: z.string().uuid(),
	effectiveOn: z.string().date(),
	note: z.string().trim().min(1).max(2000),
	evidenceReference: z.string().trim().max(500),
});

const performanceDecisionSchema = targetSchema
	.extend({
		resourceKind: z.enum(["review", "goal"]),
		operation: z.enum([
			"submit-manager",
			"return",
			"finalize",
			"approve-goal",
			"reject-goal",
		]),
		rating: z.string().trim().max(64),
		note: z.string().trim().max(4000),
	})
	.superRefine((value, context) => {
		if (
			["submit-manager", "finalize"].includes(value.operation) &&
			value.rating.length === 0
		) {
			context.addIssue({
				code: "custom",
				path: ["rating"],
				message: "Enter a rating for this review decision.",
			});
		}
	});

const talentDecisionSchema = targetSchema.extend({
	employeeId: z.string().uuid(),
	methodCode: z.enum([
		"calibration_panel",
		"assessment_center",
		"manager_evidence_review",
	]),
	classification: z.string().trim().min(1).max(100),
	evidenceSummary: z.string().trim().min(1).max(4000),
});

const successionDecisionSchema = targetSchema
	.extend({
		employeeId: z.string().uuid(),
		planId: z.string().uuid(),
		operation: z.enum(["assess", "approve"]),
		readiness: z.enum(["not_ready", "ready_soon", "ready_now", "emerging"]),
		effectiveOn: z.string().date(),
		evidenceSummary: z.string().trim().max(4000),
	})
	.superRefine((value, context) => {
		if (value.operation === "assess" && value.evidenceSummary.length === 0) {
			context.addIssue({
				code: "custom",
				path: ["evidenceSummary"],
				message: "Enter evidence for the readiness assessment.",
			});
		}
	});

function formValue(
	formData: FormData,
	name: string,
): FormDataEntryValue | null {
	return formData.get(name);
}

function targetFormValues(formData: FormData) {
	return {
		targetId: formValue(formData, "targetId"),
		expectedVersion: formValue(formData, "expectedVersion"),
	};
}

function packageContext(session: ManagerSession, correlationId: string) {
	return {
		organizationId: session.orgId,
		actorUserId: session.userId,
		correlationId,
	};
}

function scopeFailure(
	message = "This item is outside your current team scope.",
) {
	return actionFail("FORBIDDEN", message);
}

async function completeJourney<T>(
	result: Result<T>,
	message: string,
): Promise<ActionResult<{ message: string }>> {
	const mapped = mapPackageResult(result);
	if (!mapped.ok) return mapped;
	revalidatePath("/client/human-resources/manager");
	return actionOk({ message });
}

async function runManagerJourney(input: {
	path: string;
	permission: ProductPermissionCode;
	safeMessage: string;
	execute: (
		session: ManagerSession,
		correlationId: string,
	) => Promise<ActionResult<{ message: string }>>;
}) {
	return runMemberPermissionAction(input);
}

export async function managerLeaveDecisionAction(
	_previous: ManagerJourneyActionState,
	formData: FormData,
): Promise<ActionResult<{ message: string }>> {
	return runManagerJourney({
		path: "managerLeaveDecisionAction",
		permission: "human-resources.leave-request.approve-team",
		safeMessage: "Could not complete the leave decision.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(leaveDecisionSchema, {
				...targetFormValues(formData),
				operation: formValue(formData, "operation"),
				note: formValue(formData, "note") ?? "",
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid leave decision.",
					parsed.details,
				);
			}
			const scope = await resolveManagerScope(session);
			if (!scope.ok) return scopeFailure();
			const options = createHumanResourcesCommandOptions();
			const request = await getLeaveRequest(
				{
					...packageContext(session, correlationId),
					requestId: parsed.data.targetId,
				},
				options,
			);
			if (
				!request.ok ||
				request.data === null ||
				!isEmployeeInManagerScope(scope.data, request.data.employeeId)
			) {
				return scopeFailure();
			}
			const command = {
				...packageContext(session, correlationId),
				requestId: parsed.data.targetId,
				note: parsed.data.note.length === 0 ? null : parsed.data.note,
				expectedVersion: parsed.data.expectedVersion,
			};
			const operation = {
				approve: approveLeaveRequest,
				reject: rejectLeaveRequest,
				return: returnLeaveRequest,
			}[parsed.data.operation];
			return completeJourney(
				await operation(command, options),
				`Leave request ${parsed.data.operation}d.`,
			);
		},
	});
}

export async function managerTimesheetDecisionAction(
	_previous: ManagerJourneyActionState,
	formData: FormData,
): Promise<ActionResult<{ message: string }>> {
	return runManagerJourney({
		path: "managerTimesheetDecisionAction",
		permission: "human-resources.time.timesheet.approve",
		safeMessage: "Could not complete the timesheet decision.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(timesheetDecisionSchema, {
				...targetFormValues(formData),
				operation: formValue(formData, "operation"),
				note: formValue(formData, "note") ?? "",
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid timesheet decision.",
					parsed.details,
				);
			}
			const scope = await resolveManagerScope(session);
			if (!scope.ok) return scopeFailure();
			const options = createHumanResourcesCommandOptions();
			const timesheet = await getTimesheet(
				{
					...packageContext(session, correlationId),
					timesheetId: parsed.data.targetId,
				},
				options,
			);
			if (
				!timesheet.ok ||
				timesheet.data === null ||
				!isEmployeeInManagerScope(scope.data, timesheet.data.employeeId)
			) {
				return scopeFailure();
			}
			const base = {
				...packageContext(session, correlationId),
				timesheetId: parsed.data.targetId,
				expectedVersion: parsed.data.expectedVersion,
			};
			if (parsed.data.operation === "approve") {
				return completeJourney(
					await approveTimesheet(
						{
							...base,
							authority: "line_manager",
							approverNotes: parsed.data.note || null,
						},
						options,
					),
					"Timesheet approved.",
				);
			}
			if (parsed.data.operation === "return") {
				return completeJourney(
					await returnTimesheet(
						{ ...base, approverNotes: parsed.data.note },
						options,
					),
					"Timesheet returned for correction.",
				);
			}
			return completeJourney(
				await rejectTimesheet(
					{ ...base, rejectionReason: parsed.data.note },
					options,
				),
				"Timesheet rejected.",
			);
		},
	});
}

export async function managerAttendanceDecisionAction(
	_previous: ManagerJourneyActionState,
	formData: FormData,
): Promise<ActionResult<{ message: string }>> {
	return runManagerJourney({
		path: "managerAttendanceDecisionAction",
		permission: "human-resources.time.exception.resolve",
		safeMessage: "Could not complete the attendance exception decision.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(attendanceDecisionSchema, {
				...targetFormValues(formData),
				operation: formValue(formData, "operation"),
				note: formValue(formData, "note") ?? "",
				evidenceReference: formValue(formData, "evidenceReference") ?? "",
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid attendance exception decision.",
					parsed.details,
				);
			}
			const scope = await resolveManagerScope(session);
			if (!scope.ok) return scopeFailure();
			const options = createHumanResourcesCommandOptions();
			const exception = await getAttendanceException(
				{
					...packageContext(session, correlationId),
					exceptionId: parsed.data.targetId,
				},
				options,
			);
			if (
				!exception.ok ||
				exception.data === null ||
				!isEmployeeInManagerScope(scope.data, exception.data.employeeId)
			) {
				return scopeFailure();
			}
			const base = {
				...packageContext(session, correlationId),
				exceptionId: parsed.data.targetId,
				expectedVersion: parsed.data.expectedVersion,
			};
			if (parsed.data.operation === "review") {
				return completeJourney(
					await reviewAttendanceException(base, options),
					"Attendance exception moved into review.",
				);
			}
			if (parsed.data.operation === "excuse") {
				return completeJourney(
					await excuseAttendanceException(
						{
							...base,
							resolution: parsed.data.note,
							evidenceReference: parsed.data.evidenceReference || null,
						},
						options,
					),
					"Attendance exception excused.",
				);
			}
			const operation =
				parsed.data.operation === "reject"
					? rejectAttendanceException
					: resolveAttendanceException;
			return completeJourney(
				await operation({ ...base, resolution: parsed.data.note }, options),
				parsed.data.operation === "reject"
					? "Attendance exception rejected."
					: "Attendance exception resolved.",
			);
		},
	});
}

export async function managerProbationDecisionAction(
	_previous: ManagerJourneyActionState,
	formData: FormData,
): Promise<ActionResult<{ message: string }>> {
	return runManagerJourney({
		path: "managerProbationDecisionAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not complete the probation decision.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(probationDecisionSchema, {
				...targetFormValues(formData),
				operation: formValue(formData, "operation"),
				employmentId: formValue(formData, "relatedId"),
				effectiveOn: formValue(formData, "effectiveOn"),
				note: formValue(formData, "note"),
				evidenceReference: formValue(formData, "evidenceReference") ?? "",
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid probation decision.",
					parsed.details,
				);
			}
			const scope = await resolveManagerScope(session);
			if (!scope.ok) return scopeFailure();
			const options = createHumanResourcesCommandOptions();
			const review = await getProbationReview(
				{
					...packageContext(session, correlationId),
					probationReviewId: parsed.data.targetId,
				},
				options,
			);
			if (
				!review.ok ||
				review.data === null ||
				review.data.employmentId !== parsed.data.employmentId ||
				!isEmployeeInManagerScope(scope.data, review.data.employeeId)
			) {
				return scopeFailure();
			}
			const context = packageContext(session, correlationId);
			if (parsed.data.operation === "assess") {
				return completeJourney(
					await recordProbationAssessment(
						{
							...context,
							probationReviewId: parsed.data.targetId,
							reviewedOn: parsed.data.effectiveOn,
							reason: parsed.data.note,
							evidenceReference: parsed.data.evidenceReference || undefined,
							expectedVersion: parsed.data.expectedVersion,
						},
						options,
					),
					"Probation assessment recorded.",
				);
			}
			if (parsed.data.operation === "confirm") {
				return completeJourney(
					await confirmEmployment(
						{
							...context,
							idempotencyKey: crypto.randomUUID(),
							employmentId: parsed.data.employmentId,
							confirmedOn: parsed.data.effectiveOn,
							evidenceNote: parsed.data.note,
						},
						options,
					),
					"Employment confirmed.",
				);
			}
			return completeJourney(
				await recordProbationOutcome(
					{
						...context,
						probationReviewId: parsed.data.targetId,
						outcome: parsed.data.operation === "pass" ? "passed" : "failed",
						outcomeRecordedOn: parsed.data.effectiveOn,
						reason: parsed.data.note,
						evidenceReference: parsed.data.evidenceReference || undefined,
						expectedVersion: parsed.data.expectedVersion,
					},
					options,
				),
				`Probation outcome recorded as ${parsed.data.operation === "pass" ? "passed" : "failed"}.`,
			);
		},
	});
}

export async function managerPerformanceDecisionAction(
	_previous: ManagerJourneyActionState,
	formData: FormData,
): Promise<ActionResult<{ message: string }>> {
	return runManagerJourney({
		path: "managerPerformanceDecisionAction",
		permission: "human-resources.performance.manager.manage",
		safeMessage: "Could not complete the performance decision.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(performanceDecisionSchema, {
				...targetFormValues(formData),
				resourceKind: formValue(formData, "resourceKind"),
				operation: formValue(formData, "operation"),
				rating: formValue(formData, "rating") ?? "",
				note: formValue(formData, "note") ?? "",
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid performance decision.",
					parsed.details,
				);
			}
			const scope = await resolveManagerScope(session);
			if (!scope.ok) return scopeFailure();
			const options = createHumanResourcesCommandOptions();
			const context = packageContext(session, correlationId);
			if (parsed.data.resourceKind === "goal") {
				const goal = await getPerformanceGoalById(
					{ ...context, goalId: parsed.data.targetId },
					options,
				);
				if (
					!goal.ok ||
					goal.data === null ||
					!isEmployeeInManagerScope(scope.data, goal.data.employeeId)
				) {
					return scopeFailure();
				}
				const operation =
					parsed.data.operation === "approve-goal"
						? approvePerformanceGoal
						: rejectPerformanceGoal;
				return completeJourney(
					await operation(
						{
							...context,
							goalId: parsed.data.targetId,
							expectedVersion: parsed.data.expectedVersion,
						},
						options,
					),
					parsed.data.operation === "approve-goal"
						? "Performance goal approved."
						: "Performance goal rejected.",
				);
			}
			const review = await getPerformanceReviewById(
				{
					...context,
					reviewId: parsed.data.targetId,
					includeConfidential: false,
				},
				options,
			);
			if (
				!review.ok ||
				review.data === null ||
				!isEmployeeInManagerScope(scope.data, review.data.review.employeeId)
			) {
				return scopeFailure();
			}
			const base = {
				...context,
				reviewId: parsed.data.targetId,
				expectedVersion: parsed.data.expectedVersion,
			};
			if (parsed.data.operation === "submit-manager") {
				return completeJourney(
					await submitManagerAssessment(
						{
							...base,
							rating: parsed.data.rating,
							commentsSensitive: parsed.data.note || null,
							managerEmployeeId: scope.data.managerEmployeeId,
						},
						options,
					),
					"Manager assessment submitted.",
				);
			}
			if (parsed.data.operation === "return") {
				return completeJourney(
					await returnPerformanceReviewForCorrection(base, options),
					"Performance review returned for correction.",
				);
			}
			return completeJourney(
				await finalizePerformanceReview(
					{
						...base,
						overallRating: parsed.data.rating,
						idempotencyKey: crypto.randomUUID(),
					},
					options,
				),
				"Performance review finalized.",
			);
		},
	});
}

export async function managerTalentDecisionAction(
	_previous: ManagerJourneyActionState,
	formData: FormData,
): Promise<ActionResult<{ message: string }>> {
	return runManagerJourney({
		path: "managerTalentDecisionAction",
		permission: "human-resources.talent.admin",
		safeMessage: "Could not record the talent assessment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(talentDecisionSchema, {
				...targetFormValues(formData),
				employeeId: formValue(formData, "employeeId"),
				methodCode: formValue(formData, "methodCode"),
				classification: formValue(formData, "classification"),
				evidenceSummary: formValue(formData, "evidenceSummary"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid talent assessment.",
					parsed.details,
				);
			}
			const scope = await resolveManagerScope(session);
			if (
				!scope.ok ||
				!isEmployeeInManagerScope(scope.data, parsed.data.employeeId)
			) {
				return scopeFailure();
			}
			const options = createHumanResourcesCommandOptions();
			const profile = await getTalentProfileByEmployee(
				{
					...packageContext(session, correlationId),
					employeeId: parsed.data.employeeId,
					includeSensitive: false,
				},
				options,
			);
			if (
				!profile.ok ||
				profile.data === null ||
				profile.data.id !== parsed.data.targetId
			) {
				return scopeFailure();
			}
			return completeJourney(
				await recordTalentProfileAssessment(
					{
						...packageContext(session, correlationId),
						talentProfileId: parsed.data.targetId,
						methodCode: parsed.data.methodCode,
						classification: parsed.data.classification,
						evidenceSummary: parsed.data.evidenceSummary,
						assessorUserId: session.userId,
					},
					options,
				),
				"Talent assessment recorded.",
			);
		},
	});
}

export async function managerSuccessionDecisionAction(
	_previous: ManagerJourneyActionState,
	formData: FormData,
): Promise<ActionResult<{ message: string }>> {
	return runManagerJourney({
		path: "managerSuccessionDecisionAction",
		permission: "human-resources.succession.admin",
		safeMessage: "Could not complete the succession decision.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(successionDecisionSchema, {
				...targetFormValues(formData),
				employeeId: formValue(formData, "employeeId"),
				planId: formValue(formData, "relatedId"),
				operation: formValue(formData, "operation"),
				readiness: formValue(formData, "readiness"),
				effectiveOn: formValue(formData, "effectiveOn"),
				evidenceSummary: formValue(formData, "evidenceSummary") ?? "",
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid succession decision.",
					parsed.details,
				);
			}
			const scope = await resolveManagerScope(session);
			if (
				!scope.ok ||
				!isEmployeeInManagerScope(scope.data, parsed.data.employeeId)
			) {
				return scopeFailure();
			}
			const options = createHumanResourcesCommandOptions();
			const candidates = await listSuccessionCandidates(
				{
					...packageContext(session, correlationId),
					successionPlanId: parsed.data.planId,
					page: 1,
					pageSize: 100,
				},
				options,
			);
			const candidate = candidates.ok
				? candidates.data.candidates.find(
						(item) => item.id === parsed.data.targetId,
					)
				: undefined;
			if (
				candidate === undefined ||
				candidate.employeeId !== parsed.data.employeeId
			) {
				return scopeFailure();
			}
			const context = packageContext(session, correlationId);
			if (parsed.data.operation === "approve") {
				return completeJourney(
					await approveSuccessionCandidate(
						{
							...context,
							candidateId: parsed.data.targetId,
							expectedVersion: parsed.data.expectedVersion,
						},
						options,
					),
					"Succession candidate approved.",
				);
			}
			return completeJourney(
				await assessSuccessionReadiness(
					{
						...context,
						candidateId: parsed.data.targetId,
						readiness: parsed.data.readiness,
						readinessEffectiveOn: parsed.data.effectiveOn,
						evidenceSummary: parsed.data.evidenceSummary,
						expectedVersion: parsed.data.expectedVersion,
					},
					options,
				),
				"Succession readiness updated.",
			);
		},
	});
}
