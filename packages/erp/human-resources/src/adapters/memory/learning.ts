import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_LEARNING_ASSIGNMENT_CREATED_EVENT,
	HUMAN_RESOURCES_LEARNING_COMPLETION_RECORDED_EVENT,
} from "@afenda/events/schemas";

import {
	type HumanResourcesCertificationId,
	type HumanResourcesCompletionId,
	type HumanResourcesCourseId,
	type HumanResourcesEmployeeId,
	type HumanResourcesLearningAssignmentId,
	type HumanResourcesSessionId,
	parseHumanResourcesCertificationId,
	parseHumanResourcesCompletionId,
	parseHumanResourcesCourseId,
	parseHumanResourcesLearningAssignmentId,
	parseHumanResourcesSessionId,
} from "../../brands";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	humanResourcesErrorDetails,
} from "../../error-codes";
import type { MutationPorts } from "../../ports";
import { assertExpectedVersion } from "../../shared/concurrency";
import { conflict, notFound } from "../../shared/domain-guards";
import {
	assertAssignmentEnrollable,
	assertAssignmentWaivable,
	assertCertificationCanExpire,
	assertCertificationCanRevoke,
	assertCertificationIssuable,
	assertCompletionRecordable,
	assertCourseActive,
	assertCourseCanArchive,
	assertNoDuplicateCompletion,
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
import type {
	CompletionCreateRecord,
	CourseCreateRecord,
	HumanResourcesStore,
	IdempotentCertificationRecord,
	IdempotentCompletionRecord,
	IdempotentCourseRecord,
	IdempotentLearningAssignmentRecord,
	IdempotentSessionRecord,
	LearningAssignmentCreateRecord,
	SessionCreateRecord,
} from "../../store";
import type {
	CertificationListPage,
	CompletionListPage,
	CourseListPage,
	EmployeeCertification,
	LearningAssignment,
	LearningAssignmentListPage,
	LearningCompletion,
	LearningCourse,
	LearningSession,
	SessionListPage,
} from "../../types";
import type { CoreMemoryState } from "./core";
import { idempotencyMapKey } from "./shared";

export type LearningMemoryState = {
	courses: Map<HumanResourcesCourseId, LearningCourse>;
	courseIdempotencyByKey: Map<string, IdempotentCourseRecord>;
	sessions: Map<HumanResourcesSessionId, LearningSession>;
	sessionIdempotencyByKey: Map<string, IdempotentSessionRecord>;
	learningAssignments: Map<
		HumanResourcesLearningAssignmentId,
		LearningAssignment
	>;
	assignmentIdempotencyByKey: Map<string, IdempotentLearningAssignmentRecord>;
	completions: Map<HumanResourcesCompletionId, LearningCompletion>;
	completionByAssignmentId: Map<string, string>;
	completionIdempotencyByKey: Map<string, IdempotentCompletionRecord>;
	certifications: Map<HumanResourcesCertificationId, EmployeeCertification>;
	certificationIdempotencyByKey: Map<string, IdempotentCertificationRecord>;
};

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
	| "getCertificationById"
	| "findCertificationByIdempotencyKey"
	| "issueCertification"
	| "revokeCertification"
	| "expireCertification"
	| "listCertifications"
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
			return ok(count);
		},

		async getCourseById(input: {
			organizationId: string;
			courseId: HumanResourcesCourseId;
		}): Promise<Result<LearningCourse | null>> {
			const course = state.courses.get(input.courseId);
			if (!course || course.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...course });
		},

		async findCourseByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentCourseRecord | null>> {
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.courseIdempotencyByKey.get(key);
			if (!record) {
				return ok(null);
			}
			return ok({ ...record, course: { ...record.course } });
		},

		async createCourse(
			record: CourseCreateRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<LearningCourse>> {
			const existing = Array.from(state.courses.values()).find(
				(c) =>
					c.organizationId === record.organizationId && c.code === record.code,
			);
			if (existing) {
				return fail(
					"CONFLICT",
					"Course with this code already exists",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
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

			return ok({ ...course });
		},

		async updateCourse(
			input: {
				organizationId: string;
				courseId: HumanResourcesCourseId;
				title?: string;
				description?: string | null;
				durationHours?: string | null;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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
					input.description !== undefined
						? input.description
						: course.description,
				durationHours:
					input.durationHours !== undefined
						? input.durationHours
						: course.durationHours,
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

			return ok({ ...updated });
		},

		async activateCourse(
			input: {
				organizationId: string;
				courseId: HumanResourcesCourseId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			if (course.status === "active") {
				return conflict("Course is already active");
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

			return ok({ ...updated });
		},

		async archiveCourse(
			input: {
				organizationId: string;
				courseId: HumanResourcesCourseId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			return ok({ ...updated });
		},

		async listCourses(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: CourseStatus;
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

			return ok({
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
				return ok(null);
			}
			return ok({ ...session });
		},

		async findSessionByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentSessionRecord | null>> {
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.sessionIdempotencyByKey.get(key);
			if (!record) {
				return ok(null);
			}
			return ok({ ...record, session: { ...record.session } });
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
			return ok(count);
		},

		async createSession(
			record: SessionCreateRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
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
				(session) =>
					session.organizationId === record.organizationId &&
					session.code === record.code,
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

			return ok({ ...session });
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
			meta: { correlationId: string },
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

			return ok({ ...updated });
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
			meta: { correlationId: string },
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

			return ok({ ...updated });
		},

		async cancelSession(
			input: {
				organizationId: string;
				sessionId: HumanResourcesSessionId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			return ok({ ...updated });
		},

		async listSessions(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: SessionStatus;
			courseId?: HumanResourcesCourseId;
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

			return ok({
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
				return ok(null);
			}
			return ok({ ...assignment });
		},

		async findLearningAssignmentByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentLearningAssignmentRecord | null>> {
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.assignmentIdempotencyByKey.get(key);
			if (!record) {
				return ok(null);
			}
			return ok({ ...record, assignment: { ...record.assignment } });
		},

		async createLearningAssignment(
			record: LearningAssignmentCreateRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
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
				(assignment) =>
					assignment.organizationId === record.organizationId &&
					assignment.employeeId === record.employeeId &&
					assignment.courseId === record.courseId &&
					(assignment.status === "pending" ||
						assignment.status === "in_progress"),
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

			return ok({ ...assignment });
		},

		async enrollLearningAssignment(
			input: {
				organizationId: string;
				assignmentId: HumanResourcesLearningAssignmentId;
				sessionId?: HumanResourcesSessionId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			return ok({ ...updated });
		},

		async waiveLearningAssignment(
			input: {
				organizationId: string;
				assignmentId: HumanResourcesLearningAssignmentId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			return ok({ ...updated });
		},

		async listLearningAssignments(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: AssignmentStatus;
			employeeId?: HumanResourcesEmployeeId;
			courseId?: HumanResourcesCourseId;
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

			return ok({
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
				return ok(null);
			}
			return ok({ ...completion });
		},

		async findCompletionByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentCompletionRecord | null>> {
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.completionIdempotencyByKey.get(key);
			if (!record) {
				return ok(null);
			}
			return ok({ ...record, completion: { ...record.completion } });
		},

		async findCompletionByAssignmentId(input: {
			organizationId: string;
			assignmentId: HumanResourcesLearningAssignmentId;
		}): Promise<Result<LearningCompletion | null>> {
			const completionId = state.completionByAssignmentId.get(
				input.assignmentId,
			);
			if (!completionId) {
				return ok(null);
			}
			const completion = state.completions.get(
				completionId as HumanResourcesCompletionId,
			);
			if (!completion || completion.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...completion });
		},

		async recordCompletion(
			record: CompletionCreateRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
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

			return ok({ ...completion });
		},

		async listCompletions(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			employeeId?: HumanResourcesEmployeeId;
			courseId?: HumanResourcesCourseId;
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

			return ok({
				completions,
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
				return ok(null);
			}
			return ok({ ...certification });
		},

		async findCertificationByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentCertificationRecord | null>> {
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.certificationIdempotencyByKey.get(key);
			if (!record) {
				return ok(null);
			}
			return ok({ ...record, certification: { ...record.certification } });
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
			meta: { correlationId: string },
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
				return ok({ ...existing.certification });
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

			const audit = await ports.audit.record({
				organizationId: certification.organizationId,
				actorUserId: certification.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_employee_certification",
				entityId: certification.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.certifications.delete(certification.id);
				state.certificationIdempotencyByKey.delete(idempotencyKey);
				return audit;
			}

			return ok({ ...certification });
		},

		async revokeCertification(
			input: {
				organizationId: string;
				certificationId: HumanResourcesCertificationId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_employee_certification",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.certifications.set(input.certificationId, certification);
				return audit;
			}

			return ok({ ...updated });
		},

		async expireCertification(
			input: {
				organizationId: string;
				certificationId: HumanResourcesCertificationId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_employee_certification",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.certifications.set(input.certificationId, certification);
				return audit;
			}

			return ok({ ...updated });
		},

		async listCertifications(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: CertificationStatus;
			employeeId?: HumanResourcesEmployeeId;
			courseId?: HumanResourcesCourseId;
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

			return ok({
				certifications,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},
	};
}
