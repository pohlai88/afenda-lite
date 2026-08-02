import type { Result } from "@afenda/errors";
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
} from "../../kernel/contracts";
import type { HumanResourcesMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { MutationPorts } from "../../kernel/execution/ports";
import type {
	HumanResourcesCertificationId,
	HumanResourcesCompletionId,
	HumanResourcesCourseId,
	HumanResourcesEmployeeId,
	HumanResourcesLearningAssignmentId,
	HumanResourcesLearningAttendanceId,
	HumanResourcesSessionId,
} from "../../kernel/identity/brands";
import type {
	AssignmentStatus,
	CertificationStatus,
	CourseStatus,
	LearningAttendanceStatus,
	SessionStatus,
} from "./status";

/**
 * Persistence contract for Learning and certification.
 *
 * This feature owns its narrow persistence contract. Keep persistence behavior
 * here; cross-domain orchestration belongs in application commands/services.
 */
export interface CourseCreateRecord {
	code: string;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	description: string | null;
	durationHours: string | null;
	organizationId: string;
	title: string;
}

export interface IdempotentCourseRecord {
	course: LearningCourse;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
}

export interface SessionCreateRecord {
	capacity: number | null;
	code: string;
	courseId: HumanResourcesCourseId;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	organizationId: string;
	primaryInstructorUserId: string | null;
	scheduledEndsAt: Date;
	scheduledStartsAt: Date;
	title: string;
}

export interface IdempotentSessionRecord {
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	session: LearningSession;
}

export interface LearningAssignmentCreateRecord {
	assignedAt: Date;
	assignedBy: string;
	courseId: HumanResourcesCourseId;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	dueOn: string | null;
	employeeId: HumanResourcesEmployeeId;
	organizationId: string;
	sessionId: HumanResourcesSessionId | null;
}

export interface IdempotentLearningAssignmentRecord {
	assignment: LearningAssignment;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
}

export interface CompletionCreateRecord {
	assessorUserId: string | null;
	assignmentId: HumanResourcesLearningAssignmentId;
	completedAt: Date;
	courseId: HumanResourcesCourseId;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	employeeId: HumanResourcesEmployeeId;
	notes: string | null;
	organizationId: string;
	outcome: string;
	sessionId: HumanResourcesSessionId | null;
}

export interface IdempotentCompletionRecord {
	completion: LearningCompletion;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
}

export interface IdempotentCertificationRecord {
	certification: EmployeeCertification;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
}

export interface LearningAttendanceCreateRecord {
	assignmentId: HumanResourcesLearningAssignmentId;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	employeeId: HumanResourcesEmployeeId;
	organizationId: string;
	recordedAt: Date;
	recordedBy: string;
	sessionId: HumanResourcesSessionId;
	status: LearningAttendanceStatus;
}

export interface IdempotentLearningAttendanceRecord {
	attendance: LearningAttendance;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
}

export interface HumanResourcesLearningStore {
	activateCourse: (
		input: {
			organizationId: string;
			courseId: HumanResourcesCourseId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LearningCourse>>;

	archiveCourse: (
		input: {
			organizationId: string;
			courseId: HumanResourcesCourseId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LearningCourse>>;

	assignSessionInstructor: (
		input: {
			organizationId: string;
			sessionId: HumanResourcesSessionId;
			primaryInstructorUserId: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LearningSession>>;

	cancelSession: (
		input: {
			organizationId: string;
			sessionId: HumanResourcesSessionId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LearningSession>>;

	completeSession: (
		input: {
			organizationId: string;
			sessionId: HumanResourcesSessionId;
			actualEndsAt: Date;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LearningSession>>;

	countActiveAssignmentsForCourse: (input: {
		organizationId: string;
		courseId: HumanResourcesCourseId;
	}) => Promise<Result<number>>;

	countEnrolledInSession: (input: {
		organizationId: string;
		sessionId: HumanResourcesSessionId;
	}) => Promise<Result<number>>;

	createCourse: (
		record: CourseCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LearningCourse>>;

	createLearningAssignment: (
		record: LearningAssignmentCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LearningAssignment>>;

	createSession: (
		record: SessionCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LearningSession>>;

	enrollLearningAssignment: (
		input: {
			organizationId: string;
			assignmentId: HumanResourcesLearningAssignmentId;
			sessionId?: HumanResourcesSessionId | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LearningAssignment>>;

	expireCertification: (
		input: {
			organizationId: string;
			certificationId: HumanResourcesCertificationId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCertification>>;

	findCertificationByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentCertificationRecord | null>>;

	findCompletionByAssignmentId: (input: {
		organizationId: string;
		assignmentId: HumanResourcesLearningAssignmentId;
	}) => Promise<Result<LearningCompletion | null>>;

	findCompletionByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentCompletionRecord | null>>;

	findCourseByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentCourseRecord | null>>;

	findLearningAssignmentByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentLearningAssignmentRecord | null>>;

	findLearningAttendanceByAssignmentAndSession: (input: {
		organizationId: string;
		assignmentId: HumanResourcesLearningAssignmentId;
		sessionId: HumanResourcesSessionId;
	}) => Promise<Result<LearningAttendance | null>>;

	findLearningAttendanceByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentLearningAttendanceRecord | null>>;

	findSessionByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentSessionRecord | null>>;
	// Employee Certification
	getCertificationById: (input: {
		organizationId: string;
		certificationId: HumanResourcesCertificationId;
	}) => Promise<Result<EmployeeCertification | null>>;
	// Learning Completion
	getCompletionById: (input: {
		organizationId: string;
		completionId: HumanResourcesCompletionId;
	}) => Promise<Result<LearningCompletion | null>>;
	// Learning Course
	getCourseById: (input: {
		organizationId: string;
		courseId: HumanResourcesCourseId;
	}) => Promise<Result<LearningCourse | null>>;
	// Learning Assignment
	getLearningAssignmentById: (input: {
		organizationId: string;
		assignmentId: HumanResourcesLearningAssignmentId;
	}) => Promise<Result<LearningAssignment | null>>;
	// Learning Attendance
	getLearningAttendanceById: (input: {
		organizationId: string;
		attendanceId: HumanResourcesLearningAttendanceId;
	}) => Promise<Result<LearningAttendance | null>>;
	// Learning Session
	getSessionById: (input: {
		organizationId: string;
		sessionId: HumanResourcesSessionId;
	}) => Promise<Result<LearningSession | null>>;

	issueCertification: (
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
	) => Promise<Result<EmployeeCertification>>;

	listCertifications: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId | undefined;
		courseId?: HumanResourcesCourseId | undefined;
		status?: CertificationStatus | undefined;
	}) => Promise<Result<CertificationListPage>>;

	listCompletions: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId | undefined;
		courseId?: HumanResourcesCourseId | undefined;
	}) => Promise<Result<CompletionListPage>>;

	listCourses: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: CourseStatus | undefined;
	}) => Promise<Result<CourseListPage>>;

	listExpiringCertifications: (input: {
		organizationId: string;
		asOf: string;
		withinDays: number;
		page: number;
		pageSize: number;
	}) => Promise<Result<CertificationListPage>>;

	listLearningAssignments: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId | undefined;
		courseId?: HumanResourcesCourseId | undefined;
		status?: AssignmentStatus | undefined;
	}) => Promise<Result<LearningAssignmentListPage>>;

	listLearningAttendance: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		sessionId?: HumanResourcesSessionId | undefined;
		employeeId?: HumanResourcesEmployeeId | undefined;
	}) => Promise<Result<LearningAttendanceListPage>>;

	listSessions: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		courseId?: HumanResourcesCourseId | undefined;
		status?: SessionStatus | undefined;
	}) => Promise<Result<SessionListPage>>;

	recordCompletion: (
		record: CompletionCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LearningCompletion>>;

	recordLearningAttendance: (
		record: LearningAttendanceCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LearningAttendance>>;

	renewCertification: (
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
	) => Promise<Result<EmployeeCertification>>;

	revokeCertification: (
		input: {
			organizationId: string;
			certificationId: HumanResourcesCertificationId;
			revokedBy: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCertification>>;

	startSession: (
		input: {
			organizationId: string;
			sessionId: HumanResourcesSessionId;
			actualStartsAt: Date;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LearningSession>>;

	updateCourse: (
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
	) => Promise<Result<LearningCourse>>;

	waiveLearningAssignment: (
		input: {
			organizationId: string;
			assignmentId: HumanResourcesLearningAssignmentId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LearningAssignment>>;
}
