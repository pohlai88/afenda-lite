import { randomUUID } from "node:crypto";

import {
	type PreparedTransactionalAuditInsertValues,
	prepareTransactionalAuditInsertValues,
} from "@afenda/audit";
import {
	and,
	asc,
	db,
	desc,
	eq,
	gte,
	hrEmployeeCertification,
	hrLearningAssignment,
	hrLearningAttendance,
	hrLearningCompletion,
	hrLearningCourse,
	hrLearningSession,
	lte,
	runNeonHttpTransaction,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import {
	HUMAN_RESOURCES_CERTIFICATION_EXPIRING_EVENT,
	HUMAN_RESOURCES_CERTIFICATION_RENEWED_EVENT,
	HUMAN_RESOURCES_LEARNING_ASSIGNMENT_CREATED_EVENT,
	HUMAN_RESOURCES_LEARNING_COMPLETION_RECORDED_EVENT,
} from "@afenda/events/schemas";

import {
	parseHumanResourcesCertificationId,
	parseHumanResourcesCompletionId,
	parseHumanResourcesCourseId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesLearningAssignmentId,
	parseHumanResourcesLearningAttendanceId,
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
	assertCertificationRenewable,
	assertCompletionRecordable,
	assertCourseActive,
	assertCourseCanArchive,
	assertCourseStatusTransition,
	assertLearningAttendanceRecordable,
	assertNoDuplicateCompletion,
	assertNoDuplicateLearningAttendance,
	assertSessionSchedulable,
	assertSessionStatusTransition,
} from "../../shared/learning-guards";
import {
	assignmentStatusSchema,
	certificationStatusSchema,
	completionOutcomeSchema,
	courseStatusSchema,
	learningAttendanceStatusSchema,
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
	LearningAttendance,
	LearningCompletion,
	LearningCourse,
	LearningSession,
} from "../../types";

const LEARNING_AUDIT_SOURCE = "human-resources.learning-drizzle";

type LearningAuditEntity =
	| "hr_employee_certification"
	| "hr_learning_assignment"
	| "hr_learning_attendance"
	| "hr_learning_completion"
	| "hr_learning_course"
	| "hr_learning_session";

interface LearningAuditInput {
	action: "CREATE" | "UPDATE";
	actorUserId: string;
	correlationId: string;
	entity: LearningAuditEntity;
	entityId: string;
	newValue?: Record<string, unknown> | null;
	oldValue?: Record<string, unknown> | null;
	organizationId: string;
	reasonCode: string;
}

function prepareLearningAudit(
	input: LearningAuditInput,
): Result<PreparedTransactionalAuditInsertValues> {
	return prepareTransactionalAuditInsertValues({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		module: "human-resources",
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		oldValue: input.oldValue ?? null,
		newValue: input.newValue ?? null,
		eventContext: {
			version: 1,
			outcome: "SUCCEEDED",
			source: LEARNING_AUDIT_SOURCE,
			occurredAt: null,
			causationId: null,
			reasonCode: input.reasonCode,
		},
	});
}

interface LearningHost {
	countActiveAssignmentsForCourse: HumanResourcesStore["countActiveAssignmentsForCourse"];
	countEnrolledInSession: HumanResourcesStore["countEnrolledInSession"];
	findCompletionByAssignmentId: HumanResourcesStore["findCompletionByAssignmentId"];
	getCompletionById: HumanResourcesStore["getCompletionById"];
	getCourseById: HumanResourcesStore["getCourseById"];
	getEmployeeById: HumanResourcesStore["getEmployeeById"];
	getLearningAssignmentById: HumanResourcesStore["getLearningAssignmentById"];
	getSessionById: HumanResourcesStore["getSessionById"];
}

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

function mapCourse(
	row: typeof hrLearningCourse.$inferSelect,
): Result<LearningCourse> {
	const id = parseHumanResourcesCourseId(row.id);
	if (!id.ok) {
		return id;
	}
	const status = courseStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
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
	if (!id.ok) {
		return id;
	}
	const courseId = parseHumanResourcesCourseId(row.courseId);
	if (!courseId.ok) {
		return courseId;
	}
	const status = sessionStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
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
		primaryInstructorUserId: row.primaryInstructorUserId,
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
	if (!id.ok) {
		return id;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	const courseId = parseHumanResourcesCourseId(row.courseId);
	if (!courseId.ok) {
		return courseId;
	}
	let sessionId = null as LearningAssignment["sessionId"];
	if (row.sessionId !== null) {
		const parsed = parseHumanResourcesSessionId(row.sessionId);
		if (!parsed.ok) {
			return parsed;
		}
		sessionId = parsed.data;
	}
	const status = assignmentStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
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
	if (!id.ok) {
		return id;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	const courseId = parseHumanResourcesCourseId(row.courseId);
	if (!courseId.ok) {
		return courseId;
	}
	const assignmentId = parseHumanResourcesLearningAssignmentId(
		row.assignmentId,
	);
	if (!assignmentId.ok) {
		return assignmentId;
	}
	let sessionId = null as LearningCompletion["sessionId"];
	if (row.sessionId !== null) {
		const parsed = parseHumanResourcesSessionId(row.sessionId);
		if (!parsed.ok) {
			return parsed;
		}
		sessionId = parsed.data;
	}
	const outcome = completionOutcomeSchema.safeParse(row.outcome);
	if (!outcome.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
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
	if (!id.ok) {
		return id;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	const courseId = parseHumanResourcesCourseId(row.courseId);
	if (!courseId.ok) {
		return courseId;
	}
	const completionId = parseHumanResourcesCompletionId(row.completionId);
	if (!completionId.ok) {
		return completionId;
	}
	const status = certificationStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	let renewedFromCertificationId =
		null as EmployeeCertification["renewedFromCertificationId"];
	if (row.renewedFromCertificationId !== null) {
		const parsed = parseHumanResourcesCertificationId(
			row.renewedFromCertificationId,
		);
		if (!parsed.ok) {
			return parsed;
		}
		renewedFromCertificationId = parsed.data;
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		courseId: courseId.data,
		completionId: completionId.data,
		certificationCode: row.certificationCode,
		issuedOn: row.issuedOn,
		expiresOn: row.expiresOn,
		status: status.data,
		renewedFromCertificationId,
		revokedAt: row.revokedAt,
		revokedBy: row.revokedBy,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapLearningAttendance(
	row: typeof hrLearningAttendance.$inferSelect,
): Result<LearningAttendance> {
	const id = parseHumanResourcesLearningAttendanceId(row.id);
	if (!id.ok) {
		return id;
	}
	const sessionId = parseHumanResourcesSessionId(row.sessionId);
	if (!sessionId.ok) {
		return sessionId;
	}
	const assignmentId = parseHumanResourcesLearningAssignmentId(
		row.assignmentId,
	);
	if (!assignmentId.ok) {
		return assignmentId;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	const status = learningAttendanceStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		sessionId: sessionId.data,
		assignmentId: assignmentId.data,
		employeeId: employeeId.data,
		status: status.data,
		recordedAt: row.recordedAt,
		recordedBy: row.recordedBy,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

interface CourseSqlRow {
	code: string;
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	created_at: Date;
	created_by: string;
	description: string | null;
	duration_hours: string | null;
	id: string;
	organization_id: string;
	status: string;
	title: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface SessionSqlRow {
	actual_ends_at: Date | null;
	actual_starts_at: Date | null;
	capacity: number | null;
	code: string;
	course_id: string;
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	created_at: Date;
	created_by: string;
	id: string;
	organization_id: string;
	primary_instructor_user_id: string | null;
	scheduled_ends_at: Date;
	scheduled_starts_at: Date;
	status: string;
	title: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface LearningAssignmentSqlRow {
	assigned_at: Date;
	assigned_by: string;
	course_id: string;
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	created_at: Date;
	created_by: string;
	due_on: string | null;
	employee_id: string;
	id: string;
	organization_id: string;
	session_id: string | null;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface CompletionSqlRow {
	assessor_user_id: string | null;
	assignment_id: string;
	completed_at: Date;
	course_id: string;
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	created_at: Date;
	created_by: string;
	employee_id: string;
	id: string;
	notes: string | null;
	organization_id: string;
	outcome: string;
	session_id: string | null;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface CertificationSqlRow {
	certification_code: string;
	completion_id: string;
	course_id: string;
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	created_at: Date;
	created_by: string;
	employee_id: string;
	expires_on: string | null;
	id: string;
	issued_on: string;
	organization_id: string;
	renewed_from_certification_id: string | null;
	revoked_at: Date | null;
	revoked_by: string | null;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface LearningAttendanceSqlRow {
	assignment_id: string;
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	created_at: Date;
	created_by: string;
	employee_id: string;
	id: string;
	organization_id: string;
	recorded_at: Date;
	recorded_by: string;
	session_id: string;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

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

async function resolveCourseIdempotencyReplay(
	host: Pick<HumanResourcesStore, "findCourseByIdempotencyKey">,
	input: {
		organizationId: string;
		idempotencyKey: string;
		expectedFingerprint: string;
	},
): Promise<Result<LearningCourse | null>> {
	const existing = await host.findCourseByIdempotencyKey({
		organizationId: input.organizationId,
		idempotencyKey: input.idempotencyKey,
	});
	if (!existing.ok) {
		return existing;
	}
	if (existing.data === null) {
		return errorResult.ok(null);
	}
	return existing.data.createRequestFingerprint === input.expectedFingerprint
		? errorResult.ok(existing.data.course)
		: conflict("Idempotency key already used with different data");
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
		primaryInstructorUserId: row.primary_instructor_user_id,
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
		renewedFromCertificationId: row.renewed_from_certification_id,
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

function mapLearningAttendanceSql(
	row: LearningAttendanceSqlRow,
): Result<LearningAttendance> {
	return mapLearningAttendance({
		id: row.id,
		organizationId: row.organization_id,
		sessionId: row.session_id,
		assignmentId: row.assignment_id,
		employeeId: row.employee_id,
		status: row.status,
		recordedAt: row.recorded_at,
		recordedBy: row.recorded_by,
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			const course = mapCourse(row);
			if (!course.ok) {
				return course;
			}
			if (
				row.createIdempotencyKey === null ||
				row.createRequestFingerprint === null
			) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok({
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
		const replay = await resolveCourseIdempotencyReplay(this, {
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
			expectedFingerprint: record.createRequestFingerprint,
		});
		if (!replay.ok) {
			return replay;
		}
		if (replay.data !== null) {
			return errorResult.ok(replay.data);
		}
		const id = randomUUID();
		const brandedId = parseHumanResourcesCourseId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const preparedAudit = prepareLearningAudit({
			action: "CREATE",
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_learning_course",
			entityId: brandedId.data,
			organizationId: record.organizationId,
			reasonCode: "LEARNING_COURSE_CREATED",
			newValue: {
				code: record.code,
				title: record.title,
				durationHours: record.durationHours,
				status: "active",
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				return conflict("Course code already exists in organization");
			}
			return mapCourseSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replayAfterConflict = await resolveCourseIdempotencyReplay(this, {
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
					expectedFingerprint: record.createRequestFingerprint,
				});
				if (!replayAfterConflict.ok) {
					return replayAfterConflict;
				}
				if (replayAfterConflict.data !== null) {
					return errorResult.ok(replayAfterConflict.data);
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Course not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const activeCheck = assertCourseActive(existing.data.status);
		if (!activeCheck.ok) {
			return activeCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const preparedAudit = prepareLearningAudit({
			action: "UPDATE",
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_learning_course",
			entityId: input.courseId,
			organizationId: input.organizationId,
			reasonCode: "LEARNING_COURSE_UPDATED",
			oldValue: {
				title: existing.data.title,
				durationHours: existing.data.durationHours,
			},
			newValue: {
				title: input.title,
				durationHours: input.durationHours,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Course not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertCourseStatusTransition(
			existing.data.status,
			"active",
		);
		if (!transition.ok) {
			return transition;
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const preparedAudit = prepareLearningAudit({
			action: "UPDATE",
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_learning_course",
			entityId: input.courseId,
			organizationId: input.organizationId,
			reasonCode: "LEARNING_COURSE_ACTIVATED",
			oldValue: { status: existing.data.status },
			newValue: { status: "active" },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
								AND status = 'archived'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Course not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
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

		const archiveCheck = assertCourseCanArchive({
			status: existing.data.status,
			hasActiveAssignments: activeCount.data > 0,
		});
		if (!archiveCheck.ok) {
			return archiveCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const preparedAudit = prepareLearningAudit({
			action: "UPDATE",
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_learning_course",
			entityId: input.courseId,
			organizationId: input.organizationId,
			reasonCode: "LEARNING_COURSE_ARCHIVED",
			oldValue: { status: existing.data.status },
			newValue: { status: "archived" },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				const recheck = await this.countActiveAssignmentsForCourse({
					organizationId: input.organizationId,
					courseId: input.courseId,
				});
				if (!recheck.ok) {
					return recheck;
				}
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
				if (!mapped.ok) {
					return mapped;
				}
				courses.push(mapped.data);
			}

			return errorResult.ok({
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
			return errorResult.ok(count);
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			const session = mapSession(row);
			if (!session.ok) {
				return session;
			}
			if (
				row.createIdempotencyKey === null ||
				row.createRequestFingerprint === null
			) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok({
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

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async createSession(record, _ports, meta) {
		const existing = await this.findSessionByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return errorResult.ok(existing.data.session);
			}
			return conflict("Idempotency key already used with different data");
		}
		const course = await this.getCourseById({
			organizationId: record.organizationId,
			courseId: record.courseId,
		});
		if (!course.ok) {
			return course;
		}
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
		if (!scheduleCheck.ok) {
			return scheduleCheck;
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesSessionId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const preparedAudit = prepareLearningAudit({
			action: "CREATE",
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_learning_session",
			entityId: brandedId.data,
			organizationId: record.organizationId,
			reasonCode: "LEARNING_SESSION_CREATED",
			newValue: {
				courseId: record.courseId,
				code: record.code,
				title: record.title,
				scheduledStartsAt: record.scheduledStartsAt.toISOString(),
				scheduledEndsAt: record.scheduledEndsAt.toISOString(),
				capacity: record.capacity,
				primaryInstructorUserId: record.primaryInstructorUserId,
				status: "scheduled",
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
								scheduled_starts_at, scheduled_ends_at, capacity,
								primary_instructor_user_id, status,
								create_idempotency_key, create_request_fingerprint,
								version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${record.organizationId}, course.id, ${record.code},
								${record.title}, ${record.scheduledStartsAt}::timestamptz,
								${record.scheduledEndsAt}::timestamptz,
								${record.capacity}, ${record.primaryInstructorUserId}, 'scheduled',
								${record.createIdempotencyKey},
								${record.createRequestFingerprint}, 1, ${record.createdBy},
								${record.createdBy}
							FROM course
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
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
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return errorResult.ok(replay.data.session);
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Session not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transitionCheck = assertSessionStatusTransition(
			existing.data.status,
			"in_progress",
		);
		if (!transitionCheck.ok) {
			return transitionCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const preparedAudit = prepareLearningAudit({
			action: "UPDATE",
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_learning_session",
			entityId: input.sessionId,
			organizationId: input.organizationId,
			reasonCode: "LEARNING_SESSION_STARTED",
			oldValue: {
				status: existing.data.status,
				actualStartsAt: existing.data.actualStartsAt?.toISOString() ?? null,
			},
			newValue: {
				status: "in_progress",
				actualStartsAt: input.actualStartsAt.toISOString(),
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Session not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transitionCheck = assertSessionStatusTransition(
			existing.data.status,
			"completed",
		);
		if (!transitionCheck.ok) {
			return transitionCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const preparedAudit = prepareLearningAudit({
			action: "UPDATE",
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_learning_session",
			entityId: input.sessionId,
			organizationId: input.organizationId,
			reasonCode: "LEARNING_SESSION_COMPLETED",
			oldValue: {
				status: existing.data.status,
				actualEndsAt: existing.data.actualEndsAt?.toISOString() ?? null,
			},
			newValue: {
				status: "completed",
				actualEndsAt: input.actualEndsAt.toISOString(),
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Session not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transitionCheck = assertSessionStatusTransition(
			existing.data.status,
			"cancelled",
		);
		if (!transitionCheck.ok) {
			return transitionCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const preparedAudit = prepareLearningAudit({
			action: "UPDATE",
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_learning_session",
			entityId: input.sessionId,
			organizationId: input.organizationId,
			reasonCode: "LEARNING_SESSION_CANCELLED",
			oldValue: { status: existing.data.status },
			newValue: { status: "cancelled" },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
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

	async assignSessionInstructor(input, _ports, meta) {
		const existing = await this.getSessionById({
			organizationId: input.organizationId,
			sessionId: input.sessionId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Session not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		if (
			existing.data.status === "completed" ||
			existing.data.status === "cancelled"
		) {
			return invalidState("Cannot modify completed or cancelled session");
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const preparedAudit = prepareLearningAudit({
			action: "UPDATE",
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_learning_session",
			entityId: input.sessionId,
			organizationId: input.organizationId,
			reasonCode: "LEARNING_SESSION_INSTRUCTOR_ASSIGNED",
			oldValue: {
				primaryInstructorUserId: existing.data.primaryInstructorUserId,
			},
			newValue: { primaryInstructorUserId: input.primaryInstructorUserId },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_learning_session
							SET primary_instructor_user_id = ${input.primaryInstructorUserId},
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Session",
				});
			}
			return mapSessionSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to assign session instructor",
			);
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
				if (!mapped.ok) {
					return mapped;
				}
				sessions.push(mapped.data);
			}

			return errorResult.ok({
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
			return errorResult.ok(count);
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			const assignment = mapLearningAssignment(row);
			if (!assignment.ok) {
				return assignment;
			}
			if (
				row.createIdempotencyKey === null ||
				row.createRequestFingerprint === null
			) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok({
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

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async createLearningAssignment(record, _ports, meta) {
		const existing = await this.findLearningAssignmentByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return errorResult.ok(existing.data.assignment);
			}
			return conflict("Idempotency key already used with different data");
		}
		const employee = await this.getEmployeeById({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
		});
		if (!employee.ok) {
			return employee;
		}
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
		if (!course.ok) {
			return course;
		}
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
			if (!session.ok) {
				return session;
			}
			if (session.data === null) {
				return notFound(
					"Session not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			if (
				session.data.status !== "scheduled" &&
				session.data.status !== "in_progress"
			) {
				return invalidState("Session must be active to create assignments");
			}
			if (session.data.courseId !== record.courseId) {
				return conflict("Session does not belong to the specified course");
			}
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesLearningAssignmentId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_learning_assignment",
			entityId: brandedId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});
		const preparedAudit = prepareLearningAudit({
			action: "CREATE",
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_learning_assignment",
			entityId: brandedId.data,
			organizationId: record.organizationId,
			reasonCode: "LEARNING_ASSIGNMENT_CREATED",
			newValue: {
				employeeId: record.employeeId,
				courseId: record.courseId,
				sessionId: record.sessionId,
				status: "pending",
				assignedAt: record.assignedAt.toISOString(),
				dueOn: record.dueOn,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
							AND s.course_id = ${record.courseId}
							AND s.status IN ('scheduled', 'in_progress')
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
							${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
							${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
							${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
							${audit.ipAddress}, ${audit.userAgent}
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
			]);
			const [row] = rows;
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
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return errorResult.ok(replay.data.assignment);
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

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async enrollLearningAssignment(input, _ports, meta) {
		const existing = await this.getLearningAssignmentById({
			organizationId: input.organizationId,
			assignmentId: input.assignmentId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Learning assignment not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const course = await this.getCourseById({
			organizationId: input.organizationId,
			courseId: existing.data.courseId,
		});
		if (!course.ok) {
			return course;
		}
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
			if (!session.ok) {
				return session;
			}
			if (session.data === null) {
				return notFound("Session not found");
			}
			if (session.data.courseId !== existing.data.courseId) {
				return conflict("Session does not belong to the assignment course");
			}
			({ status: sessionStatus, capacity } = session.data);
			const enrolled = await this.countEnrolledInSession({
				organizationId: input.organizationId,
				sessionId,
			});
			if (!enrolled.ok) {
				return enrolled;
			}
			enrolledCount = enrolled.data;
		}

		const enrollCheck = assertAssignmentEnrollable({
			assignmentStatus: existing.data.status,
			courseStatus: course.data.status,
			sessionStatus,
			maxParticipants: capacity,
			enrolledCount,
		});
		if (!enrollCheck.ok) {
			return enrollCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const preparedAudit = prepareLearningAudit({
			action: "UPDATE",
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_learning_assignment",
			entityId: input.assignmentId,
			organizationId: input.organizationId,
			reasonCode: "LEARNING_ASSIGNMENT_ENROLLED",
			oldValue: {
				status: existing.data.status,
				sessionId: existing.data.sessionId,
			},
			newValue: { status: "in_progress", sessionId },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
							${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
							${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
							${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
							${audit.ipAddress}, ${audit.userAgent}
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const [row] = rows;
			if (!row) {
				if (existing.data.sessionId !== null) {
					const recheckEnrolled = await this.countEnrolledInSession({
						organizationId: input.organizationId,
						sessionId: existing.data.sessionId,
					});
					if (!recheckEnrolled.ok) {
						return recheckEnrolled;
					}
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Learning assignment not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const waiveCheck = assertAssignmentWaivable(existing.data.status);
		if (!waiveCheck.ok) {
			return waiveCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const preparedAudit = prepareLearningAudit({
			action: "UPDATE",
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_learning_assignment",
			entityId: input.assignmentId,
			organizationId: input.organizationId,
			reasonCode: "LEARNING_ASSIGNMENT_WAIVED",
			oldValue: { status: existing.data.status },
			newValue: { status: "withdrawn" },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
							${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
							${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
							${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
							${audit.ipAddress}, ${audit.userAgent}
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const [row] = rows;
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
				if (!mapped.ok) {
					return mapped;
				}
				assignments.push(mapped.data);
			}

			return errorResult.ok({
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			const completion = mapCompletion(row);
			if (!completion.ok) {
				return completion;
			}
			if (
				row.createIdempotencyKey === null ||
				row.createRequestFingerprint === null
			) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok({
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapCompletion(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find completion by assignment",
			);
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async recordCompletion(record, _ports, meta) {
		const existingByKey = await this.findCompletionByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existingByKey.ok) {
			return existingByKey;
		}
		if (existingByKey.data !== null) {
			if (
				existingByKey.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return errorResult.ok(existingByKey.data.completion);
			}
			return conflict("Idempotency key already used with different data");
		}
		const assignment = await this.getLearningAssignmentById({
			organizationId: record.organizationId,
			assignmentId: record.assignmentId,
		});
		if (!assignment.ok) {
			return assignment;
		}
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
			if (!session.ok) {
				return session;
			}
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
			if (!linkedSession.ok) {
				return linkedSession;
			}
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
		if (!recordCheck.ok) {
			return recordCheck;
		}

		const existingCompletionCheck = await this.findCompletionByAssignmentId({
			organizationId: record.organizationId,
			assignmentId: record.assignmentId,
		});
		if (!existingCompletionCheck.ok) {
			return existingCompletionCheck;
		}

		const duplicateCheck = assertNoDuplicateCompletion({
			hasExistingCompletion: existingCompletionCheck.data !== null,
		});
		if (!duplicateCheck.ok) {
			return duplicateCheck;
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesCompletionId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
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
		const preparedAudit = prepareLearningAudit({
			action: "CREATE",
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_learning_completion",
			entityId: brandedId.data,
			organizationId: record.organizationId,
			reasonCode: "LEARNING_COMPLETION_RECORDED",
			newValue: {
				assignmentId: record.assignmentId,
				employeeId: assignment.data.employeeId,
				courseId: assignment.data.courseId,
				sessionId: assignment.data.sessionId,
				outcome: record.outcome,
				completedAt: record.completedAt.toISOString(),
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
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
			]);
			const [row] = rows;
			if (!row) {
				const recheckCompletion = await this.findCompletionByAssignmentId({
					organizationId: record.organizationId,
					assignmentId: record.assignmentId,
				});
				if (!recheckCompletion.ok) {
					return recheckCompletion;
				}
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
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return errorResult.ok(replay.data.completion);
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
				if (!mapped.ok) {
					return mapped;
				}
				completions.push(mapped.data);
			}

			return errorResult.ok({
				completions,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list completions");
		}
	},

	async getLearningAttendanceById(input) {
		try {
			const rows = await db
				.select()
				.from(hrLearningAttendance)
				.where(
					and(
						eq(hrLearningAttendance.id, input.attendanceId),
						eq(hrLearningAttendance.organizationId, input.organizationId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapLearningAttendance(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to get learning attendance");
		}
	},

	async findLearningAttendanceByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrLearningAttendance)
				.where(
					and(
						eq(hrLearningAttendance.organizationId, input.organizationId),
						eq(hrLearningAttendance.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			const mapped = mapLearningAttendance(row);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
				attendance: mapped.data,
				createIdempotencyKey: input.idempotencyKey,
				createRequestFingerprint: row.createRequestFingerprint ?? "",
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find learning attendance by idempotency key",
			);
		}
	},

	async findLearningAttendanceByAssignmentAndSession(input) {
		try {
			const rows = await db
				.select()
				.from(hrLearningAttendance)
				.where(
					and(
						eq(hrLearningAttendance.organizationId, input.organizationId),
						eq(hrLearningAttendance.assignmentId, input.assignmentId),
						eq(hrLearningAttendance.sessionId, input.sessionId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapLearningAttendance(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find learning attendance by assignment and session",
			);
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async recordLearningAttendance(record, _ports, meta) {
		const existing = await this.findLearningAttendanceByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return errorResult.ok(existing.data.attendance);
			}
			return conflict("Idempotency key already used with different data");
		}

		const assignment = await this.getLearningAssignmentById({
			organizationId: record.organizationId,
			assignmentId: record.assignmentId,
		});
		if (!assignment.ok) {
			return assignment;
		}
		if (assignment.data === null) {
			return notFound(
				"Assignment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		if (assignment.data.employeeId !== record.employeeId) {
			return notFound(
				"Attendance employee does not match assignment",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const session = await this.getSessionById({
			organizationId: record.organizationId,
			sessionId: record.sessionId,
		});
		if (!session.ok) {
			return session;
		}
		if (session.data === null) {
			return notFound(
				"Session not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const recordableCheck = assertLearningAttendanceRecordable({
			sessionStatus: session.data.status,
			assignmentStatus: assignment.data.status,
			assignmentSessionId: assignment.data.sessionId,
			requestedSessionId: record.sessionId,
		});
		if (!recordableCheck.ok) {
			return recordableCheck;
		}

		const duplicate = await this.findLearningAttendanceByAssignmentAndSession({
			organizationId: record.organizationId,
			assignmentId: record.assignmentId,
			sessionId: record.sessionId,
		});
		if (!duplicate.ok) {
			return duplicate;
		}
		const duplicateCheck = assertNoDuplicateLearningAttendance({
			hasExistingAttendance: duplicate.data !== null,
		});
		if (!duplicateCheck.ok) {
			return duplicateCheck;
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesLearningAttendanceId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const preparedAudit = prepareLearningAudit({
			action: "CREATE",
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_learning_attendance",
			entityId: brandedId.data,
			organizationId: record.organizationId,
			reasonCode: "LEARNING_ATTENDANCE_RECORDED",
			newValue: {
				assignmentId: record.assignmentId,
				employeeId: assignment.data.employeeId,
				sessionId: record.sessionId,
				status: record.status,
				recordedAt: record.recordedAt.toISOString(),
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH assignment AS (
							SELECT id, organization_id, employee_id, session_id, status
							FROM hr_learning_assignment
							WHERE id = ${record.assignmentId}
								AND organization_id = ${record.organizationId}
								AND employee_id = ${record.employeeId}
								AND status = 'in_progress'
								AND session_id = ${record.sessionId}
						),
						session_ok AS (
							SELECT id
							FROM hr_learning_session
							WHERE id = ${record.sessionId}
								AND organization_id = ${record.organizationId}
								AND status IN ('in_progress', 'completed')
						),
						mutated AS (
							INSERT INTO hr_learning_attendance (
								id, organization_id, session_id, assignment_id, employee_id,
								status, recorded_at, recorded_by,
								create_idempotency_key, create_request_fingerprint,
								version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, assignment.organization_id, ${record.sessionId},
								assignment.id, assignment.employee_id, ${record.status},
								${record.recordedAt}::timestamptz, ${record.recordedBy},
								${record.createIdempotencyKey}, ${record.createRequestFingerprint},
								1, ${record.createdBy}, ${record.createdBy}
							FROM assignment
							WHERE EXISTS (SELECT 1 FROM session_ok)
								AND NOT EXISTS (
									SELECT 1 FROM hr_learning_attendance existing
									WHERE existing.organization_id = assignment.organization_id
										AND existing.assignment_id = assignment.id
										AND existing.session_id = ${record.sessionId}
								)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				const recheck = await this.findLearningAttendanceByAssignmentAndSession(
					{
						organizationId: record.organizationId,
						assignmentId: record.assignmentId,
						sessionId: record.sessionId,
					},
				);
				if (!recheck.ok) {
					return recheck;
				}
				if (recheck.data !== null) {
					return conflict(
						"Attendance already recorded for this assignment and session",
					);
				}
				return conflict("Unable to record learning attendance");
			}
			return mapLearningAttendanceSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findLearningAttendanceByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return errorResult.ok(replay.data.attendance);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			if (isPostgresUniqueViolation(error)) {
				return conflict(
					"Attendance already recorded for this assignment and session",
				);
			}
			return mapPersistenceFailure(
				error,
				"Failed to record learning attendance",
			);
		}
	},

	async listLearningAttendance(input) {
		try {
			let query = db
				.select()
				.from(hrLearningAttendance)
				.where(eq(hrLearningAttendance.organizationId, input.organizationId))
				.$dynamic();

			if (input.sessionId !== undefined) {
				query = query.where(
					eq(hrLearningAttendance.sessionId, input.sessionId),
				);
			}
			if (input.employeeId !== undefined) {
				query = query.where(
					eq(hrLearningAttendance.employeeId, input.employeeId),
				);
			}

			const rows = await query.orderBy(desc(hrLearningAttendance.recordedAt));
			const totalCount = rows.length;
			const start = (input.page - 1) * input.pageSize;
			const paged = rows.slice(start, start + input.pageSize);

			const attendance: LearningAttendance[] = [];
			for (const row of paged) {
				const mapped = mapLearningAttendance(row);
				if (!mapped.ok) {
					return mapped;
				}
				attendance.push(mapped.data);
			}

			return errorResult.ok({
				attendanceRecords: attendance,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list learning attendance");
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			const certification = mapCertification(row);
			if (!certification.ok) {
				return certification;
			}
			if (
				row.createIdempotencyKey === null ||
				row.createRequestFingerprint === null
			) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok({
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

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async issueCertification(record, _ports, meta) {
		const existing = await this.findCertificationByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return errorResult.ok(existing.data.certification);
			}
			return conflict("Idempotency key already used with different data");
		}
		const employee = await this.getEmployeeById({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
		});
		if (!employee.ok) {
			return employee;
		}
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
		if (!course.ok) {
			return course;
		}
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
		if (!completion.ok) {
			return completion;
		}
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
		if (!issuableCheck.ok) {
			return issuableCheck;
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesCertificationId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const preparedAudit = prepareLearningAudit({
			action: "CREATE",
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_employee_certification",
			entityId: brandedId.data,
			organizationId: record.organizationId,
			reasonCode: "EMPLOYEE_CERTIFICATION_ISSUED",
			newValue: {
				employeeId: record.employeeId,
				courseId: record.courseId,
				completionId: record.completionId,
				certificationCode: record.certificationCode,
				issuedOn: record.issuedOn,
				expiresOn: record.expiresOn,
				status: "active",
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
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
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return errorResult.ok(replay.data.certification);
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Certification not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const revokeCheck = assertCertificationCanRevoke(existing.data.status);
		if (!revokeCheck.ok) {
			return revokeCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const preparedAudit = prepareLearningAudit({
			action: "UPDATE",
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_employee_certification",
			entityId: input.certificationId,
			organizationId: input.organizationId,
			reasonCode: "EMPLOYEE_CERTIFICATION_REVOKED",
			oldValue: { status: existing.data.status },
			newValue: { status: "revoked" },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Certification not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const expireCheck = assertCertificationCanExpire(existing.data.status);
		if (!expireCheck.ok) {
			return expireCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_employee_certification",
			entityId: input.certificationId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});
		const preparedAudit = prepareLearningAudit({
			action: "UPDATE",
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_employee_certification",
			entityId: input.certificationId,
			organizationId: input.organizationId,
			reasonCode: "EMPLOYEE_CERTIFICATION_EXPIRED",
			oldValue: { status: existing.data.status },
			newValue: { status: "expired" },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
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
								${HUMAN_RESOURCES_CERTIFICATION_EXPIRING_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
			]);
			const [row] = rows;
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

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async renewCertification(record, _ports, meta) {
		const existing = await this.findCertificationByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return errorResult.ok(existing.data.certification);
			}
			return conflict("Idempotency key already used with different data");
		}

		const prior = await this.getCertificationById({
			organizationId: record.organizationId,
			certificationId: record.certificationId,
		});
		if (!prior.ok) {
			return prior;
		}
		if (prior.data === null) {
			return notFound(
				"Certification not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const versionCheck = assertExpectedVersion(
			prior.data.version,
			record.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const completion = await this.getCompletionById({
			organizationId: record.organizationId,
			completionId: record.completionId,
		});
		if (!completion.ok) {
			return completion;
		}
		if (completion.data === null) {
			return notFound(
				"Completion not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const renewableCheck = assertCertificationRenewable({
			status: prior.data.status,
			employeeId: record.employeeId,
			courseId: record.courseId,
			completionEmployeeId: completion.data.employeeId,
			completionCourseId: completion.data.courseId,
			completionOutcome: completion.data.outcome,
		});
		if (!renewableCheck.ok) {
			return renewableCheck;
		}

		const issuableCheck = assertCertificationIssuable({
			hasRequiredCompletion: completion.data.courseId === record.courseId,
			issuedOn: record.issuedOn,
			expiresOn: record.expiresOn,
			todayDate: new Date().toISOString().slice(0, 10),
		});
		if (!issuableCheck.ok) {
			return issuableCheck;
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesCertificationId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_employee_certification",
			entityId: brandedId.data,
			actorId: record.actorUserId,
			correlationId: meta.correlationId,
			renewedFromCertificationId: record.certificationId,
		});
		const preparedAudit = prepareLearningAudit({
			action: "CREATE",
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_employee_certification",
			entityId: brandedId.data,
			organizationId: record.organizationId,
			reasonCode: "EMPLOYEE_CERTIFICATION_RENEWED",
			newValue: {
				employeeId: record.employeeId,
				courseId: record.courseId,
				completionId: record.completionId,
				certificationCode: record.certificationCode,
				issuedOn: record.issuedOn,
				expiresOn: record.expiresOn,
				status: "active",
				renewedFromCertificationId: record.certificationId,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH prior_cert AS (
							SELECT id, organization_id, employee_id, course_id, status, version
							FROM hr_employee_certification
							WHERE id = ${record.certificationId}
								AND organization_id = ${record.organizationId}
								AND version = ${record.expectedVersion}
								AND status = 'expired'
						),
						completion AS (
							SELECT id, employee_id, course_id, outcome
							FROM hr_learning_completion
							WHERE id = ${record.completionId}
								AND organization_id = ${record.organizationId}
								AND outcome = 'passed'
						),
						mutated AS (
							INSERT INTO hr_employee_certification (
								id, organization_id, employee_id, course_id, completion_id,
								certification_code, issued_on, expires_on, status,
								renewed_from_certification_id,
								create_idempotency_key, create_request_fingerprint,
								version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, prior_cert.organization_id, prior_cert.employee_id,
								prior_cert.course_id, completion.id, ${record.certificationCode},
								${record.issuedOn}, ${record.expiresOn}, 'active',
								prior_cert.id, ${record.createIdempotencyKey},
								${record.createRequestFingerprint}, 1, ${record.createdBy},
								${record.createdBy}
							FROM prior_cert, completion
							WHERE completion.employee_id = prior_cert.employee_id
								AND completion.course_id = prior_cert.course_id
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
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
								${HUMAN_RESOURCES_CERTIFICATION_RENEWED_EVENT},
								'human-resources', ${meta.correlationId}, ${record.actorUserId},
								${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
			]);
			const [row] = rows;
			if (!row) {
				return conflict("Unable to renew certification");
			}
			return mapCertificationSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findCertificationByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return errorResult.ok(replay.data.certification);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			return mapPersistenceFailure(error, "Failed to renew certification");
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
				if (!mapped.ok) {
					return mapped;
				}
				certifications.push(mapped.data);
			}

			return errorResult.ok({
				certifications,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list certifications");
		}
	},

	async listExpiringCertifications(input) {
		try {
			const windowEndDate = new Date(`${input.asOf}T00:00:00.000Z`);
			windowEndDate.setUTCDate(windowEndDate.getUTCDate() + input.withinDays);
			const windowEnd = windowEndDate.toISOString().slice(0, 10);

			const rows = await db
				.select()
				.from(hrEmployeeCertification)
				.where(
					and(
						eq(hrEmployeeCertification.organizationId, input.organizationId),
						eq(hrEmployeeCertification.status, "active"),
						gte(hrEmployeeCertification.expiresOn, input.asOf),
						lte(hrEmployeeCertification.expiresOn, windowEnd),
					),
				)
				.orderBy(
					asc(hrEmployeeCertification.expiresOn),
					asc(hrEmployeeCertification.id),
				);

			const totalCount = rows.length;
			const start = (input.page - 1) * input.pageSize;
			const paged = rows.slice(start, start + input.pageSize);

			const certifications: EmployeeCertification[] = [];
			for (const row of paged) {
				const mapped = mapCertification(row);
				if (!mapped.ok) {
					return mapped;
				}
				certifications.push(mapped.data);
			}

			return errorResult.ok({
				certifications,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list expiring certifications",
			);
		}
	},
};

export function attachDrizzleLearning(target: LearningHost): void {
	Object.assign(target, drizzleLearningMethods);
}
