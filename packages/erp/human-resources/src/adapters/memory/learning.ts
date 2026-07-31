import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";
import {
	HUMAN_RESOURCES_CERTIFICATION_EXPIRING_EVENT,
	HUMAN_RESOURCES_CERTIFICATION_RENEWED_EVENT,
	HUMAN_RESOURCES_LEARNING_ASSIGNMENT_CREATED_EVENT,
	HUMAN_RESOURCES_LEARNING_COMPLETION_RECORDED_EVENT,
} from "@afenda/events/schemas";

import {
	type HumanResourcesCertificationId,
	type HumanResourcesCompletionId,
	type HumanResourcesCourseId,
	type HumanResourcesEmployeeId,
	type HumanResourcesLearningAssignmentId,
	type HumanResourcesLearningAttendanceId,
	type HumanResourcesSessionId,
	parseHumanResourcesCertificationId,
	parseHumanResourcesCompletionId,
	parseHumanResourcesCourseId,
	parseHumanResourcesLearningAssignmentId,
	parseHumanResourcesLearningAttendanceId,
	parseHumanResourcesSessionId,
} from "../../brands";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	humanResourcesErrorDetails,
} from "../../error-codes";
import type { MutationPorts } from "../../ports";
import {
	buildCreateAuditFact,
	buildStatusTransitionAuditFact,
} from "../../shared/audit-facts";
import { assertExpectedVersion } from "../../shared/concurrency";
import { conflict, notFound } from "../../shared/domain-guards";
import {
	assertAssignmentEnrollable,
	assertAssignmentWaivable,
	assertCertificationCanExpire,
	assertCertificationCanRevoke,
	assertCertificationIssuable,
	assertCertificationRenewable,
	assertCompletionRecordable,
	assertCourseActive,
	assertCourseCanArchive,
	assertCourseStatusTransition,
	assertLearningAttendanceRecordable,
	assertNoDuplicateCompletion,
	assertNoDuplicateLearningAttendance,
	assertSessionNotTerminal,
	assertSessionSchedulable,
} from "../../shared/learning-guards";
import type {
	AssignmentStatus,
	CertificationStatus,
	CourseStatus,
	SessionStatus,
} from "../../shared/learning-status";
import {
	isAssignmentActive,
	isSessionActive,
} from "../../shared/learning-status";
import type { HumanResourcesMutationMeta } from "../../shared/mutation-meta";
import type {
	CompletionCreateRecord,
	CourseCreateRecord,
	HumanResourcesStore,
	IdempotentCertificationRecord,
	IdempotentCompletionRecord,
	IdempotentCourseRecord,
	IdempotentLearningAssignmentRecord,
	IdempotentLearningAttendanceRecord,
	IdempotentSessionRecord,
	LearningAssignmentCreateRecord,
	LearningAttendanceCreateRecord,
	SessionCreateRecord,
} from "../../store";
import type {
	CertificationListPage,
	CompletionListPage,
	CourseListPage,
	EmployeeCertification,
	LearningAssignment,
	LearningAssignmentListPage,
	LearningAttendance,
	LearningAttendanceListPage,
	LearningCompletion,
	LearningCourse,
	LearningSession,
	SessionListPage,
} from "../../types";
import type { CoreMemoryState } from "./core";
import { idempotencyMapKey } from "./shared";

function attendanceAssignmentSessionKey(
	assignmentId: HumanResourcesLearningAssignmentId,
	sessionId: HumanResourcesSessionId,
): string {
	return `${assignmentId}:${sessionId}`;
}

export interface LearningMemoryState {
	assignmentIdempotencyByKey: Map<string, IdempotentLearningAssignmentRecord>;
	attendanceByAssignmentSession: Map<
		string,
		HumanResourcesLearningAttendanceId
	>;
	attendanceIdempotencyByKey: Map<string, IdempotentLearningAttendanceRecord>;
	certificationIdempotencyByKey: Map<string, IdempotentCertificationRecord>;
	certifications: Map<HumanResourcesCertificationId, EmployeeCertification>;
	completionByAssignmentId: Map<string, string>;
	completionIdempotencyByKey: Map<string, IdempotentCompletionRecord>;
	completions: Map<HumanResourcesCompletionId, LearningCompletion>;
	courseIdempotencyByKey: Map<string, IdempotentCourseRecord>;
	courses: Map<HumanResourcesCourseId, LearningCourse>;
	learningAssignments: Map<
		HumanResourcesLearningAssignmentId,
		LearningAssignment
	>;
	learningAttendance: Map<
		HumanResourcesLearningAttendanceId,
		LearningAttendance
	>;
	sessionIdempotencyByKey: Map<string, IdempotentSessionRecord>;
	sessions: Map<HumanResourcesSessionId, LearningSession>;
}

function resolveLearningAttendanceReplay(
	existing: IdempotentLearningAttendanceRecord | undefined,
	expectedFingerprint: string,
): Result<LearningAttendance | null> {
	if (existing === undefined) {
		return errorResult.ok(null);
	}
	if (existing.createRequestFingerprint !== expectedFingerprint) {
		return conflict("Idempotency key reused with different payload");
	}
	return errorResult.ok({ ...existing.attendance });
}

function resolveLearningAttendanceContext(
	state: LearningMemoryState,
	record: LearningAttendanceCreateRecord,
): Result<{ assignment: LearningAssignment; session: LearningSession }> {
	const assignment = state.learningAssignments.get(record.assignmentId);
	if (!assignment || assignment.organizationId !== record.organizationId) {
		return notFound(
			"Assignment not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	if (assignment.employeeId !== record.employeeId) {
		return notFound(
			"Attendance employee does not match assignment",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const session = state.sessions.get(record.sessionId);
	if (!session || session.organizationId !== record.organizationId) {
		return notFound(
			"Session not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	return errorResult.ok({ assignment, session });
}

export type MemoryLearningMethods = Pick<
	HumanResourcesStore,
	| "getCourseById"
	| "findCourseByIdempotencyKey"
	| "createCourse"
	| "updateCourse"
	| "activateCourse"
	| "archiveCourse"
	| "listCourses"
	| "getSessionById"
	| "findSessionByIdempotencyKey"
	| "createSession"
	| "startSession"
	| "completeSession"
	| "cancelSession"
	| "assignSessionInstructor"
	| "listSessions"
	| "getLearningAssignmentById"
	| "findLearningAssignmentByIdempotencyKey"
	| "createLearningAssignment"
	| "enrollLearningAssignment"
	| "waiveLearningAssignment"
	| "listLearningAssignments"
	| "getCompletionById"
	| "findCompletionByIdempotencyKey"
	| "recordCompletion"
	| "listCompletions"
	| "getLearningAttendanceById"
	| "findLearningAttendanceByIdempotencyKey"
	| "findLearningAttendanceByAssignmentAndSession"
	| "recordLearningAttendance"
	| "listLearningAttendance"
	| "getCertificationById"
	| "findCertificationByIdempotencyKey"
	| "issueCertification"
	| "revokeCertification"
	| "expireCertification"
	| "renewCertification"
	| "listCertifications"
	| "listExpiringCertifications"
	| "countActiveAssignmentsForCourse"
	| "countEnrolledInSession"
	| "findCompletionByAssignmentId"
>;

export function createLearningMemoryState(): LearningMemoryState {
	return {
		courses: new Map(),
		courseIdempotencyByKey: new Map(),
		sessions: new Map(),
		sessionIdempotencyByKey: new Map(),
		learningAssignments: new Map(),
		assignmentIdempotencyByKey: new Map(),
		completions: new Map(),
		completionByAssignmentId: new Map(),
		completionIdempotencyByKey: new Map(),
		learningAttendance: new Map(),
		attendanceByAssignmentSession: new Map(),
		attendanceIdempotencyByKey: new Map(),
		certifications: new Map(),
		certificationIdempotencyByKey: new Map(),
	};
}

export function resetLearningMemoryState(state: LearningMemoryState): void {
	state.courses.clear();
	state.courseIdempotencyByKey.clear();
	state.sessions.clear();
	state.sessionIdempotencyByKey.clear();
	state.learningAssignments.clear();
	state.assignmentIdempotencyByKey.clear();
	state.completions.clear();
	state.completionByAssignmentId.clear();
	state.completionIdempotencyByKey.clear();
	state.learningAttendance.clear();
	state.attendanceByAssignmentSession.clear();
	state.attendanceIdempotencyByKey.clear();
	state.certifications.clear();
	state.certificationIdempotencyByKey.clear();
}

export function createMemoryLearningMethods(
	state: LearningMemoryState,
	core: CoreMemoryState,
): MemoryLearningMethods & ThisType<MemoryLearningMethods> {
	return {
		async countActiveAssignmentsForCourse(input: {
			organizationId: string;
			courseId: HumanResourcesCourseId;
		}): Promise<Result<number>> {
			const count = Array.from(state.learningAssignments.values()).filter(
				(a) =>
					a.organizationId === input.organizationId &&
					a.courseId === input.courseId &&
					isAssignmentActive(a.status),
			).length;
			return await errorResult.ok(count);
		},

		async getCourseById(input: {
			organizationId: string;
			courseId: HumanResourcesCourseId;
		}): Promise<Result<LearningCourse | null>> {
			const course = state.courses.get(input.courseId);
			if (!course || course.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...course });
		},

		async findCourseByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentCourseRecord | null>> {
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.courseIdempotencyByKey.get(key);
			if (!record) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...record, course: { ...record.course } });
		},

		async createCourse(
			record: CourseCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<LearningCourse>> {
			const existing = Array.from(state.courses.values()).find(
				(c) =>
					c.organizationId === record.organizationId && c.code === record.code,
			);
			if (existing) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}

			const idResult = parseHumanResourcesCourseId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const course: LearningCourse = {
				id: idResult.data,
				organizationId: record.organizationId,
				code: record.code,
				title: record.title,
				description: record.description,
				durationHours: record.durationHours,
				status: "active",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.courses.set(course.id, course);

			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			state.courseIdempotencyByKey.set(idempotencyKey, {
				course: { ...course },
				createIdempotencyKey: record.createIdempotencyKey,
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const audit = await ports.audit.record({
				organizationId: course.organizationId,
				actorUserId: course.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_learning_course",
				entityId: course.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.courses.delete(course.id);
				state.courseIdempotencyByKey.delete(idempotencyKey);
				return audit;
			}

			return errorResult.ok({ ...course });
		},

		async updateCourse(
			input: {
				organizationId: string;
				courseId: HumanResourcesCourseId;
				title?: string | undefined;
				description?: string | null | undefined;
				durationHours?: string | null | undefined;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<LearningCourse>> {
			const course = state.courses.get(input.courseId);
			if (!course || course.organizationId !== input.organizationId) {
				return notFound("Course not found");
			}

			const versionCheck = assertExpectedVersion(
				course.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: LearningCourse = {
				...course,
				title: input.title ?? course.title,
				description:
					input.description === undefined
						? course.description
						: input.description,
				durationHours:
					input.durationHours === undefined
						? course.durationHours
						: input.durationHours,
				version: course.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.courses.set(input.courseId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_learning_course",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.courses.set(input.courseId, course);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async activateCourse(
			input: {
				organizationId: string;
				courseId: HumanResourcesCourseId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<LearningCourse>> {
			const course = state.courses.get(input.courseId);
			if (!course || course.organizationId !== input.organizationId) {
				return notFound("Course not found");
			}

			const versionCheck = assertExpectedVersion(
				course.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const transition = assertCourseStatusTransition(course.status, "active");
			if (!transition.ok) {
				return transition;
			}

			const now = new Date();
			const updated: LearningCourse = {
				...course,
				status: "active",
				version: course.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.courses.set(input.courseId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_learning_course",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.courses.set(input.courseId, course);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async archiveCourse(
			input: {
				organizationId: string;
				courseId: HumanResourcesCourseId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<LearningCourse>> {
			const course = state.courses.get(input.courseId);
			if (!course || course.organizationId !== input.organizationId) {
				return notFound("Course not found");
			}

			const versionCheck = assertExpectedVersion(
				course.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const activeCount = await this.countActiveAssignmentsForCourse({
				organizationId: input.organizationId,
				courseId: input.courseId,
			});
			if (!activeCount.ok) {
				return activeCount;
			}

			const archiveGuard = assertCourseCanArchive({
				status: course.status,
				hasActiveAssignments: activeCount.data > 0,
			});
			if (!archiveGuard.ok) {
				return archiveGuard;
			}

			const now = new Date();
			const updated: LearningCourse = {
				...course,
				status: "archived",
				version: course.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.courses.set(input.courseId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_learning_course",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.courses.set(input.courseId, course);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async listCourses(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: CourseStatus | undefined;
		}): Promise<Result<CourseListPage>> {
			let filtered = Array.from(state.courses.values()).filter(
				(c) => c.organizationId === input.organizationId,
			);

			if (input.status !== undefined) {
				filtered = filtered.filter((c) => c.status === input.status);
			}

			filtered.sort((a, b) => a.title.localeCompare(b.title));

			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const courses = filtered
				.slice(start, start + input.pageSize)
				.map((c) => ({ ...c }));

			return await errorResult.ok({
				courses,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// Learning Session methods
		async getSessionById(input: {
			organizationId: string;
			sessionId: HumanResourcesSessionId;
		}): Promise<Result<LearningSession | null>> {
			const session = state.sessions.get(input.sessionId);
			if (!session || session.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...session });
		},

		async findSessionByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentSessionRecord | null>> {
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.sessionIdempotencyByKey.get(key);
			if (!record) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({
				...record,
				session: { ...record.session },
			});
		},

		async countEnrolledInSession(input: {
			organizationId: string;
			sessionId: HumanResourcesSessionId;
		}): Promise<Result<number>> {
			const count = Array.from(state.learningAssignments.values()).filter(
				(a) =>
					a.organizationId === input.organizationId &&
					a.sessionId !== null &&
					a.sessionId === input.sessionId &&
					a.status === "in_progress",
			).length;
			return await errorResult.ok(count);
		},

		async createSession(
			record: SessionCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<LearningSession>> {
			const course = state.courses.get(record.courseId);
			if (!course || course.organizationId !== record.organizationId) {
				return notFound(
					"Course not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const activeGuard = assertCourseActive(course.status);
			if (!activeGuard.ok) {
				return activeGuard;
			}
			const existingSession = Array.from(state.sessions.values()).find(
				(sessionValue) =>
					sessionValue.organizationId === record.organizationId &&
					sessionValue.code === record.code,
			);
			if (existingSession) {
				return conflict("Session code already exists in organization");
			}

			const schedulableGuard = assertSessionSchedulable({
				scheduledStartsAt: record.scheduledStartsAt,
				scheduledEndsAt: record.scheduledEndsAt,
			});
			if (!schedulableGuard.ok) {
				return schedulableGuard;
			}

			const idResult = parseHumanResourcesSessionId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const session: LearningSession = {
				id: idResult.data,
				organizationId: record.organizationId,
				courseId: record.courseId,
				code: record.code,
				title: record.title,
				scheduledStartsAt: record.scheduledStartsAt,
				scheduledEndsAt: record.scheduledEndsAt,
				actualStartsAt: null,
				actualEndsAt: null,
				capacity: record.capacity,
				primaryInstructorUserId: record.primaryInstructorUserId,
				status: "scheduled",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.sessions.set(session.id, session);

			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			state.sessionIdempotencyByKey.set(idempotencyKey, {
				session: { ...session },
				createIdempotencyKey: record.createIdempotencyKey,
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const audit = await ports.audit.record({
				organizationId: session.organizationId,
				actorUserId: session.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_learning_session",
				entityId: session.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.sessions.delete(session.id);
				state.sessionIdempotencyByKey.delete(idempotencyKey);
				return audit;
			}

			return errorResult.ok({ ...session });
		},

		async startSession(
			input: {
				organizationId: string;
				sessionId: HumanResourcesSessionId;
				actualStartsAt: Date;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<LearningSession>> {
			const session = state.sessions.get(input.sessionId);
			if (!session || session.organizationId !== input.organizationId) {
				return notFound("Session not found");
			}

			const versionCheck = assertExpectedVersion(
				session.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const terminalGuard = assertSessionNotTerminal(session.status);
			if (!terminalGuard.ok) {
				return terminalGuard;
			}

			if (session.status === "in_progress") {
				return conflict("Session is already in progress");
			}

			const now = new Date();
			const updated: LearningSession = {
				...session,
				status: "in_progress",
				actualStartsAt: input.actualStartsAt,
				version: session.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.sessions.set(input.sessionId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_learning_session",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.sessions.set(input.sessionId, session);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async completeSession(
			input: {
				organizationId: string;
				sessionId: HumanResourcesSessionId;
				actualEndsAt: Date;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<LearningSession>> {
			const session = state.sessions.get(input.sessionId);
			if (!session || session.organizationId !== input.organizationId) {
				return notFound("Session not found");
			}

			const versionCheck = assertExpectedVersion(
				session.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const terminalGuard = assertSessionNotTerminal(session.status);
			if (!terminalGuard.ok) {
				return terminalGuard;
			}

			if (session.status === "completed") {
				return conflict("Session is already completed");
			}

			const now = new Date();
			const updated: LearningSession = {
				...session,
				status: "completed",
				actualEndsAt: input.actualEndsAt,
				version: session.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.sessions.set(input.sessionId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_learning_session",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.sessions.set(input.sessionId, session);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async cancelSession(
			input: {
				organizationId: string;
				sessionId: HumanResourcesSessionId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<LearningSession>> {
			const session = state.sessions.get(input.sessionId);
			if (!session || session.organizationId !== input.organizationId) {
				return notFound("Session not found");
			}

			const versionCheck = assertExpectedVersion(
				session.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const terminalGuard = assertSessionNotTerminal(session.status);
			if (!terminalGuard.ok) {
				return terminalGuard;
			}

			if (session.status === "cancelled") {
				return conflict("Session is already cancelled");
			}

			const now = new Date();
			const updated: LearningSession = {
				...session,
				status: "cancelled",
				version: session.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.sessions.set(input.sessionId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_learning_session",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.sessions.set(input.sessionId, session);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async assignSessionInstructor(
			input: {
				organizationId: string;
				sessionId: HumanResourcesSessionId;
				primaryInstructorUserId: string | null;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<LearningSession>> {
			const session = state.sessions.get(input.sessionId);
			if (!session || session.organizationId !== input.organizationId) {
				return notFound("Session not found");
			}

			const versionCheck = assertExpectedVersion(
				session.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const terminalGuard = assertSessionNotTerminal(session.status);
			if (!terminalGuard.ok) {
				return terminalGuard;
			}

			const now = new Date();
			const updated: LearningSession = {
				...session,
				primaryInstructorUserId: input.primaryInstructorUserId,
				version: session.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.sessions.set(input.sessionId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_learning_session",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.sessions.set(input.sessionId, session);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async listSessions(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: SessionStatus | undefined;
			courseId?: HumanResourcesCourseId | undefined;
		}): Promise<Result<SessionListPage>> {
			let filtered = Array.from(state.sessions.values()).filter(
				(s) => s.organizationId === input.organizationId,
			);

			if (input.status !== undefined) {
				filtered = filtered.filter((s) => s.status === input.status);
			}
			if (input.courseId !== undefined) {
				filtered = filtered.filter((s) => s.courseId === input.courseId);
			}

			filtered.sort(
				(a, b) => b.scheduledStartsAt.getTime() - a.scheduledStartsAt.getTime(),
			);

			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const sessions = filtered
				.slice(start, start + input.pageSize)
				.map((s) => ({ ...s }));

			return await errorResult.ok({
				sessions,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// Learning Assignment methods
		async getLearningAssignmentById(input: {
			organizationId: string;
			assignmentId: HumanResourcesLearningAssignmentId;
		}): Promise<Result<LearningAssignment | null>> {
			const assignment = state.learningAssignments.get(input.assignmentId);
			if (!assignment || assignment.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...assignment });
		},

		async findLearningAssignmentByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentLearningAssignmentRecord | null>> {
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.assignmentIdempotencyByKey.get(key);
			if (!record) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({
				...record,
				assignment: { ...record.assignment },
			});
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async createLearningAssignment(
			record: LearningAssignmentCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<LearningAssignment>> {
			const employee = core.employees.get(record.employeeId);
			if (!employee || employee.organizationId !== record.organizationId) {
				return notFound(
					"Employee not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const course = state.courses.get(record.courseId);
			if (!course || course.organizationId !== record.organizationId) {
				return notFound(
					"Course not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const activeGuard = assertCourseActive(course.status);
			if (!activeGuard.ok) {
				return activeGuard;
			}
			const existingActiveAssignment = Array.from(
				state.learningAssignments.values(),
			).find(
				(assignmentValue) =>
					assignmentValue.organizationId === record.organizationId &&
					assignmentValue.employeeId === record.employeeId &&
					assignmentValue.courseId === record.courseId &&
					(assignmentValue.status === "pending" ||
						assignmentValue.status === "in_progress"),
			);
			if (existingActiveAssignment) {
				return conflict(
					"Employee already has an active assignment for this course",
				);
			}

			if (record.sessionId !== null) {
				const session = state.sessions.get(record.sessionId);
				if (!session || session.organizationId !== record.organizationId) {
					return notFound(
						"Session not found",
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					);
				}
				if (session.courseId !== record.courseId) {
					return conflict("Session does not belong to the specified course");
				}
				if (!isSessionActive(session.status)) {
					return conflict("Session is not active for enrollment");
				}
			}

			const idResult = parseHumanResourcesLearningAssignmentId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const assignment: LearningAssignment = {
				id: idResult.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				courseId: record.courseId,
				sessionId: record.sessionId,
				assignedBy: record.assignedBy,
				assignedAt: record.assignedAt,
				dueOn: record.dueOn,
				status: "pending",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.learningAssignments.set(assignment.id, assignment);

			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			state.assignmentIdempotencyByKey.set(idempotencyKey, {
				assignment: { ...assignment },
				createIdempotencyKey: record.createIdempotencyKey,
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const audit = await ports.audit.record({
				organizationId: assignment.organizationId,
				actorUserId: assignment.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_learning_assignment",
				entityId: assignment.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.learningAssignments.delete(assignment.id);
				state.assignmentIdempotencyByKey.delete(idempotencyKey);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: assignment.organizationId,
				actorUserId: assignment.createdBy,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_LEARNING_ASSIGNMENT_CREATED_EVENT,
				payload: {
					organizationId: assignment.organizationId,
					entityType: "hr_learning_assignment",
					entityId: assignment.id,
					actorId: assignment.createdBy,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.learningAssignments.delete(assignment.id);
				state.assignmentIdempotencyByKey.delete(idempotencyKey);
				return outbox;
			}

			return errorResult.ok({ ...assignment });
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async enrollLearningAssignment(
			input: {
				organizationId: string;
				assignmentId: HumanResourcesLearningAssignmentId;
				sessionId?: HumanResourcesSessionId | undefined;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<LearningAssignment>> {
			const assignment = state.learningAssignments.get(input.assignmentId);
			if (!assignment || assignment.organizationId !== input.organizationId) {
				return notFound("Assignment not found");
			}

			const versionCheck = assertExpectedVersion(
				assignment.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const course = state.courses.get(assignment.courseId);
			if (!course) {
				return notFound("Course not found");
			}

			const sessionId = input.sessionId ?? assignment.sessionId;
			let sessionStatus: SessionStatus | null = null;
			let maxParticipants: number | null = null;
			let enrolledCount = 0;

			if (sessionId !== null) {
				const session = state.sessions.get(sessionId);
				if (!session) {
					return notFound("Session not found");
				}
				if (session.courseId !== assignment.courseId) {
					return conflict("Session does not belong to the assignment course");
				}
				sessionStatus = session.status;
				maxParticipants = session.capacity;
				const countResult = await this.countEnrolledInSession({
					organizationId: input.organizationId,
					sessionId,
				});
				if (!countResult.ok) {
					return countResult;
				}
				enrolledCount = countResult.data;
			}

			const enrollableGuard = assertAssignmentEnrollable({
				assignmentStatus: assignment.status,
				courseStatus: course.status,
				sessionStatus,
				maxParticipants,
				enrolledCount,
			});
			if (!enrollableGuard.ok) {
				return enrollableGuard;
			}

			const now = new Date();
			const updated: LearningAssignment = {
				...assignment,
				sessionId,
				status: "in_progress",
				version: assignment.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.learningAssignments.set(input.assignmentId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_learning_assignment",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.learningAssignments.set(input.assignmentId, assignment);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async waiveLearningAssignment(
			input: {
				organizationId: string;
				assignmentId: HumanResourcesLearningAssignmentId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<LearningAssignment>> {
			const assignment = state.learningAssignments.get(input.assignmentId);
			if (!assignment || assignment.organizationId !== input.organizationId) {
				return notFound("Assignment not found");
			}

			const versionCheck = assertExpectedVersion(
				assignment.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const waivableGuard = assertAssignmentWaivable(assignment.status);
			if (!waivableGuard.ok) {
				return waivableGuard;
			}

			const now = new Date();
			const updated: LearningAssignment = {
				...assignment,
				status: "withdrawn",
				version: assignment.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.learningAssignments.set(input.assignmentId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_learning_assignment",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.learningAssignments.set(input.assignmentId, assignment);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async listLearningAssignments(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: AssignmentStatus | undefined;
			employeeId?: HumanResourcesEmployeeId | undefined;
			courseId?: HumanResourcesCourseId | undefined;
		}): Promise<Result<LearningAssignmentListPage>> {
			let filtered = Array.from(state.learningAssignments.values()).filter(
				(a) => a.organizationId === input.organizationId,
			);

			if (input.status !== undefined) {
				filtered = filtered.filter((a) => a.status === input.status);
			}
			if (input.employeeId !== undefined) {
				filtered = filtered.filter((a) => a.employeeId === input.employeeId);
			}
			if (input.courseId !== undefined) {
				filtered = filtered.filter((a) => a.courseId === input.courseId);
			}

			filtered.sort((a, b) => b.assignedAt.getTime() - a.assignedAt.getTime());

			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const assignments = filtered
				.slice(start, start + input.pageSize)
				.map((a) => ({ ...a }));

			return await errorResult.ok({
				assignments,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// Learning Completion methods
		async getCompletionById(input: {
			organizationId: string;
			completionId: HumanResourcesCompletionId;
		}): Promise<Result<LearningCompletion | null>> {
			const completion = state.completions.get(input.completionId);
			if (!completion || completion.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...completion });
		},

		async findCompletionByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentCompletionRecord | null>> {
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.completionIdempotencyByKey.get(key);
			if (!record) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({
				...record,
				completion: { ...record.completion },
			});
		},

		async findCompletionByAssignmentId(input: {
			organizationId: string;
			assignmentId: HumanResourcesLearningAssignmentId;
		}): Promise<Result<LearningCompletion | null>> {
			const completionId = state.completionByAssignmentId.get(
				input.assignmentId,
			);
			if (!completionId) {
				return await errorResult.ok(null);
			}
			const completion = state.completions.get(
				completionId as HumanResourcesCompletionId,
			);
			if (!completion || completion.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...completion });
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async recordCompletion(
			record: CompletionCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<LearningCompletion>> {
			const assignment = state.learningAssignments.get(record.assignmentId);
			if (!assignment || assignment.organizationId !== record.organizationId) {
				return notFound(
					"Assignment not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			if (
				assignment.employeeId !== record.employeeId ||
				assignment.courseId !== record.courseId
			) {
				return notFound(
					"Completion references do not match the assignment",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const existingCompletionId = state.completionByAssignmentId.get(
				record.assignmentId,
			);
			const duplicateCheck = assertNoDuplicateCompletion({
				hasExistingCompletion: existingCompletionId !== undefined,
			});
			if (!duplicateCheck.ok) {
				return duplicateCheck;
			}

			const course = state.courses.get(assignment.courseId);
			if (!course) {
				return notFound("Course not found");
			}

			let sessionStatus: SessionStatus | null = null;
			if (assignment.sessionId !== null) {
				const session = state.sessions.get(assignment.sessionId);
				if (!session) {
					return notFound("Session not found");
				}
				sessionStatus = session.status;
			}

			const recordableGuard = assertCompletionRecordable({
				assignmentStatus: assignment.status,
				sessionStatus,
				completedAt: record.completedAt,
			});
			if (!recordableGuard.ok) {
				return recordableGuard;
			}

			const idResult = parseHumanResourcesCompletionId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const completion: LearningCompletion = {
				id: idResult.data,
				organizationId: record.organizationId,
				assignmentId: record.assignmentId,
				employeeId: record.employeeId,
				courseId: record.courseId,
				sessionId: record.sessionId,
				completedAt: record.completedAt,
				outcome: record.outcome,
				assessorUserId: record.assessorUserId,
				notes: record.notes,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.completions.set(completion.id, completion);
			state.completionByAssignmentId.set(record.assignmentId, completion.id);

			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			state.completionIdempotencyByKey.set(idempotencyKey, {
				completion: { ...completion },
				createIdempotencyKey: record.createIdempotencyKey,
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const audit = await ports.audit.record({
				organizationId: completion.organizationId,
				actorUserId: completion.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_learning_completion",
				entityId: completion.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.completions.delete(completion.id);
				state.completionByAssignmentId.delete(record.assignmentId);
				state.completionIdempotencyByKey.delete(idempotencyKey);
				return audit;
			}

			const completedAssignment: LearningAssignment = {
				...assignment,
				status: "completed",
				version: assignment.version + 1,
				updatedBy: record.createdBy,
				updatedAt: now,
			};
			state.learningAssignments.set(assignment.id, completedAssignment);

			const outbox = await ports.outbox.append({
				organizationId: completion.organizationId,
				actorUserId: completion.createdBy,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_LEARNING_COMPLETION_RECORDED_EVENT,
				payload: {
					organizationId: completion.organizationId,
					entityType: "hr_learning_completion",
					entityId: completion.id,
					actorId: completion.createdBy,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.completions.delete(completion.id);
				state.completionByAssignmentId.delete(record.assignmentId);
				state.completionIdempotencyByKey.delete(idempotencyKey);
				state.learningAssignments.set(assignment.id, assignment);
				return outbox;
			}

			return errorResult.ok({ ...completion });
		},

		async listCompletions(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			employeeId?: HumanResourcesEmployeeId | undefined;
			courseId?: HumanResourcesCourseId | undefined;
		}): Promise<Result<CompletionListPage>> {
			let filtered = Array.from(state.completions.values()).filter(
				(c) => c.organizationId === input.organizationId,
			);

			if (input.employeeId !== undefined) {
				filtered = filtered.filter((c) => c.employeeId === input.employeeId);
			}
			if (input.courseId !== undefined) {
				filtered = filtered.filter((c) => c.courseId === input.courseId);
			}

			filtered.sort(
				(a, b) => b.completedAt.getTime() - a.completedAt.getTime(),
			);

			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const completions = filtered
				.slice(start, start + input.pageSize)
				.map((c) => ({ ...c }));

			return await errorResult.ok({
				completions,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		async getLearningAttendanceById(input: {
			organizationId: string;
			attendanceId: HumanResourcesLearningAttendanceId;
		}): Promise<Result<LearningAttendance | null>> {
			const attendance = state.learningAttendance.get(input.attendanceId);
			if (!attendance || attendance.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...attendance });
		},

		async findLearningAttendanceByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentLearningAttendanceRecord | null>> {
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.attendanceIdempotencyByKey.get(key);
			if (!record) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({
				...record,
				attendance: { ...record.attendance },
			});
		},

		async findLearningAttendanceByAssignmentAndSession(input: {
			organizationId: string;
			assignmentId: HumanResourcesLearningAssignmentId;
			sessionId: HumanResourcesSessionId;
		}): Promise<Result<LearningAttendance | null>> {
			const attendanceId = state.attendanceByAssignmentSession.get(
				attendanceAssignmentSessionKey(input.assignmentId, input.sessionId),
			);
			if (!attendanceId) {
				return await errorResult.ok(null);
			}
			const attendance = state.learningAttendance.get(attendanceId);
			if (!attendance || attendance.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...attendance });
		},

		async recordLearningAttendance(
			record: LearningAttendanceCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<LearningAttendance>> {
			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			const existing = state.attendanceIdempotencyByKey.get(idempotencyKey);
			const replay = resolveLearningAttendanceReplay(
				existing,
				record.createRequestFingerprint,
			);
			if (!replay.ok) {
				return replay;
			}
			if (replay.data !== null) {
				return errorResult.ok(replay.data);
			}

			const context = resolveLearningAttendanceContext(state, record);
			if (!context.ok) {
				return context;
			}

			const recordableGuard = assertLearningAttendanceRecordable({
				sessionStatus: context.data.session.status,
				assignmentStatus: context.data.assignment.status,
				assignmentSessionId: context.data.assignment.sessionId,
				requestedSessionId: record.sessionId,
			});
			if (!recordableGuard.ok) {
				return recordableGuard;
			}

			const duplicateKey = attendanceAssignmentSessionKey(
				record.assignmentId,
				record.sessionId,
			);
			const duplicateCheck = assertNoDuplicateLearningAttendance({
				hasExistingAttendance:
					state.attendanceByAssignmentSession.has(duplicateKey),
			});
			if (!duplicateCheck.ok) {
				return duplicateCheck;
			}

			const idResult = parseHumanResourcesLearningAttendanceId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const attendance: LearningAttendance = {
				id: idResult.data,
				organizationId: record.organizationId,
				sessionId: record.sessionId,
				assignmentId: record.assignmentId,
				employeeId: record.employeeId,
				status: record.status,
				recordedAt: record.recordedAt,
				recordedBy: record.recordedBy,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.learningAttendance.set(attendance.id, attendance);
			state.attendanceByAssignmentSession.set(duplicateKey, attendance.id);
			state.attendanceIdempotencyByKey.set(idempotencyKey, {
				attendance: { ...attendance },
				createIdempotencyKey: record.createIdempotencyKey,
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const audit = await ports.audit.record({
				organizationId: attendance.organizationId,
				actorUserId: attendance.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_learning_attendance",
				entityId: attendance.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.learningAttendance.delete(attendance.id);
				state.attendanceByAssignmentSession.delete(duplicateKey);
				state.attendanceIdempotencyByKey.delete(idempotencyKey);
				return audit;
			}

			return errorResult.ok({ ...attendance });
		},

		async listLearningAttendance(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			sessionId?: HumanResourcesSessionId | undefined;
			employeeId?: HumanResourcesEmployeeId | undefined;
		}): Promise<Result<LearningAttendanceListPage>> {
			let filtered = Array.from(state.learningAttendance.values()).filter(
				(a) => a.organizationId === input.organizationId,
			);

			if (input.sessionId !== undefined) {
				filtered = filtered.filter((a) => a.sessionId === input.sessionId);
			}
			if (input.employeeId !== undefined) {
				filtered = filtered.filter((a) => a.employeeId === input.employeeId);
			}

			filtered.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());

			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const attendance = filtered
				.slice(start, start + input.pageSize)
				.map((a) => ({ ...a }));

			return await errorResult.ok({
				attendanceRecords: attendance,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// Employee Certification methods
		async getCertificationById(input: {
			organizationId: string;
			certificationId: HumanResourcesCertificationId;
		}): Promise<Result<EmployeeCertification | null>> {
			const certification = state.certifications.get(input.certificationId);
			if (
				!certification ||
				certification.organizationId !== input.organizationId
			) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...certification });
		},

		async findCertificationByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentCertificationRecord | null>> {
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.certificationIdempotencyByKey.get(key);
			if (!record) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({
				...record,
				certification: { ...record.certification },
			});
		},

		async issueCertification(
			record: {
				organizationId: string;
				employeeId: HumanResourcesEmployeeId;
				courseId: HumanResourcesCourseId;
				completionId: HumanResourcesCompletionId;
				certificationCode: string;
				issuedOn: string;
				expiresOn: string | null;
				createIdempotencyKey: string;
				createRequestFingerprint: string;
				createdBy: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<EmployeeCertification>> {
			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			const existing = state.certificationIdempotencyByKey.get(idempotencyKey);
			if (existing) {
				if (
					existing.createRequestFingerprint !== record.createRequestFingerprint
				) {
					return conflict("Idempotency key reused with different payload");
				}
				return errorResult.ok({ ...existing.certification });
			}

			const employee = core.employees.get(record.employeeId);
			if (!employee || employee.organizationId !== record.organizationId) {
				return notFound(
					"Employee not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const course = state.courses.get(record.courseId);
			if (!course || course.organizationId !== record.organizationId) {
				return notFound(
					"Course not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const completion = state.completions.get(record.completionId);
			if (!completion || completion.organizationId !== record.organizationId) {
				return notFound(
					"Completion not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const todayDate = new Date().toISOString().slice(0, 10);
			const issuableGuard = assertCertificationIssuable({
				hasRequiredCompletion: completion.courseId === record.courseId,
				issuedOn: record.issuedOn,
				expiresOn: record.expiresOn,
				todayDate,
			});
			if (!issuableGuard.ok) {
				return issuableGuard;
			}

			const idResult = parseHumanResourcesCertificationId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const certification: EmployeeCertification = {
				id: idResult.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				courseId: record.courseId,
				completionId: record.completionId,
				certificationCode: record.certificationCode,
				issuedOn: record.issuedOn,
				expiresOn: record.expiresOn,
				status: "active",
				renewedFromCertificationId: null,
				revokedAt: null,
				revokedBy: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.certifications.set(certification.id, certification);

			state.certificationIdempotencyByKey.set(idempotencyKey, {
				certification: { ...certification },
				createIdempotencyKey: record.createIdempotencyKey,
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const audit = await ports.audit.record(
				buildCreateAuditFact({
					context: {
						organizationId: certification.organizationId,
						actorUserId: certification.createdBy,
						entity: "hr_employee_certification",
						entityId: certification.id,
						meta,
					},
					newValue: {
						id: certification.id,
						status: certification.status,
						certificationCode: certification.certificationCode,
					},
				}),
			);
			if (!audit.ok) {
				state.certifications.delete(certification.id);
				state.certificationIdempotencyByKey.delete(idempotencyKey);
				return audit;
			}

			return errorResult.ok({ ...certification });
		},

		async revokeCertification(
			input: {
				organizationId: string;
				certificationId: HumanResourcesCertificationId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<EmployeeCertification>> {
			const certification = state.certifications.get(input.certificationId);
			if (
				!certification ||
				certification.organizationId !== input.organizationId
			) {
				return notFound("Certification not found");
			}

			const versionCheck = assertExpectedVersion(
				certification.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const revokeGuard = assertCertificationCanRevoke(certification.status);
			if (!revokeGuard.ok) {
				return revokeGuard;
			}

			const now = new Date();
			const updated: EmployeeCertification = {
				...certification,
				status: "revoked",
				revokedAt: now,
				revokedBy: input.actorUserId,
				version: certification.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.certifications.set(input.certificationId, updated);

			const audit = await ports.audit.record(
				buildStatusTransitionAuditFact({
					context: {
						organizationId: updated.organizationId,
						actorUserId: input.actorUserId,
						entity: "hr_employee_certification",
						entityId: updated.id,
						meta,
					},
					oldStatus: certification.status,
					newStatus: updated.status,
					oldValue: {
						status: certification.status,
						version: certification.version,
					},
					newValue: { status: updated.status, version: updated.version },
				}),
			);
			if (!audit.ok) {
				state.certifications.set(input.certificationId, certification);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async expireCertification(
			input: {
				organizationId: string;
				certificationId: HumanResourcesCertificationId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<EmployeeCertification>> {
			const certification = state.certifications.get(input.certificationId);
			if (
				!certification ||
				certification.organizationId !== input.organizationId
			) {
				return notFound("Certification not found");
			}

			const versionCheck = assertExpectedVersion(
				certification.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const expireGuard = assertCertificationCanExpire(certification.status);
			if (!expireGuard.ok) {
				return expireGuard;
			}

			const now = new Date();
			const updated: EmployeeCertification = {
				...certification,
				status: "expired",
				version: certification.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.certifications.set(input.certificationId, updated);

			const audit = await ports.audit.record(
				buildStatusTransitionAuditFact({
					context: {
						organizationId: updated.organizationId,
						actorUserId: input.actorUserId,
						entity: "hr_employee_certification",
						entityId: updated.id,
						meta,
					},
					oldStatus: certification.status,
					newStatus: updated.status,
					oldValue: {
						status: certification.status,
						version: certification.version,
					},
					newValue: { status: updated.status, version: updated.version },
				}),
			);
			if (!audit.ok) {
				state.certifications.set(input.certificationId, certification);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_CERTIFICATION_EXPIRING_EVENT,
				payload: {
					organizationId: updated.organizationId,
					entityType: "hr_employee_certification",
					entityId: updated.id,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.certifications.set(input.certificationId, certification);
				return outbox;
			}

			return errorResult.ok({ ...updated });
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async renewCertification(
			record: {
				organizationId: string;
				certificationId: HumanResourcesCertificationId;
				employeeId: HumanResourcesEmployeeId;
				courseId: HumanResourcesCourseId;
				completionId: HumanResourcesCompletionId;
				certificationCode: string;
				issuedOn: string;
				expiresOn: string | null;
				createIdempotencyKey: string;
				createRequestFingerprint: string;
				expectedVersion: number;
				createdBy: string;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<EmployeeCertification>> {
			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			const existing = state.certificationIdempotencyByKey.get(idempotencyKey);
			if (existing) {
				if (
					existing.createRequestFingerprint !== record.createRequestFingerprint
				) {
					return conflict("Idempotency key reused with different payload");
				}
				return errorResult.ok({ ...existing.certification });
			}

			const prior = state.certifications.get(record.certificationId);
			if (!prior || prior.organizationId !== record.organizationId) {
				return notFound(
					"Certification not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const versionCheck = assertExpectedVersion(
				prior.version,
				record.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const completion = state.completions.get(record.completionId);
			if (!completion || completion.organizationId !== record.organizationId) {
				return notFound(
					"Completion not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const renewableGuard = assertCertificationRenewable({
				status: prior.status,
				employeeId: record.employeeId,
				courseId: record.courseId,
				completionEmployeeId: completion.employeeId,
				completionCourseId: completion.courseId,
				completionOutcome: completion.outcome,
			});
			if (!renewableGuard.ok) {
				return renewableGuard;
			}

			const todayDate = new Date().toISOString().slice(0, 10);
			const issuableGuard = assertCertificationIssuable({
				hasRequiredCompletion: completion.courseId === record.courseId,
				issuedOn: record.issuedOn,
				expiresOn: record.expiresOn,
				todayDate,
			});
			if (!issuableGuard.ok) {
				return issuableGuard;
			}

			const idResult = parseHumanResourcesCertificationId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const certification: EmployeeCertification = {
				id: idResult.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				courseId: record.courseId,
				completionId: record.completionId,
				certificationCode: record.certificationCode,
				issuedOn: record.issuedOn,
				expiresOn: record.expiresOn,
				status: "active",
				renewedFromCertificationId: record.certificationId,
				revokedAt: null,
				revokedBy: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.certifications.set(certification.id, certification);
			state.certificationIdempotencyByKey.set(idempotencyKey, {
				certification: { ...certification },
				createIdempotencyKey: record.createIdempotencyKey,
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const audit = await ports.audit.record(
				buildCreateAuditFact({
					context: {
						organizationId: certification.organizationId,
						actorUserId: certification.createdBy,
						entity: "hr_employee_certification",
						entityId: certification.id,
						meta,
					},
					newValue: {
						id: certification.id,
						status: certification.status,
						certificationCode: certification.certificationCode,
						renewedFromCertificationId:
							certification.renewedFromCertificationId,
					},
				}),
			);
			if (!audit.ok) {
				state.certifications.delete(certification.id);
				state.certificationIdempotencyByKey.delete(idempotencyKey);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: certification.organizationId,
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_CERTIFICATION_RENEWED_EVENT,
				payload: {
					organizationId: certification.organizationId,
					entityType: "hr_employee_certification",
					entityId: certification.id,
					actorId: record.actorUserId,
					correlationId: meta.correlationId,
					renewedFromCertificationId: record.certificationId,
				},
			});
			if (!outbox.ok) {
				state.certifications.delete(certification.id);
				state.certificationIdempotencyByKey.delete(idempotencyKey);
				return outbox;
			}

			return errorResult.ok({ ...certification });
		},

		async listCertifications(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: CertificationStatus | undefined;
			employeeId?: HumanResourcesEmployeeId | undefined;
			courseId?: HumanResourcesCourseId | undefined;
		}): Promise<Result<CertificationListPage>> {
			let filtered = Array.from(state.certifications.values()).filter(
				(c) => c.organizationId === input.organizationId,
			);

			if (input.status !== undefined) {
				filtered = filtered.filter((c) => c.status === input.status);
			}
			if (input.employeeId !== undefined) {
				filtered = filtered.filter((c) => c.employeeId === input.employeeId);
			}
			if (input.courseId !== undefined) {
				filtered = filtered.filter((c) => c.courseId === input.courseId);
			}

			filtered.sort((a, b) => b.issuedOn.localeCompare(a.issuedOn));

			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const certifications = filtered
				.slice(start, start + input.pageSize)
				.map((c) => ({ ...c }));

			return await errorResult.ok({
				certifications,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		async listExpiringCertifications(input: {
			organizationId: string;
			asOf: string;
			withinDays: number;
			page: number;
			pageSize: number;
		}): Promise<Result<CertificationListPage>> {
			const windowEndDate = new Date(`${input.asOf}T00:00:00.000Z`);
			windowEndDate.setUTCDate(windowEndDate.getUTCDate() + input.withinDays);
			const windowEnd = windowEndDate.toISOString().slice(0, 10);

			const filtered = Array.from(state.certifications.values())
				.filter(
					(certification) =>
						certification.organizationId === input.organizationId &&
						certification.status === "active" &&
						certification.expiresOn !== null &&
						certification.expiresOn >= input.asOf &&
						certification.expiresOn <= windowEnd,
				)
				.sort((a, b) => {
					const expiresCompare = (a.expiresOn ?? "").localeCompare(
						b.expiresOn ?? "",
					);
					if (expiresCompare !== 0) {
						return expiresCompare;
					}
					return a.id.localeCompare(b.id);
				});

			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const certifications = filtered
				.slice(start, start + input.pageSize)
				.map((certification) => ({ ...certification }));

			return await errorResult.ok({
				certifications,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},
	};
}
