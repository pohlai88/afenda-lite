import { randomUUID } from "node:crypto";

import {
	and,
	db,
	desc,
	eq,
	hrEmployeeCertification,
	hrLearningAssignment,
	hrLearningCompletion,
	hrLearningCourse,
	hrLearningSession,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_LEARNING_ASSIGNMENT_CREATED_EVENT,
	HUMAN_RESOURCES_LEARNING_COMPLETION_RECORDED_EVENT,
} from "@afenda/events/schemas";

import {
	parseHumanResourcesCertificationId,
	parseHumanResourcesCompletionId,
	parseHumanResourcesCourseId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesLearningAssignmentId,
	parseHumanResourcesSessionId,
} from "../../brands";
import { HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE } from "../../error-codes";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	conflict,
	invalidState,
	missAfterOptimisticUpdate,
	notFound,
} from "../../shared/domain-guards";
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
	assertSessionSchedulable,
	assertSessionStatusTransition,
} from "../../shared/learning-guards";
import {
	assignmentStatusSchema,
	certificationStatusSchema,
	completionOutcomeSchema,
	courseStatusSchema,
	type SessionStatus,
	sessionStatusSchema,
} from "../../shared/learning-status";
import {
	isCreateIdempotencyUniqueViolation,
	isPostgresUniqueViolation,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import type { HumanResourcesStore } from "../../store";
import type {
	EmployeeCertification,
	LearningAssignment,
	LearningCompletion,
	LearningCourse,
	LearningSession,
} from "../../types";

type LearningHost = {
	getEmployeeById: HumanResourcesStore["getEmployeeById"];
	getCourseById: HumanResourcesStore["getCourseById"];
	getSessionById: HumanResourcesStore["getSessionById"];
	getLearningAssignmentById: HumanResourcesStore["getLearningAssignmentById"];
	getCompletionById: HumanResourcesStore["getCompletionById"];
	countActiveAssignmentsForCourse: HumanResourcesStore["countActiveAssignmentsForCourse"];
	countEnrolledInSession: HumanResourcesStore["countEnrolledInSession"];
	findCompletionByAssignmentId: HumanResourcesStore["findCompletionByAssignmentId"];
};

function eventPayloadJson(value: Record<string, unknown>): string {
	return JSON.stringify(value);
}

export type DrizzleLearningMethods = Pick<
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

function mapCourse(
	row: typeof hrLearningCourse.$inferSelect,
): Result<LearningCourse> {
	const id = parseHumanResourcesCourseId(row.id);
	if (!id.ok) return id;
	const status = courseStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid course status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		code: row.code,
		title: row.title,
		description: row.description,
		durationHours: row.durationHours,
		status: status.data,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapSession(
	row: typeof hrLearningSession.$inferSelect,
): Result<LearningSession> {
	const id = parseHumanResourcesSessionId(row.id);
	if (!id.ok) return id;
	const courseId = parseHumanResourcesCourseId(row.courseId);
	if (!courseId.ok) return courseId;
	const status = sessionStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid session status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		courseId: courseId.data,
		code: row.code,
		title: row.title,
		scheduledStartsAt: row.scheduledStartsAt,
		scheduledEndsAt: row.scheduledEndsAt,
		actualStartsAt: row.actualStartsAt,
		actualEndsAt: row.actualEndsAt,
		capacity: row.capacity,
		status: status.data,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapLearningAssignment(
	row: typeof hrLearningAssignment.$inferSelect,
): Result<LearningAssignment> {
	const id = parseHumanResourcesLearningAssignmentId(row.id);
	if (!id.ok) return id;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	const courseId = parseHumanResourcesCourseId(row.courseId);
	if (!courseId.ok) return courseId;
	let sessionId = null as LearningAssignment["sessionId"];
	if (row.sessionId !== null) {
		const parsed = parseHumanResourcesSessionId(row.sessionId);
		if (!parsed.ok) return parsed;
		sessionId = parsed.data;
	}
	const status = assignmentStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid learning assignment status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		courseId: courseId.data,
		sessionId,
		status: status.data,
		assignedBy: row.assignedBy,
		assignedAt: row.assignedAt,
		dueOn: row.dueOn,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapCompletion(
	row: typeof hrLearningCompletion.$inferSelect,
): Result<LearningCompletion> {
	const id = parseHumanResourcesCompletionId(row.id);
	if (!id.ok) return id;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	const courseId = parseHumanResourcesCourseId(row.courseId);
	if (!courseId.ok) return courseId;
	const assignmentId = parseHumanResourcesLearningAssignmentId(
		row.assignmentId,
	);
	if (!assignmentId.ok) return assignmentId;
	let sessionId = null as LearningCompletion["sessionId"];
	if (row.sessionId !== null) {
		const parsed = parseHumanResourcesSessionId(row.sessionId);
		if (!parsed.ok) return parsed;
		sessionId = parsed.data;
	}
	const outcome = completionOutcomeSchema.safeParse(row.outcome);
	if (!outcome.success) {
		return fail("INTERNAL_ERROR", "Invalid completion outcome");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		courseId: courseId.data,
		assignmentId: assignmentId.data,
		sessionId,
		completedAt: row.completedAt,
		outcome: outcome.data,
		assessorUserId: row.assessorUserId,
		notes: row.notes,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapCertification(
	row: typeof hrEmployeeCertification.$inferSelect,
): Result<EmployeeCertification> {
	const id = parseHumanResourcesCertificationId(row.id);
	if (!id.ok) return id;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	const courseId = parseHumanResourcesCourseId(row.courseId);
	if (!courseId.ok) return courseId;
	const completionId = parseHumanResourcesCompletionId(row.completionId);
	if (!completionId.ok) return completionId;
	const status = certificationStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid certification status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		courseId: courseId.data,
		completionId: completionId.data,
		certificationCode: row.certificationCode,
		issuedOn: row.issuedOn,
		expiresOn: row.expiresOn,
		status: status.data,
		revokedAt: row.revokedAt,
		revokedBy: row.revokedBy,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

type CourseSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	title: string;
	description: string | null;
	duration_hours: string | null;
	status: string;
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type SessionSqlRow = {
	id: string;
	organization_id: string;
	course_id: string;
	code: string;
	title: string;
	scheduled_starts_at: Date;
	scheduled_ends_at: Date;
	actual_starts_at: Date | null;
	actual_ends_at: Date | null;
	capacity: number | null;
	status: string;
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type LearningAssignmentSqlRow = {
	id: string;
	organization_id: string;
	employee_id: string;
	course_id: string;
	session_id: string | null;
	status: string;
	assigned_by: string;
	assigned_at: Date;
	due_on: string | null;
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type CompletionSqlRow = {
	id: string;
	organization_id: string;
	employee_id: string;
	course_id: string;
	assignment_id: string;
	session_id: string | null;
	completed_at: Date;
	outcome: string;
	assessor_user_id: string | null;
	notes: string | null;
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type CertificationSqlRow = {
	id: string;
	organization_id: string;
	employee_id: string;
	course_id: string;
	completion_id: string;
	certification_code: string;
	issued_on: string;
	expires_on: string | null;
	status: string;
	revoked_at: Date | null;
	revoked_by: string | null;
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapCourseSql(row: CourseSqlRow): Result<LearningCourse> {
	return mapCourse({
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		title: row.title,
		description: row.description,
		durationHours: row.duration_hours,
		status: row.status,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapSessionSql(row: SessionSqlRow): Result<LearningSession> {
	return mapSession({
		id: row.id,
		organizationId: row.organization_id,
		courseId: row.course_id,
		code: row.code,
		title: row.title,
		scheduledStartsAt: row.scheduled_starts_at,
		scheduledEndsAt: row.scheduled_ends_at,
		actualStartsAt: row.actual_starts_at,
		actualEndsAt: row.actual_ends_at,
		capacity: row.capacity,
		status: row.status,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapLearningAssignmentSql(
	row: LearningAssignmentSqlRow,
): Result<LearningAssignment> {
	return mapLearningAssignment({
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		courseId: row.course_id,
		sessionId: row.session_id,
		status: row.status,
		assignedBy: row.assigned_by,
		assignedAt: row.assigned_at,
		dueOn: row.due_on,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapCompletionSql(row: CompletionSqlRow): Result<LearningCompletion> {
	return mapCompletion({
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		courseId: row.course_id,
		assignmentId: row.assignment_id,
		sessionId: row.session_id,
		completedAt: row.completed_at,
		outcome: row.outcome,
		assessorUserId: row.assessor_user_id,
		notes: row.notes,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapCertificationSql(
	row: CertificationSqlRow,
): Result<EmployeeCertification> {
	return mapCertification({
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		courseId: row.course_id,
		completionId: row.completion_id,
		certificationCode: row.certification_code,
		issuedOn: row.issued_on,
		expiresOn: row.expires_on,
		status: row.status,
		revokedAt: row.revoked_at,
		revokedBy: row.revoked_by,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

export const drizzleLearningMethods: DrizzleLearningMethods &
	ThisType<LearningHost & DrizzleLearningMethods> = {
	async getCourseById(input) {
		try {
			const rows = await db
				.select()
				.from(hrLearningCourse)
				.where(
					and(
						eq(hrLearningCourse.organizationId, input.organizationId),
						eq(hrLearningCourse.id, input.courseId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapCourse(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load course");
		}
	},

	async findCourseByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrLearningCourse)
				.where(
					and(
						eq(hrLearningCourse.organizationId, input.organizationId),
						eq(hrLearningCourse.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const course = mapCourse(row);
			if (!course.ok) return course;
			if (
				row.createIdempotencyKey === null ||
				row.createRequestFingerprint === null
			) {
				return fail("INTERNAL_ERROR", "Course idempotency metadata is missing");
			}
			return ok({
				course: course.data,
				createIdempotencyKey: row.createIdempotencyKey,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find course by idempotency key",
			);
		}
	},

	async createCourse(record, _ports, meta) {
		const existing = await this.findCourseByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return ok(existing.data.course);
			}
			return conflict("Idempotency key already used with different data");
		}
		const id = randomUUID();
		const brandedId = parseHumanResourcesCourseId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[CourseSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							INSERT INTO hr_learning_course (
								id, organization_id, code, title, description, duration_hours,
								status, create_idempotency_key, create_request_fingerprint,
								version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${record.organizationId}, ${record.code},
								${record.title}, ${record.description}, ${record.durationHours},
								'active', ${record.createIdempotencyKey},
								${record.createRequestFingerprint}, 1, ${record.createdBy},
								${record.createdBy}
							WHERE NOT EXISTS (
								SELECT 1 FROM hr_learning_course existing
								WHERE existing.organization_id = ${record.organizationId}
									AND existing.code = ${record.code}
							)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_learning_course', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Course code already exists in organization");
			}
			return mapCourseSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findCourseByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.course);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			if (isPostgresUniqueViolation(error)) {
				return conflict("Course code already exists in organization");
			}
			return mapPersistenceFailure(error, "Failed to create course");
		}
	},

	async updateCourse(input, _ports, meta) {
		const existing = await this.getCourseById({
			organizationId: input.organizationId,
			courseId: input.courseId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Course not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const activeCheck = assertCourseActive(existing.data.status);
		if (!activeCheck.ok) return activeCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[CourseSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_learning_course
							SET title = ${input.title},
								description = ${input.description},
								duration_hours = ${input.durationHours},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.courseId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status IN ('active', 'archived')
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_learning_course', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Course",
				});
			}
			return mapCourseSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update course");
		}
	},

	async activateCourse(input, _ports, meta) {
		const existing = await this.getCourseById({
			organizationId: input.organizationId,
			courseId: input.courseId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Course not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		if (existing.data.status === "archived") {
			return invalidState("Cannot activate archived course");
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[CourseSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_learning_course
							SET status = 'active',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.courseId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status != 'archived'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_learning_course', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Course",
				});
			}
			return mapCourseSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to activate course");
		}
	},

	async archiveCourse(input, _ports, meta) {
		const existing = await this.getCourseById({
			organizationId: input.organizationId,
			courseId: input.courseId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Course not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const activeCount = await this.countActiveAssignmentsForCourse({
			organizationId: input.organizationId,
			courseId: input.courseId,
		});
		if (!activeCount.ok) return activeCount;

		const archiveCheck = assertCourseCanArchive({
			status: existing.data.status,
			hasActiveAssignments: activeCount.data > 0,
		});
		if (!archiveCheck.ok) return archiveCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[CourseSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH check_assignments AS (
							SELECT COUNT(*) AS active_count
							FROM hr_learning_assignment
							WHERE organization_id = ${input.organizationId}
								AND course_id = ${input.courseId}
								AND status IN ('pending', 'in_progress')
						),
						mutated AS (
							UPDATE hr_learning_course
							SET status = 'archived',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM check_assignments
							WHERE hr_learning_course.id = ${input.courseId}
								AND hr_learning_course.organization_id = ${input.organizationId}
								AND hr_learning_course.version = ${input.expectedVersion}
								AND hr_learning_course.status IN ('active', 'archived')
								AND check_assignments.active_count = 0
							RETURNING hr_learning_course.*
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_learning_course', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				const recheck = await this.countActiveAssignmentsForCourse({
					organizationId: input.organizationId,
					courseId: input.courseId,
				});
				if (!recheck.ok) return recheck;
				if (recheck.data > 0) {
					return invalidState("Cannot archive course with active assignments");
				}
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Course",
				});
			}
			return mapCourseSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to archive course");
		}
	},

	async listCourses(input) {
		try {
			let query = db
				.select()
				.from(hrLearningCourse)
				.where(eq(hrLearningCourse.organizationId, input.organizationId))
				.$dynamic();

			if (input.status !== undefined) {
				query = query.where(eq(hrLearningCourse.status, input.status));
			}

			const rows = await query.orderBy(hrLearningCourse.code);
			const totalCount = rows.length;
			const start = (input.page - 1) * input.pageSize;
			const paged = rows.slice(start, start + input.pageSize);

			const courses: LearningCourse[] = [];
			for (const row of paged) {
				const mapped = mapCourse(row);
				if (!mapped.ok) return mapped;
				courses.push(mapped.data);
			}

			return ok({
				courses,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list courses");
		}
	},

	async countActiveAssignmentsForCourse(input) {
		try {
			const rows = await db
				.select()
				.from(hrLearningAssignment)
				.where(
					and(
						eq(hrLearningAssignment.organizationId, input.organizationId),
						eq(hrLearningAssignment.courseId, input.courseId),
					),
				);
			const count = rows.filter(
				(a) => a.status === "pending" || a.status === "in_progress",
			).length;
			return ok(count);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to count active assignments");
		}
	},

	async getSessionById(input) {
		try {
			const rows = await db
				.select()
				.from(hrLearningSession)
				.where(
					and(
						eq(hrLearningSession.organizationId, input.organizationId),
						eq(hrLearningSession.id, input.sessionId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapSession(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load session");
		}
	},

	async findSessionByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrLearningSession)
				.where(
					and(
						eq(hrLearningSession.organizationId, input.organizationId),
						eq(hrLearningSession.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const session = mapSession(row);
			if (!session.ok) return session;
			if (
				row.createIdempotencyKey === null ||
				row.createRequestFingerprint === null
			) {
				return fail(
					"INTERNAL_ERROR",
					"Session idempotency metadata is missing",
				);
			}
			return ok({
				session: session.data,
				createIdempotencyKey: row.createIdempotencyKey,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find session by idempotency key",
			);
		}
	},

	async createSession(record, _ports, meta) {
		const existing = await this.findSessionByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return ok(existing.data.session);
			}
			return conflict("Idempotency key already used with different data");
		}
		const course = await this.getCourseById({
			organizationId: record.organizationId,
			courseId: record.courseId,
		});
		if (!course.ok) return course;
		if (course.data === null) {
			return notFound(
				"Course not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		if (course.data.status !== "active") {
			return invalidState("Course must be active to schedule sessions");
		}

		const scheduleCheck = assertSessionSchedulable({
			scheduledStartsAt: record.scheduledStartsAt,
			scheduledEndsAt: record.scheduledEndsAt,
		});
		if (!scheduleCheck.ok) return scheduleCheck;

		const id = randomUUID();
		const brandedId = parseHumanResourcesSessionId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[SessionSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH course AS (
							SELECT id
							FROM hr_learning_course
							WHERE id = ${record.courseId}
								AND organization_id = ${record.organizationId}
								AND status = 'active'
						),
						mutated AS (
							INSERT INTO hr_learning_session (
								id, organization_id, course_id, code, title,
								scheduled_starts_at, scheduled_ends_at, capacity, status,
								create_idempotency_key, create_request_fingerprint,
								version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${record.organizationId}, course.id, ${record.code},
								${record.title}, ${record.scheduledStartsAt}::timestamptz,
								${record.scheduledEndsAt}::timestamptz,
								${record.capacity}, 'scheduled', ${record.createIdempotencyKey},
								${record.createRequestFingerprint}, 1, ${record.createdBy},
								${record.createdBy}
							FROM course
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_learning_session', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Unable to create session for inactive course");
			}
			return mapSessionSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findSessionByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.session);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			if (isPostgresUniqueViolation(error)) {
				return conflict("Session code already exists in organization");
			}
			return mapPersistenceFailure(error, "Failed to create session");
		}
	},

	async startSession(input, _ports, meta) {
		const existing = await this.getSessionById({
			organizationId: input.organizationId,
			sessionId: input.sessionId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Session not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const transitionCheck = assertSessionStatusTransition(
			existing.data.status,
			"in_progress",
		);
		if (!transitionCheck.ok) return transitionCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[SessionSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_learning_session
							SET status = 'in_progress',
								actual_starts_at = ${input.actualStartsAt}::timestamptz,
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.sessionId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'scheduled'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_learning_session', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Session",
				});
			}
			return mapSessionSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to start session");
		}
	},

	async completeSession(input, _ports, meta) {
		const existing = await this.getSessionById({
			organizationId: input.organizationId,
			sessionId: input.sessionId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Session not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const transitionCheck = assertSessionStatusTransition(
			existing.data.status,
			"completed",
		);
		if (!transitionCheck.ok) return transitionCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[SessionSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_learning_session
							SET status = 'completed',
								actual_ends_at = ${input.actualEndsAt}::timestamptz,
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.sessionId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'in_progress'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_learning_session', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Session",
				});
			}
			return mapSessionSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to complete session");
		}
	},

	async cancelSession(input, _ports, meta) {
		const existing = await this.getSessionById({
			organizationId: input.organizationId,
			sessionId: input.sessionId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Session not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const transitionCheck = assertSessionStatusTransition(
			existing.data.status,
			"cancelled",
		);
		if (!transitionCheck.ok) return transitionCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[SessionSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_learning_session
							SET status = 'cancelled',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.sessionId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status IN ('scheduled', 'in_progress')
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_learning_session', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Session",
				});
			}
			return mapSessionSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to cancel session");
		}
	},

	async listSessions(input) {
		try {
			let query = db
				.select()
				.from(hrLearningSession)
				.where(eq(hrLearningSession.organizationId, input.organizationId))
				.$dynamic();

			if (input.status !== undefined) {
				query = query.where(eq(hrLearningSession.status, input.status));
			}
			if (input.courseId !== undefined) {
				query = query.where(eq(hrLearningSession.courseId, input.courseId));
			}

			const rows = await query.orderBy(
				desc(hrLearningSession.scheduledStartsAt),
			);
			const totalCount = rows.length;
			const start = (input.page - 1) * input.pageSize;
			const paged = rows.slice(start, start + input.pageSize);

			const sessions: LearningSession[] = [];
			for (const row of paged) {
				const mapped = mapSession(row);
				if (!mapped.ok) return mapped;
				sessions.push(mapped.data);
			}

			return ok({
				sessions,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list sessions");
		}
	},

	async countEnrolledInSession(input) {
		try {
			const rows = await db
				.select()
				.from(hrLearningAssignment)
				.where(
					and(
						eq(hrLearningAssignment.organizationId, input.organizationId),
						eq(hrLearningAssignment.sessionId, input.sessionId),
					),
				);
			const count = rows.filter((a) => a.status === "in_progress").length;
			return ok(count);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to count enrolled");
		}
	},

	async getLearningAssignmentById(input) {
		try {
			const rows = await db
				.select()
				.from(hrLearningAssignment)
				.where(
					and(
						eq(hrLearningAssignment.organizationId, input.organizationId),
						eq(hrLearningAssignment.id, input.assignmentId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapLearningAssignment(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load learning assignment");
		}
	},

	async findLearningAssignmentByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrLearningAssignment)
				.where(
					and(
						eq(hrLearningAssignment.organizationId, input.organizationId),
						eq(hrLearningAssignment.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const assignment = mapLearningAssignment(row);
			if (!assignment.ok) return assignment;
			if (
				row.createIdempotencyKey === null ||
				row.createRequestFingerprint === null
			) {
				return fail(
					"INTERNAL_ERROR",
					"Assignment idempotency metadata is missing",
				);
			}
			return ok({
				assignment: assignment.data,
				createIdempotencyKey: row.createIdempotencyKey,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find assignment by idempotency key",
			);
		}
	},

	async createLearningAssignment(record, _ports, meta) {
		const existing = await this.findLearningAssignmentByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return ok(existing.data.assignment);
			}
			return conflict("Idempotency key already used with different data");
		}
		const employee = await this.getEmployeeById({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
		});
		if (!employee.ok) return employee;
		if (employee.data === null) {
			return notFound(
				"Employee not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const course = await this.getCourseById({
			organizationId: record.organizationId,
			courseId: record.courseId,
		});
		if (!course.ok) return course;
		if (course.data === null) {
			return notFound(
				"Course not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		if (course.data.status !== "active") {
			return invalidState("Course must be active to create assignments");
		}

		if (record.sessionId !== null) {
			const session = await this.getSessionById({
				organizationId: record.organizationId,
				sessionId: record.sessionId,
			});
			if (!session.ok) return session;
			if (session.data === null) {
				return notFound(
					"Session not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			if (session.data.status !== "scheduled") {
				return invalidState("Session must be scheduled to create assignments");
			}
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesLearningAssignmentId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_learning_assignment",
			entityId: brandedId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<[LearningAssignmentSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
					WITH employee AS (
						SELECT id
						FROM hr_employee
						WHERE id = ${record.employeeId}
							AND organization_id = ${record.organizationId}
					),
					course AS (
						SELECT id
						FROM hr_learning_course
						WHERE id = ${record.courseId}
							AND organization_id = ${record.organizationId}
							AND status = 'active'
					),
					session_ok AS (
						SELECT 1 AS ok
						WHERE ${record.sessionId}::uuid IS NULL
						UNION ALL
						SELECT 1
						FROM hr_learning_session s
						WHERE s.id = ${record.sessionId}
							AND s.organization_id = ${record.organizationId}
							AND s.status = 'scheduled'
					),
					mutated AS (
						INSERT INTO hr_learning_assignment (
							id, organization_id, employee_id, course_id, session_id, status,
							assigned_by, assigned_at, due_on, create_idempotency_key,
							create_request_fingerprint, version, created_by, updated_by
						)
						SELECT
							${brandedId.data}, ${record.organizationId}, employee.id, course.id,
							${record.sessionId}, 'pending', ${record.assignedBy},
							${record.assignedAt}::timestamptz, ${record.dueOn},
							${record.createIdempotencyKey}, ${record.createRequestFingerprint}, 1,
							${record.createdBy}, ${record.createdBy}
						FROM employee, course
						WHERE EXISTS (SELECT 1 FROM session_ok)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'human-resources', 'hr_learning_assignment', id, 'CREATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT
							${eventId}, organization_id,
							${HUMAN_RESOURCES_LEARNING_ASSIGNMENT_CREATED_EVENT},
							'human-resources', ${meta.correlationId}, created_by,
							${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Unable to create assignment");
			}
			return mapLearningAssignmentSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findLearningAssignmentByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.assignment);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			if (isPostgresUniqueViolation(error)) {
				return conflict(
					"Employee already has an active assignment for this course",
				);
			}
			return mapPersistenceFailure(
				error,
				"Failed to create learning assignment",
			);
		}
	},

	async enrollLearningAssignment(input, _ports, meta) {
		const existing = await this.getLearningAssignmentById({
			organizationId: input.organizationId,
			assignmentId: input.assignmentId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Learning assignment not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const course = await this.getCourseById({
			organizationId: input.organizationId,
			courseId: existing.data.courseId,
		});
		if (!course.ok) return course;
		if (course.data === null) {
			return notFound("Course not found");
		}

		const sessionId = input.sessionId ?? existing.data.sessionId;
		let sessionStatus: SessionStatus | null = null;
		let capacity: number | null = null;
		let enrolledCount = 0;
		if (sessionId !== null) {
			const session = await this.getSessionById({
				organizationId: input.organizationId,
				sessionId,
			});
			if (!session.ok) return session;
			if (session.data === null) {
				return notFound("Session not found");
			}
			if (session.data.courseId !== existing.data.courseId) {
				return conflict("Session does not belong to the assignment course");
			}
			sessionStatus = session.data.status;
			capacity = session.data.capacity;
			const enrolled = await this.countEnrolledInSession({
				organizationId: input.organizationId,
				sessionId,
			});
			if (!enrolled.ok) return enrolled;
			enrolledCount = enrolled.data;
		}

		const enrollCheck = assertAssignmentEnrollable({
			assignmentStatus: existing.data.status,
			courseStatus: course.data.status,
			sessionStatus,
			maxParticipants: capacity,
			enrolledCount,
		});
		if (!enrollCheck.ok) return enrollCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[LearningAssignmentSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
					WITH check_session AS (
						SELECT
							COALESCE(
								(SELECT COUNT(*)
								FROM hr_learning_assignment
								WHERE organization_id = ${input.organizationId}
									AND session_id = ${sessionId}
									AND status = 'in_progress'
									AND session_id IS NOT NULL),
								0
							) AS enrolled_count,
							COALESCE(
								(SELECT capacity
								FROM hr_learning_session
								WHERE id = ${sessionId}),
								NULL
							) AS capacity
					),
					mutated AS (
						UPDATE hr_learning_assignment
						SET status = 'in_progress',
							session_id = ${sessionId},
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						FROM check_session
						WHERE hr_learning_assignment.id = ${input.assignmentId}
							AND hr_learning_assignment.organization_id = ${input.organizationId}
							AND hr_learning_assignment.version = ${input.expectedVersion}
							AND hr_learning_assignment.status = 'pending'
							AND (
								${sessionId}::uuid IS NULL
								OR check_session.capacity IS NULL
								OR check_session.enrolled_count < check_session.capacity
							)
						RETURNING hr_learning_assignment.*
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_learning_assignment', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
				],
			);
			const row = rows[0];
			if (!row) {
				if (existing.data.sessionId !== null) {
					const recheckEnrolled = await this.countEnrolledInSession({
						organizationId: input.organizationId,
						sessionId: existing.data.sessionId,
					});
					if (!recheckEnrolled.ok) return recheckEnrolled;
					// Only check capacity if there's a limit set
					if (capacity !== null && recheckEnrolled.data >= capacity) {
						return invalidState("Session is at capacity");
					}
				}
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Learning assignment",
				});
			}
			return mapLearningAssignmentSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to enroll learning assignment",
			);
		}
	},

	async waiveLearningAssignment(input, _ports, meta) {
		const existing = await this.getLearningAssignmentById({
			organizationId: input.organizationId,
			assignmentId: input.assignmentId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Learning assignment not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const waiveCheck = assertAssignmentWaivable(existing.data.status);
		if (!waiveCheck.ok) return waiveCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[LearningAssignmentSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
					WITH mutated AS (
						UPDATE hr_learning_assignment
						SET status = 'withdrawn',
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.assignmentId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status IN ('pending', 'in_progress')
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_learning_assignment', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Learning assignment",
				});
			}
			return mapLearningAssignmentSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to waive learning assignment",
			);
		}
	},

	async listLearningAssignments(input) {
		try {
			let query = db
				.select()
				.from(hrLearningAssignment)
				.where(eq(hrLearningAssignment.organizationId, input.organizationId))
				.$dynamic();

			if (input.status !== undefined) {
				query = query.where(eq(hrLearningAssignment.status, input.status));
			}
			if (input.employeeId !== undefined) {
				query = query.where(
					eq(hrLearningAssignment.employeeId, input.employeeId),
				);
			}
			if (input.courseId !== undefined) {
				query = query.where(eq(hrLearningAssignment.courseId, input.courseId));
			}

			const rows = await query.orderBy(desc(hrLearningAssignment.assignedAt));
			const totalCount = rows.length;
			const start = (input.page - 1) * input.pageSize;
			const paged = rows.slice(start, start + input.pageSize);

			const assignments: LearningAssignment[] = [];
			for (const row of paged) {
				const mapped = mapLearningAssignment(row);
				if (!mapped.ok) return mapped;
				assignments.push(mapped.data);
			}

			return ok({
				assignments,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list learning assignments",
			);
		}
	},

	async getCompletionById(input) {
		try {
			const rows = await db
				.select()
				.from(hrLearningCompletion)
				.where(
					and(
						eq(hrLearningCompletion.organizationId, input.organizationId),
						eq(hrLearningCompletion.id, input.completionId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapCompletion(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load completion");
		}
	},

	async findCompletionByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrLearningCompletion)
				.where(
					and(
						eq(hrLearningCompletion.organizationId, input.organizationId),
						eq(hrLearningCompletion.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const completion = mapCompletion(row);
			if (!completion.ok) return completion;
			if (
				row.createIdempotencyKey === null ||
				row.createRequestFingerprint === null
			) {
				return fail(
					"INTERNAL_ERROR",
					"Completion idempotency metadata is missing",
				);
			}
			return ok({
				completion: completion.data,
				createIdempotencyKey: row.createIdempotencyKey,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find completion by idempotency key",
			);
		}
	},

	async findCompletionByAssignmentId(input) {
		try {
			const rows = await db
				.select()
				.from(hrLearningCompletion)
				.where(
					and(
						eq(hrLearningCompletion.organizationId, input.organizationId),
						eq(hrLearningCompletion.assignmentId, input.assignmentId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapCompletion(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find completion by assignment",
			);
		}
	},

	async recordCompletion(record, _ports, meta) {
		const existingByKey = await this.findCompletionByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existingByKey.ok) return existingByKey;
		if (existingByKey.data !== null) {
			if (
				existingByKey.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return ok(existingByKey.data.completion);
			}
			return conflict("Idempotency key already used with different data");
		}
		const assignment = await this.getLearningAssignmentById({
			organizationId: record.organizationId,
			assignmentId: record.assignmentId,
		});
		if (!assignment.ok) return assignment;
		if (assignment.data === null) {
			return notFound(
				"Learning assignment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		// Match memory-store: gate on the assignment's linked session, not the
		// optional sessionId carried only on the completion record.
		let sessionStatus: SessionStatus | null = null;
		if (assignment.data.sessionId !== null) {
			const session = await this.getSessionById({
				organizationId: record.organizationId,
				sessionId: assignment.data.sessionId,
			});
			if (!session.ok) return session;
			if (session.data === null) {
				return notFound(
					"Session not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			sessionStatus = session.data.status;
		}
		if (record.sessionId !== null) {
			const linkedSession = await this.getSessionById({
				organizationId: record.organizationId,
				sessionId: record.sessionId,
			});
			if (!linkedSession.ok) return linkedSession;
			if (linkedSession.data === null) {
				return notFound(
					"Session not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
		}

		const recordCheck = assertCompletionRecordable({
			assignmentStatus: assignment.data.status,
			sessionStatus,
			completedAt: record.completedAt,
		});
		if (!recordCheck.ok) return recordCheck;

		const existingCompletionCheck = await this.findCompletionByAssignmentId({
			organizationId: record.organizationId,
			assignmentId: record.assignmentId,
		});
		if (!existingCompletionCheck.ok) return existingCompletionCheck;

		const duplicateCheck = assertNoDuplicateCompletion({
			hasExistingCompletion: existingCompletionCheck.data !== null,
		});
		if (!duplicateCheck.ok) return duplicateCheck;

		const id = randomUUID();
		const brandedId = parseHumanResourcesCompletionId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		const nextAssignmentVersion = assignment.data.version + 1;
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_learning_completion",
			entityId: brandedId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<[CompletionSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH assignment AS (
							SELECT id, organization_id, employee_id, course_id, session_id, version
							FROM hr_learning_assignment
							WHERE id = ${record.assignmentId}
								AND organization_id = ${record.organizationId}
								AND status IN ('pending', 'in_progress')
						),
						session_ok AS (
							SELECT 1 AS ok
							WHERE ${record.sessionId}::uuid IS NULL
							UNION ALL
							SELECT 1
							FROM hr_learning_session s
							WHERE s.id = ${record.sessionId}
								AND s.organization_id = ${record.organizationId}
								AND s.status != 'cancelled'
						),
						mutated AS (
							INSERT INTO hr_learning_completion (
								id, organization_id, employee_id, course_id, assignment_id,
								session_id, completed_at, outcome, assessor_user_id, notes,
								create_idempotency_key, create_request_fingerprint,
								version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, assignment.organization_id, assignment.employee_id,
								assignment.course_id, assignment.id, ${record.sessionId},
								${record.completedAt}::timestamptz, ${record.outcome},
								${record.assessorUserId}, ${record.notes},
								${record.createIdempotencyKey}, ${record.createRequestFingerprint},
								1, ${record.createdBy}, ${record.createdBy}
							FROM assignment
							WHERE EXISTS (SELECT 1 FROM session_ok)
								AND NOT EXISTS (
									SELECT 1 FROM hr_learning_completion existing
									WHERE existing.organization_id = assignment.organization_id
										AND existing.assignment_id = assignment.id
								)
							RETURNING *
						),
						assignment_updated AS (
							UPDATE hr_learning_assignment a
							SET status = 'completed',
								version = ${nextAssignmentVersion},
								updated_by = ${record.createdBy},
								updated_at = now()
							FROM mutated
							WHERE a.id = mutated.assignment_id
								AND a.organization_id = mutated.organization_id
							RETURNING a.id
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_learning_completion', id, 'CREATE',
								'[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id,
								${HUMAN_RESOURCES_LEARNING_COMPLETION_RECORDED_EVENT},
								'human-resources', ${meta.correlationId}, created_by,
								${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, assignment_updated, audited, outboxed
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				const recheckCompletion = await this.findCompletionByAssignmentId({
					organizationId: record.organizationId,
					assignmentId: record.assignmentId,
				});
				if (!recheckCompletion.ok) return recheckCompletion;
				if (recheckCompletion.data !== null) {
					return conflict("Assignment already has a completion record");
				}
				return conflict("Unable to record completion");
			}
			return mapCompletionSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findCompletionByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.completion);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			if (isPostgresUniqueViolation(error)) {
				return conflict("Assignment already has a completion record");
			}
			return mapPersistenceFailure(error, "Failed to record completion");
		}
	},

	async listCompletions(input) {
		try {
			let query = db
				.select()
				.from(hrLearningCompletion)
				.where(eq(hrLearningCompletion.organizationId, input.organizationId))
				.$dynamic();

			if (input.employeeId !== undefined) {
				query = query.where(
					eq(hrLearningCompletion.employeeId, input.employeeId),
				);
			}
			if (input.courseId !== undefined) {
				query = query.where(eq(hrLearningCompletion.courseId, input.courseId));
			}

			const rows = await query.orderBy(desc(hrLearningCompletion.completedAt));
			const totalCount = rows.length;
			const start = (input.page - 1) * input.pageSize;
			const paged = rows.slice(start, start + input.pageSize);

			const completions: LearningCompletion[] = [];
			for (const row of paged) {
				const mapped = mapCompletion(row);
				if (!mapped.ok) return mapped;
				completions.push(mapped.data);
			}

			return ok({
				completions,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list completions");
		}
	},

	async getCertificationById(input) {
		try {
			const rows = await db
				.select()
				.from(hrEmployeeCertification)
				.where(
					and(
						eq(hrEmployeeCertification.organizationId, input.organizationId),
						eq(hrEmployeeCertification.id, input.certificationId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapCertification(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load certification");
		}
	},

	async findCertificationByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrEmployeeCertification)
				.where(
					and(
						eq(hrEmployeeCertification.organizationId, input.organizationId),
						eq(
							hrEmployeeCertification.createIdempotencyKey,
							input.idempotencyKey,
						),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const certification = mapCertification(row);
			if (!certification.ok) return certification;
			if (
				row.createIdempotencyKey === null ||
				row.createRequestFingerprint === null
			) {
				return fail(
					"INTERNAL_ERROR",
					"Certification idempotency metadata is missing",
				);
			}
			return ok({
				certification: certification.data,
				createIdempotencyKey: row.createIdempotencyKey,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find certification by idempotency key",
			);
		}
	},

	async issueCertification(record, _ports, meta) {
		const existing = await this.findCertificationByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return ok(existing.data.certification);
			}
			return conflict("Idempotency key already used with different data");
		}
		const employee = await this.getEmployeeById({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
		});
		if (!employee.ok) return employee;
		if (employee.data === null) {
			return notFound(
				"Employee not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const course = await this.getCourseById({
			organizationId: record.organizationId,
			courseId: record.courseId,
		});
		if (!course.ok) return course;
		if (course.data === null) {
			return notFound(
				"Course not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const completion = await this.getCompletionById({
			organizationId: record.organizationId,
			completionId: record.completionId,
		});
		if (!completion.ok) return completion;
		if (completion.data === null) {
			return notFound(
				"Completion not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const issuableCheck = assertCertificationIssuable({
			hasRequiredCompletion: completion.data.courseId === record.courseId,
			issuedOn: record.issuedOn,
			expiresOn: record.expiresOn,
			todayDate: new Date().toISOString().slice(0, 10),
		});
		if (!issuableCheck.ok) return issuableCheck;

		const id = randomUUID();
		const brandedId = parseHumanResourcesCertificationId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[CertificationSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH employee AS (
							SELECT id
							FROM hr_employee
							WHERE id = ${record.employeeId}
								AND organization_id = ${record.organizationId}
						),
						course AS (
							SELECT id
							FROM hr_learning_course
							WHERE id = ${record.courseId}
								AND organization_id = ${record.organizationId}
						),
						completion AS (
							SELECT id, course_id
							FROM hr_learning_completion
							WHERE id = ${record.completionId}
								AND organization_id = ${record.organizationId}
						),
						mutated AS (
							INSERT INTO hr_employee_certification (
								id, organization_id, employee_id, course_id, completion_id,
								certification_code, issued_on, expires_on, status,
								create_idempotency_key, create_request_fingerprint,
								version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${record.organizationId}, employee.id, course.id,
								completion.id, ${record.certificationCode}, ${record.issuedOn},
								${record.expiresOn}, 'active', ${record.createIdempotencyKey},
								${record.createRequestFingerprint}, 1, ${record.createdBy},
								${record.createdBy}
							FROM employee, course, completion
							WHERE completion.course_id = course.id
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_employee_certification', id, 'CREATE',
								'[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Unable to issue certification");
			}
			return mapCertificationSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findCertificationByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.certification);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			if (isPostgresUniqueViolation(error)) {
				return conflict("Certification already exists for this completion");
			}
			return mapPersistenceFailure(error, "Failed to issue certification");
		}
	},

	async revokeCertification(input, _ports, meta) {
		const existing = await this.getCertificationById({
			organizationId: input.organizationId,
			certificationId: input.certificationId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Certification not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const revokeCheck = assertCertificationCanRevoke(existing.data.status);
		if (!revokeCheck.ok) return revokeCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[CertificationSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_employee_certification
							SET status = 'revoked',
								revoked_at = now(),
								revoked_by = ${input.actorUserId},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.certificationId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'active'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_employee_certification', id, 'UPDATE',
								'[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Certification",
				});
			}
			return mapCertificationSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to revoke certification");
		}
	},

	async expireCertification(input, _ports, meta) {
		const existing = await this.getCertificationById({
			organizationId: input.organizationId,
			certificationId: input.certificationId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Certification not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const expireCheck = assertCertificationCanExpire(existing.data.status);
		if (!expireCheck.ok) return expireCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[CertificationSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_employee_certification
							SET status = 'expired',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.certificationId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'active'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_employee_certification', id, 'UPDATE',
								'[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Certification",
				});
			}
			return mapCertificationSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to expire certification");
		}
	},

	async listCertifications(input) {
		try {
			let query = db
				.select()
				.from(hrEmployeeCertification)
				.where(eq(hrEmployeeCertification.organizationId, input.organizationId))
				.$dynamic();

			if (input.status !== undefined) {
				query = query.where(eq(hrEmployeeCertification.status, input.status));
			}
			if (input.employeeId !== undefined) {
				query = query.where(
					eq(hrEmployeeCertification.employeeId, input.employeeId),
				);
			}
			if (input.courseId !== undefined) {
				query = query.where(
					eq(hrEmployeeCertification.courseId, input.courseId),
				);
			}

			const rows = await query.orderBy(desc(hrEmployeeCertification.issuedOn));
			const totalCount = rows.length;
			const start = (input.page - 1) * input.pageSize;
			const paged = rows.slice(start, start + input.pageSize);

			const certifications: EmployeeCertification[] = [];
			for (const row of paged) {
				const mapped = mapCertification(row);
				if (!mapped.ok) return mapped;
				certifications.push(mapped.data);
			}

			return ok({
				certifications,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list certifications");
		}
	},
};

export function attachDrizzleLearning(target: LearningHost): void {
	Object.assign(target, drizzleLearningMethods);
}
