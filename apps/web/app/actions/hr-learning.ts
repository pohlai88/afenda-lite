"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	activateCourse,
	archiveCourse,
	assignLearning,
	assignSessionInstructor,
	type CertificationListPage,
	type CompletionListPage,
	type CourseListPage,
	cancelSession,
	completeSession,
	createCourse,
	createSession,
	type EmployeeCertification,
	enrolAssignment,
	expireCertification,
	issueCertification,
	type LearningAssignment,
	type LearningAssignmentListPage,
	type LearningAttendance,
	type LearningAttendanceListPage,
	type LearningCompletion,
	type LearningCourse,
	type LearningSession,
	listCertifications,
	listCompletions,
	listCourses,
	listLearningAssignments,
	listLearningAttendance,
	listSessions,
	recordCompletion,
	recordLearningAttendance,
	renewCertification,
	revokeCertification,
	type SessionListPage,
	startSession,
	waiveAssignment,
} from "@afenda/human-resources";
import { z } from "zod";
import {
	hrMutationContextSchema as mutationContextSchema,
	withHrSessionContext as withSessionContext,
} from "@/app/actions/hr-mutation-context";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runHrTalentOperatorPermissionAction as runOperatorPermissionAction } from "@/app/actions/run-hr-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function createCourseAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	code: string;
	title: string;
	description?: string | null;
	durationHours?: number | null;
}): Promise<ActionResult<{ course: LearningCourse }>> {
	return await runOperatorPermissionAction({
		path: "createCourseAction",
		permission: "human-resources.learning.manage",
		safeMessage: "Could not create course.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					idempotencyKey: z.string().trim().min(1).max(128),
					code: z.string().trim().min(1).max(64),
					title: z.string().trim().min(1).max(200),
					description: z.string().trim().max(2000).nullable().optional(),
					durationHours: z.number().positive().nullable().optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid course.",
				});
			}
			const result = await createCourse(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { course: mapped.data } };
		},
	});
}

export async function archiveCourseAction(input: {
	correlationId?: string;
	courseId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ course: LearningCourse }>> {
	return await runOperatorPermissionAction({
		path: "archiveCourseAction",
		permission: "human-resources.learning.manage",
		safeMessage: "Could not archive course.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					courseId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid course archive request.",
				});
			}
			const result = await archiveCourse(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { course: mapped.data } };
		},
	});
}

export async function activateCourseAction(input: {
	correlationId?: string;
	courseId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ course: LearningCourse }>> {
	return await runOperatorPermissionAction({
		path: "activateCourseAction",
		permission: "human-resources.learning.manage",
		safeMessage: "Could not activate course.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					courseId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid course activation request.",
				});
			}
			const result = await activateCourse(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { course: mapped.data } };
		},
	});
}

export async function listCoursesAction(input?: {
	correlationId?: string;
	page?: number;
	pageSize?: number;
	status?: LearningCourse["status"];
}): Promise<ActionResult<{ page: CourseListPage }>> {
	return await runOperatorPermissionAction({
		path: "listCoursesAction",
		permission: "human-resources.learning.manage",
		safeMessage: "Could not list courses.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema
					.extend({
						page: z.number().int().positive().optional(),
						pageSize: z.number().int().positive().max(100).optional(),
						status: z.enum(["active", "archived"]).optional(),
					})
					.optional(),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid course filters.",
				});
			}
			const result = await listCourses(
				withSessionContext(session, correlationId, parsed.data ?? {}),
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

export async function createSessionAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	courseId: string;
	code: string;
	title: string;
	scheduledStartsAt: string;
	scheduledEndsAt: string;
	capacity?: number | null;
}): Promise<ActionResult<{ session: LearningSession }>> {
	return await runOperatorPermissionAction({
		path: "createSessionAction",
		permission: "human-resources.learning.manage",
		safeMessage: "Could not create learning session.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					idempotencyKey: z.string().trim().min(1).max(128),
					courseId: z.string().uuid(),
					code: z.string().trim().min(1).max(64),
					title: z.string().trim().min(1).max(200),
					scheduledStartsAt: z.string().datetime({ offset: true }),
					scheduledEndsAt: z.string().datetime({ offset: true }),
					capacity: z.number().int().positive().nullable().optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid learning session.",
				});
			}
			const result = await createSession(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { session: mapped.data } };
		},
	});
}

export async function listSessionsAction(input?: {
	correlationId?: string;
	page?: number;
	pageSize?: number;
	courseId?: string;
	status?: LearningSession["status"];
}): Promise<ActionResult<{ page: SessionListPage }>> {
	return await runOperatorPermissionAction({
		path: "listSessionsAction",
		permission: "human-resources.learning.manage",
		safeMessage: "Could not list learning sessions.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema
					.extend({
						page: z.number().int().positive().optional(),
						pageSize: z.number().int().positive().max(100).optional(),
						courseId: z.string().uuid().optional(),
						status: z
							.enum(["scheduled", "in_progress", "completed", "cancelled"])
							.optional(),
					})
					.optional(),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid session filters.",
				});
			}
			const result = await listSessions(
				withSessionContext(session, correlationId, parsed.data ?? {}),
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

export async function startSessionAction(input: {
	correlationId?: string;
	sessionId: string;
	expectedVersion: number;
	actualStartsAt?: string;
}): Promise<ActionResult<{ session: LearningSession }>> {
	return await runOperatorPermissionAction({
		path: "startSessionAction",
		permission: "human-resources.learning.manage",
		safeMessage: "Could not start learning session.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					sessionId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
					actualStartsAt: z.string().datetime({ offset: true }).optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid session start request.",
				});
			}
			const result = await startSession(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { session: mapped.data } };
		},
	});
}

export async function completeSessionAction(input: {
	correlationId?: string;
	sessionId: string;
	expectedVersion: number;
	actualEndsAt?: string;
}): Promise<ActionResult<{ session: LearningSession }>> {
	return await runOperatorPermissionAction({
		path: "completeSessionAction",
		permission: "human-resources.learning.manage",
		safeMessage: "Could not complete learning session.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					sessionId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
					actualEndsAt: z.string().datetime({ offset: true }).optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid session complete request.",
				});
			}
			const result = await completeSession(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { session: mapped.data } };
		},
	});
}

export async function cancelSessionAction(input: {
	correlationId?: string;
	sessionId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ session: LearningSession }>> {
	return await runOperatorPermissionAction({
		path: "cancelSessionAction",
		permission: "human-resources.learning.manage",
		safeMessage: "Could not cancel learning session.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					sessionId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid session cancel request.",
				});
			}
			const result = await cancelSession(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { session: mapped.data } };
		},
	});
}

export async function assignLearningAction(input: {
	correlationId?: string;
	idempotencyKey?: string;
	employeeId: string;
	courseId: string;
	sessionId?: string | null;
	dueOn?: string | null;
}): Promise<ActionResult<{ assignment: LearningAssignment }>> {
	return await runOperatorPermissionAction({
		path: "assignLearningAction",
		permission: "human-resources.learning.manage",
		safeMessage: "Could not assign learning.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					idempotencyKey: z.string().trim().min(1).max(128).optional(),
					employeeId: z.string().uuid(),
					courseId: z.string().uuid(),
					sessionId: z.string().uuid().nullable().optional(),
					dueOn: z.string().regex(ISO_DATE_PATTERN).nullable().optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid learning assignment.",
				});
			}
			const result = await assignLearning(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { assignment: mapped.data } };
		},
	});
}

export async function enrolLearningAssignmentAction(input: {
	correlationId?: string;
	assignmentId: string;
	sessionId?: string;
	expectedVersion: number;
}): Promise<ActionResult<{ assignment: LearningAssignment }>> {
	return await runOperatorPermissionAction({
		path: "enrolLearningAssignmentAction",
		permission: "human-resources.learning.manage",
		safeMessage: "Could not enrol learning assignment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					assignmentId: z.string().uuid(),
					sessionId: z.string().uuid().optional(),
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid enrolment request.",
				});
			}
			const result = await enrolAssignment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { assignment: mapped.data } };
		},
	});
}

export async function waiveLearningAssignmentAction(input: {
	correlationId?: string;
	assignmentId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ assignment: LearningAssignment }>> {
	return await runOperatorPermissionAction({
		path: "waiveLearningAssignmentAction",
		permission: "human-resources.learning.manage",
		safeMessage: "Could not waive learning assignment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					assignmentId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid waiver request.",
				});
			}
			const result = await waiveAssignment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { assignment: mapped.data } };
		},
	});
}

export async function listLearningAssignmentsAction(input?: {
	correlationId?: string;
	page?: number;
	pageSize?: number;
	employeeId?: string;
	courseId?: string;
	status?: LearningAssignment["status"];
}): Promise<ActionResult<{ page: LearningAssignmentListPage }>> {
	return await runOperatorPermissionAction({
		path: "listLearningAssignmentsAction",
		permission: "human-resources.learning.manage",
		safeMessage: "Could not list learning assignments.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema
					.extend({
						page: z.number().int().positive().optional(),
						pageSize: z.number().int().positive().max(100).optional(),
						employeeId: z.string().uuid().optional(),
						courseId: z.string().uuid().optional(),
						status: z
							.enum(["pending", "in_progress", "completed", "withdrawn"])
							.optional(),
					})
					.optional(),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid assignment filters.",
				});
			}
			const result = await listLearningAssignments(
				withSessionContext(session, correlationId, parsed.data ?? {}),
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

export async function recordLearningCompletionAction(input: {
	correlationId?: string;
	idempotencyKey?: string;
	assignmentId: string;
	employeeId?: string;
	courseId?: string;
	sessionId?: string | null;
	completedAt: string;
	outcome: "passed" | "failed" | "attended";
	assessorUserId?: string | null;
	notes?: string | null;
}): Promise<ActionResult<{ completion: LearningCompletion }>> {
	return await runOperatorPermissionAction({
		path: "recordLearningCompletionAction",
		permission: "human-resources.learning.manage",
		safeMessage: "Could not record learning completion.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					idempotencyKey: z.string().trim().min(1).max(128).optional(),
					assignmentId: z.string().uuid(),
					employeeId: z.string().uuid().optional(),
					courseId: z.string().uuid().optional(),
					sessionId: z.string().uuid().nullable().optional(),
					completedAt: z.string().datetime({ offset: true }),
					outcome: z.enum(["passed", "failed", "attended"]),
					assessorUserId: z.string().trim().min(1).nullable().optional(),
					notes: z.string().trim().max(2000).nullable().optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid completion record.",
				});
			}
			const result = await recordCompletion(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { completion: mapped.data } };
		},
	});
}

export async function listLearningCompletionsAction(input?: {
	correlationId?: string;
	page?: number;
	pageSize?: number;
	employeeId?: string;
	courseId?: string;
}): Promise<ActionResult<{ page: CompletionListPage }>> {
	return await runOperatorPermissionAction({
		path: "listLearningCompletionsAction",
		permission: "human-resources.learning.manage",
		safeMessage: "Could not list learning completions.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema
					.extend({
						page: z.number().int().positive().optional(),
						pageSize: z.number().int().positive().max(100).optional(),
						employeeId: z.string().uuid().optional(),
						courseId: z.string().uuid().optional(),
					})
					.optional(),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid completion filters.",
				});
			}
			const result = await listCompletions(
				withSessionContext(session, correlationId, parsed.data ?? {}),
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

export async function issueCertificationAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	employeeId: string;
	courseId: string;
	completionId: string;
	certificationCode: string;
	issuedOn: string;
	expiresOn?: string | null;
}): Promise<ActionResult<{ certification: EmployeeCertification }>> {
	return await runOperatorPermissionAction({
		path: "issueCertificationAction",
		permission: "human-resources.certification.manage",
		safeMessage: "Could not issue certification.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					idempotencyKey: z.string().trim().min(1).max(128),
					employeeId: z.string().uuid(),
					courseId: z.string().uuid(),
					completionId: z.string().uuid(),
					certificationCode: z.string().trim().min(1).max(64),
					issuedOn: z.string().regex(ISO_DATE_PATTERN),
					expiresOn: z.string().regex(ISO_DATE_PATTERN).nullable().optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid certification issue request.",
				});
			}
			const result = await issueCertification(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { certification: mapped.data } };
		},
	});
}

export async function revokeCertificationAction(input: {
	correlationId?: string;
	certificationId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ certification: EmployeeCertification }>> {
	return await runOperatorPermissionAction({
		path: "revokeCertificationAction",
		permission: "human-resources.certification.manage",
		safeMessage: "Could not revoke certification.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					certificationId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid certification revoke request.",
				});
			}
			const result = await revokeCertification(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { certification: mapped.data } };
		},
	});
}

export async function expireCertificationAction(input: {
	correlationId?: string;
	certificationId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ certification: EmployeeCertification }>> {
	return await runOperatorPermissionAction({
		path: "expireCertificationAction",
		permission: "human-resources.certification.manage",
		safeMessage: "Could not expire certification.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					certificationId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid certification expire request.",
				});
			}
			const result = await expireCertification(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { certification: mapped.data } };
		},
	});
}

export async function assignSessionInstructorAction(input: {
	correlationId?: string;
	sessionId: string;
	primaryInstructorUserId: string | null;
	expectedVersion: number;
}): Promise<ActionResult<{ session: LearningSession }>> {
	return await runOperatorPermissionAction({
		path: "assignSessionInstructorAction",
		permission: "human-resources.learning.manage",
		safeMessage: "Could not assign session instructor.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					sessionId: z.string().uuid(),
					primaryInstructorUserId: z.string().trim().min(1).nullable(),
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid session instructor assignment.",
				});
			}
			const result = await assignSessionInstructor(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { session: mapped.data } };
		},
	});
}

export async function recordLearningAttendanceAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	sessionId: string;
	assignmentId: string;
	employeeId?: string;
	status: LearningAttendance["status"];
	recordedAt: string;
}): Promise<ActionResult<{ attendance: LearningAttendance }>> {
	return await runOperatorPermissionAction({
		path: "recordLearningAttendanceAction",
		permission: "human-resources.learning.manage",
		safeMessage: "Could not record learning attendance.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					idempotencyKey: z.string().trim().min(1).max(128),
					sessionId: z.string().uuid(),
					assignmentId: z.string().uuid(),
					employeeId: z.string().uuid().optional(),
					status: z.enum(["present", "absent", "late", "excused"]),
					recordedAt: z.string().datetime({ offset: true }),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid learning attendance record.",
				});
			}
			const result = await recordLearningAttendance(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { attendance: mapped.data } };
		},
	});
}

export async function listLearningAttendanceAction(input?: {
	correlationId?: string;
	page?: number;
	pageSize?: number;
	sessionId?: string;
	employeeId?: string;
}): Promise<ActionResult<{ page: LearningAttendanceListPage }>> {
	return await runOperatorPermissionAction({
		path: "listLearningAttendanceAction",
		permission: "human-resources.learning.manage",
		safeMessage: "Could not list learning attendance.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema
					.extend({
						page: z.number().int().positive().optional(),
						pageSize: z.number().int().positive().max(100).optional(),
						sessionId: z.string().uuid().optional(),
						employeeId: z.string().uuid().optional(),
					})
					.optional(),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid learning attendance filters.",
				});
			}
			const result = await listLearningAttendance(
				withSessionContext(session, correlationId, parsed.data ?? {}),
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

export async function renewCertificationAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	certificationId: string;
	completionId: string;
	certificationCode: string;
	issuedOn: string;
	expiresOn?: string | null;
	expectedVersion: number;
}): Promise<ActionResult<{ certification: EmployeeCertification }>> {
	return await runOperatorPermissionAction({
		path: "renewCertificationAction",
		permission: "human-resources.certification.manage",
		safeMessage: "Could not renew certification.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					idempotencyKey: z.string().trim().min(1).max(128),
					certificationId: z.string().uuid(),
					completionId: z.string().uuid(),
					certificationCode: z.string().trim().min(1).max(64),
					issuedOn: z.string().date(),
					expiresOn: z.string().date().nullable().optional(),
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid certification renewal request.",
				});
			}
			const result = await renewCertification(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { certification: mapped.data } };
		},
	});
}

export async function listCertificationsAction(input?: {
	correlationId?: string;
	page?: number;
	pageSize?: number;
	employeeId?: string;
	courseId?: string;
	status?: EmployeeCertification["status"];
}): Promise<ActionResult<{ page: CertificationListPage }>> {
	return await runOperatorPermissionAction({
		path: "listCertificationsAction",
		permission: "human-resources.certification.manage",
		safeMessage: "Could not list certifications.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema
					.extend({
						page: z.number().int().positive().optional(),
						pageSize: z.number().int().positive().max(100).optional(),
						employeeId: z.string().uuid().optional(),
						courseId: z.string().uuid().optional(),
						status: z.enum(["active", "expired", "revoked"]).optional(),
					})
					.optional(),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid certification filters.",
				});
			}
			const result = await listCertifications(
				withSessionContext(session, correlationId, parsed.data ?? {}),
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
