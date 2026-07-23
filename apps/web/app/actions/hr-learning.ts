"use server";

import {
	archiveCourse,
	assignLearning,
	createCourse,
	createSession,
	enrolAssignment,
	expireCertification,
	issueCertification,
	listCertifications,
	listCompletions,
	listCourses,
	listLearningAssignments,
	listSessions,
	recordCompletion,
	revokeCertification,
	type CertificationListPage,
	type CompletionListPage,
	type CourseListPage,
	type EmployeeCertification,
	type LearningAssignment,
	type LearningAssignmentListPage,
	type LearningCompletion,
	type LearningCourse,
	type LearningSession,
	type SessionListPage,
	waiveAssignment,
} from "@afenda/human-resources";
import { z } from "zod";

import {
	hrMutationContextSchema as mutationContextSchema,
	withHrSessionContext as withSessionContext,
} from "@/app/actions/hr-mutation-context";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export async function createCourseAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	code: string;
	title: string;
	description?: string | null;
	durationHours?: number | null;
}): Promise<ActionResult<{ course: LearningCourse }>> {
	return runOperatorPermissionAction({
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
				return actionFail("VALIDATION_ERROR", "Enter a valid course.", parsed.details);
			}
			const result = await createCourse(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { course: mapped.data } };
		},
	});
}

export async function archiveCourseAction(input: {
	correlationId?: string;
	courseId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ course: LearningCourse }>> {
	return runOperatorPermissionAction({
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
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid course archive request.",
					parsed.details,
				);
			}
			const result = await archiveCourse(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
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
	return runOperatorPermissionAction({
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
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid course filters.",
					parsed.details,
				);
			}
			const result = await listCourses(
				withSessionContext(session, correlationId, parsed.data ?? {}),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
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
	return runOperatorPermissionAction({
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
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid learning session.",
					parsed.details,
				);
			}
			const result = await createSession(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
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
	return runOperatorPermissionAction({
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
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid session filters.",
					parsed.details,
				);
			}
			const result = await listSessions(
				withSessionContext(session, correlationId, parsed.data ?? {}),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { page: mapped.data } };
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
	return runOperatorPermissionAction({
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
					dueOn: z
						.string()
						.regex(/^\d{4}-\d{2}-\d{2}$/)
						.nullable()
						.optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid learning assignment.",
					parsed.details,
				);
			}
			const result = await assignLearning(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
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
	return runOperatorPermissionAction({
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
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid enrolment request.",
					parsed.details,
				);
			}
			const result = await enrolAssignment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { assignment: mapped.data } };
		},
	});
}

export async function waiveLearningAssignmentAction(input: {
	correlationId?: string;
	assignmentId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ assignment: LearningAssignment }>> {
	return runOperatorPermissionAction({
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
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid waiver request.",
					parsed.details,
				);
			}
			const result = await waiveAssignment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
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
	return runOperatorPermissionAction({
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
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid assignment filters.",
					parsed.details,
				);
			}
			const result = await listLearningAssignments(
				withSessionContext(session, correlationId, parsed.data ?? {}),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
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
	return runOperatorPermissionAction({
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
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid completion record.",
					parsed.details,
				);
			}
			const result = await recordCompletion(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
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
	return runOperatorPermissionAction({
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
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid completion filters.",
					parsed.details,
				);
			}
			const result = await listCompletions(
				withSessionContext(session, correlationId, parsed.data ?? {}),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

export async function issueCertificationAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	employeeId: string;
	courseId: string;
	certificationCode: string;
	issuedOn: string;
	expiresOn?: string | null;
}): Promise<ActionResult<{ certification: EmployeeCertification }>> {
	return runOperatorPermissionAction({
		path: "issueCertificationAction",
		permission: "human-resources.certification.manage",
		safeMessage: "Could not issue certification.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					idempotencyKey: z.string().trim().min(1).max(128),
					employeeId: z.string().uuid(),
					courseId: z.string().uuid(),
					certificationCode: z.string().trim().min(1).max(64),
					issuedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
					expiresOn: z
						.string()
						.regex(/^\d{4}-\d{2}-\d{2}$/)
						.nullable()
						.optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid certification issue request.",
					parsed.details,
				);
			}
			const result = await issueCertification(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { certification: mapped.data } };
		},
	});
}

export async function revokeCertificationAction(input: {
	correlationId?: string;
	certificationId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ certification: EmployeeCertification }>> {
	return runOperatorPermissionAction({
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
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid certification revoke request.",
					parsed.details,
				);
			}
			const result = await revokeCertification(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { certification: mapped.data } };
		},
	});
}

export async function expireCertificationAction(input: {
	correlationId?: string;
	certificationId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ certification: EmployeeCertification }>> {
	return runOperatorPermissionAction({
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
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid certification expire request.",
					parsed.details,
				);
			}
			const result = await expireCertification(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
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
	return runOperatorPermissionAction({
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
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid certification filters.",
					parsed.details,
				);
			}
			const result = await listCertifications(
				withSessionContext(session, correlationId, parsed.data ?? {}),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { page: mapped.data } };
		},
	});
}
