import type { Result } from "@afenda/errors/result";
import type {
	HumanResourcesCertificationId,
	HumanResourcesCompletionId,
	HumanResourcesCourseId,
	HumanResourcesEmployeeId,
	HumanResourcesLearningAssignmentId,
	HumanResourcesSessionId,
} from "../brands";
import type { MutationPorts } from "../ports";
import type {
	AssignmentStatus,
	CertificationStatus,
	CourseStatus,
	SessionStatus,
} from "../shared/learning-status";
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
} from "../types";

/**
 * Persistence contract for Learning and certification.
 *
 * This is a domain slice of `HumanResourcesStore`. Keep persistence behavior
 * here; cross-domain orchestration belongs in application commands/services.
 */
export type CourseCreateRecord = {
	organizationId: string;
	code: string;
	title: string;
	description: string | null;
	durationHours: string | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentCourseRecord = {
	course: LearningCourse;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
};

export type SessionCreateRecord = {
	organizationId: string;
	courseId: HumanResourcesCourseId;
	code: string;
	title: string;
	scheduledStartsAt: Date;
	scheduledEndsAt: Date;
	capacity: number | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentSessionRecord = {
	session: LearningSession;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
};

export type LearningAssignmentCreateRecord = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	courseId: HumanResourcesCourseId;
	sessionId: HumanResourcesSessionId | null;
	assignedBy: string;
	assignedAt: Date;
	dueOn: string | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentLearningAssignmentRecord = {
	assignment: LearningAssignment;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
};

export type CompletionCreateRecord = {
	organizationId: string;
	assignmentId: HumanResourcesLearningAssignmentId;
	employeeId: HumanResourcesEmployeeId;
	courseId: HumanResourcesCourseId;
	sessionId: HumanResourcesSessionId | null;
	completedAt: Date;
	outcome: string;
	assessorUserId: string | null;
	notes: string | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentCompletionRecord = {
	completion: LearningCompletion;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
};

export type IdempotentCertificationRecord = {
	certification: EmployeeCertification;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
};

export type HumanResourcesLearningStore = {
	// Learning Course
	getCourseById(input: {
		organizationId: string;
		courseId: HumanResourcesCourseId;
	}): Promise<Result<LearningCourse | null>>;

	findCourseByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentCourseRecord | null>>;

	createCourse(
		record: CourseCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningCourse>>;

	updateCourse(
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
	): Promise<Result<LearningCourse>>;

	activateCourse(
		input: {
			organizationId: string;
			courseId: HumanResourcesCourseId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningCourse>>;

	archiveCourse(
		input: {
			organizationId: string;
			courseId: HumanResourcesCourseId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningCourse>>;

	listCourses(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: CourseStatus;
	}): Promise<Result<CourseListPage>>;

	countActiveAssignmentsForCourse(input: {
		organizationId: string;
		courseId: HumanResourcesCourseId;
	}): Promise<Result<number>>;
	// Learning Session
	getSessionById(input: {
		organizationId: string;
		sessionId: HumanResourcesSessionId;
	}): Promise<Result<LearningSession | null>>;

	findSessionByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentSessionRecord | null>>;

	createSession(
		record: SessionCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningSession>>;

	startSession(
		input: {
			organizationId: string;
			sessionId: HumanResourcesSessionId;
			actualStartsAt: Date;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningSession>>;

	completeSession(
		input: {
			organizationId: string;
			sessionId: HumanResourcesSessionId;
			actualEndsAt: Date;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningSession>>;

	cancelSession(
		input: {
			organizationId: string;
			sessionId: HumanResourcesSessionId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningSession>>;

	listSessions(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		courseId?: HumanResourcesCourseId;
		status?: SessionStatus;
	}): Promise<Result<SessionListPage>>;

	countEnrolledInSession(input: {
		organizationId: string;
		sessionId: HumanResourcesSessionId;
	}): Promise<Result<number>>;
	// Learning Assignment
	getLearningAssignmentById(input: {
		organizationId: string;
		assignmentId: HumanResourcesLearningAssignmentId;
	}): Promise<Result<LearningAssignment | null>>;

	findLearningAssignmentByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentLearningAssignmentRecord | null>>;

	createLearningAssignment(
		record: LearningAssignmentCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningAssignment>>;

	enrollLearningAssignment(
		input: {
			organizationId: string;
			assignmentId: HumanResourcesLearningAssignmentId;
			sessionId?: HumanResourcesSessionId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningAssignment>>;

	waiveLearningAssignment(
		input: {
			organizationId: string;
			assignmentId: HumanResourcesLearningAssignmentId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningAssignment>>;

	listLearningAssignments(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId;
		courseId?: HumanResourcesCourseId;
		status?: AssignmentStatus;
	}): Promise<Result<LearningAssignmentListPage>>;
	// Learning Completion
	getCompletionById(input: {
		organizationId: string;
		completionId: HumanResourcesCompletionId;
	}): Promise<Result<LearningCompletion | null>>;

	findCompletionByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentCompletionRecord | null>>;

	findCompletionByAssignmentId(input: {
		organizationId: string;
		assignmentId: HumanResourcesLearningAssignmentId;
	}): Promise<Result<LearningCompletion | null>>;

	recordCompletion(
		record: CompletionCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningCompletion>>;

	listCompletions(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId;
		courseId?: HumanResourcesCourseId;
	}): Promise<Result<CompletionListPage>>;
	// Employee Certification
	getCertificationById(input: {
		organizationId: string;
		certificationId: HumanResourcesCertificationId;
	}): Promise<Result<EmployeeCertification | null>>;

	findCertificationByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentCertificationRecord | null>>;

	issueCertification(
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
	): Promise<Result<EmployeeCertification>>;

	revokeCertification(
		input: {
			organizationId: string;
			certificationId: HumanResourcesCertificationId;
			revokedBy: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCertification>>;

	expireCertification(
		input: {
			organizationId: string;
			certificationId: HumanResourcesCertificationId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCertification>>;

	listCertifications(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId;
		courseId?: HumanResourcesCourseId;
		status?: CertificationStatus;
	}): Promise<Result<CertificationListPage>>;
};
